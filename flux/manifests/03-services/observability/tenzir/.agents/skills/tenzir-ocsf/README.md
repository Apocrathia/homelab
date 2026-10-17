# Vendored `tenzir-ocsf` skill (subset)

Pruned copy of the `tenzir-ocsf` schema skill from
[github.com/tenzir/skills](https://github.com/tenzir/skills) @
`a47ab4c6bd0518bf132be3751d95ae7e61468c29` (2026-10-16), Apache-2.0:
the OCSF (Open Cybersecurity Schema Framework) reference — classes,
objects, attributes, profiles, extensions, event normalization. Entry
point: [`SKILL.md`](./SKILL.md).

**Subset vendoring.** Upstream ships every OCSF version: 1.0.0 through
1.8.0, 1.9.0, 1.10.0-dev, plus the version-neutral introduction, FAQs,
and articles. This copy keeps only the version-neutral content and the
latest stable version — [1.9.0](v1.9.0.md), the OCSF default of the
tenzir engine. Retained files stay byte-identical to upstream at the
pinned commit: the prune deletes files, it never edits them.

**Dead-end links.** `SKILL.md` still lists every upstream version; its
links to the pruned pages (`v1.0.0.md` … `v1.8.0.md`,
`v1.10.0-dev.md`) dead-end in this copy. Agents route to the latest
stable by default, so this only bites an explicit request for a missing
version.

Generated upstream — never hand-edit. Refresh from this directory:
re-copy from upstream, then re-apply the prune.

```sh
git clone https://github.com/tenzir/skills "$TMP"
git -C "$TMP" checkout a47ab4c6bd0518bf132be3751d95ae7e61468c29  # or newer
rsync -a --delete --exclude README.md "$TMP/skills/tenzir-ocsf/" .
# Re-apply the prune: git rm every version directory and version page
# except the latest stable (today v1.9.0/, v1.9.0.md).
```

When the tenzir engine's OCSF default moves to a new version, refresh
and re-prune, keeping the new latest stable in place of 1.9.0.

Shared provenance and the sibling skill:
[`README.md`](../README.md), [`tenzir`](../tenzir/README.md).
