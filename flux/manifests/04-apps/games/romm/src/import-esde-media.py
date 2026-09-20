#!/usr/bin/env python3
"""Import ES-DE media into RomM resources.

Runs inside the romm container (see import-trigger.sh and the
romm-esde-media-import CronJob). ES-DE media lives on the library share at
<library>/media/<platform_slug>/<type>/<rom filename>.<ext>, produced by the
esde-media-scraper job. This script fills MISSING RomM assets only — existing
files are never rewritten. DB pointers are always ensured even when the file
already exists, so a rerun heals metadata clobbered by earlier passes.

The RomM cover comes from COVER_SOURCE (default "miximages", ES-DE's
composite art). Remaining ES-DE folders map onto RomM media types:

    covers→box2d        3dboxes→box3d        physicalmedia→physical
    screenshots→screenshot                   titlescreens→title_screen
    manuals→manual (path_manual)             miximages→miximage
    wheels→logo

All per-rom changes accumulate into a single update_rom call: ss_metadata is
merged from a snapshot taken once per rom, and each media type must not
blind-overwrite the keys written by the previous one.

Env:
    PLATFORMS    comma-separated platform fs_slugs (default: every platform
                 that has an ES-DE media folder)
    COVER_SOURCE ES-DE folder that becomes the RomM cover (default: miximages)
    MEDIA_TYPES  comma-separated ES-DE folders to import as media types
                 (default: covers,3dboxes,physicalmedia,screenshots,
                 titlescreens,manuals,miximages,wheels)
    ROM_LETTERS  restrict to roms whose first filename character matches, e.g.
                 "a-f,0-9" — shards big platforms into parallel segments; a
                 bare token like "#" matches that literal first character
    DRY_RUN      1 = report what would be imported, write nothing
"""

from __future__ import annotations

import asyncio
import io
import os
from pathlib import Path

# CIFS dirty page cache is charged to the pod cgroup; without flushing, a
# bulk import OOM-kills the container (verified the hard way). Drop each
# written file from the page cache and force writeback periodically.
_SYNC_EVERY = 20
_written_since_sync = 0


def _flush_path(path: Path) -> None:
    """Drop written file pages from the cache and throttle writeback."""
    global _written_since_sync
    try:
        fd = os.open(str(path), os.O_RDONLY)
        try:
            os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
        finally:
            os.close(fd)
    except OSError:
        pass
    _written_since_sync += 1
    if _written_since_sync >= _SYNC_EVERY:
        os.sync()
        _written_since_sync = 0

from config.config_manager import MetadataMediaType
from handler.database import db_platform_handler, db_rom_handler
from handler.filesystem import fs_resource_handler

LIBRARY_DIR = Path(os.environ.get("ESDE_LIBRARY_DIR", "/romm/library"))
MEDIA_DIR = LIBRARY_DIR / "media"

DEFAULT_MEDIA_TYPES = (
    "covers,3dboxes,physicalmedia,screenshots,titlescreens,manuals,miximages,wheels"
)

MEDIA_TYPE_MAP = {
    "covers": MetadataMediaType.BOX2D,
    "3dboxes": MetadataMediaType.BOX3D,
    "physicalmedia": MetadataMediaType.PHYSICAL,
    "screenshots": MetadataMediaType.SCREENSHOT,
    "titlescreens": MetadataMediaType.TITLE_SCREEN,
    "manuals": MetadataMediaType.MANUAL,
    "miximages": MetadataMediaType.MIXIMAGE,
    "wheels": MetadataMediaType.LOGO,
}


def load_index(type_dir: Path) -> dict[str, Path]:
    """Map rom base filename -> media file for one ES-DE type folder."""
    index: dict[str, Path] = {}
    if type_dir.is_dir():
        for entry in sorted(type_dir.iterdir()):
            if entry.is_file():
                index[entry.name.rsplit(".", 1)[0]] = entry
    return index


def expand_letters(spec: str) -> set[str] | None:
    """'a-c,su,0-9' → {'a'..'c', 'su', '0'..'9'}; empty → None (all roms).

    Single characters and ranges match the first filename character;
    multi-character tokens (from import-segments.py sharding) are filename
    prefixes.
    """
    if not spec.strip():
        return None
    out: set[str] = set()
    for token in spec.split(","):
        token = token.strip().lower()
        if not token:
            continue
        if len(token) == 3 and token[1] == "-":
            lo, hi = ord(token[0]), ord(token[2])
            if lo <= hi:
                out.update(chr(code) for code in range(lo, hi + 1))
            continue
        out.add(token)
    return out


def rom_in_bucket(rom, bucket: set[str] | None) -> bool:
    if bucket is None:
        return True
    name = (rom.fs_name_no_ext or "?").lower()
    return any(name.startswith(token) for token in bucket)


async def import_rom(rom, indexes, media_types, cover_source, dry_run) -> tuple[int, int]:
    """Import all missing assets for one rom.

    Returns (files_written, db_keys_ensured) — in dry run, counts work that
    WOULD happen. All DB changes accumulate into one update_rom call so media
    types don't clobber each other's ss_metadata keys.
    """
    updates: dict = {}
    ss_meta = dict(rom.ss_metadata or {})
    files = db_keys = 0

    # Cover: only import when RomM has none.
    path_cover_s, _ = await fs_resource_handler.get_cover(
        entity=rom, overwrite=False, url_cover=None
    )
    if not path_cover_s:
        src = indexes.get(cover_source, {}).get(rom.fs_name_no_ext)
        if src:
            if dry_run:
                files += 1
                db_keys += 2
            else:
                path_cover_l, path_cover_s = await fs_resource_handler.store_artwork(
                    rom, io.BytesIO(src.read_bytes()), src.suffix.lstrip(".").lower()
                )
                if path_cover_s:
                    files += 1
                    db_keys += 2
                    updates["path_cover_s"] = path_cover_s
                    updates["path_cover_l"] = path_cover_l
                    for rel in (path_cover_l, path_cover_s):
                        _flush_path(Path(str(fs_resource_handler.base_path)) / rel)

    # Manual: file written once, DB pointer always ensured.
    src = indexes.get("manuals", {}).get(rom.fs_name_no_ext)
    if src:
        dest_name = f"{rom.id}{src.suffix.lower()}"
        dest_rel = f"{rom.fs_resources_path}/manual/{dest_name}"
        if not await fs_resource_handler.file_exists(dest_rel):
            if dry_run:
                files += 1
            else:
                await fs_resource_handler.write_file(
                    src.read_bytes(), f"{rom.fs_resources_path}/manual", dest_name
                )
                _flush_path(Path(str(fs_resource_handler.base_path)) / dest_rel)
                files += 1
        if rom.path_manual != dest_rel:
            if dry_run:
                db_keys += 1
            else:
                db_keys += 1
                updates["path_manual"] = dest_rel

    # Media types: file written once, ss_metadata pointer always ensured.
    for esde_type in media_types:
        mt = MEDIA_TYPE_MAP.get(esde_type)
        if mt is None:
            continue
        src = indexes.get(esde_type, {}).get(rom.fs_name_no_ext)
        if not src:
            continue
        dest_dir = fs_resource_handler.get_media_resources_path(
            rom.platform_id, rom.id, mt
        )
        dest_name = f"{mt.value}{src.suffix.lower()}"
        dest_rel = f"{dest_dir}/{dest_name}"
        if not await fs_resource_handler.file_exists(dest_rel):
            if dry_run:
                files += 1
            else:
                await fs_resource_handler.write_file(src.read_bytes(), dest_dir, dest_name)
                _flush_path(Path(str(fs_resource_handler.base_path)) / dest_rel)
                files += 1
        key = f"{mt.value}_path"
        if ss_meta.get(key) != dest_rel:
            if dry_run:
                db_keys += 1
            else:
                db_keys += 1
                ss_meta[key] = dest_rel

    if not dry_run and (updates or ss_meta != (rom.ss_metadata or {})):
        if ss_meta != (rom.ss_metadata or {}):
            updates["ss_metadata"] = ss_meta
        db_rom_handler.update_rom(rom.id, updates)

    return files, db_keys


async def main() -> int:
    dry_run = os.environ.get("DRY_RUN", "0") in ("1", "true")
    cover_source = os.environ.get("COVER_SOURCE", "miximages")
    media_types = [
        t.strip()
        for t in os.environ.get("MEDIA_TYPES", DEFAULT_MEDIA_TYPES).split(",")
        if t.strip()
    ]
    bucket = expand_letters(os.environ.get("ROM_LETTERS", ""))
    wanted = {p.strip() for p in os.environ.get("PLATFORMS", "").split(",") if p.strip()}

    totals = {"files": 0, "db": 0}
    verb = "would write" if dry_run else "wrote"

    for platform in db_platform_handler.get_platforms():
        if wanted and platform.fs_slug not in wanted:
            continue

        pdir = MEDIA_DIR / platform.fs_slug
        if not pdir.is_dir():
            if wanted:
                print(f"[{platform.fs_slug}] no ES-DE media folder")
            continue

        needed = [cover_source, "manuals"] + media_types
        indexes: dict[str, dict[str, Path]] = {}
        for t in needed:
            indexes.setdefault(t, load_index(pdir / t))
        if not any(indexes.values()):
            print(f"[{platform.fs_slug}] media folders empty, skipping")
            continue

        roms = db_rom_handler.get_roms_scalar(platform_ids=[platform.id])
        selected = [r for r in roms if rom_in_bucket(r, bucket)]
        files = db_keys = 0
        for n, rom in enumerate(selected, 1):
            f, k = await import_rom(rom, indexes, media_types, cover_source, dry_run)
            files += f
            db_keys += k
            # Heartbeat: long exec streams get reset by idle timeouts when the
            # process stays silent for tens of minutes.
            if len(selected) >= 200 and n % 100 == 0:
                print(f"  [{platform.fs_slug}] {n}/{len(selected)}", flush=True)

        print(
            f"[{platform.fs_slug}] roms={len(selected)} "
            f"files {verb}={files} db_keys {verb}={db_keys}"
        )
        totals["files"] += files
        totals["db"] += db_keys

    print(f"TOTAL: files={totals['files']} db_keys={totals['db']} dry_run={dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
