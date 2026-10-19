---
title: "Operators"
canonical: https://tenzir.com/docs/reference/operators
source: https://tenzir.com/docs/reference/operators.md
section: "Docs"
---

# Operators

> Tenzir comes with a wide range of built-in pipeline operators.

Tenzir comes with a wide range of built-in pipeline operators.

## Analyze

### [rare](operators/rare.md)

Shows the least common values.

```tql
rare auth.token
```

### [reorder](operators/reorder.md)

Orders events by timestamp while accepting bounded event-time disorder.

```tql
reorder on=time, tolerance=2min
```

### [reverse](operators/reverse.md)

Reverses the event order.

```tql
reverse
```

### [sort](operators/sort.md)

Sorts events by the given expressions.

```tql
sort name, -abs(transaction)
```

### [summarize](operators/summarize.md)

Groups events and applies aggregate functions to each group.

```tql
summarize name, sum(amount)
```

### [top](operators/top.md)

Shows the most common values.

```tql
top user
```

### [window](operators/window.md)

Groups events into event-time windows and runs a subpipeline per window.

```tql
window size=1h, on=ts { summarize count() }
```

## Charts

### [chart\_area](operators/chart_area.md)

Plots events on an area chart.

```tql
chart_area …
```

### [chart\_bar](operators/chart_bar.md)

Plots events on an bar chart.

```tql
chart_bar …
```

### [chart\_line](operators/chart_line.md)

Plots events on an line chart.

```tql
chart_line …
```

### [chart\_pie](operators/chart_pie.md)

Plots events on an pie chart.

```tql
chart_pie …
```

## Connecting Pipelines

### [publish](operators/publish.md)

Publishes events to a channel with a topic.

```tql
publish "topic"
```

### [subscribe](operators/subscribe.md)

Subscribes to events from a channel with a topic.

```tql
subscribe "topic"
```

## Contexts

### [context\_create\_bloom\_filter](operators/context_create_bloom_filter.md)

Creates a Bloom filter context.

```tql
context_create_bloom_filter "ctx", capacity=1Mi, fp_probability=0.01
```

### [context\_create\_geoip](operators/context_create_geoip.md)

Creates a GeoIP context.

```tql
context_create_geoip "ctx", db_path="GeoLite2-City.mmdb"
```

### [context\_create\_lookup\_table](operators/context_create_lookup_table.md)

Creates a lookup table context.

```tql
context_create_lookup_table "ctx"
```

### [context\_enrich](operators/context_enrich.md)

Enriches events with data from a context.

```tql
context_enrich "ctx", key=x
```

### [context\_erase](operators/context_erase.md)

Removes entries from a context.

```tql
context_erase "ctx", key=x
```

### [context\_inspect](operators/context_inspect.md)

Resets a context.

```tql
context_inspect "ctx"
```

### [context\_list](operators/context_list.md)

Lists all contexts.

```tql
context_list
```

### [context\_load](operators/context_load.md)

Loads context state.

```tql
context_load "ctx"
```

### [context\_lookup](operators/context_lookup.md)

Performs unified matching.

```tql
context_lookup "ctx", key=field
```

### [context\_remove](operators/context_remove.md)

Deletes a context.

```tql
context_remove "ctx"
```

### [context\_reset](operators/context_reset.md)

Resets a context.

```tql
context_reset "ctx"
```

### [context\_save](operators/context_save.md)

Saves context state.

```tql
context_save "ctx"
```

### [context\_update](operators/context_update.md)

Updates a context with new data.

```tql
context_update "ctx", key=x, value=y
```

## Detection

### [sigma](operators/sigma.md)

Executes Sigma rules on structured events and emits OCSF Detection Findings.

```tql
sigma path="/tmp/rules/"
```

### [yara](operators/yara.md)

Executes YARA-X rules on byte streams and emits OCSF Detection Findings.

```tql
yara path="/path/to/rules"
```

## Encode & Decode

### [compress\_brotli](operators/compress_brotli.md)

Compresses a stream of bytes using Brotli compression.

```tql
compress_brotli, level=10
```

### [compress\_bz2](operators/compress_bz2.md)

Compresses a stream of bytes using bz2 compression.

```tql
compress_bz2, level=9
```

### [compress\_gzip](operators/compress_gzip.md)

Compresses a stream of bytes using gzip compression.

```tql
compress_gzip, level=8
```

### [compress\_lz4](operators/compress_lz4.md)

Compresses a stream of bytes using lz4 compression.

```tql
compress_lz4, level=7
```

### [compress\_zstd](operators/compress_zstd.md)

Compresses a stream of bytes using zstd compression.

```tql
compress_zstd, level=6
```

### [decompress\_brotli](operators/decompress_brotli.md)

Decompresses a stream of bytes in the Brotli format.

```tql
decompress_brotli
```

### [decompress\_bz2](operators/decompress_bz2.md)

Decompresses a stream of bytes in the Bzip2 format.

```tql
decompress_bz2
```

### [decompress\_gzip](operators/decompress_gzip.md)

Decompresses a stream of bytes in the Gzip format.

```tql
decompress_gzip
```

### [decompress\_lz4](operators/decompress_lz4.md)

Decompresses a stream of bytes in the Lz4 format.

```tql
decompress_lz4
```

### [decompress\_zstd](operators/decompress_zstd.md)

Decompresses a stream of bytes in the Zstd format.

```tql
decompress_zstd
```

## Escape Hatches

### [python](operators/python.md)

Executes Python code against each event of the input.

```tql
python "self.x = self.y"
```

### [shell](operators/shell.md)

Executes a system command and hooks its stdin and stdout into the pipeline.

```tql
shell "echo hello"
```

## Filter

### [assert](operators/assert.md)

Drops events and emits a warning if the invariant is violated.

```tql
assert name.starts_with("John")
```

### [assert\_throughput](operators/assert_throughput.md)

Emits a warning if the pipeline does not have the expected throughput

```tql
assert_throughput 1000, within=1s
```

### [deduplicate](operators/deduplicate.md)

Removes duplicate events based on a common key.

```tql
deduplicate src_ip
```

### [head](operators/head.md)

Limits the input to the first `n` events.

```tql
head 20
```

### [sample](operators/sample.md)

Dynamically samples events from a event stream.

```tql
sample 30s, max_samples=2k
```

### [slice](operators/slice.md)

Keeps a range of events within the interval `[begin, end)` stepping by `stride`.

```tql
slice begin=10, end=30
```

### [tail](operators/tail.md)

Limits the input to the last `n` events.

```tql
tail 20
```

### [taste](operators/taste.md)

Limits the input to `n` events per unique schema.

```tql
taste 1
```

### [where](operators/where.md)

Keeps only events for which the given predicate is true.

```tql
where name.starts_with("John")
```

## Flow Control

### [cron](operators/cron.md)

Runs a pipeline periodically according to a cron expression.

```tql
cron "* */10 * * * MON-FRI" { from_http "https://example.org" }
```

### [delay](operators/delay.md)

Delays events relative to a given start time, with an optional speedup.

```tql
delay ts, speed=2.5
```

### [discard](operators/discard.md)

Discards all incoming events.

```tql
discard
```

### [each](operators/each.md)

Spawns a subpipeline for every incoming event, with the event bound to `$this`.

```tql
each { from $this }
```

### [every](operators/every.md)

Runs a pipeline periodically at a fixed interval.

```tql
every 10s { summarize sum(amount) }
```

### [fork](operators/fork.md)

Executes a subpipeline with a copy of the input.

```tql
fork { publish "copy" }
```

### [fork\_merge](operators/fork_merge.md)

Runs multiple subpipelines on the same input and merges their outputs.

```tql
fork_merge { summarize sum(x) }, { summarize count() }
```

### [group](operators/group.md)

Routes events with the same key through the same subpipeline.

```tql
group tenant { summarize count() }
```

### [load\_balance](operators/load_balance.md)

Routes the data to one of multiple subpipelines.

```tql
load_balance $over { publish $over }
```

### [merge](operators/merge.md)

Merges the output of a source subpipeline into the main stream.

```tql
merge { subscribe "extra" }
```

### [parallel](operators/parallel.md)

Runs a subpipeline across multiple parallel workers.

```tql
parallel 4 { parsed = data.parse_json() }
```

### [pass](operators/pass.md)

Does nothing with the input.

```tql
pass
```

### [repeat](operators/repeat.md)

Repeats the input a number of times.

```tql
repeat 100
```

### [throttle](operators/throttle.md)

Limits the bandwidth of a pipeline.

```tql
throttle 100M, within=1min
```

## Host Inspection

### [files](operators/files.md)

Shows file information for a given directory.

```tql
files "/var/log/", recurse=true
```

### [nics](operators/nics.md)

Shows a snapshot of available network interfaces.

```tql
nics
```

### [processes](operators/processes.md)

Shows a snapshot of running processes.

```tql
processes
```

### [sockets](operators/sockets.md)

Shows a snapshot of open sockets.

```tql
sockets
```

## Inputs

### [accept\_elasticsearch](operators/accept_elasticsearch.md)

Accepts incoming Elasticsearch-compatible Bulk API requests and forwards them as events.

```tql
accept_elasticsearch "0.0.0.0:9200"
```

### [accept\_http](operators/accept_http.md)

Accepts incoming HTTP requests and forwards them as events.

```tql
accept_http "0.0.0.0:8080" { read_json }
```

### [accept\_opensearch](operators/accept_opensearch.md)

Accepts incoming OpenSearch-compatible Bulk API requests and forwards them as events.

```tql
accept_opensearch "0.0.0.0:9200"
```

### [accept\_splunk](operators/accept_splunk.md)

Receives events through a Splunk HTTP Event Collector endpoint.

```tql
accept_splunk hec_token=secret("splunk-hec-token")
```

### [accept\_relp](operators/accept_relp.md)

Receives Syslog messages over the Reliable Event Logging Protocol.

```tql
accept_relp "0.0.0.0:2514"
```

### [accept\_tcp](operators/accept_tcp.md)

Accepts incoming TCP or TLS connections and yields events.

```tql
accept_tcp "0.0.0.0:8090" { read_json }
```

### [accept\_udp](operators/accept_udp.md)

Receives UDP datagrams and outputs structured events.

```tql
accept_udp "0.0.0.0:8090"
```

### [accept\_unix\_socket](operators/accept_unix_socket.md)

Accepts incoming Unix domain socket connections and yields events.

```tql
accept_unix_socket "/run/collector.sock" { read_json }
```

### [accept\_wef](operators/accept_wef.md)

Receives Windows events through Windows Event Forwarding.

```tql
accept_wef kerberos={…}, subscriptions=[…]
```

### [accept\_zmq](operators/accept_zmq.md)

Listens on a ZeroMQ endpoint and receives events.

```tql
accept_zmq "tcp://0.0.0.0:5555", prefix="alerts/" { read_json }
```

### [from\_amazon\_cloudwatch](operators/from_amazon_cloudwatch.md)

Reads events from Amazon CloudWatch.

```tql
from_amazon_cloudwatch "/aws/lambda/api", mode="search"
```

### [from\_amazon\_kinesis](operators/from_amazon_kinesis.md)

Receives records from an Amazon Kinesis data stream.

```tql
from_amazon_kinesis "security-events"
```

### [from\_amazon\_sqs](operators/from_amazon_sqs.md)

Receives messages from an Amazon SQS queue.

```tql
from_amazon_sqs "sqs://tenzir", poll_time=5s
```

### [from\_amqp](operators/from_amqp.md)

Receives messages from an AMQP queue.

```tql
from_amqp "amqp://admin:pass@0.0.0.1:5672/vhost", queue="events"
```

### [from\_azure\_blob\_storage](operators/from_azure_blob_storage.md)

Reads one or multiple files from Azure Blob Storage.

```tql
from_azure_blob_storage "abfs://container/data/**.json"
```

### [from\_azure\_log\_analytics](operators/from_azure_log_analytics.md)

Runs a KQL query against an Azure Log Analytics workspace and reads its results.

```tql
from_azure_log_analytics "SecurityEvent | take 10", workspace_id="…", azure_auth={…}
```

### [from\_clickhouse](operators/from_clickhouse.md)

Reads rows or metadata from ClickHouse.

```tql
from_clickhouse table="my_table"
```

### [from\_file](operators/from_file.md)

Reads one or multiple files from a filesystem.

```tql
from_file "s3://data/**.json"
```

### [from\_fluent\_bit](operators/from_fluent_bit.md)

Receives events via Fluent Bit.

```tql
from_fluent_bit "mqtt"
```

### [from\_ftp](operators/from_ftp.md)

Downloads bytes via FTP and parses them with a subpipeline.

```tql
from_ftp "ftp.example.org/events.ndjson" { read_ndjson }
```

### [from\_google\_cloud\_pubsub](operators/from_google_cloud_pubsub.md)

Subscribes to a Google Cloud Pub/Sub subscription and yields events.

```tql
from_google_cloud_pubsub project_id="my-project", subscription_id="my-sub"
```

### [from\_google\_cloud\_storage](operators/from_google_cloud_storage.md)

Reads one or multiple files from Google Cloud Storage.

```tql
from_google_cloud_storage "gs://my-bucket/data/**.json"
```

### [from\_http](operators/from_http.md)

Sends an HTTP/1.1 request and returns the response as events.

```tql
from_http "https://example.com/api/events.json"
```

### [from\_hydrolix](operators/from_hydrolix.md)

Reads events from a Hydrolix table or SQL query.

```tql
from_hydrolix "https://…", token=…, table="…"
```

### [from\_kafka](operators/from_kafka.md)

Receives events from an Apache Kafka topic.

```tql
from_kafka "logs"
```

### [from\_microsoft\_365\_activity](operators/from_microsoft_365_activity.md)

Reads unified audit records from the Microsoft 365 Management Activity API.

```tql
from_microsoft_365_activity auth={…}, content_types=["Audit.General"]
```

### [from\_microsoft\_defender](operators/from_microsoft_defender.md)

Runs a Microsoft Defender advanced hunting query and reads its results.

```tql
from_microsoft_defender "DeviceEvents | take 10", azure_auth={…}
```

### [from\_microsoft\_graph](operators/from_microsoft_graph.md)

Reads events from a Microsoft Graph collection.

```tql
from_microsoft_graph "auditLogs/signIns", auth={…}
```

### [from\_microsoft\_sql](operators/from_microsoft_sql.md)

Reads events from Microsoft SQL Server or Azure SQL Database.

```tql
from_microsoft_sql table="dbo.events", host="sql.example.com", database="security", tls=true
```

### [from\_mysql](operators/from_mysql.md)

Reads events from a MySQL database.

```tql
from_mysql table="users", host="db.example.com", database="mydb"
```

### [from\_nats](operators/from_nats.md)

Consumes messages from a NATS JetStream subject.

```tql
from_nats "alerts"
```

### [from\_nic](operators/from_nic.md)

Captures packets from a network interface and outputs events.

```tql
from_nic "eth0"
```

### [from\_s3](operators/from_s3.md)

Reads one or multiple files from Amazon S3.

```tql
from_s3 "s3://my-bucket/data/**.json"
```

### [from\_sentinelone\_data\_lake](operators/from_sentinelone_data_lake.md)

Queries SentinelOne Singularity Data Lake with TQL.

```tql
from_sentinelone_data_lake "https://…", …
```

### [from\_splunk](operators/from_splunk.md)

Runs a Splunk search and returns its results as events.

```tql
from_splunk "https://splunk.example.com:8089", …
```

### [from\_stdin](operators/from_stdin.md)

Reads and parses events from standard input.

```tql
from_stdin { read_json }
```

### [from\_tcp](operators/from_tcp.md)

Connects to a remote TCP or TLS endpoint and receives events.

```tql
from_tcp "example.org:4000" {
  read_json
}
```

### [from\_unix\_socket](operators/from_unix_socket.md)

Connects to a Unix domain socket and receives events.

```tql
from_unix_socket "/run/collector.sock" {
  read_json
}
```

### [from\_velociraptor](operators/from_velociraptor.md)

Submits VQL to a Velociraptor server and returns the response as events.

```tql
from_velociraptor subscribe="Windows"
```

### [from\_zmq](operators/from_zmq.md)

Connects to a remote ZeroMQ publisher and receives events.

```tql
from_zmq "tcp://collector.example.com:5555", prefix="alerts/" { read_json }
```

## Internals

### [api](operators/api.md)

Use Tenzir's REST API directly from a pipeline.

```tql
api "/pipeline/list"
```

### [batch](operators/batch.md)

The `batch` operator controls the batch size of events.

```tql
batch timeout=1s
```

### [cache](operators/cache.md)

An in-memory cache shared between pipelines.

```tql
cache "w01wyhTZm3", ttl=10min
```

### [measure](operators/measure.md)

Replaces the input with metrics describing the input.

```tql
measure
```

### [quiet](operators/quiet.md)

Suppresses runtime warnings from a pipeline.

```tql
quiet { assert false, message="this warning will be suppressed" }
```

### [strict](operators/strict.md)

Treats all warnings as errors.

```tql
strict { assert false }
```

### [unordered](operators/unordered.md)

Removes ordering assumptions from a pipeline.

```tql
unordered { read_ndjson }
```

## Modify

### [ai\_decide](operators/ai_decide.md)

Asks a decision model typed questions about each event and adds the answers.

```tql
ai_decide "Is this event malicious?", model="english", endpoint="http://127.0.0.1:8000/v1"
```

### [ai\_prompt](operators/ai_prompt.md)

Sends events to an OpenAI-compatible Responses API endpoint and adds the model response.

```tql
ai_prompt model="qwen3.8"
```

### [dns\_lookup](operators/dns_lookup.md)

Performs DNS lookups to resolve IP addresses to hostnames or hostnames to IP addresses.

```tql
dns_lookup ip_address, result=dns_info
```

### [drop](operators/drop.md)

Removes fields from the event.

```tql
drop name, metadata.id
```

### [drop\_null\_fields](operators/drop_null_fields.md)

Removes fields containing null values from the event.

```tql
drop_null_fields name, metadata.id
```

### [enumerate](operators/enumerate.md)

Add a field with the number of preceding events.

```tql
enumerate num
```

### [lag](operators/lag.md)

Adds a preceding value or event to each current event.

```tql
lag value=location, into=previous_location
```

### [replace](operators/replace.md)

Replaces all occurrences of a value with another value.

```tql
replace what=42, with=null
```

### [select](operators/select.md)

Selects some values and discards the rest.

```tql
select name, id=metadata.id
```

### [set](operators/set.md)

Assigns a value to a field, creating it if necessary.

```tql
name = "Tenzir"
```

### [timeshift](operators/timeshift.md)

Adjusts timestamps relative to a given start time, with an optional speedup.

```tql
timeshift ts, start=2020-01-01
```

### [unroll](operators/unroll.md)

Returns a new event for each member of a list or a record in an event, duplicating the surrounding event.

```tql
unroll names
```

## Node

### [diagnostics](operators/diagnostics.md)

Retrieves diagnostic events from a Tenzir node.

```tql
diagnostics
```

### [metrics](operators/metrics.md)

Retrieves metrics events from a Tenzir node.

```tql
metrics "cpu"
```

### [openapi](operators/openapi.md)

Shows the node's OpenAPI specification.

```tql
openapi
```

### [plugins](operators/plugins.md)

Shows all available plugins and built-ins.

```tql
plugins
```

### [version](operators/version.md)

Shows the current version.

```tql
version
```

## OCSF

### [ocsf\_cast](operators/ocsf_cast.md)

Casts incoming events to their OCSF type.

```tql
ocsf_cast
```

### [ocsf\_derive](operators/ocsf_derive.md)

Automatically assigns enum strings from their integer counterparts and vice versa.

```tql
ocsf_derive
```

### [ocsf\_trim](operators/ocsf_trim.md)

Drops fields from OCSF events to reduce their size.

```tql
ocsf_trim
```

## Outputs

### [serve\_http](operators/serve_http.md)

Starts an HTTP server and streams bytes produced by a nested pipeline to connected clients.

```tql
serve_http "0.0.0.0:8080" { write_ndjson }
```

### [serve\_tcp](operators/serve_tcp.md)

Listens for incoming TCP connections and sends events to all connected clients.

```tql
serve_tcp "0.0.0.0:8090" { write_json }
```

### [serve\_zmq](operators/serve_zmq.md)

Listens on a ZeroMQ endpoint and sends events.

```tql
serve_zmq "tcp://0.0.0.0:5555", encoding="json", prefix=f"{kind}/"
```

### [to\_amazon\_cloudwatch](operators/to_amazon_cloudwatch.md)

Sends events to Amazon CloudWatch.

```tql
to_amazon_cloudwatch "/tenzir/events", stream="default"
```

### [to\_amazon\_kinesis](operators/to_amazon_kinesis.md)

Sends records to an Amazon Kinesis data stream.

```tql
to_amazon_kinesis "security-events"
```

### [to\_amazon\_security\_lake](operators/to_amazon_security_lake.md)

Sends OCSF events to Amazon Security Lake.

```tql
to_amazon_security_lake "s3://…"
```

### [to\_amazon\_sqs](operators/to_amazon_sqs.md)

Sends messages to an Amazon SQS queue.

```tql
to_amazon_sqs "sqs://tenzir"
```

### [to\_amqp](operators/to_amqp.md)

Sends messages to an AMQP exchange.

```tql
to_amqp "amqp://admin:pass@0.0.0.1:5672/vhost"
```

### [to\_azure\_blob\_storage](operators/to_azure_blob_storage.md)

Writes events to one or multiple blobs in Azure Blob Storage.

```tql
to_azure_blob_storage "abfs://container/data/{uuid}.json" { write_ndjson }
```

### [to\_azure\_log\_analytics](operators/to_azure_log_analytics.md)

Sends events to the Microsoft Azure Logs Ingestion API.

```tql
to_azure_log_analytics tenant_id="...", workspace_id="..."
```

### [to\_clickhouse](operators/to_clickhouse.md)

Sends events to a ClickHouse table.

```tql
to_clickhouse table="my_table"
```

### [to\_elasticsearch](operators/to_elasticsearch.md)

Sends events to an Elasticsearch-compatible Bulk API.

```tql
to_elasticsearch "localhost:9200", …
```

### [to\_file](operators/to_file.md)

Writes events to one or multiple files on a filesystem.

```tql
to_file "/tmp/out.json" { write_ndjson }
```

### [to\_fluent\_bit](operators/to_fluent_bit.md)

Sends events via Fluent Bit.

```tql
to_fluent_bit "elasticsearch" …
```

### [to\_ftp](operators/to_ftp.md)

Prints events to bytes and uploads them via FTP.

```tql
to_ftp "ftp.example.org/events.ndjson" { write_ndjson }
```

### [to\_google\_cloud\_logging](operators/to_google_cloud_logging.md)

Sends events to Google Cloud Logging.

```tql
to_google_cloud_logging …
```

### [to\_google\_cloud\_monitoring](operators/to_google_cloud_monitoring.md)

Sends metric events to Google Cloud Monitoring.

```tql
to_google_cloud_monitoring project="my-project"
```

### [to\_google\_cloud\_pubsub](operators/to_google_cloud_pubsub.md)

Publishes events to a Google Cloud Pub/Sub topic.

```tql
to_google_cloud_pubsub project_id="my-project", topic_id="alerts", message=text
```

### [to\_google\_cloud\_storage](operators/to_google_cloud_storage.md)

Writes events to one or multiple objects in Google Cloud Storage.

```tql
to_google_cloud_storage "gs://my-bucket/data/{uuid}.json" { write_ndjson }
```

### [to\_google\_secops](operators/to_google_secops.md)

Sends raw logs, UDM events, or entities to a Google SecOps Chronicle instance.

```tql
to_google_secops …
```

### [to\_http](operators/to_http.md)

Sends events as a single HTTP request to a webhook or API endpoint.

```tql
to_http "https://example.com/webhook" { write_ndjson }
```

### [to\_hydrolix](operators/to_hydrolix.md)

Sends events to the Hydrolix HTTP streaming ingest API.

```tql
to_hydrolix "https://…", table="…", token=…
```

### [to\_kafka](operators/to_kafka.md)

Sends messages to an Apache Kafka topic.

```tql
to_kafka "topic"
```

### [to\_nats](operators/to_nats.md)

Publishes messages to a NATS JetStream subject.

```tql
to_nats "alerts"
```

### [to\_opensearch](operators/to_opensearch.md)

Sends events to an OpenSearch-compatible Bulk API.

```tql
to_opensearch "localhost:9200", …
```

### [to\_prometheus](operators/to_prometheus.md)

Sends metric events to a Prometheus Remote Write receiver.

```tql
to_prometheus "https://prometheus.example/api/v1/write"
```

### [to\_s3](operators/to_s3.md)

Writes events to one or multiple objects in Amazon S3.

```tql
to_s3 "s3://my-bucket/data/{uuid}.json" { write_ndjson }
```

### [to\_sentinelone\_data\_lake](operators/to_sentinelone_data_lake.md)

Sends security events to SentinelOne Singularity Data Lake via REST API.

```tql
to_sentinelone_data_lake "https://…", …
```

### [to\_snowflake](operators/to_snowflake.md)

Sends events to a Snowflake database.

```tql
to_snowflake account_identifier="…
```

### [to\_splunk](operators/to_splunk.md)

Sends events to a Splunk HTTP Event Collector (HEC).

```tql
to_splunk "localhost:8088", …
```

### [to\_stdout](operators/to_stdout.md)

Writes events to standard output.

```tql
to_stdout
```

### [to\_tcp](operators/to_tcp.md)

Connects to a remote TCP or TLS endpoint and sends events.

```tql
to_tcp "collector.example.com:5044" { write_json }
```

### [to\_udp](operators/to_udp.md)

Sends one UDP datagram per input event.

```tql
to_udp "127.0.0.1:514"
```

### [to\_unix\_socket](operators/to_unix_socket.md)

Connects to a Unix domain socket and sends events.

```tql
to_unix_socket "/run/collector.sock" { write_json }
```

### [to\_zmq](operators/to_zmq.md)

Connects to a remote ZeroMQ subscriber endpoint and sends events.

```tql
to_zmq "tcp://collector.example.com:5555", encoding="json", prefix=f"{kind}/"
```

## Packages

### [package\_add](operators/package_add.md)

Installs a package.

```tql
package_add "suricata-ocsf"
```

### [package\_list](operators/package_list.md)

Shows installed packages.

```tql
package_list
```

### [package\_remove](operators/package_remove.md)

Uninstalls a package.

```tql
package_remove "suricata-ocsf"
```

## Parsing

### [read\_all](operators/read_all.md)

Parses an incoming bytes stream into a single event.

```tql
read_all binary=true
```

### [read\_auto](operators/read_auto.md)

Detects the input format of a byte stream and selects a matching reader.

```tql
read_auto fallback="lines"
```

### [read\_avro](operators/read_avro.md)

Parses Apache Avro binary data into events.

```tql
read_avro
```

### [read\_bitz](operators/read_bitz.md)

Parses bytes as \*BITZ\* format.

```tql
read_bitz
```

### [read\_cef](operators/read_cef.md)

Parses an incoming Common Event Format (CEF) stream into events.

```tql
read_cef
```

### [read\_csv](operators/read_csv.md)

Read CSV (Comma-Separated Values) from a byte stream.

```tql
read_csv null_value="-"
```

### [read\_delimited](operators/read_delimited.md)

Parses an incoming bytes stream into events using a string as delimiter.

```tql
read_delimited "|"
```

### [read\_delimited\_regex](operators/read_delimited_regex.md)

Parses an incoming bytes stream into events using a regular expression as delimiter.

```tql
read_delimited_regex r"\s+"
```

### [read\_feather](operators/read_feather.md)

Parses an incoming Feather byte stream into events.

```tql
read_feather
```

### [read\_gelf](operators/read_gelf.md)

Parses an incoming GELF stream into events.

```tql
read_gelf
```

### [read\_grok](operators/read_grok.md)

Parses lines of input with a grok pattern.

```tql
read_grok "%{IP:client} %{WORD:action}"
```

### [read\_json](operators/read_json.md)

Parses an incoming JSON stream into events.

```tql
read_json arrays_of_objects=true
```

### [read\_kv](operators/read_kv.md)

Read Key-Value pairs from a byte stream.

```tql
read_kv r"(\s+)[A-Z_]+:", r":\s*"
```

### [read\_leef](operators/read_leef.md)

Parses an incoming LEEF stream into events.

```tql
read_leef
```

### [read\_lines](operators/read_lines.md)

Parses an incoming bytes stream into events.

```tql
read_lines
```

### [read\_ndjson](operators/read_ndjson.md)

Parses an incoming NDJSON (newline-delimited JSON) stream into events.

```tql
read_ndjson
```

### [read\_netflow](operators/read_netflow.md)

Parses NetFlow v5, NetFlow v9, and IPFIX messages into flow events.

```tql
read_netflow
```

### [read\_parquet](operators/read_parquet.md)

Reads events from a Parquet byte stream.

```tql
read_parquet
```

### [read\_pcap](operators/read_pcap.md)

Reads raw network packets in PCAP file format.

```tql
read_pcap
```

### [read\_ssv](operators/read_ssv.md)

Read SSV (Space-Separated Values) from a byte stream.

```tql
read_ssv header="name count"
```

### [read\_suricata](operators/read_suricata.md)

Parses an incoming Suricata EVE JSON stream into events.

```tql
read_suricata
```

### [read\_syslog](operators/read_syslog.md)

Parses an incoming Syslog stream into events.

```tql
read_syslog
```

### [read\_tql](operators/read_tql.md)

Parses an incoming byte stream of TQL-formatted records into events.

```tql
read_tql
```

### [read\_tsv](operators/read_tsv.md)

Read TSV (Tab-Separated Values) from a byte stream.

```tql
read_tsv auto_expand=true
```

### [read\_xsv](operators/read_xsv.md)

Read XSV from a byte stream.

```tql
read_xsv ";", ":", "N/A"
```

### [read\_yaml](operators/read_yaml.md)

Parses an incoming YAML stream into events.

```tql
read_yaml
```

### [read\_zeek\_json](operators/read_zeek_json.md)

Parse an incoming Zeek JSON stream into events.

```tql
read_zeek_json
```

### [read\_zeek\_tsv](operators/read_zeek_tsv.md)

Parses an incoming `Zeek TSV` stream into events.

```tql
read_zeek_tsv
```

## Pipelines

### [pipeline\_activity](operators/pipeline_activity.md)

Summarizes the activity of pipelines.

```tql
pipeline_activity range=1d, interval=1h
```

### [pipeline\_detach](operators/pipeline_detach.md)

Starts a pipeline in the node.

```tql
pipeline_detach { … }
```

### [pipeline\_list](operators/pipeline_list.md)

Shows managed pipelines.

```tql
pipeline_list
```

### [pipeline\_run](operators/pipeline_run.md)

Starts a pipeline in the node and waits for it to complete.

```tql
pipeline_run { … }
```

## Printing

### [write\_all](operators/write_all.md)

Concatenates one field from all input events into a byte stream.

```tql
write_all data
```

### [write\_bitz](operators/write_bitz.md)

Writes events in \*BITZ\* format.

```tql
write_bitz
```

### [write\_csv](operators/write_csv.md)

Transforms event stream to CSV (Comma-Separated Values) byte stream.

```tql
write_csv
```

### [write\_delimited](operators/write_delimited.md)

Frames string or blob event values as bytes with a separator after each value.

```tql
write_delimited data, "|"
```

### [write\_feather](operators/write_feather.md)

Transforms the input event stream to Feather byte stream.

```tql
write_feather
```

### [write\_json](operators/write_json.md)

Transforms the input event stream to a JSON byte stream.

```tql
write_json
```

### [write\_kv](operators/write_kv.md)

Writes events in a Key-Value format.

```tql
write_kv
```

### [write\_lines](operators/write_lines.md)

Writes events as key-value pairsthe \*values\* of an event.

```tql
write_lines
```

### [write\_ndjson](operators/write_ndjson.md)

Transforms the input event stream to a Newline-Delimited JSON byte stream.

```tql
write_ndjson
```

### [write\_parquet](operators/write_parquet.md)

Transforms event stream to a Parquet byte stream.

```tql
write_parquet
```

### [write\_pcap](operators/write_pcap.md)

Transforms event stream to PCAP byte stream.

```tql
write_pcap
```

### [write\_ssv](operators/write_ssv.md)

Transforms event stream to SSV (Space-Separated Values) byte stream.

```tql
write_ssv
```

### [write\_syslog](operators/write_syslog.md)

Writes events as syslog.

```tql
write_syslog
```

### [write\_tql](operators/write_tql.md)

Transforms the input event stream to a TQL notation byte stream.

```tql
write_tql
```

### [write\_tsv](operators/write_tsv.md)

Transforms event stream to TSV (Tab-Separated Values) byte stream.

```tql
write_tsv
```

### [write\_xsv](operators/write_xsv.md)

Transforms event stream to XSV byte stream.

```tql
write_xsv
```

### [write\_yaml](operators/write_yaml.md)

Transforms the input event stream to YAML byte stream.

```tql
write_yaml
```

### [write\_zeek\_tsv](operators/write_zeek_tsv.md)

Transforms event stream into Zeek Tab-Separated Value byte stream.

```tql
write_zeek_tsv
```

## Storage

### [export](operators/export.md)

Retrieves events from a Tenzir node.

```tql
export
```

### [fields](operators/fields.md)

Retrieves all fields stored at a node.

```tql
fields
```

### [import](operators/import.md)

Imports events into a Tenzir node.

```tql
import
```

### [partitions](operators/partitions.md)

Retrieves metadata about events stored at a node.

```tql
partitions src_ip == 1.2.3.4
```

### [schemas](operators/schemas.md)

Retrieves all schemas for events stored at a node.

```tql
schemas
```
