from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from threading import Lock
from typing import Any


DEFAULT_ROADMAP: dict[str, Any] = {
    "title": "KINETIC delivery roadmap",
    "total_weeks": 18,
    "phases": [
        {
            "id": 0,
            "name": "Foundation",
            "subtitle": "clean up and solidify KINETIC core",
            "start_week": 1,
            "end_week": 2,
            "color": "#8f8ce7",
            "status": "active",
            "deliverable": "Stable, tested KINETIC core running on TestNet. Ready to build on top of.",
            "tracks": [
                {
                    "title": "Backend",
                    "items": [
                        "Stabilize existing FastAPI routes",
                        "Add proper error handling and logging",
                        "Write tests for core job flow",
                        "Document all existing API endpoints",
                    ],
                },
                {
                    "title": "Smart contracts",
                    "items": [
                        "Test provider registry on TestNet",
                        "Test escrow contract end-to-end",
                        "Fix any proof-of-compute gaps",
                        "Write deploy scripts for all contracts",
                    ],
                },
                {
                    "title": "Frontend",
                    "items": [
                        "Fix any broken UI flows",
                        "Ensure SSE real-time updates work reliably",
                        "Mobile responsive check",
                    ],
                },
                {
                    "title": "Infrastructure",
                    "items": [
                        "Set up proper staging environment",
                        "Configure Vercel env variables cleanly",
                        "Add basic monitoring (uptime and errors)",
                    ],
                },
            ],
        },
        {
            "id": 1,
            "name": "Organisations",
            "subtitle": "register, provide and rent",
            "start_week": 3,
            "end_week": 5,
            "color": "#2fb89c",
            "status": "planned",
            "tracks": [],
        },
        {
            "id": 2,
            "name": "Hub core",
            "subtitle": "explore, provider profiles and trust signals",
            "start_week": 6,
            "end_week": 9,
            "color": "#f16f37",
            "status": "planned",
            "tracks": [],
        },
        {
            "id": 3,
            "name": "Job templates",
            "subtitle": "one-click compute deployment",
            "start_week": 10,
            "end_week": 12,
            "color": "#d5901b",
            "status": "planned",
            "tracks": [],
        },
        {
            "id": 4,
            "name": "Consumer dashboard",
            "subtitle": "history, analytics and compare",
            "start_week": 13,
            "end_week": 16,
            "color": "#3b90e4",
            "status": "planned",
            "tracks": [],
        },
        {
            "id": 5,
            "name": "Launch",
            "subtitle": "onboard first orgs and consumers",
            "start_week": 17,
            "end_week": 18,
            "color": "#7db138",
            "status": "planned",
            "tracks": [],
        },
    ],
}


class RoadmapValidationError(ValueError):
    pass


_ROADMAP_LOCK = Lock()


def _roadmap_file_path() -> Path:
    configured = os.getenv("ROADMAP_FILE_PATH", "").strip()
    if configured:
        return Path(configured)

    base_dir = Path(__file__).resolve().parent.parent
    return base_dir / "data" / "roadmap.json"


def _atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, indent=2)

    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False
    ) as temp_file:
        temp_file.write(serialized)
        temp_path = Path(temp_file.name)

    os.replace(temp_path, path)


def _validate_roadmap(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RoadmapValidationError("Roadmap payload must be an object.")

    title = payload.get("title")
    total_weeks = payload.get("total_weeks")
    phases = payload.get("phases")

    if not isinstance(title, str) or not title.strip():
        raise RoadmapValidationError("Roadmap title is required.")
    if not isinstance(total_weeks, int) or total_weeks <= 0:
        raise RoadmapValidationError("total_weeks must be a positive integer.")
    if not isinstance(phases, list) or not phases:
        raise RoadmapValidationError("Roadmap phases must be a non-empty list.")

    valid_status = {"active", "planned", "completed", "paused"}

    for phase in phases:
        if not isinstance(phase, dict):
            raise RoadmapValidationError("Each phase must be an object.")

        required_fields = [
            "id",
            "name",
            "subtitle",
            "start_week",
            "end_week",
            "color",
            "status",
            "tracks",
        ]
        missing = [field for field in required_fields if field not in phase]
        if missing:
            raise RoadmapValidationError(f"Phase missing fields: {', '.join(missing)}")

        if not isinstance(phase["id"], int) or phase["id"] < 0:
            raise RoadmapValidationError("Phase id must be a non-negative integer.")
        if not isinstance(phase["name"], str) or not phase["name"].strip():
            raise RoadmapValidationError("Phase name must be a non-empty string.")
        if not isinstance(phase["subtitle"], str):
            raise RoadmapValidationError("Phase subtitle must be a string.")

        start_week = phase["start_week"]
        end_week = phase["end_week"]
        if not isinstance(start_week, int) or not isinstance(end_week, int):
            raise RoadmapValidationError("Phase weeks must be integers.")
        if start_week < 1 or end_week < start_week or end_week > total_weeks:
            raise RoadmapValidationError(
                "Phase week range must be within total_weeks and end_week >= start_week."
            )

        color = phase["color"]
        if not isinstance(color, str) or not color.startswith("#"):
            raise RoadmapValidationError("Phase color must be a hex-style string.")

        status = phase["status"]
        if status not in valid_status:
            raise RoadmapValidationError(
                f"Phase status must be one of: {', '.join(sorted(valid_status))}."
            )

        tracks = phase["tracks"]
        if not isinstance(tracks, list):
            raise RoadmapValidationError("Phase tracks must be a list.")

        for track in tracks:
            if not isinstance(track, dict):
                raise RoadmapValidationError("Track must be an object.")
            if not isinstance(track.get("title"), str) or not track["title"].strip():
                raise RoadmapValidationError("Track title must be a non-empty string.")
            if not isinstance(track.get("items"), list):
                raise RoadmapValidationError("Track items must be a list.")
            for item in track["items"]:
                if not isinstance(item, str) or not item.strip():
                    raise RoadmapValidationError("Track items must be non-empty strings.")

        deliverable = phase.get("deliverable")
        if deliverable is not None and not isinstance(deliverable, str):
            raise RoadmapValidationError("Phase deliverable must be a string when provided.")

    return payload


def get_roadmap() -> dict[str, Any]:
    path = _roadmap_file_path()

    with _ROADMAP_LOCK:
        if not path.exists():
            _atomic_write_json(path, DEFAULT_ROADMAP)
            return DEFAULT_ROADMAP

        with path.open("r", encoding="utf-8") as roadmap_file:
            loaded = json.load(roadmap_file)

        try:
            return _validate_roadmap(loaded)
        except RoadmapValidationError:
            _atomic_write_json(path, DEFAULT_ROADMAP)
            return DEFAULT_ROADMAP


def update_roadmap(payload: dict[str, Any]) -> dict[str, Any]:
    validated = _validate_roadmap(payload)
    path = _roadmap_file_path()

    with _ROADMAP_LOCK:
        _atomic_write_json(path, validated)

    return validated
