# API Activity (api_activity)

API events describe general CRUD (Create, Read, Update, Delete) API activities, e.g. (AWS Cloudtrail)

- **Class UID**: `6003`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [Trace](../profiles/trace.md), [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create` - The API call in the event pertains to a 'create' activity.
- `2`: `Read` - The API call in the event pertains to a 'read' activity.
- `3`: `Update` - The API call in the event pertains to a 'update' activity.
- `4`: `Delete` - The API call in the event pertains to a 'delete' activity.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required
- **Group**: primary

The actor object describes details about the user/role/process that was the source of the activity. Note that this is not the threat actor of a campaign but may be part of a campaign.

### `api`

- **Type**: [`api`](../objects/api.md)
- **Requirement**: required
- **Group**: primary

Describes details about a typical API (Application Programming Interface) call.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The network destination endpoint.

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: recommended
- **Group**: primary

Details about the underlying http request.

### `http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: recommended
- **Group**: primary

Details about the underlying http response.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Details about resources that were affected by the activity/event.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: primary

Details about the source of the activity.
