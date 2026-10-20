# Tenzir traps

Known gotchas in this subtree, mined from the node, detection, and package
docs — nothing invented. Vendored debugging docs:
[troubleshooting guides](../skills/tenzir/guides/troubleshooting/).

- **Engine-version test pinning.** The tenzir-test runner must match the
  deployed engine version (currently `uvx tenzir@6.19.1`); the runner
  banner confirms the pin on every run, and all baselines must stay
  warning-free.
  ([tests](../../packages/homelab/tests/README.md),
  [app README](../../README.md))
- **Sigma skip warnings are expected.** One per rule revision from the
  parked SigmaHQ corpus; they name rules the bus cannot resolve. They are
  a parked-corpus property, not a fault. The `tenzir.metrics.sigma`
  events size the rule-evaluation load.
  ([core node](../../nodes/core/README.md))
- **Tetragon noise is a baseline, not detections.** The
  secret-file-access kprobe stream is mostly operational PAM noise
  (opencti-redis healthcheck loop, firecrawl wrappers). Threshold or
  triage work on these classes starts from the measured residual
  baseline, not from zero.
  ([tetragon node](../../nodes/tetragon/README.md))
- **Parallelism emits out of order.** Pipeline parallel instances emit in
  arbitrary order — harmless while pipelines stay per-event; drop the
  directive (or scope it) for windowed or sequence detections.
  ([tetragon node](../../nodes/tetragon/README.md))
- **Raw tetragon re-storage is a cost trap.** Re-storing raw tetragon
  events duplicated process objects at ~4.8 KB per event; the unmapped
  residue on mapped events is a selected projection by design, not an
  accident to fix. ([tetragon node](../../nodes/tetragon/README.md))
- **Release-name concat trap.** The chart renders every node resource as
  `<fullname>-<entry.name>`; never rename a release into either concat
  trap — every release takes `fullnameOverride: tenzir-node`.
  ([tetragon node](../../nodes/tetragon/README.md))
- **Class uids by name, not number.** Resolve classes with the lookup
  idiom — `ocsf_class_uid("Network Activity")`, not hard-coded `4001`;
  the numbers exist for the reader.
  ([detections](../../detections/README.md))
- **Base Event archiving is per node, not uniform.** Core's archive
  rule exports `ocsf.base_event` with the mappable classes (added
  2026-10-17 — without a time rule those partitions accumulated locally
  and bloated the boot catalog load); tetragon deliberately keeps its
  unknown export kinds out — they cannot name a class and expire with
  the 15-minute window on the weighted-age backstop. Check the node's
  archive rule before assuming either way.
  ([detections](../../detections/README.md))
- **Zero findings egress.** Grafana owns notifications and there is no
  other findings egress — the Discord doorbell and the Loki findings
  projection are gone. Do not add another lane.
  ([detections](../../detections/README.md))

## Sources

- [`nodes/core/README.md`](../../nodes/core/README.md) — sigma skip
  warnings, metrics events
- [`nodes/tetragon/README.md`](../../nodes/tetragon/README.md) — noise
  baselines, parallelism, residue, naming trap
- [`detections/README.md`](../../detections/README.md) — class idioms,
  archive rules, egress model
- [`packages/homelab/tests/README.md`](../../packages/homelab/tests/README.md)
  — runner pinning
- [`README.md`](../../README.md) — baseline discipline
