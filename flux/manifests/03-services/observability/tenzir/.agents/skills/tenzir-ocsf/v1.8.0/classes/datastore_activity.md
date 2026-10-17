# Datastore Activity (datastore_activity)

Datastore events describe general activities (Read, Update, Query, Delete, etc.) which affect datastores or data within those datastores, e.g. (AWS RDS, AWS S3).

- **Class UID**: `6005`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `database`, `databucket`, `table`

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

- `1`: `Read` - The 'Read' activity involves accessing specific data record details.
- `2`: `Update` - The 'Update' activity pertains to modifying specific data record details.
- `3`: `Connect` - The 'Connect' activity involves establishing a connection to the datastore.
- `4`: `Query` - The 'Query' activity involves retrieving a filtered subset of data based on specific criteria.
- `5`: `Write` - The 'Write' activity involves writing specific data record details.
- `6`: `Create` - The 'Create' activity involves generating new data record details.
- `7`: `Delete` - The 'Delete' activity involves removing specific data record details.
- `8`: `List` - The 'List' activity provides an overview of existing data records.
- `9`: `Encrypt` - The 'Encrypt' activity involves securing data by encrypting a specific data record.
- `10`: `Decrypt` - The 'Decrypt' activity involves converting encrypted data back to its original format.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required
- **Group**: primary

The actor object describes details about the user/role/process that was the source of the activity. Note that this is not the threat actor of a campaign but may be part of a campaign.

### `database`

- **Type**: [`database`](../objects/database.md)
- **Requirement**: recommended
- **Group**: primary

The database object is used for databases which are typically datastore services that contain an organized collection of structured and unstructured data or a types of data.

### `databucket`

- **Type**: [`databucket`](../objects/databucket.md)
- **Requirement**: recommended
- **Group**: primary

The data bucket object is a basic container that holds data, typically organized through the use of data partitions.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

Details about the endpoint hosting the datastore application or service.

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

### `query_info`

- **Type**: [`query_info`](../objects/query_info.md)
- **Requirement**: recommended
- **Group**: primary

The query info object holds information related to data access within a datastore. To access, manipulate, delete, or retrieve data from a datastore, a database query must be written using a specific syntax.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: primary

Details about the source of the activity.

### `table`

- **Type**: [`table`](../objects/table.md)
- **Requirement**: recommended
- **Group**: primary

The table object represents a table within a structured relational database or datastore, which contains columns and rows of data that are able to be create, updated, deleted and queried.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The datastore resource type (e.g. database, datastore, or table).

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The datastore resource type is unknown.
- `1`: `Database`
- `2`: `Databucket`
- `3`: `Table`
- `99`: `Other` - The datastore resource type is not mapped.

The normalized datastore resource type identifier.
