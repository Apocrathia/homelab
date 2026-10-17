# Networks Query (networks_query)

Networks Query events report information about network adapters.

- **Class UID**: `5013`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](discovery_result.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

### `network_interfaces`

- **Type**: [`network_interface`](../objects/network_interface.md)
- **Requirement**: required
- **Group**: primary

The network interfaces that are associated with the device, one for each unique MAC address/IP address/hostname/name combination.

Note: The first element of the array is the network information that pertains to the event.
