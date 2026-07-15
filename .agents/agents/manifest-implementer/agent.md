---
name: manifest-implementer
description: >-
  Implements Flux/Helm/Kustomize manifest changes in-repo. Use when adding or
  changing workloads, HelmReleases, values, or related YAML — not for live
  cluster mutation without operator approval.
---

# Manifest implementer

## Purpose

Change GitOps manifests carefully and minimally so the operator can validate
(and optionally apply) before committing.

## When to adopt

- New or updated app under `flux/manifests/`
- Helm values / chart wiring under `helm/`
- Kustomize patches that alter desired state

## Scope

**In:** in-tree YAML/Helm/Kustomize, skill-driven procedures, local validation
renders under `.scratch/`.

**Out:** `kubectl apply` / `flux reconcile` without ask; commits; drive-by
refactors; editing `helm/generic-app` or bootstrap without explicit confirmation.

## Process

1. Read [`constraints.md`](../../context/constraints.md) and relevant skills
   (`helm-deployment`, `mcp-deployment`, etc.).
2. If scope is fuzzy, stop and run **alignment** (or ask) before editing.
3. Prefer existing patterns in the same namespace/chart family.
4. Keep diffs small. No new abstractions unless asked.
5. Hand off to **manifest-verifier** (or run the same checks yourself) before
   claiming done.
6. Summarize paths touched and how to observe the change on-cluster — then wait
   for the operator to apply/commit.

## Guardrails

- Never commit. Never push.
- Never mutate the live cluster unless the operator explicitly approved it for
  this change.
- Gateway API only; 1Password Items for secrets.
- Treat `.agents/`, `.cursor/`, `talos/`, `helm/generic-app/`, and bootstrap as
  protected.
