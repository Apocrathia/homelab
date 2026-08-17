#!/usr/bin/env python3
"""A2A auth-forwarding proxy: kagent BYO front for the Hermes Agent app.

kagent BYO agents must serve the A2A protocol on port 8080. kagent agent
runtimes resolve this agent's card from that URL, then send JSONRPC to it.
This shim serves the card (Hermes' card with the URLs rewritten to this
proxy) and forwards JSONRPC requests to Hermes' own A2A endpoint, attaching
the bearer token. No pip dependencies; stdlib only.

Env:
  HERMES_A2A_URL          upstream A2A endpoint
                          (default http://hermes-agent.hermes-agent.svc.cluster.local:9900)
  HERMES_A2A_BEARER_TOKEN required; raw token, the "Bearer " prefix is added here
  HERMES_PROXY_URL        URL of this proxy as seen by kagent runtimes, used for
                          card rewriting (default http://hermes-agent.agent-hermes.svc.cluster.local:8080)
  HERMES_PROXY_TIMEOUT    upstream request timeout in seconds (default 900)
  HERMES_PROXY_PORT       listen port (default 8080, the kagent BYO contract)
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG = logging.getLogger("hermes-proxy")

HERMES_URL = os.environ.get(
    "HERMES_A2A_URL", "http://hermes-agent.hermes-agent.svc.cluster.local:9900"
).rstrip("/")
PROXY_URL = os.environ.get(
    "HERMES_PROXY_URL", "http://hermes-agent.agent-hermes.svc.cluster.local:8080"
).rstrip("/")
TOKEN = os.environ.get("HERMES_A2A_BEARER_TOKEN", "")
TIMEOUT = float(os.environ.get("HERMES_PROXY_TIMEOUT", "900"))
LISTEN_PORT = int(os.environ.get("HERMES_PROXY_PORT", "8080"))  # kagent BYO contract: 8080
CARD_PATHS = ("/.well-known/agent-card.json", "/.well-known/agent.json")
CARD_TTL_S = 60.0
MAX_BODY_BYTES = 32 * 1024 * 1024

_card_lock = threading.Lock()
_card_cache: dict = {"body": b"", "fetched_at": 0.0}


def _rewrite_card(card: dict) -> dict:
    """Point every routable URL in the card back at this proxy."""
    base = PROXY_URL + "/"
    card["url"] = base
    provider = card.get("provider")
    if isinstance(provider, dict):
        provider["url"] = base
    for iface in card.get("supportedInterfaces") or []:
        if isinstance(iface, dict):
            iface["url"] = base
    return card


def _fallback_card() -> dict:
    return {
        "name": "hermes_agent",
        "description": (
            "Hermes personal agent (Nous Research) reachable over A2A via the "
            "kagent BYO proxy. Upstream card temporarily unavailable."
        ),
        "url": PROXY_URL + "/",
        "version": "1.0.0",
        "capabilities": {"streaming": True, "pushNotifications": False},
        "defaultInputModes": ["text/plain"],
        "defaultOutputModes": ["text/plain"],
        "skills": [],
    }


def _fetch_upstream_card() -> bytes | None:
    # URL is a fixed env-configured cluster endpoint, not request input.
    req = urllib.request.Request(f"{HERMES_URL}/.well-known/agent-card.json")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
            card = json.loads(resp.read().decode("utf-8"))
        return json.dumps(_rewrite_card(card)).encode("utf-8")
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        LOG.warning("upstream card fetch failed: %s", exc)
        return None


def get_card() -> bytes:
    now = time.monotonic()
    with _card_lock:
        if _card_cache["body"] and now - _card_cache["fetched_at"] < CARD_TTL_S:
            return _card_cache["body"]
        body = _fetch_upstream_card()
        if body is None:
            # Serve stale card if we have one; otherwise the synthetic fallback.
            if _card_cache["body"]:
                return _card_cache["body"]
            body = json.dumps(_fallback_card()).encode("utf-8")
        _card_cache["body"] = body
        _card_cache["fetched_at"] = now
        return body


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "hermes-a2a-proxy/1.0"

    def log_message(self, fmt: str, *args) -> None:  # route access logs through logging
        LOG.info("%s %s", self.command, fmt % args)

    def _send_bytes(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_jsonrpc_error(self, request_id, code: int, message: str) -> None:
        try:
            body = json.loads(self._request_body or b"{}")
            request_id = body.get("id", request_id)
        except ValueError:
            pass
        payload = json.dumps(
            {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}
        ).encode("utf-8")
        self._send_bytes(502, payload, "application/json")

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?")[0] in CARD_PATHS or self.path.split("?")[0] == "/":
            self._send_bytes(200, get_card(), "application/json")
        elif self.path == "/healthz":
            self._send_bytes(200, b"ok", "text/plain")
        else:
            self._send_bytes(404, b"not found", "text/plain")

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?")[0] not in ("/", "/a2a"):
            self._send_bytes(404, b"not found", "text/plain")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length > MAX_BODY_BYTES:
            self._send_bytes(413, b"body too large", "text/plain")
            return
        self._request_body = self.rfile.read(length) if length else b""

        headers = {
            "Content-Type": self.headers.get("Content-Type", "application/json"),
            "Authorization": f"Bearer {TOKEN}",
        }
        a2a_version = self.headers.get("a2a-version")
        if a2a_version:
            headers["a2a-version"] = a2a_version

        # URL is a fixed env-configured cluster endpoint, not request input.
        req = urllib.request.Request(f"{HERMES_URL}/", data=self._request_body, headers=headers)
        try:
            resp = urllib.request.urlopen(req, timeout=TIMEOUT)  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
        except urllib.error.HTTPError as exc:
            # Upstream answered with an HTTP error status; relay status + body.
            body = exc.read()
            self._send_bytes(exc.code, body, exc.headers.get("Content-Type", "application/json"))
            return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            LOG.error("upstream request failed: %s", exc)
            self._send_jsonrpc_error(None, -32603, f"hermes upstream unreachable: {exc}")
            return

        content_type = resp.headers.get("Content-Type", "application/json")
        try:
            if "text/event-stream" in content_type:
                self._stream_chunked(resp, content_type)
            else:
                body = resp.read()
                self._send_bytes(resp.status, body, content_type)
        finally:
            resp.close()

    def _stream_chunked(self, resp, content_type: str) -> None:
        self.send_response(resp.status)
        self.send_header("Content-Type", content_type)
        self.send_header("Transfer-Encoding", "chunked")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        while True:
            chunk = resp.read(8192)
            if not chunk:
                break
            self.wfile.write(b"%x\r\n" % len(chunk))
            self.wfile.write(chunk)
            self.wfile.write(b"\r\n")
            self.wfile.flush()
        self.wfile.write(b"0\r\n\r\n")
        self.wfile.flush()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not TOKEN:
        LOG.error("HERMES_A2A_BEARER_TOKEN is required")
        raise SystemExit(1)
    LOG.info("forwarding to %s as %s", HERMES_URL, PROXY_URL)
    server = ThreadingHTTPServer(("0.0.0.0", LISTEN_PORT), Handler)
    server.daemon_threads = True
    server.serve_forever()


if __name__ == "__main__":
    main()
