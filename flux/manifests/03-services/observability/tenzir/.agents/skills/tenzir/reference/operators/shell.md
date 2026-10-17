---
title: "shell"
canonical: https://tenzir.com/docs/reference/operators/shell
source: https://tenzir.com/docs/reference/operators/shell.md
section: "Docs"
---

# shell

> Executes a system command and hooks its stdin and stdout into the pipeline.

Executes a system command and hooks its stdin and stdout into the pipeline.

```tql
shell cmd:string
```

## Description

The `shell` operator executes the provided command by spawning a new process. The input of the operator is forwarded to the child’s standard input. Similarly, the child’s standard output is forwarded to the output of the operator.

### `cmd: string`

The command to execute and hook into the pipeline processing. It is interpreted by `/bin/sh -c`.

Lots of escaping?

Try using raw string literals: `r#"echo "i can use quotes""#`.

## Parallelism

The `shell` operator stays on a single instance in a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism). One subprocess consumes the complete input byte stream. Splitting the stream among several commands would change command state, side effects, and output.

## Secrets

By default, the `shell` operator does not accept secrets. If you want to allow usage of secrets in the `cmd` argument, you can enable the configuration option `tenzir.allow-secrets-in-escape-hatches`.

## Examples

### Show a live log from the `tenzir-node` service

```tql
shell "journalctl -u tenzir-node -f"
read_json
```

## See Also

* [`python`](https://tenzir.com/docs/reference/operators/python.md)
