---
title: "Add contexts"
canonical: https://tenzir.com/docs/guides/packages/add-contexts
source: https://tenzir.com/docs/guides/packages/add-contexts.md
section: "Docs"
---

# Add contexts

> This guide shows you how to add enrichment contexts to your package. You’ll learn how to define contexts in the manifest, populate them with data, and test context interactions.

This guide shows you how to add enrichment contexts to your package. You’ll learn how to define contexts in the manifest, populate them with data, and test context interactions.

For a complete collection, update, enrichment, refresh, and testing workflow, follow the tutorial on [adding enrichment contexts](../../tutorials/add-enrichment-contexts.md).

## Define contexts in the manifest

Contexts provide stateful enrichment capabilities. Define them in the `contexts` section of your `package.yaml`. The node creates these contexts when you install the package.

package.yaml

```yaml
contexts:
  threat-indicators:
    type: lookup-table
    description: |
      A lookup table keyed by indicator values (hashes, IPs, domains)
      for threat intelligence enrichment.
    args: {}
    disabled: false
```

### Context types

Tenzir supports several context types:

| Type           | Description                            |
| -------------- | -------------------------------------- |
| `lookup-table` | Key-value store for enrichment lookups |
| `geoip`        | Geographic IP address lookups          |
| `bloom-filter` | Probabilistic set membership testing   |

### Context options

Each context definition supports:

| Field         | Description                                  |
| ------------- | -------------------------------------------- |
| `type`        | The context type (required)                  |
| `description` | A user-facing description                    |
| `args`        | Type-specific arguments for context creation |
| `disabled`    | Set to `true` to disable the context         |

Context creation

Changes to context arguments only apply when the context is first created. Updating the manifest doesn’t modify existing contexts.

## Populate contexts with data

Use the [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md) operator to populate a context. This typically happens in a pipeline that fetches data from an external source:

pipelines/update-lookup-table.tql

```tql
---
name: Update Threat Intel
description: >
  Fetches threat indicators hourly and updates the lookup table.
disabled: true
---


every 1h {
  from_http "https://feeds.example.com/indicators.json"
}
parse_json
context_update "threat-indicators", key=indicator
```

The `key` parameter specifies which field to use as the lookup key. The entire event becomes the value associated with that key.

## Use contexts for enrichment

Use the [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md) operator to look up values and add context data to events:

```tql
subscribe "network-events"
context_enrich "threat-indicators", key=dst_ip
where threat-indicators != null
publish "alerts"
```

When the lookup succeeds, the context name becomes a field containing the matched data.

## Test context interactions

Contexts are stateful and require a running node. Use **test suites** to share a node fixture across sequential tests.

### Create a test suite

Add a `test.yaml` file to define the suite:

* tests/context/

  * test.yaml Suite configuration
  * 01-list.tql
  * 02-update.tql
  * 03-inspect.tql

tests/context/test.yaml

```yaml
suite: context-tests
fixtures: [node]
```

The suite runs tests in lexicographic order, sharing the node fixture across all tests.

### Write sequential tests

Number test files to control execution order. The first test verifies that the context exists after package installation:

tests/context/01-list.tql

```tql
// Verify the context exists after package installation
context_list
where name == "my-context"
```

The second test loads data into the context using an inline input file:

tests/context/02-update.tql

```tql
// Load data into the context
from_file env("TENZIR_INPUT")
context_update "my-context", key=indicator
```

The input file provides the test data:

tests/context/02-update.input

```json
{"indicator": "hash123", "severity": "high"}
{"indicator": "hash456", "severity": "low"}
```

The third test verifies the context contains the expected data:

tests/context/03-inspect.tql

```tql
// Verify the context contains expected data
context_inspect "my-context"
sort indicator
```

Each test can depend on state left by previous tests in the suite.

### Suite configuration options

| Option     | Description                                       |
| ---------- | ------------------------------------------------- |
| `suite`    | Suite name (required to enable suite mode)        |
| `fixtures` | List of fixtures to start (for example, `[node]`) |
| `timeout`  | Command timeout in seconds (default: 30)          |

## See also

* [Create a package](create-a-package.md)
* [Add operators](add-operators.md)
* [Add pipelines](add-pipelines.md)
* [Test packages](test-packages.md)
* [Use lookup tables](../enrich/use-lookup-tables.md)
* [Enrichment](../../explanations/enrichment.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
