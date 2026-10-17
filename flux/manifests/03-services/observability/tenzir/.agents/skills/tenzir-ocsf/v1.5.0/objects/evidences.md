# Evidence Artifacts (evidences)

A collection of evidence artifacts associated to the activity/activities that triggered a security detection.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `actor`

- **Type**: [`actor`](actor.md)
- **Requirement**: recommended

Describes details about the user/role/process that was the source of the activity that triggered the detection.

### `api`

- **Type**: [`api`](api.md)
- **Requirement**: recommended

Describes details about the API call associated to the activity that triggered the detection.

### `connection_info`

- **Type**: [`network_connection_info`](network_connection_info.md)
- **Requirement**: recommended

Describes details about the network connection associated to the activity that triggered the detection.

### `container`

- **Type**: [`container`](container.md)
- **Requirement**: recommended

Describes details about the container associated to the activity that triggered the detection.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional evidence data that is not accounted for in the specific evidence attributes. `Use only when absolutely necessary.`

### `database`

- **Type**: [`database`](database.md)
- **Requirement**: recommended

Describes details about the database associated to the activity that triggered the detection.

### `databucket`

- **Type**: [`databucket`](databucket.md)
- **Requirement**: recommended

Describes details about the databucket associated to the activity that triggered the detection.

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: recommended

An addressable device, computer system or host associated to the activity that triggered the detection.

### `dst_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the destination of the network activity that triggered the detection.

### `email`

- **Type**: [`email`](email.md)
- **Requirement**: recommended

The email object associated to the activity that triggered the detection.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

Describes details about the file associated to the activity that triggered the detection.

### `http_request`

- **Type**: [`http_request`](http_request.md)
- **Requirement**: recommended

Describes details about the http request associated to the activity that triggered the detection.

### `http_response`

- **Type**: [`http_response`](http_response.md)
- **Requirement**: recommended

Describes details about the http response associated to the activity that triggered the detection.

### `ja4_fingerprint_list`

- **Type**: [`ja4_fingerprint`](ja4_fingerprint.md)
- **Requirement**: recommended

Describes details about the JA4+ fingerprints that triggered the detection.

### `job`

- **Type**: [`job`](job.md)
- **Requirement**: recommended

Describes details about the scheduled job that was associated with the activity that triggered the detection.

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The naming convention or type identifier of the evidence associated with the security detection. For example, the `@odata.type` from Microsoft Graph Alerts V2 or `display_name` from CrowdStrike Falcon Incident Behaviors.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

Describes details about the process associated to the activity that triggered the detection.

### `query`

- **Type**: [`dns_query`](dns_query.md)
- **Requirement**: recommended

Describes details about the DNS query associated to the activity that triggered the detection.

### `resources`

- **Type**: [`resource_details`](resource_details.md)
- **Requirement**: recommended

Describes details about the cloud resources directly related to activity that triggered the detection. For resources impacted by the detection, use `Affected Resources` at the top-level of the finding.

### `script`

- **Type**: [`script`](script.md)
- **Requirement**: recommended

Describes details about the script that was associated with the activity that triggered the detection.

### `src_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the source of the network activity that triggered the detection.

### `tls`

- **Type**: [`tls`](tls.md)
- **Requirement**: recommended

Describes details about the Transport Layer Security (TLS) activity that triggered the detection.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the evidence associated with the security detection. For example, the `activity_id` from CrowdStrike Falcon Alerts or `behavior_id` from CrowdStrike Falcon Incident Behaviors.

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: recommended

The URL object that pertains to the event or object associated to the activity that triggered the detection.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

Describes details about the user that was the target or somehow else associated with the activity that triggered the detection.

### `verdict`

- **Type**: `string_t`
- **Requirement**: optional

The normalized verdict of the evidence associated with the security detection.

### `verdict_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `verdict`

#### Enum values

- `0`: `Unknown` - The type is unknown.
- `1`: `False Positive` - The verdict for the evidence has been identified as a False Positive.
- `2`: `True Positive` - The verdict for the evidence has been identified as a True Positive.
- `3`: `Disregard` - The verdict for the evidence is that is should be Disregarded.
- `4`: `Suspicious` - The verdict for the evidence is that the behavior has been identified as Suspicious.
- `5`: `Benign` - The verdict for the evidence is that the behavior has been identified as Benign.
- `6`: `Test` - The evidence is part of a Test, or other sanctioned behavior(s).
- `7`: `Insufficient Data` - There is insufficient data to render a verdict on the evidence.
- `8`: `Security Risk` - The verdict for the evidence is that the behavior has been identified as a Security Risk.
- `9`: `Managed Externally` - The verdict for the evidence is Managed Externally, such as in a case management tool.
- `10`: `Duplicate` - This evidence duplicates existing evidence related to this finding.
- `99`: `Other` - The type is not mapped. See the `type` attribute, which contains a data source specific value.

The normalized verdict (or status) ID of the evidence associated with the security detection. For example, Microsoft Graph Security Alerts contain a `verdict` enumeration for each type of `evidence` associated with the Alert. This is typically set by an automated investigation process or an analyst/investigator assigned to the finding.
