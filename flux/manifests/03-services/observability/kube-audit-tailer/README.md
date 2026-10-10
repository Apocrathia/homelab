# kube-audit-tailer

> **Navigation**: [← Observability](../README.md) | [Tenzir](../tenzir/)

Dedicated Grafana Alloy DaemonSet that tails
`/var/log/kube-apiserver/audit.log` on every control plane and dual-writes
each line to Loki and to the Tenzir detection node (`accept_otlp` 4318).

## Why it is not part of the shared Alloy

kube-apiserver creates the audit log with mode `0600` inside a `0700`
directory (upstream `pkg/server/options/audit.go`), so only root can read
it. The shared Alloy DaemonSet runs as UID 10001. This DaemonSet runs as
root with a read-only hostPath mount, all capabilities dropped, no
privilege escalation, and no Service, ports, or cluster access — the
smallest root surface that can read the file.

## Configuration

- Chart: `grafana/alloy` (same chart as the shared collector, service
  disabled)
- River config: [`configmap.yaml`](./configmap.yaml)
  - Loki leg: `loki.source.file` -> `loki.write` (labels:
    `source="kube-audit"`, `component="kube-apiserver-audit"`,
    `node="<K8S_NODE_NAME>"`)
  - Tenzir leg: `otelcol.receiver.filelog` (public-preview) ->
    `otelcol.exporter.otlphttp` at
    `tenzir-node-default.tenzir-system.svc:4318`
- Both legs start at end-of-file: the pre-existing node-local backlog is
  not re-shipped on first deploy
- Node identity rides in both legs: `node` Loki label and
  `k8s.node.name` resource attribute (`sys.env("K8S_NODE_NAME")` + the
  chart's downward-API env var), so finding pivots
  (`{source="kube-audit",node="..."}` + timestamp + auditID) select the
  exact raw Loki line

## Talos audit policy

The audit log only becomes useful after
[`talos/patches/unified-patch.yaml`](../../../../../talos/patches/unified-patch.yaml)
sets `cluster.apiServer.auditPolicy` (Request level for exec/attach/
port-forward/proxy, Metadata otherwise). Applying the machine config is an
operator step.

## Chart exposure minimization

- `serviceAccount.automountServiceAccountToken: false` — the SA is zero-RBAC
  (`rbac.create: false`) and no token is ever mounted into the pod
- `alloy.enableHttpServerPort: false` — the chart drops the containerPort and
  the readiness probe; the config-reloader still reloads via the pod-local
  loopback listener (`--server.http.listen-addr=127.0.0.1:12345`)

## Troubleshooting

```sh
kubectl -n kube-audit-tailer-system get pods -o wide
kubectl -n kube-audit-tailer-system logs daemonset/kube-audit-tailer-alloy -c alloy | grep -i error
```
