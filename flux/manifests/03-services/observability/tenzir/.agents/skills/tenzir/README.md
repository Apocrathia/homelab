# Vendored `tenzir` skill

Byte-identical copy of the `tenzir` documentation skill from
[github.com/tenzir/skills](https://github.com/tenzir/skills) @
`a47ab4c6bd0518bf132be3751d95ae7e61468c29` (2026-10-16), Apache-2.0:
the Tenzir product docs — TQL syntax, operators, functions, parsing,
normalization, integrations, deployment. Entry point:
[`SKILL.md`](./SKILL.md). Generated upstream (synced from tenzir.com) —
never hand-edit; re-copy on refresh, from this directory:

```sh
git clone https://github.com/tenzir/skills "$TMP"
git -C "$TMP" checkout a47ab4c6bd0518bf132be3751d95ae7e61468c29  # or newer
rsync -a --delete --exclude README.md "$TMP/skills/tenzir/" .
```

Shared provenance and the sibling skill:
[`README.md`](../README.md), [`tenzir-ocsf`](../tenzir-ocsf/README.md).
