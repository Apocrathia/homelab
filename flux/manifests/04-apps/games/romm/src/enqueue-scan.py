#!/usr/bin/env python3
"""Enqueue RomM library scan(s) on the in-pod RQ/Valkey queue.

Runs inside the romm container (via kubectl exec). Bypasses HTTP/OIDC auth —
the worker already trusts jobs on its local queue, same as the UI websocket path.

SCAN_TYPE may be a single type or a comma-separated list
(e.g. unmatched,update).

Whole-library mode (default) enqueues one job per scan type covering every
platform. The library (~36k roms, 200 platforms) can never finish inside the
per-job 4h SCAN_TIMEOUT that way — the nightly CronJob therefore uses
rotation mode:

SCAN_ROTATION=N (N>0) enqueues ONE JOB PER PLATFORM for the day's slice —
every platform whose id satisfies id % N == weekday (container TZ). Each
platform gets its own SCAN_TIMEOUT (a slow platform's timeout costs only
its own job), the serial worker (SCAN_WORKERS=1) drains the rest, and every
platform gets one bounded night per week. Big platforms (e.g. mame, 13.5k
roms) converge over several rotations since each pass drops newly matched
roms from the next unmatched scan.

SCAN_SKIP_PENDING (default 40) skips enqueueing entirely while at least that
many jobs are still pending — the previous night's slice has not drained and
piling another 58 jobs on would only grow the backlog.

SCAN_DRY_RUN=1 prints the day's selection and queue state without enqueuing
anything.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime

from config import SCAN_TIMEOUT, TASK_RESULT_TTL
from endpoints.sockets.scan import scan_platforms
from handler.database import db_platform_handler
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

    # Whole-library mode: one job per scan type, every platform.
    targets: list[list[int]] = [[]]

    rotation = int(os.environ.get("SCAN_ROTATION", "0") or 0)
    if rotation > 0:
        slot = datetime.now().weekday() % rotation
        platforms = db_platform_handler.get_platforms()
        selected = [p.id for p in platforms if p.id % rotation == slot]
        print(
            f"rotation {rotation} slot {slot} (weekday {datetime.now().weekday()}): "
            f"{len(selected)}/{len(platforms)} platforms",
            flush=True,
        )
        if not selected:
            return 0
        targets = [[pid] for pid in selected]

    dry_run = os.environ.get("SCAN_DRY_RUN", "0") in ("1", "true")

    skip_pending = int(os.environ.get("SCAN_SKIP_PENDING", "40") or 0)
    try:
        pending = int(high_prio_queue.count or 0)
    except (TypeError, ValueError):
        pending = 0
    if not dry_run and skip_pending > 0 and pending >= skip_pending:
        print(
            f"queue busy: {pending} pending >= {skip_pending}, skipping tonight",
            flush=True,
        )
        return 0

    if dry_run:
        print(
            f"DRY RUN: would enqueue {len(targets)} platform group(s) x "
            f"{len(requested)} scan type(s); queue pending={pending}",
            flush=True,
        )
        return 0

    for platform_ids in targets:
        for scan_type_raw in requested:
            scan_type = ScanType[scan_type_raw.upper()]
            job = high_prio_queue.enqueue(
                scan_platforms,
                platform_ids=platform_ids,
                metadata_sources=metadata_sources,
                scan_type=scan_type,
                job_timeout=SCAN_TIMEOUT,
                result_ttl=TASK_RESULT_TTL,
                meta={
                    "task_name": f"{scan_type.value.capitalize()} Scan",
                    "task_type": TaskType.SCAN.value,
                },
            )
            label = f"platform={platform_ids[0]}" if platform_ids else "platforms=all"
            print(
                f"scan enqueued: job_id={job.id} type={scan_type.value} {label} "
                f"apis={apis_label}",
                flush=True,
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
