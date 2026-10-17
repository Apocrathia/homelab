# Registry Value Query (registry_value_query)

Registry Value Query events report information about discovered Windows registry values.

- **Event UID**: `5`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](../../../classes/discovery_result.md)
- **Profiles**: [Host](../../../profiles/host.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md)

## Inherited attributes

**From Discovery Result:**
- `query_result_id` (required)
- `query_info` (recommended)
- `query_result` (recommended)

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

### `reg_value`

- **Type**: `reg_value`
- **Requirement**: required
- **Group**: primary

The registry value that pertains to the event.
