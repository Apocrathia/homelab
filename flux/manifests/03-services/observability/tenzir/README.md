# Tenzir

> **Navigation**: [← Observability](../README.md) | [SIEM plan](../../../../../docs/plans/siem-on-lgtm.md) | [Upstream docs](https://tenzir.com/docs/)

The SIEM plan document ships separately from this MR (the operator is deciding
whether it rides along); the link resolves once it lands on main.

Tenzir Node is the SIEM detection plane: it normalizes kube-apiserver audit,
tetragon, authentik, fleet, trivy, and NetFlow data to OCSF, runs Sigma
rules on the audit stream, and delivers Detection Findings to Discord. Loki
stays the system of record; this node is the detection horizon (hot storage
plus a 14-day rolling window before export to rustfs).

- Namespace: `tenzir-system` (single standalone node, no Tenzir Platform)
- Chart: `oci://ghcr.io/tenzir/charts/tenzir-node` (see
  [`helmrelease.yaml`](./helmrelease.yaml))
- Collector feeds: [`../kube-audit-tailer/`](../kube-audit-tailer/) and
  [`../tetragon-tailer/`](../tetragon-tailer/) push OTLP/HTTP to the
  `accept_otlp` listeners (4317/4318); the fleet result webhook and the
  [trivy-report-reader](../../trivy/) POST to the `http-ingest` listener
  (8080); UniFi exporters send NetFlow to the `netflow` port (2055/UDP)
  behind [`tenzir-ingest-lb`](./service-ingest.yaml) on the shared ingest
  pool IP
- Upstream: <https://github.com/tenzir/tenzir>

## Pipeline

```
kube-audit-tailer --otlp--> accept_otlp (4317/4318) --+--> homelab::k8s::audit::parse --> k8s-audit.raw
tetragon-tailer   --otlp--> accept_otlp (4317/4318) --+--> homelab::tetragon::parse   --> tetragon.raw
fleet result webhook --http--> accept_http (8080) ---+--> homelab::fleet::parse       --> fleet.raw
trivy-report-reader  --http--> accept_http (8080) ---+--> report files                --> trivy.raw
authentik events API <---- from_http (cron 5m, Bearer) ------------------------------> authentik.raw
uniFi exporters -----udp:2055--> accept_udp + read_netflow --------------------------> netflow
                                                                                  |
        +-----------------------------------------+------------------------------+---------------------+
        |                                         |                              |                     |
  homelab::*::ocsf::map (per source)        sigma (k8s-audit only)          fork { import }        fork { import }
  ocsf_derive / ocsf_cast                   mapping="direct", hot-reload     publish ocsf.*         publish "netflow"
  fork { import } / publish ocsf.*           publish detections.sigma
        |                                         |
  temporal compaction                       homelab::k8s::audit::findings::discord
  (k8s-audit 14d -> to_s3 rustfs parquet)   to_http secret("discord-webhook-url")
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
`1× tenzir (v6.18.1)`. All baselines must stay warning-free — `ocsf_cast`
schema warnings are the mapping's "not done" signal.

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
- NetFlow volume baseline (goflow2 handoff): two active UniFi exporters
  (~1.8 kB/s combined when measured at the 2026-10-10 swap) — negligible
  against the budget; re-baseline if exporters change
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
- NetFlow, authentik, fleet, trivy, and tetragon OCSF events have no sigma
  detections yet and no compaction rule — only `ocsf.api_activity` exports
  to rustfs; the disk budget (7 GiB high) is the backstop
- Fleet rows map to the OCSF Base Event: a row's meaning comes from its
  query, and no scheduled query existed at mapping time — grow
  [`fleet/ocsf/map.tql`](./packages/homelab/operators/fleet/ocsf/map.tql)
  into a per-query dispatch as queries land
- The trivy-report-reader only watches `vulnerability_reports/` and
  `secret_reports/` (the two report kinds with a named OCSF class);
  config-audit/rbac/infra/compliance/SBOM files stay on the PVC (Loki
  keeps the webhook copies)

## Troubleshooting

```sh
kubectl exec -n tenzir-system tenzir-node-default-0 -- \
  tenzir -e localhost:5158 \
  'metrics "pipeline" | summarize ingress_events=sum(ingress.events), pipeline_id'
kubectl logs -n tenzir-system tenzir-node-default-0 | grep -i error
# recent stored events
kubectl exec -n tenzir-system tenzir-node-default-0 -- \
  tenzir -e localhost:5158 \
  'export | head 5'
```
