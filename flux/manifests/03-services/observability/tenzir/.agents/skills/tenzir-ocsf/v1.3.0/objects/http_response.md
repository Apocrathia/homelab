# HTTP Response (http_response)

The HTTP Response object contains detailed information about the response sent from a web server to the requester. It encompasses attributes and metadata that describe the response status, headers, body content, and other relevant information.

- **Extends**: [Object (object)](object.md)

## Attributes

### `code`

- **Type**: `integer_t`
- **Requirement**: required

The Hypertext Transfer Protocol (HTTP) status code returned from the web server to the client. For example, 200.

### `content_type`

- **Type**: `string_t`
- **Requirement**: optional

The request header that identifies the original [media type](https://www.iana.org/assignments/media-types/media-types.xhtml)  of the resource (prior to any content encoding applied for sending).

### `http_headers`

- **Type**: [`http_header`](http_header.md)
- **Requirement**: recommended

Additional HTTP headers of an HTTP request or response.

### `latency`

- **Type**: `integer_t`
- **Requirement**: optional

The HTTP response latency measured in milliseconds.

### `length`

- **Type**: `integer_t`
- **Requirement**: optional

The HTTP response length, in number of bytes.

### `message`

- **Type**: `string_t`
- **Requirement**: optional

The description of the event/finding, as defined by the source.

### `status`

- **Type**: `string_t`
- **Requirement**: optional

The response status. For example: A successful HTTP status of 'OK' which corresponds to a code of 200.
