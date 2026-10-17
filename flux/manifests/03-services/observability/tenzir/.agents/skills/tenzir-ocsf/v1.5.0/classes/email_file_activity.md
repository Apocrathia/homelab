# Email File Activity (email_file_activity)

Email File Activity events report files within emails.

> **Deprecated since v1.3.0.** Use the `Email Activity` class with the `email.files[]` array instead.

- **Class UID**: `4011`
- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

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
- **Requirement**: required
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

> **Deprecated since v1.4.0.** Use the `email.uid` attribute instead.

The unique identifier of the email, used to correlate related email alert and activity events.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The email file attachment.
