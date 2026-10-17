# Identity & Access Management (iam)

Abstract base class for Identity & Access Management event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Identity & Access Management
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

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

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: optional
- **Group**: context

Details about the underlying HTTP request.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

Details about the source of the IAM activity.
