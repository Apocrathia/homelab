---
title: "ESPHome 2026.9.0 rejects the CI stub key; sensor-configs external component unpinned"
kind: bug
status: open
severity: medium
source: ci
found_at: 2026-09-21
found_by: agent (esphome ci job failure lap)
area: apps
slice: afk
---

# ESPHome 2026.9.0 rejects the CI stub key; sensor-configs external component unpinned

## Problem / desired state

**In `Apocrathia/home-assistant-config` (GitHub) — filed here for ledger
visibility; the fix lands in that repo.**

Nightly CI has failed **every night since 2026-09-16**: upstream ESPHome
**2026.9.0** added a validation that rejects the all-zeros API encryption key
as the reserved "no key" value. The repo's CI stub (`.stubs/secrets.yaml`)
uses exactly that all-zeros placeholder for `home_assistant_api_encryption_key`;
CI copies it over `esphome/secrets.yaml`, and all 18 device configs fail
validation — CI dies on the first one alphabetically (`bed-presence-sensor.yaml`).

The workflow installs `esphome` **unpinned**, so the nightly floats with
upstream: the same commit SHA passed on ESPHome 2026.8.2 and has failed every
night since the 2026.9.0 release day. The retry-on-flake change (PR #122)
worked as designed but cannot absorb a deterministic validation error.

Still failing today (verified 2026-10-10, run 38067583088, esphome job log:
"The all-zeros key is reserved and provides no protection"). Nothing
self-resolved.

## Repro

- GitHub Actions: `Home Assistant CI failure` nightly runs, main branch —
  `esphome` job red nightly since 2026-09-16 (latest failure run 38067583088).
- Log signature: `The all-zeros key is reserved and provides no protection;
omit the key to provision it at runtime, or generate a real key with:
openssl rand -base64 32` → `key: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`
  (the stub placeholder).

## Acceptance

- `.stubs/secrets.yaml` carries a non-zero 32-byte base64 placeholder
  (deterministic fake is fine — CI never connects to real devices); nightly
  CI green.
- Optional hardening (each independently landable):
  - pin the `esphome` version in the workflow (stops release-day breaks),
  - pin `bed-presence-sensor.yaml`'s external component
    `ElevatedSensors/sensor-configs` (currently `ref: main`,
    `refresh: 1s` — a supply-chain flake/breakage vector independent of this
    failure).

## Feedback loop

- The repo's own nightly CI run (gh run list / run watch) — green is the gate
- Local: `esphome config` against a device yaml with the stub secrets

## Implementation hint

One line in `.stubs/secrets.yaml`: replace the all-zeros placeholder with any
non-zero 32-byte base64 key, e.g.
`AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA=`. The `openssl rand -base64 32`
route also works; a committed deterministic value keeps CI reproducible.
The ESPHome pin is a workflow-`pip install esphome==<ver>` change.

## Notes

- Root-caused 2026-09-21 (session 01a0c515, "esphome ci job failure"); the
  fix/pin/issue queue ended on "your call" and was never answered. Re-verified
  still-failing 2026-10-10. The recent `athom-tech/esp32-configs` bump (#121)
  was proven unrelated.
- Cross-repo note: homelab `docs/issues` is the operator's default backlog, so
  this ledger entry tracks the HA-config fix; move or close it when the HA repo
  gets its own tracking if that ever matters.

**Next action (gate):** operator word to apply the one-line stub-key fix (and
optionally the version pin); edit is afk-safe once authorized, commit is
operator-owned in the HA repo.
