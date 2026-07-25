---
title: "Harden Agent Substrate RustFS credentials"
kind: feature
status: open
severity: medium
source: agent
found_at: 2026-07-24
found_by: auto
area: security
slice: hitl
plan: docs/plans/agent-substrate-rollout.md
---

# Harden Agent Substrate RustFS credentials

## Problem / desired state

The substrate Helm chart defaults RustFS to inline `accessKey` / `secretKey`
values in chart values. That is fine for a short smoke of Agent Substrate, but
not for a durable install.

Desired state: RustFS (or an external S3 backend) uses credentials from a
1Password Item CR — never inline chart values, never a bare managed Secret in
git.

## Acceptance

- Substrate object store credentials come from a 1Password Item CR (or external
  S3 with the same pattern).
- No admin access/secret key appears as plaintext in `helmrelease.yaml` values.
- Snapshot create/restore still works for a WorkerPool actor after the change.

## Feedback loop

- `kustomize build flux/manifests/04-apps/artificial-intelligence/substrate`
- Trivy / secret scan on changed manifests
- Flux HelmRelease `substrate` Ready; atelet + rustfs pods Running
- Create a sandbox actor snapshot and confirm it lands in the configured bucket

## Implementation hint

Follow the plan's Phase 1 install; swap RustFS (or set `rustfs.enabled=false` +
external S3 via `atelet` overrides) after the Talos smoke proves the data plane.
See `flux/manifests/04-apps/artificial-intelligence/substrate/helmrelease.yaml`.

## Notes

Deferred from the initial substrate rollout deliberately (smoke-first).
