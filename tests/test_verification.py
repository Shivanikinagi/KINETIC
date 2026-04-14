"""Tests for the Verification & Distribution System (Phase 5)"""
from __future__ import annotations

import json
import pytest

# Import verification system from scripts
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.verification_system import (
    ComputeVerifier,
    SLAEnforcer,
    BadgeDistributor,
    generate_verification_report,
)


class TestComputeVerifier:
    def test_compute_hash_deterministic(self):
        h1 = ComputeVerifier.compute_expected_hash("hello", 100)
        h2 = ComputeVerifier.compute_expected_hash("hello", 100)
        assert h1 == h2

    def test_compute_hash_differs_with_payload(self):
        h1 = ComputeVerifier.compute_expected_hash("hello", 100)
        h2 = ComputeVerifier.compute_expected_hash("world", 100)
        assert h1 != h2

    def test_verify_job_output_pass(self):
        verifier = ComputeVerifier()
        task = {"payload": "test", "tokens": 50}
        expected = verifier.compute_expected_hash("test", 50)
        result = {
            "job_id": "job-001",
            "result_hash": expected,
            "duration_ms": 100,
            "tokens_processed": 50,
        }
        v = verifier.verify_job_output(task, result)
        assert v["hash_match"] is True
        assert v["within_sla"] is True
        assert v["verified"] is True

    def test_verify_job_output_hash_mismatch(self):
        verifier = ComputeVerifier()
        task = {"payload": "test", "tokens": 50}
        result = {
            "job_id": "job-002",
            "result_hash": "wrong_hash",
            "duration_ms": 100,
            "tokens_processed": 50,
        }
        v = verifier.verify_job_output(task, result)
        assert v["hash_match"] is False
        assert v["verified"] is False

    def test_verify_job_output_sla_violation(self):
        verifier = ComputeVerifier()
        task = {"payload": "test", "tokens": 50}
        expected = verifier.compute_expected_hash("test", 50)
        result = {
            "job_id": "job-003",
            "result_hash": expected,
            "duration_ms": 999999,  # Way too slow
            "tokens_processed": 50,
        }
        v = verifier.verify_job_output(task, result)
        assert v["hash_match"] is True
        assert v["within_sla"] is False
        assert v["verified"] is False

    def test_generate_proof_certificate(self):
        verifier = ComputeVerifier()
        task = {"payload": "test", "tokens": 50}
        expected = verifier.compute_expected_hash("test", 50)
        result = {
            "job_id": "job-004",
            "result_hash": expected,
            "duration_ms": 100,
            "tokens_processed": 50,
        }
        v = verifier.verify_job_output(task, result)
        cert = verifier.generate_proof_certificate(v)

        assert cert["verified"] is True
        assert "certificate_hash" in cert
        assert cert["issuer"] == "KINETIC Verification Engine v2.0"
        assert len(cert["certificate_hash"]) == 64  # SHA-256 hex


class TestSLAEnforcer:
    def test_new_provider_score(self):
        enforcer = SLAEnforcer()
        score = enforcer.get_provider_score("provider_new")
        assert score["score"] == 100
        assert score["tier"] == "new"

    def test_diamond_tier(self):
        enforcer = SLAEnforcer()
        for _ in range(10):
            enforcer.record_job("provider_a", {
                "verified": True,
                "hash_match": True,
                "within_sla": True,
                "duration_ms": 100,
            })
        score = enforcer.get_provider_score("provider_a")
        assert score["tier"] == "diamond"
        assert score["success_rate"] == 100.0

    def test_probation_tier(self):
        enforcer = SLAEnforcer()
        for _ in range(10):
            enforcer.record_job("provider_bad", {
                "verified": False,
                "hash_match": False,
                "within_sla": False,
                "duration_ms": 99999,
            })
        score = enforcer.get_provider_score("provider_bad")
        assert score["tier"] == "probation"
        assert enforcer.should_penalize("provider_bad")

    def test_mixed_performance(self):
        enforcer = SLAEnforcer()
        for _ in range(7):
            enforcer.record_job("provider_mid", {
                "verified": True,
                "hash_match": True,
                "within_sla": True,
                "duration_ms": 100,
            })
        for _ in range(3):
            enforcer.record_job("provider_mid", {
                "verified": False,
                "hash_match": True,
                "within_sla": False,
                "duration_ms": 99999,
            })
        score = enforcer.get_provider_score("provider_mid")
        assert score["total_jobs"] == 10
        assert score["success_rate"] == 70.0


class TestBadgeDistributor:
    def test_determine_badge_diamond(self):
        dist = BadgeDistributor()
        score = {"tier": "diamond", "total_jobs": 10}
        badge = dist.determine_badge(score)
        assert badge == "DIAMOND_COMPUTE"

    def test_no_badge_for_new(self):
        dist = BadgeDistributor()
        score = {"tier": "new", "total_jobs": 0}
        badge = dist.determine_badge(score)
        assert badge is None

    def test_no_badge_under_threshold(self):
        dist = BadgeDistributor()
        score = {"tier": "gold", "total_jobs": 3}  # Needs at least 5
        badge = dist.determine_badge(score)
        assert badge is None


class TestVerificationReport:
    def test_generate_report(self):
        verifier = ComputeVerifier()
        task = {"payload": "test", "tokens": 50}
        expected = verifier.compute_expected_hash("test", 50)
        result = {
            "job_id": "job-r1",
            "result_hash": expected,
            "duration_ms": 100,
            "tokens_processed": 50,
            "provider": "provider_x",
        }

        report = generate_verification_report([result], [task])

        assert report["summary"]["total_verifications"] == 1
        assert report["summary"]["passed"] == 1
        assert report["summary"]["pass_rate"] == 100.0
        assert len(report["verifications"]) == 1
        assert len(report["provider_scores"]) > 0
        assert "report_id" in report

    def test_report_with_failure(self):
        task = {"payload": "test", "tokens": 50}
        result = {
            "job_id": "job-r2",
            "result_hash": "wrong",
            "duration_ms": 100,
            "tokens_processed": 50,
            "provider": "provider_y",
        }

        report = generate_verification_report([result], [task])
        assert report["summary"]["failed"] == 1
        assert report["summary"]["pass_rate"] == 0.0
