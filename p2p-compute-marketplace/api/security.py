from __future__ import annotations

import base64
import hashlib
import os
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Optional

import jwt
from algosdk.encoding import decode_address, is_valid_address
from argon2 import PasswordHasher
from nacl.signing import VerifyKey


def _utc_now() -> datetime:
    return datetime.now(UTC)


def jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "").strip()


def jwt_issuer() -> str:
    return os.getenv("JWT_ISSUER", "kinetic").strip()


def jwt_access_ttl_minutes() -> int:
    try:
        return int(os.getenv("JWT_ACCESS_TTL_MINUTES", "60"))
    except ValueError:
        return 60


def build_login_message(wallet_address: str, nonce: str) -> bytes:
    # Keep stable and explicit; frontends should sign exactly these bytes.
    return f"KINETIC_LOGIN:{wallet_address}:{nonce}".encode("utf-8")


def verify_algorand_signature(wallet_address: str, message: bytes, signature_b64: str) -> bool:
    if not is_valid_address(wallet_address):
        return False

    try:
        signature = base64.b64decode(signature_b64)
    except Exception:
        return False

    try:
        public_key = decode_address(wallet_address)  # 32 bytes
        VerifyKey(public_key).verify(message, signature)
        return True
    except Exception:
        return False


@dataclass(frozen=True)
class JwtIdentity:
    user_id: str
    wallet_address: str


def create_access_token(*, user_id: str, wallet_address: str) -> str:
    secret = jwt_secret()
    if not secret:
        raise RuntimeError("JWT_SECRET is not configured")

    now = _utc_now()
    payload: dict[str, Any] = {
        "sub": user_id,
        "wallet": wallet_address,
        "iss": jwt_issuer(),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=jwt_access_ttl_minutes())).timestamp()),
    }

    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str) -> Optional[JwtIdentity]:
    secret = jwt_secret()
    if not secret:
        return None

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], issuer=jwt_issuer())
    except Exception:
        return None

    user_id = str(payload.get("sub", "")).strip()
    wallet = str(payload.get("wallet", "")).strip()
    if not user_id or not wallet:
        return None
    return JwtIdentity(user_id=user_id, wallet_address=wallet)


_password_hasher = PasswordHasher()


def generate_api_key() -> str:
    return f"kapi_{secrets.token_urlsafe(32)}"


def api_key_prefix(raw_key: str) -> str:
    return raw_key[:12]


def hash_api_key(raw_key: str) -> str:
    # Argon2id by default via argon2-cffi; safe for secrets at rest.
    return _password_hasher.hash(raw_key)


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    try:
        return _password_hasher.verify(stored_hash, raw_key)
    except Exception:
        return False


def api_key_rate_limit_bucket(raw_key: str) -> str:
    # Do not store raw key in Redis keys/logs.
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
