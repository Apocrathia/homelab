# Tenzir

> **Navigation**: [← Observability](../README.md) | [SIEM plan](../../../../../docs/plans/siem-on-lgtm.md) | [Upstream docs](https://tenzir.com/docs/)

The SIEM plan document ships separately from this MR (the operator is deciding
whether it rides along); the link resolves once it lands on main.

Tenzir Node is the SIEM detection plane: it normalizes kube-apiserver audit
events to OCSF, runs Sigma rules on them, and delivers Detection Findings to
Discord. Loki stays the system of record; this node is the detection horizon
(hot storage plus a 14-day rolling window before export to rustfs).

- Namespace: `tenzir-system` (single standalone node, no Tenzir Platform)
- Chart: `oci://ghcr.io/tenzir/charts/tenzir-node` (see
  [`helmrelease.yaml`](./helmrelease.yaml))
- Collector feed: [`../kube-audit-tailer/`](../kube-audit-tailer/) ships
  kube-apiserver audit lines to Tenzir `accept_otlp` (4317/4318) and Loki
- Upstream: <https://github.com/tenzir/tenzir>

## Pipeline

```
kube-audit-tailer --otlp--> accept_otlp --> homelab::k8s::audit::parse --> publish k8s-audit.raw
                                                      |
        +---------------------------------------------+-------------------------------------+
        |                                                   |
  homelab::k8s::audit::ocsf::map                    sigma (SigmaHQ kubernetes/audit + own)
  ocsf_derive / ocsf_cast / import                  mapping="direct", hot-reload 30s
  publish ocsf.k8s-audit                           publish detections.sigma
        |                                                   |
  temporal compaction                       homelab::k8s::audit::findings::discord
  (14d -> to_s3 rustfs parquet)             to_http secret("discord-webhook-url")
```

## Content

| Path                              | Purpose                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/homelab/`               | TQL mapping package (`homelab`): OTLP parse, OCSF map, Discord embed formatting, with tests                                                           |
| `sigma/sigmahq/kubernetes-audit/` | Vendored subset of the 16 SigmaHQ `kubernetes/audit` rules, re-copied from the [`third-party/sigmahq`](../../../../../third-party/sigmahq/) submodule |
| `sigma/own/`                      | Homelab starter rules                                                                                                                                 |

Everything ships as ConfigMaps (`configMapGenerator` in
[`kustomization.yaml`](./kustomization.yaml)) and is mounted read-only into
the node. Sigma hot-reloads rule files; mapping-package changes additionally
need a pod restart (bounce the StatefulSet after editing TQL operators).

### Running the package tests

The tests run with the tenzir-test harness, which invokes a `tenzir` binary
resolved from `TENZIR_BINARY`, then `PATH`, then `uvx tenzir` (the latest
engine release — no local install needed). Pin the runner to the deployed
engine version and run from the repo root:

```sh
TENZIR_BINARY="uvx tenzir@6.18.1" \
  uvx tenzir-test --root ./flux/manifests/03-services/observability/tenzir/packages
```

`helmrelease.yaml` deploys `tenzir/tenzir:v6.18.1`; bump the runner pin when
the node image moves. The runner banner confirms the version on every run:
`1× tenzir (v6.18.1)`.

## Secrets

1Password item `tenzir-secrets` (`vaults/Secrets/items/tenzir-secrets`)
renders the `tenzir-secrets` Secret with:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — rustfs bucket-scoped user
  for the `tenzir` bucket (see
  [rustfs bucket/user creation](../../../../../docs/infrastructure/rustfs-bucket-user-creation.md);
  bucket + user creation is an operator step)
- `DISCORD_WEBHOOK_URL` — webhook bound to the Discord security channel
  (channel `1558191196482830488`)

## Storage lifecycle

- PVC: 8Gi, Longhorn default class; disk budget 7GiB high / 6GiB low
  (oldest data is erased at the ceiling)
- After 14 days (event time), `plugins.compaction.time` exports
  `ocsf.api_activity` events as parquet to
  `s3://tenzir/ocsf/{uuid}.parquet` on rustfs and consumes the originals
  (`tenzir-ctl compaction list` shows the rule; `tenzir-ctl compaction run
k8s-audit-archive` forces a cycle for testing)

## Known limitations

- The chart schema requires `nodes[].token`; the standalone node uses an
  empty `TENZIR_TOKEN` (`node-token.yaml`) — a node with no token never
  connects to the platform
- Audit events are detected on the raw schema (SigmaHQ `kubernetes/audit`
  rules name raw audit fields and are not in the OCSF projection catalog);
  OCSF mapping runs in parallel for storage and investigation
- No per-source provenance beyond the audit pipeline: `receiver.peer_ip` is
  dropped after parse; the Loki pivot is labels + timestamp + auditID

## Troubleshooting

```sh
kubectl exec -n tenzir-system statefulset/tenzir-node-default -- tenzir api "/ping"
kubectl logs -n tenzir-system tenzir-node-default-0 | grep -i error
# pipeline status and errors
kubectl exec -n tenzir-system tenzir-node-default-0 -- tenzir api pipeline list
```
