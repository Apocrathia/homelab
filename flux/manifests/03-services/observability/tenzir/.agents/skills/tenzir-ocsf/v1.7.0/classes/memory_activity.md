# Memory Activity (memory_activity)

Memory Activity events report when a process has memory allocated, read/modified, or other manipulation activities - such as a buffer overflow or turning off data execution protection (DEP).

- **Class UID**: `1004`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Associations

- `actor.user` ↔ `device`
- `device` ↔ `actor.user`

## Inherited attributes

**From System Activity:**
- `actor` (required)
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

- `1`: `Allocate Page`
- `2`: `Modify Page`
- `3`: `Delete Page`
- `4`: `Buffer Overflow`
- `5`: `Disable DEP` - Data Execution Permission
- `6`: `Enable DEP` - Data Execution Permission
- `7`: `Read` - Read (Example: `ReadProcessMemory`)
- `8`: `Write` - Write (Example: `WriteProcessMemory`)
- `9`: `Map View` - Map View (Example: `MapViewOfFile2`)

The normalized identifier of the activity that triggered the event.

### `actual_permissions`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The permissions that were granted to access memory.

### `base_address`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The memory address that was access or requested.

### `process`

- **Type**: [`process`](../objects/process.md)
- **Requirement**: required
- **Group**: primary

The process that had memory allocated, read/written, or had other manipulation activities performed on it.

### `requested_permissions`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The permissions mask that was requested to access memory.

### `size`

- **Type**: `long_t`
- **Requirement**: recommended
- **Group**: primary

The memory size that was access or requested.
