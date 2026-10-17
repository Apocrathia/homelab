# Cloud (cloud)

The Cloud object describes the cloud computing environment where an event or finding originated. It provides comprehensive context about the cloud infrastructure, including the cloud service provider, account or subscription details, organizational structure, geographic regions, availability zones, and logical partitions.

- **Extends**: [Object (object)](object.md)

## Attributes

### `account`

- **Type**: [`account`](account.md)
- **Requirement**: optional

The Account object containing details about the cloud account, subscription, or billing unit where the event or finding was created. This object includes properties such as the account name, unique identifier, type, labels, and tags.

Examples:

- AWS: Account object with `name`, `uid` (Account ID), `type`, and other account properties
- Azure: Subscription object with `name`, `uid` (Subscription ID), `type`, and subscription metadata
- GCP: Project object with `name`, `uid` (Project ID), `type`, and project attributes
- Oracle Cloud: Compartment object with `name`, `uid` (Tenancy OCID), `type`, and compartment details

### `cloud_partition`

- **Type**: `string_t`
- **Requirement**: optional

The logical grouping or isolated segment within a cloud provider's infrastructure where the event or finding was created, often used for compliance, governance, or regional separation.

Examples:

- AWS: Partition where the event occurred (`aws`, `aws-cn`, `aws-us-gov`)
- Azure: Cloud environment where the event occurred (`AzureCloud`, `AzureUSGovernment`, `AzureChinaCloud`)

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

The Organization object containing details about the organizational unit or management structure that governs the account, subscription, or project where the event or finding was created. This object includes properties such as the organization name, unique identifier, type, and other organizational metadata.

Examples:

- AWS: Organization object with `name`, `uid` (Organization ID), `type`, and other organizational properties
- Azure: Management Group object with `name`, `uid` (Management Group ID), `type`, and management group metadata
- GCP: Organization object with `name`, `uid` (Organization ID), `type`, and organizational attributes
- Oracle Cloud: Tenancy object with `name`, `uid` (Tenancy OCID), `type`, and tenancy details

### `project_uid`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `account.uid` attribute instead.

The unique identifier of a Cloud project.

### `provider`

- **Type**: `string_t`
- **Requirement**: required

The unique name of the Cloud services provider where the event or finding was created, such as AWS, MS Azure, GCP, etc.

### `region`

- **Type**: `string_t`
- **Requirement**: recommended

The cloud region where the event or finding was created, as defined by the cloud provider.

Examples:

- AWS: Region where the event occurred (`us-east-1`, `eu-west-1`)
- Azure: Region where the event occurred (`East US`, `West Europe`)
- GCP: Region where the event occurred (`us-central1`, `europe-west1`)
- Oracle Cloud: Region where the event occurred (`us-ashburn-1`, `uk-london-1`)

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The availability zone in the cloud region where the event or finding was created, as defined by the cloud provider.

Examples:

- AWS: Availability zone where the event occurred (`us-east-1a`, `us-east-1b`)
- Azure: Availability zone where the event occurred (`1`, `2`, `3` within a region)
- GCP: Availability zone where the event occurred (`us-central1-a`, `us-central1-b`)
- Oracle Cloud: Availability zone where the event occurred (`AD-1`, `AD-2`, `AD-3`)
