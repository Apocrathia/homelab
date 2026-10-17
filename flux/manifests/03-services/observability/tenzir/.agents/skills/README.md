# Vendored tenzir skills

Two documentation skills vendored from
[github.com/tenzir/skills](https://github.com/tenzir/skills) @
`a47ab4c6bd0518bf132be3751d95ae7e61468c29` (2026-10-16), Apache-2.0.
Both are generated upstream (synced from tenzir.com docs): never
hand-edit; re-copy on refresh.

| Skill                                     | Covers                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`tenzir/`](./tenzir/README.md)           | Tenzir product docs — TQL syntax, operators, functions, integrations, deployment          |
| [`tenzir-ocsf/`](./tenzir-ocsf/README.md) | OCSF schema reference — classes, objects, attributes, profiles, extensions, normalization |

## Refresh

From this directory: re-clone upstream, check out the pinned commit (or
newer), and copy both trees over; `--exclude README.md` keeps the
hand-written folder READMEs.

```sh
git clone https://github.com/tenzir/skills /tmp/tenzir-skills
git -C /tmp/tenzir-skills checkout a47ab4c6bd0518bf132be3751d95ae7e61468c29  # or newer
rsync -a --delete --exclude README.md /tmp/tenzir-skills/skills/tenzir/    tenzir/
rsync -a --delete --exclude README.md /tmp/tenzir-skills/skills/tenzir-ocsf/ tenzir-ocsf/
```
