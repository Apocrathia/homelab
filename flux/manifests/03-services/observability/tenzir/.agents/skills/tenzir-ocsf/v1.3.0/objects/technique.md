# MITRE ATT&CK® Technique (technique)

The MITRE ATT&CK® Technique object describes the technique ID and/or name associated to an attack, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The name of the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `Active Scanning`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `https://attack.mitre.org/versions/v14/techniques/T1595/`.

### `uid`

- **Type**: `string_t`

The unique identifier of the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `T1595`.
