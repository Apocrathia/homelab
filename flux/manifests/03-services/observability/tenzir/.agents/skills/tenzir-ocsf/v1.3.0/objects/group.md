# Group (group)

The Group object represents a collection or association of entities, such as users, policies, or devices. It serves as a logical grouping mechanism to organize and manage entities with similar characteristics or permissions within a system or organization.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The group description.

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The domain where the group is defined. For example: the LDAP or Active Directory domain.

### `name`

- **Type**: `string_t`

The group name.

### `privileges`

- **Type**: `string_t`
- **Requirement**: optional

The group privileges.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the group or account.

### `uid`

- **Type**: `string_t`

The unique identifier of the group. For example, for Windows events this is the security identifier (SID) of the group.
