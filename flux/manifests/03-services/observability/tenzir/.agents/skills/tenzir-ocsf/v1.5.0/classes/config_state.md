# Device Config State (config_state)

Device Config State events report device configuration data, device assessments, and/or CIS Benchmark results.

> **Deprecated since v1.5.0.** Use `Compliance Finding` class.

- **Class UID**: `5002`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

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

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity. Note that this is not the threat actor of a campaign but may be part of a campaign.

### `assessments`

- **Type**: [`assessment`](../objects/assessment.md)
- **Requirement**: optional
- **Group**: context

A list of assessments associated with the device.

### `cis_benchmark_result`

- **Type**: [`cis_benchmark_result`](../objects/cis_benchmark_result.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.5.0.** Use Compliance object with Check object instead.

The CIS Benchmark Result object captures results generated from benchmark evaluations as defined by the Center for Internet Security ([CIS](https://www.cisecurity.org/cis-benchmarks/)).

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

The device that is being discovered by an inventory process.
