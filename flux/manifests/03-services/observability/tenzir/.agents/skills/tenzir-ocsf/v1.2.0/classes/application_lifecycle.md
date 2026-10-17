# Application Lifecycle (application_lifecycle)

Application Lifecycle events report installation, removal, start, stop of an application or service.

- **Class UID**: `6002`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

- `1`: `Install`
- `2`: `Remove`
- `3`: `Start`
- `4`: `Stop`

The normalized identifier of the activity that triggered the event.

### `app`

- **Type**: [`product`](../objects/product.md)
- **Requirement**: required
- **Group**: primary

The application that was affected by the lifecycle event.  This also applies to self-updating application systems.
