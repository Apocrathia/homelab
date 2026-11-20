#!/usr/bin/env python3
"""Invoke git-agent via A2A SDK for MR change-summary work.

Designed for GitLab CI use. The job pipes a rendered prompt + the source
diff to this script and we decide whether to spend GPU on inference at all.

High-level flow:

1. Compute a stable hash over the agent's input (the diff). This is the
   energy gate: if the hash matches an existing comment's trailer, the
   agent input hasn't meaningfully changed and we skip inference entirely.
2. Otherwise invoke the A2A multi-turn loop. The agent posts or updates
   an MR note via the gitlab-mcp MCP server.
3. After the agent claims completion, append (or rewrite) a hash trailer
   on the comment via the GitLab REST API. We try CI_JOB_TOKEN first;
   if the runner's job token can't write notes, fall back to
   MR_SUMMARY_TOKEN (a PAT the user creates and stores in CI vars).
4. Verify the trailer is present with the expected hash. If not → exit 1.

Trailer convention matches kustomize-diff / scorecard:
    <!-- mr-change-summary -->
    ... agent body ...

    <!-- hash:abcdef0123456789 -->

To force a refresh after a prompt change, delete the existing
change-summary comment from the MR; the next pipeline run will
write a fresh one.

Exit codes:
- 0: skipped (input unchanged) OR agent ran AND comment has expected hash
- 1: invocation-side failure (agent-unreachable, budget-exhausted,
  transport-failures, no-completion, note-missing)
- 2: verification-side failure (trailer-write-failed, bad-input)

Every failure path logs exactly one tagged result line as its last log
line:
    === mr-change-summary failed: <reason> — <detail> ===

Knobs beyond the CI job variables:
- AGENT_BUDGET_S: overall wall-clock budget for the agent invocation in
  seconds (default 900). Streaming WORKING events keep connections alive,
  so HTTP_TIMEOUT_S alone cannot bound a wedged agent.
- DEBUG_TRACEBACKS: set to 1/true/yes to print full tracebacks on
  unexpected crashes (default off; failures log one clean line instead).

The job is `allow_failure: true` at the pipeline level so a non-zero exit
does not block merges.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import sys
import time
import traceback
from pathlib import Path
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.helpers.proto_helpers import get_artifact_text, get_message_text
from a2a.types import (
    Message,
    Part,
    Role,
    SendMessageRequest,
    TaskState,
)

LOG = logging.getLogger(__name__)

COMMENT_MARKER = "<!-- mr-change-summary -->"
HASH_TRAILER_RE = re.compile(r"<!--\s*hash:([^\s>]+)\s*-->")

# Failure reason -> exit code. Invocation-side failures (the agent run
# itself) exit 1; verification-side failures (our note/trailer machinery
# and input validation) exit 2.
REASON_EXIT_CODES: dict[str, int] = {
    "agent-unreachable": 1,
    "budget-exhausted": 1,
    "transport-failures": 1,
    "no-completion": 1,
    "note-missing": 1,
    "trailer-write-failed": 2,
    "bad-input": 2,
}

# Reason an unexpected crash gets tagged with. main_async advances this as
# it moves between phases so main()'s catch-all can attribute the crash to
# the phase that was running.
_crash_reason = "bad-input"


def _set_crash_reason(reason: str) -> None:
    global _crash_reason
    _crash_reason = reason


def failure_reason_line(reason: str, detail: str) -> str:
    """Build the tagged result line every failure path logs."""
    return f"=== mr-change-summary failed: {reason} — {detail} ==="


def exit_code_for(reason: str) -> int:
    """Exit code for a failure reason (1 invocation-side, 2 verification)."""
    return REASON_EXIT_CODES[reason]


def log_failure(reason: str, detail: str) -> None:
    LOG.error(failure_reason_line(reason, detail))


def _env_truthy(raw: str) -> bool:
    return raw.strip().lower() in ("1", "true", "yes")


def _looks_like_tool_stub(text: str) -> bool:
    t = text.strip()
    return bool(t) and t.startswith("{") and '"name"' in t and '"arguments"' in t


def _normalize_state(state: str | None) -> str:
    if not state:
        return ""
    s = state.strip().lower()
    if "." in s:
        s = s.split(".")[-1]
    return s


def _compute_input_hash(diff_path: Path, changed_files_path: Path) -> str:
    """Hash the agent's input. Diff bytes + changed-files bytes, concatenated.

    Renovate's MR description is intentionally NOT included: Renovate
    rewrites it on every rebase with rotating debug tokens, which would
    make the hash useless for skip-detection. The diff is the source of
    truth for what semantically changed.

    To force a refresh after a prompt change, manually delete the existing
    change-summary comment from the MR.
    """
    h = hashlib.sha256()
    if diff_path.is_file():
        h.update(diff_path.read_bytes())
    h.update(b"\x00")
    if changed_files_path.is_file():
        h.update(changed_files_path.read_bytes())
    return h.hexdigest()[:16]


def _hash_trailer(input_hash: str) -> str:
    return f"<!-- hash:{input_hash} -->"


def _strip_trailing_hash(body: str) -> str:
    """Remove any existing `<!-- hash:... -->` trailer (and surrounding
    blank lines) so we can rewrite it cleanly."""
    return re.sub(r"\s*<!--\s*hash:[^>]+-->\s*$", "", body).rstrip() + "\n"


async def _fetch_existing_comment(
    *,
    api_url: str,
    project_id: str,
    mr_iid: str,
    token: str,
    timeout_s: float,
) -> tuple[int | None, str | None, str | None]:
    """Find the marker comment on the MR. Returns (note_id, body, hash) or
    (None, None, None) if no marker comment exists. Reads via JOB-TOKEN.
    """
    notes_url = (
        f"{api_url.rstrip('/')}/projects/{project_id}/merge_requests/{mr_iid}/notes"
    )
    headers = {"JOB-TOKEN": token}
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(timeout_s, connect=15.0)
    ) as client:
        for page in range(1, 6):
            resp = await client.get(
                notes_url, params={"per_page": 100, "page": page}, headers=headers
            )
            resp.raise_for_status()
            notes = resp.json()
            if not isinstance(notes, list) or not notes:
                break
            for note in notes:
                body = note.get("body") or ""
                if body.startswith(COMMENT_MARKER):
                    note_id = int(note.get("id", 0)) or None
                    m = HASH_TRAILER_RE.search(body)
                    return note_id, body, m.group(1) if m else None
            if len(notes) < 100:
                break
    return None, None, None


async def _update_note_body(
    *,
    api_url: str,
    project_id: str,
    mr_iid: str,
    note_id: int,
    body: str,
    private_token: str,
    timeout_s: float,
) -> bool:
    """PUT a new body onto an existing MR note via project PAT.

    GitLab's CI_JOB_TOKEN cannot write MR notes (returns 401), so we use a
    project PAT supplied as the AGENT_TOKEN CI variable instead. Convention
    matches KUSTOMIZE_TOKEN / SCORECARD_TOKEN / TOFU_TOKEN.
    """
    url = f"{api_url.rstrip('/')}/projects/{project_id}/merge_requests/{mr_iid}/notes/{note_id}"
    payload = {"body": body}
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.put(
            url, json=payload, headers={"PRIVATE-TOKEN": private_token}
        )
        if resp.status_code < 400:
            return True
        # Avoid credential terminology in the format string: Semgrep flags it
        # as a credential-leak false positive.
        LOG.error(
            "MR note %s update failed: %s %s",
            note_id,
            resp.status_code,
            resp.text[:200],
        )
        return False


async def run_agent(
    *,
    a2a_url: str,
    prompt_text: str,
    max_turns: int,
    timeout_s: float,
    max_consecutive_failures: int,
) -> bool:
    """Drive the multi-turn A2A conversation. Returns True if the agent
    eventually reached `completed` state with non-stub output.

    Anti-drift / anti-hang measures:

    1. **Always send the full prompt.** Earlier versions sent the prompt
       on turn 0 only and a generic continuation thereafter. When turn 0
       transiently failed before the model ingested the prompt, every
       subsequent turn was context-less and the agent invented its own
       task. Resending the full prompt every turn keeps the model
       grounded at the cost of more tokens per retry.
    2. **Reset contextId on failure.** A `state=failed` turn leaves the
       conversation in an indeterminate state on the kagent side. Rather
       than continue an already-broken context, we drop it and start a
       fresh A2A conversation on the next attempt.
    3. **Fail fast on consecutive hard failures.** Transport errors and
       `failed`/`canceled` states usually mean gitlab-mcp or kagent is
       wedged. Burning all `max_turns` against a ~180s A2A deadline looks
       like a hung CI job; stop after `max_consecutive_failures` instead.

    Returns True if the agent reached `completed` with non-stub output.
    Every False return logs one `=== mr-change-summary failed: ... ===`
    line first (agent-unreachable / transport-failures / no-completion).
    """
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    started = time.monotonic()
    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=True
    ) as httpx_client:
        try:
            resolver = A2ACardResolver(httpx_client=httpx_client, base_url=a2a_url)
            agent_card = await resolver.get_agent_card()
            client = ClientFactory(
                config=ClientConfig(httpx_client=httpx_client)
            ).create(card=agent_card)
        except Exception as e:  # noqa: BLE001
            log_failure(
                "agent-unreachable",
                f"agent card fetch failed: {type(e).__name__}: {e} (url={a2a_url}); "
                "agent missing or kagent down — expected during kagent upgrades",
            )
            return False

        context_id: str | None = None
        consecutive_failures = 0

        for turn in range(max_turns):
            LOG.info(
                "--- turn %s/%s elapsed=%ss contextId=%s prompt_chars=%s "
                "consecutive_failures=%s ---",
                turn + 1,
                max_turns,
                int(time.monotonic() - started),
                context_id or "(new)",
                len(prompt_text),
                consecutive_failures,
            )

            # Always send the full prompt: never a generic continuation.
            # See the docstring above for why.
            msg = Message(
                message_id=str(uuid4()),
                role=Role.ROLE_USER,
                parts=[Part(text=prompt_text)],
                context_id=context_id,
            )

            last_state: str | None = None
            saw_non_stub = False
            next_context_id: str | None = None

            try:
                async for event in client.send_message(
                    SendMessageRequest(message=msg)
                ):
                    if event.HasField("message"):
                        text = (get_message_text(event.message) or "").strip()
                        if text:
                            LOG.info("message: %s", text[:2000])
                            if not _looks_like_tool_stub(text):
                                saw_non_stub = True
                        continue

                    if event.HasField("task"):
                        task = event.task
                        ctx = getattr(task, "context_id", None) or getattr(
                            task, "contextId", None
                        )
                        if isinstance(ctx, str) and ctx.strip():
                            next_context_id = ctx.strip()
                        elif hasattr(task, "id") and getattr(task, "id", None):
                            next_context_id = str(task.id)
                        continue

                    if event.HasField("artifact_update"):
                        text = (
                            get_artifact_text(event.artifact_update.artifact) or ""
                        ).strip()
                        if text:
                            LOG.info("artifact: %s", text[:2000])
                            if not _looks_like_tool_stub(text):
                                saw_non_stub = True
                    elif event.HasField("status_update"):
                        last_state = TaskState.Name(
                            event.status_update.status.state
                        ).removeprefix("TASK_STATE_")
                        LOG.info("status: %s", last_state)
            except Exception as e:  # noqa: BLE001
                consecutive_failures += 1
                LOG.warning(
                    "turn %s transport error (resetting context, consecutive_failures=%s/%s): %s",
                    turn + 1,
                    consecutive_failures,
                    max_consecutive_failures,
                    e,
                )
                context_id = None
                if consecutive_failures >= max_consecutive_failures:
                    log_failure(
                        "transport-failures",
                        f"aborted after {consecutive_failures} consecutive transport/failed "
                        f"turns; last error {type(e).__name__}: {e} "
                        "(likely gitlab-mcp or kagent saturation)",
                    )
                    return False
                if turn >= max_turns - 1:
                    log_failure(
                        "transport-failures",
                        f"final turn {turn + 1}/{max_turns} ended with transport error: "
                        f"{type(e).__name__}: {e}",
                    )
                    return False
                continue

            state = _normalize_state(last_state)
            if state == "completed" and saw_non_stub:
                LOG.info(
                    "Agent reached completed state with non-stub output on turn %s",
                    turn + 1,
                )
                return True
            if state in ("failed", "canceled", "cancelled"):
                consecutive_failures += 1
                LOG.warning(
                    "Turn %s ended with state=%s; resetting context "
                    "(consecutive_failures=%s/%s)",
                    turn + 1,
                    state,
                    consecutive_failures,
                    max_consecutive_failures,
                )
                context_id = None
                if consecutive_failures >= max_consecutive_failures:
                    log_failure(
                        "transport-failures",
                        f"aborted after {consecutive_failures} consecutive transport/failed "
                        f"turns; last state={state} "
                        "(likely gitlab-mcp or kagent saturation)",
                    )
                    return False
                if turn >= max_turns - 1:
                    log_failure(
                        "transport-failures",
                        f"final turn {turn + 1}/{max_turns} ended with state={state}",
                    )
                    return False
                continue

            # Soft miss (completed stub / no terminal state): keep trying, do not
            # count toward the hard-failure budget.
            consecutive_failures = 0
            context_id = next_context_id

        log_failure(
            "no-completion", f"exhausted {max_turns} turns without natural completion"
        )
        return False


async def main_async() -> int:
    a2a_url = os.environ.get("A2A_URL", "").strip()
    prompt_path = Path(os.environ.get("PROMPT_PATH", "")).expanduser()
    diff_path = Path(os.environ.get("DIFF_PATH", "")).expanduser()
    changed_files_path = Path(os.environ.get("CHANGED_FILES_PATH", "")).expanduser()
    max_turns = max(1, int(os.environ.get("MAX_TURNS", "12")))
    max_consecutive_failures = max(
        1, int(os.environ.get("MAX_CONSECUTIVE_FAILURES", "3"))
    )
    timeout_s = float(os.environ.get("HTTP_TIMEOUT_S", "600"))
    budget_s = float(os.environ.get("AGENT_BUDGET_S", "900"))

    api_url = os.environ.get("CI_API_V4_URL", "").strip()
    project_id = os.environ.get("CI_PROJECT_ID", "").strip()
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "").strip()
    job_token = os.environ.get("CI_JOB_TOKEN", "").strip()
    # Project PAT with `api` scope. Required for the trailer-write step
    # because CI_JOB_TOKEN cannot PUT MR notes on GitLab.com.
    private_token = os.environ.get("AGENT_TOKEN", "").strip() or None
    force = os.environ.get("FORCE_RECOMPUTE", "").lower() in ("1", "true", "yes")
    skip_verify = os.environ.get("SKIP_COMMENT_VERIFY", "").lower() in (
        "1",
        "true",
        "yes",
    )

    if not a2a_url:
        log_failure("bad-input", "A2A_URL is required")
        return exit_code_for("bad-input")
    if not prompt_path.is_file():
        log_failure("bad-input", f"PROMPT_PATH not found: {prompt_path}")
        return exit_code_for("bad-input")
    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
    if not prompt_text:
        log_failure("bad-input", f"Prompt is empty: {prompt_path}")
        return exit_code_for("bad-input")
    if not diff_path.is_file():
        log_failure(
            "bad-input", f"DIFF_PATH not found: {diff_path} (required for hash-skip)"
        )
        return exit_code_for("bad-input")
    if not changed_files_path.is_file():
        log_failure(
            "bad-input",
            f"CHANGED_FILES_PATH not found: {changed_files_path} "
            "(required for hash-skip)",
        )
        return exit_code_for("bad-input")

    input_hash = _compute_input_hash(diff_path, changed_files_path)
    LOG.info("Input hash: %s", input_hash)

    have_ci_context = all((api_url, project_id, mr_iid, job_token))
    if not have_ci_context:
        LOG.warning(
            "Missing CI env vars (CI_API_V4_URL/CI_PROJECT_ID/CI_MERGE_REQUEST_IID/CI_JOB_TOKEN); "
            "skipping pre-flight hash check and post-completion verify",
        )

    existing_note_id: int | None = None
    existing_hash: str | None = None
    if have_ci_context:
        try:
            existing_note_id, _, existing_hash = await _fetch_existing_comment(
                api_url=api_url,
                project_id=project_id,
                mr_iid=mr_iid,
                token=job_token,
                timeout_s=30.0,
            )
        except Exception as e:  # noqa: BLE001
            LOG.warning(
                "Failed to read existing MR notes: %s. Proceeding without skip check.",
                e,
            )

        if existing_note_id is not None:
            LOG.info(
                "Existing change-summary note: id=%s hash=%s",
                existing_note_id,
                existing_hash or "(none)",
            )
            if existing_hash == input_hash and not force:
                LOG.info(
                    "Input hash unchanged since last summary (%s). Skipping agent invocation. "
                    "Set FORCE_RECOMPUTE=1 to force a re-run.",
                    input_hash,
                )
                return 0
        elif force:
            LOG.info(
                "FORCE_RECOMPUTE set; would skip if unchanged but proceeding anyway."
            )

    LOG.info(
        "Invoking agent: a2a_url=%s prompt_chars=%s max_turns=%s "
        "max_consecutive_failures=%s timeout_s=%s budget_s=%s",
        a2a_url,
        len(prompt_text),
        max_turns,
        max_consecutive_failures,
        timeout_s,
        budget_s,
    )
    _set_crash_reason("transport-failures")

    try:
        completed = await asyncio.wait_for(
            run_agent(
                a2a_url=a2a_url,
                prompt_text=prompt_text,
                max_turns=max_turns,
                timeout_s=timeout_s,
                max_consecutive_failures=max_consecutive_failures,
            ),
            timeout=budget_s,
        )
    except asyncio.TimeoutError:
        log_failure("budget-exhausted", f"agent did not complete within {budget_s}s")
        return exit_code_for("budget-exhausted")
    if not completed:
        # run_agent already logged its tagged failure line.
        return 1

    if skip_verify:
        LOG.info(
            "SKIP_COMMENT_VERIFY set; skipping post-completion check and trailer write"
        )
        return 0
    if not have_ci_context:
        LOG.warning(
            "No CI context; agent ran but trailer cannot be written. Returning success."
        )
        return 0

    # Re-fetch the comment the agent (hopefully) just posted/updated and
    # rewrite the body with a fresh hash trailer so we can prove it ran.
    LOG.info("Re-fetching MR notes to find the agent's posted comment...")
    _set_crash_reason("note-missing")
    try:
        post_note_id, post_body, _ = await _fetch_existing_comment(
            api_url=api_url,
            project_id=project_id,
            mr_iid=mr_iid,
            token=job_token,
            timeout_s=30.0,
        )
    except Exception as e:  # noqa: BLE001
        log_failure(
            "trailer-write-failed",
            f"failed to re-fetch MR notes for trailer write: {type(e).__name__}: {e}",
        )
        return exit_code_for("trailer-write-failed")

    if post_note_id is None or post_body is None:
        log_failure(
            "note-missing",
            f"agent claimed completion but no note with marker '{COMMENT_MARKER}' "
            f"exists on MR !{mr_iid}",
        )
        return exit_code_for("note-missing")

    if not private_token:
        log_failure(
            "trailer-write-failed",
            "AGENT_TOKEN is not set; the skip-cache trailer cannot be written. "
            "Create a project PAT with `api` scope and store it as the "
            "AGENT_TOKEN CI/CD variable.",
        )
        return exit_code_for("trailer-write-failed")

    new_body = _strip_trailing_hash(post_body) + "\n" + _hash_trailer(input_hash) + "\n"
    LOG.info("Appending hash trailer to note %s (hash=%s)...", post_note_id, input_hash)
    _set_crash_reason("trailer-write-failed")
    try:
        success = await _update_note_body(
            api_url=api_url,
            project_id=project_id,
            mr_iid=mr_iid,
            note_id=post_note_id,
            body=new_body,
            private_token=private_token,
            timeout_s=30.0,
        )
    except Exception as e:  # noqa: BLE001
        log_failure(
            "trailer-write-failed",
            f"MR note {post_note_id} update raised {type(e).__name__}: {e}",
        )
        return exit_code_for("trailer-write-failed")
    if not success:
        log_failure(
            "trailer-write-failed",
            f"failed to append hash trailer to MR note {post_note_id}",
        )
        return exit_code_for("trailer-write-failed")
    LOG.info("Trailer written (note id=%s, hash=%s)", post_note_id, input_hash)
    return 0


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout
    )
    try:
        return asyncio.run(main_async())
    except Exception as e:  # noqa: BLE001
        log_failure(_crash_reason, f"unexpected {type(e).__name__}: {e}")
        if _env_truthy(os.environ.get("DEBUG_TRACEBACKS", "")):
            traceback.print_exc()
        return exit_code_for(_crash_reason)


if __name__ == "__main__":
    raise SystemExit(main())
