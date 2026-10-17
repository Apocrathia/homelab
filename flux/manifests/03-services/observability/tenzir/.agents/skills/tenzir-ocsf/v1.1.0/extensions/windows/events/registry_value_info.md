# Registry Value Info (registry_value_info)

Registry Value Info events report information about discovered Windows registry values.

- **Event UID**: `5`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](../../../classes/discovery_result.md)
- **Profiles**: [Host](../../../profiles/host.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `reg_value`

- **Type**: `reg_value`
- **Requirement**: required
- **Group**: primary

The registry value that pertains to the event.
