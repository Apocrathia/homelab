# Resource Details (resource_details)

The Resource Details object describes details about resources that were affected by the activity/event.

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

### `criticality`

- **Type**: `string_t`
- **Requirement**: optional

The criticality of the resource as defined by the event source.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The name of the related resource group.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The fully qualified name of the resource.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address of the resource, in either IPv4 or IPv6 format.

### `is_backed_up`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the device or resource has a backup enabled, such as an automated snapshot or a cloud backup. For example, this is indicated by the `cloudBackupEnabled` value within JAMF Pro mobile devices or the registration of an AWS ARN with the AWS Backup service.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 38

The name of the entity. See specific usage.

### `namespace`

- **Type**: `string_t`
- **Requirement**: optional

The namespace is useful when similar entities exist that you need to keep separate.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The identity of the service or user account that owns the resource.

### `region`

- **Type**: `string_t`
- **Requirement**: optional

The cloud region of the resource.

### `resource_relationship`

- **Type**: [`graph`](graph.md)
- **Requirement**: optional

A graph representation showing how this resource relates to and interacts with other entities in the environment. This can include parent/child relationships, dependencies, or other connections.

### `role`

- **Type**: `string_t`
- **Requirement**: optional

The role of the resource in the context of the event or finding, normalized to the caption of the role_id value. In the case of 'Other', it is defined by the event source.

### `role_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `role`

#### Enum values

- `1`: `Target` - The resource is the primary target or subject of the event/finding.
- `2`: `Actor` - The resource is acting as the initiator or performer in the context of the event/finding.
- `3`: `Affected` - The resource was impacted or affected by the event/finding.
- `4`: `Related` - The resource is related to or associated with the event/finding.

The normalized identifier of the resource's role in the context of the event or finding.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the resource. For example `1.2.3`.

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The specific availability zone within a cloud region where the resource is located.
