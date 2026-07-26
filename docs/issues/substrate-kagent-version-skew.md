---
title: "Substrate 0.0.10 is unusable by any released kagent"
kind: bug
status: blocked
severity: high
source: agent
found_at: 2026-07-25
found_by: agent-substrate-rollout
area: agents
slice: hitl
---

# Substrate 0.0.10 is unusable by any released kagent

## Problem / desired state

Substrate chart `0.0.10` cannot be driven by any released kagent. Two independent
defects, both upstream:

| #   | Defect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Client/server proto skew.** kagent `0.9.12` vendors the substrate client at `v0.0.6` (`go/go.mod` replace directive); even kagent `0.10.0-beta10` only pins `v0.0.9`. Calls against the `0.0.10` server fail to unmarshal.                                                                                                                                                                                                                                                                                  | `rpc error: code = Internal desc = grpc: error unmarshalling request: proto: cannot parse invalid wire-format data`                |
| 2   | **JWT issuer discovery is anonymous for custom issuers.** Substrate ≥ `0.0.7` only attaches the pod ServiceAccount token when the issuer host is `kubernetes.default.svc` (`isInClusterKubernetesIssuer` in `cmd/ateapi/main.go`). Talos issues tokens as `https://kubernetes.apocrathia.com:6443` and runs the API server with anonymous auth disabled, so the OIDC discovery fetch is rejected at authentication — before RBAC. The existing `oidc-discovery-viewer` ClusterRoleBinding is never consulted. | `rpc error: code = Unauthenticated desc = invalid bearer token: while fetching OIDC Discovery document: non-200 response code 401` |

On `0.0.10`, an `SSL_CERT_FILE` postRenderer pointing at the mounted SA CA fixes
the TLS layer of defect 2 (system roots do not trust the Talos CA) but cannot
fix the missing bearer token. Substrate `0.0.6` used `rest.InClusterConfig()`
(SA token attached) and worked; that behavior changed in `0.0.7`.

Desired state: a kagent release that pins substrate ≥ the candidate chart
version, and JWT auth that works with a custom Kubernetes issuer on Talos.

## Current mitigation

`HelmRelease/substrate` and `HelmRelease/substrate-crds` are pinned to chart
`0.0.6` / `image.tag v0.0.6` (paired with kagent `0.9.12`). Close Renovate MRs
that bump substrate until this issue's acceptance criteria pass — do not merge
a version bump without re-checking the feedback loop below.

## Repro

1. Deploy substrate chart `0.0.10` with kagent `0.9.12` on a cluster whose
   ServiceAccount issuer is not `kubernetes.default.svc`.
2. Apply any `AgentHarness` or `SandboxAgent`.
3. kagent controller logs show the two errors above; the agent never reports
   Ready. Deletion also hangs — the cleanup finalizers need working API calls
   (clear finalizers manually to unstick).

## Acceptance

- Deployed kagent pins a substrate client version ≥ the candidate substrate
  chart version (check the `replace github.com/agent-substrate/substrate` line
  in kagent's `go/go.mod` for the release tag).
- `ate-api-server` verifies kagent's JWTs against the Talos issuer without
  anonymous API-server access (upstream fix, or a supported flag).
- `AgentHarness/openclaw` and `SandboxAgent/hello-substrate` report Ready and
  fresh snapshot objects land in the `ate-snapshots` bucket on `ate-cache`.

## Feedback loop

Run before merging any substrate Renovate bump:

```bash
# Version pairing for a candidate kagent tag
curl -s https://raw.githubusercontent.com/kagent-dev/kagent/<tag>/go/go.mod | grep substrate

kubectl get agentharness,sandboxagent -A
kubectl logs -n kagent deploy/kagent-controller --tail=50 | grep -iE 'unauthenticated|wire-format'
kubectl exec -n ate-system deploy/ate-cache -c ate-cache -- sh -c 'ls /data/ate-snapshots'
```

If defect 2 still applies (≥ `0.0.7` + custom issuer), re-add the
`SSL_CERT_FILE` postRenderer on `ate-api-server` (path:
`/var/run/secrets/kubernetes.io/serviceaccount/ca.crt`) — necessary for TLS,
not sufficient for the missing SA token.

## Implementation hint

Watch kagent releases for a substrate pin bump (Renovate proposes both charts).
When pairing lands, defect 2 still needs one of: upstream support for custom
in-cluster issuers (token attach or TokenReview), or enabling anonymous auth on
the Talos API server plus a `system:service-account-issuer-discovery` binding
to `system:unauthenticated` — a Talos (`talos/**`, protected path) and security
decision for the operator.

## Notes

- The bundled-RustFS upgrade deadlock and credential hardening that previously
  blocked this stack are resolved: snapshots live on `HelmRelease/ate-cache`
  with credentials from `OnePasswordItem/agent-substrate-secrets` (see git
  history for `substrate-0-0-10-rollout-failure.md` and
  `substrate-rustfs-credentials.md`).
- Rollout plan context: `docs/plans/substrate-dedicated-rustfs.md`,
  `docs/plans/agent-substrate-rollout.md` (documents the original
  `0.0.6 ↔ kagent 0.9.12` pairing rationale).
