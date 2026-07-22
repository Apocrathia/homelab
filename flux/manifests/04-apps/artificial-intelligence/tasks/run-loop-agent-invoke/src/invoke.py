#!/usr/bin/env python3
"""Invoke kagent via A2A SDK with multi-turn session continuity."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.types import Message, Part, Role, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent, TextPart
from a2a.utils.artifact import get_artifact_text
from a2a.utils.message import get_message_text

LOG = logging.getLogger(__name__)

DEFAULT_PROMPT_PATH = "/scripts/prompt.md"
DEFAULT_CONTINUATION_PATH = "/scripts/continuation.md"
DEFAULT_MAX_TURNS = 10
DEFAULT_HTTP_TIMEOUT_S = 300.0


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stdout,
    )


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    return int(raw, 10)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _load_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    return raw.strip()


def looks_like_tool_stub_text(text: str) -> bool:
    t = text.strip()
    return bool(t) and t.startswith("{") and '"name"' in t and '"arguments"' in t


def _normalize_state(state: str | None) -> str:
    if not state:
        return ""
    s = state.strip().lower()
    if "." in s:
        s = s.split(".")[-1]
    return s


def _validate_url_for_ssrf(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        msg = f"unsupported URL scheme: {parsed.scheme!r}"
        raise ValueError(msg)
    host = (parsed.hostname or "").lower()
    if host in ("localhost", "127.0.0.1", "::1"):
        msg = "refusing localhost target from scheduled job"
        raise ValueError(msg)


async def run_multiturn(
    *,
    a2a_url: str,
    initial_text: str,
    continuation_text: str,
    max_turns: int,
    early_exit_on_natural_completion: bool,
    timeout_s: float,
) -> int:
    """Send up to max_turns SDK send_message calls with context continuity."""
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url=a2a_url)
        agent_card = await resolver.get_agent_card()
        client = ClientFactory(config=ClientConfig(httpx_client=httpx_client)).create(card=agent_card)

        context_id: str | None = None
        saw_retryable_failure = False
        for turn in range(max_turns):
            user_text = initial_text if turn == 0 else continuation_text
            LOG.info("--- turn %s/%s contextId=%s ---", turn + 1, max_turns, context_id or "(new)")

            msg = Message(
                message_id=str(uuid4()),
                role=Role.user,
                parts=[Part(root=TextPart(kind="text", text=user_text))],
                context_id=context_id,
            )

            last_state: str | None = None
            saw_non_stub_text = False
            saw_any_text = False
            next_context: str | None = None
            turn_transport_error = False

            try:
                async for event in client.send_message(msg):
                    if isinstance(event, Message):
                        text = (get_message_text(event) or "").strip()
                        if text:
                            LOG.info("message text: %s", text[:3000])
                            saw_any_text = True
                            if not looks_like_tool_stub_text(text):
                                saw_non_stub_text = True
                        continue

                    if not (isinstance(event, tuple) and len(event) >= 2):
                        continue

                    task, update = event[0], event[1]
                    if isinstance(task, Task):
                        task_context = getattr(task, "context_id", None) or getattr(task, "contextId", None)
                        if isinstance(task_context, str) and task_context.strip():
                            next_context = task_context.strip()
                        elif hasattr(task, "id") and getattr(task, "id", None):
                            next_context = str(task.id)

                    if isinstance(update, TaskArtifactUpdateEvent):
                        text = (get_artifact_text(update.artifact) or "").strip()
                        if text:
                            LOG.info("artifact text: %s", text[:3000])
                            saw_any_text = True
                            if not looks_like_tool_stub_text(text):
                                saw_non_stub_text = True
                    elif isinstance(update, TaskStatusUpdateEvent):
                        last_state = str(update.status.state)
                        LOG.info("task status: %s", last_state)
            except Exception as e:  # noqa: BLE001
                turn_transport_error = True
                saw_retryable_failure = True
                LOG.warning("turn %s transport/API error (retrying): %s", turn + 1, e)
                if turn >= max_turns - 1:
                    LOG.error("Final turn failed with transport/API error")
                    return 1
                continue

            if next_context:
                context_id = next_context

            if turn_transport_error:
                if turn >= max_turns - 1:
                    return 1
                continue

            state = _normalize_state(last_state)
            if state in ("failed", "canceled", "cancelled"):
                saw_retryable_failure = True
                LOG.warning("turn %s ended with state=%s (retrying)", turn + 1, state)
                if turn >= max_turns - 1:
                    LOG.error("Max turns reached with failed/canceled state")
                    return 1
                continue

            if early_exit_on_natural_completion and state == "completed":
                if saw_non_stub_text:
                    LOG.info("Early exit: completed with non-tool-stub text (turn %s)", turn + 1)
                    return 0
                if turn >= max_turns - 1:
                    if saw_any_text:
                        LOG.warning("Last turn still showed tool-stub-only text")
                    else:
                        LOG.warning("Last turn produced no text content")
                    return 0
                LOG.info("Completed but only tool-stub text observed; continuing")
                continue

            if turn >= max_turns - 1:
                return 1 if saw_retryable_failure else 0

    return 1 if saw_retryable_failure else 0


def main() -> int:
    _configure_logging()
    a2a_url = os.environ.get("A2A_URL", "").strip()
    if not a2a_url:
        LOG.error("A2A_URL is required")
        return 1

    allow_local = os.environ.get("ALLOW_LOCALHOST_A2A", "").lower() in ("1", "true", "yes")
    if not allow_local:
        try:
            _validate_url_for_ssrf(a2a_url)
        except ValueError as e:
            LOG.error("%s", e)
            return 1

    prompt_path = Path(os.environ.get("PROMPT_PATH", DEFAULT_PROMPT_PATH))
    continuation_path = Path(os.environ.get("CONTINUATION_PATH", DEFAULT_CONTINUATION_PATH))
    max_turns = max(1, _env_int("MAX_TURNS", DEFAULT_MAX_TURNS))
    early_exit = _env_bool("MULTITURN_EARLY_EXIT", True)
    timeout_s = float(os.environ.get("HTTP_TIMEOUT_S", str(DEFAULT_HTTP_TIMEOUT_S)))

    if not prompt_path.is_file():
        LOG.error("prompt file not found: %s", prompt_path)
        return 1
    initial_text = _load_text(prompt_path)
    if not initial_text:
        LOG.error("prompt file is empty: %s", prompt_path)
        return 1

    if continuation_path.is_file():
        continuation_text = _load_text(continuation_path)
    else:
        continuation_text = (
            "Continue the scheduled task in this session. Execute pending tools and "
            "complete any Discord steps from prior turns."
        )
    if not continuation_text:
        LOG.error("continuation text is empty: %s", continuation_path)
        return 1

    LOG.info(
        "Multi-turn: max_turns=%s early_exit=%s prompt_chars=%s continuation_chars=%s",
        max_turns,
        early_exit,
        len(initial_text),
        len(continuation_text),
    )

    return asyncio.run(
        run_multiturn(
            a2a_url=a2a_url,
            initial_text=initial_text,
            continuation_text=continuation_text,
            max_turns=max_turns,
            early_exit_on_natural_completion=early_exit,
            timeout_s=timeout_s,
        ),
    )


if __name__ == "__main__":
    raise SystemExit(main())
