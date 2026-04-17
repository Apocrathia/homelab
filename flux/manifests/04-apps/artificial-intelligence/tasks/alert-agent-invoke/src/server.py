#!/usr/bin/env python3
"""Grafana alert webhook to kagent A2A bridge.

Receives Grafana webhook POSTs, extracts alert context, builds a prompt,
and invokes kagent via A2A SDK as a fire-and-forget background task.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from uuid import uuid4

import httpx
import uvicorn
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
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

LOG = logging.getLogger(__name__)

A2A_URL = os.environ.get("A2A_URL", "").strip()
PROMPT_TEMPLATE_PATH = Path(os.environ.get("PROMPT_TEMPLATE_PATH", "/scripts/alert-template.md"))
CONTINUATION_TEXT = "Continue investigating this alert. Complete any pending tool calls and finish the investigation."
MAX_TURNS = int(os.environ.get("MAX_TURNS", "4"))
HTTP_TIMEOUT_S = float(os.environ.get("HTTP_TIMEOUT_S", "300"))
PORT = int(os.environ.get("PORT", "8080"))

_active_invocations: set[asyncio.Task[None]] = set()


def _load_template() -> str:
    if not PROMPT_TEMPLATE_PATH.is_file():
        LOG.warning("Template not found at %s, using fallback", PROMPT_TEMPLATE_PATH)
        return "# Grafana Alert\n\n```json\n{alert_json}\n```\n\nInvestigate this alert and report findings."
    return PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8").strip()


def _format_labels(labels: dict[str, str]) -> str:
    if not labels:
        return "_none_"
    return "\n".join(f"- `{k}`: `{v}`" for k, v in sorted(labels.items()))


def _format_values(values: dict[str, str]) -> str:
    if not values:
        return "_none_"
    return "\n".join(f"- `{k}`: `{v}`" for k, v in sorted(values.items()))


def _build_prompt(template: str, alert: dict) -> str:
    annotations = alert.get("annotations", {})
    labels = alert.get("labels", {})
    values = alert.get("values", {})

    replacements = {
        "alert_name": labels.get("alertname", "Unknown"),
        "status": alert.get("status", "unknown"),
        "severity": labels.get("severity", "unknown"),
        "starts_at": alert.get("startsAt", "unknown"),
        "summary": annotations.get("summary", "No summary provided"),
        "description": annotations.get("description", "No description provided"),
        "labels": _format_labels(labels),
        "values": _format_values(values),
        "alert_json": json.dumps(alert, indent=2, default=str),
    }

    try:
        return template.format_map(replacements)
    except KeyError as e:
        LOG.warning("Template key missing: %s, falling back to raw JSON", e)
        return f"# Grafana Alert\n\n```json\n{replacements['alert_json']}\n```"


def _normalize_state(state: str | None) -> str:
    if not state:
        return ""
    s = state.strip().lower()
    if "." in s:
        s = s.split(".")[-1]
    return s


def _looks_like_tool_stub(text: str) -> bool:
    t = text.strip()
    return bool(t) and t.startswith("{") and '"name"' in t and '"arguments"' in t


async def _invoke_agent(prompt: str, alert_name: str) -> None:
    """Multi-turn A2A invocation for a single alert batch."""
    try:
        timeout = httpx.Timeout(HTTP_TIMEOUT_S, connect=15.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as httpx_client:
            resolver = A2ACardResolver(httpx_client=httpx_client, base_url=A2A_URL)
            agent_card = await resolver.get_agent_card()
            client = ClientFactory(
                config=ClientConfig(httpx_client=httpx_client),
            ).create(card=agent_card)

            context_id: str | None = None

            for turn in range(MAX_TURNS):
                user_text = prompt if turn == 0 else CONTINUATION_TEXT
                LOG.info("[%s] turn %s/%s contextId=%s", alert_name, turn + 1, MAX_TURNS, context_id or "(new)")

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

                        if isinstance(update, TaskStatusUpdateEvent):
                            last_state = str(update.status.state)
                        elif isinstance(update, TaskArtifactUpdateEvent):
                            text = (get_artifact_text(update.artifact) or "").strip()
                            if text and not _looks_like_tool_stub(text):
                                saw_non_stub = True
                except Exception:  # noqa: BLE001
                    LOG.exception("[%s] transport error on turn %s", alert_name, turn + 1)
                    if turn >= MAX_TURNS - 1:
                        return
                    continue

                state = _normalize_state(last_state)
                if state == "completed" and saw_non_stub:
                    LOG.info("[%s] completed with content on turn %s", alert_name, turn + 1)
                    return
                if state in ("failed", "canceled", "cancelled"):
                    LOG.warning("[%s] agent %s on turn %s", alert_name, state, turn + 1)
                    if turn >= MAX_TURNS - 1:
                        return
                    continue

        LOG.info("[%s] finished after %s turns", alert_name, MAX_TURNS)
    except Exception:  # noqa: BLE001
        LOG.exception("[%s] agent invocation failed", alert_name)


async def webhook(request: Request) -> Response:
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        LOG.exception("Failed to parse webhook payload")
        return JSONResponse({"error": "invalid JSON"}, status_code=400)

    if not A2A_URL:
        LOG.error("A2A_URL not configured")
        return JSONResponse({"error": "A2A_URL not configured"}, status_code=503)

    alerts = payload.get("alerts", [])
    firing = [a for a in alerts if a.get("status") == "firing"]
    if not firing:
        LOG.info("No firing alerts, skipping")
        return JSONResponse({"status": "ok", "message": "no firing alerts"})

    template = _load_template()
    prompts = [_build_prompt(template, alert) for alert in firing]
    combined = "\n\n---\n\n".join(prompts)
    alert_name = payload.get("commonLabels", {}).get("alertname", "unknown")

    LOG.info("Received %s firing alert(s) for %s, invoking agent", len(firing), alert_name)

    task = asyncio.create_task(_invoke_agent(combined, alert_name))
    _active_invocations.add(task)
    task.add_done_callback(_active_invocations.discard)

    return JSONResponse({"status": "accepted", "alerts_queued": len(firing)})


async def health(request: Request) -> Response:
    return JSONResponse({"status": "ok", "active_invocations": len(_active_invocations)})


app = Starlette(
    routes=[
        Route("/webhook", webhook, methods=["POST"]),
        Route("/healthz", health),
        Route("/readyz", health),
    ],
)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)
    if not A2A_URL:
        LOG.error("A2A_URL is required")
        sys.exit(1)
    LOG.info("Starting alert-agent-invoke on :%s → %s", PORT, A2A_URL)
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")  # noqa: S104


if __name__ == "__main__":
    main()
