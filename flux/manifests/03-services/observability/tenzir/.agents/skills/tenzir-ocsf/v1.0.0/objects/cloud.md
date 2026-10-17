# Cloud (cloud)

The Cloud object contains information about a cloud account such as AWS Account ID, regions, etc.

- **Extends**: [Object (object)](object.md)

## Attributes

### `account`

- **Type**: [`account`](account.md)
- **Requirement**: optional

The account object describes details about the account that was the source or target of the activity.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

Organization and org unit relevant to the event or object.

### `project_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of a Cloud project.

### `provider`

- **Type**: `string_t`
- **Requirement**: required

The unique name of the Cloud services provider, such as AWS, MS Azure, GCP, etc.

### `region`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the cloud region, as defined by the cloud provider.

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The availability zone in the cloud region, as defined by the cloud provider.
