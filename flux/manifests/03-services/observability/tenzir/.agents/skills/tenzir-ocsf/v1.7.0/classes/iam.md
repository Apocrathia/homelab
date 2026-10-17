# Identity & Access Management (iam)

Abstract base class for Identity & Access Management event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Identity & Access Management
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `activity_id` (required)
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

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: recommended
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity. Note that this is not the threat actor of a campaign but may be part of a campaign.

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: optional
- **Group**: context

Details about the underlying HTTP request.

### `http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: optional
- **Group**: context

Details about the underlying HTTP response.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

Details about the source of the IAM activity.
