# CVSS Score (cvss)

The Common Vulnerability Scoring System ([CVSS](https://www.first.org/cvss/)) object provides a way to capture the principal characteristics of a vulnerability and produce a numerical score reflecting its severity.

- **Extends**: [Object (object)](object.md)

## Attributes

### `base_score`

- **Type**: `float_t`
- **Requirement**: required

The CVSS base score. For example: `9.1`.

### `depth`

- **Type**: `string_t`
- **Requirement**: recommended

#### Enum values

- `Base`: `Base`
- `Environmental`: `Environmental`
- `Temporal`: `Temporal`

The CVSS depth represents a depth of the equation used to calculate CVSS score.

### `metrics`

- **Type**: [`metric`](metric.md)
- **Requirement**: optional

The Common Vulnerability Scoring System metrics.This attribute contains information on the CVE's impact. If the CVE has been analyzed, this attribute will contain any CVSSv2 or CVSSv3 information associated with the vulnerability. For example:  `{{"Access Vector", "Network"}, {"Access Complexity", "Low"}, ...}`.

### `overall_score`

- **Type**: `float_t`
- **Requirement**: recommended

The CVSS overall score, impacted by base, temporal, and environmental metrics. For example: `9.1`.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional

The Common Vulnerability Scoring System (CVSS) Qualitative Severity Rating. A textual representation of the numeric score.

CVSS v2.0

- Low (0.0 – 3.9)
- Medium (4.0 – 6.9)
- High (7.0 – 10.0)

CVSS v3.0

- None (0.0)
- Low (0.1 - 3.9)
- Medium (4.0 - 6.9)
- High (7.0 - 8.9)
- Critical (9.0 - 10.0)

### `vector_string`

- **Type**: `string_t`
- **Requirement**: optional

The CVSS vector string is a text representation of a set of CVSS metrics. It is commonly used to record or transfer CVSS metric information in a concise form. For example: `3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:H`.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The CVSS version. For example: `3.1`.
