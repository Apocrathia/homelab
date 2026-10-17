# Request Elements (request)

The Request Elements object describes characteristics of an API request.

- **Extends**: [Object (object)](object.md)

## Attributes

### `flags`

- **Type**: `string_t`
- **Requirement**: optional

The list of communication flags, normalized to the captions of the flag_ids values. In the case of 'Other', they are defined by the event source.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique request identifier.
