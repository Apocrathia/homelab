# ES-DE themes sync

Weekly CronJob that mirrors the official ES-DE themes list onto the Emulation
share so theme folders are present without ES-DE writing over SMB.

> **Navigation**: [← Back to Games README](../README.md)

## What it does

- Mounts `Games/Emulation` (SMB) at `/emulation`
- Updates `themes/themes-list` from
  [es-de/themes/themes-list](https://gitlab.com/es-de/themes/themes-list)
- Clones or pulls each entry in `themes.json` (desktop `themes` array) into
  `themes/<reponame>/` as full git repos (ES-DE rejects shallow clones)
- Does not delete themes removed from the list

## Schedule

Weekly Sunday 04:00 America/Denver (`CronJob` `esde-themes-sync`).

Manual run:

```bash
kubectl create job --from=cronjob/esde-themes-sync esde-themes-sync-manual -n esde-themes
```

## 1Password

SMB uses the shared `vaults/Secrets/items/smb-credentials` item (same as RomM /
Skyscraper).

## Paths on the share

| Mount       | Path                            |
| ----------- | ------------------------------- |
| Themes list | `Emulation/themes/themes-list/` |
| Each theme  | `Emulation/themes/<reponame>/`  |

## Notes

- Android themes (`themesAndroid`) are ignored.
- Per-theme failures are logged; the Job succeeds when at least one theme syncs.
- First full clone (or unshallow of prior shallow clones) can take a while and
  use multiple GB of share space.
