# Scheduled Job Activity (scheduled_job_activity)

Scheduled Job Activity events report activities related to scheduled jobs or tasks.

- **Class UID**: `1006`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Associations

- `device` ↔ `actor.user`
- `actor.user` ↔ `device`

## Inherited attributes

**From System Activity:**
- `device` (required)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create`
- `2`: `Update`
- `3`: `Delete`
- `4`: `Enable`
- `5`: `Disable`
- `6`: `Start`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional

The actor that performed the activity on the `job` object.

### `job`

- **Type**: [`job`](../objects/job.md)
- **Requirement**: required
- **Group**: primary

The job object that pertains to the event.
