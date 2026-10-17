# Network Remediation Activity (network_remediation_activity)

Network Remediation Activity events report on attempts at remediating computer networks. It follows the MITRE countermeasures defined by the D3FEND™ [Matrix](https://d3fend.mitre.org/). Techniques and Sub-techniques will include Network, such as Network Isolation or Network Traffic Filtering.

- **Class UID**: `7004`
- **Category**: Remediation
- **Extends**: [Remediation Activity (remediation_activity)](remediation_activity.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Remediation Activity:**
- `command_uid` (required)
- `countermeasures` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)

## Attributes

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: required
- **Group**: primary

The network connection that pertains to the remediation event.
