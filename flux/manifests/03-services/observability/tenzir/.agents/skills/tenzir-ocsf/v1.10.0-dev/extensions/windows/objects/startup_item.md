# Startup Item (startup_item)

The startup item object describes an application component that has associated startup criteria and configurations.

- **Extends**: [Startup Item (startup_item)](../../../objects/startup_item.md)

## Inherited attributes

**From Startup Item:**
- `name` (required)
- `start_type_id` (required)
- `driver` (recommended)
- `job` (recommended)
- `process` (recommended)
- `run_state_id` (recommended)
- `type_id` (recommended)

## Attributes

### `win_service`

- **Type**: [`win_service`](../objects/win_service.md)
- **Requirement**: recommended

The startup item Windows service resource.
