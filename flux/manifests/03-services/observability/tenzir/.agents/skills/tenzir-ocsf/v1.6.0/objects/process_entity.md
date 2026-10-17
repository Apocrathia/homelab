# Process Entity (process_entity)

The Process Entity object provides critical fields for referencing a process.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 13

The full command line used to launch an application, service, process, or job. For example: `ssh user@10.0.0.10`. If the command line is unavailable or missing, the empty string `''` is to be used.

### `cpid`

- **Type**: `uuid_t`
- **Requirement**: recommended

A unique process identifier that can be assigned deterministically by multiple system data producers.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the process was created/started.

### `name`

- **Type**: `process_name_t`

The friendly name of the process, for example: `Notepad++`.

### `path`

- **Type**: `string_t`
- **Requirement**: optional

The process file path.

### `pid`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Observable**: 15

The process identifier, as reported by the operating system. Process ID (PID) is a number used by the operating system to uniquely identify an active process.

### `uid`

- **Type**: `string_t`
- **Observable**: 39

A unique identifier for this process assigned by the producer (tool).  Facilitates correlation of a process event with other events for that process.
