# CIS Benchmark Result (cis_benchmark_result)

The CIS Benchmark Result object contains information as defined by the Center for Internet Security ([CIS](https://www.cisecurity.org/cis-benchmarks/)) benchmark result. CIS Benchmarks are a collection of best practices for securely configuring IT systems, software, networks, and cloud infrastructure.

- **Extends**: [Object (object)](object.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The CIS benchmark description.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The CIS benchmark name.

### `remediation`

- **Type**: [`remediation`](remediation.md)
- **Requirement**: optional

Describes the recommended remediation steps to address identified issue(s).

### `rule`

- **Type**: [`rule`](rule.md)
- **Requirement**: optional

The CIS benchmark rule.
