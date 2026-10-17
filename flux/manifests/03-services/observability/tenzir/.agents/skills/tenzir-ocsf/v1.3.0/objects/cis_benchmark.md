# CIS Benchmark (cis_benchmark)

The CIS Benchmark object describes best practices for securely configuring IT systems, software, networks, and cloud infrastructure as defined by the [Center for Internet Security](https://www.cisecurity.org/cis-benchmarks/). See also [Getting to Know the CIS Benchmarks](https://www.cisecurity.org/insights/blog/getting-to-know-the-cis-benchmarks).

- **Extends**: [Object (object)](object.md)

## Attributes

### `cis_controls`

- **Type**: [`cis_control`](cis_control.md)
- **Requirement**: recommended

The CIS Critical Security Controls is a prioritized set of actions to protect your organization and data from cyber-attack vectors.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The CIS Benchmark description. For example: The cramfs filesystem type is a compressed read-only Linux filesystem embedded in small footprint systems. A cramfs image can be used without having to first decompress the image.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The CIS Benchmark name. For example: Ensure mounting of cramfs filesystems is disabled.
