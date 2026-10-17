# Discovery Result (discovery_result)

Discovery Result events report the results of a discovery request.

- **Category**: Discovery
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

- `1`: `Exists` - The target was found.
- `2`: `Partial` - The target was partially found.
- `3`: `Does not exist` - The target was not found.
- `4`: `Error` - The discovery attempt failed.
- `5`: `Unsupported` - Discovery of the target was not supported.

The normalized identifier of the activity that triggered the event.
