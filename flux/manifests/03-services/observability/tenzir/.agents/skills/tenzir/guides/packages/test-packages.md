---
title: "Test packages"
canonical: https://tenzir.com/docs/guides/packages/test-packages
source: https://tenzir.com/docs/guides/packages/test-packages.md
section: "Docs"
---

# Test packages

> This guide shows you how to add tests to your package. You’ll learn how to write test files, use inline inputs, and run the test harness.

This guide shows you how to add tests to your package. You’ll learn how to write test files, use inline inputs, and run the test harness.

Make testing part of your workflow

Tests are your safety net during development. The baseline-driven workflow lets you iterate quickly: change code, run tests, review diffs, update baselines. Start with a few key tests and expand coverage as your package grows.

## Test file structure

Place test files in the `tests` directory of your package:

* vendor/

  * tests/

    * parse.input Sample data for the test

    * parse.tql Test file

    * parse.txt Expected output baseline

    * context/

      * test.yaml Suite configuration
      * 01-update.tql First test in suite
      * 01-update.txt
      * 02-inspect.tql Second test in suite
      * 02-inspect.txt

Each test consists of:

* A `.tql` file containing the test pipeline
* An optional `.input` file with test-specific data
* A `.txt` file with the expected output baseline

## Use inline inputs

Place a `.input` file next to your test file with the same base name when the data belongs to that one test:

* tests/

  * parse-csv.input Input data
  * parse-csv.tql Test file
  * parse-csv.txt Expected baseline

The harness exposes the input file path via `TENZIR_INPUT`:

tests/parse-csv.tql

```tql
from_file env("TENZIR_INPUT") {
  read_csv
}
```

tests/parse-csv.input

```csv
name,value
Alice,42
Bob,17
```

Inline inputs keep test data next to the test that uses it.

### When to use shared inputs

Most tests in the [Tenzir Library](https://github.com/tenzir/library) read from a shared `inputs/` directory instead, because several tests exercise the same sample events through different operators. The harness uses the nearest `inputs/` directory when resolving `TENZIR_INPUTS`:

* tests/

  * network/

    * inputs/ Shared by tests in network/ and children

      * packets.pcap
      * flows.json

    * tcp/

      * analysis.tql TENZIR\_INPUTS → ../inputs/

    * udp/

      * stats.tql TENZIR\_INPUTS → ../inputs/

  * inputs/ Fallback for tests without a closer inputs/

    * common.json

Access shared inputs in TQL:

tests/network/tcp/analysis.tql

```tql
from_file f"{env("TENZIR_INPUTS")}/packets.pcap" {
  read_pcap
}
vendor::analyze
```

Place `inputs/` directories as close to the tests that use them as possible. This keeps related data together and makes it clear which tests depend on which files.

## Write test pipelines

Test pipelines exercise your package logic with known input and produce deterministic output. The most common pattern is testing user-defined operators (UDOs), which are the primary way to build reusable building blocks. However, you can test any TQL code, including standalone pipelines or complex workflows.

### Test an operator

Test the operator your users call, not the building blocks it composes. An operator that writes into a field needs the test to lift the result:

tests/parse.tql

```tql
from_file env("TENZIR_INPUT") {
  read_lines
}
vendor::parse line, event
this = move event
```

tests/parse.input

```text
2024-01-15T10:30:00Z auth alice success
```

### Pin the output schema

Validate the schema your operator promises, so the baseline shows what consumers see. For OCSF, [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) validates and [`drop_null_fields`](https://tenzir.com/docs/reference/operators/drop_null_fields.md) keeps the baseline short:

tests/ocsf/auth.tql

```tql
from_file f"{env("TENZIR_INPUTS")}/auth.ndjson" {
  read_ndjson
}
vendor::ocsf::normalize
ocsf_cast
drop_null_fields
```

Leave out what each caller decides, such as [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md), and replace non-deterministic values such as [`now`](https://tenzir.com/docs/reference/functions/now.md). For a full package walkthrough, see [Onboard a data source](../../tutorials/onboard-a-data-source.md).

### Test with different arguments

Create separate test files for different argument combinations:

tests/tag-defaults.tql

```tql
from {hash: "abc123"}
vendor::tag indicator
```

With a custom prefix:

tests/tag-with-prefix.tql

```tql
from {hash: "abc123"}
vendor::tag indicator, prefix="IOC: "
```

### Test error conditions

Use the `error` frontmatter to expect non-zero exit codes:

tests/invalid-input.tql

```tql
---
error: true
---


from {invalid: null}
vendor::strict_parse
```

## Run tests

Run `tenzir-test` from the package root (where `package.yaml` lives) or from the `tests/` subdirectory. The harness auto-detects package mode and configures paths accordingly.

### Preview output in passthrough mode

First, run tests in passthrough mode to see the actual output:

```sh
uvx tenzir-test --passthrough
```

This streams output directly to the terminal without comparing against baselines.

### Update baselines

When the output looks correct, save it as the baseline:

```sh
uvx tenzir-test --update
```

This creates or updates `.txt` files next to each test. For example, `tests/parse.tql` produces `tests/parse.txt`.

### Compare against baselines

Run all tests and compare against saved baselines:

```sh
uvx tenzir-test
```

The harness reports differences between actual output and baselines. Use `--verbose` for detailed output during debugging.

### Run specific tests

Target individual tests or directories:

```sh
uvx tenzir-test tests/parse.tql
uvx tenzir-test tests/context/
```

Use `-m`/`--match` to select tests by substring or glob pattern. Bare strings perform a substring match against the test’s relative path, so you no longer need to wrap keywords in wildcards:

```sh
uvx tenzir-test -m context
uvx tenzir-test -m create -m update
```

Patterns containing `*`, `?`, or `[` still use fnmatch glob syntax:

```sh
uvx tenzir-test -m 'tests/*/create.tql'
```

You can combine paths and patterns. The harness intersects both selections, running only tests that match both the path and a pattern:

```sh
uvx tenzir-test tests/context/ -m create
```

## Test frontmatter options

Control test behavior with YAML frontmatter:

tests/slow-test.tql

```tql
---
timeout: 60
---


// Long-running test pipeline
```

| Option        | Type           | Default   | Description                               |
| ------------- | -------------- | --------- | ----------------------------------------- |
| `timeout`     | integer        | 30        | Command timeout in seconds                |
| `error`       | boolean        | false     | Expect non-zero exit code                 |
| `skip`        | string         | unset     | Skip test with reason                     |
| `fixtures`    | list           | `[]`      | Fixtures to request                       |
| `runner`      | string         | by suffix | Runner name (`tenzir`, `python`, `shell`) |
| `pre-compare` | string or list | `[]`      | Transform both sides before comparing     |

## Troubleshooting

### Test fails with “file not found”

Verify the `.input` file exists next to the test file with the same base name. Check that you’re using `env("TENZIR_INPUT")` (singular) for inline inputs.

### Context not found

Ensure the test suite has `fixtures: [node]` in `test.yaml`. The node fixture automatically installs the package, creating defined contexts.

### Non-deterministic output

Tests must produce deterministic output. When only the order varies, add `pre-compare: sort` to the frontmatter rather than a `sort` operator, which would leave test scaffolding in the pipeline. See [pre-compare transforms](../../reference/test-framework.md#pre-compare-transforms).

Avoid timestamps and random values in output. For time-based tests, use fixed input data rather than `now()`.

### Baseline mismatch after changes

Run `uvx tenzir-test --update` to regenerate baselines after intentional changes. Review the diff to verify the changes are expected.

## See also

* [Create a package](create-a-package.md)
* [Add operators](add-operators.md)
* [Add contexts](add-contexts.md)
* [Test Framework](../../reference/test-framework.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
