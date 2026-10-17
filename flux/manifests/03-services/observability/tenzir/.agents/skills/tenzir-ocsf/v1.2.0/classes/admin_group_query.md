# Admin Group Query (admin_group_query)

Admin Group Query events report information about administrative groups.

- **Class UID**: `5009`
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

### `group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: required
- **Group**: primary

The administrative group.

### `users`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

The users that belong to the administrative group.
