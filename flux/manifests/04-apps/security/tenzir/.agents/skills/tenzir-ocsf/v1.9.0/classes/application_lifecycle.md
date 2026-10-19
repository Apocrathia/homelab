# Application Lifecycle (application_lifecycle)

Application Lifecycle events report installation, removal, start, stop of an application or service.

- **Class UID**: `6002`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `app`, `application`

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

- `1`: `Install` - Install the application.
- `2`: `Remove` - Remove the application.
- `3`: `Start` - Start the application.
- `4`: `Stop` - Stop the application.
- `5`: `Restart` - Restart the application.
- `6`: `Enable` - Enable the application.
- `7`: `Disable` - Disable the application.
- `8`: `Update` - Update the application.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `app`

- **Type**: [`product`](../objects/product.md)
- **Requirement**: optional
- **Group**: context

> **Deprecated since v1.9.0.** Use the `application` attribute instead.

The application that was affected by the lifecycle event.  This also applies to self-updating application systems.

### `application`

- **Type**: [`application`](../objects/application.md)
- **Requirement**: recommended
- **Group**: primary

The application that was affected by the lifecycle event. This also applies to self-updating application systems. Product identity, such as vendor and version, can be conveyed via the nested `product` attribute.
