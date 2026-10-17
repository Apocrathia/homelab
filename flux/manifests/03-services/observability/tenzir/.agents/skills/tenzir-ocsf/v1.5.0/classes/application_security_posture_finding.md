# Application Security Posture Finding (application_security_posture_finding)

The Application Security Posture Finding event is a notification about any bug, defect, deficiency, exploit, vulnerability, weakness or any other issue with software and related systems. Application Security Posture Findings typically involve reporting on the greater context including compliance, impacted resources, remediation guidance, specific code defects, and/or vulnerability metadata. Application Security Posture Findings can be reported by Threat & Vulnerability Management (TVM) tools, Application Security Posture Management (ASPM) tools, or other similar tools. Note: if the event producer is a security control, the `security_control` profile should be applied and its `attacks` information, if present, should be duplicated into the `finding_info` object.
Note: If the Finding is an incident, i.e. requires incident workflow, also apply the `incident` profile or aggregate this finding into an `Incident Finding`.

- **Class UID**: `2007`
- **Category**: Findings
- **Extends**: [Finding (finding)](finding.md)
- **Profiles**: [Incident](../profiles/incident.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `application`, `compliance`, `remediation`, `vulnerabilities`

## Inherited attributes

**From Finding:**
- `finding_info` (required)
- `confidence_id` (recommended)
- `device` (recommended)
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

### `application`

- **Type**: [`application`](../objects/application.md)
- **Requirement**: recommended
- **Group**: primary

An Application describes the details for an inventoried application as reported by an Application Security tool or other Developer-centric tooling. Applications can be defined as Kubernetes resources, Containerized resources, or application hosting-specific cloud sources such as AWS Elastic BeanStalk, AWS Lightsail, or Azure Logic Apps.

### `compliance`

- **Type**: [`compliance`](../objects/compliance.md)
- **Requirement**: recommended
- **Group**: primary

Provides compliance context to vulnerabilities and other weaknesses that are reported as part of an Application Security or Vulnerability Management tool's built-in compliance framework mapping.

### `remediation`

- **Type**: [`remediation`](../objects/remediation.md)
- **Requirement**: recommended
- **Group**: context

Describes the recommended remediation steps to address identified vulnerabilities or weaknesses.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: context

Describes details about the resource/resources that are affected by the vulnerability/vulnerabilities.

### `vulnerabilities`

- **Type**: [`vulnerability`](../objects/vulnerability.md)
- **Requirement**: recommended
- **Group**: primary

This object describes vulnerabilities reported in a security finding.
