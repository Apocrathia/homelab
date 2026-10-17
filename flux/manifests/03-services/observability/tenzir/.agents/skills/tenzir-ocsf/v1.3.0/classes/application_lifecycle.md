# Application Lifecycle (application_lifecycle)

Application Lifecycle events report installation, removal, start, stop of an application or service.

- **Class UID**: `6002`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

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

The normalized identifier of the activity that triggered the event.

### `app`

- **Type**: [`product`](../objects/product.md)
- **Requirement**: required
- **Group**: primary

The application that was affected by the lifecycle event.  This also applies to self-updating application systems.
