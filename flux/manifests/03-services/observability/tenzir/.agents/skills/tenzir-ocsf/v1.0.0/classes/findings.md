# Findings (findings)

Abstract base class for Findings event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Findings
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

- `1`: `Create` - A security finding is created.
- `2`: `Update` - A security finding is updated.

The normalized identifier of the activity that triggered the event.
