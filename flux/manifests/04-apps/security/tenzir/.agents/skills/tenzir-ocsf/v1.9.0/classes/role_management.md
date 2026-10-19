# Role Management (role_management)

Role Management events report lifecycle management of a role, as well as privileges, policies, credentials, and resources associated with the role. There are two ways updates to the state of a role may be expressed: Using the `Update` activity, for example when updating multiple items at one time, the `updated_role` reflects the changes made to `iam_role`. Using discrete activities, such as `Assign Privileges` the state change is expressed by the `privileges` attribute. Optionally, on success, the `updated_role` reflects the new state of the role. Roles assigned or removed from users and groups are expressed by the `User Management` and `Group Management` classes.

- **Class UID**: `3008`
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

- `1`: `Create` - Create a role. Use `iam_role` as the role to be created.
- `2`: `Update` - Update a role. The updated role details should be populated in the `updated_role` attribute.
- `3`: `Delete` - Delete a role. Use `iam_role` as the role to be deleted.
- `4`: `Assign Privileges` - Assign privileges to a role. Use `privileges` to be assigned to `iam_role`.
- `5`: `Remove Privileges` - Remove privileges from a role. Use `privileges` to be removed from `iam_role`.
- `6`: `Assign Resources` - Assign resources to a role. Use `resources` to be assigned to `iam_role`.
- `7`: `Remove Resources` - Remove resources from a role. Use `resources` to be removed from `iam_role`.
- `8`: `Attach Policies` - Attach one or more policies to a role. Use `policies` to be attached to `iam_role`.
- `9`: `Detach Policies` - Detach one or more policies from a role. Use `policies` to be detached from `iam_role`.
- `10`: `Add Programmatic Credentials` - Add credentials to a role. Use `programmatic_credentials` to be added to `iam_role`.
- `11`: `Remove Programmatic Credentials` - Remove credentials from a role. Use `programmatic_credentials` to be removed from `iam_role`.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `iam_role`

- **Type**: [`iam_role`](../objects/iam_role.md)
- **Requirement**: required
- **Group**: primary

The target role.

### `policies`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: optional
- **Group**: context

Details about the IAM policies associated with the Attach/Detach Policy activities.

### `privileges`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

A list of privileges assigned to or removed from `iam_role`.

### `programmatic_credentials`

- **Type**: [`programmatic_credential`](../objects/programmatic_credential.md)
- **Requirement**: recommended

Details about the programmatic credential (API keys, access tokens, certificates, etc) associated with the role.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Resources assigned or removed from `iam_role`.

### `updated_role`

- **Type**: [`iam_role`](../objects/iam_role.md)
- **Requirement**: recommended
- **Group**: primary

The intended state of the `iam_role` after the update. On `Success`, represents the actual post-update state.
