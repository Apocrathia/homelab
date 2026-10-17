# Data Security (data_security)

The Data Security object describes the characteristics, techniques and content of a Data Loss Prevention (DLP), Data Loss Detection (DLD), Data Classification, or similar tools' finding, alert, or detection mechanism(s).

- **Extends**: [Data Classification (data_classification)](data_classification.md)

## Attributes

### `data_lifecycle_state`

- **Type**: `string_t`
- **Requirement**: optional

The name of the stage or state that the data was in. E.g., Data-at-Rest, Data-in-Transit, etc.

### `data_lifecycle_state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `data_lifecycle_state`

#### Enum values

- `0`: `Unknown` - The type is not mapped. See the `data_lifecycle_state` attribute, which contains a data source specific value.
- `1`: `Data at-Rest` - The data was stored on physical or logcial media and was not actively moving through the network nor was being processed. E.g., data stored in a database, PDF files in a file share, or EHR records in object storage.
- `2`: `Data in-Transit` - The data was actively moving through the network or from one physical or logical location to another. E.g., emails being send, data replication or Change Data Capture (CDC) streams, or sensitive data processed on an API.
- `3`: `Data in-Use` - The data was being processed, accessed, or read by a system, making it active in memory or CPU. E.g., sensitive data in a Business Intelligence tool, ePHI being processed in an EHR application or a user viewing data stored in a spreadsheet or PDF.

The stage or state that the data was in when it was assessed or scanned by a data security tool.

### `detection_pattern`

- **Type**: `string_t`
- **Requirement**: recommended

Specific pattern, algorithm, fingerpint, or model used for detection.

### `detection_system`

- **Type**: `string_t`
- **Requirement**: optional

The name of the type of data security tool or system that the finding, detection, or alert originated from. E.g., Endpoint, Secure Email Gateway, etc.

### `detection_system_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `detection_system`

#### Enum values

- `0`: `Unknown` - The type is not mapped. See the `detection_system` attribute, which contains a data source specific value.
- `1`: `Endpoint` - A dedicated agent or sensor installed on a device, either a dedicated data security tool or an Endpoint Detection & Response (EDR) tool that can detect sensitive data and/or enforce data security policies. E.g., Forcepoint DLP, Symantec DLP, Microsoft Defender for Endpoint (MDE).
- `2`: `DLP Gateway` - A Data Loss Prevention (DLP) gateway that is positioned in-line of an information store such as a network share, a database, or otherwise that can detect sensitive data and/or enforce data security policies.
- `3`: `Mobile Device Management` - A Mobile Device Management (MDM) or Enterprise Mobility Management (EMM) tool that can detect sensitive data and/or enforce data security policies on mobile devices (e.g., cellphones, tablets, End User Devices [EUDs]).
- `4`: `Data Discovery & Classification` - A tool that actively identifies and classifies sensitive data in digitial media and information stores in accordance with a policy or automated functionality. E.g, Amazon Macie, Microsoft Purview.
- `5`: `Secure Web Gateway` - A Secure Web Gateway (SWG) is any tool that can detect sensitive data and/or enforce data security policies at a network-edge such as within a proxy or firewall service.
- `6`: `Secure Email Gateway` - A Secure Email Gateway (SEG) is any tool that can detect sensitive data and/or enforce data security policies within email systems. E.g., Microsoft Defender for Office, Google Workspaces.
- `7`: `Digital Rights Management` - A Digital Rights Management (DRM) or a dedicated Information Rights Management (IRM) are tools which can detect sensitive data and/or enforce data security policies on digitial media via policy or user access rights.
- `8`: `Cloud Access Security Broker` - A Cloud Access Security Broker (CASB) that can detect sensitive data and/or enforce data security policies in-line to cloud systems such as the public cloud or Software-as-a-Service (SaaS) tool. E.g., Forcepoint CASB, SkyHigh Security.
- `9`: `Database Activity Monitoring` - A Database Activity Monitoring (DAM) tool that can detect sensitive data and/or enforce data security policies as part of a dedicated database or warehouse monitoring solution.
- `10`: `Application-Level DLP` - A built in Data Loss Prevention (DLP) or other data security capability within a tool or platform such as an Enterprise Resource Planning (ERP) or Customer Relations Management (CRM) tool that can detect sensitive data and/or enforce data security policies.
- `11`: `Developer Security` - Any Developer Security tool such as an Infrastrucre-as-Securty (IAC) scanner, Secrets Detection, or Secure Software Development Lifecycle (SSDLC) tool that can detect sensitive data and/or enforce data security policies. E.g., TruffleHog, GitGuardian, Git-Secrets.
- `12`: `Data Security Posture Management` - A Data Security Posture Management (DSPM) tool is a continuous monitoring and data discovery solution that can detect sensitive data and/or enforce data security policies for local and cloud environments. E.g., Cyera, Sentra, IBM Polar Security.
- `99`: `Other` - Any other type of detection system or a multi-variate system made up of several other systems.

The type of data security tool or system that the finding, detection, or alert originated from.

### `pattern_match`

- **Type**: `string_t`
- **Requirement**: optional

A text, binary, file name, or datastore that matched against a detection rule.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: recommended

Details about the policy that triggered the finding.
