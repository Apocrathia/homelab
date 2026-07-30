"""Config loading, directory walking, and ROM classification against DATs."""

from __future__ import annotations

import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from rom_audit.dat import DatParseError, RomEntry, parse_dat
from rom_audit.emit import Emitter
from rom_audit.hash import ZipPayloadError, hash_loose_file, hash_zip_inner

PROVIDER_NO_INTRO = "no-intro"
PROVIDER_INVENTORY = "inventory"
SUPPORTED_PROVIDERS = {PROVIDER_NO_INTRO, PROVIDER_INVENTORY}

JUNK_FILENAMES = {".ds_store", "systeminfo.txt", "metadata.txt"}
JUNK_EXTENSIONS = {".srm"}


class ConfigError(ValueError):
    """Raised when systems.yaml is missing, unreadable, or malformed."""


@dataclass(frozen=True)
class SystemConfig:
    name: str
    enabled: bool
    provider: str
    dat: str | None = None
    dat_name: str | None = None


@dataclass(frozen=True)
class Config:
    library_root: Path
    dats_dir: str
    roms_dir: str
    systems: dict[str, SystemConfig]

    @property
    def dats_path(self) -> Path:
        return self.library_root / self.dats_dir

    @property
    def roms_path(self) -> Path:
        return self.library_root / self.roms_dir


def load_config(config_path: Path, library_root_override: Path | None = None) -> Config:
    """Load and validate systems.yaml."""
    try:
        raw_text = config_path.read_text()
    except OSError as exc:
        raise ConfigError(f"cannot read config '{config_path}': {exc}") from exc

    try:
        raw: dict[str, Any] = yaml.safe_load(raw_text) or {}
    except yaml.YAMLError as exc:
        raise ConfigError(f"invalid YAML in '{config_path}': {exc}") from exc

    if library_root_override is None and "library_root" not in raw:
        raise ConfigError("config missing 'library_root' and no --library-root override given")
    library_root = library_root_override or Path(raw["library_root"])

    systems: dict[str, SystemConfig] = {}
    for name, entry in (raw.get("systems") or {}).items():
        if not isinstance(entry, dict):
            raise ConfigError(f"system '{name}' must be a mapping")
        provider = str(entry.get("provider", ""))
        dat = entry.get("dat")
        if provider != PROVIDER_INVENTORY and not dat:
            raise ConfigError(f"system '{name}' is missing a 'dat' entry")
        systems[name] = SystemConfig(
            name=name,
            enabled=bool(entry.get("enabled", False)),
            provider=provider,
            dat=str(dat) if dat is not None else None,
            dat_name=entry.get("dat_name"),
        )

    return Config(
        library_root=library_root,
        dats_dir=raw.get("dats_dir", "dats"),
        roms_dir=raw.get("roms_dir", "roms"),
        systems=systems,
    )


def select_systems(config: Config, requested: list[str] | None) -> tuple[list[SystemConfig], list[str]]:
    """Resolve which systems to audit this run.

    Explicit ``--system`` names run even when ``enabled: false`` (one-shot
    operator intent). Omitting ``--system`` runs only ``enabled: true``.

    Returns (systems_to_run, unknown_names). Names passed via --system that
    don't exist in the config are returned separately so the caller can
    report them as hard errors.
    """
    if requested:
        unknown = [name for name in requested if name not in config.systems]
        return [config.systems[name] for name in requested if name in config.systems], unknown

    return [system for system in config.systems.values() if system.enabled], []


def is_junk(path: Path) -> bool:
    """True for known sidecar/OS-noise files that should not be classified."""
    return path.name.lower() in JUNK_FILENAMES or path.suffix.lower() in JUNK_EXTENSIONS


def iter_rom_files(system_dir: Path) -> Iterator[Path]:
    """Yield candidate ROM files under a system's roms directory, skipping junk."""
    for path in sorted(system_dir.rglob("*")):
        if path.is_file() and not is_junk(path):
            yield path


def _expected_zip_name(rom_name: str) -> str:
    return f"{Path(rom_name).stem}.zip"


@dataclass(frozen=True)
class FileResult:
    path: Path
    status: str  # matched | wrong_name | unknown
    crc32: str | None = None
    sha1: str | None = None
    size: int | None = None
    expected_name: str | None = None
    message: str | None = None


def classify_file(path: Path, crc_index: dict[str, RomEntry]) -> FileResult:
    """Classify a single on-disk ROM file as matched, wrong_name, or unknown."""
    if path.suffix.lower() == ".zip":
        try:
            _, hashed = hash_zip_inner(path)
        except (ZipPayloadError, zipfile.BadZipFile) as exc:
            return FileResult(path=path, status="unknown", message=str(exc))

        rom = crc_index.get(hashed.crc32)
        if rom is None:
            return FileResult(path=path, status="unknown", crc32=hashed.crc32, sha1=hashed.sha1, size=hashed.size)

        expected = _expected_zip_name(rom.name)
        status = "matched" if path.name == expected else "wrong_name"
        return FileResult(
            path=path, status=status, crc32=hashed.crc32, sha1=hashed.sha1, size=hashed.size, expected_name=expected
        )

    hashed = hash_loose_file(path)
    rom = crc_index.get(hashed.crc32)
    if rom is None:
        return FileResult(path=path, status="unknown", crc32=hashed.crc32, sha1=hashed.sha1, size=hashed.size)

    status = "matched" if path.name == rom.name else "wrong_name"
    return FileResult(
        path=path, status=status, crc32=hashed.crc32, sha1=hashed.sha1, size=hashed.size, expected_name=rom.name
    )


def run_audit(config: Config, emitter: Emitter, requested_systems: list[str] | None) -> int:
    """Audit the selected systems, emitting events for every file plus summaries.

    Returns the process exit code: non-zero only when a system could not be
    audited at all (unknown system name, unreadable/mismatched DAT, or
    missing roms directory) -- never for on-disk unknown/wrong_name ROMs.
    """
    to_run, unknown_names = select_systems(config, requested_systems)
    emitter.emit("run_start", systems=[s.name for s in to_run] or None, library_root=str(config.library_root))

    hard_errors = 0
    systems_ok = 0
    systems_skipped = 0
    totals = {"matched": 0, "wrong_name": 0, "unknown": 0, "inventory": 0}

    for name in unknown_names:
        hard_errors += 1
        emitter.emit(
            "system_summary",
            level="error",
            system=name,
            status="error",
            message="unknown system requested (not in config)",
        )

    for system in to_run:
        if system.provider not in SUPPORTED_PROVIDERS:
            systems_skipped += 1
            emitter.emit(
                "system_summary",
                level="warn",
                system=system.name,
                status="skipped",
                message=f"provider '{system.provider}' is out of scope for this auditor",
            )
            continue

        system_dir = config.roms_path / system.name
        if not system_dir.is_dir():
            hard_errors += 1
            emitter.emit(
                "system_summary",
                level="error",
                system=system.name,
                status="error",
                message=f"roms directory not found: {system_dir}",
            )
            continue

        if system.provider == PROVIDER_INVENTORY:
            inventory_total = 0
            for path in iter_rom_files(system_dir):
                inventory_total += 1
                try:
                    size = path.stat().st_size
                except OSError as exc:
                    emitter.emit(
                        "file",
                        level="warn",
                        status="inventory",
                        system=system.name,
                        path=str(path.relative_to(system_dir)),
                        message=str(exc),
                    )
                    continue
                emitter.emit(
                    "file",
                    level="info",
                    status="inventory",
                    system=system.name,
                    path=str(path.relative_to(system_dir)),
                    size=size,
                )
            systems_ok += 1
            totals["inventory"] += inventory_total
            emitter.emit(
                "system_summary",
                system=system.name,
                status="ok",
                provider=PROVIDER_INVENTORY,
                total=inventory_total,
                inventory=inventory_total,
            )
            continue

        assert system.dat is not None  # validated in load_config for no-intro
        dat_path = config.dats_path / system.dat
        try:
            dat = parse_dat(dat_path)
        except (DatParseError, OSError) as exc:
            hard_errors += 1
            emitter.emit("system_summary", level="error", system=system.name, status="error", message=str(exc))
            continue

        if system.dat_name and dat.header_name != system.dat_name:
            hard_errors += 1
            emitter.emit(
                "system_summary",
                level="error",
                system=system.name,
                status="error",
                message=f"DAT header name mismatch: expected {system.dat_name!r}, found {dat.header_name!r}",
            )
            continue

        crc_index = dat.index_by_crc32()
        counts = {"matched": 0, "wrong_name": 0, "unknown": 0}

        for path in iter_rom_files(system_dir):
            result = classify_file(path, crc_index)
            counts[result.status] += 1
            emitter.emit(
                "file",
                level="info" if result.status == "matched" else "warn",
                status=result.status,
                system=system.name,
                path=str(path.relative_to(system_dir)),
                crc32=result.crc32,
                sha1=result.sha1,
                size=result.size,
                expected_name=result.expected_name,
                message=result.message,
            )

        for key, value in counts.items():
            totals[key] += value
        systems_ok += 1
        emitter.emit("system_summary", system=system.name, status="ok", total=sum(counts.values()), **counts)

    emitter.emit(
        "run_summary",
        level="error" if hard_errors else "info",
        systems_ok=systems_ok,
        systems_skipped=systems_skipped,
        systems_error=hard_errors,
        total=sum(totals.values()),
        **totals,
    )

    return 1 if hard_errors else 0
