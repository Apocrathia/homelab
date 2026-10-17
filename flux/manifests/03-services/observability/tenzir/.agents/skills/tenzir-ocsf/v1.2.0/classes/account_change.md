# Account Change (account_change)

Account Change events report when specific user account management tasks are performed, such as a user/role being created, changed, deleted, renamed, disabled, enabled, locked out or unlocked.

- **Class UID**: `3001`
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

- `1`: `Create` - A user/role was created.
- `2`: `Enable` - A user/role was enabled.
- `3`: `Password Change` - An attempt was made to change an account's password.
- `4`: `Password Reset` - An attempt was made to reset an account's password.
- `5`: `Disable` - A user/role was disabled.
- `6`: `Delete` - A user/role was deleted.
- `7`: `Attach Policy` - An IAM Policy was attached to a user/role.
- `8`: `Detach Policy` - An IAM Policy was detached from a user/role.
- `9`: `Lock` - A user account was locked out.
- `10`: `MFA Factor Enable` - An authentication factor was enabled for an account.
- `11`: `MFA Factor Disable` - An authentication factor was disabled for an account.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: recommended
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity.

### `policy`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: optional
- **Group**: context

Details about the IAM policy associated to the Attach/Detach Policy activities.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The user that was a target of an activity.

### `user_result`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

The result of the user account change. It should contain the new values of the changed attributes.
