# Skyscraper (ES-DE)

Weekly [Gemba Skyscraper](https://github.com/Gemba/skyscraper) job that scrapes
ScreenScraper for nonempty ROM systems on the Emulation share and regenerates
ES-DE `gamelist.xml`. Media downloads are disabled (enable later when needed).

> **Navigation**: [← Back to Games README](../README.md)

## What it does

- Mounts `Games/Emulation` (SMB) at `/emulation`
- Scrapes nonempty `roms/<system>/` via ScreenScraper (metadata only)
- Always regenerates `gamelists/<system>/gamelist.xml`
- Keeps Skyscraper’s resource cache on the share
  (`tools/skyscraper/cache`) so ScreenScraper is not re-hit for titles already
  scraped
- Compiles the pinned Gemba binary into an ephemeral `emptyDir` each run

RomM is separate and keeps its own metadata pipeline.

## Schedule

Weekly Sunday 03:00 America/Denver (`CronJob` `skyscraper-esde`).

Manual run:

```bash
kubectl create job --from=cronjob/skyscraper-esde skyscraper-esde-manual -n skyscraper
```

## 1Password

Create item `vaults/Secrets/items/skyscraper-secrets` with:

- `screenscraper-username`: ScreenScraper username
- `screenscraper-password`: ScreenScraper password

SMB uses the shared `vaults/Secrets/items/smb-credentials` item (same as RomM).

## Paths on the share

| Mount          | Path                                        |
| -------------- | ------------------------------------------- |
| ROMs           | `Emulation/roms/<system>/`                  |
| Gamelists      | `Emulation/gamelists/<system>/gamelist.xml` |
| Resource cache | `Emulation/tools/skyscraper/cache/`         |

`mediaFolder` in `config.ini` still points at `Emulation/media/` so gamelist
paths stay ES-DE-compatible; nothing is downloaded there in this mode.

## Notes

- ScreenScraper thread limits apply. Job deadline is 48h; `backoffLimit` is 0.
- Per-system scrape/generate failures are logged; the Job succeeds when at least
  one system scrapes. It only exits non-zero when nothing scrapes.
- Unknown or non-ROM folders are skipped via an exclude list in `scrape.sh`.
- Rotate ScreenScraper credentials if they were ever stored in plaintext on the
  share (e.g. old Skraper config).
