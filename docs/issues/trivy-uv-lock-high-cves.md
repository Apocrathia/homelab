---
title: "Bump HIGH CVEs in tracked uv.lock trees"
kind: bug
status: open
severity: high
source: agent
found_at: 2026-07-24
found_by: launch-3-trivy-ledger
area: security
slice: afk
---

# Bump HIGH CVEs in tracked uv.lock trees

## Problem / desired state

Trivy filesystem batch `7c5f1d25-bff3-4a6f-8eb6-651a069002a5` reported
fixable HIGH vulnerabilities in committed `uv.lock` files under agent-invoke
tasks and management scripts. Desired state: those locks pin versions at or
above the Trivy-reported fixed versions (re-lock via `uv`, do not hand-edit).

Tracked surfaces (package → current → fixed):

| Lock tree                                  | Package      | Current | Fixed                                           |
| ------------------------------------------ | ------------ | ------- | ----------------------------------------------- |
| `…/tasks/alert-agent-invoke/src`           | starlette    | 1.0.0   | ≥1.3.1 (covers CVE-2026-48818 / CVE-2026-54283) |
| `…/tasks/alert-agent-invoke/src`           | urllib3      | 2.6.3   | 2.7.0                                           |
| `…/tasks/alert-agent-invoke/src`           | cryptography | 46.0.7  | 48.0.1                                          |
| `…/tasks/alert-agent-invoke/src`           | pyasn1       | 0.6.3   | 0.6.4                                           |
| `…/tasks/run-loop-agent-invoke/src`        | urllib3      | 2.6.3   | 2.7.0                                           |
| `…/tasks/run-loop-agent-invoke/src`        | cryptography | 46.0.7  | 48.0.1                                          |
| `…/tasks/run-loop-agent-invoke/src`        | pyasn1       | 0.6.3   | 0.6.4                                           |
| `…/tasks/scheduled-agent-invoke/src`       | urllib3      | 2.6.3   | 2.7.0                                           |
| `…/tasks/scheduled-agent-invoke/src`       | cryptography | 46.0.7  | 48.0.1                                          |
| `…/tasks/scheduled-agent-invoke/src`       | pyasn1       | 0.6.3   | 0.6.4                                           |
| `…/scripts/unifi/uptime-robot-ip-sync/src` | urllib3      | 2.6.3   | 2.7.0                                           |
| `…/media/management/scripts/arrsync/src`   | urllib3      | 2.5.0   | 2.7.0                                           |

Paths are under `flux/manifests/04-apps/` (artificial-intelligence tasks,
management/scripts, media/management/scripts).

## Repro

1. Trivy filesystem scan (vuln, min severity HIGH) on the lock paths above.
2. Confirm package/version/fixed-version rows match the table.

## Acceptance

- Each listed `uv.lock` has no remaining HIGH/CRITICAL findings for
  starlette, urllib3, cryptography, or pyasn1 at the versions named above.
- Lockfiles were regenerated with `uv` (or the project's usual lock workflow),
  not manually patched.

## Feedback loop

- Trivy filesystem vuln scan on:
  - `flux/manifests/04-apps/artificial-intelligence/tasks/alert-agent-invoke/src`
  - `flux/manifests/04-apps/artificial-intelligence/tasks/run-loop-agent-invoke/src`
  - `flux/manifests/04-apps/artificial-intelligence/tasks/scheduled-agent-invoke/src`
  - `flux/manifests/04-apps/management/scripts/unifi/uptime-robot-ip-sync/src`
  - `flux/manifests/04-apps/media/management/scripts/arrsync/src`
- Expect zero HIGH/CRITICAL hits for the packages in the table.

## Implementation hint

Per tree: bump constraints / `uv lock` (or `uv sync` + commit lock) to the
fixed versions Trivy reports. Prefer one MR covering all five trees if Renovate
has not already opened bumps.

## Notes

- Source batch: `7c5f1d25-bff3-4a6f-8eb6-651a069002a5`.
- `.scratch/**` lock/CVE noise is out of scope (see
  `trivy-scan-noise-deferred.md`).
