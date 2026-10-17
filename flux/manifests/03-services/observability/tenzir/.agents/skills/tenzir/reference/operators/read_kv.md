---
title: "read_kv"
canonical: https://tenzir.com/docs/reference/operators/read_kv
source: https://tenzir.com/docs/reference/operators/read_kv.md
section: "Docs"
---

# read_kv

> Read Key-Value pairs from a byte stream.

Read Key-Value pairs from a byte stream.

```tql
read_kv [field_split=string, value_split=string, merge=bool, raw=bool, quotes=string,
         schema=string, selector=string, schema_only=bool, unflatten_separator=string]
```

## Description

The `read_kv` operator transforms a byte stream into a event stream by parsing the bytes as Key-Value pairs.

Incoming strings are first split into fields according to `field_split`. This can be a regular expression. For example, the input `foo: bar, baz: 42` can be split into `foo: bar` and `baz: 42` with the regular expression `r",\s*"` (a comma, followed by any amount of whitespace) as the field splitter. Note that the matched separators are removed when splitting a string.

Afterwards, the extracted fields are split into their key and value by `value_split`, which can again be a regular expression. In our example, `r":\s*"` could be used to split `foo: bar` into the key `foo` and its value `bar`, and similarly `baz: 42` into `baz` and `42`. The result would thus be `{"foo": "bar", "baz": 42}`. If the regex matches multiple substrings, only the first match is used. If no match is found, the “field” is considered an extension of the previous fields value.

The supported regular expression syntax is [RE2](https://github.com/google/re2/wiki/Syntax). In particular, this means that lookahead `(?=...)` and lookbehind `(?<=...)` are not supported by `read_kv` at the moment. However, if the regular expression has a capture group, it is assumed that only the content of the capture group shall be used as the separator. This means that unsupported regular expressions such as `(?=foo)bar(?<=baz)` can be effectively expressed as `foo(bar)baz` instead.

### Quoted Values

The parser is aware of double-quotes (`"`). If the `field_split` or `value_split` are found within enclosing quotes, they are not considered matches. This means that both the key and the value may be enclosed in double-quotes.

For example, given `field_split` `\s*,\s*` and `value_split` `=`, the input

```plaintext
"key"="nested = value",key2="value, and more"
```

will parse as

```tql
{
  key: "nested = value",
  key2: "value, and more",
}
```

### `field_split = string (optional)`

The regular expression used to separate individual fields.

Defaults to `r"\s"`.

### `value_split = string (optional)`

The regular expression used to separate a key from its value.

Defaults to `"="`.

### `quotes = string (optional)`

A string of not escaped characters that are supposed to be considered as quotes.

Defaults to the characters `"'`.

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

### Read comma-separated key-value pairs

Input

```txt
surname:"John Norman", family_name:Smith, date_of_birth: 1995-05-26
```

```tql
read_kv field_split=r"\s*,\s*",
  value_split=r"\s*:\s*"
```

```tql
{
  surname: "John Norman",
  family_name: "Smith",
  date_of_birth: 1995-05-26,
}
```

### Extract key-value pairs with more complex rules

Input

```txt
PATH: C:\foo INPUT_MESSAGE: hello world
PATH: D:\bar VALUE: 42 INFO: Great
```

```tql
read_kv field_split=r"(\s+)[A-Z][A-Z_]+:",
  value_split=r":\s*"
```

```tql
{
  PATH: "C:\\foo",
  INPUT_MESSAGE: "hello world",
}
{
  PATH: "D:\\bar",
  VALUE: 42,
  INFO: "Great",
}
```

This requires lookahead because not every whitespace acts as a field separator. Instead, we only want to split if the whitespace is followed by `[A-Z][A-Z_]+:`, i.e., at least two uppercase characters followed by a colon. We can express this as `"(\s+)[A-Z][A-Z_]+:"`, which yields `PATH: C:\foo` and `INPUT_MESSAGE: hello world`. We then split the key from its value with `":\s*"`. Since only the first match is used to split key and value, this leaves the path intact.

### Fields without a `value_split`

Input

```txt
x=1 y=2 z=3 4 5 a=6
```

```tql
read_kv
```

```tql
{
  x: 1,
  y: 2,
  z: "3 4 5",
  a: 6,
}
```

## See Also

* [`write_kv`](https://tenzir.com/docs/reference/operators/write_kv.md)
* [`parse_kv`](https://tenzir.com/docs/reference/functions/parse_kv.md)
