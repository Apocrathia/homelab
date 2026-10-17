# User Query (user_query)

User Query events report user data that have been discovered, queried, polled or searched. This event differs from User Inventory as it describes the result of a targeted search by filtering a subset of user attributes.

- **Class UID**: `5018`
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

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The user that pertains to the event or object.
