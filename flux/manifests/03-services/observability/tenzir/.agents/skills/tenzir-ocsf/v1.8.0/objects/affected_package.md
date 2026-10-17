# Affected Software Package (affected_package)

The Affected Package object describes details about a software package identified as affected by a vulnerability/vulnerabilities.

- **Extends**: [Software Package (package)](package.md)

## Attributes

### `fixed_in_version`

- **Type**: `string_t`
- **Requirement**: optional

The software package version in which a reported vulnerability was patched/fixed.

### `path`

- **Type**: `file_path_t`
- **Requirement**: optional

The installation path of the affected package.

### `remediation`

- **Type**: [`remediation`](remediation.md)
- **Requirement**: optional

Describes the recommended remediation steps to address identified issue(s).
