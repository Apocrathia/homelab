# Time Span (timespan)

The Time Span object represents different time period durations. If a timespan is fractional, i.e. crosses one period, e.g. a week and 3 days, more than one may be populated since each member is of integral type. In that case `type_id` if present should be set to `Other`.

- **Extends**: [Object (object)](object.md)

## Attributes

### `duration`

- **Type**: `long_t`
- **Requirement**: recommended

The duration of the time span in milliseconds.

### `duration_days`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in days.

### `duration_hours`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in hours.

### `duration_mins`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in minutes.

### `duration_months`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in months.

### `duration_secs`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in seconds.

### `duration_weeks`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in weeks.

### `duration_years`

- **Type**: `integer_t`
- **Requirement**: recommended

The duration of the time span in years.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of time span duration the object represents.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Milliseconds`
- `2`: `Seconds`
- `3`: `Minutes`
- `4`: `Hours`
- `5`: `Days`
- `6`: `Weeks`
- `7`: `Months`
- `8`: `Years`
- `99`: `Other`

The normalized identifier for the time span duration type.
