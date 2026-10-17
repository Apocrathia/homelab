# API (api)

The API, or Application Programming Interface, object represents  information pertaining to an API request and response.

- **Extends**: [Object (object)](object.md)

## Attributes

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The information pertaining to the API group.

### `operation`

- **Type**: `string_t`
- **Requirement**: required

Verb/Operation associated with the request

### `request`

- **Type**: [`request`](request.md)
- **Requirement**: recommended

Details pertaining to the API request.

### `response`

- **Type**: [`response`](response.md)
- **Requirement**: recommended

Details pertaining to the API response.

### `service`

- **Type**: [`service`](service.md)
- **Requirement**: optional

The information pertaining to the API service.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the API service.
