# Request Elements (request)

The Request Elements object describes characteristics of an API request.

- **Extends**: [Object (object)](object.md)

## Attributes

### `containers`

- **Type**: [`container`](container.md)
- **Requirement**: optional

When working with containerized applications, the set of containers which write to the standard the output of a particular logging driver. For example, this may be the set of containers involved in handling api requests and responses for a containerized application.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The additional data that is associated with the api request.

### `flags`

- **Type**: `string_t`
- **Requirement**: optional

The communication flags that are associated with the api request.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique request identifier.
