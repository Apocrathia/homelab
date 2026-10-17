# Registry Key Info (registry_key_info)

Registry Key Info events report information about discovered Windows registry keys.

- **Event UID**: `4`
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

### `reg_key`

- **Type**: `reg_key`
- **Requirement**: required
- **Group**: primary

The registry key that pertains to the event.
