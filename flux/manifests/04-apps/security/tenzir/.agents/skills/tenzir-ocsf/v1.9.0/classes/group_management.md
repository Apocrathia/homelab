# Group Management (group_management)

Group Management events report lifecycle management of a group, as well as privileges, roles, and resources associated with the group. There are two ways updates to the state of a group may be expressed: Using the `Update` activity, for example when updating multiple items at one time, the `updated_group` reflects the changes made to `group`. Using discrete activities, such as `Assign Privileges` the state change is expressed by the `privileges` attribute. Optionally, on success, the `updated_group` reflects the new state of the group.

- **Class UID**: `3006`
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

- `1`: `Assign Privileges` - Assign privileges to the group. Use `privileges` as privileges to be assigned.
- `2`: `Revoke Privileges` - Revoke privileges from the group. Use `privileges` as privileges to be revoked.
- `3`: `Add User` - Add a user or users to the group. Use `users` for the users to be added.
- `4`: `Remove User` - Remove a user or users from the group. Use `users` for the users to be removed.
- `5`: `Delete` - Delete the group.
- `6`: `Create` - Create a group. Populate the `group` object with details of the group to be created.
- `7`: `Add Subgroup` - Add a subgroup to the group. Use `sub_group` as the subgroup to be added.
- `8`: `Remove Subgroup` - Remove a subgroup from the group. Use `sub_group` as the subgroup to be removed.
- `9`: `Update` - Update the group. The updated group details should be populated in the `updated_group` attribute.
- `10`: `Attach Policies` - Attach one or more IAM Policies to the group. Use `policies` as policies to be attached.
- `11`: `Detach Policies` - Detach one or more IAM Policies from the group. Use `policies` as policies to be detached.
- `12`: `Assign Roles` - Assign one or more roles to the group. Use `iam_roles` for the specific roles to be assigned.
- `13`: `Remove Roles` - Remove one or more roles from the group. Use `iam_roles` for the specific roles to be removed.

The normalized identifier of the activity that triggered the event. The target of each activity is the `group` attribute.

### `group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: required
- **Group**: primary

Group that was the target of the event.

### `iam_roles`

- **Type**: [`iam_role`](../objects/iam_role.md)
- **Requirement**: recommended
- **Group**: primary

One or more roles assigned to or removed from a group.

### `policies`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: recommended
- **Group**: context

Details about the IAM policies associated with the Attach/Detach Policy activities.

### `privileges`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

A list of privileges assigned to the group.

### `resource`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.9.0.** User `resources` instead.

Resource that the privileges give access to.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Resources that the privileges, policies, and roles give access to.

### `subgroup`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: recommended
- **Group**: primary

A subgroup added to or removed from `group`.

### `updated_group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: recommended
- **Group**: primary

The intended state of the `group` after the update. On `Success`, represents the actual post-update state.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.9.0.** Use `users` instead.

A user that was added to or removed from `group`.

### `users`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

Users that were added to or removed from `group`.
