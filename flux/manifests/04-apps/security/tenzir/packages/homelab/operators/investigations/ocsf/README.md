# investigations OCSF map

[`map.tql`](./map.tql): agent case/evidence envelope -> OCSF. Case
envelopes map to Incident Finding (2005) lifecycle records
(Create/Update/Close); evidence envelopes map to Datastore Activity
(6005, Query) pins carrying the query text, its bounded snapshot, and
the lake event links. The investigations node's ingest pipeline
validates + stamps here, then derives + casts, and the to_clickhouse leg
INSERTs into investigations.records on ClickHouse — append-only; nothing
ever updates or deletes a row.

[`attest.tql`](./attest.tql): the record_integrity stamp. Runs after
derive + cast in the ingest pipeline, so the fingerprint covers the
record exactly as stored: a SHA-256 over the canonical serialization
(sorted-key strict JSON, proven insertion-order-independent by the
determinism test), chained per case (`chain_uid` = the case spine,
`prev_event` = the previous record's fingerprint). The caller supplies
the case's current chain tail in `prev_tail` — the live pipeline via
`context_enrich` on the node's investigations-chains context, the tests
from fixtures. A record without a tail that is not a case open warns
and restarts its chain with `prev_event` absent (the node-restart gap).

[`verify.tql`](./verify.tql): the read-back walk. Recomputes every
stored fingerprint over the canonical serialization and follows the
`prev_event` chains per case; a Detection Finding (2004) drops for each
break (content tamper, chain-head deletion, broken link). A mid-chain
record without `prev_event` is the documented restart case and not a
break — the per-record recompute still catches mutation across
restarts. The live lane is the node's investigations-attest-verify
pipeline; scheduling + Grafana alerting are the open items in
`docs/issues/tenzir-record-integrity-attestations.md`.
