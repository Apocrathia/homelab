# Authorize Session (authorize_session)

Authorize Session events report privileges or groups assigned to a new user session, usually at login time.

- **Class UID**: `3003`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Constraints

- **Exactly one of**: `privileges`, `group`

## Associations

- `session` ↔ `user`
- `user` ↔ `session`

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

- `99`: `Other` - The event activity is not mapped.
- `0`: `Unknown` - The event activity is unknown.

The normalized identifier of the activity that triggered the event.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: optional
- **Group**: context

The Endpoint for which the user session was targeted.

### `group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: recommended
- **Group**: primary

Group that was assigned to the new user session.

### `privileges`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The list of sensitive privileges, assigned to the new user session.

### `session`

- **Type**: [`session`](../objects/session.md)
- **Requirement**: recommended
- **Group**: primary

The user session with the assigned privileges.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The user to which new privileges were assigned.
