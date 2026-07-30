"""Event emission: human-readable text or NDJSON, optionally teed to a file."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import IO, Any

MAX_LINE_CHARS = 10_000


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _clean(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items() if v is not None}
    return value


class Emitter:
    """Writes run events as text or NDJSON, always to stdout and optionally to a file."""

    def __init__(self, json_mode: bool, output_file: IO[str] | None = None) -> None:
        self._json_mode = json_mode
        self._output_file = output_file

    def emit(self, event: str, level: str = "info", message: str | None = None, **fields: Any) -> None:
        record: dict[str, Any] = {"event": event, "timestamp": _now_iso(), "level": level}
        if message is not None:
            record["message"] = message
        for key, value in fields.items():
            cleaned = _clean(value)
            if cleaned is not None:
                record[key] = cleaned

        line = json.dumps(record, sort_keys=True) if self._json_mode else _format_text(dict(record))
        if self._json_mode and len(line) > MAX_LINE_CHARS:
            line = json.dumps(
                {
                    "event": event,
                    "timestamp": record["timestamp"],
                    "level": "warn",
                    "message": f"record for event '{event}' truncated: exceeded {MAX_LINE_CHARS}-char limit",
                },
                sort_keys=True,
            )

        print(line)
        if self._output_file is not None:
            print(line, file=self._output_file)


def _format_text(record: dict[str, Any]) -> str:
    timestamp = record.pop("timestamp")
    level = record.pop("level")
    event = record.pop("event")
    message = record.pop("message", None)

    parts = [timestamp, level.upper(), event]
    if message:
        parts.append(message)
    extras = " ".join(f"{k}={v}" for k, v in sorted(record.items()))
    if extras:
        parts.append(extras)
    return " ".join(parts)
