# MITRE ATT&CK® (attack)

The [MITRE ATT&CK®](https://attack.mitre.org) object describes the tactic, technique & sub-technique associated to an attack as defined in [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

- **Extends**: [Object (object)](object.md)

## Attributes

### `tactic`

- **Type**: [`tactic`](tactic.md)
- **Requirement**: optional

The Tactic object describes the tactic ID and/or name that is associated to an attack, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

### `tactics`

- **Type**: [`tactic`](tactic.md)
- **Requirement**: optional

> **Deprecated since v1.1.0.** Use the  `tactic`  attribute instead.

The Tactic object describes the tactic ID and/or tactic name that are associated with the attack technique, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

### `technique`

- **Type**: [`technique`](technique.md)
- **Requirement**: optional

The Technique object describes the technique ID and/or name associated to an attack, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

### `sub_technique`

- **Type**: [`sub_technique`](sub_technique.md)
- **Requirement**: optional

The Sub Technique object describes the sub technique ID and/or name associated to an attack, as defined by [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix).

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The [ATT&CK® Matrix](https://attack.mitre.org/wiki/ATT&CK_Matrix) version.
