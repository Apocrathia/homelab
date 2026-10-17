# Attack (attack)

The Attack object describes the technique and associated tactics related to an attack. See [MITRE ATT&CK®](https://attack.mitre.org).

- **Extends**: [Object (object)](object.md)

## Attributes

### `tactics`

- **Type**: [`tactic`](tactic.md)
- **Requirement**: required

The a list of tactic ID's/names that are associated with the attack technique, as defined by [ATT&CK MatrixTM](https://attack.mitre.org/wiki/ATT&CK_Matrix).

### `technique`

- **Type**: [`technique`](technique.md)
- **Requirement**: required

The attack technique.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The ATT&CK Matrix version.
