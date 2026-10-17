---
title: "Configure inputs"
canonical: https://tenzir.com/docs/guides/packages/configure-inputs
source: https://tenzir.com/docs/guides/packages/configure-inputs.md
section: "Docs"
---

# Configure inputs

> This guide shows you how to make packages configurable with inputs. You’ll learn how to define input variables, use templating syntax, and provide values during installation.

This guide shows you how to make packages configurable with inputs. You’ll learn how to define input variables, use templating syntax, and provide values during installation.

Prefer operator arguments

Expose what varies as arguments of a [user-defined operator](add-operators.md#add-parameters-to-operators) whenever you can. Arguments are typed, documented next to the operator, checked when a pipeline compiles, and free to differ per call. An input is fixed for the whole installation, so reserve it for values that belong to the environment rather than to a call, such as an endpoint or a credential a packaged pipeline needs.

## What are inputs

**Inputs** are template variables that Tenzir replaces with user-provided values when you install a package. They allow package definitions to remain independent of the deployed environment.

Common use cases for inputs:

* API endpoints and credentials
* Refresh intervals and timeouts
* Context names and field mappings
* Feature flags and thresholds

## Define inputs in the manifest

Add inputs to the `inputs` section of your `package.yaml`:

package.yaml

```yaml
inputs:
  refresh_interval:
    # A user-facing name for the input (required).
    name: Refresh Interval
    # A user-facing description of the input.
    description: |
      How often the pipeline refreshes the data source.
    # An (optional) default value. The input is required if there is no default.
    default: 1h


  api_endpoint:
    name: API Endpoint
    description: |
      The URL of the API to fetch data from.
    # No default means this input is required during installation.
```

### Input schema

Each input supports the following fields:

| Field         | Required | Description                                       |
| ------------- | -------- | ------------------------------------------------- |
| `name`        | Yes      | User-facing display name                          |
| `description` | No       | Explanation of what the input controls            |
| `default`     | No       | Default value if not provided during installation |

Inputs without a default value are required - users must provide a value during installation.

## Use inputs in TQL files

Reference inputs using the `{{ inputs.input-id }}` syntax. Tenzir replaces these references with configured values when installing the package.

### In pipelines

pipelines/periodic-update.tql

```tql
---
name: Update Lookup Table
description: >
  Fetches data periodically and updates the context.
disabled: true
---


every {{ inputs.refresh_interval }} {
  from_http "{{ inputs.api_endpoint }}"
}
parse_json
context_update "{{ inputs.context_name }}", key=id
```

Users provide input values during [package installation](install-a-package.md).

### In operators

operators/fetch.tql

```tql
from_http "{{ inputs.api_endpoint }}"
parse_json
```

### In examples

examples/basic-usage.tql

```tql
// Fetch data from the configured endpoint
from_http "{{ inputs.api_endpoint }}"
head 10
```

### In context definitions

package.yaml

```yaml
contexts:
  my-context:
    type: lookup-table
    description: |
      Lookup table refreshed every {{ inputs.refresh_interval }}.
```

## Escape literal curly braces

To write double curly braces literally in your TQL, use the syntax `{{ '{{' }}` to produce the literal string `{{`:

```tql
// This produces the literal string "{{ not_an_input }}"
msg = "{{ '{{' }} not_an_input {{ '}}' }}"
```

## Provide input values

Users provide input values during installation. There are three methods:

### Tenzir Library

In the [Tenzir Library](https://app.tenzir.com/library):

1. Click on a package
2. Select the **Install** tab
3. Fill in the input fields
4. Click **Install**

The Library shows input names, descriptions, and default values to guide users.

### package\_add operator

Use the [`package_add`](https://tenzir.com/docs/reference/operators/package_add.md) operator with an `inputs` record:

```tql
package_add "/path/to/package", inputs={
  refresh_interval: "24h",
  api_endpoint: "https://api.example.com/data",
}
```

Omit inputs that have defaults to use the default values:

```tql
// Uses default refresh_interval, overrides api_endpoint
package_add "/path/to/package", inputs={
  api_endpoint: "https://custom.example.com/feed",
}
```

### Infrastructure as Code

For IaC-style deployments, create a `config.yaml` file next to the `package.yaml`:

config.yaml

```yaml
inputs:
  refresh_interval: 24h
  api_endpoint: https://api.example.com/data
```

The node reads this configuration automatically when Reading the package from the `packages` directory.

## Design guidelines

### Use descriptive names

Choose input IDs that clearly indicate their purpose:

```yaml
# Good
inputs:
  refresh_interval:
    name: Refresh Interval
  api_timeout:
    name: API Timeout


# Avoid
inputs:
  interval:
    name: Interval
  timeout:
    name: Timeout
```

### Provide sensible defaults

When possible, include default values that work for common scenarios:

```yaml
inputs:
  refresh_interval:
    name: Refresh Interval
    description: How often to fetch new data.
    default: 1h  # Reasonable default for most use cases


  log_level:
    name: Log Level
    description: Verbosity of diagnostic output.
    default: info
```

### Document required inputs clearly

For inputs without defaults, explain why the value must be provided:

```yaml
inputs:
  api_key:
    name: API Key
    description: |
      Your API key for authentication. Required because the service
      does not support anonymous access. Get your key from the
      provider's dashboard.
```

### Group related inputs

Use consistent naming patterns for related inputs:

```yaml
inputs:
  source_endpoint:
    name: Source Endpoint
    description: URL to fetch data from.


  source_timeout:
    name: Source Timeout
    description: Request timeout for the source endpoint.
    default: 30s


  source_retries:
    name: Source Retries
    description: Number of retry attempts on failure.
    default: 3
```

## See also

* [Create a package](create-a-package.md)
* [Install a package](install-a-package.md)
* [Add constants](add-constants.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
