# Job (job)

The Job object provides information about a scheduled job or task, including its name, command line, and state. It encompasses attributes that describe the properties and status of the scheduled job.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bytes_processed`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes the job read or examined while performing its work.

### `bytes_written`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes the job committed to the destination, after any compression or deduplication was applied.

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 13

> **Deprecated since v1.9.0.** Use the `job_action.cmd_line` attribute instead.

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
- **Requirement**: optional

The file that pertains to the job.

### `job_actions`

- **Type**: [`job_action`](job_action.md)
- **Requirement**: optional

An array of actions that will be performed by the job when certain conditions are met.

### `job_triggers`

- **Type**: [`job_trigger`](job_trigger.md)
- **Requirement**: optional

An array of conditions or events that, when met, will initiate the job to perform specified actions.

### `last_run_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

> **Deprecated since v1.9.0.** Use the `job_trigger.last_run_time` attribute instead.

The time when the job was last run.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the job.

### `next_run_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use the `job_trigger.next_run_time` attribute instead.

The time when the job will next be run.

### `progress_current`

- **Type**: `long_t`
- **Requirement**: optional

The units of work the job has completed so far, counted in `progress_unit`.

### `progress_total`

- **Type**: `long_t`
- **Requirement**: optional

The total units of work the job is expected to perform, counted in `progress_unit`.

### `progress_unit`

- **Type**: `string_t`
- **Requirement**: optional

The unit that the job's `progress_current` and `progress_total` are counted in, normalized to the caption of the `progress_unit_id` value. In the case of 'Other', it is defined by the event source.

### `progress_unit_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `progress_unit`

#### Enum values

- `0`: `Unknown` - The unit is unknown.
- `1`: `Bytes` - Bytes of data.
- `2`: `Files` - Files or file-system objects.
- `3`: `Records` - Records, such as database rows, documents, or log records.
- `4`: `Items` - Generic countable items or work units.
- `99`: `Other` - The unit is not mapped. See the `progress_unit` attribute, which contains a data source specific value.

The normalized identifier of the unit that the job's `progress_current` and `progress_total` are counted in.

### `queue_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the queue that the job was dispatched to.

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
- `5`: `Disabled`
- `99`: `Other`

The run state ID of the job.

### `throughput`

- **Type**: `long_t`
- **Requirement**: optional

The rate at which the job processed data, in bytes per second.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The job type, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The job orchestration mechanism is unknown.
- `1`: `Task Scheduler` - The job is executed by the Task Scheduler on Windows.
- `2`: `Cron` - The job is executed by `cron` on Linux, macOS, or another a Unix-like OS.
- `3`: `Systemd` - The job is executed by `systemd` on Linux.
- `4`: `Launchd` - The job is executed by `launchd` on macOS.
- `99`: `Other` - The job orchestration mechanism is not mapped. See the `type` attribute, which contains a data source specific value.

The job type, i.e. the mechanism that executes the job.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique job identifier.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that created the job.
