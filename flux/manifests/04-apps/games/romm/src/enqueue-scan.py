#!/usr/bin/env python3
"""Enqueue RomM library scan(s) on the in-pod RQ/Valkey queue.

Runs inside the romm container (via kubectl exec). Bypasses HTTP/OIDC auth —
the worker already trusts jobs on its local queue, same as the UI websocket path.

SCAN_TYPE may be a single type or a comma-separated list
(e.g. unmatched,update). Jobs are enqueued in order onto the high queue.
"""

from __future__ import annotations

import os
import sys

from config import SCAN_TIMEOUT, TASK_RESULT_TTL
from endpoints.sockets.scan import scan_platforms
from handler.redis_handler import high_prio_queue
from handler.scan_handler import ScanType
from tasks.tasks import TaskType

ALLOWED_SCAN_TYPES = frozenset(
    {"quick", "unmatched", "update", "complete", "hashes", "new_platforms"}
)


def main() -> int:
    requested = [
        part.strip().lower()
        for part in os.environ.get("SCAN_TYPE", "unmatched").split(",")
        if part.strip()
    ]
    if not requested:
        print("SCAN_TYPE is empty", file=sys.stderr)
        return 1

    invalid = [name for name in requested if name not in ALLOWED_SCAN_TYPES]
    if invalid:
        print(f"invalid SCAN_TYPE values: {','.join(invalid)}", file=sys.stderr)
        return 1

    metadata_sources = [
        source.strip()
        for source in os.environ.get("SCAN_METADATA_SOURCES", "").split(",")
        if source.strip()
    ]
    apis_label = ",".join(metadata_sources) if metadata_sources else "(none)"

    for scan_type_raw in requested:
        scan_type = ScanType[scan_type_raw.upper()]
        job = high_prio_queue.enqueue(
            scan_platforms,
            platform_ids=[],
            metadata_sources=metadata_sources,
            scan_type=scan_type,
            job_timeout=SCAN_TIMEOUT,
            result_ttl=TASK_RESULT_TTL,
            meta={
                "task_name": f"{scan_type.value.capitalize()} Scan",
                "task_type": TaskType.SCAN.value,
            },
        )
        print(
            f"scan enqueued: job_id={job.id} type={scan_type.value} apis={apis_label}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
