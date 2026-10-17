# Live Evidence Info (evidence_info)

Data collected directly from devices that represents forensic information pulled, queried, or discovered from devices that may indicate malicious activity. It contains a number of child objects, each representing a distinct evidence domain (network connections, file artifacts, registry entries, etc.). When mapping raw telemetry data users should select Query Evidence and then the appropriate child object that best matches the evidence type.

- **Class UID**: `5040`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](discovery_result.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `device.hostname`, `device.mac`, `device.name`

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

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

An addressable device, computer system or host from which evidence was collected.

### `query_evidence`

- **Type**: [`query_evidence`](../objects/query_evidence.md)
- **Requirement**: required
- **Group**: primary

The specific resulting evidence information that was queried or discovered based on the query type. Contains various child objects corresponding to the query_type_id values.
