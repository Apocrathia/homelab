---
title: "CNPG backup manifests: extract shared kustomize component"
kind: architecture
status: open
severity: low
source: human
found_at: 2026-10-10
area: storage
---

# CNPG backup manifests: extract shared kustomize component

## Problem / desired state

Two patterns exist for CNPG backup wiring:

1. Hand-written per-app `scheduled-backup.yaml` + `backup-secret.yaml` +
   kustomization registration — the authentik precedent, now replicated
   across 9 more app dirs by MR !5139 (~18 near-identical files).
2. The `generic-app` chart `postgres.backup.enabled` toggle.

No `kind: Kustomize Component` exists anywhere in the repo. The hand-written
pattern is the operator-flagged ugly one; it will keep duplicating with every
new non-generic-app Postgres cluster.

## Acceptance

- A shared kustomize component (`flux/manifests/components/cnpg-backup` or
  similar), parameterized per cluster (name, namespace), renders
  `ScheduledBackup` + `OnePasswordItem` backup-secret — and, if practical,
  patches `spec.backup` onto the Cluster CR via replacements.
- Each direct-CR app dir's backup wiring reduces to a few kustomization lines.
- Authentik migrates onto the component.
- `kustomize build` + `helm template` + `yamllint` green on all affected dirs.
- Live backup behavior unchanged — the next 05:00 UTC wave still completes.

## Feedback loop

- `kustomize build <affected app dirs>`
- `helm template` on affected `generic-app` HelmReleases
- `yamllint` on changed YAML
- Read-only Flux / Kustomization status checks (mutate needs operator ask)

## Implementation hint

kustomize v5 components + replacements (target the CNPG `Cluster` by name for
the `spec.backup` patch). CNPG requires the barman destination on the Cluster
CR itself, so a lone ScheduledBackup file cannot work — the component must
deliver both halves.

## Notes

Long-term endgame (operator aware, separate lap): migrate the 9 raw-CR
databases into `generic-app` postgres blocks so all Postgres backup wiring
goes through the chart toggle.

Reference: MR !5139 (pattern source), lap log
`.scratch/cluster-triage-2026-10-09/STATE.md`.
