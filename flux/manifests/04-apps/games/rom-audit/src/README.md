# rom_audit

Pure-Python package that compares ROM files on disk against No-Intro DATs and
reports `matched` / `wrong_name` / `unknown` for every file. Report only — it
never renames or deletes anything.

See the [app README](../README.md) for what gets deployed, the share layout,
and `systems.yaml`.

## Layout

| Module                  | Responsibility                                               |
| ----------------------- | ------------------------------------------------------------ |
| `rom_audit/dat.py`      | Parses Logiqx-style No-Intro DAT XML, indexes ROMs by CRC32  |
| `rom_audit/hash.py`     | CRC32/SHA1 hashing for loose files and single-file cart zips |
| `rom_audit/scan.py`     | Config loading, directory walking, and classification        |
| `rom_audit/emit.py`     | Text or NDJSON event output, optionally teed to a file       |
| `rom_audit/__main__.py` | CLI entry point (`python -m rom_audit`)                      |

## Local development

Uses [uv](https://docs.astral.sh/uv/):

```bash
cd src
uv sync
uv run python -m rom_audit --config /path/to/systems.yaml --system nes
```

### Format / lint / test

```bash
uv run ruff format .
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

## Tests

`tests/` uses fixtures only — a small synthetic DAT
(`tests/fixtures/nes.dat`) and ROM payloads generated at test time (no real
ROM files, no committed binaries). `test_dat.py` covers DAT parsing;
`test_classify.py` covers classification of loose files and cart zips
(matched, wrong_name, unknown, multi-file zips, junk filtering).

## Regenerating `uv.lock`

Run `uv lock` in this directory after changing `dependencies` in
`pyproject.toml`, then re-run the format/lint/test commands above.
