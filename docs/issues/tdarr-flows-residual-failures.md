---
title: "Tdarr flows: residual failure modes after storage pass"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-07-28
found_by: dogfood
area: apps
slice: hitl
---

# Tdarr flows: residual failure modes after storage pass

## Problem / desired state

Core storage-first flow work shipped in
`flux/manifests/04-apps/media/management/tdarr/flows/` (manual Tdarr UI
import; size 2–101%, SD CRF paths, disc skip, cover drops, Execute-before-CleanTitle).
Libraries are reprocessing; revisit after that settles (~months).

Residual failure classes still worth fixing when back:

1. **`mov_text` → MKV** — largest historical error class. `forceConform` alone
   does not convert; need explicit strip/convert before mux.
2. **Non-primary / HEVC `gbrp` covers** — codec-name drop misses some; keep
   tightening attached_pic / non-primary video removal if errors persist.
3. **Exotic audio** — rare (`adpcm_ima_qt`, `pcm_bluray`).
4. **0-byte source / unreadable probe** — size-check and disc short-circuit
   guards.

## Repro

N/A — park until library reprocess completes, then sample `Transcode error`
in Tdarr `jobsjsondb` / JobReports.

## Acceptance

- Dominant residual modes from a fresh error sample are handled or explicitly
  wontfix’d with rationale.
- Flow JSON under `flows/` and `flows/README.md` stay in sync with live import.

## Feedback loop

- Classify recent Transcode errors after reprocess wave.
- Spot-check JobReports for `mov_text` / cover / audio classes.
- `prettier --check` on changed markdown.

## Notes

- Supersedes open leftovers from `tdarr-flows-storage-multipass` (closed
  2026-07-28). Flow history lives in git under `flows/`.
- Revisit target: after bulk library reprocess (~2026-10).
