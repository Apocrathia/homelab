# Agent (agent)

An Agent (also known as a Sensor) is typically installed on an Operating System (OS) and serves as a specialized software component that can be designed to monitor, detect, collect, archive, or take action. These activities and possible actions are defined by the upstream system controlling the Agent and its intended purpose. For instance, an Agent can include Endpoint Detection & Response (EDR) agents, backup/disaster recovery sensors, Application Performance Monitoring or profiling sensors, and similar software.

- **Extends**: [Object (object)](object.md)

## Attributes

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Endpoint Detection and Response` - Any EDR sensor or agent. Or any tool that provides similar threat detection, anti-malware, anti-ransomware, or similar capabilities. E.g., Crowdstrike Falcon, Microsoft Defender for Endpoint, Wazuh.
- `2`: `Data Loss Prevention` - Any DLP sensor or agent. Or any tool that provides similar data classification, data loss detection, and/or data loss prevention capabilities. E.g., Forcepoint DLP, Microsoft Purview, Symantec DLP.
- `3`: `Backup & Recovery` - Any agent or sensor that provides backups, archival, or recovery capabilities. E.g., Azure Backup, AWS Backint Agent.
- `4`: `Performance Monitoring & Observability` - Any agent or sensor that provides Application Performance Monitoring (APM), active tracing, profiling, or other observability use cases and optionally forwards the logs. E.g., New Relic Agent, Datadog Agent, Azure Monitor Agent.
- `5`: `Vulnerability Management` - Any agent or sensor that provides vulnerability management or scanning capabilities. E.g., Qualys VMDR, Microsoft Defender for Endpoint, Crowdstrike Spotlight, Amazon Inspector Agent.
- `6`: `Log Forwarding` - Any agent or sensor that forwards logs to a 3rd party storage system such as a data lake or SIEM. E.g., Splunk Universal Forwarder, Tenzir, FluentBit, Amazon CloudWatch Agent, Amazon Kinesis Agent.
- `7`: `Mobile Device Management` - Any agent or sensor responsible for providing Mobile Device Management (MDM) or Mobile Enterprise Management (MEM) capabilities. E.g., JumpCloud Agent, Esper Agent, Jamf Pro binary.
- `8`: `Configuration Management` - Any agent or sensor that provides configuration management of a device, such as scanning for software, license management, or applying configurations. E.g., AWS Systems Manager Agent, Flexera, ServiceNow MID Server.
- `9`: `Remote Access` - Any agent or sensor that provides remote access capabilities to a device. E.g., BeyondTrust, Amazon Systems Manager Agent, Verkada Agent.

The normalized representation of an agent or sensor. E.g., EDR, vulnerability management, APM, backup & recovery, etc.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The normalized caption of the type_id value for the agent or sensor. In the case of 'Other' or 'Unknown', it is defined by the event source.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The UID of the agent or sensor, sometimes known as a Sensor ID or `aid`.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

An alternative or contextual identifier for the agent or sensor, such as a configuration, organization, or license UID.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The semantic version of the agent or sensor, e.g., `7.101.50.0`.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

The company or author who created the agent or sensor. For example: `Crowdstrike`.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the agent or sensor. For example: `AWS SSM Agent`.

### `policies`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

Describes the various policies that may be applied or enforced by an agent or sensor. E.g., Conditional Access, prevention, auto-update, tamper protection, destination configuration, etc.
