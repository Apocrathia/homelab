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

## Problem / desired state

Integrity of the security record is high priority (operator, 2026-10-17). The
detection plane normalizes sources onto the OCSF bus on the core node and
archives every class to the lake (rustfs parquet today; ClickHouse pivot in
flight), but nothing stamps OCSF `record_integrity` attestations on the events
— verified by grep over `flux/manifests/03-services/observability/tenzir/`
packages, detections, and nodes: zero `attestation`/`record_integrity`/
`chain_uid` usage (the only "fingerprint" hits are the unrelated
subject-fingerprint uid in `findings/stamp.tql`).

OCSF 1.9.0 defines the `record_integrity` profile
(`tenzir-ocsf/v1.9.0/profiles/record_integrity.md`): an optional
`attestation_list` of `attestation` objects computed over the canonical
serialization of the event — including the attestation's own `chain_uid` and
`prev_event`, excluding only its own `fingerprint`/`signatures` — so altering
or deleting a record breaks the fingerprint of the record that references it.
It applies to base events and our event classes explicitly.

Desired state:

- Every record the core node emits onto the OCSF bus (and therefore every
  archived class, including findings 2004) carries an attestation, chained via
  `prev_event` under a stable `chain_uid` per node.
- A verification lane watches the chain: scheduled recomputation of
  fingerprints over canonical serializations, `prev_event` walk, alert on
  break. Tamper-evidence is only as good as who inserts and who watches
  (operator, 2026-10-17).

## Acceptance

- [ ] Attestation stamping lives in the `homelab` TQL mapping package (same
      content-plane as the existing map/stamp operators), library-first:
      checked `tenzir/library` (2026-10-17: no attestation package exists —
      `tenzir/operators` is `detect`, `ocsf`, `osint` only) and considered
      for upstreaming; implemented locally if upstream has nothing.
- [ ] Package tests follow the existing `packages/homelab/tests/` fixture
      pattern and assert: attestations present on outputs, chain links valid
      on fixture sequences.
- [ ] A scheduled verification runs against the lake (TQL hunt on the node or
      SQL post-pivot) and alerts on chain breaks through the existing Grafana
      contact-point rails.
- [ ] Key custody: signing material in the node secret store; `authority_uid`
      pins the signing identity per node.

## Feedback loop

- `tenzir` package test run over the new fixtures (existing test pattern).
- Verification query returns zero breaks on a seeded fixture lake.
- `prettier` + `yamllint` on changed files (content is TQL + YAML).

## Implementation hint

Stamp in the mapping package via TQL (`hash_sha256` exists as a function);
chain state needs pipeline-stable ordering per `chain_uid` — canonical
serialization (stable field ordering) is the crux, and may warrant an upstream
feature request (canonical-serialize or `attest` operator) if `print_json`
ordering proves unstable. Storage-agnostic: stamped at write time, so it lands
independent of the ClickHouse pivot's schedule — coordinate insertion point
with the in-flight migration so the archive lane gets stamped records from day
one of the new backend.

## Notes

- OCSF refs (vendored): `tenzir-ocsf/v1.9.0/profiles/record_integrity.md`,
  `tenzir-ocsf/v1.9.0/objects/attestation.md`.
- The agent investigations platform design (in flight, session draft
  `.scratch/agent-investigation/`) assumes `record_integrity` on
  `investigations.records` from day one; this issue covers the existing
  detection-plane pipelines as the separate task the operator asked for
  (2026-10-17).
