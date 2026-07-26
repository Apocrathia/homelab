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
import re
import sys
from pathlib import Path

LOG = logging.getLogger(__name__)

DEFAULT_DIFF_MAX_BYTES = 120_000
DEFAULT_FILES_MAX_LINES = 500
DEFAULT_DESC_MAX_CHARS = 800

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
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)

    output_path = Path(os.environ.get("PROMPT_OUTPUT_PATH", "")).expanduser()
    if not output_path:
        LOG.error("PROMPT_OUTPUT_PATH is required")
        return 1

    diff_path = Path(os.environ.get("DIFF_PATH", "")).expanduser()
    files_path = Path(os.environ.get("CHANGED_FILES_PATH", "")).expanduser()

    diff_max_bytes = int(os.environ.get("DIFF_MAX_BYTES", str(DEFAULT_DIFF_MAX_BYTES)))
    files_max_lines = int(os.environ.get("CHANGED_FILES_MAX_LINES", str(DEFAULT_FILES_MAX_LINES)))
    desc_max_chars = int(os.environ.get("DESC_MAX_CHARS", str(DEFAULT_DESC_MAX_CHARS)))

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

    parts: list[str] = [
        "[MR_CHANGE_SUMMARY]",
        "",
        "You are running the **MR Change Summary** skill, invoked from a",
        "GitLab CI job. This is **not a conversation**. There is no human",
        "in the loop on this turn. You will not receive follow-up messages",
        "to clarify scope. Follow the protocol in your system prompt to",
        "completion and end by calling `create_mr_note` /",
        "`update_mr_note` to post the change-summary comment on the MR.",
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
        "",
        f"## Full diff (truncated={diff_truncated}, original_bytes={diff_bytes})",
        "",
        "```diff",
        diff_text if diff_text.strip() else "(empty diff)",
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
        f"3. **List existing notes.** Call `list_mr_notes(project_id={project_id},",
        f"   merge_request_iid={mr_iid})` and look for an existing note whose",
        "   body starts with `<!-- mr-change-summary -->`.",
        "4. **Post or update.** If no marker note exists, call",
        f"   `create_mr_note(project_id={project_id},",
        f"   merge_request_iid={mr_iid}, body=<your composed comment>)`.",
        f"   If one exists, call `update_mr_note(project_id={project_id},",
        f"   merge_request_iid={mr_iid}, note_id=<existing id>,",
        "   body=<your composed comment>)`.",
        "5. **Confirm.** Your final response to the caller must include",
        "   the note ID returned by the create/update tool, e.g.",
        f"   \"Posted note <id> on MR !{mr_iid}.\" If the tool call failed,",
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
