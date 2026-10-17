# HTTP Response (http_response)

The HTTP Response object contains detailed information about the response sent from a web server to the requester. It encompasses attributes and metadata that describe the response status, headers, body content, and other relevant information.

- **Extends**: [Object (object)](object.md)

## Attributes

### `code`

- **Type**: `integer_t`
- **Requirement**: required

The numeric code sent from the web server to the requester.

### `content_type`

- **Type**: `string_t`
- **Requirement**: optional

The request header that identifies the original [media type](https://www.iana.org/assignments/media-types/media-types.xhtml)  of the resource (prior to any content encoding applied for sending).

### `latency`

- **Type**: `integer_t`
- **Requirement**: optional

TODO: The HTTP response latency. In seconds, milliseconds, etc.?

### `length`

- **Type**: `integer_t`
- **Requirement**: optional

The HTTP response length, in number of bytes.

### `message`

- **Type**: `string_t`
- **Requirement**: optional

The description of the event, as defined by the event source.

### `status`

- **Type**: `string_t`
- **Requirement**: optional

The response status. For example: Kubernetes responseStatus.status.
