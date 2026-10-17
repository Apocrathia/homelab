# Resource Details (resource_details)

The Resource Details object describes details about a resource (including a user) affected by or related to the activity or finding. The `name` and/or `uid` should correspond to the resource for which the details pertain. Use `role_id` to characterize the role of the resource.

- **Extends**: [Resource (_resource)](_resource.md)

## Attributes

### `agent_list`

- **Type**: [`agent`](agent.md)
- **Requirement**: optional

A list of `agent` objects associated with a device, endpoint, or resource.

### `cloud_partition`

- **Type**: `string_t`
- **Requirement**: optional

The logical grouping or isolated segment within a cloud provider's infrastructure where the resource is located. Examples include AWS partitions (aws, aws-cn, aws-us-gov), Azure cloud environments (AzureCloud, AzureUSGovernment, AzureChinaCloud), or similar logical divisions in other cloud providers.

### `criticality`

- **Type**: `string_t`
- **Requirement**: optional

Criticality or relative importance of this resource, normalized to the caption of `criticality_id`. In the case of Other, the value is defined by the event source.

Note: For versions prior to 1.9, `criticality_id` was not available and this is a source specific value.

### `criticality_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `criticality`

#### Enum values

- `0`: `Unknown` - The criticality level is unknown.
- `1`: `Low` - Minimal operational or security importance.
- `2`: `Medium` - Affects localized functions or specific business processes.
- `3`: `High` - Critical to core operations. Compromise leads to significant, but recoverable disruptions.
- `4`: `Very High` - Mission critical, essential to business survival. Compromise could result in catastrophic consequences.
- `99`: `Other` - The criticality level is not mapped. See the `criticality` attribute, which contains a data source specific value.

The normalized identifier for the criticality or relative importance of this resource. Select the value that best reflects the operational and security impact if the resource were compromised or made unavailable. See the `criticality` sibling attribute for the corresponding human-readable label.

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: optional

The device details when the resource type is a device — for example, a cloud compute instance, a laptop, or a network appliance. Provides structured device attributes (OS, type, hardware, agent) that the resource's scalar fields cannot represent — beyond what the `hostname` and `ip` attributes capture. The `device.name` and `device.uid` should match the `name` and `uid` of this objects; the `device.hostname` value should match the `hostname` attribute of this object. The top-level `hostname` and `ip` remain the primary identifiers for the device resource.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The name of the related resource group.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The fully qualified name of the resource. If the resource is a device, this should match `device.hostname`.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address of the resource, in either IPv4 or IPv6 format. If the resource is a device, this should match `device.ip`.

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

The details of the entity that owns the resource. Usually not the same as `user` that may not own the resource. For example the owner of the directory server but not a user in the directory. This object includes properties such as the owner's name, unique identifier, type, domain, and other relevant attributes that help identify the resource owner within the environment.

### `provider`

- **Type**: `string_t`
- **Requirement**: optional

The cloud service provider that hosts or manages the resource. This field is typically used when the resource is managed by a different provider than the one generating the event or finding. Examples include AWS, Azure, GCP (Google Cloud Platform), Oracle Cloud, IBM Cloud, Alibaba Cloud, or other public, private, or hybrid cloud providers.

### `region`

- **Type**: `string_t`
- **Requirement**: optional

The cloud region where the resource is hosted, as defined by the cloud provider. This represents the physical or logical geographic area containing the infrastructure supporting the resource. Examples include AWS regions (us-east-1, eu-west-1), Azure regions (East US, West Europe), GCP regions (us-central1, europe-west1), or Oracle Cloud regions (us-ashburn-1, uk-london-1).

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

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user represented by this resource — for example, a cloud IAM user, a local account, or an application identity. Provides structured user attributes (email, groups, privileges) that this object's scalar fields such as `name` cannot represent. Distinct from `owner`, which identifies the entity responsible for managing the resource. The `user.name` value should match the `name` attribute of this object, `user.uid` should match the `uid` of this object.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the resource. For example `1.2.3`.

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The availability zone within a cloud region where the resource is located. Examples include AWS availability zones (us-east-1a, us-east-1b), Azure availability zones (1, 2, 3 within a region), GCP zones (us-central1-a, us-central1-b), or Oracle Cloud availability domains (AD-1, AD-2, AD-3).
