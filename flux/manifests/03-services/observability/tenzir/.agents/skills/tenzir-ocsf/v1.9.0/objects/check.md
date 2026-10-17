# Check (check)

The check object defines a specific, testable compliance verification point that evaluates a target device against a standard, framework, or custom requirement. While checks are typically associated with formal standards (like CIS, NIST, or ISO), they can also represent custom or organizational requirements. When mapped to controls, checks can evaluate specific control_parameters to determine compliance status, but neither the control mapping nor control_parameters are required for a valid check.

- **Extends**: [Object (object)](object.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The detailed description of the compliance check, explaining the security requirement, vulnerability, or configuration being assessed. For example, CIS: `The cramfs filesystem type is a compressed read-only Linux filesystem. Removing support for unneeded filesystem types reduces the local attack surface.` or DISA STIG: `Unauthorized access to the information system by foreign entities may result in loss or compromise of data.`

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name or title of the compliance check. For example, CIS: `Ensure mounting of cramfs filesystems is disabled` or DISA STIG: `The Ubuntu operating system must implement DoD-approved encryption to protect the confidentiality of remote access sessions`.

### `resource`

- **Type**: [`resource_details`](resource_details.md)
- **Requirement**: optional

Describes details about the resource that this check evaluated.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional

The severity level as defined in the source document. For example CIS Benchmarks, valid values are: `Level 1` (security-forward, essential settings), `Level 2` (security-focused environment, more restrictive), or `Scored/Not Scored` (whether compliance can be automatically checked). For DISA STIG, valid values are: `CAT I` (maps to severity_id 5/Critical), `CAT II` (maps to severity_id 4/High), or `CAT III` (maps to severity_id 3/Medium).

### `severity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `severity`

#### Enum values

- `0`: `Unknown` - The severity is unknown.
- `1`: `Informational` - Informational message. No action required.
- `2`: `Low` - The user decides if action is needed.
- `3`: `Medium` - Maps to CIS Benchmark `Level 1` - Essential security settings recommended for all systems, or DISA STIG `CAT III` - Action is required but the situation is not serious at this time.
- `4`: `High` - Maps to CIS Benchmark `Level 2` - More restrictive and security-focused settings for sensitive environments, or DISA STIG `CAT II` - Action is required immediately.
- `5`: `Critical` - Maps to DISA STIG `CAT I` - Action is required immediately and the scope is broad.
- `6`: `Fatal` - An error occurred but it is too late to take remedial action.
- `99`: `Other` - The severity is not mapped. See the `severity` attribute, which contains a data source specific value.

The normalized severity identifier that maps severity levels to standard severity levels. For example CIS Benchmark: `Level 2` maps to `4` (High), `Level 1` maps to `3` (Medium). For DISA STIG: `CAT I` maps to `5` (Critical), `CAT II` maps to `4` (High), and `CAT III` maps to `3` (Medium).

### `standards`

- **Type**: `string_t`
- **Requirement**: recommended

The regulatory or industry standard this check is associated with. E.g., `PCI DSS 3.2.1`, `HIPAA Security Rule`, `NIST SP 800-53 Rev. 5`, or `ISO/IEC 27001:2013`.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended

The resultant status of the compliance check normalized to the caption of the `status_id` value. For example, CIS Benchmark: `Pass` when all requirements are met, `Fail` when requirements are not met, or DISA STIG: `NotAFinding` (maps to status_id 1/Pass), `Open` (maps to status_id 3/Fail).

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `status`

#### Enum values

- `0`: `Unknown` - The status is unknown.
- `1`: `Pass` - The compliance check passed for all the evaluated resources.
- `2`: `Warning` - The compliance check did not yield a result due to missing information.
- `3`: `Fail` - The compliance check failed for at least one of the evaluated resources.
- `99`: `Other` - The event status is not mapped. See the `status` attribute, which contains a data source specific value.

The normalized status identifier of the compliance check.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the compliance check within its standard or framework. For example, CIS Benchmark identifier `1.1.1.1`, DISA STIG identifier `V-230234`, or NIST control identifier `AC-17(2)`.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The check version. For example, CIS Benchmark: `1.1.0` for Amazon Linux 2 or DISA STIG: `V2R1` for Windows 10.
