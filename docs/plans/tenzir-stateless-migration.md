---
title: Tenzir CH-only stateless migration
status: active
found_at: 2026-10-21
updated_at: 2026-10-28
area: security
---

# Tenzir CH-only stateless migration

Retire the per-node lake: every node goes ingest -> normalize ->
attest in-stream -> `to_clickhouse` direct. ClickHouse stays the only
record store; the import-lake-compaction-archive pipeline dies per node.
The original design review lives in the 2026-10-21 design doc
(`.scratch/tenzir-stateless/`, gitignored scratch — this plan is the
durable record).

## Target architecture

| Piece           | Before                                                                                    | Target                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Write path      | `fork {import}` into the lake -> `ocsf-archive` compaction rule -> CH                     | In-stream attest + `to_clickhouse` per source pipeline                                          |
| Attest stamping | Inside the archive rule on the compaction pass                                            | In-stream pre-INSERT, stream mode, seam context unchanged                                       |
| Sigma findings  | sigma -> lake -> rule -> CH                                                               | sigma -> stamp -> own CH leg (lap 2d)                                                           |
| Lake + PVC      | 3x 20Gi lake PVCs (+ storage.yaml backup exclusions), 4x 5Gi pull-node PVCs               | Gone; `persistence.enabled: false` renders `state` as emptyDir (chart 0.2.0, template-verified) |
| Unmapped events | Expired with the 15-min window (leaked to `ocsf.null` via the rule's f-string table name) | Explicit in-stream drop at the class gate                                                       |

## Phases and status

- **Phase 0 — per-node diagnostics (B1)**: DONE (2026-10-21, 7/7 live-verified).
- **Phase 1 — 6.20 GA wave** (MR !5582): DONE (2026-10-27). Fleet on
  `v6.20.0`; all 62 attest digests byte-stable across the nova data-model
  change (offline-proven, package baselines); live evidence: zero tamper
  false-flags through the rollout and the walker-churn incident window.
  Field notes: the 6.20 catch-all round-trip made the 24h verify windows
  memory-heavy (walker OOM churn); import/export removal notice not in
  the 6.20.0 notes (the pre-December phase-2 clock stays
  meeting-authority); baseline capability not in this release (phase-3
  charter baseline component stays gated).
- **Lap 2a-1 — tetragon direct legs** (MR !5600): DONE (2026-10-27),
  production-proven: 20h zero-restart, direct legs at flood rate
  (~244k rows/15m), 100% attest coverage, zero tamper findings.
  Bounded 60s sort window (the ordering landmine), verify window
  24h -> 90m, `ocsf.null` leak killed, `parallelism` dropped. Probe
  fixtures: `packages/homelab/tests/tetragon-direct-{attest,verify-clean}`.
- **Lap 2e — pull-plane stateless** (MRs !5622-!5625, 2026-10-28):
  manifest-side DONE for enrichment, intel, introspection,
  investigations (emptyDir state; investigations' web signing key to
  emptyDir). **Cluster-side NOT landed**: the live StatefulSets still
  carry `volumeClaimTemplates` (immutable), so the helm upgrades for
  intel/investigations failed server-side-apply and
  enrichment/introspection rolled back — all four still run the old
  PVC-mounted spec. Needs the sts delete/recreate dance + orphaned
  PVC deletion.
- **Lap 2b — netflow direct legs** (MR !5626): UP — direct leg +
  in-stream attestation + 90m verify window + compaction-rule removal;
  CI-fixed 2026-10-28. Same vct-dance requirement on merge.
- **Lap 2d — core direct legs** (MR !5627): UP — all 5 import legs ->
  direct attest + INSERT, sigma's own CH leg, 90m verify window (the
  walker-OOM fix), compaction-rule removal, no PVC. This MR also ends
  the 2026-10-28 core crash-loop (24h window OOM + corrupted lake
  catalog from repeated unclean kills). Same vct-dance + PVC wipe
  requirement on merge.
- **Lap 2a-2 — tetragon teardown**: NOT QUEUED. Tetragon still carries
  its idle compaction rule, `ocsf-archive.tql`, `storage.yaml`, and the
  20Gi PVC (node state only — the write path went direct in 2a-1).
- **Phase 3 — introspection charter**: CH wiring + scheduled
  volume/freshness passes over `ocsf.*`; baseline-abnormality gated
  on the upstream baseline capability.

## Standing risks / residuals

- Attest-move ordering: the bounded window absorbs the exporter lateness
  (60s window, 30s tolerance, 120s idle timeout); beyond-tolerance
  stragglers drop (named in the pipeline comment).
- Concurrent-closure seam-write race under a >=60s exporter-stall
  catch-up burst (2a-2 watch item).
- Alerting math: `to_prometheus` truncates to ms — samples are per-burst,
  not per-event (B1 finding); freshness/absence alerts count bursts.

## Incident record (2026-10-27/29)

**Secrets consolidation outage (10-27/28)**: the `chore/clickhouse-secrets-consolidation` merge rewired the CH
password refs onto `tenzir-secrets` and pruned the `clickhouse-secrets`
Secret, but the vault item never carried the CH fields — every CH-wired
node went `CreateContainerConfigError` (~4h detection-plane outage).
Recovery: the four CH password fields were restored into the vault item
via the 1Password Connect REST API (values recovered from the untouched
`clickhouse-secrets` item), the OnePasswordItem re-synced, and the
stuck HelmRelease state machine cleared (HelmRelease deletion + pod
deletion). One `op`/curl debugging response echoed live token values
into the agent conversation log (local-only) — token rotation is an
operator call. Process gap to carry forward: secret-key ref rewires
need the vault-side copy verified before merge, not after.

**Core crash-loop (10-28/29)**: with its verify walk still on the 24h
window (2d not yet merged), core OOMKilled every ~8 minutes for ~19h
(136 restarts, 8Gi limit) — the boot-time walk against the grown
`ocsf.*` tables is the same walker-OOM class lap 2a-1 fixed on
tetragon. Repeated unclean kills corrupted the lake catalog (malformed
partitions), compounding each boot. Detection feeds (k8s-audit,
authentik, fleet, trivy, sigma findings) were dark for the window;
tetragon/netflow kept flowing and zero tamper findings fired fleet-wide.
Fix: MR !5627's 90m window + the lake PVC wipe on rollout.
