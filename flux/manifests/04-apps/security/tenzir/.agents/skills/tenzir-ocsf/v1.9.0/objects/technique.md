# MITRE Technique (technique)

The MITRE Technique object describes the ATT&CK® or ATLAS™ Technique ID and/or name associated to an attack.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The name of the attack technique. For example: `Active Scanning` or `AI Model Inference API Access`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the attack technique. For example: `https://attack.mitre.org/versions/v14/techniques/T1595/`.

### `uid`

- **Type**: `string_t`

The unique identifier of the attack technique. For example: `T1595` or `AML.T0040`.
