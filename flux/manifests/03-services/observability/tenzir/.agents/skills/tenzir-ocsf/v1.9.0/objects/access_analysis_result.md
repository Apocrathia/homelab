# Access Analysis Result (access_analysis_result)

The Access Analysis Result object describes access relationships and pathways between identities, resources, focusing on who can access what and through which mechanisms. This evaluates access levels (read/write/admin), access types (direct, cross-account, public, federated), and the conditions under which access is granted. Use this for resource-centric security assessments such as external access discovery, public exposure analysis, etc.

- **Extends**: [Object (object)](object.md)

## Attributes

### `access_level`

- **Type**: `string_t`
- **Requirement**: recommended

The generalized access level or permission scope granted to the identity through the analyzed policy configuration. Common examples include Read, Write, List, Delete, Admin, or custom permission levels.

### `access_type`

- **Type**: `string_t`
- **Requirement**: optional

The type or category of access being granted to the identity. This describes the nature of the access relationship, such as cross-account access, public access, federated access, or third-party integration access. Examples include 'Cross-Account', 'Public', 'Federated', 'Service-to-Service', etc.

### `accessors`

- **Type**: [`user`](user.md)
- **Requirement**: required

The identities that are granted access through the analyzed policy configuration. This identifies the specific entity that can exercise the permissions and helps assess the access relationship and potential security implications. Examples include user accounts, service principals, roles, account identifiers, or system identities.

### `additional_restrictions`

- **Type**: [`additional_restriction`](additional_restriction.md)
- **Requirement**: optional

Details about supplementary restrictions and guardrails that may limit the granted access, applied through additional policy types such as Resource Control Policies (RCPs) and Service Control Policies (SCPs) in AWS, or other policy constraints.

### `condition_keys`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The condition keys and their values that constrain when and how the granted access can be exercised. These conditions define the circumstances under which the access relationship is valid and the privileges can be used. Examples: IP address restrictions like 'aws:SourceIp:192.0.2.0/24', time-based constraints like 'aws:RequestedRegion:us-east-1', MFA requirements like 'aws:MultiFactorAuthPresent:true', or custom conditions based on resource tags and request context.

### `granted_privileges`

- **Type**: `string_t`
- **Requirement**: optional

The specific privileges, actions, or permissions that are granted through the analyzed access relationship. This includes the actual operations that the accessor can perform on the target resource. Examples: AWS actions like 'sts:AssumeRole', 's3:GetObject', 'ec2:DescribeInstances'; Azure actions like 'Microsoft.Storage/storageAccounts/read'; or GCP permissions like 'storage.objects.get'.
