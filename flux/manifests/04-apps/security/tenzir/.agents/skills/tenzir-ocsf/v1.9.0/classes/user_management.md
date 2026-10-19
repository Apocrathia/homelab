# User Management (user_management)

User Management events report lifecycle management of a user and account management tasks that are performed, such as a password change or reset, a user being created, updated, deleted, disabled, enabled, locked out or unlocked. There are two ways updates to the state of a user may be expressed: Using the `Update` activity, for example when updating multiple items at one time, the `updated_user` reflects the changes made to `user`. Using discrete activities, such as `Assign Privileges` the state change is expressed by the `privileges` attribute. Optionally, on successful changes, the `updated_user` reflects the new state of the user.

- **Class UID**: `3007`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

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

- `1`: `Create` - Create a user. Populate the `user` object with details of the user.
- `2`: `Update` - Update the user. The updated user details should be populated in the `updated_user` attribute.
- `3`: `Delete` - Delete the user.
- `4`: `Enable` - Enable the user.
- `5`: `Disable` - Disable the user.
- `6`: `Lock` - Lock out the user.
- `7`: `Unlock` - Unlock a previously locked out user.
- `8`: `Password Change` - An attempt to change the user's password.
- `9`: `Password Reset` - An attempt to reset the user's password.
- `10`: `Attach Policies` - Attach one or more IAM Policies to the user. Use `policies` as policies to be attached.
- `11`: `Detach Policies` - Detach one or more IAM Policies from the user. Use `policies` as policies to be detached.
- `12`: `Enable MFA Factors` - Enable one or more authentication factors for the user. Use `auth_factors` as factors to be enabled.
- `13`: `Disable MFA Factors` - Disable one or more authentication factors for the user. Use `auth_factors` as factors to be disabled.
- `14`: `Assign Privileges` - Assign privileges to the user. Use `privileges` as privileges to be assigned.
- `15`: `Remove Privileges` - Remove privileges from the user. Use `privileges` as privileges to be removed.
- `16`: `Assign Roles` - Assign one or more roles to the user. Use `iam_roles` as roles to be assigned.
- `17`: `Remove Roles` - Remove one or more roles from the user. Use `iam_roles` as roles to be removed.
- `18`: `Add Programmatic Credentials` - Add credentials to a role. Use `programmatic_credentials` as credentials to be added.
- `19`: `Remove Programmatic Credentials` - Remove credentials from a role. Use `programmatic_credentials` as credentials to be removed.

The normalized identifier of the activity that triggered the event. The target of each activity is the `user` attribute.

### `auth_factors`

- **Type**: [`auth_factor`](../objects/auth_factor.md)
- **Requirement**: recommended
- **Group**: context

Details about the authentication factors associated with the MFA Factor Enable/Disable activities.

### `iam_roles`

- **Type**: [`iam_role`](../objects/iam_role.md)
- **Requirement**: recommended
- **Group**: primary

One or more roles assigned to or removed from a user.

### `policies`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: recommended
- **Group**: context

Details about the IAM policies associated with the Attach/Detach Policy activities.

### `privileges`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

Set of privileges assigned to a user.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Resources that the privileges, policies, and roles give access to.

### `updated_user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

The intended state of the `user` after the update. On `Success`, represents the actual post-update state.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The user that was a target of an activity.
