# Discovery Details (discovery_details)

The Discovery Details object describes results of a discovery task/job. Each result may be due to the violation of a `rule` associated with a `policy` and have multiple `occurrences`.

- **Extends**: [Object (object)](object.md)

## Attributes

### `count`

- **Type**: `integer_t`
- **Requirement**: recommended

The number of discovered entities of the specified type.

### `occurrence_details`

- **Type**: [`occurrence_details`](occurrence_details.md)
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use `occurrences` instead.

Details about where in the target entity, specified information was discovered. Only the attributes, relevant to the target entity type should be populated.

### `occurrences`

- **Type**: [`occurrence_details`](occurrence_details.md)
- **Requirement**: optional

Details about where in the target entity, specified information was discovered. Only the attributes, relevant to the target entity type should be populated.

### `rule`

- **Type**: [`rule`](rule.md)
- **Requirement**: recommended

The rule associated with this discovery, usually part of the higher level `policy` from an enclosing class or object.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The specific type of information that was discovered. e.g. `name, phone_number, etc.`

### `value`

- **Type**: `string_t`
- **Requirement**: optional

Optionally, the specific value of discovered information.
