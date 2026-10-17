# Response Elements (response)

The Response Elements object describes characteristics of an API response.

- **Extends**: [Object (object)](object.md)

## Attributes

### `code`

- **Type**: `integer_t`
- **Requirement**: recommended

The numeric response sent to a request.

### `error`

- **Type**: `string_t`
- **Requirement**: recommended

Error Code

### `error_message`

- **Type**: `string_t`
- **Requirement**: recommended

Error Message

### `flags`

- **Type**: `string_t`
- **Requirement**: optional

The list of communication flags, normalized to the captions of the flag_ids values. In the case of 'Other', they are defined by the event source.

### `message`

- **Type**: `string_t`
- **Requirement**: recommended

The description of the event, as defined by the event source.
