# Related Event (related_event)

The Related Event object describes an OCSF event related to a finding.

- **Extends**: [Object (object)](object.md)

## Attributes

### `attacks`

- **Type**: [`attack`](attack.md)
- **Requirement**: optional

An array of [MITRE ATT&CK®](https://attack.mitre.org) objects describing the tactics, techniques & sub-techniques identified by a security control or finding.

### `kill_chain`

- **Type**: [`kill_chain_phase`](kill_chain_phase.md)
- **Requirement**: optional

The [Cyber Kill Chain®](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html) provides a detailed description of each phase and its associated activities within the broader context of a cyber attack.

### `observables`

- **Type**: [`observable`](observable.md)
- **Requirement**: optional

The observables associated with the event or a finding.

### `product_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the product that reported the related event.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.2.0.** Use `type_name` attribute instead.

The type of the related event, as defined by `type_uid`.

For example: `Process Activity: Launch.`

### `type_name`

- **Type**: `string_t`
- **Requirement**: optional

The type of the related OCSF event, as defined by `type_uid`.

For example: `Process Activity: Launch.`

### `type_uid`

- **Type**: `long_t`
- **Requirement**: recommended
- **Sibling**: `type_name`

The unique identifier of the related OCSF event type.

For example: `100701.`

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the related OCSF event. This value must be equal to `metadata.uid` in the corresponding related event.
