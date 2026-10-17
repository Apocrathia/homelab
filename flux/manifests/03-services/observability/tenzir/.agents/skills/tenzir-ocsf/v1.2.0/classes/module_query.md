# Module Query (module_query)

Module Query events report information about loaded modules.

- **Class UID**: `5011`
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

### `module`

- **Type**: [`module`](../objects/module.md)
- **Requirement**: required
- **Group**: primary

The module that pertains to the event.

### `process`

- **Type**: [`process`](../objects/process.md)
- **Requirement**: required
- **Group**: primary

The process that loaded the module.
