# Managed Entity (managed_entity)

The Managed Entity object describes the type and version of an entity, such as a user, device, or policy. For types in the `type_id` enum list, an associated attribute should be populated. If the type of entity is not in the `type_id` list, information can be put into the `data` attribute and the `type` attribute should identify the entity.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The managed entity content as a JSON object.

### `name`

- **Type**: `string_t`

The name of the managed entity.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The managed entity type. For example: `policy`, `user`, `organizational unit`, `device`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Device` - A managed Device entity. This item corresponds to population of the `device` attribute.
- `2`: `User` - A managed User entity. This item corresponds to population of the `user` attribute.
- `3`: `Group` - A managed Group entity. This item corresponds to population of the `group` attribute.
- `4`: `Organization` - A managed Organization entity. This item corresponds to population of the `org` attribute.
- `5`: `Policy` - A managed Policy entity. This item corresponds to population of the `policy` attribute.
- `6`: `Email` - A managed Email entity. This item corresponds to population of the `email` attribute.

The type of the Managed Entity. It is recommended to also populate the `type` attribute with the associated label, or the source specific name if `Other`.

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: recommended

An addressable device, computer system or host.

### `email`

- **Type**: [`email`](email.md)
- **Requirement**: recommended

The email object.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: recommended

The group object associated with an entity such as user, policy, or rule.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: recommended

Organization and org unit relevant to the event or object.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: recommended

Describes details of a managed policy.

### `uid`

- **Type**: `string_t`

The identifier of the managed entity.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The user that pertains to the event or object.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The version of the managed entity. For example: `1.2.3`.
