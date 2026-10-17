# Application Error (application_error)

Application Error events describe issues with an applications. The error message should be put in the event's `message` attribute. The `metadata.product` attribute can be used to capture the originating application information. The `host` profile can used to include the generating device information. This class is helpful (and originally intended for) applications that generate and/or handle OCSF events. This class can also be used for errors in upstream products and services.

- **Class UID**: `6008`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
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

- `1`: `General Error` - The application has experienced an error.
- `2`: `Translation Error` - The application has experienced an error translating (mapping) a raw event to OCSF. Including the original raw event in the raw_data field is highly recommended.

The normalized identifier of the activity that triggered the event.

### `message`

- **Type**: `string_t`

The error message as reported by the application.
