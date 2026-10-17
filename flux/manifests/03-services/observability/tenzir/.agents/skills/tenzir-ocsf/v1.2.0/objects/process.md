# Process (process)

The Process object describes a running instance of a launched program. Defined by D3FEND [d3f:Process](https://d3fend.mitre.org/dao/artifact/d3f:Process/).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 13

The full command line used to launch an application, service, process, or job. For example: `ssh user@10.0.0.10`. If the command line is unavailable or missing, the empty string `''` is to be used.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the process was created/started.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

The process file object.

### `integrity`

- **Type**: `string_t`
- **Requirement**: optional

The process integrity level, normalized to the caption of the direction_id value. In the case of 'Other', it is defined by the event source (Windows only).

### `integrity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `integrity`

#### Enum values

- `0`: `Unknown`
- `1`: `Untrusted`
- `2`: `Low`
- `3`: `Medium`
- `4`: `High`
- `5`: `System`
- `6`: `Protected`
- `99`: `Other`

The normalized identifier of the process integrity level (Windows only).

### `lineage`

- **Type**: `string_t`
- **Requirement**: optional

The lineage of the process, represented by a list of paths for each ancestor process. For example: `['/usr/sbin/sshd', '/usr/bin/bash', '/usr/bin/whoami']`.

### `loaded_modules`

- **Type**: `string_t`
- **Requirement**: optional

The list of loaded module names.

### `name`

- **Type**: `process_name_t`

The friendly name of the process, for example: `Notepad++`.

### `parent_process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

The parent process of this process object. It is recommended to only populate this field for the first process object, to prevent deep nesting.

### `pid`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Observable**: 15

The process identifier, as reported by the operating system. Process ID (PID) is a number used by the operating system to uniquely identify an active process.

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

### `uid`

- **Type**: `string_t`

A unique identifier for this process assigned by the producer (tool).  Facilitates correlation of a process event with other events for that process.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The user under which this process is running.

### `xattributes`

- **Type**: [`object`](object.md)
- **Requirement**: optional

An unordered collection of zero or more name/value pairs that represent a process extended attribute.
