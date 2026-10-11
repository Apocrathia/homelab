# Tetragon

[eBPF-based runtime security](https://tetragon.io/) from the Cilium project:
kprobe/LSM-hooked process, file, and socket visibility straight off the
kernel, plus per-policy enforcement. Chosen over Falco for this cluster
because it is native to the existing Cilium stack and Talos ships everything
it needs (BTF, BPF LSM) with no kernel-module story at all.

> **Navigation**: [← Back to Services README](../README.md)

## What runs here

- `helmrelease.yaml`: chart `tetragon` (1.7.1) from the existing `cilium`
  HelmRepository. Agent DaemonSet on every node (hostNetwork + privileged by
  chart design, mounts host `/proc`, no hostPID), operator with 1 replica.
  TracingPolicy CRDs are created by the tetragon-operator
  (`crds.installMethod: operator`) AFTER the HelmRelease runs, so the
  TracingPolicies apply through a child Flux Kustomization gated on
  services-tetragon (policies/flux-kustomization.yaml) — the chaos-mesh
  experiments pattern.
- Talos-specific values: the `/sys/kernel/tracing` hostPath mount (official
  Talos note) and a trimmed export denylist — the chart default mutes host,
  cilium, and kube-system events, which on Talos hides the host-side signal.
- `policies/`: detection-only TracingPolicies (see below).

## Event and alert flow

- Export: JSON events -> `export-stdout` sidecar -> pod logs. Alloy ships
  agent logs to Loki like any other pod (no sidecar config needed here).
- Alerting: Grafana alert rules over Loki LogQL (per policy name, e.g.
  `process_kprobe{policy_name="secret-file-access"}`) or over the
  `tetragon_policy_events_total` metric -> existing notification policy ->
  the alert-agent-invoke bridge (agent triage before operator noise).
- Metrics: agent `:2112`, operator `:2113`, ServiceMonitors from the chart;
  kube-prometheus-stack scrapes them (its selectors are namespace-wide).

## Policies and the enforcement graduation

`policies/` ships three policies. secret-file-access and
container-escape-namespace-access are loaded with
`spec.options: policy-mode: monitor` (valid modes: `monitor` | `enforce`):

- **secret-file-access** — reads/writes to credential paths
  (`/etc/shadow`, ssh keys, sudoers, pam.d, binary dirs).
- **container-escape-namespace-access** — `setns()` into foreign mount
  namespaces excluding runc; on Talos this only fires for privileged pods
  (RuntimeDefault seccomp blocks the rest pre-kernel), so signal-to-noise
  is high.

Enforce actions (Sigkill) are authored in the selectors already: graduating a
policy is a mode flip (edit `policy-mode` -> `enforce`, or
`tetra tp set-mode <name> enforce` at runtime), not a rewrite. Talos
caveat: the kernel has no `CONFIG_BPF_KPROBE_OVERRIDE`, so kprobe-based
Override enforcement is unavailable — LSM-hook policies are the enforcement
path. For policies that enforce, `enableKeepSensorsOnExit` keeps sensors
alive if the agent dies (persistent enforcement) — off for now.

## Follow-ups

- Egress policy (`policies/egress.yaml`, upstream
  monitor-network-activity-outside-cluster-cidr-range): shipped against pods
  `10.42.0.0/16` / services `10.69.0.0/16` + loopback. The LAN CIDRs the
  operator wants treated as "internal" are still a follow-up — adding them is
  a values-only edit to the matchArgs list.
- Base exec events (shells, sudo, SUID) need no policy — they ride the
  exec event stream; triage via Loki queries.
- Grafana dashboard for `tetragon_*` metrics once the baseline lands.

## SIEM (lap C)

- `policies/egress.yaml` adds the upstream tcp_connect visibility policy
  (see above) — its `sock`-arg kprobe events map to OCSF Network Activity.
- The tetragon→OCSF mapping package (Process Activity 1007 / File System
  Activity 1001 / Network Activity 4001 per the live schema) lives under the
  Tenzir node's homelab package
  ([`../observability/tenzir/packages/homelab/operators/tetragon/`](../observability/tenzir/packages/homelab/operators/tetragon/))
  with tests.
- Transport to the Tenzir node: the
  [`tetragon-tailer`](../observability/tetragon-tailer/) DaemonSet tails the
  agents' export files and pushes OTLP/HTTP to the node's `accept_otlp`
  listener. tetragon v1.7.x has no native TCP export (`--export-connection`
  does not exist), and the export file is 0600 root-owned — hence the
  dedicated root tailer in the kube-audit-tailer pattern. The pod-logs leg
  to Loki via the `export-stdout` sidecar is unchanged.
