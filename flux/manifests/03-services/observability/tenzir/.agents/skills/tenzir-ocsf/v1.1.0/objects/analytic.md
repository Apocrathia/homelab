# Analytic (analytic)

The Analytic object contains details about the analytic technique used to analyze and derive insights from the data or information that led to the creation of a finding or conclusion.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `category`

- **Type**: `string_t`
- **Requirement**: optional

The analytic category.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the analytic that generated the finding.

### `name`

- **Type**: `string_t`

The name of the analytic that generated the finding.

### `related_analytics`

- **Type**: [`analytic`](analytic.md)
- **Requirement**: optional

> **Deprecated since v1.0.0.** Related Analytics has been decoupled from this object, instead use `finding_info.related_analytics`.

Other analytics related to this analytic.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The analytic type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Rule`
- `2`: `Behavioral`
- `3`: `Statistical`
- `4`: `Learning (ML/DL)`
- `99`: `Other`

The analytic type ID.

### `uid`

- **Type**: `string_t`

The unique identifier of the analytic that generated the finding.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The analytic version. For example: `1.1`.
