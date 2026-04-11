from __future__ import annotations

from agent.verifier import generate_expected_hash, should_spot_check, verify_output


def test_verify_correct_output():
    task = {"payload": "hello", "tokens": 12}
    result = {"result_hash": generate_expected_hash(task)}
    assert verify_output(result, task) is True


def test_verify_wrong_output():
    task = {"payload": "hello", "tokens": 12}
    result = {"result_hash": "bad-hash"}
    assert verify_output(result, task) is False


def test_spot_check_probability():
    hits = sum(1 for _ in range(1000) if should_spot_check())
    ratio = hits / 1000
    assert 0.05 <= ratio <= 0.15
