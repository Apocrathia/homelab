# Device Config State (config_state)

Device Config State events report device configuration data and CIS Benchmark results.

- **Class UID**: `5002`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

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

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

The device that is being discovered by an inventory process.

### `cis_benchmark_result`

- **Type**: [`cis_benchmark_result`](../objects/cis_benchmark_result.md)
- **Requirement**: recommended
- **Group**: primary

The CIS benchmark result.
