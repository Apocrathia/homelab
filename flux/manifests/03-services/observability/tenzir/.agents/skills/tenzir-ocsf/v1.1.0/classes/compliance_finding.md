# Compliance Finding (compliance_finding)

Compliance Finding events describe results of evaluations performed against resources, to check compliance with various Industry Frameworks or Security Standards such as `NIST SP 800-53, CIS AWS Foundations Benchmark v1.4.0, ISO/IEC 27001` etc.

- **Class UID**: `2003`
- **Category**: Findings
- **Extends**: [Finding (finding)](finding.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Finding:**
- `finding_info` (required)
- `confidence_id` (recommended)
- `status_id` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)

## Attributes

### `compliance`

- **Type**: [`compliance`](../objects/compliance.md)
- **Requirement**: required
- **Group**: primary

The compliance object provides context to compliance findings (e.g., a check against a specific regulatory or best practice framework such as CIS, NIST etc.) and contains compliance related details.

### `remediation`

- **Type**: [`remediation`](../objects/remediation.md)
- **Requirement**: recommended
- **Group**: context

Describes the recommended remediation steps to address identified issue(s).

### `resource`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Describes details about the resource that is the subject of the compliance check.
