#!/usr/bin/env python3
"""Build the agent prompt for the MR change-summary CI job.

Reads MR context from environment variables (`CI_*`) and the MR diff /
changed-files / numstat output from files passed in via env. Writes the
rendered markdown prompt to PROMPT_OUTPUT_PATH.

The diff is filtered down to version-pin hunks (pin keys like image/tag/
chart/version, digests, `# renovate:` comments, Renovate config files)
before it enters the prompt; every other hunk is dropped and represented
by the changed-files list plus the numstat change-volume list instead.
With FILTERED_DIFF_OUTPUT_PATH set, the filtered diff is also written to
that path so the invoke script can hash it instead of the raw diff.

Kept separate from the A2A invoke script to keep shell quoting simple in
the GitLab CI YAML — instead of trying to heredoc a multi-KB prompt with
a hostile diff payload, the YAML hands us file paths and env vars and
we build the markdown safely here.
"""

from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path
from typing import NamedTuple

LOG = logging.getLogger(__name__)

DEFAULT_DIFF_MAX_BYTES = 120_000
DEFAULT_FILES_MAX_LINES = 500
DEFAULT_DESC_MAX_CHARS = 800

# --- Version-pin hunk filter ---------------------------------------------
#
# The agent only needs hunks that carry version information; every other
# hunk is prompt bloat (and inference cost). A hunk is kept when any of
# its lines matches a pin marker; Renovate config files are kept whole.
# Bias toward recall: a kept non-pin hunk costs a few tokens, a dropped
# pin hunk costs a wrong summary.

_PIN_MARKER_SUBSTRINGS = ("# renovate:", "sha256:", "registryUrl=")
# YAML-ish pin keys, matched at line start (after optional whitespace)
# on +/- lines only.
_PIN_KEY_RE = re.compile(
    r"\s*(?:image|tag|chart|version|appVersion|repository|digest):"
)
_RENOVATE_CONFIG_NAMES = (
    "renovate.json",
    "renovate.json5",
    ".renovaterc",
    ".renovaterc.json",
    ".renovaterc.json5",
)
_HUNK_START_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@")


class FilterStats(NamedTuple):
    hunks_in: int
    hunks_out: int
    bytes_in: int
    bytes_out: int


def _unquote(path: str) -> str:
    if len(path) >= 2 and path.startswith('"') and path.endswith('"'):
        return path[1:-1]
    return path


def _header_paths(header_lines: list[str]) -> set[str]:
    """Candidate repo paths of a file section, from its header lines."""
    paths: set[str] = set()
    for line in header_lines:
        if line.startswith("diff --git "):
            m = re.match(r"^diff --git a/(.+?) b/(.+)$", line)
            if m:
                paths.update((_unquote(m.group(1)), _unquote(m.group(2))))
        elif line.startswith(("--- ", "+++ ")):
            p = line[4:]
            if p.startswith(("a/", "b/")):
                p = p[2:]
            paths.add(_unquote(p))
        elif line.startswith(("rename from ", "rename to ", "copy from ", "copy to ")):
            paths.add(_unquote(line.rsplit(" ", 1)[1]))
    return paths


def _is_renovate_config(paths: set[str]) -> bool:
    """True when a path is a Renovate config (basename or path suffix)."""
    for p in paths:
        if p.rsplit("/", 1)[-1] in _RENOVATE_CONFIG_NAMES:
            return True
        if any(p == name or p.endswith("/" + name) for name in _RENOVATE_CONFIG_NAMES):
            return True
    return False


def _hunk_is_pin(hunk_lines: list[str]) -> bool:
    """True when any body line of the hunk carries version-pin signal."""
    for line in hunk_lines[1:]:  # [0] is the @@ header
        if any(marker in line for marker in _PIN_MARKER_SUBSTRINGS):
            return True
        if line[:1] in ("+", "-") and _PIN_KEY_RE.match(line[1:]):
            return True
    return False


def _file_sections(lines: list[str]) -> list[tuple[list[str], list[list[str]]]]:
    """Split diff lines into (header, hunks) per file section.

    Header = everything from `diff --git` up to the first hunk; hunk = the
    `@@` line plus body lines. Lines before the first `diff --git` are
    dropped (not diff structure).
    """
    sections: list[tuple[list[str], list[list[str]]]] = []
    header: list[str] | None = None
    hunks: list[list[str]] = []
    hunk: list[str] | None = None

    def flush_hunk() -> None:
        nonlocal hunk
        if hunk is not None:
            hunks.append(hunk)
            hunk = None

    def flush_section() -> None:
        nonlocal header, hunks
        flush_hunk()
        if header is not None:
            sections.append((header, hunks))
        header = None
        hunks = []

    for line in lines:
        if line.startswith("diff --git "):
            flush_section()
            header = [line]
        elif _HUNK_START_RE.match(line):
            flush_hunk()
            hunk = [line]
        elif hunk is not None:
            hunk.append(line)
        elif header is not None:
            header.append(line)
    flush_section()
    return sections


def filter_version_pin_hunks(diff_text: str) -> tuple[str, FilterStats]:
    """Filter a unified diff down to version-pin hunks (pure function).

    Keeps the file header lines for files with surviving hunks plus only
    the surviving hunks; files whose hunks all drop contribute nothing.
    """
    out: list[str] = []
    hunks_in = 0
    hunks_out = 0
    for header, hunks in _file_sections(diff_text.splitlines()):
        keep_all = _is_renovate_config(_header_paths(header))
        kept = [h for h in hunks if keep_all or _hunk_is_pin(h)]
        hunks_in += len(hunks)
        hunks_out += len(kept)
        if kept:
            out.extend(header)
            for hunk in kept:
                out.extend(hunk)
    filtered = "\n".join(out)
    if out and diff_text.endswith("\n"):
        filtered += "\n"
    stats = FilterStats(
        hunks_in=hunks_in,
        hunks_out=hunks_out,
        bytes_in=len(diff_text.encode("utf-8")),
        bytes_out=len(filtered.encode("utf-8")),
    )
    return (filtered, stats)


# Renovate's MR description is mostly chrome the agent should fetch itself
# from upstream, not regurgitate. We strip the rendered changelog so the
# agent stays focused on the diff and does its own research instead of
# reading Renovate's cheat sheet.
_RE_DETAILS_BLOCK = re.compile(r"<details>.*?</details>", re.DOTALL | re.IGNORECASE)
_RE_HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_RENOVATE_CHROME_HEADERS = (
    "### Release Notes",
    "## Release Notes",
    "### Configuration",
    "## Configuration",
)


def _read_optional(path: Path) -> str | None:
    """Read a file if it exists and is readable; None otherwise."""
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def _cap_bytes(text: str, max_bytes: int) -> tuple[str, int, bool]:
    """Cap text at max_bytes of UTF-8. Returns (text, original_bytes, truncated)."""
    original = len(text.encode("utf-8"))
    if original <= max_bytes:
        return (text, original, False)
    capped = text.encode("utf-8")[:max_bytes].decode("utf-8", errors="replace")
    return (capped, original, True)


def _truncate_lines(text: str, max_lines: int) -> tuple[str, bool]:
    lines = text.splitlines()
    if len(lines) <= max_lines:
        return (text, False)
    return ("\n".join(lines[:max_lines]), True)


def _strip_renovate_chrome(desc: str, max_chars: int) -> tuple[str, int, bool]:
    """Return (stripped_text, original_length, was_truncated).

    Strips the rendered upstream changelog (`### Release Notes`, the
    Renovate `### Configuration` block, every `<details>...</details>`
    collapsible, and HTML comments), then enforces a hard character cap
    as a safety net for non-Renovate prose.
    """
    original_len = len(desc)
    if not desc.strip():
        return ("", original_len, False)

    text = desc
    # Cut at the earliest Renovate chrome header — everything below it
    # (changelog, configuration, automerge schedule, debug trailer) is
    # noise for the agent's purposes.
    cut_idx = len(text)
    for header in _RENOVATE_CHROME_HEADERS:
        idx = text.find(header)
        if 0 <= idx < cut_idx:
            cut_idx = idx
    text = text[:cut_idx]

    # Strip any remaining details blocks above the chrome cut (Renovate
    # occasionally inlines them in the framing area).
    text = _RE_DETAILS_BLOCK.sub("", text)
    text = _RE_HTML_COMMENT.sub("", text)
    text = text.strip()

    truncated = False
    if len(text) > max_chars:
        text = text[:max_chars].rstrip() + "\n\n…[truncated]"
        truncated = True

    return (text, original_len, truncated)


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout
    )

    output_path = Path(os.environ.get("PROMPT_OUTPUT_PATH", "")).expanduser()
    if not output_path:
        LOG.error("PROMPT_OUTPUT_PATH is required")
        return 1

    diff_path = Path(os.environ.get("DIFF_PATH", "")).expanduser()
    files_path = Path(os.environ.get("CHANGED_FILES_PATH", "")).expanduser()
    numstat_path = Path(os.environ.get("NUMSTAT_PATH", "")).expanduser()

    diff_max_bytes = int(os.environ.get("DIFF_MAX_BYTES", str(DEFAULT_DIFF_MAX_BYTES)))
    files_max_lines = int(
        os.environ.get("CHANGED_FILES_MAX_LINES", str(DEFAULT_FILES_MAX_LINES))
    )
    desc_max_chars = int(os.environ.get("DESC_MAX_CHARS", str(DEFAULT_DESC_MAX_CHARS)))

    diff_raw = _read_optional(diff_path) or ""
    filtered_diff, stats = filter_version_pin_hunks(diff_raw)
    LOG.info(
        "Diff filter: hunks_in=%s hunks_out=%s bytes_in=%s bytes_out=%s",
        stats.hunks_in,
        stats.hunks_out,
        stats.bytes_in,
        stats.bytes_out,
    )
    # DIFF_MAX_BYTES caps the FILTERED diff; the raw diff is filtered first.
    diff_text, filtered_bytes, diff_truncated = _cap_bytes(
        filtered_diff, diff_max_bytes
    )
    diff_bytes = stats.bytes_in
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
    mr_desc_raw = os.environ.get("CI_MERGE_REQUEST_DESCRIPTION", "")
    mr_desc, mr_desc_orig_len, mr_desc_truncated = _strip_renovate_chrome(
        mr_desc_raw, desc_max_chars
    )
    LOG.info(
        "MR description: original=%s chars, after_strip=%s chars, truncated=%s",
        mr_desc_orig_len,
        len(mr_desc),
        mr_desc_truncated,
    )

    # Sidecar for the invoke script's hash: hashing the filtered diff (not
    # the raw one) means prose-only edits stop re-triggering the agent.
    filtered_out_raw = os.environ.get("FILTERED_DIFF_OUTPUT_PATH", "")
    if filtered_out_raw:
        filtered_out = Path(filtered_out_raw).expanduser()
        filtered_out.parent.mkdir(parents=True, exist_ok=True)
        filtered_out.write_text(diff_text, encoding="utf-8")

    numstat_section: list[str] = []
    numstat_raw = _read_optional(numstat_path)
    if numstat_raw is not None:
        numstat_text, _ = _truncate_lines(numstat_raw, files_max_lines)
        numstat_section = [
            "",
            "## Change volume (additions/deletions per file)",
            "",
            "```text",
            numstat_text if numstat_text.strip() else "(no numstat output)",
            "```",
        ]

    parts: list[str] = [
        "[MR_CHANGE_SUMMARY]",
        "",
        "You are running the **MR Change Summary** skill, invoked from a",
        "GitLab CI job. This is **not a conversation**. There is no human",
        "in the loop on this turn. You will not receive follow-up messages",
        "to clarify scope. Follow the protocol in your system prompt to",
        "completion and end by calling `create_merge_request_note` /",
        "`update_merge_request_note` to post the change-summary comment on the MR.",
        "",
        "**Banned behaviors for this skill** (each one fails the run):",
        "",
        '- Asking clarifying questions ("Would you like me to...",',
        '  "Should I focus on...", "Please let me know how you\'d like to',
        '  proceed", etc.). The job script cannot answer you.',
        "- Summarizing the upstream data conversationally and stopping.",
        "  The deliverable is a posted MR note, not a chat reply.",
        "- Emojis or chat-assistant voice (no `🚀`, `✨`, `Here's a quick",
        "  overview`, etc.) outside the comment template's required",
        "  `## 🤖 Change Summary` header.",
        "- Treating an empty `search_repositories` result as a terminal",
        "  answer. Follow the system-prompt fallback (owner search →",
        "  candidate verification) before declaring upstream-not-found.",
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
        "## MR description (framing only; Renovate changelog stripped)",
        "",
        "Renovate's rendered upstream changelog has been removed from this",
        "section on purpose. Do not treat what's below as the source of truth",
        "for what changed upstream — fetch that yourself with your GitHub /",
        "GitLab tools as the protocol requires.",
        "",
        mr_desc if mr_desc.strip() else "_(empty)_",
        "",
        f"## Changed files (truncated={files_truncated})",
        "",
        "```",
        files_text if files_text.strip() else "(no changed files reported)",
        "```",
        *numstat_section,
        "",
        "## Filtered diff (version-pin hunks only; "
        f"truncated={diff_truncated}, original_bytes={diff_bytes}, "
        f"filtered_bytes={filtered_bytes})",
        "",
        "The diff below has been pre-filtered to hunks containing version",
        "pins, digests, or Renovate config. Non-version changes are NOT",
        "shown as hunks; they are represented by the changed-files list and",
        "the change-volume list above. For manual (non-version) changes,",
        "summarize at file level using those lists plus the MR",
        "title/description. Do not speculate about the content of hunks you",
        "cannot see; if a file's changes are not visible, say so in one",
        "line.",
        "",
        "```diff",
        diff_text if diff_text.strip() else "(no version-pin hunks; see lists above)",
        "```",
        "",
        "## Your task (in order — do not stop early)",
        "",
        "1. **Research.** Parse the diff for version deltas. For each one,",
        "   fetch real upstream context with your GitHub / GitLab tools",
        "   (releases, changelog, PRs, issues, commits). Do not guess.",
        "   Use the system-prompt fallback when an obvious lookup fails.",
        "2. **Compose.** Build the comment body in markdown using the",
        "   exact template from your system prompt. The first line MUST",
        "   be `<!-- mr-change-summary -->`. Do not include a trailing",
        "   `<!-- hash:... -->` line — the CI job appends that.",
        f"3. **List existing notes.** Call `get_merge_request_notes(project_id={project_id},",
        f"   merge_request_iid={mr_iid})` and look for an existing note whose",
        "   body starts with `<!-- mr-change-summary -->`.",
        "4. **Post or update.** If no marker note exists, call",
        f"   `create_merge_request_note(project_id={project_id},",
        f"   merge_request_iid={mr_iid}, body=<your composed comment>)`.",
        f"   If one exists, call `update_merge_request_note(project_id={project_id},",
        f"   merge_request_iid={mr_iid}, note_id=<existing id>,",
        "   body=<your composed comment>)`.",
        "5. **Confirm.** Your final response to the caller must include",
        "   the note ID returned by the create/update tool, e.g.",
        f'   "Posted note <id> on MR !{mr_iid}." If the tool call failed,',
        "   say so explicitly with the error message — do not claim",
        "   success.",
        "",
        "**You are not done until step 4 has executed and step 5 has",
        "confirmed it.** Steps 1-2 alone do not satisfy the job; the",
        "deliverable is a posted MR note.",
        "",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(parts), encoding="utf-8")
    LOG.info("Wrote prompt to %s (%s bytes)", output_path, output_path.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
