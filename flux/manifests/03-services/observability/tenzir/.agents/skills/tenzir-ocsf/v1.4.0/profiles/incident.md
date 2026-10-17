# Incident (incident)

The attributes that add incident handling semantics to a Finding.

## Applies to

- Compliance Finding
- Data Security Finding
- Detection Finding
- Finding
- Incident Finding
- Vulnerability Finding

## Attributes

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

### `ticket`

- **Type**: [`ticket`](../objects/ticket.md)
- **Requirement**: optional
- **Group**: context

The linked ticket in the ticketing system.

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
