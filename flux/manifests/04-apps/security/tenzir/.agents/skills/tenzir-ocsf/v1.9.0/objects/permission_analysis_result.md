# Permission Analysis Result (permission_analysis_result)

The Permission Analysis object describes analysis results of permissions, policies directly associated with an identity (user, role, or service account). This evaluates what permissions an identity has been granted through attached policies, which privileges are actively used versus unused, and identifies potential over-privileged access. Use this for identity-centric security assessments such as privilege audits, dormant permission discovery, and least-privilege compliance analysis.

- **Extends**: [Object (object)](object.md)

## Attributes

### `analyzed_privileges_count`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of privileges that were analyzed across all services.

### `condition_keys`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The condition keys and their values that were evaluated during policy analysis, including contextual constraints that affect permission grants. These conditions define when and how permissions are applied. Examples: `aws:SourceIp:1.2.3.4`, `aws:RequestedRegion:us-east-1`.

### `granted_privileges`

- **Type**: `string_t`
- **Requirement**: optional

The specific privileges, actions, or permissions that are explicitly granted by the analyzed policy. Examples: AWS actions like `s3:GetObject`, `ec2:RunInstances`, `iam:CreateUser`; Azure actions like `Microsoft.Storage/storageAccounts/read`; or GCP permissions like `storage.objects.get`.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: recommended

Detailed information about the policy document that was analyzed, including policy metadata, version, type (identity-based, resource-based, etc.), and structural details. This provides context for understanding the scope and nature of the permission analysis.

### `service_privilege_analysis_list`

- **Type**: [`service_privilege_analysis`](service_privilege_analysis.md)
- **Requirement**: optional

The list of privilege analysis results grouped by cloud service or namespace.

### `total_potential_attacks_count`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of privilege-to-attack technique mappings identified across all analyzed privileges.

### `unused_privileges_count`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of privileges or actions defined in the policy that have not been utilized within the analysis timeframe. This metric helps identify over-privileged access and opportunities for privilege reduction to follow the principle of least privilege. High counts may indicate policy bloat or excessive permissions.

### `unused_services_count`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of cloud services or resource types referenced in the policy that have not been accessed or utilized within the analysis timeframe. This helps identify unused service permissions that could be removed to reduce attack surface. Examples: AWS services like S3, SQS, IAM, Lambda; Azure services like Storage, Compute, KeyVault; or GCP services like Cloud Storage, Compute Engine, BigQuery.
