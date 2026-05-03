"""init postgres schema

Revision ID: 0001_init_postgres
Revises: 
Create Date: 2026-05-04

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_init_postgres"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("wallet_address", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_wallet_address", "users", ["wallet_address"], unique=True)

    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prefix", sa.String(length=16), nullable=False),
        sa.Column("key_hash", sa.String(length=255), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_api_keys_user_id", "api_keys", ["user_id"], unique=False)
    op.create_index("ix_api_keys_prefix", "api_keys", ["prefix"], unique=False)

    op.create_table(
        "providers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("wallet_address", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("gpu_model", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("gpu_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vram_gb", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_per_hour", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("region", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("endpoint", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="offline"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_providers_wallet_address", "providers", ["wallet_address"], unique=True)
    op.create_index("ix_providers_status", "providers", ["status"], unique=False)

    op.create_table(
        "provider_heartbeats",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cpu_percent", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("memory_percent", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_provider_heartbeats_provider_seen",
        "provider_heartbeats",
        ["provider_id", "seen_at"],
        unique=False,
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("consumer_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("template_id", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("spec", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("result_hash", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("error_message", sa.Text(), nullable=False, server_default=""),
        sa.Column("cost_microalgo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["consumer_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_jobs_consumer_user_id", "jobs", ["consumer_user_id"], unique=False)
    op.create_index("ix_jobs_provider_id", "jobs", ["provider_id"], unique=False)
    op.create_index("ix_jobs_template_id", "jobs", ["template_id"], unique=False)
    op.create_index("ix_jobs_status", "jobs", ["status"], unique=False)

    op.create_table(
        "job_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_job_events_job_id", "job_events", ["job_id"], unique=False)
    op.create_index("ix_job_events_event_type", "job_events", ["event_type"], unique=False)
    op.create_index("ix_job_events_job_created", "job_events", ["job_id", "created_at"], unique=False)

    op.create_table(
        "proofs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("proof_hash", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_proofs_job_id", "proofs", ["job_id"], unique=False)
    op.create_index("ix_proofs_proof_hash", "proofs", ["proof_hash"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("chain", sa.String(length=32), nullable=False, server_default="algorand"),
        sa.Column("tx_id", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("amount_microalgo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("from_addr", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("to_addr", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_transactions_job_id", "transactions", ["job_id"], unique=False)
    op.create_index("ix_transactions_tx_id", "transactions", ["tx_id"], unique=False)
    op.create_index("ix_transactions_status", "transactions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_status", table_name="transactions")
    op.drop_index("ix_transactions_tx_id", table_name="transactions")
    op.drop_index("ix_transactions_job_id", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index("ix_proofs_proof_hash", table_name="proofs")
    op.drop_index("ix_proofs_job_id", table_name="proofs")
    op.drop_table("proofs")

    op.drop_index("ix_job_events_job_created", table_name="job_events")
    op.drop_index("ix_job_events_event_type", table_name="job_events")
    op.drop_index("ix_job_events_job_id", table_name="job_events")
    op.drop_table("job_events")

    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_template_id", table_name="jobs")
    op.drop_index("ix_jobs_provider_id", table_name="jobs")
    op.drop_index("ix_jobs_consumer_user_id", table_name="jobs")
    op.drop_table("jobs")

    op.drop_index("ix_provider_heartbeats_provider_seen", table_name="provider_heartbeats")
    op.drop_table("provider_heartbeats")

    op.drop_index("ix_providers_status", table_name="providers")
    op.drop_index("ix_providers_wallet_address", table_name="providers")
    op.drop_table("providers")

    op.drop_index("ix_api_keys_prefix", table_name="api_keys")
    op.drop_index("ix_api_keys_user_id", table_name="api_keys")
    op.drop_table("api_keys")

    op.drop_index("ix_users_wallet_address", table_name="users")
    op.drop_table("users")
