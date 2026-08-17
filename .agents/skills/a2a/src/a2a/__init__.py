"""a2a — A2A client for LiteLLM-brokered homelab kagent agents.

Broker base URL + auth headers: ~/.prime/agent/mcp-secrets.json (`a2a` key),
overridable via MCP_SECRETS_FILE.

Usage:

    import a2a
    await a2a.agents()
    reply = await a2a.search_agent.send("find X")
    reply = await a2a.send("media-agent", "what's playing?")
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import httpx

__all__ = ["KNOWN_AGENTS", "A2aAgent", "A2aReply", "names", "agents", "get", "send", "a2a"]

_SECRETS_PATH = os.environ.get(
    "MCP_SECRETS_FILE", os.path.expanduser("~/.prime/agent/mcp-secrets.json")
)

KNOWN_AGENTS = [
    "git-agent",
    "home-agent",
    "homelab-agent",
    "infrastructure-agent",
    "knowledge-agent",
    "media-agent",
    "search-agent",
    "hermes-agent",
]


def _config() -> dict[str, Any]:
    try:
        with open(_SECRETS_PATH) as f:
            entry = (json.load(f) or {}).get("a2a") or {}
    except (OSError, ValueError):
        entry = {}
    base = str(entry.get("base_url") or "").rstrip("/")
    if not base:
        raise RuntimeError(
            "a2a broker not configured: add an 'a2a' entry (base_url, headers) "
            f"to {_SECRETS_PATH}"
        )
    headers = {str(k): str(v) for k, v in (entry.get("headers") or {}).items()}
    return {"base_url": base, "headers": headers}


@dataclass
class A2aReply:
    text: str
    task_id: str | None = None
    context_id: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return self.text


def _extract_reply(result: dict[str, Any]) -> A2aReply:
    parts_text: list[str] = []
    for artifact in result.get("artifacts") or []:
        for part in artifact.get("parts") or []:
            if part.get("kind") == "text" and part.get("text"):
                parts_text.append(part["text"])
    if not parts_text:
        for msg in reversed(result.get("history") or []):
            if msg.get("role") == "agent":
                for part in msg.get("parts") or []:
                    if part.get("kind") == "text" and part.get("text"):
                        parts_text.append(part["text"])
                if parts_text:
                    break
    return A2aReply(
        text="\n".join(parts_text),
        task_id=result.get("id") or result.get("taskId"),
        context_id=result.get("contextId"),
        raw=result,
    )


class A2aAgent:
    """One brokered agent behind the LiteLLM A2A gateway."""

    def __init__(self, name: str):
        self.name = name

    @property
    def _endpoint(self) -> str:
        return f"{_config()['base_url']}/a2a/{self.name}"

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        h = dict(_config()["headers"])
        h.update(extra or {})
        return h

    async def _rpc(self, method: str, params: dict[str, Any], timeout: float = 180.0) -> Any:
        req = {"jsonrpc": "2.0", "id": str(uuid.uuid4()), "method": method, "params": params}
        async with httpx.AsyncClient(timeout=timeout) as c:
            r = await c.post(
                self._endpoint,
                json=req,
                headers=self._headers({"Content-Type": "application/json"}),
            )
        if r.status_code >= 400:
            raise RuntimeError(f"{self.name}: HTTP {r.status_code}: {r.text[:300]}")
        data = r.json()
        if "error" in data:
            err = data["error"]
            raise RuntimeError(f"{self.name}: A2A error {err.get('code')}: {err.get('message')}")
        return data.get("result")

    def _message(self, text: str, context_id: str | None) -> dict[str, Any]:
        msg: dict[str, Any] = {
            "role": "user",
            "messageId": str(uuid.uuid4()),
            "parts": [{"kind": "text", "text": text}],
        }
        if context_id:
            msg["contextId"] = context_id
        return msg

    async def card(self) -> dict[str, Any]:
        cfg = _config()
        url = f"{cfg['base_url']}/a2a/{self.name}/.well-known/agent-card.json"
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url, headers=cfg["headers"])
        if r.status_code >= 400:
            raise RuntimeError(f"{self.name}: card HTTP {r.status_code}: {r.text[:200]}")
        return r.json()

    async def send(self, text: str, context_id: str | None = None, timeout: float = 180.0) -> A2aReply:
        result = await self._rpc("message/send", {"message": self._message(text, context_id)}, timeout)
        return _extract_reply(result or {})

    async def stream(
        self, text: str, context_id: str | None = None, timeout: float = 300.0
    ) -> AsyncIterator[dict[str, Any]]:
        req = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "message/stream",
            "params": {"message": self._message(text, context_id)},
        }
        cfg = _config()
        headers = dict(cfg["headers"])
        headers.update({"Content-Type": "application/json", "Accept": "text/event-stream"})
        async with httpx.AsyncClient(timeout=timeout) as c:
            async with c.stream("POST", self._endpoint, json=req, headers=headers) as r:
                if r.status_code >= 400:
                    body = (await r.aread()).decode(errors="replace")
                    raise RuntimeError(f"{self.name}: HTTP {r.status_code}: {body[:300]}")
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        event = json.loads(line[6:])
                    except ValueError:
                        continue
                    if "error" in event:
                        err = event["error"]
                        raise RuntimeError(
                            f"{self.name}: A2A error {err.get('code')}: {err.get('message')}"
                        )
                    if "result" in event:
                        yield event["result"]

    async def task(self, task_id: str) -> dict[str, Any]:
        return await self._rpc("tasks/get", {"id": task_id})

    async def cancel(self, task_id: str) -> dict[str, Any]:
        return await self._rpc("tasks/cancel", {"id": task_id})


_cache: dict[str, A2aAgent] = {}


def names() -> list[str]:
    return list(KNOWN_AGENTS)


def get(name: str) -> A2aAgent:
    key = name.replace("_", "-")
    if key not in _cache:
        _cache[key] = A2aAgent(key)
    return _cache[key]


async def agents() -> list[dict[str, Any]]:
    cfg = _config()
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{cfg['base_url']}/v1/agents", headers=cfg["headers"])
    if r.status_code >= 400:
        raise RuntimeError(f"agents: HTTP {r.status_code}: {r.text[:200]}")
    return r.json()


async def send(name: str, text: str, context_id: str | None = None, timeout: float = 180.0) -> A2aReply:
    return await get(name).send(text, context_id=context_id, timeout=timeout)


async def card(name: str) -> dict[str, Any]:
    return await get(name).card()


_RESERVED = {"run", "__wrapped__", "__call__"}


def __getattr__(name: str):
    if name.startswith("_") or name in _RESERVED:
        raise AttributeError(name)
    key = name.replace("_", "-")
    if key in KNOWN_AGENTS:
        return get(key)
    raise AttributeError(f"no known agent '{name}'. Roster: {', '.join(KNOWN_AGENTS)}")
