---
title: "Tenzir detection plane: stamp OCSF record_integrity attestations on the OCSF bus"
kind: feature
status: open
severity: high
source: human
found_at: 2026-10-17
area: observability
slice: hitl
---

# Tenzir detection plane: stamp OCSF record_integrity attestations on the OCSF bus

Revised 2026-10-17 against post-pivot main: the parquet lane is retired
(clickhouse MR-5 teardown); the nodes' `ocsf-archive` rules write ClickHouse
alone (per-class `ocsf.<Class_Name>` tables + the null-class catch-all,
`Int8 severity_id`), and the `s3://tenzir/ocsf/` rustfs archive is frozen,
unqueried history with no backfill (operator decision: the parquet history
has no value to preserve). This issue now describes stamping on the live
archive legs, not a migration-side change.

## Problem / desired state

Integrity of the security record is high priority (operator, 2026-10-17). The
detection plane normalizes sources onto the OCSF bus on the core node and
archives every class to the ClickHouse OCSF query store, but nothing stamps
OCSF `record_integrity` attestations on the events — verified by grep over
`flux/manifests/04-apps/security/tenzir/` packages, detections, and
nodes: zero `attestation`/`record_integrity`/`chain_uid` usage (the only
"fingerprint" hits are the unrelated subject-fingerprint uid in
`findings/stamp.tql`).

OCSF 1.9.0 defines the `record_integrity` profile
(`tenzir-ocsf/v1.9.0/profiles/record_integrity.md`): an optional
`attestation_list` of `attestation` objects computed over the canonical
serialization of the event — including the attestation's own `chain_uid` and
`prev_event`, excluding only its own `fingerprint`/`signatures` — so altering
or deleting a record breaks the fingerprint of the record that references it.
It applies to base events and our event classes explicitly.

Desired state:

- Every record the core node emits onto the OCSF bus (and therefore every
  `to_clickhouse` archive write, including findings 2004) carries an
  attestation, chained via `prev_event` under a stable `chain_uid` per node.
  The chain's epoch is the first stamped record; pre-stamping ClickHouse rows
  predate the chain and are out of scope.

  Landed 2026-10-20 (feat/tenzir-detection-attestations): the generalized
  lane lives in `packages/homelab/operators/record_integrity/` (attest +
  verify, both planes on one implementation); the core node's
  `ocsf-archive` rule stamps the per-node chain on every archived record
  (chain_uid = tenzir-node-core, the OCSF two-attestation shape — the
  record fingerprint in `attestation_list[0]`, the un-hashed chain link in
  `attestation_list[1]`, the engine's ordering walls documented in the
  operator), and `detection-attest-verify` walks a rolling 24h window
  against the per-class tables. The stamping cost is measured (100k
  harness: ~33k records/s standalone, ~19µs/record marginal) and the
  package tests pin chain, breaks, window-edge, and restart semantics.

- A verification lane watches the chain: scheduled ClickHouse SQL (or a
  `from_clickhouse` TQL hunt) recomputing fingerprints over canonical
  serializations, walking `prev_event` per `chain_uid`, alerting on break via
  the existing Grafana contact-point rails. Tamper-evidence is only as good
  as who inserts and who watches (operator, 2026-10-17).

## Acceptance

- [x] Attestation stamping lives in the `homelab` TQL mapping package (same
      content-plane as the existing map/stamp operators), library-first:
      checked `tenzir/library` (2026-10-17: no attestation package exists —
      `tenzir/operators` is `detect`, `ocsf`, `osint` only; every sha256 in
      the library hashes observables, never serializations) and considered
      for upstreaming; implemented locally. Landed:
      `packages/homelab/operators/record_integrity/{attest,verify}.tql`,
      with the engine findings (context-read staleness at batch rate, the
      lag-position wall, the null-out hash discipline) that any upstream
      contribution must carry. The upstream feature request the hint below
      anticipated (a sequential-chain / fold primitive, or a canonical-
      serialize + attest operator) is the remaining follow-up — the
      detection shape's un-hashed link attestation exists because v6.19.1
      offers no way to hash it at batch rate.
- [x] Package tests follow the existing `packages/homelab/tests/` fixture
      pattern and assert: attestations present on outputs, chain links valid
      on fixture sequences (detection-attest / detection-verify-clean /
      detection-verify-tamper pin the per-node cross-class chain, the
      (time, uid) tie-break, the window-edge tolerance, the restart shape,
      and both break types; detection-throughput measures the stamping cost
      on a 100k-record batch; the investigations baselines pin the
      investigations scope byte-identical through the refactor).
- [ ] The scheduled verification runs against the ClickHouse OCSF tables and
      alerts on chain breaks through the existing Grafana contact-point
      rails — `detection-attest-verify` runs the walk once at node startup
      (bounded 24h read-back, findings to stdout); the cron scheduling and
      the Grafana wiring are the operator's open call, as on the
      investigations node.
- [x] Key custody: signing material in the node secret store; `authority_uid`
      pins the signing identity per node — landed as the SHA-256
      fingerprint chain (no key material to custody; signatures over the
      fingerprints are the OCSF upgrade path when the lane wants
      non-repudiation, not just tamper-evidence); `authority_uid` =
      tenzir-node-core, the chart-rendered identity.
- [x] The investigations node's `investigations.records` chain got the same
      treatment first (MR !5333); this lap generalized that implementation —
      the investigations wrappers are now thin scope bindings over the
      shared record_integrity operators, baselines byte-identical.
- [ ] The tetragon and netflow nodes' `ocsf-archive` rules stamp their own
      per-node chains the same way (their archive rules share the core
      node's to_clickhouse shape; each needs its own detection-chains
      context declaration + operator mounts + the per-node identity in the
      attest call).

## Feedback loop

- `tenzir` package test run over the new fixtures (existing test pattern).
- Verification query returns zero breaks on a seeded fixture chain.
- `prettier` + `yamllint` on changed files (content is TQL + YAML).

## Implementation hint

Stamp in the mapping package via TQL (`hash_sha256` exists as a function);
chain state needs pipeline-stable ordering per `chain_uid` — canonical
serialization (stable field ordering) is the crux, and may warrant an upstream
feature request (canonical-serialize or `attest` operator) if `print_json`
ordering proves unstable; the only canonicalization hint in the ecosystem is
sorted-key JSON in `jev/operators/collect_record.tql`. Stamping is
storage-agnostic (write-time, upstream of the `to_clickhouse` legs), so it
needs no ClickHouse changes — but it must ride the archive rule's legs as
they exist post-pivot, and the verification lane is pure ClickHouse SQL over
the stored `attestation_list`.

## Notes

- OCSF refs (vendored): `tenzir-ocsf/v1.9.0/profiles/record_integrity.md`,
  `tenzir-ocsf/v1.9.0/objects/attestation.md`.
- The investigations node (merged 2026-10-17, MR !5333) stamps the
  `record_integrity` profile as a commented placeholder in
  `packages/homelab/operators/investigations/ocsf/map.tql` and shares the
  canonical-form work; this issue covers the detection-plane bus as the
  separate task the operator asked for (2026-10-17).
