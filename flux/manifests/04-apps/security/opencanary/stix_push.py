# OpenCanary -> OpenTAXII STIX push script. Consumed via the
# configMapGenerator (name: opencanary-stix-push-script) in kustomization.yaml,
# which mounts it read-only at /app/stix_push.py in the opencanary-stix-push
# CronJob. Kept a raw .py file so the repo's ruff pre-commit hooks lint and
# format it.
import ipaddress
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import UTC, datetime, timedelta

# In-cluster Services only, same direct-to-Service path as the misp prune
# cronjobs. urllib honors file:// and other schemes, so validate anyway
# (mirroring prune_events.py: a bad env value cannot turn the push into an
# arbitrary-file read).
loki_url = os.environ["LOKI_URL"].rstrip("/")
taxii_url = os.environ["TAXII_URL"].rstrip("/")
for name, url in (("LOKI_URL", loki_url), ("TAXII_URL", taxii_url)):
    scheme = urllib.parse.urlsplit(url).scheme
    if scheme not in ("http", "https"):
        sys.exit(f"{name} must be http(s), got scheme {scheme!r}")
# Path segments are the live-bootstrapped TAXII 2.1 api root and collection
# UUIDs (recorded in the opentaxii README, "TAXII 2.1 bootstrap"; the
# collection alias is NULL in the live DB, so the UUID is the only
# anonymous-write address that needs no live mutation). Parsing them as UUIDs
# fails fast on a typo and proves no path traversal can reach urllib.
try:
    objects_url = (
        f"{taxii_url}/taxii2/{uuid.UUID(os.environ['TAXII_API_ROOT'])}"
        f"/collections/{uuid.UUID(os.environ['TAXII_COLLECTION'])}/objects/"
    )
except ValueError:
    sys.exit("TAXII_API_ROOT and TAXII_COLLECTION must be UUIDs")
# gunicorn (the opentaxii image CMD) kills a worker at --timeout=300, so 330
# lets the server's own verdict (202, or the killed-worker connection drop)
# arrive instead of a client-side abort mid-write - the same discipline as
# prune_events.py's 600 sitting above nginx's 300. Env-overridable only so the
# behavior test can exercise the timeout path quickly; the manifest leaves it
# at the default.
push_timeout = float(os.environ.get("TAXII_PUSH_TIMEOUT", "330"))

# Stateless design: no PVC, no checkpoint. The job runs every 15 min and
# queries a 20 min window, so the 5 min overlap makes every alert visible to
# at least one run even when a run is skipped (concurrencyPolicy: Forbid) or
# fails; alerts re-seen on a later run are storage no-ops (see the id comment
# below). direction=forward plus limit=5000 (Loki's default
# max_entries_limit_per_query) means a flood beyond 5000 alerts drops the
# NEWEST this run - which stay inside the next run's window - whereas the
# default backwards direction would strand the oldest outside every later
# window.
end = datetime.now(UTC)
start = end - timedelta(minutes=20)
query = urllib.parse.urlencode(
    {
        # Same selector the OpenCanary Grafana dashboard uses for "attacker
        # event": the daemon's container only, lines containing "{" (cheap
        # prefilter), then json-parse and keep logtype >= 2000 (3000-3003
        # HTTP, 4000-4002 SSH; 1000-series daemon/boot noise is excluded).
        "query": '{namespace="opencanary", container="opencanary"}'
        " |= `{` | json | logtype >= 2000",
        "start": int(start.timestamp()) * 1_000_000_000,
        "end": int(end.timestamp()) * 1_000_000_000,
        "limit": 5000,
        "direction": "forward",
    }
)
# semgrep flags the urllib calls below as
# python.lang.security.audit.dynamic-urllib-use-detected (audit rule: any
# non-literal urlopen arg; it matches by pattern and has no sanitizer). The
# URLs are the manifest-fixed, scheme-validated Service URLs; the TAXII path
# segments are UUID-validated and the Loki query params are urlencoded, so no
# user-controlled data reaches urllib and the audit closes here (same
# suppression discipline as prune_events.py).
loki_req = urllib.request.Request(f"{loki_url}/loki/api/v1/query_range?{query}")
with urllib.request.urlopen(  # nosemgrep
    loki_req, timeout=60
) as resp:
    payload = json.load(resp)
# query_range log response: {"data": {"resultType": "streams", "result":
# [{"stream": {...}, "values": [[<ts_ns>, <line>], ...]}]}}. A 20 min
# single-namespace window is a small scan; 60 s rides out read-path queueing
# on the SimpleScalable deployment, and a stuck query is better failed fast
# than blocking the pod - the next run re-covers the same window.
lines = [line for stream in payload["data"]["result"] for _, line in stream["values"]]
print(f"attacker alerts (logtype >= 2000) in the last 20 min: {len(lines)}")

pushed = failed = skipped = 0
for line in lines:
    # OpenCanary alert shape (thinkst/opencanary logger.sanitizeLog): utc_time
    # "%Y-%m-%d %H:%M:%S.%f" (naive UTC), int logtype, src_host (socket peer,
    # "" when the module has no transport). logdata is deliberately never
    # read: HTTP 3001 and SSH 4002 alerts carry attacker-submitted passwords.
    try:
        alert = json.loads(line)
        src = ipaddress.ip_address(alert["src_host"])
        logtype = alert["logtype"]
        when = datetime.strptime(alert["utc_time"], "%Y-%m-%d %H:%M:%S.%f")
    except (ValueError, KeyError) as err:
        # Count-and-continue like prune_events.py: one malformed or
        # source-less alert must not drop the rest of the sweep. The skip is
        # loud (stderr + non-zero exit) and self-heals when the line leaves
        # the 20 min window.
        skipped += 1
        print(f"skipping unparseable alert: {err!r}", file=sys.stderr)
        continue
    when = when.replace(tzinfo=UTC)
    # Deterministic identity: uuid5 over (utc_time, logtype, src_host) under
    # a fixed namespace, with created/modified/valid_from pinned to the alert
    # time. OpenTAXII's add_objects skips the insert when (stix id,
    # collection, version) already exists (version = modified), so lookback
    # overlap re-POSTs are storage no-ops, and OpenCTI's taxii2 connector
    # dedups by STIX id on import as the second net. STIX 2.1 accepts any
    # RFC 4122 UUID in an id (python-stix2 _check_uuid requires v4 only for
    # 2.0), so uuid5 is legal.
    stix_id = "indicator--" + str(
        uuid.uuid5(
            uuid.UUID("729258b4-38b9-43eb-875e-53bde7d8bace"),
            f"{alert['utc_time']}|{logtype}|{src}",
        )
    )
    # Timestamps must carry microseconds and a Z: OpenTAXII's version parser
    # strptime's "%Y-%m-%dT%H:%M:%S.%fZ" exactly (opentaxii taxii2/utils
    # DATETIMEFORMAT), and the alert source format always has microseconds.
    stamp = when.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    indicator = {
        "type": "indicator",
        "spec_version": "2.1",
        "id": stix_id,
        "created": stamp,
        "modified": stamp,
        "indicator_types": ["malicious-activity"],
        "pattern": f"[{'ipv6' if src.version == 6 else 'ipv4'}-addr:value = '{src}']",
        "pattern_type": "stix",
        "pattern_version": "2.1",
        "valid_from": stamp,
        "description": (
            f"OpenCanary honeypot alert: logtype {logtype} from {src}"
            f" at {alert['utc_time']}"
        ),
    }
    # TAXII 2.1 envelope POST; the collection has is_public_write, so the
    # request is anonymous - no Authorization header, no secret anywhere.
    post_req = urllib.request.Request(
        objects_url,
        data=json.dumps({"objects": [indicator]}).encode(),
        headers={
            "Content-Type": "application/taxii+json;version=2.1",
            "Accept": "application/taxii+json;version=2.1",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(  # nosemgrep
            post_req, timeout=push_timeout
        ) as resp:
            job = json.load(resp)
        # The 202 body is the TAXII 2.1 status resource. OpenTAXII's sqldb
        # add_objects completes the job before responding (verified in the
        # 0.10.0b1 source), so "complete" with failure_count 0 is the success
        # contract; anything else means the object may not be stored.
        if job.get("status") != "complete" or job.get("failure_count"):
            failed += 1
            print(f"push job not clean for {stix_id}: {job}", file=sys.stderr)
        else:
            pushed += 1
    except urllib.error.HTTPError as err:
        failed += 1
        print(f"push failed for {stix_id}: HTTP {err.code}", file=sys.stderr)
    except OSError as err:
        # urllib raises socket timeouts (TimeoutError) and dropped
        # connections as bare OSErrors, not HTTPError. Count-and-continue:
        # the failed alert stays unpushed and the next run's overlapping
        # window retries it.
        failed += 1
        print(f"push failed for {stix_id}: {err!r}", file=sys.stderr)
print(f"pushed {pushed} indicators, {failed} push failures, {skipped} skipped alerts")
sys.exit(1 if failed or skipped else 0)
