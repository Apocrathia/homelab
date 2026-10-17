# MITRE ATT&CK® Tactic (tactic)

The MITRE ATT&CK® Tactic object describes the tactic ID and/or name that is associated to an attack, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The tactic name that is associated with the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `Reconnaissance`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the attack tactic, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `https://attack.mitre.org/versions/v14/tactics/TA0043/`.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The tactic ID that is associated with the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix). For example: `TA0043`.
