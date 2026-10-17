# Email File Activity (email_file_activity)

Email File Activity events report files within emails.

- **Class UID**: `4011`
- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Send`
- `2`: `Receive`
- `3`: `Scan` - Email file being scanned (example: security scanning).

The normalized identifier of the activity that triggered the event.

### `email_uid`

- **Type**: `string_t`
- **Requirement**: required
- **Group**: primary

The unique identifier of the email, used to correlate related email alert and activity events.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The email file attachment.
