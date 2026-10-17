# Process (process)

The Process object describes a running instance of a launched program.

- **Extends**: [Process Entity (process_entity)](process_entity.md)

## Attributes

### `ancestry`

- **Type**: [`process_entity`](process_entity.md)
- **Requirement**: optional

An array of Process Entities describing the extended parentage of this process object. Direct parent information sould be expressed through the `parent_process` attribute. The first array element is the direct parent of this process object. Subsequent list elements go up the process parentage hierarchy. That is, the array is sorted from newest to oldest process. It is recommended to only populate this field for the top-level process object.

### `environment_variables`

- **Type**: [`environment_variable`](environment_variable.md)
- **Requirement**: optional

Environment variables associated with the process.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

The process file object.

### `integrity`

- **Type**: `string_t`
- **Requirement**: optional

The process integrity level, normalized to the caption of the integrity_id value. In the case of 'Other', it is defined by the event source (Windows only).

### `integrity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `integrity`

#### Enum values

- `0`: `Unknown` - The integrity level is unknown.
- `1`: `Untrusted`
- `2`: `Low`
- `3`: `Medium`
- `4`: `High`
- `5`: `System`
- `6`: `Protected`
- `99`: `Other` - The integrity level is not mapped. See the `integrity` attribute, which contains a data source specific value.

The normalized identifier of the process integrity level (Windows only).

### `lineage`

- **Type**: `file_path_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `ancestry` attribute.

The lineage of the process, represented by a list of paths for each ancestor process. For example: `['/usr/sbin/sshd', '/usr/bin/bash', '/usr/bin/whoami']`.

### `loaded_modules`

- **Type**: `string_t`
- **Requirement**: optional

The list of loaded module names.

### `parent_process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

The parent process of this process object. It is recommended to only populate this field for the top-level process object, to prevent deep nesting. Additional ancestry information can be supplied in the `ancestry` attribute.

### `sandbox`

- **Type**: `string_t`
- **Requirement**: optional

The name of the containment jail (i.e., sandbox). For example, hardened_ps, high_security_ps, oracle_ps, netsvcs_ps, or default_ps.

### `session`

- **Type**: [`session`](session.md)
- **Requirement**: optional

The user session under which this process is running.

### `terminated_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the process was terminated.

### `tid`

- **Type**: `integer_t`
- **Requirement**: optional

The Identifier of the thread associated with the event, as returned by the operating system.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The user under which this process is running.

### `working_directory`

- **Type**: `string_t`
- **Requirement**: optional

The working directory of a process.

### `xattributes`

- **Type**: [`object`](object.md)
- **Requirement**: optional

An unordered collection of zero or more name/value pairs that represent a process extended attribute.
