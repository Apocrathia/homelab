# Compliance (compliance)

The Compliance object contains information about Industry and Regulatory Framework standards, controls and requirements.

- **Extends**: [Object (object)](object.md)

## Attributes

### `compliance_references`

- **Type**: [`kb_article`](kb_article.md)
- **Requirement**: optional

A list of sources of information or tools that help organizations understand, interpret, and implement compliance standards. They provide guidance, best practices, and examples.

### `compliance_standards`

- **Type**: [`kb_article`](kb_article.md)
- **Requirement**: optional

A list of established guidelines or criteria that define specific requirements an organization must follow.

### `control`

- **Type**: `string_t`
- **Requirement**: recommended

A Control is prescriptive, prioritized, and simplified set of best practices that one can use to strengthen their cybersecurity posture. e.g. AWS SecurityHub Controls, CIS Controls.

### `requirements`

- **Type**: `string_t`
- **Requirement**: optional

A list of requirements associated to a specific control in an industry or regulatory framework. e.g.  `NIST.800-53.r5 AU-10`

### `standards`

- **Type**: `string_t`
- **Requirement**: required

Security standards are a set of criteria organizations can follow to protect sensitive and confidential information. e.g. `NIST SP 800-53, CIS AWS Foundations Benchmark v1.4.0, ISO/IEC 27001`

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

The contextual description of the status, status_code values.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `status`

#### Enum values

- `1`: `Pass` - The compliance check passed for all the evaluated resources.
- `2`: `Warning` - The compliance check did not yield a result due to missing information.
- `3`: `Fail` - The compliance check failed for at least one of the evaluated resources.

The normalized status identifier of the compliance check.
