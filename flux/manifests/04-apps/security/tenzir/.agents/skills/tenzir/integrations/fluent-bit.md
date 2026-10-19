---
title: "Fluent Bit integration"
description: "Collect, process, and forward logs and metrics from various sources to many sinks."
canonical: https://tenzir.com/integrations/fluent-bit
source: https://tenzir.com/integrations/fluent-bit.md
section: "Integrations"
---

# Fluent Bit integration

> Collect, process, and forward logs and metrics from various sources to many sinks.

[Fluent Bit](https://fluentbit.io) is an open source observability pipeline. Tenzir embeds Fluent Bit, exposing all its [inputs](https://docs.fluentbit.io/manual/pipeline/inputs) via [`from_fluent_bit`](https://tenzir.com/docs/reference/operators/from_fluent_bit.md) and [outputs](https://docs.fluentbit.io/manual/pipeline/outputs) via [`to_fluent_bit`](https://tenzir.com/docs/reference/operators/to_fluent_bit.md)

This makes Tenzir effectively a superset of Fluent Bit, and our [Tenzir vs. Fluent Bit comparison](https://tenzir.com/product/comparisons/fluent-bit.md) shows what the surrounding pipeline language, detection runtime, and storage engine add on top of the plugins.

Fluent Bit Inputs & Outputs

Fluent Bit [parsers](https://docs.fluentbit.io/manual/pipeline/parsers) map to Tenzir operators that accept bytes as input and produce events as output. Fluent Bit [filters](https://docs.fluentbit.io/manual/pipeline/filters) correspond to Tenzir operators that perform event-to-event transformations. Tenzir does not expose Fluent Bit parsers and filters, only inputs and output.

Internally, Fluent Bit uses [MsgPack](https://msgpack.org/) to encode events whereas Tenzir uses columnar batches, as our explanation of the [data model](../explanations/data-model.md) describes. The `fluentbit` source operator transposes MsgPack into these batches, and the `fluentbit` sink performs the reverse operation.

## Usage

An invocation of the `fluent-bit` commandline utility

```bash
fluent-bit -i input_plugin -p key1=value1 -p key2=value2 -p…
```

translates to Tenzir’s [`from_fluent_bit`](https://tenzir.com/docs/reference/operators/from_fluent_bit.md) operator as follows:

```tql
from_fluent_bit "input_plugin", options={key1: value1, key2: value2, …}
```

with the [`to_fluent_bit`](https://tenzir.com/docs/reference/operators/to_fluent_bit.md) operator working exactly analogous.

## Examples

### Collect Windows Event Logs

Fluent Bit runs as an agent on Windows and reads the event log with its [`winevtlog` input](https://docs.fluentbit.io/manual/pipeline/inputs/windows-event-log-winevtlog). To collect Windows Event Logs without an agent on the hosts, see the [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page.

First, install Fluent Bit on Windows according to the [official instructions](https://docs.fluentbit.io/manual/installation/windows). Then create a [YAML configuration](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/yaml/configuration-file) that sends the events via the [Forward output](https://docs.fluentbit.io/manual/pipeline/outputs/forward), which encodes them in Fluent Bit’s MsgPack-based wire format:

fluent-bit.yaml

```yaml
input:
  - name: winevtlog
    channels: Setup,Windows PowerShell
    interval_sec: 1
    db: winevtlog.sqlite
output:
  - name: forward
    match: "*"
    host: 10.0.0.1
```

Adapt `input.channels` to the Event Log channels that Fluent Bit should monitor.

Receive the events with the [Forward input](https://docs.fluentbit.io/manual/pipeline/inputs/forward). The `listen` option must match the `host` in the Fluent Bit configuration:

```tql
from_fluent_bit "forward", options={
  listen: 10.0.0.1,
}
publish "windows"
```

Test the setup by running Fluent Bit on the command line:

```plaintext
C:\Program Files\fluent-bit\bin\fluent-bit.exe -c \fluent-bit\conf\fluent-bit.yaml
```

To make the setup permanent, [run Fluent Bit as a service](https://docs.fluentbit.io/manual/installation/windows#windows-service-support) that starts at boot:

```plaintext
sc.exe create fluent-bit binpath= "\fluent-bit\bin\fluent-bit.exe -c \fluent-bit\conf\fluent-bit.yaml"
sc.exe config fluent-bit start= auto
sc.exe start fluent-bit
sc.exe query fluent-bit
```

[Install the Microsoft package](../guides/packages/install-a-package.md) to map the Windows events to OCSF. The `microsoft::windows::ocsf::normalize` operator recognizes the records of Fluent Bit:

```tql
from_fluent_bit "forward", options={
  listen: 10.0.0.1,
}
microsoft::windows::ocsf::normalize
ocsf_derive
publish "ocsf"
```

### Receive MQTT device alerts

Tenzir does not have a native MQTT receiver. Use Fluent Bit’s [MQTT input](https://docs.fluentbit.io/manual/data-pipeline/inputs/mqtt) to expose an MQTT endpoint instead:

```tql
from_fluent_bit "mqtt", options={buffer_size: 16384}
```

The input listens on port `1883` by default and accepts JSON maps. For example, publish an equipment alert with an MQTT client:

```bash
mosquitto_pub \
  --host tenzir.example.com \
  --topic factory/press-4/alerts \
  --message '{"severity":"critical","code":"overheat"}'
```

The resulting event contains the MQTT topic alongside the `severity` and `code` fields.

### Collect host metrics

Use Fluent Bit’s Node Exporter Metrics input plugin to collect host metrics from Linux systems:

```tql
from_fluent_bit "node_exporter_metrics", options={scrape_interval: 5}
```

### Send to Datadog

```tql
to_fluent_bit "datadog", options = {apikey: "XXX"}
```
