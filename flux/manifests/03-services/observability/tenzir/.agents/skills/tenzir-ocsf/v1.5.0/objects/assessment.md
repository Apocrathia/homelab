# Assessment (assessment)

The Assessment object describes a point-in-time assessment, check, or evaluation of a specific configuration or signal against an asset, entity, person, or otherwise. For example, this can encapsulate `os_signals` from CrowdStrike Falcon Zero Trust Assessments, or account for `Datastore` configurations from Cyera, or capture details of Microsoft Intune configuration policies.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `category`

- **Type**: `string_t`
- **Requirement**: optional

The category that the assessment is part of. For example: `Prevention` or `Windows 10`.

### `desc`

- **Type**: `string_t`
- **Requirement**: recommended

The description of the assessment criteria, or a description of the specific configuration or signal the assessment is targeting.

### `meets_criteria`

- **Type**: `boolean_t`
- **Requirement**: required

Determines whether the assessment against the specific configuration or signal meets the assessments criteria. For example, if the assessment checks if a `Datastore` is encrypted or not, having encryption would be evaluated as `true`.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the configuration or signal being assessed. For example: `Kernel Mode Code Integrity (KMCI)` or `publicAccessibilityState`.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

The details of any policy associated with an assessment.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the configuration or signal being assessed. For example: the `signal_id`.
