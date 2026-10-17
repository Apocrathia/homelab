# Privilege Attack Info (privilege_attack_info)

The Privilege Attack Info object groups privileges by the potential attack they could enable. It maps specific privileges to MITRE ATT&CK techniques, helping identify security risks associated with granted permissions.

- **Extends**: [Object (object)](object.md)

## Attributes

### `attack`

- **Type**: [`attack`](attack.md)
- **Requirement**: required

The MITRE ATT&CK technique that these privileges could enable.

### `privilege_info_list`

- **Type**: [`privilege_info`](privilege_info.md)
- **Requirement**: required

The list of privilege information objects, where each element describes a specific privilege that could enable the associated attack technique.
