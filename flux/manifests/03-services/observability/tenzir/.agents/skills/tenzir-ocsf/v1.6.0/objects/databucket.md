# Databucket (databucket)

The databucket object is a basic container that holds data, typically organized through the use of data partitions.

- **Extends**: [Resource (_resource)](_resource.md)

## Attributes

### `agent_list`

- **Type**: [`agent`](agent.md)
- **Requirement**: optional

A list of `agent` objects associated with a device, endpoint, or resource.

### `cloud_partition`

- **Type**: `string_t`
- **Requirement**: optional

The canonical cloud partition name to which the region is assigned (e.g. AWS Partitions: aws, aws-cn, aws-us-gov).

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the databucket was known to have been created.

### `criticality`

- **Type**: `string_t`
- **Requirement**: optional

The criticality of the databucket as defined by the event source.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the databucket.

### `encryption_details`

- **Type**: [`encryption_details`](encryption_details.md)
- **Requirement**: optional

The encryption details of the databucket. Should be populated if the databucket is encrypted.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: optional

Details about the file/object within a databucket.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

> **Deprecated since v1.6.0.** Use the `groups` attribute instead.

The name of the related resource group.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the databucket belongs.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The fully qualified hostname of the databucket.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address of the resource, in either IPv4 or IPv6 format.

### `is_backed_up`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the device or resource has a backup enabled, such as an automated snapshot or a cloud backup. For example, this is indicated by the `cloudBackupEnabled` value within JAMF Pro mobile devices or the registration of an AWS ARN with the AWS Backup service.

### `is_encrypted`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the databucket is encrypted.

### `is_public`

- **Type**: `boolean_t`
- **Requirement**: recommended

Indicates if the databucket is publicly accessible.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when any changes, updates, or modifications were made within the databucket.

### `name`

- **Type**: `string_t`

The databucket name.

### `namespace`

- **Type**: `string_t`
- **Requirement**: optional

The namespace is useful when similar entities exist that you need to keep separate.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The identity of the service or user account that owns the databucket.

### `region`

- **Type**: `string_t`
- **Requirement**: optional

The cloud region of the databucket.

### `resource_relationship`

- **Type**: [`graph`](graph.md)
- **Requirement**: optional

A graph representation showing how this databucket relates to and interacts with other entities in the environment. This can include parent/child relationships, dependencies, or other connections.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of the databucket in bytes.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The databucket type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `S3`
- `2`: `Azure Blob`
- `3`: `GCP Bucket`
- `99`: `Other`

The normalized identifier of the databucket type.

### `uid`

- **Type**: `string_t`

The unique identifier of the databucket.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the resource. For example `1.2.3`.

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The specific availability zone within a cloud region where the databucket is located.
