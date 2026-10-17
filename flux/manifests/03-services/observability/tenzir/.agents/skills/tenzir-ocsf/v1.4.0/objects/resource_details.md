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

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the resource. For example `1.2.3`.
