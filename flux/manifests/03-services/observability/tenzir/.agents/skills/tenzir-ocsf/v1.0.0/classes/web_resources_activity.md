# Web Resources Activity (web_resources_activity)

Web Resources Activity events describe actions executed on a set of Web Resources.

- **Class UID**: `6001`
- **Category**: Application Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

- `1`: `Create` - One or more web resources were created.
- `2`: `Read` - One or more web resources were read / viewed.
- `3`: `Update` - One or more web resources were updated.
- `4`: `Delete` - One or more web resources were deleted.
- `5`: `Search` - A search was performed on one or more web resources.
- `6`: `Import` - One or more web resources were imported into an Application.
- `7`: `Export` - One or more web resources were exported from an Application.
- `8`: `Share` - One or more web resources were shared.

The normalized identifier of the activity that triggered the event.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

Details about server providing the web resources.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

Details about the endpoint from which the request originated.

### `web_resources`

- **Type**: [`web_resource`](../objects/web_resource.md)
- **Requirement**: required
- **Group**: primary

Describes details about web resources that were affected by an activity/event.

### `web_resources_result`

- **Type**: [`web_resource`](../objects/web_resource.md)
- **Requirement**: optional
- **Group**: primary

The results of the activity on web resources. It should contain the new values of the changed attributes of the web resources.
