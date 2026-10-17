# Service Query (service_query)

Service Query events report information about running services.

- **Class UID**: `5016`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](discovery_result.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

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

### `service`

- **Type**: [`service`](../objects/service.md)
- **Requirement**: required
- **Group**: primary

The service that pertains to the event.
