# Vendored gcx skills

The 24 skills under this directory are byte-identical copies from
[github.com/grafana/gcx](https://github.com/grafana/gcx), vendored so Grafana
agent context travels with the deployment. The one exception is
[`grafana-homelab/`](./grafana-homelab/SKILL.md) — hand-authored homelab
state, not upstream content.

## Provenance

- Upstream: `claude-plugin/skills/` in github.com/grafana/gcx
- Version: **v1.6.0** — commit `9a29e9e0b95733f7a97b2988374b5708b2ce6e2d`
  (the SHA the installed gcx 1.6.0 binary reports; skills match the binary)
- Vendored: 2026-10-17, 45 files across 24 skills

Byte-identity is protected: these files are excluded from prettier,
`end-of-file-fixer`, and `trailing-whitespace` (see repo
`.prettierignore` and `.pre-commit-config.yaml`) — upstream bytes win over
formatting. `detect-private-key` and gitleaks still scan every file.

## Refresh on gcx upgrade

```sh
git clone --depth 1 --branch vX.Y.Z https://github.com/grafana/gcx
git archive vX.Y.Z^{commit} -- claude-plugin/skills | tar -x -C /tmp/gcx-extract
cp -R /tmp/gcx-extract/claude-plugin/skills/. flux/manifests/03-services/observability/grafana/.agents/skills/
```

Then update the commit SHA in this README and verify byte-identity against the
tag tree (`git ls-tree -r vX.Y.Z -- claude-plugin/skills` vs
`git hash-object` on each copy). Machine-wide installs on other hosts use
gcx's own bundle manager: `gcx agent skills install --all` (independent of
this vendored tree) or read any skill live with `gcx agent skills get <name>`.
