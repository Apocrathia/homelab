# rom-audit

Weekly report-only `CronJob` that compares ROM files on the Emulation share
against No-Intro DATs and logs a classification for every file. It never
renames, deletes, or otherwise modifies anything on the share.

> **Navigation**: [← Back to Games README](../README.md)

## What it does

- Mounts `Games/Emulation` (SMB) at `/emulation`, read-only
- Loads `tools/rom-audit/systems.yaml` to decide which systems to audit
- For each enabled `no-intro` system, loads its DAT and walks `roms/<system>/`
- Classifies every on-disk ROM file as `matched`, `wrong_name`, or `unknown`
  (files present in the DAT but missing from disk are not reported)
- Emits one NDJSON line per file plus per-system and run summaries to stdout,
  picked up by Alloy → Loki
- Redump and MAME systems are skipped with a warning even if `enabled: true`
  — out of scope for this auditor

## Share layout

```
Emulation/
  dats/                        # operator-maintained No-Intro DAT files
  roms/<system>/                # ROM files (zips and loose files)
  tools/rom-audit/
    systems.yaml                # source of truth for which systems to audit
    logs/<run-id>/               # only written when --output-dir is set
```

## `systems.yaml`

The operator maintains this file directly on the share at
`Emulation/tools/rom-audit/systems.yaml` — it is not part of this Git repo.
Copy the example below as a starting point and adjust `dat` filenames to
match whatever DATs are actually on the share.

`n3ds` ships disabled until the **Decrypted** No-Intro DAT replaces the
Encrypted one on the share (this auditor cannot decrypt 3DS dumps). Redump
entries are included as commented-out examples for future non-cart work; this
auditor skips `provider: redump` and `provider: mame` even if enabled.

```yaml
library_root: /emulation
dats_dir: dats
roms_dir: roms
systems:
  atari2600:
    enabled: true
    provider: no-intro
    dat: atari2600.dat
    dat_name: "Atari - Atari 2600"
  gamegear:
    enabled: true
    provider: no-intro
    dat: gamegear.dat
    dat_name: "Sega - Game Gear"
  gb:
    enabled: true
    provider: no-intro
    dat: gb.dat
    dat_name: "Nintendo - Game Boy"
  gba:
    enabled: true
    provider: no-intro
    dat: gba.dat
    dat_name: "Nintendo - Game Boy Advance"
  gbc:
    enabled: true
    provider: no-intro
    dat: gbc.dat
    dat_name: "Nintendo - Game Boy Color"
  genesis:
    enabled: true
    provider: no-intro
    dat: genesis.dat
    dat_name: "Sega - Mega Drive - Genesis"
  n64:
    enabled: true
    provider: no-intro
    dat: n64.dat
    dat_name: "Nintendo - Nintendo 64 (BigEndian)"
  nds:
    enabled: true
    provider: no-intro
    dat: nds.dat
    dat_name: "Nintendo - Nintendo DS (Decrypted)"
  nes:
    enabled: true
    provider: no-intro
    dat: nes.dat
    dat_name: "Nintendo - Nintendo Entertainment System (Headered)"
  sega32x:
    enabled: true
    provider: no-intro
    dat: sega32x.dat
    dat_name: "Sega - 32X"
  snes:
    enabled: true
    provider: no-intro
    dat: snes.dat
    dat_name: "Nintendo - Super Nintendo Entertainment System"
  virtualboy:
    enabled: true
    provider: no-intro
    dat: virtualboy.dat
    dat_name: "Nintendo - Virtual Boy"
  n3ds:
    enabled: false # wait for the Decrypted DAT to replace Encrypted on the share
    provider: no-intro
    dat: n3ds.dat
    dat_name: "Nintendo - Nintendo 3DS (Decrypted)"
  # psx:
  #   enabled: false # redump — out of scope, auditor skips this provider
  #   provider: redump
  #   dat: psx.dat
```

## CLI flags

| Flag             | Meaning                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `--config`       | Path to `systems.yaml` (required)                                        |
| `--library-root` | Override `library_root` from the config                                  |
| `--system`       | Limit the run to this system; repeatable; omit for all `enabled` systems |
| `--json`         | Emit NDJSON instead of human-readable text                               |
| `--output-dir`   | Also write this run's output to a timestamped file under this directory  |

The `CronJob` runs with `--json` so Alloy ships structured lines to Loki.
`--output-dir` is not set by default; enable it only if you want a copy of
each run's output archived on the share.

## LogQL examples

```logql
{namespace="rom-audit", container="rom-audit", container_runtime="containerd"} | json | status="wrong_name"
{namespace="rom-audit", container="rom-audit", container_runtime="containerd"} | json | event="run_summary"
```

Prefer `container_runtime="containerd"` — Alloy can double-ship the same lines
without it. Dashboard panels also use `max by (pod)` on `run_summary` metrics.

## Grafana

Dashboard JSON + `GrafanaDashboard` CR live under [`grafana/`](./grafana/).
Provisioned into folder **Games** (ConfigMap `rom-audit-dashboard` in
`prometheus-system`), same pattern as Fleet.

## Package internals

See [`src/README.md`](./src/README.md) for the Python package (`uv` +
`ruff` + `pytest`) that this `CronJob` runs.

## Operator setup

1. Copy the `systems.yaml` example above to
   `Games/Emulation/tools/rom-audit/systems.yaml` on the share, adjusting
   `dat` filenames to match what's actually in `Emulation/dats/`.
2. When the **Decrypted** No-Intro 3DS DAT is available, drop it into
   `Emulation/dats/` and flip `n3ds.enabled` to `true`.
3. Create the `smb-credentials` 1Password item (shared with Skyscraper/RomM)
   if it doesn't already exist.
