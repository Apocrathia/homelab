# record_integrity

[`attest.tql`](./attest.tql) and [`verify.tql`](./verify.tql): the
generalized OCSF `record_integrity` lane both planes stamp — the shared
engine behind the investigations plane's scope wrappers
([`../investigations/ocsf/`](../investigations/ocsf/README.md)) and the
detection plane's direct calls (the core, tetragon, and netflow nodes'
archive rules + verify pipelines — one chain per node, the chart-rendered
identity each). The mechanics live here once; the chain scope is the
caller's.

[`attest.tql`](./attest.tql): stamps `attestation_list[0]` with a
SHA-256 fingerprint over the canonical serialization (sorted-key strict
JSON, `serialization: "tenzir-sorted-json"` — proven
insertion-order-independent by the investigations determinism test),
covering the record exactly as stored, upstream of the INSERT, so the
verifier recomputes it from read-backs alone. The chain scope and
linkage mode are parameters: `chain_uid` (per case on the
investigations plane, per node — the chart-rendered identity — on the
detection plane), `authority_uid` (the attesting node), `genesis` (the
per-record expression that separates a legitimate chain start from the
documented restart case), and `chain`:

- `caller` (the investigations shape): the caller supplies every
  record's tail in `prev_tail` — viable for paced lanes (the HTTP
  ingest, one envelope in flight at a time), where the node-resident
  lookup-table context keeps the chain state. One attestation per
  record, prev_event inside its hash.
- `stream` (the detection shape): the operator chains the batch itself
  via its internal lag, in the caller's (time, metadata.uid) sort
  order. Two attestations per linked record: `[0]` the record
  fingerprint (no prev_event — a pure function of the record, so the
  lag can carry it to the next record; the OCSF hash rule puts
  prev_event inside a chained attestation's hash, which would make the
  single-attestation shape strictly sequential, and the engine has no
  cross-position state channel for that), `[1]` the chain link
  (`prev_event` referencing the predecessor's record fingerprint,
  carried un-hashed — fingerprint is recommended-not-required; its
  integrity is enforced by the verify adjacency check, and a deleted
  link masquerades as a chain restart, the documented limit). The
  caller's `prev_tail` is the batch seam only (the previous pass's
  last record); the hash input nulls it out on both sides — the
  verify recompute reproduces the same null, byte-for-byte.

The mode split is load-bearing, not stylistic: a 100k-record
live probe (v6.19.1, local node) showed the context-read chain
mis-linking every record of a fast batch (the reads run engine-batches
ahead of the writes), while the stream mode chains 99,999/99,999
intra-batch links correctly with the first record seam-linked through
the context.

[`verify.tql`](./verify.tql): the read-back walk. Recomputes every
stored record's fingerprint over the canonical serialization, walks
the chains per `attestation_list[0].chain_uid` in (time,
metadata.uid) order (the same key pair the stamp side sorts on — the
tie-break is why the archive leg mints metadata.uid), and emits a
Detection Finding (2004) per break: content tamper
(`fingerprint_mismatch`), deletion or splice (`chain_link_mismatch`,
`chain_head_missing` in the unwindowed investigations walk). The
finding's dressing (product, title, uid prefix, scope word) is the
caller's plane identity; the record is schema-native class 2004
(`finding_info` singular, required by the class; severity 4), so both
planes' scheduled verify pipelines dress it through `ocsf_derive` +
`ocsf_cast` and INSERT it into `ocsf.Detection_Finding`, riding the
Grafana tenzir-findings alert rails; `windowed=true` covers bounded
read-backs
(the rolling-window detection walks: the walk's first record may
reference a predecessor outside the window — its link checks are
skipped, its fingerprint recompute is not); `link` selects the chain
shape attest stamped (`caller`/`stream`).

Tests: the investigations baselines pin the caller shape byte-identical
(`investigations-ocsf-attest*`, `investigations-ocsf-verify-*`); the
detection baselines pin the stream shape — the per-node cross-class
chain, the (time, uid) tie-break, the window-edge tolerance, the
restart shape, and both break types (`detection-attest`,
`detection-verify-clean`, `detection-verify-tamper`);
`detection-verify-finding` pins the finding record's rails shape —
class 2004 schema-native (`finding_info` singular), passing
`ocsf_derive` + `ocsf_cast` clean, with severity 4 + class 2004 +
`finding_info.title` landing inside the Grafana tenzir-findings rule's
WHERE clauses (the scheduled verify pipelines write these findings
into `ocsf.Detection_Finding` to ride the existing alert rails); and
the 100k throughput harness measures the stamping cost
(`detection-throughput`). The tetragon and netflow baselines pin the
two remaining node lanes the same way —
`tetragon-attest`/`-verify-clean`/`-verify-tamper` (the cross-class
1007→1001→4001 chain at flood scale, with `tetragon-throughput` timing
the 100k-record leg on the flood's own class) and
`netflow-attest`/`-verify-clean`/`-verify-tamper` (the single-class
chain with the same-timestamp v5 flow ties that make the (time, uid)
tie-break the NORM on that lane). The netflow tamper fixture is the
one that exposed the homogeneous-batch restart hole in the verify
operator (schema unification typing the out-of-bounds link access as
the empty string instead of null — a false `chain_link_mismatch` on
every post-restart record; the structural length guard fixed it, and
the tamper baseline now pins the restart silence). The narrative, the
honest limits, and the cost math live in the datalake README's
attestation section
([`../../../clickhouse/README.md`](../../../clickhouse/README.md)).
