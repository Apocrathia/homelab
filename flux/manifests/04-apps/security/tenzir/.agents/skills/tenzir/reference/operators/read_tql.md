---
title: "read_tql"
canonical: https://tenzir.com/docs/reference/operators/read_tql
source: https://tenzir.com/docs/reference/operators/read_tql.md
section: "Docs"
---

# read_tql

> Parses an incoming byte stream of TQL-formatted records into events.

Parses an incoming byte stream of TQL-formatted records into events.

```tql
read_tql [schema=string, selector=string, schema_only=bool,
          merge=bool, raw=bool, unflatten_separator=string]
```

## Description

Parses an incoming byte stream of TQL-formatted records into events. Each top-level record expression in the input becomes one event.

The input format matches the output of [`write_tql`](https://tenzir.com/docs/reference/operators/write_tql.md). This makes `read_tql` useful for round-tripping data through TQL notation, reading TQL-formatted files, or processing data piped from other Tenzir pipelines.

The parser supports all TQL literal types, including `null`, `bool`, `int64`, `double`, `string`, `duration`, `time`, `ip`, and `subnet`, as well as nested records and lists.

### `merge = bool (optional)`

This option has no effect and only exists for backward compatibility. Tenzir keeps events with different schemas in the same batch, so heterogeneous input needs no merging.

### `raw = bool (optional)`

Use only the raw types that are native to the parsed format. Fields that have a type specified in the chosen `schema` will still be parsed according to the schema.

### `schema = string (optional)`

Provide the name of a schema to be used by the parser.

If a schema with a matching name is installed, the result will always have all fields from that schema.

* Fields that are specified in the schema, but did not appear in the input will be null.
* Fields that appear in the input, but not in the schema will also be kept. Use `schema_only=true` to reject fields that are not in the schema.

If the given schema does not exist, this option instead assigns the output schema name only.

The `schema` option is incompatible with the `selector` option.

### `selector = string (optional)`

Designates a field value as schema name with an optional dot-separated prefix.

The string is parsed as `<fieldname>[:<prefix>]`. The `prefix` is optional and will be prepended to the field value to generate the schema name.

For example, the Suricata EVE JSON format includes a field `event_type` that contains the event type. Setting the selector to `event_type:suricata` causes an event with the value `flow` for the field `event_type` to map onto the schema `suricata.flow`.

The `selector` option is incompatible with the `schema` option.

### `schema_only = bool (optional)`

When working with an existing schema, this option will ensure that the output schema has *only* the fields from that schema.

If the schema name is obtained via a `selector` and it does not exist, this has no effect.

This option requires either `schema` or `selector` to be set.

### `unflatten_separator = string (optional)`

A delimiter that, if present in keys, causes values to be treated as values of nested records.

A popular example of this is the [Zeek JSON](read_zeek_json.md) format. It includes the fields `id.orig_h`, `id.orig_p`, `id.resp_h`, and `id.resp_p` at the top-level. The data is best modeled as an `id` record with four nested fields `orig_h`, `orig_p`, `resp_h`, and `resp_p`.

Without an unflatten separator, the data looks like this:

Without unflattening

```json
{
  "id.orig_h": "1.1.1.1",
  "id.orig_p": 10,
  "id.resp_h": "1.1.1.2",
  "id.resp_p": 5
}
```

With the unflatten separator set to `.`, Tenzir reads the events like this:

With 'unflatten'

```json
{
  "id": {
    "orig_h": "1.1.1.1",
    "orig_p": 10,
    "resp_h": "1.1.1.2",
    "resp_p": 5
  }
}
```

### Duplicate Keys

If the parser encounters a duplicate key in an event, it will transparently upgrade the field to be a list of values instead.

For a simple example, consider this JSON file:

Duplicate Keys

```json
{"key": 7}
{"key": 0.0, "key": 1}
{"key": 42}
```

```tql
{key: 7}
{key: [0.0, 1]}
{key: 42}
```

The values keep their individual types, so the list can mix values of different types:

Mixed Types

```json
{"key": 0.0, "key": "1.1.1.1", "key": "example.com"}
```

```tql
{key: [0.0, 1.1.1.1, "example.com"]}
```

When you provide a `schema` or `selector`, the last value of a repeated key wins instead.

## Examples

### Read TQL records from a file

events.tql

```tql
{name: "Tenzir", version: 4}
{name: "Suricata", version: 7}
```

Pipeline

```tql
from_file "events.tql" {
  read_tql
}
```

Output

```tql
{
  name: "Tenzir",
  version: 4,
}
{
  name: "Suricata",
  version: 7,
}
```

### Read records with native types

TQL notation supports types that JSON cannot represent natively, such as durations, timestamps, IP addresses, and subnets.

input.tql

```tql
{dur: 5s, ts: 2024-01-01T00:00:00.000000, addr: 192.168.1.1, net: 10.0.0.0/8}
```

Pipeline

```tql
from_file "input.tql" {
  read_tql
}
```

Output

```tql
{
  dur: 5s,
  ts: 2024-01-01T00:00:00Z,
  addr: 192.168.1.1,
  net: 10.0.0.0/8,
}
```

## See Also

* [`write_tql`](https://tenzir.com/docs/reference/operators/write_tql.md)
* [`read_json`](https://tenzir.com/docs/reference/operators/read_json.md)
* [`read_ndjson`](https://tenzir.com/docs/reference/operators/read_ndjson.md)
