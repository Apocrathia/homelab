#!/usr/bin/env python3
"""One-shot A2A invoke into the deployed prime-agent (harness groomer).

prime-agent's inbound A2A webhook (a2a/server.mjs) answers every
message/send with a fresh one-shot `prime-agent -p` run: contextId resumes
nothing, so multi-turn re-sends would just launch duplicate sessions. The
server caps each send's wait at 120s and then returns the `working`
snapshot, so this runner sends exactly once and polls tasks/get until the
task reaches a terminal state or the poll deadline passes.

Bearer auth is fail-closed server-side; A2A_BEARER_TOKEN rides every
request (card resolve, message/send, tasks/get) as the Authorization
header.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.helpers.proto_helpers import get_artifact_text, get_message_text
from a2a.types import GetTaskRequest, Message, Part, Role, SendMessageRequest, TaskState

LOG = logging.getLogger("harness-groomer")

DEFAULT_PROMPT_PATH = "/scripts/task.md"
DEFAULT_HTTP_TIMEOUT_S = 300.0
DEFAULT_POLL_INTERVAL_S = 30.0
# server.mjs has no tasks/cancel; past the deadline the run keeps going
# detached server-side (harmless — the next groom is a fresh pass), but the
# job must still fail so successfulJobsHistoryLimit shows the miss.
DEFAULT_POLL_DEADLINE_S = 2100.0  # 35 min, under the job's 3600s cap
ARTIFACT_LOG_CHARS = 3000


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stdout,
    )


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    return float(raw) if raw else default


def _load_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    return raw.strip()


def _task_state(task) -> str:
    return TaskState.Name(task.status.state).removeprefix("TASK_STATE_").lower()


def _validate_url_for_ssrf(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        msg = f"unsupported URL scheme: {parsed.scheme!r}"
        raise ValueError(msg)
    host = (parsed.hostname or "").lower()
    if host in ("localhost", "127.0.0.1", "::1"):
        msg = "refusing localhost target from scheduled job"
        raise ValueError(msg)


async def _send_once(client, prompt_text: str):
    """Send the one-shot prompt; return the task snapshot (or None)."""
    msg = Message(
        message_id=str(uuid4()),
        role=Role.ROLE_USER,
        parts=[Part(text=prompt_text)],
    )
    task = None
    async for event in client.send_message(SendMessageRequest(message=msg)):
        if event.HasField("task"):
            task = event.task
            break
    return task


async def run_oneshot(
    *,
    a2a_url: str,
    prompt_text: str,
    bearer_token: str,
    timeout_s: float,
    poll_interval_s: float,
    poll_deadline_s: float,
) -> int:
    """Send one message, then poll tasks/get to a terminal state."""
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    headers = {"Authorization": f"Bearer {bearer_token}"} if bearer_token else {}
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers) as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url=a2a_url)
        agent_card = await resolver.get_agent_card()
        client = ClientFactory(config=ClientConfig(httpx_client=httpx_client)).create(card=agent_card)

        try:
            task = await _send_once(client, prompt_text)
        except Exception as e:  # noqa: BLE001
            LOG.error("message/send failed (transport/API error): %s", e)
            return 1
        if task is None:
            LOG.error("message/send returned no task payload")
            return 1

        task_id = str(task.id)
        state = _task_state(task)
        LOG.info("task %s contextId=%s state=%s", task_id, str(task.context_id), state)

        deadline = time.monotonic() + poll_deadline_s
        while state == "working":
            if time.monotonic() >= deadline:
                LOG.error(
                    "poll deadline (%ss) exceeded; task %s still working — the run "
                    "continues detached on prime-agent, but this job reports failure",
                    poll_deadline_s,
                    task_id,
                )
                return 1
            await asyncio.sleep(poll_interval_s)
            try:
                task = await client.get_task(GetTaskRequest(id=task_id))
            except Exception as e:  # noqa: BLE001
                LOG.error("tasks/get failed for %s: %s", task_id, e)
                return 1
            state = _task_state(task)
            LOG.info("poll: state=%s", state)

        if state == "completed":
            for i, artifact in enumerate(task.artifacts):
                text = (get_artifact_text(artifact) or "").strip()
                if text:
                    LOG.info("artifact %s text: %s", i, text[:ARTIFACT_LOG_CHARS])
            LOG.info("final state: completed")
            return 0

        LOG.error("final state: %s", state)
        message = getattr(task.status, "message", None)
        if message is not None:
            tail = (get_message_text(message) or "").strip()
            if tail:
                LOG.error("status message: %s", tail[:ARTIFACT_LOG_CHARS])
        return 1


def main() -> int:
    _configure_logging()
    a2a_url = os.environ.get("A2A_URL", "").strip()
    if not a2a_url:
        LOG.error("A2A_URL is required")
        return 1

    bearer_token = os.environ.get("A2A_BEARER_TOKEN", "").strip()
    if not bearer_token:
        LOG.error("A2A_BEARER_TOKEN is required (the prime-agent webhook is fail-closed)")
        return 1

    allow_local = os.environ.get("ALLOW_LOCALHOST_A2A", "").lower() in ("1", "true", "yes")
    if not allow_local:
        try:
            _validate_url_for_ssrf(a2a_url)
        except ValueError as e:
            LOG.error("%s", e)
            return 1

    prompt_path = Path(os.environ.get("PROMPT_PATH", DEFAULT_PROMPT_PATH))
    if not prompt_path.is_file():
        LOG.error("prompt file not found: %s", prompt_path)
        return 1
    prompt_text = _load_text(prompt_path)
    if not prompt_text:
        LOG.error("prompt file is empty: %s", prompt_path)
        return 1

    timeout_s = _env_float("HTTP_TIMEOUT_S", DEFAULT_HTTP_TIMEOUT_S)
    poll_interval_s = _env_float("POLL_INTERVAL_S", DEFAULT_POLL_INTERVAL_S)
    poll_deadline_s = _env_float("POLL_DEADLINE_S", DEFAULT_POLL_DEADLINE_S)

    LOG.info(
        "one-shot groomer: url=%s prompt_chars=%s poll_interval=%ss poll_deadline=%ss",
        a2a_url,
        len(prompt_text),
        poll_interval_s,
        poll_deadline_s,
    )

    return asyncio.run(
        run_oneshot(
            a2a_url=a2a_url,
            prompt_text=prompt_text,
            bearer_token=bearer_token,
            timeout_s=timeout_s,
            poll_interval_s=poll_interval_s,
            poll_deadline_s=poll_deadline_s,
        ),
    )


if __name__ == "__main__":
    raise SystemExit(main())
