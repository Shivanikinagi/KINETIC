from __future__ import annotations

import os
import uuid
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db import get_db_session, get_database_url
from api.models import ApiKey, User
from api.nonce_store import consume_nonce, issue_nonce
from api.security import (
    api_key_prefix,
    build_login_message,
    create_access_token,
    decode_access_token,
    generate_api_key,
    hash_api_key,
    verify_algorand_signature,
    verify_api_key,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def _require_db() -> None:
    if not get_database_url():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured",
        )


class NonceRequest(BaseModel):
    wallet_address: str = Field(min_length=58, max_length=64)


class NonceResponse(BaseModel):
    wallet_address: str
    nonce: str
    expires_at: int


@router.post("/nonce", response_model=NonceResponse)
async def get_nonce(payload: NonceRequest) -> NonceResponse:
    _require_db()
    issued = await issue_nonce(payload.wallet_address)
    return NonceResponse(wallet_address=payload.wallet_address, nonce=issued.nonce, expires_at=issued.expires_at)


class LoginRequest(BaseModel):
    wallet_address: str = Field(min_length=58, max_length=64)
    nonce: str = Field(min_length=10, max_length=200)
    signature_b64: str = Field(min_length=20, max_length=2000)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    wallet_address: str


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db_session)) -> LoginResponse:
    _require_db()

    ok = await consume_nonce(payload.wallet_address, payload.nonce)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid or expired nonce")

    message = build_login_message(payload.wallet_address, payload.nonce)
    if not verify_algorand_signature(payload.wallet_address, message, payload.signature_b64):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Upsert user
    result = await db.execute(select(User).where(User.wallet_address == payload.wallet_address))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(wallet_address=payload.wallet_address)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user_id=str(user.id), wallet_address=user.wallet_address)
    return LoginResponse(access_token=token, user_id=str(user.id), wallet_address=user.wallet_address)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return ""
    return parts[1].strip()


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    _require_db()
    token = _extract_bearer_token(authorization)
    ident = decode_access_token(token)
    if ident is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == ident.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


class MeResponse(BaseModel):
    user_id: str
    wallet_address: str


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user_id=str(user.id), wallet_address=user.wallet_address)


class ApiKeyCreateResponse(BaseModel):
    api_key_id: str
    prefix: str
    api_key: str


@router.post("/api-keys", response_model=ApiKeyCreateResponse)
async def create_key(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)) -> ApiKeyCreateResponse:
    raw = generate_api_key()
    prefix = api_key_prefix(raw)
    key = ApiKey(user_id=user.id, prefix=prefix, key_hash=hash_api_key(raw), revoked=False)
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return ApiKeyCreateResponse(api_key_id=str(key.id), prefix=prefix, api_key=raw)


class ApiKeyListItem(BaseModel):
    api_key_id: str
    prefix: str
    revoked: bool
    created_at: str


class ApiKeyListResponse(BaseModel):
    items: list[ApiKeyListItem]


@router.get("/api-keys", response_model=ApiKeyListResponse)
async def list_keys(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)) -> ApiKeyListResponse:
    result = await db.execute(select(ApiKey).where(ApiKey.user_id == user.id).order_by(ApiKey.created_at.desc()))
    keys = list(result.scalars().all())
    return ApiKeyListResponse(
        items=[
            ApiKeyListItem(
                api_key_id=str(k.id),
                prefix=str(k.prefix),
                revoked=bool(k.revoked),
                created_at=k.created_at.isoformat(),
            )
            for k in keys
        ]
    )


@router.delete("/api-keys/{api_key_id}")
async def revoke_key(api_key_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    _ = uuid.UUID(api_key_id)  # validate
    result = await db.execute(select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.user_id == user.id))
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    key.revoked = True
    await db.commit()
    return {"revoked": True, "api_key_id": api_key_id}


async def resolve_api_key_user(
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    _require_db()
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    prefix = api_key_prefix(x_api_key)
    result = await db.execute(select(ApiKey).where(ApiKey.prefix == prefix, ApiKey.revoked.is_(False)))
    candidates = list(result.scalars().all())

    match: Optional[ApiKey] = None
    for candidate in candidates:
        if verify_api_key(x_api_key, candidate.key_hash):
            match = candidate
            break

    if match is None:
        raise HTTPException(status_code=401, detail="Invalid API key")

    result = await db.execute(select(User).where(User.id == match.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return user
