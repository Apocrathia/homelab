# investigations OCSF map

[`map.tql`](./map.tql): agent case/evidence envelope -> OCSF. Case
envelopes map to Incident Finding (2005) lifecycle records
(Create/Update/Close); evidence envelopes map to Datastore Activity
(6005, Query) pins carrying the query text, its bounded snapshot, and
the lake event links. The investigations node's ingest pipeline
validates + stamps here, then derives + casts, and the to_clickhouse leg
INSERTs into investigations.records on ClickHouse — append-only; nothing
ever updates or deletes a row.

[`attest.tql`](./attest.tql) / [`verify.tql`](./verify.tql): thin
investigations-plane scope wrappers over the shared generalized lane
([`../../record_integrity/`](../../record_integrity/README.md)), which
owns the stamping and walk mechanics. The scope bindings: one chain
per case (`chain_uid` = the case spine), genesis is the case open
(class 2005, activity 1 — a new case legitimately starts its chain),
the attesting identity is tenzir-node-investigations, the caller mode
supplies every record's tail in `prev_tail` (the live pipeline via
`context_enrich` on the node's investigations-chains context, the
tests from fixtures — viable because the HTTP ingest paces one
envelope at a time), and the findings dress as the investigations
product over the per-case chains. A record without a tail that is not
a case open warns and restarts its chain with `prev_event` absent
(the node-restart gap). The wrapper bodies are single calls — the
operator names stay `homelab::investigations::ocsf::attest`/`verify`,
so the ingest and verify pipelines are unchanged.
