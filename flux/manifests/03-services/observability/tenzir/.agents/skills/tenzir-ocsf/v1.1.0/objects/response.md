# Response Elements (response)

The Response Elements object describes characteristics of an API response.

- **Extends**: [Object (object)](object.md)

## Attributes

### `code`

- **Type**: `integer_t`
- **Requirement**: recommended

The numeric response sent to a request.

### `containers`

- **Type**: [`container`](container.md)
- **Requirement**: optional

When working with containerized applications, the set of containers which write to the standard the output of a particular logging driver. For example, this may be the set of containers involved in handling api requests and responses for a containerized application.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The additional data that is associated with the api response.

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

The description of the event/finding, as defined by the source.
