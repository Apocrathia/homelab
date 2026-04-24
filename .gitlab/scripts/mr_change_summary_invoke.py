#!/usr/bin/env python3
"""Invoke git-agent via A2A SDK for MR change-summary work.

Designed for GitLab CI use. Reads a prompt from PROMPT_PATH, sends it to the
A2A endpoint at A2A_URL, and lets the agent take the conversation through
multiple turns until it has posted (or updated) an MR comment.

Mirrors the multi-turn loop from
flux/manifests/04-apps/artificial-intelligence/tasks/scheduled-agent-invoke/src/invoke.py
but trimmed for one-shot CI use:

- single prompt file, no continuation file (a generic continuation is sent on
  follow-up turns)
- no SSRF gate (target is a hardcoded in-cluster Service)
- after the agent claims completion, the script verifies that an MR note
  with the change-summary marker actually exists by calling the GitLab API
  with CI_JOB_TOKEN — agents are well known for declaring success without
  doing the work, so we re-check.

Exit codes:
- 0: agent reached `completed` state AND a marker comment is present on the MR
- 1: anything else (transport error, no completion, no comment found)

The job is `allow_failure: true` at the pipeline level so a 1 here does not
block merges.
"""

from __future__ import annotations

import asyncio
import logging
import os
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


async def _verify_marker_comment_exists(
    *,
    api_url: str,
    project_id: str,
    mr_iid: str,
    token: str,
    timeout_s: float,
) -> tuple[bool, int | None]:
    """Check that a note containing the marker exists on the MR.

    Returns (found, note_id). Uses CI_JOB_TOKEN via the JOB-TOKEN header,
    matching the convention from kustomize-diff / scorecard / tofu jobs.
    Pages through up to 5 pages of 100 notes each (500 notes max) — well
    above any realistic MR.
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
                    return True, int(note.get("id", 0)) or None
            if len(notes) < 100:
                break
    return False, None


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
    if not a2a_url:
        LOG.error("A2A_URL is required")
        return 1

    prompt_path = Path(os.environ.get("PROMPT_PATH", "")).expanduser()
    if not prompt_path.is_file():
        LOG.error("PROMPT_PATH not found: %s", prompt_path)
        return 1
    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
    if not prompt_text:
        LOG.error("Prompt is empty: %s", prompt_path)
        return 1

    max_turns = max(1, int(os.environ.get("MAX_TURNS", "12")))
    timeout_s = float(os.environ.get("HTTP_TIMEOUT_S", "600"))

    api_url = os.environ.get("CI_API_V4_URL", "").strip()
    project_id = os.environ.get("CI_PROJECT_ID", "").strip()
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "").strip()
    job_token = os.environ.get("CI_JOB_TOKEN", "").strip()
    skip_verify = os.environ.get("SKIP_COMMENT_VERIFY", "").lower() in ("1", "true", "yes")

    LOG.info(
        "Starting MR change-summary: a2a_url=%s prompt_chars=%s max_turns=%s timeout_s=%s",
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
        LOG.info("SKIP_COMMENT_VERIFY set; skipping post-completion check")
        return 0

    missing = [
        name
        for name, val in (
            ("CI_API_V4_URL", api_url),
            ("CI_PROJECT_ID", project_id),
            ("CI_MERGE_REQUEST_IID", mr_iid),
            ("CI_JOB_TOKEN", job_token),
        )
        if not val
    ]
    if missing:
        LOG.error(
            "Cannot verify comment: missing env var(s): %s. Set SKIP_COMMENT_VERIFY=1 to bypass for local runs.",
            ", ".join(missing),
        )
        return 1

    LOG.info("Verifying that a note with marker '%s' exists on MR !%s...", COMMENT_MARKER, mr_iid)
    try:
        found, note_id = await _verify_marker_comment_exists(
            api_url=api_url,
            project_id=project_id,
            mr_iid=mr_iid,
            token=job_token,
            timeout_s=30.0,
        )
    except Exception as e:  # noqa: BLE001
        LOG.exception("Comment verification failed with exception: %s", e)
        return 1

    if not found:
        LOG.error(
            "Agent claimed completion but no note with marker '%s' exists on MR !%s. "
            "Treating run as failed.",
            COMMENT_MARKER,
            mr_iid,
        )
        return 1

    LOG.info("Verified: marker comment present on MR !%s (note id=%s)", mr_iid, note_id or "?")
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)
    return asyncio.run(main_async())


if __name__ == "__main__":
    raise SystemExit(main())
