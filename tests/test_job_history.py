"""Tests for API job history and analytics (Phase 3)"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure project root on path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Set a temp database path
_temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("JOB_DB_PATH", _temp_db.name)

from api.job_history import record_job, complete_job, get_recent_jobs, get_analytics, DB_PATH


class TestJobHistory:
    def test_record_and_get_jobs(self):
        record_job(job_id="test-001", task_type="inference", tokens=100, status="pending")
        jobs = get_recent_jobs(limit=10)
        assert len(jobs) >= 1
        found = [j for j in jobs if j["job_id"] == "test-001"]
        assert len(found) == 1
        assert found[0]["task_type"] == "inference"
        assert found[0]["tokens"] == 100

    def test_complete_job(self):
        record_job(job_id="test-002", task_type="inference", tokens=200, status="running")
        complete_job(job_id="test-002", result_hash="abc123", duration_ms=150, status="completed")
        jobs = get_recent_jobs()
        found = [j for j in jobs if j["job_id"] == "test-002"]
        assert len(found) == 1
        assert found[0]["status"] == "completed"
        assert found[0]["result_hash"] == "abc123"
        assert found[0]["duration_ms"] == 150

    def test_analytics(self):
        record_job(job_id="test-003", task_type="inference", tokens=50, amount_microalgo=5000, status="running")
        complete_job(job_id="test-003", result_hash="def456", duration_ms=200, status="completed")

        analytics = get_analytics()
        assert analytics["total_jobs"] >= 1
        assert analytics["completed_jobs"] >= 1
        assert "success_rate" in analytics
        assert "avg_duration_ms" in analytics
        assert "timestamp" in analytics

    def test_get_recent_jobs_limit(self):
        for i in range(5):
            record_job(job_id=f"test-limit-{i}", task_type="inference", tokens=i * 10)
        jobs = get_recent_jobs(limit=3)
        assert len(jobs) <= 3
