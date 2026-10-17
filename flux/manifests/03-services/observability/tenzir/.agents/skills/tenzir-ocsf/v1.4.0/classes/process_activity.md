# Process Activity (process_activity)

Process Activity events report when a process launches, injects, opens or terminates another process, successful or otherwise.

- **Class UID**: `1007`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Associations

- `actor.user` ↔ `device`
- `device` ↔ `actor.user`

## Inherited attributes

**From System Activity:**
- `device` (required)

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

- `1`: `Launch`
- `2`: `Terminate`
- `3`: `Open`
- `4`: `Inject`
- `5`: `Set User ID`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)

The actor that performed the activity on the target `process`. For example, the process that started a new process or injected code into another process.

### `actual_permissions`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The permissions that were granted to the process in a platform-native format.

### `exit_code`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The exit code reported by a process when it terminates. The convention is that zero indicates success and any non-zero exit code indicates that some error occurred.

### `injection_type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The process injection method, normalized to the caption of the injection_type_id value. In the case of 'Other', it is defined by the event source.

### `injection_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `injection_type`

#### Enum values

- `0`: `Unknown` - The injection type is unknown.
- `1`: `Remote Thread`
- `2`: `Load Library`
- `3`: `Queue APC`
- `99`: `Other` - The injection type is not mapped. See the `injection_type` attribute, which contains a data source specific value.

The normalized identifier of the process injection method.

### `module`

- **Type**: [`module`](../objects/module.md)
- **Requirement**: recommended
- **Group**: primary

The module that was injected by the actor process.

### `process`

- **Type**: [`process`](../objects/process.md)
- **Requirement**: required
- **Group**: primary

The process that was launched, injected into, opened, or terminated.

### `requested_permissions`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The permissions mask that was requested by the process.
