# Group Management (group_management)

Group Management events report management updates to a group, including updates to membership and permissions.

- **Class UID**: `3006`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Constraints

- **At least one of**: `privileges`, `user`

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Assign Privileges` - Assign privileges to a group.
- `2`: `Revoke Privileges` - Revoke privileges from a group.
- `3`: `Add User` - Add user to a group.
- `4`: `Remove User` - Remove user from a group.

The normalized identifier of the activity that triggered the event.

### `group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: required
- **Group**: primary

Group that was the target of the event.

### `privileges`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

A list of privileges assigned to the group.

### `resource`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: optional
- **Group**: primary

Resource that the privileges give access to.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

A user that was added to or removed from the group.
