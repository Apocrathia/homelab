# Threat Actor (threat_actor)

Threat actor is responsible for the observed malicious activity.

- **Extends**: [Object (object)](object.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the threat actor.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The classification of the threat actor based on their motivations, capabilities, or affiliations. Common types include nation-state actors, cybercriminal groups, hacktivists, or insider threats.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The threat actor type is unknown.
- `1`: `Nation-state`
- `2`: `Cybercriminal`
- `3`: `Hacktivists`
- `4`: `Insider`
- `99`: `Other` - The threat actor type is not mapped.

The normalized datastore resource type identifier.
