# Related Event/Finding (related_event)

The Related Event object describes an event or another finding related to a finding. It may or may not be an OCSF event.

- **Extends**: [Object (object)](object.md)

## Attributes

### `attacks`

- **Type**: [`attack`](attack.md)
- **Requirement**: optional

An array of [MITRE ATT&CK®](https://attack.mitre.org) objects describing identified tactics, techniques & sub-techniques.

### `count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of times that activity in the same logical group occurred, as reported by the related Finding.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the related event/finding was created.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A description of the related event/finding.

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the finding was first observed. e.g. The time when a vulnerability was first observed.
It can differ from the `created_time` timestamp, which reflects the time this finding was created.

### `kill_chain`

- **Type**: [`kill_chain_phase`](kill_chain_phase.md)
- **Requirement**: optional

The [Cyber Kill Chain®](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html) provides a detailed description of each phase and its associated activities within the broader context of a cyber attack.

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

The observables associated with the event or a finding.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

Details about the product that reported the related event/finding.

### `product_uid`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `uid` attribute in the `product` object instead. See specific usage.

The unique identifier of the product that reported the related event.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional

The event/finding severity, normalized to the caption of the severity_id value. In the case of 'Other', it is defined by the source.

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

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated with the related event/finding.

### `title`

- **Type**: `string_t`
- **Requirement**: optional

A title or a brief phrase summarizing the related event/finding.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the related event/finding.Populate if the related event/finding is `NOT` in OCSF. If it is in OCSF, then utilize `type_name, type_uid` instead.

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

The unique identifier of the related event/finding. If the related event/finding is in OCSF, then this value must be equal to `metadata.uid` in the corresponding event.
