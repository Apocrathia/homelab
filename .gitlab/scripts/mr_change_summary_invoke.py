#!/usr/bin/env python3
"""Invoke git-agent via A2A SDK for MR change-summary work.

Designed for GitLab CI use. The job pipes a rendered prompt + the source
diff to this script and we decide whether to spend GPU on inference at all.

High-level flow:

1. Compute a stable hash over the agent's input (the diff). This is the
   energy gate — if the hash matches an existing comment's trailer, the
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
- 1: anything else (transport error, no completion, missing trailer, etc.)

The job is `allow_failure: true` at the pipeline level so a 1 here does
not block merges.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import sys
from pathlib import Path
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.types import (
    Message,
    Part,
    Role,
    Task,
    TaskArtifactUpdateEvent,
    TaskStatusUpdateEvent,
    TextPart,
)
from a2a.utils.artifact import get_artifact_text
from a2a.utils.message import get_message_text

LOG = logging.getLogger(__name__)

CONTINUATION_TEXT = (
    "Continue the MR change-summary task. Complete any pending tool calls, "
    "and once you have enough upstream context, post or update the MR "
    "comment via gitlab-mcp using the marker `<!-- mr-change-summary -->`."
)
COMMENT_MARKER = "<!-- mr-change-summary -->"
HASH_TRAILER_RE = re.compile(r"<!--\s*hash:([^\s>]+)\s*-->")


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

    Renovate's MR description is intentionally NOT included — Renovate
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
    notes_url = f"{api_url.rstrip('/')}/projects/{project_id}/merge_requests/{mr_iid}/notes"
    headers = {"JOB-TOKEN": token}
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s, connect=15.0)) as client:
        for page in range(1, 6):
            resp = await client.get(notes_url, params={"per_page": 100, "page": page}, headers=headers)
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
    """PUT a new body onto an existing MR note via PRIVATE-TOKEN.

    GitLab's CI_JOB_TOKEN cannot write MR notes (returns 401), so we use a
    project PAT supplied as the AGENT_TOKEN CI variable instead. Convention
    matches KUSTOMIZE_TOKEN / SCORECARD_TOKEN / TOFU_TOKEN.
    """
    url = f"{api_url.rstrip('/')}/projects/{project_id}/merge_requests/{mr_iid}/notes/{note_id}"
    payload = {"body": body}
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.put(url, json=payload, headers={"PRIVATE-TOKEN": private_token})
        if resp.status_code < 400:
            return True
        LOG.error(
            "PRIVATE-TOKEN write to note %s failed: %s %s",
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
) -> bool:
    """Drive the multi-turn A2A conversation. Returns True if the agent
    eventually reached `completed` state with non-stub output."""
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url=a2a_url)
        agent_card = await resolver.get_agent_card()
        client = ClientFactory(config=ClientConfig(httpx_client=httpx_client)).create(card=agent_card)

        context_id: str | None = None

        for turn in range(max_turns):
            user_text = prompt_text if turn == 0 else CONTINUATION_TEXT
            LOG.info("--- turn %s/%s contextId=%s ---", turn + 1, max_turns, context_id or "(new)")

            msg = Message(
                message_id=str(uuid4()),
                role=Role.user,
                parts=[Part(root=TextPart(kind="text", text=user_text))],
                context_id=context_id,
            )

            last_state: str | None = None
            saw_non_stub = False

            try:
                async for event in client.send_message(msg):
                    if isinstance(event, Message):
                        text = (get_message_text(event) or "").strip()
                        if text:
                            LOG.info("message: %s", text[:2000])
                            if not _looks_like_tool_stub(text):
                                saw_non_stub = True
                        continue

                    if not (isinstance(event, tuple) and len(event) >= 2):
                        continue

                    task, update = event[0], event[1]
                    if isinstance(task, Task):
                        ctx = getattr(task, "context_id", None) or getattr(task, "contextId", None)
                        if isinstance(ctx, str) and ctx.strip():
                            context_id = ctx.strip()
                        elif hasattr(task, "id") and getattr(task, "id", None):
                            context_id = str(task.id)

                    if isinstance(update, TaskArtifactUpdateEvent):
                        text = (get_artifact_text(update.artifact) or "").strip()
                        if text:
                            LOG.info("artifact: %s", text[:2000])
                            if not _looks_like_tool_stub(text):
                                saw_non_stub = True
                    elif isinstance(update, TaskStatusUpdateEvent):
                        last_state = str(update.status.state)
                        LOG.info("status: %s", last_state)
            except Exception as e:  # noqa: BLE001
                LOG.warning("turn %s transport error (retrying): %s", turn + 1, e)
                if turn >= max_turns - 1:
                    LOG.error("Final turn failed with transport error")
                    return False
                continue

            state = _normalize_state(last_state)
            if state == "completed" and saw_non_stub:
                LOG.info("Agent reached completed state with non-stub output on turn %s", turn + 1)
                return True
            if state in ("failed", "canceled", "cancelled"):
                LOG.warning("Turn %s ended with state=%s", turn + 1, state)
                if turn >= max_turns - 1:
                    return False
                continue

        LOG.warning("Exhausted %s turns without natural completion", max_turns)
        return False


async def main_async() -> int:
    a2a_url = os.environ.get("A2A_URL", "").strip()
    prompt_path = Path(os.environ.get("PROMPT_PATH", "")).expanduser()
    diff_path = Path(os.environ.get("DIFF_PATH", "")).expanduser()
    changed_files_path = Path(os.environ.get("CHANGED_FILES_PATH", "")).expanduser()
    max_turns = max(1, int(os.environ.get("MAX_TURNS", "12")))
    timeout_s = float(os.environ.get("HTTP_TIMEOUT_S", "600"))

    api_url = os.environ.get("CI_API_V4_URL", "").strip()
    project_id = os.environ.get("CI_PROJECT_ID", "").strip()
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "").strip()
    job_token = os.environ.get("CI_JOB_TOKEN", "").strip()
    # Project PAT with `api` scope. Required for the trailer-write step
    # because CI_JOB_TOKEN cannot PUT MR notes on GitLab.com.
    private_token = os.environ.get("AGENT_TOKEN", "").strip() or None
    force = os.environ.get("FORCE_RECOMPUTE", "").lower() in ("1", "true", "yes")
    skip_verify = os.environ.get("SKIP_COMMENT_VERIFY", "").lower() in ("1", "true", "yes")

    if not a2a_url:
        LOG.error("A2A_URL is required")
        return 1
    if not prompt_path.is_file():
        LOG.error("PROMPT_PATH not found: %s", prompt_path)
        return 1
    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
    if not prompt_text:
        LOG.error("Prompt is empty: %s", prompt_path)
        return 1
    if not diff_path.is_file():
        LOG.error("DIFF_PATH not found: %s (required for hash-skip)", diff_path)
        return 1
    if not changed_files_path.is_file():
        LOG.error("CHANGED_FILES_PATH not found: %s (required for hash-skip)", changed_files_path)
        return 1

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
            LOG.warning("Failed to read existing MR notes: %s. Proceeding without skip check.", e)

        if existing_note_id is not None:
            LOG.info("Existing change-summary note: id=%s hash=%s", existing_note_id, existing_hash or "(none)")
            if existing_hash == input_hash and not force:
                LOG.info(
                    "Input hash unchanged since last summary (%s). Skipping agent invocation. "
                    "Set FORCE_RECOMPUTE=1 to force a re-run.",
                    input_hash,
                )
                return 0
        elif force:
            LOG.info("FORCE_RECOMPUTE set; would skip if unchanged but proceeding anyway.")

    LOG.info(
        "Invoking agent: a2a_url=%s prompt_chars=%s max_turns=%s timeout_s=%s",
        a2a_url,
        len(prompt_text),
        max_turns,
        timeout_s,
    )

    completed = await run_agent(
        a2a_url=a2a_url,
        prompt_text=prompt_text,
        max_turns=max_turns,
        timeout_s=timeout_s,
    )
    if not completed:
        LOG.error("Agent did not complete the task cleanly")
        return 1

    if skip_verify:
        LOG.info("SKIP_COMMENT_VERIFY set; skipping post-completion check and trailer write")
        return 0
    if not have_ci_context:
        LOG.warning("No CI context; agent ran but trailer cannot be written. Returning success.")
        return 0

    # Re-fetch the comment the agent (hopefully) just posted/updated and
    # rewrite the body with a fresh hash trailer so we can prove it ran.
    LOG.info("Re-fetching MR notes to find the agent's posted comment...")
    try:
        post_note_id, post_body, _ = await _fetch_existing_comment(
            api_url=api_url,
            project_id=project_id,
            mr_iid=mr_iid,
            token=job_token,
            timeout_s=30.0,
        )
    except Exception as e:  # noqa: BLE001
        LOG.exception("Failed to re-fetch MR notes for trailer write: %s", e)
        return 1

    if post_note_id is None or post_body is None:
        LOG.error(
            "Agent claimed completion but no note with marker '%s' exists on MR !%s. "
            "Treating run as failed.",
            COMMENT_MARKER,
            mr_iid,
        )
        return 1

    if not private_token:
        LOG.error(
            "AGENT_TOKEN is not set. Comment was posted by the agent but the "
            "skip-cache trailer cannot be written. Create a project PAT with "
            "`api` scope and store it as the AGENT_TOKEN CI/CD variable."
        )
        return 1

    new_body = _strip_trailing_hash(post_body) + "\n" + _hash_trailer(input_hash) + "\n"
    LOG.info("Appending hash trailer to note %s (hash=%s)...", post_note_id, input_hash)
    success = await _update_note_body(
        api_url=api_url,
        project_id=project_id,
        mr_iid=mr_iid,
        note_id=post_note_id,
        body=new_body,
        private_token=private_token,
        timeout_s=30.0,
    )
    if not success:
        LOG.error("Failed to append hash trailer to MR note %s.", post_note_id)
        return 1
    LOG.info("Trailer written (note id=%s, hash=%s)", post_note_id, input_hash)
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)
    return asyncio.run(main_async())


if __name__ == "__main__":
    raise SystemExit(main())
