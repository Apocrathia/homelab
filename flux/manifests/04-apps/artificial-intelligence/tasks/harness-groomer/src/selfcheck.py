# ruff: noqa: S101, S105  # asserts + a mock bearer token (not a secret)
"""Selfcheck: run invoke.run_oneshot against an in-process mock of the
prime-agent A2A webhook (a2a/server.mjs wire: card GET, PascalCase
SendMessage/GetTask, proto-JSON task dialect, bearer auth, working ->
terminal). Exit 0 only if every scenario lands the expected exit code.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import uuid4

import invoke as inv

TOKEN = "selfcheck-token"
LOG = logging.getLogger("selfcheck")


class MockWebhook(BaseHTTPRequestHandler):
    """Mimics server.mjs: fail-closed bearer POSTs, proto task dialect."""

    # scenario knobs, swapped between servers
    terminal = "completed"  # state the task flips to
    polls_before_terminal = 2
    run_in_thread = True

    def log_message(self, *args):  # silence request logging
        pass

    def do_GET(self):
        if self.path.endswith("/.well-known/agent-card.json") or self.path == "/":
            card = {
                "name": "Prime Agent",
                "description": "mock",
                "url": f"http://127.0.0.1:{self.server.server_port}",
                "protocolVersion": "1.0",
                "capabilities": {"streaming": False, "pushNotifications": False},
                "defaultInputModes": ["text"],
                "defaultOutputModes": ["text"],
                "skills": [],
            }
            body = json.dumps(card).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.headers.get("Authorization") != f"Bearer {TOKEN}":
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b"unauthorized")
            return
        req = json.loads(self.rfile.read(int(self.headers["content-length"])))
        server: MockState = self.server
        server.request_log.append((req.get("method"), self.headers.get("Authorization")))
        if req.get("method") == "SendMessage":
            task = server.new_task()
            server.seen_prompt_chars.append(sum(len(p.get("text") or "") for p in req["params"]["message"]["parts"]))
            result = {"task": server.proto_snapshot(task)}
        elif req.get("method") == "GetTask":
            task = server.task
            task = server.advance(task)
            result = server.proto_snapshot(task)
        else:
            self._jsonrpc(req.get("id"), error={"code": -32601, "message": "method not found"})
            return
        self._jsonrpc(req.get("id"), result=result)

    def _jsonrpc(self, rid, result=None, error=None):
        payload = {"jsonrpc": "2.0", "id": rid}
        payload["result" if error is None else "error"] = result if error is None else error
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(body)


class MockState(ThreadingHTTPServer):
    """Task store: one task, flipping to terminal after N polls."""

    terminal = "completed"
    polls_before_terminal = 2

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.request_log = []
        self.seen_prompt_chars = []
        self.task = {
            "id": str(uuid4()),
            "contextId": str(uuid4()),
            "polls": 0,
            "state": "working",
        }

    def new_task(self):
        self.task = {"id": str(uuid4()), "contextId": str(uuid4()), "polls": 0, "state": "working"}
        return self.task

    def advance(self, task):
        task["polls"] += 1
        if task["polls"] >= self.polls_before_terminal:
            task["state"] = self.terminal
        return task

    def proto_snapshot(self, task):
        snap = {
            "id": task["id"],
            "contextId": task["contextId"],
            "status": {"state": f"TASK_STATE_{task['state'].upper()}"},
        }
        if task["state"] == "completed":
            snap["artifacts"] = [{"parts": [{"text": "groom report: 3 merged, 1 proposal"}]}]
        if task["state"] == "failed":
            snap["status"]["message"] = {
                "role": "ROLE_AGENT",
                "parts": [{"text": "boom: stderr tail"}],
            }
        return snap


async def run_case(terminal, polls_before_terminal, bearer, deadline_s):
    server = MockState(("127.0.0.1", 0), MockWebhook)
    server.terminal = terminal
    server.polls_before_terminal = polls_before_terminal
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{server.server_port}"
        rc = await inv.run_oneshot(
            a2a_url=url,
            prompt_text="groom the harness store",
            bearer_token=bearer,
            timeout_s=5.0,
            poll_interval_s=0.05,
            poll_deadline_s=deadline_s,
        )
        return rc, server
    finally:
        server.shutdown()
        thread.join(timeout=5)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    rc, srv = asyncio.run(run_case("completed", polls_before_terminal=2, bearer=TOKEN, deadline_s=10))
    assert rc == 0, f"completed case must exit 0, got {rc}"
    methods = [m for m, _ in srv.request_log]
    assert methods[0] == "SendMessage" and methods.count("GetTask") == 2, methods
    assert srv.seen_prompt_chars[0] == len("groom the harness store")
    print("PASS: working -> 2x GetTask -> completed, exit 0")

    rc, srv = asyncio.run(run_case("failed", polls_before_terminal=1, bearer=TOKEN, deadline_s=10))
    assert rc == 1, f"failed case must exit 1, got {rc}"
    print("PASS: working -> failed, exit 1")

    rc, srv = asyncio.run(run_case("working", polls_before_terminal=10**9, bearer=TOKEN, deadline_s=0.25))
    assert rc == 1, f"deadline case must exit 1, got {rc}"
    assert [m for m, _ in srv.request_log].count("GetTask") >= 2, "must poll before deadline"
    print("PASS: never-terminal task hits poll deadline, exit 1")

    rc, srv = asyncio.run(run_case("completed", polls_before_terminal=1, bearer="wrong-token", deadline_s=10))
    assert rc == 1, f"bad-token case must exit 1, got {rc}"
    assert all(auth != f"Bearer {TOKEN}" for _, auth in srv.request_log), "no POST may carry the right token"
    print("PASS: wrong bearer token -> exit 1")

    print("ALL SELF-CHECKS PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
