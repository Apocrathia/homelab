---
title: "parse_avro"
canonical: https://tenzir.com/docs/reference/functions/parse_avro
source: https://tenzir.com/docs/reference/functions/parse_avro.md
section: "Docs"
---

# parse_avro

> Parses an Apache Avro binary datum.

Parses an Apache Avro binary datum.

```tql
parse_avro(input: blob|string, schema=record) -> any
```

## Description

The `parse_avro` function parses one [Apache Avro](https://avro.apache.org/docs/current/specification/) binary datum from each input value according to a writer schema. It accepts a `blob` or a `string` containing the encoded bytes and uses the same type mapping as [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md).

The function returns null and emits a warning when the input is malformed or truncated. If bytes remain after the first complete datum, it returns that datum and warns that it discarded trailing data.

### `input: blob|string`

The encoded Avro datum to parse.

### `schema = record`

The Avro writer schema as a TQL record using the fields from Avro’s JSON schema format.

Unlike the `schema` option of functions such as `parse_json` and `parse_csv`, this is the schema definition itself, not the name of an installed Tenzir schema. For a root union, use `{type: [<branches>]}`.

Recursive schemas and arrays whose item schema does not have a fixed Tenzir type are unsupported. A datum may occupy at most 16 MiB in encoded form and in the decoder’s estimated in-memory representation.

## Examples

### Parse an encoded record

```tql
from {data: "540a616c696365"}
this = data.decode_hex().parse_avro(schema={
  type: "record",
  name: "event",
  fields: [
    {name: "id", type: "long"},
    {name: "name", type: "string"},
  ],
})
```

```tql
{id: 42, name: "alice"}
```

### Parse bare Avro messages from Kafka

Use this example when each message contains one bare Avro datum without registry framing. For messages carrying Confluent-compatible schema identifiers, set `schema_registry` on [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) to resolve the writer schema and decode the value directly.

```tql
from_kafka "events"
this = message.parse_avro(schema={
  type: "record",
  name: "event",
  fields: [
    {name: "id", type: "long"},
    {name: "name", type: "string"},
  ],
})
```

## See Also

* [Apache Avro](../../integrations/avro.md)
* [`print_avro`](https://tenzir.com/docs/reference/functions/print_avro.md)
* [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md)
* [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md)
* [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md)
