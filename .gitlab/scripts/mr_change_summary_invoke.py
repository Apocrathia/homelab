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
- exit 0 if the agent reaches a `completed` state with non-tool-stub output,
  otherwise exit 1 so CI can flag it (job is allow_failure: true at the
  pipeline level so this won't block merges).
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


async def run(*, a2a_url: str, prompt_text: str, max_turns: int, timeout_s: float) -> int:
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
                    return 1
                continue

            state = _normalize_state(last_state)
            if state == "completed" and saw_non_stub:
                LOG.info("Agent completed with non-stub output on turn %s", turn + 1)
                return 0
            if state in ("failed", "canceled", "cancelled"):
                LOG.warning("Turn %s ended with state=%s", turn + 1, state)
                if turn >= max_turns - 1:
                    return 1
                continue

        LOG.warning("Exhausted %s turns without natural completion", max_turns)
        return 1


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)

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

    LOG.info(
        "Starting MR change-summary: a2a_url=%s prompt_chars=%s max_turns=%s timeout_s=%s",
        a2a_url,
        len(prompt_text),
        max_turns,
        timeout_s,
    )

    return asyncio.run(
        run(
            a2a_url=a2a_url,
            prompt_text=prompt_text,
            max_turns=max_turns,
            timeout_s=timeout_s,
        ),
    )


if __name__ == "__main__":
    raise SystemExit(main())
