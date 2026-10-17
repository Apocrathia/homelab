# HTTP Activity (http_activity)

HTTP Activity events report HTTP connection and traffic information.

- **Class UID**: `4002`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Host](../profiles/host.md), [Network Proxy](../profiles/network_proxy.md), [Security Control](../profiles/security_control.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Network:**
- `dst_endpoint` (required)
- `connection_info` (recommended)
- `proxy` (recommended)
- `src_endpoint` (recommended)
- `traffic` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Connect` - The CONNECT method establishes a tunnel to the server identified by the target resource.
- `2`: `Delete` - The DELETE method deletes the specified resource.
- `3`: `Get` - The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.
- `4`: `Head` - The HEAD method asks for a response identical to a GET request, but without the response body.
- `5`: `Options` - The OPTIONS method describes the communication options for the target resource.
- `6`: `Post` - The POST method submits an entity to the specified resource, often causing a change in state or side effects on the server.
- `7`: `Put` - The PUT method replaces all current representations of the target resource with the request payload.
- `8`: `Trace` - The TRACE method performs a message loop-back test along the path to the target resource.

The normalized identifier of the activity that triggered the event.

### `http_cookies`

- **Type**: [`http_cookie`](../objects/http_cookie.md)
- **Requirement**: recommended
- **Group**: primary

The cookies object describes details about HTTP cookies

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: required
- **Group**: primary

The HTTP Request Object documents attributes of a request made to a web server.

### `http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: required
- **Group**: primary

The HTTP Response from a web server to a requester.

### `http_status`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.1.0.** Use the  `http_response.code`  attribute instead.

The Hypertext Transfer Protocol (HTTP) [status code](https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml) returned to the client.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: context

The file that is the target of the HTTP activity.
