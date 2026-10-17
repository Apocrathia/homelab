# Folder Query (folder_query)

Folder Query events report information about folders that are present on the system.

- **Class UID**: `5008`
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

### `folder`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The folder that is the target of the query.
