# User Access Management (user_access)

User Access Management events report management updates to a user's privileges.

- **Class UID**: `3005`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Identity & Access Management:**
- `src_endpoint` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Assign Privileges` - Assign privileges to a user.
- `2`: `Revoke Privileges` - Revoke privileges from a user.

The normalized identifier of the activity that triggered the event.

### `privileges`

- **Type**: `string_t`
- **Requirement**: required
- **Group**: primary

List of privileges assigned to a user.

### `resource`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Resource that the privileges give access to.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

User to which privileges were assigned.
