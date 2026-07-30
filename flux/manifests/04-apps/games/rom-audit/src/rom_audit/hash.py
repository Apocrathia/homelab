"""Hashing helpers for loose ROM files and single-file cart zip payloads."""

from __future__ import annotations

import hashlib
import zipfile
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import IO

CHUNK_SIZE = 1024 * 1024


@dataclass(frozen=True)
class HashResult:
    crc32: str
    sha1: str
    size: int


class ZipPayloadError(ValueError):
    """Raised when a zip does not contain exactly one candidate ROM payload."""


def _sha1_of_stream(fileobj: IO[bytes]) -> str:
    digest = hashlib.sha1()
    while chunk := fileobj.read(CHUNK_SIZE):
        digest.update(chunk)
    return digest.hexdigest()


def hash_loose_file(path: Path) -> HashResult:
    """Hash a non-archive ROM file directly."""
    crc = 0
    size = 0
    digest = hashlib.sha1()
    with path.open("rb") as fh:
        while chunk := fh.read(CHUNK_SIZE):
            crc = zlib.crc32(chunk, crc)
            size += len(chunk)
            digest.update(chunk)
    return HashResult(crc32=f"{crc & 0xFFFFFFFF:08x}", sha1=digest.hexdigest(), size=size)


def _is_junk_zip_member(name: str) -> bool:
    base = name.rsplit("/", 1)[-1]
    if not base:
        return True  # directory entry
    return base.lower() == ".ds_store" or name.startswith("__MACOSX/")


def hash_zip_inner(path: Path) -> tuple[str, HashResult]:
    """Return (inner_filename, HashResult) for the single ROM payload inside a cart zip.

    Raises ZipPayloadError if the zip does not contain exactly one candidate file.
    """
    with zipfile.ZipFile(path) as zf:
        candidates = [info for info in zf.infolist() if not info.is_dir() and not _is_junk_zip_member(info.filename)]
        if len(candidates) != 1:
            raise ZipPayloadError(f"expected exactly one file inside zip, found {len(candidates)}")
        info = candidates[0]
        crc32 = f"{info.CRC & 0xFFFFFFFF:08x}"
        with zf.open(info) as fh:
            sha1 = _sha1_of_stream(fh)
        return info.filename, HashResult(crc32=crc32, sha1=sha1, size=info.file_size)
