---
title: "read_lines"
canonical: https://tenzir.com/docs/reference/operators/read_lines
source: https://tenzir.com/docs/reference/operators/read_lines.md
section: "Docs"
---

# read_lines

> Parses an incoming bytes stream into events.

Parses an incoming bytes stream into events.

```tql
read_lines [skip_empty=bool, split_at_null=bool, split_at_regex=string]
```

## Description

The `read_lines` operator takes its input bytes and splits it at a newline character.

Newline characters include:

* `\n`
* `\r\n`

The resulting events have a single field called `line`.

### `skip_empty = bool (optional)`

Ignores empty lines in the input.

### `split_at_null = bool (optional)`

Deprecated

This option is deprecated. Use [`read_delimited`](https://tenzir.com/docs/reference/operators/read_delimited.md) instead.

Use null byte (`\0`) as the delimiter instead of newline characters.

### `split_at_regex = string (optional)`

Deprecated

This option is deprecated. Use [`read_delimited_regex`](https://tenzir.com/docs/reference/operators/read_delimited_regex.md) instead.

Use the specified regex as the delimiter instead of newline characters. The regex flavor is Perl compatible and documented [here](https://www.boost.org/doc/libs/1_88_0/libs/regex/doc/html/boost_regex/syntax/perl_syntax.html).

## Examples

### Reads lines from a file

```tql
from_file "events.log" {
  read_lines
}
is_error = line.starts_with("error:")
```

### Split Syslog-like events without newline terminators from a TCP input

Consider using [`read_delimited_regex`](https://tenzir.com/docs/reference/operators/read_delimited_regex.md) for regex-based splitting:

```tql
accept_tcp "0.0.0.0:514" {
  read_delimited_regex "(?=<[0-9]+>)"
}
this = line.parse_syslog()
```

```tql
accept_tcp "0.0.0.0:514" {
  read_lines split_at_regex="(?=<[0-9]+>)"
}
this = line.parse_syslog()
```

## See Also

* [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md)
* [`read_delimited_regex`](https://tenzir.com/docs/reference/operators/read_delimited_regex.md)
* [`read_ssv`](https://tenzir.com/docs/reference/operators/read_ssv.md)
* [`read_tsv`](https://tenzir.com/docs/reference/operators/read_tsv.md)
* [`read_xsv`](https://tenzir.com/docs/reference/operators/read_xsv.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
