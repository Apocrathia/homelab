"""Fixture tests for on-disk ROM classification against a DAT CRC32 index."""

import zipfile
import zlib

from rom_audit.dat import RomEntry
from rom_audit.scan import classify_file, is_junk, iter_rom_files


def _crc32(payload: bytes) -> str:
    return f"{zlib.crc32(payload) & 0xFFFFFFFF:08x}"


def _index(*entries: RomEntry) -> dict[str, RomEntry]:
    return {entry.crc32: entry for entry in entries}


def test_classify_loose_file_matched(tmp_path):
    payload = b"NES ROM PAYLOAD BYTES"
    rom = RomEntry(name="Test Game (World).nes", game_name="Test Game (World)", crc32=_crc32(payload))
    path = tmp_path / rom.name
    path.write_bytes(payload)

    result = classify_file(path, _index(rom))

    assert result.status == "matched"
    assert result.crc32 == rom.crc32


def test_classify_loose_file_wrong_name(tmp_path):
    payload = b"NES ROM PAYLOAD BYTES"
    rom = RomEntry(name="Test Game (World).nes", game_name="Test Game (World)", crc32=_crc32(payload))
    path = tmp_path / "Renamed Game.nes"
    path.write_bytes(payload)

    result = classify_file(path, _index(rom))

    assert result.status == "wrong_name"
    assert result.expected_name == rom.name


def test_classify_loose_file_unknown(tmp_path):
    path = tmp_path / "Homebrew.nes"
    path.write_bytes(b"unrecognized payload")

    result = classify_file(path, {})

    assert result.status == "unknown"
    assert result.expected_name is None


def test_classify_zip_matched(tmp_path):
    payload = b"NES ROM PAYLOAD BYTES"
    rom = RomEntry(name="Test Game (World).nes", game_name="Test Game (World)", crc32=_crc32(payload))
    zip_path = tmp_path / "Test Game (World).zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr(rom.name, payload)

    result = classify_file(zip_path, _index(rom))

    assert result.status == "matched"
    assert result.crc32 == rom.crc32


def test_classify_zip_wrong_name(tmp_path):
    payload = b"NES ROM PAYLOAD BYTES"
    rom = RomEntry(name="Test Game (World).nes", game_name="Test Game (World)", crc32=_crc32(payload))
    zip_path = tmp_path / "Renamed.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr(rom.name, payload)

    result = classify_file(zip_path, _index(rom))

    assert result.status == "wrong_name"
    assert result.expected_name == "Test Game (World).zip"


def test_classify_zip_unmatched_crc_is_unknown(tmp_path):
    zip_path = tmp_path / "Homebrew.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("Homebrew.nes", b"not in any dat")

    result = classify_file(zip_path, {})

    assert result.status == "unknown"


def test_classify_zip_multi_file_is_unknown(tmp_path):
    zip_path = tmp_path / "Multi.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("a.nes", b"aaa")
        zf.writestr("b.nes", b"bbb")

    result = classify_file(zip_path, {})

    assert result.status == "unknown"
    assert result.message is not None


def test_is_junk_skips_known_sidecars(tmp_path):
    assert is_junk(tmp_path / ".DS_Store")
    assert is_junk(tmp_path / "systeminfo.txt")
    assert is_junk(tmp_path / "metadata.txt")
    assert is_junk(tmp_path / "save.srm")
    assert not is_junk(tmp_path / "Test Game (World).nes")


def test_iter_rom_files_skips_junk(tmp_path):
    (tmp_path / "Game.zip").write_bytes(b"pretend zip contents")
    (tmp_path / ".DS_Store").write_bytes(b"junk")
    (tmp_path / "save.srm").write_bytes(b"junk")

    found = sorted(p.name for p in iter_rom_files(tmp_path))

    assert found == ["Game.zip"]


def test_inventory_provider_lists_without_hashing(tmp_path):
    from rom_audit.scan import load_config, run_audit

    library = tmp_path / "emulation"
    roms = library / "roms" / "3do"
    roms.mkdir(parents=True)
    (roms / "Game (USA).chd").write_bytes(b"chd-bytes")
    (roms / "metadata.txt").write_text("skip")
    cfg_path = tmp_path / "systems.yaml"
    cfg_path.write_text(
        "library_root: unused\n"
        "dats_dir: dats\n"
        "roms_dir: roms\n"
        "systems:\n"
        "  3do:\n"
        "    enabled: false\n"
        "    provider: inventory\n"
    )

    config = load_config(cfg_path, library_root_override=library)
    assert config.systems["3do"].dat is None

    events: list[dict] = []

    class Capture:
        def emit(self, event, level="info", message=None, **fields):  # noqa: ANN001
            rec = {"event": event, "level": level, **{k: v for k, v in fields.items() if v is not None}}
            if message is not None:
                rec["message"] = message
            events.append(rec)

    code = run_audit(config, Capture(), requested_systems=["3do"])  # type: ignore[arg-type]
    assert code == 0
    files = [e for e in events if e["event"] == "file"]
    assert len(files) == 1
    assert files[0]["status"] == "inventory"
    assert files[0]["size"] == 9
    summary = next(e for e in events if e["event"] == "system_summary")
    assert summary["inventory"] == 1
    assert summary["provider"] == "inventory"
