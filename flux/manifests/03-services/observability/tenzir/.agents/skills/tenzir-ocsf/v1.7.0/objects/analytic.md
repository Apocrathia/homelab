# Analytic (analytic)

The Analytic object contains details about the analytic technique used to analyze and derive insights from the data or information that led to the creation of a finding or conclusion.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: optional

The algorithm used by the underlying analytic to generate the finding.

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

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The Analytic state.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `state`

#### Enum values

- `1`: `Active` - The Analytic is active.
- `2`: `Suppressed` - The Analytic is suppressed. For example, a user/customer has suppressed a particular detection signature in a security product.
- `3`: `Experimental` - The Analytic is still under development and considered experimental.

The Analytic state identifier.

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
- `1`: `Rule` - A Rule in security analytics refers to predefined criteria or conditions set to monitor, alert, or enforce policies, playing a crucial role in access control, threat detection, and regulatory compliance across security systems.
- `2`: `Behavioral` - Behavioral analytics focus on monitoring and analyzing user or system actions to identify deviations from established patterns, aiding in the detection of insider threats, fraud, and advanced persistent threats (APTs).
- `3`: `Statistical` - Statistical analytics pertains to analyzing data patterns and anomalies using statistical models to predict, detect, and respond to potential threats, enhancing overall security posture through informed decision-making.
- `4`: `Learning (ML/DL)` - Learning (ML/DL) encompasses techniques that can "learn" from known data to create analytics that generalize to new data. There may be a statistical component to these techniques, but it is not a requirement.
- `5`: `Fingerprinting` - Fingerprinting is the technique of collecting detailed system data, including software versions and configurations, to enhance threat detection, data loss prevention (DLP), and endpoint detection and response (EDR) capabilities.
- `6`: `Tagging` - Tagging refers to the practice of assigning labels or identifiers to data, users, assets, or activities to monitor, control access, and facilitate incident response across various security domains such as DLP and EDR.
- `7`: `Keyword Match` - Keyword Match involves scanning content for specific terms to identify sensitive information, potential threats, or policy violations, aiding in DLP and compliance monitoring.
- `8`: `Regular Expressions` - Regular Expressions are used to define complex search patterns for identifying, validating, and extracting specific data sets or threats within digital content, enhancing DLP, EDR, and threat detection mechanisms.
- `9`: `Exact Data Match` - Exact Data Match is a precise comparison technique used to detect the unauthorized use or exposure of specific, sensitive information, crucial for enforcing DLP policies and protecting against data breaches.
- `10`: `Partial Data Match` - Partial Data Match involves identifying instances where segments of sensitive information or patterns match, facilitating nuanced DLP and threat detection without requiring complete data conformity.
- `11`: `Indexed Data Match` - Indexed Data Match refers to comparing content against a pre-compiled index of sensitive information to efficiently detect and prevent unauthorized access or breaches, streamlining DLP and compliance efforts.
- `99`: `Other`

The analytic type ID.

### `uid`

- **Type**: `string_t`

The unique identifier of the analytic that generated the finding.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The analytic version. For example: `1.1`.
