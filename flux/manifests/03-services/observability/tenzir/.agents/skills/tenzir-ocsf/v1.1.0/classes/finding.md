# Finding (finding)

The Finding event is a generic event that defines a set of attributes available in the Findings category.

- **Category**: Findings
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)

## Attributes

### `activity_name`

- **Type**: `string_t`

The finding activity name, as defined by the `activity_id`.

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create` - A finding was created.
- `2`: `Update` - A finding was updated.
- `3`: `Close` - A finding was closed.

The normalized identifier of the finding activity.

### `comment`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

A user provided comment about the finding.

### `confidence`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The confidence, normalized to the caption of the confidence_id value. In the case of 'Other', it is defined by the event source.

### `confidence_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context

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

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: optional
- **Group**: primary

Describes the affected device/host. It can be used in conjunction with `Affected Resource(s)`.

e.g. Specific details about an AWS EC2 instance, that is affected by the Finding.

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time of the most recent event included in the finding.

### `finding_info`

- **Type**: [`finding_info`](../objects/finding_info.md)
- **Requirement**: required
- **Group**: primary

Describes the supporting information about a generated finding.

### `start_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time of the least recent event included in the finding.

### `status`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The normalized status of the Finding set by the consumer normalized to the caption of the status_id value. In the case of 'Other', it is defined by the source.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context
- **Sibling**: `status`

#### Enum values

- `1`: `New` - The Finding is new and yet to be reviewed.
- `2`: `In Progress` - The Finding is under review.
- `3`: `Suppressed` - The Finding was reviewed, determined to be benign or a false positive and is now suppressed.
- `4`: `Resolved` - The Finding was reviewed, remediated and is now considered resolved.

The normalized status identifier of the Finding, set by the consumer.
