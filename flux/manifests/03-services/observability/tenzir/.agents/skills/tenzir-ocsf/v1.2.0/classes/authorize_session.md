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

- `1`: `Assign Privileges` - Assign special privileges to a new logon.
- `2`: `Assign Groups` - Assign special groups to a new logon.

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
