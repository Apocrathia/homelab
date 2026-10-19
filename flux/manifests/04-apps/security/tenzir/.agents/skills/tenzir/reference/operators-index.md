# Operator Index

## Analyze

- [rare](operators/rare.md): Shows the least common values.
- [reorder](operators/reorder.md): Orders events by timestamp while accepting bounded event-time disorder.
- [reverse](operators/reverse.md): Reverses the event order.
- [sort](operators/sort.md): Sorts events by the given expressions.
- [summarize](operators/summarize.md): Groups events and applies aggregate functions to each group.
- [top](operators/top.md): Shows the most common values.
- [window](operators/window.md): Runs a subpipeline over time-based or count-based windows.

## Charts

- [chart_area](operators/chart_area.md): Plots events on an area chart.
- [chart_bar](operators/chart_bar.md): Plots events on an bar chart.
- [chart_line](operators/chart_line.md): Plots events on an line chart.
- [chart_pie](operators/chart_pie.md): Plots events on an pie chart.

## Connecting Pipelines

- [publish](operators/publish.md): Publishes events to a channel with a topic.
- [subscribe](operators/subscribe.md): Subscribes to events from a channel with a topic.

## Contexts

- [context_create_bloom_filter](operators/context_create_bloom_filter.md): Creates a Bloom filter context.
- [context_create_geoip](operators/context_create_geoip.md): Creates a GeoIP context.
- [context_create_lookup_table](operators/context_create_lookup_table.md): Creates a lookup table context.
- [context_enrich](operators/context_enrich.md): Enriches events with data from a context.
- [context_erase](operators/context_erase.md): Removes entries from a context.
- [context_inspect](operators/context_inspect.md): Resets a context.
- [context_list](operators/context_list.md): Lists all contexts
- [context_load](operators/context_load.md): Loads context state.
- [context_lookup](operators/context_lookup.md): Performs live filtering of the import feed using a context and translates context updates into historical queries.
- [context_remove](operators/context_remove.md): Deletes a context.
- [context_reset](operators/context_reset.md): Resets a context.
- [context_save](operators/context_save.md): Saves context state.
- [context_update](operators/context_update.md): Updates a context with new data.

## Detection

- [sigma](operators/sigma.md): Evaluate Sigma detection rules against structured events.
- [yara](operators/yara.md): Executes YARA-X rules on a finite byte stream.

## Encode & Decode

- [compress_brotli](operators/compress_brotli.md): Compresses a stream of bytes using Brotli compression.
- [compress_bz2](operators/compress_bz2.md): Compresses a stream of bytes using bz2 compression.
- [compress_gzip](operators/compress_gzip.md): Compresses a stream of bytes using gzip compression.
- [compress_lz4](operators/compress_lz4.md): Compresses a stream of bytes using lz4 compression.
- [compress_zstd](operators/compress_zstd.md): Compresses a stream of bytes using zstd compression.
- [decompress_brotli](operators/decompress_brotli.md): Decompresses a stream of bytes in the Brotli format.
- [decompress_bz2](operators/decompress_bz2.md): Decompresses a stream of bytes in the Bzip2 format.
- [decompress_gzip](operators/decompress_gzip.md): Decompresses a stream of bytes in the Gzip format.
- [decompress_lz4](operators/decompress_lz4.md): Decompresses a stream of bytes in the Lz4 format.
- [decompress_zstd](operators/decompress_zstd.md): Decompresses a stream of bytes in the Zstd format.

## Escape Hatches

- [python](operators/python.md): Executes Python code against each event of the input.
- [shell](operators/shell.md): Executes a system command and hooks its stdin and stdout into the pipeline.

## Filter

- [assert](operators/assert.md): Drops events and emits a warning if the invariant is violated.
- [assert_throughput](operators/assert_throughput.md): Emits a warning if the pipeline is outside the expected throughput range.
- [deduplicate](operators/deduplicate.md): Removes duplicate events based on a common key.
- [head](operators/head.md): Limits the input to the first `n` events.
- [sample](operators/sample.md): Dynamically samples events from a event stream.
- [slice](operators/slice.md): Keeps a range of events within the interval `[begin, end)` stepping by `stride`.
- [tail](operators/tail.md): Limits the input to the last `n` events.
- [taste](operators/taste.md): Limits the input to `n` events per unique schema.
- [where](operators/where.md): Keeps only events for which the given predicate is true.

## Flow Control

- [cron](operators/cron.md): Runs a pipeline periodically according to a cron expression.
- [delay](operators/delay.md): Delays events relative to a given start time, with an optional speedup.
- [discard](operators/discard.md): Discards all incoming events.
- [each](operators/each.md): Spawns a subpipeline for every incoming event, with the event bound to `$this`.
- [every](operators/every.md): Runs a pipeline periodically at a fixed interval.
- [fork](operators/fork.md): Executes a subpipeline with a copy of the input.
- [fork_merge](operators/fork_merge.md): Runs multiple subpipelines on the same input and merges their outputs.
- [group](operators/group.md): Routes events with the same key through the same subpipeline.
- [load_balance](operators/load_balance.md): Routes the data to one of multiple subpipelines.
- [merge](operators/merge.md): Merges the output of a source subpipeline into the main stream.
- [parallel](operators/parallel.md): Annotates desired parallelization degree.
- [pass](operators/pass.md): Does nothing with the input.
- [repeat](operators/repeat.md): Repeats the input a number of times.
- [throttle](operators/throttle.md): Limits the throughput of events in a pipeline.

## Host Inspection

- [files](operators/files.md): Shows file information for a given directory.
- [nics](operators/nics.md): Shows a snapshot of available network interfaces.
- [processes](operators/processes.md): Shows a snapshot of running processes.
- [sockets](operators/sockets.md): Shows a snapshot of open sockets.

## Inputs

- [accept_elasticsearch](operators/accept_elasticsearch.md): Accepts incoming Elasticsearch-compatible Bulk API requests and forwards them as events.
- [accept_http](operators/accept_http.md): Accepts incoming HTTP requests and forwards them as events.
- [accept_opensearch](operators/accept_opensearch.md): Accepts incoming OpenSearch-compatible Bulk API requests and forwards them as events.
- [accept_splunk](operators/accept_splunk.md): Receives events through a Splunk HTTP Event Collector (HEC) endpoint.
- [accept_relp](operators/accept_relp.md): Receives Syslog messages over the [Reliable Event Logging Protocol (RELP)](https://tenzir.com/integrations/relp.md).
- [accept_tcp](operators/accept_tcp.md): Listens for incoming TCP or TLS connections and receives events.
- [accept_udp](operators/accept_udp.md): Receives UDP datagrams and outputs structured events.
- [accept_unix_socket](operators/accept_unix_socket.md): Listens for incoming Unix domain socket connections and receives events.
- [accept_wef](operators/accept_wef.md): Receives Windows events through [Windows Event Forwarding (WEF)](https://tenzir.com/integrations/microsoft/windows-event-forwarding.md).
- [accept_zmq](operators/accept_zmq.md): Listens on a ZeroMQ endpoint and receives events.
- [from_amazon_cloudwatch](operators/from_amazon_cloudwatch.md): Reads events from Amazon CloudWatch.
- [from_amazon_kinesis](operators/from_amazon_kinesis.md): Receives records from an [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) stream.
- [from_amazon_sqs](operators/from_amazon_sqs.md): Receives messages from an [Amazon SQS](https://docs.aws.amazon.com/sqs/) queue.
- [from_amqp](operators/from_amqp.md): Receives messages from an AMQP queue.
- [from_azure_blob_storage](operators/from_azure_blob_storage.md): Reads one or multiple files from Azure Blob Storage.
- [from_azure_log_analytics](operators/from_azure_log_analytics.md): Runs a KQL query against an Azure Log Analytics workspace and reads its results.
- [from_clickhouse](operators/from_clickhouse.md): Fetches data from a ClickHouse server.
- [from_file](operators/from_file.md): Reads one or multiple files from a filesystem.
- [from_fluent_bit](operators/from_fluent_bit.md): Receives events via Fluent Bit.
- [from_ftp](operators/from_ftp.md): Downloads bytes via FTP or FTPS and parses them with a subpipeline.
- [from_google_cloud_pubsub](operators/from_google_cloud_pubsub.md): Subscribes to a Google Cloud Pub/Sub subscription and yields events.
- [from_google_cloud_storage](operators/from_google_cloud_storage.md): Reads one or multiple files from Google Cloud Storage.
- [from_http](operators/from_http.md): Sends an HTTP/1.1 request and returns the response as events.
- [from_hydrolix](operators/from_hydrolix.md): Reads events from a [Hydrolix](https://hydrolix.io) table or SQL query.
- [from_kafka](operators/from_kafka.md): Receives events from an Apache Kafka topic.
- [from_microsoft_365_activity](operators/from_microsoft_365_activity.md): Reads unified audit records from the Microsoft 365 Management Activity API.
- [from_microsoft_defender](operators/from_microsoft_defender.md): Runs a Microsoft Defender advanced hunting query and reads its results.
- [from_microsoft_graph](operators/from_microsoft_graph.md): Reads events from a Microsoft Graph collection.
- [from_microsoft_sql](operators/from_microsoft_sql.md): Reads events from Microsoft SQL Server or Azure SQL Database.
- [from_mysql](operators/from_mysql.md): Reads events from a MySQL database.
- [from_nats](operators/from_nats.md): Consumes messages from a NATS JetStream subject.
- [from_nic](operators/from_nic.md): Captures packets from a network interface and outputs events.
- [from_s3](operators/from_s3.md): Reads one or multiple files from Amazon S3.
- [from_sentinelone_data_lake](operators/from_sentinelone_data_lake.md): Queries SentinelOne Singularity Data Lake with TQL.
- [from_splunk](operators/from_splunk.md): Runs a Splunk search and returns its results as events.
- [from_stdin](operators/from_stdin.md): Reads and parses events from standard input.
- [from_tcp](operators/from_tcp.md): Connects to a remote TCP or TLS endpoint and receives events.
- [from_unix_socket](operators/from_unix_socket.md): Connects to a Unix domain socket and receives events.
- [from_velociraptor](operators/from_velociraptor.md): Submits VQL to a Velociraptor server and returns the response as events.
- [from_zmq](operators/from_zmq.md): Connects to a remote ZeroMQ publisher and receives events.

## Internals

- [api](operators/api.md): Use Tenzir’s REST API directly from a pipeline.
- [batch](operators/batch.md): The `batch` operator controls the batch size of events.
- [cache](operators/cache.md): An in-memory cache shared between pipelines.
- [measure](operators/measure.md): Replaces the input with metrics describing the input.
- [quiet](operators/quiet.md): Suppresses runtime warnings from a pipeline.
- [strict](operators/strict.md): Treats all warnings as errors.
- [unordered](operators/unordered.md): Removes ordering assumptions from a pipeline.

## Modify

- [ai_decide](operators/ai_decide.md): Asks a decision model typed questions about each event and adds the answers to the event.
- [ai_prompt](operators/ai_prompt.md): Sends each input event to an OpenAI-compatible Responses API endpoint and adds the model response to the event.
- [dns_lookup](operators/dns_lookup.md): Performs DNS lookups to resolve IP addresses to hostnames or hostnames to IP addresses.
- [drop](operators/drop.md): Removes fields from the event.
- [drop_null_fields](operators/drop_null_fields.md): Removes fields containing null values from the event.
- [enumerate](operators/enumerate.md): Add a field with the number of preceding events.
- [lag](operators/lag.md): Adds a preceding value or event to each current event.
- [replace](operators/replace.md): Replaces all occurrences of a value with another value.
- [select](operators/select.md): Selects some values and discards the rest.
- [set](operators/set.md): Assigns a value to a field, creating it if necessary.
- [timeshift](operators/timeshift.md): Adjusts timestamps relative to a given start time, with an optional speedup.
- [unroll](operators/unroll.md): Returns a new event for each member of a list or a record in an event, duplicating the surrounding event.

## Node

- [diagnostics](operators/diagnostics.md): Retrieves diagnostic events from a Tenzir node.
- [metrics](operators/metrics.md): Retrieves metrics events from a Tenzir node.
- [openapi](operators/openapi.md): Shows the node’s OpenAPI specification.
- [plugins](operators/plugins.md): Shows all available plugins and built-ins.
- [version](operators/version.md): Shows the current version.

## OCSF

- [ocsf_cast](operators/ocsf_cast.md): Casts incoming events to their OCSF type.
- [ocsf_derive](operators/ocsf_derive.md): Automatically assigns enum strings from their integer counterparts and vice versa.
- [ocsf_trim](operators/ocsf_trim.md): Drops fields from OCSF events to reduce their size.

## Outputs

- [serve_http](operators/serve_http.md): Starts an HTTP server and streams bytes produced by a nested pipeline to connected clients.
- [serve_tcp](operators/serve_tcp.md): Listens for incoming TCP connections and sends events to all connected clients.
- [serve_zmq](operators/serve_zmq.md): Listens on a ZeroMQ endpoint and sends events.
- [to_amazon_cloudwatch](operators/to_amazon_cloudwatch.md): Sends events to Amazon CloudWatch Logs.
- [to_amazon_kinesis](operators/to_amazon_kinesis.md): Sends records to an [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) stream.
- [to_amazon_security_lake](operators/to_amazon_security_lake.md): Sends OCSF events to Amazon Security Lake.
- [to_amazon_sqs](operators/to_amazon_sqs.md): Sends messages to an [Amazon SQS](https://docs.aws.amazon.com/sqs/) queue.
- [to_amqp](operators/to_amqp.md): Sends messages to an AMQP exchange.
- [to_azure_blob_storage](operators/to_azure_blob_storage.md): Writes events to one or multiple blobs in Azure Blob Storage.
- [to_azure_log_analytics](operators/to_azure_log_analytics.md): Sends events to the Microsoft Azure Logs Ingestion API.
- [to_clickhouse](operators/to_clickhouse.md): Sends events to a ClickHouse table.
- [to_elasticsearch](operators/to_elasticsearch.md): Sends events to a Bulk API compatible with Elasticsearch.
- [to_file](operators/to_file.md): Writes events to one or multiple files on a filesystem.
- [to_fluent_bit](operators/to_fluent_bit.md): Sends events via Fluent Bit.
- [to_ftp](operators/to_ftp.md): Prints events to bytes and uploads them via FTP or FTPS.
- [to_google_cloud_logging](operators/to_google_cloud_logging.md): Sends events to Google Cloud Logging.
- [to_google_cloud_monitoring](operators/to_google_cloud_monitoring.md): Sends metric events to Google Cloud Monitoring.
- [to_google_cloud_pubsub](operators/to_google_cloud_pubsub.md): Publishes events to a Google Cloud Pub/Sub topic.
- [to_google_cloud_storage](operators/to_google_cloud_storage.md): Writes events to one or multiple objects in Google Cloud Storage.
- [to_google_secops](operators/to_google_secops.md): Sends raw logs, UDM events, or entities to a Google SecOps Chronicle instance.
- [to_http](operators/to_http.md): Sends events as a single HTTP request to a webhook or API endpoint.
- [to_hydrolix](operators/to_hydrolix.md): Sends events to the [Hydrolix](https://hydrolix.io) HTTP streaming ingest API.
- [to_kafka](operators/to_kafka.md): Sends messages to an Apache Kafka topic.
- [to_nats](operators/to_nats.md): Publishes messages to a NATS JetStream subject.
- [to_opensearch](operators/to_opensearch.md): Sends events to a Bulk API compatible with OpenSearch.
- [to_prometheus](operators/to_prometheus.md): Sends metric events to a Prometheus Remote Write receiver.
- [to_s3](operators/to_s3.md): Writes events to one or multiple objects in Amazon S3.
- [to_sentinelone_data_lake](operators/to_sentinelone_data_lake.md): Sends security events to SentinelOne Singularity Data Lake via REST API.
- [to_snowflake](operators/to_snowflake.md): Sends events to a Snowflake database.
- [to_splunk](operators/to_splunk.md): Sends events to a Splunk [HTTP Event Collector (HEC)](https://docs.splunk.com/Documentation/Splunk/9.3.1/Data/UsetheHTTPEventCollector).
- [to_stdout](operators/to_stdout.md): Writes events to standard output.
- [to_tcp](operators/to_tcp.md): Connects to a remote TCP or TLS endpoint and sends events.
- [to_udp](operators/to_udp.md): Sends one UDP datagram per input event.
- [to_unix_socket](operators/to_unix_socket.md): Connects to a Unix domain socket and sends events.
- [to_zmq](operators/to_zmq.md): Connects to a remote ZeroMQ subscriber endpoint and sends events.

## Packages

- [package_add](operators/package_add.md): Installs a package.
- [package_list](operators/package_list.md): Shows installed packages.
- [package_remove](operators/package_remove.md): Uninstalls a package.

## Parsing

- [read_all](operators/read_all.md): Parses an incoming bytes stream into a single event.
- [read_auto](operators/read_auto.md): Detects the input format of a byte stream and selects a matching reader.
- [read_avro](operators/read_avro.md): Parses Apache Avro binary data into events.
- [read_bitz](operators/read_bitz.md): Parses bytes as *BITZ* format.
- [read_cef](operators/read_cef.md): Parses an incoming Common Event Format (CEF) stream into events.
- [read_csv](operators/read_csv.md): Read CSV (Comma-Separated Values) from a byte stream.
- [read_delimited](operators/read_delimited.md): Parses an incoming bytes stream into events using a string as delimiter.
- [read_delimited_regex](operators/read_delimited_regex.md): Parses an incoming bytes stream into events using a regular expression as delimiter.
- [read_feather](operators/read_feather.md): Parses an incoming Feather byte stream into events.
- [read_gelf](operators/read_gelf.md): Parses an incoming GELF stream into events.
- [read_grok](operators/read_grok.md): Parses lines of input with a grok pattern.
- [read_json](operators/read_json.md): Tip
- [read_kv](operators/read_kv.md): Read Key-Value pairs from a byte stream.
- [read_leef](operators/read_leef.md): Parses an incoming [LEEF](https://www.ibm.com/docs/en/dsm?topic=overview-leef-event-components) stream into events.
- [read_lines](operators/read_lines.md): Parses an incoming bytes stream into events.
- [read_ndjson](operators/read_ndjson.md): Parses an incoming NDJSON (newline-delimited JSON) stream into events.
- [read_netflow](operators/read_netflow.md): Parses NetFlow v5, NetFlow v9, and IPFIX messages into flow events.
- [read_parquet](operators/read_parquet.md): Reads events from a Parquet byte stream.
- [read_pcap](operators/read_pcap.md): Parses PCAP and PCAPNG byte streams into packet events.
- [read_ssv](operators/read_ssv.md): Read SSV (Space-Separated Values) from a byte stream.
- [read_suricata](operators/read_suricata.md): Parse an incoming [Suricata EVE JSON](https://suricata.readthedocs.io/en/latest/output/eve/eve-json-output.html) stream into events.
- [read_syslog](operators/read_syslog.md): Parses an incoming Syslog stream into events.
- [read_tql](operators/read_tql.md): Parses an incoming byte stream of TQL-formatted records into events.
- [read_tsv](operators/read_tsv.md): Read TSV (Tab-Separated Values) from a byte stream.
- [read_xsv](operators/read_xsv.md): Read XSV from a byte stream.
- [read_yaml](operators/read_yaml.md): Parses an incoming YAML stream into events.
- [read_zeek_json](operators/read_zeek_json.md): Parse an incoming Zeek JSON stream into events.
- [read_zeek_tsv](operators/read_zeek_tsv.md): Parses an incoming `Zeek TSV` stream into events.

## Pipelines

- [pipeline_activity](operators/pipeline_activity.md): Summarizes the activity of pipelines.
- [pipeline_detach](operators/pipeline_detach.md): Starts a pipeline in the node.
- [pipeline_list](operators/pipeline_list.md): Shows managed pipelines.
- [pipeline_run](operators/pipeline_run.md): Starts a pipeline in the node and waits for it to complete.

## Printing

- [write_all](operators/write_all.md): Concatenates one field from all input events into a byte stream.
- [write_bitz](operators/write_bitz.md): Writes events in *BITZ* format.
- [write_csv](operators/write_csv.md): Transforms event stream to CSV (Comma-Separated Values) byte stream.
- [write_delimited](operators/write_delimited.md): Frames `string` or `blob` event values as a byte stream with a separator after each value.
- [write_feather](operators/write_feather.md): Transforms the input event stream to Feather byte stream.
- [write_json](operators/write_json.md): Transforms the input event stream to a JSON byte stream.
- [write_kv](operators/write_kv.md): Writes events in a Key-Value format.
- [write_lines](operators/write_lines.md): Writes events as key-value pairsthe *values* of an event.
- [write_ndjson](operators/write_ndjson.md): Transforms the input event stream to a Newline-Delimited JSON byte stream.
- [write_parquet](operators/write_parquet.md): Transforms event stream to a Parquet byte stream.
- [write_pcap](operators/write_pcap.md): Serializes packet events as a PCAP or PCAPNG byte stream.
- [write_ssv](operators/write_ssv.md): Transforms event stream to SSV (Space-Separated Values) byte stream.
- [write_syslog](operators/write_syslog.md): Writes events as syslog.
- [write_tql](operators/write_tql.md): Transforms the input event stream to a TQL notation byte stream.
- [write_tsv](operators/write_tsv.md): Transforms event stream to TSV (Tab-Separated Values) byte stream.
- [write_xsv](operators/write_xsv.md): Transforms event stream to XSV byte stream.
- [write_yaml](operators/write_yaml.md): Transforms the input event stream to YAML byte stream.
- [write_zeek_tsv](operators/write_zeek_tsv.md): Transforms event stream into Zeek Tab-Separated Value byte stream.

## Storage

- [export](operators/export.md): Retrieves events from a Tenzir node.
- [fields](operators/fields.md): Retrieves all fields stored at a node.
- [import](operators/import.md): Imports events into a Tenzir node.
- [partitions](operators/partitions.md): Retrieves metadata about events stored at a node.
- [schemas](operators/schemas.md): Retrieves all schemas for events stored at a node.

## Additional Pages

- [accept_otlp](operators/accept_otlp.md): Receives OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC.
- [from_duckdb](operators/from_duckdb.md): Reads events from a DuckDB database.
- [read_chunks](operators/read_chunks.md): Parses binary data into events with a single `data` field, in a streaming fasion.
- [to_duckdb](operators/to_duckdb.md): Writes events to a DuckDB table.
- [to_iceberg](operators/to_iceberg.md): Writes events to an Apache Iceberg table through a REST catalog.
- [write_chunks](operators/write_chunks.md): Converts each input event into a separate byte chunk.
