# Prefetch Query (prefetch_query)

Prefetch Query events report information about Windows prefetch files.

- **Event UID**: `19`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](../../../classes/discovery_result.md)
- **Profiles**: [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Security Control](../../../profiles/security_control.md)

## Inherited attributes

**From Discovery Result:**
- `query_result_id` (required)
- `query_info` (recommended)
- `query_result` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `last_run_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended
- **Group**: occurrence

The prefetch file last run time.

### `name`

- **Type**: `string_t`
- **Requirement**: required
- **Group**: primary

The name of the prefetch file that is the target of the query.

### `run_count`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The prefetch file run count.
