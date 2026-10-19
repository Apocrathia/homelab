# Registry Key Query (registry_key_query)

Registry Key Query events report information about discovered Windows registry keys.

> **Deprecated since v1.5.0.** Use the `evidence_info` class instead. Populate `query_evidence.reg_key` and set `query_type_id` to `Registry Key`.

- **Event UID**: `4`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](../../../classes/discovery_result.md)
- **Profiles**: [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Record Integrity](../../../profiles/record_integrity.md), [Security Control](../../../profiles/security_control.md)

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

### `reg_key`

- **Type**: `reg_key`
- **Requirement**: required
- **Group**: primary

The registry key that pertains to the event.
