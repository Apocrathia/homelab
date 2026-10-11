# tetragon-tailer

> **Navigation**: [← Observability](../README.md) | [Tenzir](../tenzir/) | [Tetragon](../../tetragon/)

Dedicated Grafana Alloy DaemonSet that tails the tetragon agents' JSON
export files (`/var/run/cilium/tetragon/tetragon.log` on every node) and
pushes them as OTLP/HTTP logs to the Tenzir detection node
(`accept_otlp` 4318).

## Why it is not part of the shared Alloy

- tetragon v1.7.x has no TCP export: `--export-connection` does not exist
  (the agent's only sinks are the rotating export file and the pod-local
  `export-stdout` sidecar), so the chart offers no native push path
- The export file is written `0600` root-owned on the host — out of reach
  of the shared Alloy DaemonSet (uid 10001)
- This tailer runs as root with a read-only hostPath mount, all
  capabilities dropped, no privilege escalation, and no Service, ports, or
  cluster access — the same root surface the
  [`kube-audit-tailer`](../kube-audit-tailer/) carries for the apiserver
  audit log

## Configuration

- Chart: `grafana/alloy` (service disabled)
- River config: [`configmap.yaml`](./configmap.yaml) —
  `otelcol.receiver.filelog` (public-preview) tails `tetragon.log` plus the
  lumberjack-rotated `tetragon-*.log`, stamps
  `service.name=tetragon-export` and `k8s.node.name`, and exports to
  `otelcol.exporter.otlphttp` at `tenzir-node-default.tenzir-system.svc:4318`
- No Loki leg: the tetragon pods' `export-stdout` sidecar already ships the
  same events to Loki as pod logs (`{namespace="tetragon"}`); a second Loki
  writer would duplicate the stream. Pivots use the node_name plus exec_id
  carried inside each event.
- Both legs start at end-of-file: the pre-existing node-local backlog is
  already in Loki and is not re-shipped
- No nodeSelector: tetragon agents export on every node

## Tenzir side

The tenzir pipelines filter this stream on
`resource.attributes["service.name"] == "tetragon-export"`
([`homelab::tetragon::parse`](../tenzir/packages/homelab/operators/tetragon/parse.tql))
and map it to OCSF (Process / File / Network Activity) — see the
[Tenzir README](../tenzir/).

## Troubleshooting

```sh
kubectl -n tetragon-tailer-system get pods -o wide
kubectl -n tetragon-tailer-system logs daemonset/tetragon-tailer-alloy -c alloy | grep -i error
```
