# Job Trigger (job_trigger)

The condition or event that, when met, will initiate the job to perform specified actions.

## Attributes

### `event_codes`

- **Type**: `string_t`
- **Requirement**: optional

Event identifiers that pertain to the job trigger. Should be populated when the `Event (3)` type is specified.

### `last_run_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the job was last run.

### `log_sources`

- **Type**: `string_t`
- **Requirement**: optional

A collection of log systems or components that pertain to the job trigger. Should be populated when the `Event (3)` type is specified.

### `next_run_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the job will next be run.

### `properties`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: recommended

The list of properties associated with the trigger.
Can be used to describe time boundaries of the job, amount of repetitions or when the job should be activated or expired.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The job trigger type, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The trigger is unknown.
- `1`: `Boot` - The job is triggered on a system boot.
- `2`: `Schedule` - The job is triggered on a specific schedule. Properties should be populated with respective time bounds.
- `3`: `Event` - The job is triggered when the specific event occurs. The `properties` attribute should be populated with respective event sources and identifiers.
- `99`: `Other` - The job trigger is unmapped. See the `type` attribute, which contains a data source specific value.

The job trigger type, i.e. the condition that must be met for the job to perform its action.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that pertains to the job trigger. Can be populated when the `Event (3)` type that bounds to specific user is used.
