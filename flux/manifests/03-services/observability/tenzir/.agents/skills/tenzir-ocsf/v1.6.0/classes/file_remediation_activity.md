# File Remediation Activity (file_remediation_activity)

File Remediation Activity events report on attempts at remediating files. It follows the MITRE countermeasures defined by the D3FEND™ [Matrix](https://d3fend.mitre.org/). Sub-techniques will include File, such as File Removal or Restore File.

- **Class UID**: `7002`
- **Category**: Remediation
- **Extends**: [Remediation Activity (remediation_activity)](remediation_activity.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Remediation Activity:**
- `command_uid` (required)
- `countermeasures` (recommended)

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
- `timezone_offset` (recommended)

## Attributes

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The file that pertains to the remediation event.
