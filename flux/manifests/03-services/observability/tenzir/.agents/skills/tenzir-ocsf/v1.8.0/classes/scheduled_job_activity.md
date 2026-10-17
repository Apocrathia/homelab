# Scheduled Job Activity (scheduled_job_activity)

Scheduled Job Activity events report activities related to scheduled jobs or tasks.

- **Class UID**: `1006`
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
- **Group**: context

The actor that performed the activity on the `job` object.

### `job`

- **Type**: [`job`](../objects/job.md)
- **Requirement**: required
- **Group**: primary

The job object that pertains to the event.
