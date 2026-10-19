---
title: "read_delimited_regex"
canonical: https://tenzir.com/docs/reference/operators/read_delimited_regex
source: https://tenzir.com/docs/reference/operators/read_delimited_regex.md
section: "Docs"
---

# read_delimited_regex

> Parses an incoming bytes stream into events using a regular expression as delimiter.

Parses an incoming bytes stream into events using a regular expression as delimiter.

```tql
read_delimited_regex regex:string|blob, [binary=bool, include_separator=bool]
```

## Description

The `read_delimited_regex` operator takes its input bytes and splits it using the provided regular expression as a delimiter. This is useful for parsing data that uses custom delimiters or patterns instead of standard newlines.

The regular expression flavor is Perl compatible and documented [here](https://www.boost.org/doc/libs/1_88_0/libs/regex/doc/html/boost_regex/syntax/perl_syntax.html).

The resulting events have a single field called `data`.

Note

If the input ends with a separator, no additional empty event will be generated. For example, splitting `"a|b|"` with delimiter pattern `"|"` will produce two events: `"a"` and `"b"`, not three events with an empty third one.

### `regex: string|blob (required)`

The regular expression pattern to use as delimiter. This can be provided as a string or blob literal. The operator will split the input whenever this pattern is matched. When a blob literal is provided (e.g., `b"\\x00\\x01"`), the `binary` option defaults to `true`.

### `binary = bool (optional)`

Treat the input as binary data instead of UTF-8 text. When enabled, invalid UTF-8 sequences will not cause warnings, and the resulting `data` field will be of type `blob` instead of `string`.

### `include_separator = bool (optional)`

When enabled, includes the matched separator pattern in the output events. By default, the separator is excluded from the results.

## Examples

### Split Syslog-like events without newline terminators from a TCP input

```tql
accept_tcp "0.0.0.0:514" {
  read_delimited_regex "(?=<[0-9]+>)"
}
this = data.parse_syslog()
```

### Parse log entries separated by timestamps

```tql
from_file "application.log" {
  read_delimited_regex "(?=\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})"
}
```

### Split on multiple possible delimiters

```tql
from_file "mixed_delimiters.txt" {
  read_delimited_regex "[;|]"
}
```

### Include the separator in the output

```tql
from_file "data.txt" {
  read_delimited_regex "\\|\\|", include_separator=true
}
```

### Parse binary data with blob patterns

```tql
from_file "binary.dat" {
  read_delimited_regex b"\\x00\\x01"
}
```

### Use blob pattern with include\_separator for binary delimiters

```tql
from_file "protocol.dat" {
  read_delimited_regex b"\\xFF\\xFE", include_separator=true
}
```

## See Also

* [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md)
* [`read_delimited`](https://tenzir.com/docs/reference/operators/read_delimited.md)
* [`read_lines`](https://tenzir.com/docs/reference/operators/read_lines.md)
* [`read_ssv`](https://tenzir.com/docs/reference/operators/read_ssv.md)
* [`read_tsv`](https://tenzir.com/docs/reference/operators/read_tsv.md)
* [`read_xsv`](https://tenzir.com/docs/reference/operators/read_xsv.md)
