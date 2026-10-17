---
title: "Learn the data lifecycle"
canonical: https://tenzir.com/docs/tutorials/learn-the-data-lifecycle
source: https://tenzir.com/docs/tutorials/learn-the-data-lifecycle.md
section: "Docs"
---

# Learn the data lifecycle

> Security data arrives as somebody else’s text and has to end up as something a detection, a dashboard, or an auditor can use. We call the steps in between the data lifecycle, and we group its thirteen stages into four phases, with replay closing the loop back to the first one.

Security data arrives as somebody else’s text and has to end up as something a detection, a dashboard, or an auditor can use. We call the steps in between the **data lifecycle**, and we group its thirteen stages into four phases, with replay closing the loop back to the first one.

The data lifecycle

This page is the map. Each stage below gets a definition, a short snippet, and links to the guides that go deep. Read it once to learn the vocabulary, then come back to it when you need to find where something belongs.

Only the first four stages have a required order. Data has to arrive before anything can parse it, parsing has to expose fields before shaping can prepare them, and normalization then maps them to a schema. Everything else depends on what you are building. A real deployment runs most of these at the same time in separate pipelines, connected by [`publish`](https://tenzir.com/docs/reference/operators/publish.md) and [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md), so the picture is a vocabulary rather than a queue.

Every stage is ordinary TQL. Nothing on this page is a special mode, a plugin, or a configuration file.

## Get data in

The first phase turns somebody else’s output into structured, mapping-ready events.

### Collect

Collection reads bytes or events from a system Tenzir does not control.

```tql
from_file "s3://example-flow-logs/AWSLogs/**/*.log.gz", watch=true {
  decompress_gzip
  read_lines
}
```

Collection operators carry the connection details, the credentials, and the retry behavior, which is why they are the only ones that ever fail because something outside your pipeline is down. Read from [files and object storage](../guides/collect/read-and-watch-files.md), [HTTP APIs](../guides/collect/fetch-via-http-and-apis.md), [message brokers](../guides/collect/read-from-message-brokers.md), [data stores](../guides/collect/read-from-data-stores.md), or [the network](../guides/collect/get-data-from-the-network.md).

### Parse

Parsing turns an opaque string or byte sequence into a structured event that still uses the source’s own field names.

```tql
flow = message.parse_ssv(header=amazon::$vpc_flow_v2_header, null_value="-")
flow.start = flow.start.seconds().from_epoch()
```

Parsing decides nothing about a target schema, which is what lets the same parsing feed OCSF today and ECS tomorrow. Many sources need no parsing step at all, because a `read_*` operator already produces events. Parse [string fields](../guides/parse/parse-string-fields.md), [delimited text](../guides/parse/parse-delimited-text.md), and [binary data](../guides/parse/parse-binary-data.md).

### Shape

Shaping prepares source fields for mapping: rename, nest, flatten, round, derive, drop.

```tql
duration = count_milliseconds(end_time - time).round()
src_endpoint = {...src_endpoint, internal: src_endpoint.ip in 10.0.0.0/8}
```

This first shaping pass fixes types and structure before normalization. Further shaping can happen anywhere in a pipeline. See [reshaping complex data](../guides/shape/reshape-complex-data.md), [working with records](../guides/shape/shape-records.md), and [normalizing event timestamps](../guides/shape/normalize-event-timestamps.md).

## Make it fit

The second phase maps events to a shared schema and controls which of them continue.

### Normalize

Normalization moves those fields into a schema that everything downstream agrees on, such as OCSF, ASIM, CIM, ECS, or UDM.

```tql
unmapped = this
@name = "ocsf.network_activity"
class_uid = 4001
time = move unmapped.start
src_endpoint = {ip: move unmapped.srcaddr, port: move unmapped.srcport}
ocsf_derive
```

Two habits make normalization safe. Whatever has no target field stays in `unmapped`, so nothing disappears silently, and the original payload stays in `raw_data`, so an analyst can always compare the mapped event against what the source sent. Our explanation of [normalization](../explanations/normalization.md) covers why this stage belongs at ingest, and the guide on [mapping to OCSF](../guides/normalize/map-to-ocsf.md) walks through one target schema.

### Optimize

Optimization decides what deserves to continue.

```tql
where action_id == 2 or traffic.bytes > 1k
deduplicate src_endpoint.ip, dst_endpoint.ip, create_timeout=1h
```

Filtering and deduplication cost almost nothing in a running pipeline, and volume you drop here never reaches a bill or an analyst. See [filtering and selecting data](../guides/optimize/filter-and-select-data.md).

### Protect

Protection limits sensitive-data exposure while keeping the relationships that investigations need. Anonymization removes identities irreversibly, pseudonymization replaces them with stable substitutes, and encryption keeps them recoverable by authorized parties.

```tql
src_endpoint.ip = encrypt_cryptopan(src_endpoint.ip, seed=secret("CRYPTOPAN_SEED"))
user.email_addr = f"*****@{user.email_addr.split("@")[1]}"
```

Prefix-preserving encryption keeps subnet structure intact while hiding the original addresses. Protect sensitive fields before events leave your trust boundary. Our guides on [masking sensitive data](../guides/protect/mask-sensitive-data.md) and [encrypting sensitive data](../guides/protect/encrypt-sensitive-data.md) show the techniques in depth.

## Add meaning

An event that says `10.0.1.10 talked to 198.51.100.20` is a fact. The third phase makes it useful.

### Enrich

Enrichment adds what the event does not carry: geography, asset ownership, threat intelligence, or an answer from a model.

```tql
context_enrich "geo-open", key=dst_endpoint.ip, into=dst_endpoint.geo
```

The lookup lives in a context that updates on its own schedule, so enrichment stays one operator call. See [lookup tables](../guides/enrich/use-lookup-tables.md), [threat intelligence](../guides/enrich/enrich-with-threat-intel.md), [asset inventory](../guides/enrich/enrich-with-asset-inventory.md), and [models](../guides/enrich/enrich-events-with-ai.md), or build a context in [Add enrichment contexts](add-enrichment-contexts.md).

### Analyze

Analysis turns an event stream into statements about its activity. It can reduce many events to a summary, retain a distribution in bounded state, or compare current behavior with a baseline.

```tql
window size=15min, on=time {
  summarize agent=ai_agent.name,
    durations=tdigest(trace.span.duration),
    operations=frequency_table(api.operation),
    sessions=hll(ai_agent.instance_uid)
  p95_duration_ms = tdigest_quantile(durations, 0.95)
  active_sessions = hll_cardinality(sessions)
}
```

Analysis powers charts, dashboards, and baselines. It can also expose [rare values](../guides/analyze/find-unseen-and-rare-values.md), [set adaptive thresholds](../guides/analyze/set-adaptive-thresholds-from-a-baseline.md), [identify distribution drift](../guides/analyze/identify-distribution-drift.md), or [find a cardinality change](../guides/analyze/find-cardinality-spikes.md). None of these results decides by itself that the activity is malicious. See [aggregating event streams](../guides/analyze/aggregate-event-streams.md), [windowing event streams](../guides/analyze/window-event-streams.md), and [Plot data with charts](plot-data-with-charts.md).

### Detect

Detection turns events into findings.

```tql
where class_uid == 4001 and action_id == 2
summarize src=src_endpoint.ip, rejects=count()
where rejects > 100
```

Because detections run on normalized events, one rule covers every source that maps to the same class. See [matching events with TQL](../guides/detect/match-events-with-tql.md), [executing Sigma rules](../guides/detect/execute-sigma-rules.md), [detecting over time windows](../guides/detect/detect-over-time-windows.md), and [modeling detections in OCSF](../guides/detect/model-detections-in-ocsf.md).

## Put it to work

The last phase is what the data was for.

### Store

Storage persists events for questions you have not asked yet.

```tql
to_s3 "s3://security-lake/ocsf/network/**/data_{uuid}.parquet",
  partition_by=[class_uid], max_size=128M {
  write_parquet compression_type="zstd"
}
```

Columnar files with compression and partitioning keep both cost and query time down. See [writing partitioned files](../guides/store/write-partitioned-files.md) and [importing into storage](../guides/store/import-into-a-node.md).

### Search

Searching answers questions about events you already stored.

```tql
from_clickhouse uri="clickhouse://clickhouse:9000/security", sql=r#"
  SELECT time, src_endpoint, dst_endpoint FROM network_activity
  WHERE time >= now() - INTERVAL 24 HOUR ORDER BY time DESC LIMIT 100
"#
```

Push filtering, sorting, and projection into the system that holds the data, then continue in TQL. See [querying storage](../guides/search/export-from-a-node.md) and [reading from data stores](../guides/collect/read-from-data-stores.md).

### Route

Routing delivers events to the systems that need them, each in the format it expects.

```tql
subscribe "ocsf.network"
fork {
  where severity_id >= 4
  to_splunk "https://splunk:8088", hec_token=secret("HEC_TOKEN")
}
publish "ocsf.archive"
```

The [`fork`](https://tenzir.com/docs/reference/operators/fork.md) operator sends a copy down a branch while the main stream continues, so one collection pipeline can feed a SIEM, an archive, and an alerting path. See [sending to destinations](../guides/route/send-to-destinations.md), [fanning out with subpipelines](../guides/route/fan-out-with-subpipelines.md), and [load balancing](../guides/route/load-balance-pipelines.md).

## Close the loop

### Replay

Replay reads stored events and sends them back to the start with rewritten timestamps.

```tql
from_file "s3://security-lake/ocsf/network/**/day=17/*.parquet" {
  read_parquet
}
sort time
timeshift time, start=now()
delay time, speed=20.0
publish "ocsf.network"
```

That is the arrow on the right of the diagram, and it is why storage matters beyond compliance. Replay drives a changed detection against a real incident, backfills after you fix a mapping, and paces a demo. Here [`timeshift`](https://tenzir.com/docs/reference/operators/timeshift.md) rewrites the timestamps and [`delay`](https://tenzir.com/docs/reference/operators/delay.md) controls the speed. The guide on [replaying historical events](../guides/replay/replay-historical-events.md) covers ordering large archives, preserving original timestamps, and isolating replay side effects.

## Put it together

Stages are operators, and a pipeline is a sequence of them. Here are seven of them in one pipeline, ending with a topic that the storage, search, and routing pipelines subscribe to:

```tql
from_file "s3://example-flow-logs/AWSLogs/**/*.log.gz", watch=true {
  decompress_gzip
  read_lines
}
amazon::vpc_flow::ocsf::normalize line
where action_id == 2 or traffic.bytes > 1k
context_enrich "geo-open", key=dst_endpoint.ip, into=dst_endpoint.geo
src_endpoint.ip = encrypt_cryptopan(src_endpoint.ip, seed=secret("CRYPTOPAN_SEED"))
publish "ocsf.network"
```

The second line is where a [package](../explanations/packages.md) earns its keep. Installing one for a source gives you an operator that covers that source’s arrival stages, so the pipeline names the source and moves on. Packages are how most deployments end up, and [Onboard a data source](onboard-a-data-source.md) shows what is inside one.

## Next

* [Learn idiomatic TQL](learn-idiomatic-tql.md) teaches the language these pipelines are written in.
* [Onboard a data source](onboard-a-data-source.md) packages a lifecycle so other people can install it instead of rebuilding it.
* The [glossary](../explanations/glossary.md) defines the things these stages operate on, from events and schemas to contexts and packages.
