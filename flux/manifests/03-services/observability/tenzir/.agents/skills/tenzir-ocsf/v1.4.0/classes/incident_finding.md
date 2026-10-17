# Incident Finding (incident_finding)

An Incident Finding reports the creation, update, or closure of security incidents as a result of detections and/or analytics.
Note: `Incident Finding` implicitly includes the `incident` profile and it should be added to the `metadata.profiles[]` array.

- **Class UID**: `2005`
- **Category**: Findings
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Incident](../profiles/incident.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `assignee`, `assignee_group`

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
- `status_code` (recommended)
- `status_detail` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create` - Reports the creation of an Incident.
- `2`: `Update` - Reports updates to an Incident.
- `3`: `Close` - Reports closure of an Incident .

The normalized identifier of the Incident activity.

### `activity_name`

- **Type**: `string_t`
- **Requirement**: optional

The Incident activity name, as defined by the `activity_id`.

### `assignee`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: optional
- **Group**: context

The details of the user assigned to an Incident.

### `assignee_group`

- **Type**: [`group`](../objects/group.md)
- **Requirement**: optional
- **Group**: context

The details of the group assigned to an Incident.

### `attacks`

- **Type**: [`attack`](../objects/attack.md)
- **Requirement**: optional
- **Group**: context

An array of [MITRE ATT&CK®](https://attack.mitre.org) objects describing the tactics, techniques & sub-techniques associated to the Incident.

### `comment`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

Additional user supplied details for updating or closing the incident.

### `confidence`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The confidence, normalized to the caption of the confidence_id value. In the case of 'Other', it is defined by the event source.

### `confidence_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context
- **Sibling**: `confidence`

#### Enum values

- `0`: `Unknown` - The normalized confidence is unknown.
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `99`: `Other` - The confidence is not mapped to the defined enum values. See the `confidence` attribute, which contains a data source specific value.

The normalized confidence refers to the accuracy of the rule that created the finding. A rule with a low confidence means that the finding scope is wide and may create finding reports that may not be malicious in nature.

### `confidence_score`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The confidence score as reported by the event source.

### `desc`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The short description of the Incident.

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time of the most recent event included in the incident.

### `finding_info_list`

- **Type**: [`finding_info`](../objects/finding_info.md)
- **Requirement**: required
- **Group**: primary

A list of `finding_info` objects associated to an incident.

### `impact`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The impact , normalized to the caption of the impact_id value. In the case of 'Other', it is defined by the event source.

### `impact_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `impact`

#### Enum values

- `0`: `Unknown` - The normalized impact is unknown.
- `1`: `Low` - The magnitude of harm is low.
- `2`: `Medium` - The magnitude of harm is moderate.
- `3`: `High` - The magnitude of harm is high.
- `4`: `Critical` - The magnitude of harm is high and the scope is widespread.
- `99`: `Other` - The impact is not mapped. See the `impact` attribute, which contains a data source specific value.

The normalized impact of the incident or finding. Per NIST, this is the magnitude of harm that can be expected to result from the consequences of unauthorized disclosure, modification, destruction, or loss of information or information system availability.

### `impact_score`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The impact as an integer value of the finding, valid range 0-100.

### `is_suspected_breach`

- **Type**: `boolean_t`
- **Requirement**: optional
- **Group**: context

A determination based on analytics as to whether a potential breach was found.

### `priority`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The priority, normalized to the caption of the priority_id value. In the case of 'Other', it is defined by the event source.

### `priority_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context
- **Sibling**: `priority`

#### Enum values

- `0`: `Unknown` - No priority is assigned.
- `1`: `Low` - Application or personal procedure is unusable, where a workaround is available or a repair is possible.
- `2`: `Medium` - Non-critical function or procedure is unusable or hard to use causing operational disruptions with no direct impact on a service's availability. A workaround is available.
- `3`: `High` - Critical functionality or network access is interrupted, degraded or unusable, having a severe impact on services availability. No acceptable alternative is possible.
- `4`: `Critical` - Interruption making a critical functionality inaccessible or a complete network interruption causing a severe impact on services availability. There is no possible alternative.
- `99`: `Other` - The priority is not normalized.

The normalized priority. Priority identifies the relative importance of the incident or finding. It is a measurement of urgency.

### `src_url`

- **Type**: `url_t`
- **Requirement**: recommended
- **Group**: primary

A Url link used to access the original incident.

### `start_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time of the least recent event included in the incident.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The normalized status of the Incident normalized to the caption of the status_id value. In the case of 'Other', it is defined by the source.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: primary
- **Sibling**: `status`

#### Enum values

- `1`: `New` - The service desk has received the incident but has not assigned it to an agent.
- `2`: `In Progress` - The incident has been assigned to an agent but has not been resolved. The agent is actively working with the user to diagnose and resolve the incident.
- `3`: `On Hold` - The incident requires some information or response from the user or from a third party.
- `4`: `Resolved` - The service desk has confirmed that the incident is resolved.
- `5`: `Closed` - The incident is resolved and no further action is necessary.

The normalized status identifier of the Incident.

### `ticket`

- **Type**: [`ticket`](../objects/ticket.md)
- **Requirement**: optional
- **Group**: context

The linked ticket in the ticketing system.

### `vendor_attributes`

- **Type**: [`vendor_attributes`](../objects/vendor_attributes.md)
- **Requirement**: optional

The Vendor Attributes object can be used to represent values of attributes populated by the Vendor/Finding Provider. It can help distinguish between the vendor-prodvided values and consumer-updated values, of key attributes like `severity_id`.
The original finding producer should not populate this object. It should be populated by consuming systems that support data mutability.

### `verdict`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The verdict assigned to an Incident finding.

### `verdict_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `verdict`

#### Enum values

- `0`: `Unknown` - The type is unknown.
- `1`: `False Positive` - The incident is a false positive.
- `2`: `True Positive` - The incident is a true positive.
- `3`: `Disregard` - The incident can be disregarded as it is unimportant, an error or accident.
- `4`: `Suspicious` - The incident is suspicious.
- `5`: `Benign` - The incident is benign.
- `6`: `Test` - The incident is a test.
- `7`: `Insufficient Data` - The incident has insufficient data to make a verdict.
- `8`: `Security Risk` - The incident is a security risk.
- `9`: `Managed Externally` - The incident remediation or required actions are managed externally.
- `10`: `Duplicate` - The incident is a duplicate.
- `99`: `Other` - The type is not mapped. See the `type` attribute, which contains a data source specific value.

The normalized verdict of an Incident.
