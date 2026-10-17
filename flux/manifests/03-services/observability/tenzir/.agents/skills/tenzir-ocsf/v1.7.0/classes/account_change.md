# Account Change (account_change)

Account Change events report when specific user account management tasks are performed, such as a user/role being created, changed, deleted, renamed, disabled, enabled, locked out or unlocked.

- **Class UID**: `3001`
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

- `1`: `Create` - A user/role was created.
- `2`: `Enable` - A user/role was enabled.
- `3`: `Password Change` - An attempt was made to change a user account's password.
- `4`: `Password Reset` - An attempt was made to reset a user account's password.
- `5`: `Disable` - A user/role was disabled.
- `6`: `Delete` - A user/role was deleted.
- `7`: `Attach Policy` - An IAM Policy was attached to a user/role.
- `8`: `Detach Policy` - An IAM Policy was detached from a user/role.
- `9`: `Lock` - A user account was locked out.
- `10`: `MFA Factor Enable` - One or more authentication factors were enabled for a user account.
- `11`: `MFA Factor Disable` - One or more authentication factors were disabled for a user account.
- `12`: `Unlock` - A user account was unlocked.

The normalized identifier of the activity that triggered the event.

### `auth_factors`

- **Type**: [`auth_factor`](../objects/auth_factor.md)
- **Requirement**: optional
- **Group**: context

Details about the authentication factors associated with the MFA Factor Enable/Disable activities.

### `policies`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: optional
- **Group**: context

Details about the IAM policies associated with the Attach/Detach Policy activities.

### `policy`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: optional
- **Group**: context

> **Deprecated since v1.4.0.** Use the `policies` attribute instead.

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
