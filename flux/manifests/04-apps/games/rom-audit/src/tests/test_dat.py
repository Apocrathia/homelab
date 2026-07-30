"""Tests for No-Intro DAT parsing."""

from pathlib import Path

import pytest

from rom_audit.dat import DatParseError, parse_dat

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_dat_reads_header_and_roms():
    dat = parse_dat(FIXTURES / "nes.dat")

    assert dat.header_name == "Nintendo - Nintendo Entertainment System (Headered)"
    assert len(dat.roms) == 2

    index = dat.index_by_crc32()
    assert index["d445f698"].name == "Test Game (World).nes"
    assert index["deadbeef"].name == "Another Game (World).nes"


def test_parse_dat_rejects_malformed_xml(tmp_path):
    bad = tmp_path / "bad.dat"
    bad.write_text("<datafile><game name='x'>")

    with pytest.raises(DatParseError):
        parse_dat(bad)


def test_parse_dat_rejects_dat_with_no_roms(tmp_path):
    empty = tmp_path / "empty.dat"
    empty.write_text("<datafile><header><name>Empty</name></header></datafile>")

    with pytest.raises(DatParseError):
        parse_dat(empty)


def test_parse_dat_rejects_missing_file(tmp_path):
    with pytest.raises(DatParseError):
        parse_dat(tmp_path / "does-not-exist.dat")
