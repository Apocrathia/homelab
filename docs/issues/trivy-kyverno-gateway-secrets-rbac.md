---
title: "Review CRITICAL AVD-KSV-0041 on Kyverno and gateway RBAC"
kind: bug
status: open
severity: high
source: agent
found_at: 2026-07-24
found_by: launch-3-trivy-ledger
area: security
slice: hitl
---

# Review CRITICAL AVD-KSV-0041 on Kyverno and gateway RBAC

## Problem / desired state

Trivy batch `7c5f1d25-bff3-4a6f-8eb6-651a069002a5` flagged CRITICAL
misconfig AVD-KSV-0041 ("Manage secrets") on operator-owned RBAC manifests
outside bootstrap:

- `flux/manifests/03-services/kyverno/cleanup-rbac.yaml`
- `flux/manifests/03-services/kyverno/generate-rbac.yaml`
- `flux/manifests/03-services/gateway/rbac.yaml`

Desired state: either secrets verbs are narrowed/removed where Kyverno or
gateway do not need them, or the grant is documented as intentional with a
Trivy ignore / policy exception scoped to those files (and why).

## Repro

1. Trivy filesystem misconfig scan, min severity HIGH, on the three paths.
2. Confirm AVD-KSV-0041 on ClusterRole (or equivalent) secrets rules.

## Acceptance

- For each of the three files: either RBAC no longer triggers AVD-KSV-0041, or
  an in-repo ignore/exception records the justified secrets access.

## Feedback loop

- Trivy misconfig scan on:
  - `flux/manifests/03-services/kyverno/cleanup-rbac.yaml`
  - `flux/manifests/03-services/kyverno/generate-rbac.yaml`
  - `flux/manifests/03-services/gateway/rbac.yaml`
- `yamllint` on any edited RBAC YAML.
- Read-only: confirm Kyverno cleanup/generate and gateway controllers still
  function after any RBAC narrow (operator-led cluster check).

## Implementation hint

Read each Role/ClusterRole: drop `secrets` from `resources` only if the
controller does not create/patch/get secrets. Gateway TLS secret reads and
Kyverno generate/cleanup of secrets are common legitimate cases — prefer
documented exception over blind removal.

## Notes

- Source batch: `7c5f1d25-bff3-4a6f-8eb6-651a069002a5`.
