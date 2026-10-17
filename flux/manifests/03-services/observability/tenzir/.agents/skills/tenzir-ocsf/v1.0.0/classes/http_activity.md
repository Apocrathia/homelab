# HTTP Activity (http_activity)

HTTP Activity events report HTTP connection and traffic information.

- **Class UID**: `4002`
- **Category**: Network Activity
- **Extends**: [Network Activity (network_activity)](network_activity.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `99`: `Other` - The event activity is not mapped.
- `0`: `Unknown` - The event activity is unknown.

The normalized identifier of the activity that triggered the event.

### `http_status`

- **Type**: `integer_t`
- **Group**: primary

The Hypertext Transfer Protocol (HTTP) [status code](https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml) returned to the client.

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
