#!/usr/bin/env python3
"""Host-side driver for one-shot RomM ES-DE media backfills.

Runs on an operator host with kubectl access. Plans segments from live DB
counts (import-segments.py, exec'd into the romm container), then runs each
segment bounded-parallel with retries. Segments are idempotent (fill-missing
only), so interrupted runs just resume.

Usage:
    python3 flux/manifests/04-apps/games/romm/src/import-backfill.py \
        [--platforms nes,nds] [--cap 1200] [--lanes 2] [--dry-run]

Lane cap note: 3 concurrent lanes OOM-killed the romm pod (2Gi) through CIFS
dirty-page accumulation; 2 lanes with the importer's flush hygiene hold at
~1.4Gi. Long exec streams (~20 min) also suffer transport resets from some
client networks — hence per-segment retries.
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).parent
PLANNER = HERE / "import-segments.py"
IMPORTER = HERE / "import-esde-media.py"
LOGDIR = pathlib.Path(".scratch/romm-backfill")


def kubectl_exec(env_args: list[str]) -> list[str]:
    return [
        "kubectl", "exec", "-i", "-n", "romm", "deploy/romm", "-c", "romm",
        "--", "env", *env_args, "python", "-",
    ]


def run_segment(segment: dict, dry_run: bool) -> tuple[int, int, int]:
    """Run one segment with up to 3 attempts; returns (rc, files, db_keys)."""
    platform = segment["platform"]
    letters = segment["letters"]
    tag = f"{platform}__{(letters or 'all').replace(',', '-')}"
    env_args = [f"PLATFORMS={platform}"]
    if letters:
        env_args.append(f"ROM_LETTERS={letters}")
    if dry_run:
        env_args.append("DRY_RUN=1")

    rc, files, db_keys = 1, 0, 0
    for attempt in (1, 2, 3):
        cmd = kubectl_exec(env_args)
        with open(IMPORTER, "rb") as stdin, open(LOGDIR / f"{tag}.{attempt}.log", "w") as log:
            r = subprocess.run(cmd, stdin=stdin, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            log.write(r.stdout)
        rc = r.returncode
        total = next((line for line in r.stdout.splitlines() if line.startswith("TOTAL")), "")
        try:
            body = total.split("TOTAL:")[1]
            files = int(body.split("files=")[1].split()[0])
            db_keys = int(body.split("db_keys=")[1].split()[0])
        except (IndexError, ValueError):
            pass
        if rc == 0:
            break
        if attempt < 3 and ("connection reset" in r.stdout or "i/o timeout" in r.stdout):
            print(f"  retry {platform} {letters[:12]} (transport error)", flush=True)
            continue
        break
    print(
        f"[{time.strftime('%H:%M:%S')}] {platform:<6} {letters[:24]:<24} rc={rc} "
        f"roms={segment['roms']} files={files} db_keys={db_keys}",
        flush=True,
    )
    return rc, files, db_keys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--platforms", default="", help="comma list of fs_slugs (default: all)")
    ap.add_argument("--cap", type=int, default=1200, help="max roms per segment")
    ap.add_argument("--depth", type=int, default=2, help="max shard prefix length")
    ap.add_argument("--lanes", type=int, default=2, help="concurrent segments (do not exceed 2)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    LOGDIR.mkdir(parents=True, exist_ok=True)
    plan_args = [f"CAP={args.cap}", f"DEPTH={args.depth}"]
    if args.platforms:
        plan_args.append(f"PLATFORMS={args.platforms}")
    with open(PLANNER, "rb") as stdin:
        plan = subprocess.run(kubectl_exec(plan_args), stdin=stdin, capture_output=True, text=True)
    if plan.returncode != 0:
        print("planner failed:", plan.stdout[-500:], plan.stderr[-500:], file=sys.stderr)
        return 1
    segments = [json.loads(line) for line in plan.stdout.splitlines() if line.strip()]

    verb = "would write" if args.dry_run else "wrote"
    print(f"{len(segments)} segments, cap={args.cap}, lanes={args.lanes}", flush=True)
    failures, totals = [], [0, 0]
    with cf.ThreadPoolExecutor(max_workers=args.lanes) as pool:
        futs = {pool.submit(run_segment, s, args.dry_run): s for s in segments}
        for fut in cf.as_completed(futs):
            rc, files, db_keys = fut.result()
            totals[0] += files
            totals[1] += db_keys
            if rc != 0:
                failures.append(futs[fut])

    print(f"TOTAL: files {verb}={totals[0]} db_keys {verb}={totals[1]}", flush=True)
    if failures:
        print("FAILED segments:", [f"{s['platform']}:{s['letters']}" for s in failures], file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
