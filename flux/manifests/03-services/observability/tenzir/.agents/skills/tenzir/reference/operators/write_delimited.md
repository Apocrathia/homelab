---
title: "write_delimited"
canonical: https://tenzir.com/docs/reference/operators/write_delimited
source: https://tenzir.com/docs/reference/operators/write_delimited.md
section: "Docs"
---

# write_delimited

> Frames string or blob event values as a byte stream with a separator after each value.

Frames `string` or `blob` event values as a byte stream with a separator after each value.

```tql
write_delimited value:any, separator:string|blob
```

## Description

The `write_delimited` operator evaluates `value` for each input event and writes the resulting bytes followed by `separator`. It accepts values of type `string`, `blob`, and `null`.

For `string` values, `write_delimited` writes the string bytes as-is. For `blob` values, it writes the blob bytes as-is. The operator skips `null` values without writing the separator.

The separator must be a constant `string` or `blob` value. Tenzir evaluates it once and uses the same bytes for every value. It can be empty, but use a non-empty separator for protocols that expect framed messages.

Note

`write_delimited` writes a trailing separator after the last non-null value. Streaming protocols often need a terminator for the last message even when the input stream ends.

`write_delimited` doesn’t escape, quote, serialize JSON, or add newlines. Use a printer function such as [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md) when you need a formatted string before framing it.

## Examples

### Write strings with a separator

```tql
from {data: "a"}, {data: "b"}
to_stdout {
  write_delimited data, "|"
}
```

```txt
a|b|
```

### Send GELF JSON over TCP

Graylog GELF over TCP expects one compact GELF JSON object followed by a null byte. Build the GELF record in TQL, serialize it with [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md), and use `write_delimited` for the TCP framing.

```tql
export
timestamp = ts.since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host,
  short_message: message,
  timestamp: timestamp,
  level: level,
  _tenant: tenant,
  _pipeline: "detections",
}
to_tcp "graylog.example.com:12201" {
  write_delimited this.print_ndjson(strip_null_fields=true), "\x00"
}
```

### Concatenate preformatted values

Use an empty separator to concatenate preformatted values while still streaming bytes as input is processed.

```tql
from {data: "a"}, {data: "b"}
to_stdout {
  write_delimited data, ""
}
```

```txt
ab
```

## See Also

* [`read_delimited`](https://tenzir.com/docs/reference/operators/read_delimited.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [`to_stdout`](https://tenzir.com/docs/reference/operators/to_stdout.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`write_all`](https://tenzir.com/docs/reference/operators/write_all.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
* [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md)
* [Graylog](../../integrations/graylog.md)
