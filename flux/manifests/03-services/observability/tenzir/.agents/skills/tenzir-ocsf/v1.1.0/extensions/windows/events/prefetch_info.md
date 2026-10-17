# Prefetch Info (prefetch_info)

Prefetch Info events report information about Windows prefetch files.

- **Event UID**: `19`
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
