# MITRE Mitigation (mitigation)

The MITRE Mitigation object describes the ATT&CK® or ATLAS™ Mitigation ID and/or name that is associated to an attack.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `countermeasures`

- **Type**: [`d3fend`](d3fend.md)
- **Requirement**: optional

The D3FEND countermeasures that are associated with the attack technique. For example: ATT&CK Technique `T1003` is addressed by Mitigation `M1027`, and D3FEND Technique `D3-OTP`.

### `name`

- **Type**: `string_t`

The Mitigation name that is associated with the attack technique. For example: `Password Policies`, or `Code Signing`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the Mitigation. For example: `https://attack.mitre.org/versions/v14/mitigations/M1027`.

### `uid`

- **Type**: `string_t`

The Mitigation ID that is associated with the attack technique. For example: `M1027`, or `AML.M0013`.
