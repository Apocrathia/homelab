# Job (job)

The Job object provides information about a scheduled job or task, including its name, command line, and state. It encompasses attributes that describe the properties and status of the scheduled job.

- **Extends**: [Object (object)](object.md)

## Attributes

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 13

The job command line.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the job was created.

### `desc`

- **Type**: `string_t`
- **Requirement**: recommended

The description of the job.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: required

The file that pertains to the job.

### `last_run_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the job was last run.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the job.

### `next_run_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the job will next be run.

### `run_state`

- **Type**: `string_t`
- **Requirement**: optional

The run state of the job.

### `run_state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `run_state`

#### Enum values

- `0`: `Unknown`
- `1`: `Ready`
- `2`: `Queued`
- `3`: `Running`
- `4`: `Stopped`
- `99`: `Other`

The run state ID of the job.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that created the job.
