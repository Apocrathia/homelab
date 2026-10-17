# investigations OCSF map

[`map.tql`](./map.tql): agent case/evidence envelope -> OCSF. Case
envelopes map to Incident Finding (2005) lifecycle records
(Create/Update/Close); evidence envelopes map to Datastore Activity
(6005, Query) pins carrying the query text, its bounded snapshot, and
the lake event links. The investigations node's ingest pipeline
validates + stamps here, then INSERTs into investigations.records on
ClickHouse — append-only; nothing ever updates or deletes a row.
