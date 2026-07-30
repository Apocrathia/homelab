"""No-Intro DAT (Logiqx XML) parsing."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from defusedxml import ElementTree as ET


@dataclass(frozen=True)
class RomEntry:
    name: str
    game_name: str
    crc32: str
    size: int | None = None
    sha1: str | None = None


@dataclass
class Dat:
    header_name: str | None
    roms: list[RomEntry] = field(default_factory=list)

    def index_by_crc32(self) -> dict[str, RomEntry]:
        """Map lowercase CRC32 hex to the first ROM entry with that checksum."""
        index: dict[str, RomEntry] = {}
        for rom in self.roms:
            index.setdefault(rom.crc32, rom)
        return index


class DatParseError(ValueError):
    """Raised when a DAT file cannot be parsed or has no usable rom entries."""


def parse_dat(path: Path) -> Dat:
    """Parse a Logiqx-style No-Intro DAT XML file into a `Dat`."""
    try:
        tree = ET.parse(path)
    except (ET.ParseError, OSError) as exc:
        raise DatParseError(f"failed to parse DAT XML '{path}': {exc}") from exc

    root = tree.getroot()
    header = root.find("header")
    header_name = header.findtext("name") if header is not None else None

    roms: list[RomEntry] = []
    for game in list(root.findall("game")) + list(root.findall("machine")):
        game_name = game.get("name", "")
        for rom in game.findall("rom"):
            name = rom.get("name")
            crc = rom.get("crc")
            if not name or not crc:
                continue
            size = rom.get("size")
            roms.append(
                RomEntry(
                    name=name,
                    game_name=game_name,
                    crc32=crc.lower(),
                    size=int(size) if size is not None else None,
                    sha1=rom.get("sha1"),
                )
            )

    if not roms:
        raise DatParseError(f"no rom entries found in DAT: {path}")

    return Dat(header_name=header_name, roms=roms)
