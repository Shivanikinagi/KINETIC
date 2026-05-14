from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    api_keys: Mapped[list[ApiKey]] = relationship(back_populates="user", cascade="all, delete-orphan")
    jobs: Mapped[list[Job]] = relationship(back_populates="consumer", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    prefix: Mapped[str] = mapped_column(String(16), index=True)
    key_hash: Mapped[str] = mapped_column(String(255))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User] = relationship(back_populates="api_keys")


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")

    gpu_model: Mapped[str] = mapped_column(String(80), default="")
    gpu_count: Mapped[int] = mapped_column(Integer, default=0)
    vram_gb: Mapped[int] = mapped_column(Integer, default=0)
    price_per_hour: Mapped[float] = mapped_column(Numeric(12, 6), default=0)
    region: Mapped[str] = mapped_column(String(80), default="")
    endpoint: Mapped[str] = mapped_column(String(300), default="")

    status: Mapped[str] = mapped_column(String(32), default="offline", index=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    heartbeats: Mapped[list[ProviderHeartbeat]] = relationship(
        back_populates="provider", cascade="all, delete-orphan"
    )
    jobs: Mapped[list[Job]] = relationship(back_populates="provider")


class ProviderHeartbeat(Base):
    __tablename__ = "provider_heartbeats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("providers.id"), index=True)
    seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    cpu_percent: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    memory_percent: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)

    provider: Mapped[Provider] = relationship(back_populates="heartbeats")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consumer_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id"), nullable=True, index=True
    )

    template_id: Mapped[str] = mapped_column(String(120), default="", index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)

    spec: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    result_hash: Mapped[str] = mapped_column(String(128), default="")
    error_message: Mapped[str] = mapped_column(Text, default="")

    cost_microalgo: Mapped[int] = mapped_column(BigInteger, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    consumer: Mapped[User] = relationship(back_populates="jobs")
    provider: Mapped[Provider] = relationship(back_populates="jobs")

    events: Mapped[list[JobEvent]] = relationship(back_populates="job", cascade="all, delete-orphan")
    proofs: Mapped[list[Proof]] = relationship(back_populates="job", cascade="all, delete-orphan")
    transactions: Mapped[list[Transaction]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), index=True)

    event_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    job: Mapped[Job] = relationship(back_populates="events")


class Proof(Base):
    __tablename__ = "proofs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), index=True)

    kind: Mapped[str] = mapped_column(String(64), default="")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    proof_hash: Mapped[str] = mapped_column(String(128), default="", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    job: Mapped[Job] = relationship(back_populates="proofs")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True, index=True
    )

    kind: Mapped[str] = mapped_column(String(64), default="")
    chain: Mapped[str] = mapped_column(String(32), default="algorand")
    tx_id: Mapped[str] = mapped_column(String(128), default="", index=True)

    amount_microalgo: Mapped[int] = mapped_column(BigInteger, default=0)
    from_addr: Mapped[str] = mapped_column(String(64), default="")
    to_addr: Mapped[str] = mapped_column(String(64), default="")

    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    job: Mapped[Job] = relationship(back_populates="transactions")


Index("ix_provider_heartbeats_provider_seen", ProviderHeartbeat.provider_id, ProviderHeartbeat.seen_at)
Index("ix_job_events_job_created", JobEvent.job_id, JobEvent.created_at)
