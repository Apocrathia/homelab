#!/usr/bin/env python3
"""
Home Assistant -> kagent webhook bridge.

A thin HTTP server that accepts POST / with a freeform JSON prompt from
Home Assistant's rest_command integration and forwards it to the home-agent
via the kagent A2A endpoint. Fire-and-forget: returns 202 immediately and
runs the agent in the background.

All intelligence lives in kagent. This is just event plumbing.
"""

import asyncio
import json
import logging
import os
import sys
from http import HTTPStatus
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.types import Message, Part, Role, TextPart
from aiohttp import web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("home-agent-bridge")

KAGENT_URL = os.environ.get(
    "KAGENT_URL",
    "http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-home/home-agent/",
)
LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "8080"))
A2A_TIMEOUT_SECONDS = float(os.environ.get("A2A_TIMEOUT_SECONDS", "300"))


def ensure_trailing_slash(url: str) -> str:
    return url if url.endswith("/") else url + "/"


async def call_agent(
    httpx_client: httpx.AsyncClient,
    prompt: str,
    request_id: str,
) -> None:
    """Send a prompt to the home-agent via A2A and log the result.

    Fire-and-forget. The HTTP response body is never returned to HA.
    """
    base_url = ensure_trailing_slash(KAGENT_URL)
    resolver = A2ACardResolver(httpx_client=httpx_client, base_url=base_url)

    try:
        agent_card = await resolver.get_agent_card()
        logger.debug(f"[{request_id}] resolved agent card: {agent_card.name}")

        config = ClientConfig(httpx_client=httpx_client)
        client = ClientFactory(config=config).create(card=agent_card)

        a2a_message = Message(
            message_id=str(uuid4()),
            role=Role.user,
            parts=[Part(root=TextPart(kind="text", text=prompt))],
        )

        logger.info(f"[{request_id}] sending to home-agent: {prompt[:80]}")

        async for event in client.send_message(a2a_message):
            logger.debug(f"[{request_id}] a2a event: {type(event).__name__}")

        logger.info(f"[{request_id}] home-agent run complete")

    except Exception as e:
        logger.error(f"[{request_id}] error calling home-agent: {e}", exc_info=True)


async def handle_webhook(request: web.Request) -> web.Response:
    """POST / — accept a JSON body with a `prompt` field, dispatch to the agent."""
    request_id = str(uuid4())[:8]

    try:
        payload = await request.json()
    except json.JSONDecodeError:
        logger.warning(f"[{request_id}] invalid JSON body")
        return web.Response(status=HTTPStatus.BAD_REQUEST, text="invalid JSON body\n")

    prompt = payload.get("prompt") if isinstance(payload, dict) else None
    if not isinstance(prompt, str) or not prompt.strip():
        logger.warning(f"[{request_id}] missing or empty 'prompt' field")
        return web.Response(
            status=HTTPStatus.BAD_REQUEST,
            text='missing or empty "prompt" field\n',
        )

    httpx_client: httpx.AsyncClient = request.app["httpx_client"]

    asyncio.create_task(call_agent(httpx_client, prompt, request_id))

    logger.info(f"[{request_id}] accepted prompt ({len(prompt)} chars), dispatched")
    return web.Response(
        status=HTTPStatus.ACCEPTED,
        text=f"accepted {request_id}\n",
    )


async def handle_healthz(_request: web.Request) -> web.Response:
    return web.Response(status=HTTPStatus.OK, text="ok\n")


async def init_app() -> web.Application:
    app = web.Application()
    app["httpx_client"] = httpx.AsyncClient(timeout=A2A_TIMEOUT_SECONDS)

    app.router.add_post("/", handle_webhook)
    app.router.add_get("/healthz", handle_healthz)

    async def _close_httpx(_app: web.Application) -> None:
        await _app["httpx_client"].aclose()

    app.on_cleanup.append(_close_httpx)
    return app


def main() -> None:
    logger.info(f"home-agent-bridge starting, kagent at {KAGENT_URL}")
    logger.info(f"listening on 0.0.0.0:{LISTEN_PORT}")

    try:
        web.run_app(init_app(), host="0.0.0.0", port=LISTEN_PORT, print=None)
    except KeyboardInterrupt:
        logger.info("shutting down")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"bridge crashed: {e}", exc_info=True)
        sys.exit(1)
