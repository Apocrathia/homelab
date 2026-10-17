# Vendored `tenzir-ocsf` skill

Byte-identical copy of the `tenzir-ocsf` schema skill from
[github.com/tenzir/skills](https://github.com/tenzir/skills) @
`a47ab4c6bd0518bf132be3751d95ae7e61468c29` (2026-10-16), Apache-2.0:
the OCSF (Open Cybersecurity Schema Framework) reference — classes,
objects, attributes, profiles, extensions, event normalization, versions
1.0.0 through 1.10.0-dev. Entry point: [`SKILL.md`](./SKILL.md).
Generated upstream — never hand-edit; re-copy on refresh, from this
directory:

```sh
git clone https://github.com/tenzir/skills "$TMP"
git -C "$TMP" checkout a47ab4c6bd0518bf132be3751d95ae7e61468c29  # or newer
rsync -a --delete --exclude README.md "$TMP/skills/tenzir-ocsf/" .
```

Shared provenance and the sibling skill:
[`README.md`](../README.md), [`tenzir`](../tenzir/README.md).
