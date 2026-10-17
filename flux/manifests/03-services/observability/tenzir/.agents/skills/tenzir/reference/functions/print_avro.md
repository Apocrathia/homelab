---
title: "print_avro"
canonical: https://tenzir.com/docs/reference/functions/print_avro
source: https://tenzir.com/docs/reference/functions/print_avro.md
section: "Docs"
---

# print_avro

> Encodes a value as an Apache Avro binary datum.

Encodes a value as an Apache Avro binary datum.

```tql
print_avro(input:any, schema:record|string) -> blob
```

## Description

The `print_avro` function encodes each input value as one bare [Apache Avro](https://avro.apache.org/docs/current/specification/) binary datum using the required writer schema. The result contains no container header, writer schema, or schema registry framing. The consumer must know the writer schema to decode the result.

Record fields are encoded in Avro schema order, regardless of input field order. Input records must contain exactly the fields declared in the schema. Missing and extra fields are rejected, even when the schema declares defaults or nullable fields. Defaults do not fill missing fields.

For a union, the function selects the first branch in schema order that accepts the value, including its nested values. Include a `"null"` branch to accept nulls. An Avro `null` encodes as an empty blob; a null in a union also includes the union branch index.

The function accepts these Tenzir types for the corresponding Avro schemas:

| Tenzir type              | Compatible Avro types                                          |
| ------------------------ | -------------------------------------------------------------- |
| `null`                   | `null`                                                         |
| `bool`                   | `boolean`                                                      |
| `int`, `uint`            | `int`, `long`, `float`, `double`                               |
| `float`                  | `float`, `double`                                              |
| `duration`, `time`       | `int`, `long`, `float`, `double`, using nanoseconds            |
| `string`, `ip`, `subnet` | `string`, or `enum` with a matching symbol                     |
| `blob`                   | `bytes`, or `fixed` with the declared size                     |
| `list`                   | `array` with compatible items                                  |
| `record`                 | `record` with matching fields, or `map` with compatible values |

Strings and map keys must be valid UTF-8. Avro `int` requires a signed 32-bit value, and Avro `long` requires a signed 64-bit value. Avro `float` and `double` accept the full unsigned 64-bit range. Floating-point conversions can lose precision; finite values outside the Avro `float` range are rejected. Secrets encode as the masked string `"***"`, never as their contents.

Logical types do not convert values

Logical type annotations do not change how values are encoded. Times encode as nanoseconds since the Unix epoch, and durations encode as nanoseconds. For example, a `timestamp-millis` or `timestamp-micros` annotation does not rescale a Tenzir `time`. Convert the input to the integer units required by the schema before encoding it.

An incompatible value produces null and emits a warning. An invalid schema produces an error before processing input.

### `input: any`

The value to encode.

### `schema: record|string`

The required Avro writer schema, provided as a constant TQL record or a string containing an Avro JSON schema. The schema is not inferred from the input.

For primitive types, use a record such as `{type: "long"}` or a JSON string such as `'"long"'`. For a top-level union, use a record containing only `type` with a list of branches, such as `{type: ["null", "long"]}`, or the JSON string `'["null", "long"]'`. A bare TQL list is not accepted as the schema argument.

## Examples

### Encode a record

```tql
from {id: 42, name: "alice"}
encoded = print_avro(this, schema={
  type: "record",
  name: "event",
  fields: [
    {name: "id", type: "long"},
    {name: "name", type: "string"},
  ],
})
```

The `encoded` field contains a binary Avro datum with `id` followed by `name`, as specified by the writer schema.

### Encode a nullable value

```tql
from {value: 42}, {value: null}
encoded = print_avro(value, schema={type: ["null", "long"]})
```

Both rows produce blobs. Each blob includes the index of its selected union branch.

### Use a JSON schema string

```tql
from {value: 42}
encoded = print_avro(value, schema='{"type":"long"}')
```

### Send bare Avro messages to Kafka

```tql
from {id: 42, name: "alice"}
to_kafka "events", message=print_avro(this, schema={
  type: "record",
  name: "event",
  fields: [
    {name: "id", type: "long"},
    {name: "name", type: "string"},
  ],
})
```

The consumer must know the matching writer schema because `print_avro` does not add a schema identifier to the message.

## See Also

* [Apache Avro](../../integrations/avro.md)
* [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md)
* [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)
