---
title: "Tune performance"
canonical: https://tenzir.com/docs/guides/node-setup/tune-performance
source: https://tenzir.com/docs/guides/node-setup/tune-performance.md
section: "Docs"
---

# Tune performance

> This guide covers configuration options that affect node performance. You’ll learn how batching affects performance and how to tune buffering, memory usage, and parallelism.

This guide covers configuration options that affect node performance. You’ll learn how batching affects performance and how to tune buffering, memory usage, and parallelism.

## Demand

Back pressure limits how far producers can run ahead of consumers. The executor uses bounded channels between unfused jobs. When a channel fills, its producer waits for the consumer to make room. Operators inside a fused group hand batches directly to each other without an intermediate channel, as our [executor explanation](../../explanations/executor.md#jobs-and-channels) describes.

The configuration section `tenzir.demand` controls buffering for in-memory topics used by [`publish`](https://tenzir.com/docs/reference/operators/publish.md) and [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md), not every channel in an execution plan. Our [example configuration](../../reference/node/configuration.md) lists the available options.

For example, to reduce topic buffering at the cost of throughput, set the following option:

```yaml
tenzir:
  demand:
    max-batches: 1
```

## Batching

Tenzir processes events in batches. Our explanation of the [data model](../../explanations/data-model.md) describes how a batch stores events column by column, including events with different schemas.

Batch size affects both throughput and latency. Smaller batches reduce the work in each processing step, but increase per-batch overhead. Larger batches amortize that overhead and can improve throughput, at the cost of more memory and longer processing steps.

Parsers and most sources produce batches of up to 8,192 events. When no new input arrives for a second, they emit a smaller batch so that events do not wait for a batch to fill up. Because a single batch holds events of any schema, a stream whose schema changes from event to event still flows in full batches.

The batch size does not bound all buffering in a pipeline. Memory usage also depends on the number of channels, their capacity, and any state that operators retain.

The option `tenzir.import.batch-size` sets the number of events per batch that a [partition rebuild](tune-performance.md#rebuild-partitions) writes. It defaults to 8,192.

## Parallelism

Every operator of a pipeline runs on a single core by default. Enable parallelism to let Tenzir run CPU-bound operators on several cores at once.

### Config

Configure parallelism for an individual pipeline with a `// parallelism:` directive in its leading comments:

```tql
// parallelism: 8
from_file "/var/log/events/*.json", watch=10s
ocsf_cast
where severity_id >= 4
to_file "/tmp/tenzir/high-severity.json" { write_ndjson }
```

Start with `// parallelism: 8` and measure the result for your workload. The planner replicates eligible operators into parallel lanes, routes batches across them, and gathers the output again. This diagram uses three lanes to illustrate the plan shape:

A source fans batches into three parallel lanes, each containing where, set, ocsf\_cast, and drop\_null\_fields instances at different stages of processing, before a single to\_clickhouse sink gathers the outputs

Parallelism directive can be one of:

* `disabled`, the default, which runs one instance of every operator. Adjacent operators still run [fused](tune-performance.md#fusing) into a single group, same as an explicit degree.
* `max`, which runs one instance per CPU core.
* A positive integer, which runs that many instances.

To set a default for every pipeline that runs in a node, configure `tenzir.parallelism` in `tenzir.yaml`:

\<configdir>/tenzir/tenzir.yaml

```yaml
tenzir:
  parallelism: 8
```

The node setting accepts the same values as the directive. A pipeline directive overrides the node default.

When only one section of a pipeline is the bottleneck, wrap it in [`parallel`](https://tenzir.com/docs/reference/operators/parallel.md) instead. The operators inside run on the given number of cores, and the rest of the pipeline stays on one:

```tql
from_file "/var/log/events/*.json", watch=10s
parallel 4 {
  ocsf_cast
  where severity_id >= 4
}
to_file "/tmp/tenzir/high-severity.json" { write_ndjson }
```

Parallelism reorders events

Parallel instances work at different speeds, so a parallel pipeline can emit events in a different order than it received them. Keep parallelism disabled when the input order carries meaning.

### Planner

Not every operator can run on multiple cores. Filters like [`where`](https://tenzir.com/docs/reference/operators/where.md), assignments like `bytes = orig_bytes + resp_bytes`, shapers like [`drop`](https://tenzir.com/docs/reference/operators/drop.md), and mappers like [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) can, because they treat each event on its own. The planner leaves the remaining operators at a single instance.

These operators run on multiple cores:

<!-- Plain list markup (no `not-content`) so the items inherit the surrounding
     docs list styling: same bullets, indent, and item spacing as an authored
     list. -->

* [`assert`](https://tenzir.com/docs/reference/operators/assert.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md)
* [`discard`](https://tenzir.com/docs/reference/operators/discard.md)
* [`dns_lookup`](https://tenzir.com/docs/reference/operators/dns_lookup.md)
* [`drop`](https://tenzir.com/docs/reference/operators/drop.md)
* [`drop_null_fields`](https://tenzir.com/docs/reference/operators/drop_null_fields.md)
* [`each`](https://tenzir.com/docs/reference/operators/each.md)
* [`from_amqp`](https://tenzir.com/docs/reference/operators/from_amqp.md)
* [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md)
* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [`from_google_cloud_pubsub`](https://tenzir.com/docs/reference/operators/from_google_cloud_pubsub.md)
* [`from_google_cloud_storage`](https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md)
* [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md)
* [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md)
* [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md)
* [`publish`](https://tenzir.com/docs/reference/operators/publish.md)
* [`python`](https://tenzir.com/docs/reference/operators/python.md)
* [`replace`](https://tenzir.com/docs/reference/operators/replace.md)
* [`set`](https://tenzir.com/docs/reference/operators/set.md)
* [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md)
* [`to_amazon_kinesis`](https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md)
* [`to_amazon_sqs`](https://tenzir.com/docs/reference/operators/to_amazon_sqs.md)
* [`to_amqp`](https://tenzir.com/docs/reference/operators/to_amqp.md)
* [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md)
* [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md)
* [`to_google_cloud_logging`](https://tenzir.com/docs/reference/operators/to_google_cloud_logging.md)
* [`to_google_cloud_pubsub`](https://tenzir.com/docs/reference/operators/to_google_cloud_pubsub.md)
* [`to_google_secops`](https://tenzir.com/docs/reference/operators/to_google_secops.md)
* [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md)
* [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)
* [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md)
* [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md)
* [`to_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/to_sentinelone_data_lake.md)
* [`to_splunk`](https://tenzir.com/docs/reference/operators/to_splunk.md)
* [`unroll`](https://tenzir.com/docs/reference/operators/unroll.md)
* [`where`](https://tenzir.com/docs/reference/operators/where.md)

Operators that group related events, such as [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md), [`group`](https://tenzir.com/docs/reference/operators/group.md), and [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md), receive events partitioned by their keys. Tenzir runs them on at most 4 instances, because partitioning splits batches and the resulting per-event overhead grows with the number of partitions. Raise or lower that bound with `limit_partitions`:

```tql
// parallelism: max,limit_partitions=8
from_file "/var/log/flows/*.json"
summarize dest_ip, bytes=sum(bytes)
```

[`parallel`](https://tenzir.com/docs/reference/operators/parallel.md) accepts the same option for a single block:

```tql
parallel 8, limit_partitions=8 {
  summarize dest_ip, bytes=sum(bytes)
}
```

### Fusing

Each channel between two operators is a buffer, so splitting a pipeline into several lanes would multiply both the number of channels and the data sitting in them. Tenzir avoids that by fusing the operators of a lane into a single group. Operators inside a group hand batches to each other directly, with no channel in between, and a group carries one batch through all of its operators before it consumes the next one:

Three parallel lanes of where, ocsf\_cast, and set, each with an active batch inside every operator and two batches queued in each internal channel, next to the same three lanes fused into groups with no internal channels and one batch in flight each. Dashed input and output channels show that both plans are sections of a larger pipeline

Tenzir fuses by default, even for pipelines that never opt into parallelism, because it lowers memory usage for the vast majority of pipelines, which are not CPU-bound. The trade-off is a lower throughput ceiling for the pipelines that are: fused operators hand off one batch at a time instead of overlapping work across channel-connected jobs, so a chain of otherwise CPU-bound operators can lose up to 40% of its peak throughput compared to running unfused. Pipelines that hit this ceiling benefit from an explicit `// parallelism: <n>` directive, which spreads the work across `<n>` instances again.

To opt a pipeline out of fusing entirely, add the `fuse=none` option to the parallelism directive:

```tql
// parallelism: 1,fuse=none
```

Setting `fuse=all` goes the other direction and fuses every channel in the pipeline, including the ones between lanes that would otherwise stay unfused. A parallel pipeline with the default `fuse=parallel` tends to hold less memory than the same pipeline running on a single core, not more. The difference is largest when a pipeline is back-pressured, for example when a slow sink lets every channel upstream of it fill up.

[`parallel`](https://tenzir.com/docs/reference/operators/parallel.md) takes the same values as a `fuse` argument, scoped to the operators inside its block:

```tql
parallel 4, fuse="none" {
  ocsf_cast
  where severity_id >= 4
}
```

## Storage Engine

The central component of Tenzir’s storage engine is the *catalog*. It owns the partitions, keeps metadata about them, and maintains a set of sparse secondary indexes to identify relevant partitions for a given query.

Catalog Indexes

The catalog’s secondary indexes are space-efficient sketch data structures (e.g., Bloom filters, min-max summaries) that have a low memory footprint but may yield false positives. Tenzir keeps all sketches in memory.

The amount of memory that the storage engine can consume is not explicitly configurable, but there exist various options that have a direct impact.

### Control the partition size

Tenzir groups events with the same schema in a partition. There exist mutable *active partitions* that Tenzir writes to during ingestion, and immutable *passive partitions* that Tenzir reads from during query execution.

When constructing a partition, the parameter `tenzir.max-partition-size` (default: 4Mi / 2^22) sets an upper bound on the number of records in a partition, across all batches. The parameter `tenzir.active-partition-timeout` (default: 10 seconds) provides a time-based upper bound: once reached, Tenzir considers the partition as complete, regardless of the number of records.

The two parameters are decoupled to allow for independent control of throughput and freshness. Tenzir also merges undersized partitions asynchronously in the background, which counter-acts the fragmentation effect from choosing a low partition timeout.

### Tune catalog fragmentation

The catalog keeps state that grows linear in the number of partitions. The configuration option `tenzir.max-partition-size` determines an upper bound of the number of records per partition, which is inversely linked to the number of partitions. For example, a large value yields fewer partitions whereas a small value creates more partitions.

In other words, increasing `tenzir.max-partition-size` is an effective method to reduce the memory footprint of the catalog, at the cost of creating larger partitions.

### Configure the catalog

You can configure catalog and partition indexes under the key `tenzir.index`. The configuration `tenzir.index.rules` is an array of indexing rules, each of which configures the indexing behavior of a set of extractors. A rule has the following keys:

* `targets`: a list of extractors to describe the set of fields whose values to add to the sketch.
* `fp-rate`: an optional value to control the false-positive rate of the sketch.

#### Tune catalog index parameters

Catalog indexes may produce false positives that can have a noticeable impact on the query latency by materializing irrelevant partitions. Based on the cost of I/O, this penalty may be substantial. Conversely, reducing the false positive rate increases the memory consumption, leading to a higher resident set size and larger RAM requirements. You can control the false positive probability with the `fp-rate` key in an index rule.

By default, Tenzir creates one sketch per type, but not additional field-level sketches unless a dedicated rule with a matching target configuration exists. Here is an example configuration that adds extra field-level sketches:

```yaml
tenzir:
  index:
    # Set the default false-positive rate for type-level sketches
    default-fp-rate: 0.001
    rules:
      - targets:
          # field sketches require a fully qualified field name
          - suricata.http.http.url
        fp-rate: 0.005
      - targets:
          - :ip
        fp-rate: 0.1
```

This configuration includes two rules (= two catalog indexes) where the first rule includes a field extractor and the second a type extractor. The first rule applies to a single field, `suricata.http.http.url`, and has false-positive rate of 0.5%. The second rule creates one sketch for all fields of type `ip` that has a false-positive rate of 10%.

### Adjust the store compression

Tenzir compresses partitions using Zstd for partitions at rest. To fine-tune the space-time trade-off, Tenzir offers a setting, `tenzir.zstd-compression-level` to allow fine-tuning the compression level:

```yaml
tenzir:
  zstd-compression-level: 1
```

Currently, the default value is taken from Apache Arrow itself.

### Rebuild partitions

The `rebuild` command re-ingests events from existing partitions and replaces them with new partitions. This makes it possible to upgrade persistent state to a newer version, or recreate persistent state after changing configuration parameters, e.g., switching from the Feather to the Parquet store backend. The following diagram illustrates this “defragmentation” process:

Rebuild

Rebuilding partitions also recreates their sketches. The process takes place asynchronously in the background. Control this behavior in your `tenzir.yaml` configuration file, to disable or adjust the resources to spend on automatic rebuilding:

```yaml
tenzir:
  # Automatically rebuild undersized and outdated partitions in the background.
  # The given number controls how much resources to spend on it. Set to 0 to
  # disable. Defaults to 1.
  automatic-rebuild: 1
```

This is how you run it manually:

```bash
tenzir-ctl rebuild start [--all] [--undersized] [--parallel=<number>] [--max-partitions=<number>] [--detached] [<expression>]
```

A rebuild is not only useful when upgrading outdated partitions, but also when changing parameters of up-to-date partitions. (Internally, Tenzir versions the partition state via FlatBuffers. An outdated partition is one whose version number is not the newest.)

The `--undersized` flag causes Tenzir to rebuild partitions that are under the configured partition size limit `tenzir.max-partition-size`.

The `--all` flag causes Tenzir to rebuild all partitions.

The `--parallel` option is a performance tuning knob. The parallelism level controls how many sets of partitions to rebuild in parallel. This value defaults to 1 to limit the CPU and memory requirements of the rebuilding process, which grow linearly with the selected parallelism level.

Rebuilds limit how much partition data they load into memory at once. When available memory is low, Tenzir processes fewer partitions in a batch and leaves the remaining partitions for a later rebuild step instead of loading the full selected input set up front.

The `--max-partitions` option allows for setting an upper bound to the number of partitions to rebuild.

An optional expression allows for restricting the set of partitions to rebuild. Tenzir performs a catalog lookup with the expression to identify the set of candidate partitions. This process may yield false positives, as with regular queries, which may cause unaffected partitions to undergo a rebuild. For example, to rebuild outdated partitions containing `suricata.flow` events older than 2 weeks, run the following command:

```bash
tenzir-ctl rebuild start '#schema == "suricata.flow" && #import_time < 2 weeks ago'
```

To stop an ongoing rebuild, use `tenzir-ctl rebuild stop`.

## Logging

The Tenzir Node writes log files into a file named `server.log` in the database directory by default. Set the option `tenzir.log-file` to change the location of the log file.

A `tenzir` client process does not write logs by default. Set the option `tenzir.client-log-file` to enable logging. Note that relative paths are interpreted relative to the current working directory of the client process.

Node log files rotate automatically after 10 MiB. The option `tenzir.disable-log-rotation` allows for disabling log rotation entirely, and the option `tenzir.log-rotation-threshold` sets the size limit when a log file should be rotated.

Tenzir processes log messages in a dedicated thread, which by default buffers up to 1M messages for servers, and 100 for clients. The option `tenzir.log-queue-size` controls this setting.

## Caching

Tenzir Nodes cache results for results for pipelines used in the Tenzir Platform’s Explorer. Internally, this utilizes the [`cache`](https://tenzir.com/docs/reference/operators/cache.md) operator.

Caches have two primary tuning knobs:

1. The `tenzir.cache.capacity` option controls the total memory usage in bytes caches may use in the node. If this capacity is exceeded, the oldest caches will be removed. The option defaults to 1Gi, and must be set to at least 64Mi.
2. The `tenzir.cache.lifetime` option controls the maximum age of each cache. The option defaults to 10min.

If you expect that many users will be using the Explorer with a node at the same time, or if you want to explore large data sets with the Explorer, we recommend increasing the cache capacity option of the node. Otherwise, the Explorer may need to re-run pipelines more frequently because the caches get evicted earlier.

We recommend reducing the cache capacity to its minimum of 64Mi only when running in a memory-constrained environment.

Here’s how you can set the options:

/opt/tenzir/etc/tenzir/tenzir.yaml

```yaml
tenzir:
  cache:
    # Total cache capacity in bytes for the node. Must be at least 64Mi.
    # Defaults to 1Gi.
    capacity: 1Gi
    # Maximum lifetime of a cache. Defaults to 10min.
    lifetime: 10min
```

The options can also be specified as the `TENZIR_CACHE__CAPACITY` and `TENZIR_CACHE__LIFETIME` environment variables, respectively.

Restart the node after changing these options for them to take effect.

Additionally, in the Explorer, users can control how many events they want to cache per run of a pipeline. The available options are 1k, 10k, 100k, or 1M events, defaulting to 10k. Avoid using higher limits to be fair to other users of the Explorer on the same node, and only increase it when you must.
