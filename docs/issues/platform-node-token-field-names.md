---
title: "Rename platform node-token fields to <role>-node-token"
kind: feature
status: open
severity: low
source: human
found_at: 2026-10-17
found_by: operator
---

# Rename platform node-token fields to <role>-node-token

## Problem / desired state

The `tenzir-secrets` 1Password item labels the Tenzir Platform node
tokens `core-token`, `tetragon-token`, `netflow-token`. This is a
naming-ergonomics gap, not a security one: the label should say what the
value is for at a glance, and during the netflow-node deploy (2026-10-17)
it didn't — the operator first read `netflow-token` as a possible
UniFi/exporter token. They are per-node platform registration tokens
(`tnz_...`, app.tenzir.com workspace), nothing to do with feed sources.

Desired state: fields renamed to `<role>-node-token`
(`core-node-token`, `tetragon-node-token`, `netflow-node-token`) so the
kind is self-describing.

## Acceptance

- All three field labels renamed on the `tenzir-secrets` vault item
  (values unchanged — same tokens, per-node, never regenerated for a
  rename)
- The investigations node (in flight 2026-10-17) adds a fourth,
  `investigations-token`, in the current sibling shape — the rename sweep
  covers it too
- `nodes/*/helmrelease.yaml` `nodes[].token.key` values updated to match
- `secret.yaml` field-comment list updated
- Node README "Adding a node" convention line updated
  (`nodes/{core,tetragon,netflow}/README.md`)
- kustomize render clean; pods roll and re-register (rename = new Secret
  key; rollout is rolling per-node)

## Feedback loop

- kustomize build flux/manifests/04-apps/security/tenzir
- Flux MCP read: HelmRelease/pod status per node after apply
- grep: no `<role>-token` (old shape) refs left in the tenzir subtree
  (investigations-token included once it lands)

## Implementation hint

Single small lap: rename fields in 1Password, then the manifest/comment
sweep. Nothing consumes the field names outside the tenzir subtree
(verified 2026-10-17: `netflow-token` appears only in secret.yaml
comments, the three node helmreleases' token.key, and node READMEs).

## Notes

Operator deferred: filed 2026-10-17, "not right now". Do the rename
during the next tenzir-touching lap that has spare review budget.
