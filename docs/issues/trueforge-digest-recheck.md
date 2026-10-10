---
title: "TrueForge images (whisparr/jellyfin): re-check base-image CVE hygiene"
kind: spec
status: open
severity: low
source: agent
found_at: 2026-09-18
found_by: agent (trueforge-vs-home-operations survey)
area: security
slice: afk
---

# TrueForge images (whisparr/jellyfin): re-check base-image CVE hygiene

## Problem / desired state

The 2026-09-18 survey (session 01a0b4eb, evidence:
`.scratch/trueforge-vs-home-operations.md`) kept the arr fleet on
`home-operations` images but left **whisparr and jellyfin** on
`ghcr.io/trueforge-org` (containerforge) — home-operations publishes no
whisparr v3 and no jellyfin at all, so those two have no better source.

The survey's finding that came with that choice: TrueForge builds on Ubuntu
26.04 without picking up base-package security fixes at build time — the
fleet-wide pattern was 4–7 fixable criticals per image, and the then-deployed
`whisparr:2.2.0` carried **4 critical + ~86 fixable-high OS CVEs**
(app-level CVEs are identical across orgs; the gap is base-image hygiene).

The session closed with a conditional offer — file an issue to **re-check
the whisparr/jellyfin digests after TrueForge cuts a cleaner rebuild** —
never taken. Renovate has since kept the digests fresh (whisparr digest
bumped to `f4cf478…`, jellyfin tag to `12.2.0` on `origin/main`), but nobody
has verified whether the newer rebuilds closed the base-image CVE gap.

Desired: the current deployed digests are either clean (0 fixable criticals)
or the residual risk is explicitly accepted, and the re-check has a defined
trigger instead of a dangling offer.

## Repro

N/A — verification task.

## Acceptance

- Trivy scan of the current deployed digests
  (`ghcr.io/trueforge-org/whisparr:2.2.0@sha256:f4cf478…`,
  `ghcr.io/trueforge-org/jellyfin:12.2.0@sha256:9d9cabd…`)
  shows 0 fixable criticals — or the accepted residual is recorded here.
- A re-check trigger is decided: per renovate digest bump, periodic, or
  one-shot-and-done.

## Feedback loop

- `trivy image --scanners vuln` on the two pinned digests (read-only; compare
  against the 2026-09-18 baseline in `.scratch/trueforge-vs-home-operations.md`)
- The repo's CI Trivy job covers manifest paths; this check is the image-side
  complement (out of CI for now).

## Implementation hint

Two `trivy image` runs against the exact `image@digest` pairs from
`flux/manifests/04-apps/media/management/whisparr/helmrelease.yaml` and
`flux/manifests/04-apps/media/servers/jellyfin/helmrelease.yaml`; record the
fixable-critical count delta vs the Sep 18 survey. No cluster contact needed.

## Notes

- Survey verdict recap (why these two stay on TrueForge): whisparr v3 line +
  jellyfin exist only in containerforge; TrueForge follows home-operations'
  CI standards; the Ubuntu-base hygiene is the one thing to watch.
- Sessions: 01a0b4eb (2026-09-18). Digest/tag history re-verified from git
  log on `origin/main` at filing time (2026-10-10).

**Next action (gate):** run the two-image digest scan (afk-safe, read-only)
and record accept-or-escalate in this file.
