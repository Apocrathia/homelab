---
title: "read_avro"
canonical: https://tenzir.com/docs/reference/operators/read_avro
source: https://tenzir.com/docs/reference/operators/read_avro.md
section: "Docs"
---

# read_avro

> Parses Apache Avro binary data into events.

Parses Apache Avro binary data into events.

```tql
read_avro [schema=record, raw=bool]
```

## Description

The `read_avro` operator parses [Apache Avro](https://avro.apache.org/docs/current/specification/) Object Container Files and byte streams containing consecutive raw binary datums. Input chunk boundaries do not need to coincide with container blocks or datum boundaries.

Object Container Files use their embedded writer schema and support the `null` and `deflate` codecs. Raw datum streams require the writer schema through the `schema` argument.

An Avro record produces a Tenzir record with the same fields. For every other root type, the operator emits a record with the decoded value in a field named `value`. Avro maps become Tenzir records whose field names are the map keys.

The operator maps Avro types to Tenzir types as follows:

| Avro type         | Tenzir type                 |
| ----------------- | --------------------------- |
| `null`            | `null`                      |
| `boolean`         | `bool`                      |
| `int`, `long`     | `int`                       |
| `float`, `double` | `float`                     |
| `string`, `enum`  | `string`                    |
| `bytes`, `fixed`  | `blob`                      |
| `array`           | `list`                      |
| `map`, `record`   | `record`                    |
| `union`           | Depends on the branch types |

The table also applies to nested values. For raw streams, the root writer schema must describe a datum that consumes at least one encoded byte. This excludes `null`, zero-length `fixed`, and records composed entirely of fields whose values consume no bytes. Container files carry an object count and therefore do not have this restriction.

When every non-null union branch maps to the same fixed Tenzir type, the union uses that type and represents a null branch as a null value. Otherwise, the active branch determines the output type. Such unions and maps may produce different Tenzir schemas for different datums.

Malformed container input produces an error. For raw input, an incomplete first datum produces an error; after at least one complete datum, the operator instead warns about and discards incomplete trailing data.

### `schema = record` (optional)

The Avro writer schema for a raw datum stream, expressed as a TQL record using the fields from Avro’s JSON schema format. Object Container Files use their embedded writer schemas. When both schemas are present and differ, the operator warns and uses the embedded writer schema.

Unlike the `schema` option of readers such as `read_json` and `read_csv`, this is the schema definition itself, not the name of an installed Tenzir schema. For a root union, use `{type: [<branches>]}`.

Recursive schemas and arrays whose item schema does not have a fixed Tenzir type are unsupported. A raw datum and an encoded or decoded container block may occupy at most 16 MiB.

### `raw = bool` (optional)

Forces raw datum decoding instead of inspecting the input for an Object Container File header. This requires `schema`. Use it when the first datum may begin with the four container magic bytes `Obj\x01`.

## Examples

### Read an Object Container File

```tql
from_file "events.avro" {
  read_avro
}
```

### Read consecutive record datums

For a file containing consecutive raw Avro datums, provide the writer schema:

```tql
from_file "events.bin" {
  read_avro raw=true, schema={
    type: "record",
    name: "event",
    fields: [
      {name: "id", type: "long"},
      {name: "name", type: "string"},
    ],
  }
}
```

## See Also

* [Apache Avro](../../integrations/avro.md)
* [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md)
* [`print_avro`](https://tenzir.com/docs/reference/functions/print_avro.md)
* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
