---
title: "MISP event-prune CronJob times out nightly; 90-day window not enforced"
kind: bug
status: open
severity: medium
source: agent
found_at: 2026-11-20
area: apps
slice: afk
---

# MISP event-prune CronJob times out nightly; 90-day window not enforced

## Problem / desired state

The `misp-event-prune` CronJob
(`flux/manifests/04-apps/security/misp/prune-events-cronjob.yaml`)
fails every night: the last 3 nightly jobs Failed 0/1 with a
`TimeoutError` on the first event DELETE (60s per-request timeout in
`prune_events.py` at
`flux/manifests/04-apps/security/misp/prune_events.py`).

446 expired events are stuck, so the 90-day intel window is not
enforced at source, and the failure silently stalls the OpenCTI
retention pairing.

Desired: the nightly prune enforces the 90-day window without timing
out.

## Repro

- `kubectl get jobs -n misp` (read-only): last 3 nightly
  `misp-event-prune-*` jobs Failed 0/1.
- Job logs: `TimeoutError` on the first event DELETE.

## Acceptance

- Nightly `misp-event-prune` job Succeeds.
- Expired-event count reaches 0 and stays 0.
- OpenCTI retention pairing resumes.

## Feedback loop

- `kubectl get jobs -n misp` (read-only).
- Event count via MISP API or a DB count query.
- `prettier --check` on touched files.

## Implementation hint

Size S: raise the per-request timeout and/or batch deletes in
`prune_events.py`.

## Notes

Found live during the 2026-11-20 ledger clear-out scouts: nightly
prune failures observed over 3 consecutive runs, first event DELETE
hitting the 60s per-request timeout, 446 expired events stuck.
