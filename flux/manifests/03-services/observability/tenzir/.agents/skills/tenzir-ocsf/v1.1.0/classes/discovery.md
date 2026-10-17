# Discovery (discovery)

Abstract base class for Discovery event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Discovery
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

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

- `1`: `Log` - The discovered information is via a log.
- `2`: `Collect` - The discovered information is via a collection process.

The normalized identifier of the activity that triggered the event.
