# Previous Event (prev_event)

The Previous Event object references the previous event in a chain of events. Refer to specific usage.

- **Extends**: [Object (object)](object.md)

## Attributes

### `fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

The fingerprint of the previous event, binding this reference to the previous event's content so that altering or substituting the previous event breaks the link. Refer to specific usage.

### `type_uid`

- **Type**: `long_t`
- **Requirement**: recommended
- **Sibling**: `type_name`

The event type identifier of the previous event, as carried in that event's `type_uid`. It directs a consumer to the event class, and therefore the table or store, where the previous event resides.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the previous event, as carried in that event's `metadata.uid`.
