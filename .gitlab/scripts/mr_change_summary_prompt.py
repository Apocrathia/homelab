#!/usr/bin/env python3
"""Build the agent prompt for the MR change-summary CI job.

Reads MR context from environment variables (`CI_*`) and the MR diff /
changed-files output from files passed in via env. Writes the rendered
markdown prompt to PROMPT_OUTPUT_PATH.

Kept separate from the A2A invoke script to keep shell quoting simple in
the GitLab CI YAML — instead of trying to heredoc a multi-KB prompt with
a hostile diff payload, the YAML hands us file paths and env vars and
we build the markdown safely here.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

LOG = logging.getLogger(__name__)

DEFAULT_DIFF_MAX_BYTES = 120_000
DEFAULT_FILES_MAX_LINES = 500


def _read_truncated(path: Path, max_bytes: int) -> tuple[str, int, bool]:
    if not path.is_file():
        return ("", 0, False)
    raw = path.read_bytes()
    original = len(raw)
    if original > max_bytes:
        return (raw[:max_bytes].decode("utf-8", errors="replace"), original, True)
    return (raw.decode("utf-8", errors="replace"), original, False)


def _truncate_lines(text: str, max_lines: int) -> tuple[str, bool]:
    lines = text.splitlines()
    if len(lines) <= max_lines:
        return (text, False)
    return ("\n".join(lines[:max_lines]), True)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)

    output_path = Path(os.environ.get("PROMPT_OUTPUT_PATH", "")).expanduser()
    if not output_path:
        LOG.error("PROMPT_OUTPUT_PATH is required")
        return 1

    diff_path = Path(os.environ.get("DIFF_PATH", "")).expanduser()
    files_path = Path(os.environ.get("CHANGED_FILES_PATH", "")).expanduser()

    diff_max_bytes = int(os.environ.get("DIFF_MAX_BYTES", str(DEFAULT_DIFF_MAX_BYTES)))
    files_max_lines = int(os.environ.get("CHANGED_FILES_MAX_LINES", str(DEFAULT_FILES_MAX_LINES)))

    diff_text, diff_bytes, diff_truncated = _read_truncated(diff_path, diff_max_bytes)
    files_raw = files_path.read_text(encoding="utf-8") if files_path.is_file() else ""
    files_text, files_truncated = _truncate_lines(files_raw, files_max_lines)

    project_path = os.environ.get("CI_PROJECT_PATH", "(unknown)")
    project_id = os.environ.get("CI_PROJECT_ID", "(unknown)")
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "(unknown)")
    src_branch = os.environ.get("CI_MERGE_REQUEST_SOURCE_BRANCH_NAME", "(unknown)")
    tgt_branch = os.environ.get("CI_MERGE_REQUEST_TARGET_BRANCH_NAME", "(unknown)")
    mr_url = (
        f"{os.environ.get('CI_MERGE_REQUEST_PROJECT_URL', '').rstrip('/')}"
        f"/-/merge_requests/{mr_iid}"
    )
    mr_title = os.environ.get("CI_MERGE_REQUEST_TITLE", "(no title)")
    mr_desc = os.environ.get("CI_MERGE_REQUEST_DESCRIPTION", "")

    parts: list[str] = [
        "[MR_CHANGE_SUMMARY]",
        "",
        "You are being invoked from CI to analyze a GitLab merge request and",
        'post a change-summary comment. Follow the "MR Change-Summary Protocol"',
        "in your system prompt.",
        "",
        "## Target",
        "",
        f"- GitLab project path: `{project_path}`",
        f"- GitLab project ID: `{project_id}`",
        f"- MR IID: `{mr_iid}`",
        f"- Source branch: `{src_branch}`",
        f"- Target branch: `{tgt_branch}`",
        f"- MR web URL: {mr_url}",
        "",
        "## MR title",
        "",
        mr_title,
        "",
        "## MR description (verbatim, may include Renovate-generated changelog)",
        "",
        mr_desc if mr_desc.strip() else "_(empty)_",
        "",
        f"## Changed files (truncated={files_truncated})",
        "",
        "```",
        files_text if files_text.strip() else "(no changed files reported)",
        "```",
        "",
        f"## Full diff (truncated={diff_truncated}, original_bytes={diff_bytes})",
        "",
        "```diff",
        diff_text if diff_text.strip() else "(empty diff)",
        "```",
        "",
        "## Your task",
        "",
        "1. Use the diff and description above as the seed.",
        "2. For every version delta, fetch upstream context (releases,",
        "   changelog, PRs, issues) using your github / gitlab tools. Do not",
        "   guess — pull actual data.",
        "3. Form your own opinion about what the bump means for this homelab",
        "   deployment. Note any breaking changes, default-behavior changes,",
        "   deprecations, or security fixes.",
        f"4. Post (or update) a single MR comment on `{project_path}` MR",
        f"   `!{mr_iid}` using `list_mr_notes` + `create_mr_note` /",
        "   `update_mr_note`. The note body MUST start with the marker line",
        "   `<!-- mr-change-summary -->` so future runs can find and update it.",
        "5. Be terse. The reader is the maintainer of this MR.",
        "",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(parts), encoding="utf-8")
    LOG.info("Wrote prompt to %s (%s bytes)", output_path, output_path.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
