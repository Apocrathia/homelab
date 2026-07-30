"""CLI entry point: `python -m rom_audit` (or the `rom-audit` console script)."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from rom_audit.emit import Emitter
from rom_audit.scan import ConfigError, load_config, run_audit


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rom-audit",
        description="Compare ROM files on disk against No-Intro DATs. Report only: no rename or delete.",
    )
    parser.add_argument("--config", required=True, type=Path, help="path to systems.yaml")
    parser.add_argument("--library-root", type=Path, default=None, help="override library_root from config")
    parser.add_argument(
        "--system",
        action="append",
        dest="systems",
        metavar="NAME",
        help="limit the run to this system (repeatable); omit to audit all enabled systems",
    )
    parser.add_argument("--json", action="store_true", help="emit NDJSON instead of human-readable text")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="also write this run's output to a timestamped file under this directory",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        config = load_config(args.config, library_root_override=args.library_root)
    except ConfigError as exc:
        print(f"rom-audit: {exc}", file=sys.stderr)
        return 2

    output_file = None
    if args.output_dir is not None:
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        run_dir = args.output_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        output_path = run_dir / ("run.ndjson" if args.json else "run.txt")
        output_file = output_path.open("w")

    try:
        emitter = Emitter(json_mode=args.json, output_file=output_file)
        return run_audit(config, emitter, args.systems)
    finally:
        if output_file is not None:
            output_file.close()


if __name__ == "__main__":
    sys.exit(main())
