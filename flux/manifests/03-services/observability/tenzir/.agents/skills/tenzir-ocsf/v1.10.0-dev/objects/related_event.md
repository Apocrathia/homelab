# Related Event/Finding (related_event)

The Related Event object describes an event or another finding related to a finding. It may or may not be an OCSF event. Using this class, a hierarchy of findings can be expressed when intermediate findings are themselves analyzed into a higher level finding. Typically these events or intermediate findings contribute to the parent finding via this finding's `analytic`. The full event or finding is referenced by the `uid` attribute, and summarized by other attributes of this object. The `observables` attribute can carry just the observables of the related event or finding, and the full event can be included in the `raw_data` attribute.

Note: If the related event is a finding, `finding_info` should be populated with its `finding_info.uid` attribute equal to `uid`. That finding may also have related events.

- **Extends**: [Object (object)](object.md)

## Attributes

### `attacks`

- **Type**: [`attack`](attack.md)
- **Requirement**: optional

An array of MITRE ATT&CK® objects describing identified tactics, techniques & sub-techniques. The objects are compatible with MITRE ATLAS™ tactics, techniques & sub-techniques.

### `count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of times that activity in the same logical group occurred, as reported by the related Finding.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the related event/finding was created.

If the related event/finding is in OCSF and is a Finding, then this value should be equal to `finding_info.created_time` in the corresponding Finding. If the related event/finding is in OCSF and is not a Finding, then this value should be equal to `time` in the corresponding event.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A description of the related event/finding.

### `finding_info`

- **Type**: [`finding_info`](finding_info.md)
- **Requirement**: recommended
- **Group**: context

Describes the supporting information about a related finding which itself may contain its own related events or findings.

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the finding was first observed. e.g. The time when a vulnerability was first observed.
It can differ from the `created_time` timestamp, which reflects the time this finding was created.

### `kill_chain`

- **Type**: [`kill_chain_phase`](kill_chain_phase.md)
- **Requirement**: optional

The Kill Chain provides a detailed description of each phase and its associated activities within the broader context of a cyber attack.

### `last_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the finding was most recently observed. e.g. The time when a vulnerability was most recently observed.
It can differ from the `modified_time` timestamp, which reflects the time this finding was last modified.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the related event/finding was last modified.

### `observables`

- **Type**: [`observable`](observable.md)
- **Requirement**: optional

The observables array surfaces key indicators and entities from the event or finding in a single, consistent location for downstream correlation and detection. Each entry references an attribute path within the event (e.g., `src_endpoint.ip`) along with its type and value, enabling consumers to extract IOCs without parsing the full event structure.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

Details about the product that reported the related event/finding.

### `product_uid`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `product.uid` attribute instead.

The unique identifier of the product that reported the related event.

### `raw_data`

- **Type**: `string_t`
- **Requirement**: optional

The content of the related event or finding. This is the data pointed to by the `uid` attribute. Populate when the entire related event is carried with the finding.

### `risk_details`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

Describes the risk associated with a related finding.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The risk level, normalized to the caption of the risk_level_id value.

### `risk_level_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `risk_level`

#### Enum values

- `0`: `Info`
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `4`: `Critical`
- `99`: `Other` - The risk level is not mapped. See the `risk_level` attribute, which contains a data source specific value.

The normalized risk level id.

### `risk_score`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The risk score as reported by the event source.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional

The event/finding severity label, normalized to the caption of the `severity_id` value. When `severity_id` is `99` (Other), this attribute must contain the source-specific severity label. For all other values, this should match the caption defined for that `severity_id` enum value (e.g., `"High"` for `severity_id: 4`).

### `severity_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `severity`

#### Enum values

- `0`: `Unknown` - The event/finding severity is unknown.
- `1`: `Informational` - Informational message. No action required.
- `2`: `Low` - The user decides if action is needed.
- `3`: `Medium` - Action is required but the situation is not serious at this time.
- `4`: `High` - Action is required immediately.
- `5`: `Critical` - Action is required immediately and the scope is broad.
- `6`: `Fatal` - An error occurred but it is too late to take remedial action.
- `99`: `Other` - The event/finding severity is not mapped. See the `severity` attribute, which contains a data source specific value.

The normalized identifier of the event/finding severity.

The normalized severity is a measurement the effort and expense required to manage and resolve an event or incident. Smaller numerical values represent lower impact events, and larger numerical values represent higher impact events.

### `status`

- **Type**: `string_t`
- **Requirement**: optional

The related event status. Should correspond to the label of the status_id (or 'Other' status value for status_id = 99) of the related event.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated with the related event/finding.

### `title`

- **Type**: `string_t`
- **Requirement**: optional

A title or a brief phrase summarizing the related event/finding.

### `traits`

- **Type**: [`trait`](trait.md)
- **Requirement**: optional

The list of key traits or characteristics extracted from the related event/finding that influenced or contributed to the overall finding's outcome.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the related event/finding.

Populate if the related event/finding is `NOT` in OCSF and `type_id` is 99 (Other). If it is in OCSF, then utilize `type_name, type_uid` for a type-specific value.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Activity` - The related event is a normal OCSF activity.
- `2`: `Alert` - The related event is an OCSF alert using the `security_control` profile with `is_alert = true`.
- `3`: `Finding` - The related event is an OCSF finding or intermediate finding. Intermediate findings are ordinary findings analyzed into higher level findings.

The normalized identifier of the related event type.

### `type_name`

- **Type**: `string_t`
- **Requirement**: optional

The type of the related OCSF event, as defined by `type_uid`.

For example: `Process Activity: Launch.`

Populate if the related event/finding is in OCSF.

### `type_uid`

- **Type**: `long_t`
- **Requirement**: recommended
- **Sibling**: `type_name`

The unique identifier of the related OCSF event type.

For example: `100701.`

Populate if the related event/finding is in OCSF.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the related event/finding.

If the related event/finding is in OCSF, then this value must be equal to `metadata.uid` in the corresponding event.
