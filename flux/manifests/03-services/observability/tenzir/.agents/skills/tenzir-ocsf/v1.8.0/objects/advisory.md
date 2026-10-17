# Advisory (advisory)

The Advisory object represents publicly disclosed cybersecurity vulnerabilities defined in a Security advisory. e.g.  `Microsoft KB Article`, `Apple Security Advisory`, or a `GitHub Security Advisory (GHSA)`

- **Extends**: [Object (object)](object.md)

## Attributes

### `avg_timespan`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The average time to patch.

### `bulletin`

- **Type**: `string_t`
- **Requirement**: optional

The Advisory bulletin identifier.

### `classification`

- **Type**: `string_t`
- **Requirement**: optional

The vendors classification of the Advisory.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the Advisory record was created.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A brief description of the Advisory Record.

### `install_state`

- **Type**: `string_t`
- **Requirement**: recommended

The install state of the Advisory.

### `install_state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `install_state`

#### Enum values

- `0`: `Unknown` - The normalized install state is unknown.
- `1`: `Installed` - The item is installed.
- `2`: `Not Installed` - The item is not installed.
- `3`: `Installed Pending Reboot` - The item is installed pending reboot operation.
- `99`: `Other` - The install state is not mapped. See the `install_state` attribute, which contains a data source specific value.

The normalized install state ID of the Advisory.

### `is_superseded`

- **Type**: `boolean_t`
- **Requirement**: optional

The Advisory has been replaced by another.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the Advisory record was last updated.

### `os`

- **Type**: [`os`](os.md)
- **Requirement**: recommended

The operating system the Advisory applies to.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The product where the vulnerability was discovered.

### `references`

- **Type**: `string_t`
- **Requirement**: recommended

A list of reference URLs with additional information about the vulnerabilities disclosed in the Advisory.

### `related_cves`

- **Type**: [`cve`](cve.md)
- **Requirement**: optional

A list of Common Vulnerabilities and Exposures [(CVE)](https://cve.mitre.org/) identifiers related to the vulnerabilities disclosed in the Advisory.

### `related_cwes`

- **Type**: [`cwe`](cwe.md)
- **Requirement**: optional

A list of Common Weakness Enumeration [(CWE)](https://cwe.mitre.org/) identifiers related to the vulnerabilities disclosed in the Advisory.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size in bytes for the Advisory. Usually populated for a KB Article patch.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The Advisory link from the source vendor.

### `title`

- **Type**: `string_t`
- **Requirement**: recommended

A title or a brief phrase summarizing the Advisory.

### `uid`

- **Type**: `string_t`
- **Requirement**: required
- **Observable**: 44

The unique identifier assigned to the advisory or disclosed vulnerability, e.g, `GHSA-5mrr-rgp6-x4gr`.
