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

`policies/` ships two policies, both loaded with
`spec.options: policy-mode: monitoring`:

- **secret-file-access** — reads/writes to credential paths
  (`/etc/shadow`, ssh keys, sudoers, pam.d, binary dirs).
- **container-escape-namespace-access** — `setns()` into foreign mount
  namespaces excluding runc; on Talos this only fires for privileged pods
  (RuntimeDefault seccomp blocks the rest pre-kernel), so signal-to-noise
  is high.

Enforce actions (Sigkill) are authored in the selectors already: graduating a
policy is a mode flip (edit `policy-mode` -> `enforcement`, or
`tetra tp set-mode <name> enforcement` at runtime), not a rewrite. Talos
caveat: the kernel has no `CONFIG_BPF_KPROBE_OVERRIDE`, so kprobe-based
Override enforcement is unavailable — LSM-hook policies are the enforcement
path. For policies that enforce, `enableKeepSensorsOnExit` keeps sensors
alive if the agent dies (persistent enforcement) — off for now.

## Follow-ups

- Egress-anomaly policy (tcp_connect outside cluster CIDRs) waits on the
  LAN CIDRs the operator wants treated as "internal"; with the current
  evidence it would be authored against
  pods `10.42.0.0/16` / services `10.69.0.0/16` + loopback.
- Base exec events (shells, sudo, SUID) need no policy — they ride the
  exec event stream; triage via Loki queries.
- Grafana dashboard for `tetragon_*` metrics once the baseline lands.
