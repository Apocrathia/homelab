# HTTP Request (http_request)

The HTTP Request object represents the attributes of a request made to a web server. It encapsulates the details and metadata associated with an HTTP request, including the request method, headers, URL, query parameters, body content, and other relevant information.

- **Extends**: [Object (object)](object.md)

## Attributes

### `args`

- **Type**: `string_t`
- **Requirement**: optional

The arguments sent along with the HTTP request.

### `http_headers`

- **Type**: [`http_header`](http_header.md)
- **Requirement**: recommended

Additional HTTP headers of an HTTP request or response.

### `http_method`

- **Type**: `string_t`

#### Enum values

- `CONNECT`: `Connect` - The CONNECT method establishes a tunnel to the server identified by the target resource.
- `DELETE`: `Delete` - The DELETE method deletes the specified resource.
- `GET`: `Get` - The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.
- `HEAD`: `Head` - The HEAD method asks for a response identical to a GET request, but without the response body.
- `OPTIONS`: `Options` - The OPTIONS method describes the communication options for the target resource.
- `POST`: `Post` - The POST method submits an entity to the specified resource, often causing a change in state or side effects on the server.
- `PUT`: `Put` - The PUT method replaces all current representations of the target resource with the request payload.
- `TRACE`: `Trace` - The TRACE method performs a message loop-back test along the path to the target resource.

The [HTTP request method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) indicates the desired action to be performed for a given resource.

### `referrer`

- **Type**: `string_t`
- **Requirement**: optional

The request header that identifies the address of the previous web page, which is linked to the current web page or resource being requested.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the http request.

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: recommended

The URL object that pertains to the request.

### `user_agent`

- **Type**: `string_t`
- **Requirement**: recommended

The request header that identifies the operating system and web browser.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The Hypertext Transfer Protocol (HTTP) version.

### `x_forwarded_for`

- **Type**: `ip_t`
- **Requirement**: optional

The X-Forwarded-For header identifying the originating IP address(es) of a client connecting to a web server through an HTTP proxy or a load balancer.
