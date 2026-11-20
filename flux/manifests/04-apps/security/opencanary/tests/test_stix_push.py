"""Behavior test for stix_push.py: black-box subprocess against fakes.

Runs the real script with env pointing at a fake Loki (canned query_range
response) and a fake OpenTAXII (scripted 202 / dirty-202 / 504 / hang
responses), then asserts exit codes, stdout counts, stderr failure lines,
the Loki query shape, and the POSTed STIX envelopes. Stdlib only; also
collectable by pytest if run from this directory.
"""

import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "stix_push.py"
API_ROOT = "9d2329b4-6a06-4f01-9c94-a2c3e6d1a501"
COLLECTION = "952c801c-e4c8-4316-a565-5f97221e799f"
OBJECTS_PATH = f"/taxii2/{API_ROOT}/collections/{COLLECTION}/objects/"

CLEAN_JOB = {
    "id": "11111111-1111-1111-1111-111111111111",
    "status": "complete",
    "request_timestamp": "2026-11-20T14:41:51.000000Z",
    "total_count": 1,
    "success_count": 1,
    "failure_count": 0,
    "pending_count": 0,
}
DIRTY_JOB = {**CLEAN_JOB, "failure_count": 1, "success_count": 0}


def canary_line(logtype, src_host, utc_time="2026-11-20 14:41:50.123456"):
    """One OpenCanary alert line, shaped like logger.sanitizeLog output."""
    return json.dumps(
        {
            "dst_host": "10.100.1.98",
            "dst_port": 8080,
            "logdata": {"password": "hunter2", "SKIN": "nasLogin"},
            "logtype": logtype,
            "node_id": "opencanary",
            "src_host": src_host,
            "src_port": 52434,
            "utc_time": utc_time,
        }
    )


class LokiHandler(BaseHTTPRequestHandler):
    """Fake Loki query_range; serves server.lines, records the query."""

    def do_GET(self):
        self.server.queries.append(urllib.parse.urlparse(self.path))
        values = [[str(int(time.time() * 1e9)), line] for line in self.server.lines]
        body = json.dumps(
            {
                "status": "success",
                "data": {
                    "resultType": "streams",
                    "result": [
                        {"stream": {"namespace": "opencanary"}, "values": values}
                    ],
                },
            }
        ).encode()
        if getattr(self.server, "status", 200) != 200:
            self.send_response(self.server.status)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class TaxiiHandler(BaseHTTPRequestHandler):
    """Fake OpenTAXII objects POST; pops scripted responses, records requests.

    Script entries: ("202", job_dict) | ("504", None) | ("hang", None).
    """

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        request = {
            "path": self.path,
            "content_type": self.headers.get("Content-Type"),
            "accept": self.headers.get("Accept"),
            "body": json.loads(self.rfile.read(length)),
        }
        self.server.requests.append(request)
        kind, payload = self.server.script.pop(0)
        if kind == "hang":
            # Sleep past the test's TAXII_PUSH_TIMEOUT; the client aborts
            # first, so the response below is never read.
            time.sleep(10)
            kind, payload = "202", CLEAN_JOB
        if kind == "504":
            self.send_response(504)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        body = json.dumps(payload).encode()
        self.send_response(202)
        self.send_header("Content-Type", "application/taxii+json;version=2.1")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def start_server(handler, **attrs):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    for key, value in attrs.items():
        setattr(server, key, value)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def run_script(loki_server, taxii_server, push_timeout="1"):
    env = {
        **os.environ,
        "LOKI_URL": f"http://127.0.0.1:{loki_server.server_address[1]}",
        "TAXII_URL": f"http://127.0.0.1:{taxii_server.server_address[1]}",
        "TAXII_API_ROOT": API_ROOT,
        "TAXII_COLLECTION": COLLECTION,
        "TAXII_PUSH_TIMEOUT": push_timeout,
    }
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )


def test_mixed_outcomes():
    """202-clean pushes, dirty 202 and 504 count as failures, hang times out,
    malformed and source-less alerts skip; exit non-zero."""
    loki = start_server(
        LokiHandler,
        lines=[
            canary_line(3001, "10.9.8.7"),
            canary_line(4002, "2001:db8::1", "2026-11-20 14:41:51.654321"),
            canary_line(4000, "10.9.8.7", "2026-11-20 14:41:52.000001"),
            canary_line(4002, "10.9.8.7", "2026-11-20 14:41:53.000002"),
            "not json at all",
            canary_line(2001, ""),
        ],
        queries=[],
    )
    taxii = start_server(
        TaxiiHandler,
        requests=[],
        script=[("202", CLEAN_JOB), ("202", DIRTY_JOB), ("504", None), ("hang", None)],
    )
    try:
        result = run_script(loki, taxii)
        assert result.returncode == 1, (result.returncode, result.stdout, result.stderr)
        assert "pushed 1 indicators, 3 push failures, 2 skipped alerts" in result.stdout
        assert (
            "attacker alerts (logtype >= 2000) in the last 20 min: 6" in result.stdout
        )
        assert "HTTP 504" in result.stderr
        assert "push job not clean" in result.stderr
        assert "skipping unparseable alert" in result.stderr
        assert len(taxii.requests) == 4

        first, second = taxii.requests[0], taxii.requests[1]
        assert all(r["path"] == OBJECTS_PATH for r in taxii.requests)
        assert all(
            r["content_type"] == "application/taxii+json;version=2.1"
            for r in taxii.requests
        )
        assert all(
            r["accept"] == "application/taxii+json;version=2.1" for r in taxii.requests
        )
        # attacker-submitted credentials never leave the alert (logdata is
        # never read)
        assert "hunter2" not in json.dumps([r["body"] for r in taxii.requests])
        assert first["body"]["objects"][0]["pattern"] == (
            "[ipv4-addr:value = '10.9.8.7']"
        )
        assert second["body"]["objects"][0]["pattern"] == (
            "[ipv6-addr:value = '2001:db8::1']"
        )
        stamp_re = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$"
        for request in taxii.requests[:2]:
            indicator = request["body"]["objects"][0]
            assert indicator["type"] == "indicator"
            assert indicator["spec_version"] == "2.1"
            assert indicator["pattern_type"] == "stix"
            assert indicator["id"].startswith("indicator--")
            assert re.match(stamp_re, indicator["created"])
            assert indicator["modified"] == indicator["created"]
            assert indicator["valid_from"] == indicator["created"]
        # Loki query shape: dashboard selector, forward direction, 20 min span
        query = urllib.parse.parse_qs(loki.queries[0].query)
        assert "logtype >= 2000" in query["query"][0]
        assert 'container="opencanary"' in query["query"][0]
        assert query["direction"] == ["forward"]
        assert query["limit"] == ["5000"]
        span = int(query["end"][0]) - int(query["start"][0])
        assert 19 * 60 <= span / 1e9 <= 21 * 60
    finally:
        loki.shutdown()
        loki.server_close()
        taxii.shutdown()
        taxii.server_close()


def test_clean_run_and_deterministic_ids():
    """All-clean run exits 0 and re-running the same window POSTs identical
    STIX ids (the overlap re-POST is a server-side no-op)."""
    lines = [canary_line(3001, "10.9.8.7")]
    ids = []
    for _ in range(2):
        loki = start_server(LokiHandler, lines=lines, queries=[])
        taxii = start_server(TaxiiHandler, requests=[], script=[("202", CLEAN_JOB)])
        try:
            result = run_script(loki, taxii)
            assert result.returncode == 0, (result.returncode, result.stderr)
            assert (
                "pushed 1 indicators, 0 push failures, 0 skipped alerts"
                in result.stdout
            )
            ids.append(taxii.requests[0]["body"]["objects"][0]["id"])
        finally:
            loki.shutdown()
            loki.server_close()
            taxii.shutdown()
            taxii.server_close()
    assert ids[0] == ids[1]


def test_empty_window():
    """No alerts: no POSTs, exit 0."""
    loki = start_server(LokiHandler, lines=[], queries=[])
    taxii = start_server(TaxiiHandler, requests=[], script=[])
    try:
        result = run_script(loki, taxii)
        assert result.returncode == 0, (result.returncode, result.stderr)
        assert "in the last 20 min: 0" in result.stdout
        assert "pushed 0 indicators, 0 push failures, 0 skipped alerts" in result.stdout
        assert taxii.requests == []
    finally:
        loki.shutdown()
        loki.server_close()
        taxii.shutdown()
        taxii.server_close()


def test_loki_error_fails_run():
    """Loki 5xx is a run-level failure: non-zero exit, no silent skip."""
    loki = start_server(LokiHandler, lines=[], queries=[], status=500)
    taxii = start_server(TaxiiHandler, requests=[], script=[])
    try:
        result = run_script(loki, taxii)
        assert result.returncode == 1
        assert "HTTPError" in result.stderr
        assert taxii.requests == []
    finally:
        loki.shutdown()
        loki.server_close()
        taxii.shutdown()
        taxii.server_close()


if __name__ == "__main__":
    tests = [
        test_mixed_outcomes,
        test_clean_run_and_deterministic_ids,
        test_empty_window,
        test_loki_error_fails_run,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"{len(tests)} tests passed")
