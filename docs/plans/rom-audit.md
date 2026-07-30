---
title: "rom-audit — DAT report CronJob"
status: active
found_at: 2026-07-27
updated_at: 2026-07-29
area: apps
---

# rom-audit — DAT report CronJob

## Goal

Run a stateless cluster CronJob that compares ROM files on the Games share
against No-Intro DATs (unencrypted / decrypted dumps only). Default output is
**human-readable text** on stdout. Optional **`--json`** emits NDJSON for
Alloy pod logs → Loki → Grafana Explore. Optional **`--output-dir`** writes
share artifacts. No renames, deletes, decryption, DAT vendoring, Alloy
pipeline changes, or Grafana alerts in this ship.

## Scope

**In scope:**

- Pure Python auditor (`uv` + `uv.lock` + ruff), CronJob pattern matching
  `uptime-robot-ip-sync` (ConfigMap scripts, init installs deps to `/deps`)
- Flux app under `flux/manifests/04-apps/games/rom-audit/`
- Games SMB mount (skyscraper/romm family) — read library + `systems.yaml` /
  DATs
- SoT registry on the share: `Emulation/tools/rom-audit/systems.yaml`
- Text stdout by default; `--json` on the CronJob; optional `--output-dir`
- `--system` (repeatable) to limit a run; omit = all `enabled: true`
- Classify **files on disk only** (`matched` / `wrong_name` / `unknown`)
- No-Intro single-file cart systems; operator-maintained DATs in `dats/`

**Out of scope:**

- Auto-rename / apply
- Decrypting dumps (separate work)
- Emitting `missing` for DAT entries not on disk
- DAT fetch from DAT-o-MATIC / Redump inside the Job
- Vendoring DAT files in git
- Alloy changes (no structured_metadata / label promotion)
- Grafana alerts or dashboards (revisit after several Sunday runs)
- Redump / CHD / cue+bin, MAME, 3do, dos / scummvm / c64

## Decisions

- Engine — **pure Python CronJob** — not Wine/ROMVault/ClrMamePro.
- Mutate — **report only**.
- Runtime — **cluster** (~80Gb to NAS); Mac ok for small local checks.
- Output — **text default**; **`--json`** for Loki; **`--output-dir`**
  optional on the share.
- Loki — **NDJSON body + existing pod labels** (`namespace`, `pod`, `app`,
  …). Query with `| json`. Keep lines under Alloy’s **10 000-char** drop
  limit. Include optional `level` / `message` / `timestamp` for hygiene.
  Do not put paths/hashes in stream labels.
- Coverage — **every on-disk ROM file** + start/summary events. No
  DAT-completeness (`missing`) rows yet.
- Naming — hash **inner zip payload**; `matched` vs `wrong_name` compares
  **outer zip basename** to the DAT rom name (stem + `.zip` as appropriate).
- Ignore junk — `.DS_Store`, `.srm`, `systeminfo.txt`, `metadata.txt`, other
  non-ROM sidecars (do not classify as `unknown`).
- SoT preference — **unencrypted / decrypted** No-Intro variants where the
  split exists. Decrypt/convert is out of band.
- `dat_name` — optional exact DAT header `<name>`; mismatch → error for that
  system, continue others.
- CLI — `--config`, `--library-root` override, `--system` repeatable,
  `--json`, `--output-dir`.
- Schedule — **`0 6 * * 0` America/Denver** (after Skyscraper 03:00).
- Job — **`activeDeadlineSeconds: 86400`**, **`backoffLimit: 0`**.
- Alerts — **none** until multiple runs exist to baseline.
- Toolchain — uv + ruff, Python 3.12+, line length 120.
- Name — **`rom-audit`**.

### Source of truth (No-Intro carts)

| Folder     | Provider  | DAT header / notes                                               | Enabled initially                       |
| ---------- | --------- | ---------------------------------------------------------------- | --------------------------------------- |
| atari2600  | no-intro  | Atari - Atari 2600                                               | yes                                     |
| gamegear   | no-intro  | Sega - Game Gear                                                 | yes                                     |
| gb         | no-intro  | Nintendo - Game Boy                                              | yes                                     |
| gba        | no-intro  | Nintendo - Game Boy Advance                                      | yes                                     |
| gbc        | no-intro  | Nintendo - Game Boy Color                                        | yes                                     |
| genesis    | no-intro  | Sega - Mega Drive - Genesis                                      | yes                                     |
| n64        | no-intro  | Nintendo 64 (**BigEndian**)                                      | yes                                     |
| nds        | no-intro  | Nintendo DS (**Decrypted**)                                      | yes                                     |
| nes        | no-intro  | NES (**Headered**)                                               | yes                                     |
| sega32x    | no-intro  | Sega - 32X                                                       | yes                                     |
| snes       | no-intro  | Super Nintendo Entertainment System                              | yes                                     |
| virtualboy | no-intro  | Nintendo - Virtual Boy                                           | yes                                     |
| n3ds       | no-intro  | **Decrypted** (replace Encrypted DAT on share first)             | **no** until DAT ready                  |
| 3do        | inventory | CHD on share (~74); no No-Intro DAT. Redump covers cue/bin later | **no** until `inventory` provider ships |
| (redump…)  | redump    | deferred (cue/bin + CHD fingerprinting)                          | no                                      |
| mame       | mame      | deferred — set version unknown                                   | no                                      |

### `systems.yaml` sketch

```yaml
library_root: /emulation
dats_dir: dats
roms_dir: roms
systems:
  nes:
    enabled: true
    provider: no-intro
    dat: nes.dat
    dat_name: "Nintendo - Nintendo Entertainment System (Headered)"
  n3ds:
    enabled: false
    provider: no-intro
    dat: n3ds.dat
    dat_name: "Nintendo - Nintendo 3DS (Decrypted)"
  3do:
    enabled: false # enable after inventory provider ships
    provider: inventory
    # no dat / dat_name — walk roms/3do/, emit counts only
  psx:
    enabled: false
    provider: redump
    dat: psx.dat
```

## Share layout

```
Emulation/
  dats/
  roms/<system>/
  tools/rom-audit/
    systems.yaml
    logs/<run-id>/          # only when --output-dir is set
```

## Git layout

```
flux/manifests/04-apps/games/rom-audit/
  namespace.yaml
  kustomization.yaml
  smb-storage.yaml
  cronjob.yaml              # --json; schedule 0 6 * * 0; deadline 24h
  README.md
  src/
    pyproject.toml
    uv.lock
    rom_audit/
      __init__.py
      __main__.py
      dat.py
      hash.py
      scan.py
      emit.py
    README.md
```

## Auditor behavior

1. Load config; emit run start.
2. For each selected enabled `no-intro` system: load DAT, check `dat_name` if
   set, index by CRC32 (SHA1 when useful).
3. Walk `roms/<system>/` (zips + loose ROMs); skip junk; hash inner payload
   for zips.
4. Classify: `matched` | `wrong_name` | `unknown`; emit every file +
   summaries (text or `--json`).
5. Hard failures only for mount/config/unreadable enabled DAT — not for
   unknowns.

### Example LogQL

```logql
{namespace="rom-audit"} | json | status="wrong_name"
{namespace="rom-audit"} | json | event="run_summary"
```

## Feedback loop

- `uv sync` / `uv run ruff format .` / `uv run ruff check .` in `src/`
- Fixture unit tests (DAT parse + classify; no real ROMs)
- `kustomize build` + yamllint + Trivy on changed paths
- One-shot Job with `--system virtualboy` (and `--json`); confirm lines in
  Loki before enabling the full cart list
- Cluster apply only with operator approval

## Steps

- [x] Scaffold Flux app (ns, kustomization, smb, CronJob)
- [x] Implement package: DAT parse, zip hash, classify, text/`--json`/
      `--output-dir`, `--system`, `dat_name` check
- [x] uv.lock + ruff; `src/README.md`
- [x] Example `systems.yaml` in app README (operator copies to share);
      n3ds disabled until Decrypted DAT present
- [x] Wire games kustomization; document LogQL
- [x] Fixture tests + ruff clean
- [x] Operator: share `systems.yaml` at `Emulation/tools/rom-audit/`
      (n3ds still disabled — share DAT is Encrypted)
- [x] Local smoke: `--system virtualboy` → 31/31 matched, exit 0
- [x] Operator: cluster apply + one-shot Job → Loki check
      (`rom-audit-virtualboy`: 31/31 matched; `| json | event="run_summary"` hits)
- [ ] Optional: broader one-shot / wait for Sunday CronJob; Decrypted n3ds DAT when ready
- [x] Grafana dashboard (Games folder) — see
      [`rom-audit-dashboard-design.md`](./rom-audit-dashboard-design.md)
      (`grafana/` JSON + ConfigMap + GrafanaDashboard CR; apply TBD)

## Future ideas (unrefined)

Not this ship. Capture so we don't lose them.

- **DAT download / refresh** — pull/update No-Intro (and later Redump) DATs
  onto the share (DAT-o-MATIC or similar) instead of hand-dropping files.
  Still out of scope for the current Job; decide later whether this is a
  separate CronJob, a one-shot operator script, or in-job fetch.
- **MAME** — eventually audit arcade sets. Needs a pinned MAME version + set
  fingerprinting (not single-file No-Intro CRC matching). Row already in the
  SoT table as deferred.

### 3do (refined)

Share: `roms/3do/` is **~74 CHD** files (~47 GB); no `3do.dat` on the share.
Many titles are fan translations (`[T+…]` / 3DOPLANET) and will never match a
clean Redump set. Multi-disc names use `CD1`/`CD2`/….

| Horizon | Decision                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Near    | Add `provider: inventory` — walk the folder, emit file inventory + counts, **no** `matched` / `wrong_name` / DAT load. Enable `3do` in `systems.yaml` once that ships.      |
| Later   | Redump DAT ([Panasonic - 3DO Interactive Multiplayer](http://redump.org/datfile/3do/)) + CHD-aware fingerprinting — same ship as other Redump/CHD systems (psx, saturn, …). |
| Not     | Treat as No-Intro cart / CRC the CHD as a zip payload.                                                                                                                      |

`systems.yaml` row lives in the sketch above (`enabled: false` until inventory
exists).

## Notes

- Resources (CPU/memory) — start modest (e.g. 1–2 CPU / 2–4Gi) and raise after
  the first full Sunday run; not a product decision.
- Packaged `uv` apps: CronJob init must `uv export --no-emit-project` so the
  requirements file does not include `-e .` (cwd in the container is `/`).
