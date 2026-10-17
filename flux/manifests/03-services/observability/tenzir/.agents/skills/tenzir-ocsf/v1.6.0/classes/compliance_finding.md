# Compliance Finding (compliance_finding)

Compliance Finding events describe results of evaluations performed against resources, to check compliance with various Industry Frameworks or Security Standards such as `NIST SP 800-53, CIS AWS Foundations Benchmark v1.4.0, ISO/IEC 27001` etc. Note: if the event producer is a security control, the `security_control` profile should be applied and its `attacks` information, if present, should be duplicated into the `finding_info` object.
Note: If the Finding is an incident, i.e. requires incident workflow, also apply the `incident` profile or aggregate this finding into an `Incident Finding`.

- **Class UID**: `2003`
- **Category**: Findings
- **Extends**: [Finding (finding)](finding.md)
- **Profiles**: [Incident](../profiles/incident.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Finding:**
- `finding_info` (required)
- `confidence_id` (recommended)
- `status_id` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `compliance`

- **Type**: [`compliance`](../objects/compliance.md)
- **Requirement**: required
- **Group**: primary

The compliance object provides context to compliance findings (e.g., a check against a specific regulatory or best practice framework such as CIS, NIST etc.) and contains compliance related details.

### `evidences`

- **Type**: [`evidences`](../objects/evidences.md)
- **Requirement**: optional
- **Group**: context

Describes various evidence artifacts associated with the compliance finding.

### `remediation`

- **Type**: [`remediation`](../objects/remediation.md)
- **Requirement**: recommended
- **Group**: context

Describes the recommended remediation steps to address identified issue(s).

### `resource`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.3.0.** Use the `resources` attribute instead.

Describes details about the resource that is the subject of the compliance check.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Describes details about the resource/resources that are the subject of the compliance check.
