# Daily MISP event prune script. Consumed via the configMapGenerator
# (name: misp-event-prune-script) in kustomization.yaml, which mounts it
# read-only at /app/prune_events.py in the misp-event-prune CronJob. Kept
# a raw .py file so the repo's ruff pre-commit hooks lint and format it.
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

# Cutoff computed on the UTC container clock; one day of skew vs the Denver
# calendar is immaterial for a rolling 90-day window.
misp_url = os.environ["MISP_URL"].rstrip("/")
# urllib honors file:// and other schemes; the manifest fixes MISP_URL to an
# http in-cluster Service, but validate anyway so a bad env value cannot turn
# the prune into an arbitrary-file read (semgrep audit: see the nosemgrep
# notes on the urlopen calls below).
scheme = urllib.parse.urlsplit(misp_url).scheme
if scheme not in ("http", "https"):
    sys.exit(f"MISP_URL must be http(s), got scheme {scheme!r}")
headers = {"Authorization": os.environ["MISP_KEY"], "Accept": "application/json"}
cutoff = (date.today() - timedelta(days=90)).isoformat()

# POST /events/index, body filter dateuntil = "Event.date <= cutoff"
# (MISP automation guide: searchDateuntil, "anything older than the given
# date"); minimal trims each event to a few small fields
# (id/uuid/timestamp/published/…; this script reads only the
# id). The REST branch returns the bare event array with no
# result cap (verified against the MISP 2.5.44
# EventsController source).
# semgrep flags the urllib calls below as
# python.lang.security.audit.dynamic-urllib-use-detected (audit rule: any
# non-literal urlopen arg; it matches by pattern and has no sanitizer).
# The URL is the manifest-fixed MISP_URL (scheme-validated above) plus an
# int-cast event id; no user-controlled data reaches urllib, so the audit
# closes here and the findings are suppressed inline.
index_req = urllib.request.Request(
    f"{misp_url}/events/index",
    data=json.dumps({"dateuntil": cutoff, "minimal": True}).encode(),
    headers={**headers, "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(  # nosemgrep
    index_req, timeout=120
) as resp:
    events = json.load(resp)
ids = [int(event["id"]) for event in events]
del events
print(f"events with date <= {cutoff} (90-day window): {len(ids)}")

deleted = failed = 0
for event_id in ids:
    # DELETE /events/<id> (automation guide); MISP 403s both
    # permission failures and not-found, so count it and keep sweeping.
    delete_req = urllib.request.Request(
        f"{misp_url}/events/{event_id}", headers=headers, method="DELETE"
    )
    try:
        with urllib.request.urlopen(  # nosemgrep
            delete_req, timeout=60
        ) as resp:
            resp.read()
        deleted += 1
    except urllib.error.HTTPError as err:
        failed += 1
        print(f"delete failed for event {event_id}: HTTP {err.code}", file=sys.stderr)
    if deleted and deleted % 1000 == 0:
        print(f"deleted {deleted} events")
print(f"deleted {deleted} events, {failed} delete failures")
sys.exit(1 if failed else 0)
