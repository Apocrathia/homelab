# Compliance (compliance)

The Compliance object contains information about Industry and Regulatory Framework standards, controls and requirements or details about custom assessments utilized in a compliance evaluation. Standards define broad security frameworks, controls represent specific security requirements within those frameworks, and checks are the testable verification points used to determine if controls are properly implemented.

- **Extends**: [Object (object)](object.md)

## Attributes

### `assessments`

- **Type**: [`assessment`](assessment.md)
- **Requirement**: optional

A list of assessments associated with the compliance requirements evaluation.

### `category`

- **Type**: `string_t`
- **Requirement**: optional

The category a control framework pertains to, as reported by the source tool, such as `Asset Management` or `Risk Assessment`.

### `checks`

- **Type**: [`check`](check.md)
- **Requirement**: optional

A list of compliance checks associated with specific industry standards or frameworks. Each check represents an individual rule or requirement that has been evaluated against a target device. Checks typically include details such as the check name (e.g., CIS: 'Ensure mounting of cramfs filesystems is disabled' or DISA STIG descriptive titles), unique identifiers (such as CIS identifier '1.1.1.1' or DISA STIG identifier 'V-230234'), descriptions (detailed explanations of security requirements or vulnerability discussions), and version information.

### `compliance_references`

- **Type**: [`kb_article`](kb_article.md)
- **Requirement**: optional

> **Deprecated since v1.5.0.** Use the Compliance object with Check array instead.

A list of reference KB articles that provide information to help organizations understand, interpret, and implement compliance standards. They provide guidance, best practices, and examples.

### `compliance_standards`

- **Type**: [`kb_article`](kb_article.md)
- **Requirement**: optional

> **Deprecated since v1.5.0.** Use the Compliance object with Check array instead.

A list of established guidelines or criteria that define specific requirements an organization must follow.

### `control`

- **Type**: `string_t`
- **Requirement**: recommended

A Control is a prescriptive, actionable set of specifications that strengthens device posture. The control specifies required security measures, while the specific implementation values are defined in control_parameters. E.g., CIS AWS Foundations Benchmark 1.2.0 - Control 2.1 - Ensure CloudTrail is enabled in all regions

### `control_parameters`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of control parameters evaluated in a Compliance check. E.g., parameters for CloudTrail configuration might include `multiRegionTrailEnabled: true`, `logFileValidationEnabled: true`, and `requiredRegions: [us-east-1, us-west-2]`

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description or criteria of a control.

### `requirements`

- **Type**: `string_t`
- **Requirement**: optional

The specific compliance requirements being evaluated. E.g., `PCI DSS Requirement 8.2.3 - Passwords must meet minimum complexity requirements` or `HIPAA Security Rule 164.312(a)(2)(iv) - Implement encryption and decryption mechanisms`

### `standards`

- **Type**: `string_t`
- **Requirement**: recommended

The regulatory or industry standards being evaluated for compliance.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended

The resultant status of the compliance check normalized to the caption of the `status_id` value. In the case of 'Other', it is defined by the event source.

### `status_code`

- **Type**: `string_t`
- **Requirement**: optional

The resultant status code of the compliance check.

### `status_detail`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the  `status_details`  attribute instead.

The contextual description of the `status, status_code` values.

### `status_details`

- **Type**: `string_t`
- **Requirement**: optional

A list of contextual descriptions of the `status, status_code` values.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `status`

#### Enum values

- `1`: `Pass` - The compliance check passed for all the evaluated resources.
- `2`: `Warning` - The compliance check did not yield a result due to missing information.
- `3`: `Fail` - The compliance check failed for at least one of the evaluated resources.

The normalized status identifier of the compliance check.
