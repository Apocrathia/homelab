# Group Management (group_management)

Group Management events report management updates to a group, including updates to membership and permissions.

- **Class UID**: `3006`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Identity & Access Management:**
- `actor` (recommended)
- `src_endpoint` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Assign Privileges` - Assign privileges to a group.
- `2`: `Revoke Privileges` - Revoke privileges from a group.
- `3`: `Add User` - Add user to a group.
- `4`: `Remove User` - Remove user from a group.
- `5`: `Delete` - A group was deleted.
- `6`: `Create` - A group was created.

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
- **Requirement**: recommended
- **Group**: primary

Resource that the privileges give access to.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

A user that was added to or removed from the group.
