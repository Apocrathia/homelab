#!/usr/bin/env python3
"""Plan RomM ES-DE media-import segments (platform, then letter shards).

Runs inside the romm container (kubectl exec, read-only). Emits one JSON
object per segment on stdout:

    {"platform": "mame", "letters": "su,sm", "roms": 234}

Segments are built from live DB counts: letters are greedily packed up to
CAP roms; a single letter that exceeds CAP recurses to the next character
(DEPTH levels) before packing. Multi-token buckets are exact prefixes in
ROM_LETTERS.

Env:
    PLATFORMS  restrict to these fs_slugs (default: every platform that has
               an ES-DE media folder)
    CAP        max roms per segment (default: 1200 — keeps a lane at
               ~15 min, under the 2-lane OOM stack-up and the ~20 min exec
               stream reset zone)
    DEPTH      max shard prefix length (default: 2)
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from handler.database import db_platform_handler, db_rom_handler

MEDIA_DIR = Path(os.environ.get("ESDE_LIBRARY_DIR", "/romm/library")) / "media"


def pack(counts: dict[str, int], cap: int) -> list[list[str]]:
    """Greedy-pack keys into buckets whose sums stay <= cap (single oversized keys stand alone)."""
    items = sorted(counts.items(), key=lambda kv: -kv[1])
    buckets: list[list[str]] = []
    current: list[str] = []
    total = 0
    for key, count in items:
        if count >= cap:
            if current:
                buckets.append(current)
                current, total = [], 0
            buckets.append([key])
        elif total + count > cap:
            buckets.append(current)
            current, total = [key], count
        else:
            current.append(key)
            total += count
    if current:
        buckets.append(current)
    return buckets


def shard(roms: list, cap: int, depth: int, prefix: str = "") -> list[tuple[str, list[str], int]]:
    counts: dict[str, int] = {}
    for rom in roms:
        name = (rom.fs_name_no_ext or "?").lower()
        key = name[len(prefix) : len(prefix) + 1] or "?"
        counts[key] = counts.get(key, 0) + 1

    segments: list[tuple[str, list[str], int]] = []
    for bucket in pack(counts, cap):
        if len(bucket) == 1 and counts[bucket[0]] > cap and len(prefix) + 1 < depth:
            letter = bucket[0]
            sub = [
                rom
                for rom in roms
                if ((rom.fs_name_no_ext or "?").lower())[len(prefix) : len(prefix) + 1]
                == letter
            ]
            segments.extend(shard(sub, cap, depth, prefix + letter))
        else:
            segments.append((prefix, bucket, sum(counts[k] for k in bucket)))
    return segments


def main() -> int:
    cap = int(os.environ.get("CAP", "1200"))
    depth = int(os.environ.get("DEPTH", "2"))
    wanted = {p.strip() for p in os.environ.get("PLATFORMS", "").split(",") if p.strip()}

    for platform in db_platform_handler.get_platforms():
        if wanted and platform.fs_slug not in wanted:
            continue
        if not (MEDIA_DIR / platform.fs_slug).is_dir():
            continue

        roms = db_rom_handler.get_roms_scalar(platform_ids=[platform.id])
        if not roms:
            continue
        for prefix, bucket, count in shard(roms, cap, depth):
            tokens = [prefix + key for key in bucket]
            print(
                json.dumps(
                    {"platform": platform.fs_slug, "letters": ",".join(tokens), "roms": count}
                )
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
