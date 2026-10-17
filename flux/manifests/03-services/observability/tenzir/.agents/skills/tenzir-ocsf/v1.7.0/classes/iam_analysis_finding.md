# IAM Analysis Finding (iam_analysis_finding)

This finding represents an IAM analysis result, which evaluates IAM policies, access patterns, and IAM configurations for potential security risks. The analysis can focus on either an identity (user, role, service account) or a resource to assess permissions, access patterns, and security posture within the IAM domain.
Note: Use `permission_analysis_results` for identity-centric analysis (evaluating what an identity can do) and `access_analysis_result` for resource-centric analysis (evaluating who can access a resource). These complement each other for comprehensive IAM security assessment.
Note: If the Finding is an incident, i.e. requires incident workflow, also apply the `incident` profile or aggregate this finding into an `Incident Finding`.

- **Class UID**: `2008`
- **Category**: Findings
- **Extends**: [Finding (finding)](finding.md)
- **Profiles**: [Incident](../profiles/incident.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `access_analysis_result`, `applications`, `identity_activity_metrics`, `permission_analysis_results`

## Inherited attributes

**From Finding:**
- `finding_info` (required)
- `confidence_id` (recommended)
- `status_id` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `access_analysis_result`

- **Type**: [`access_analysis_result`](../objects/access_analysis_result.md)
- **Requirement**: optional
- **Group**: context

Describes access relationships and pathways between identities, resources, focusing on who can access what and through which mechanisms. This evaluates access levels (read/write/admin), access types (direct, cross-account, public, federated), and the conditions under which access is granted. Use this for resource-centric security assessments such as external access discovery, public exposure analysis, etc.

### `applications`

- **Type**: [`application`](../objects/application.md)
- **Requirement**: recommended
- **Group**: primary

Details about applications, services, or systems that are accessible based on the IAM analysis. For identity-centric analysis, this represents applications the identity can access. For resource-centric analysis, this represents applications that can access the resource.

### `identity_activity_metrics`

- **Type**: [`identity_activity_metrics`](../objects/identity_activity_metrics.md)
- **Requirement**: recommended
- **Group**: primary

Describes usage activity and other metrics of an Identity i.e. AWS IAM User, GCP IAM Principal, etc.

### `permission_analysis_results`

- **Type**: [`permission_analysis_result`](../objects/permission_analysis_result.md)
- **Requirement**: recommended
- **Group**: primary

Describes analysis results of permissions, policies directly associated with an identity (user, role, or service account). This evaluates what permissions an identity has been granted through attached policies, which privileges are actively used versus unused, and identifies potential over-privileged access. Use this for identity-centric security assessments such as privilege audits, dormant permission discovery, and least-privilege compliance analysis.

### `remediation`

- **Type**: [`remediation`](../objects/remediation.md)
- **Requirement**: optional
- **Group**: context

Describes the recommended remediation steps to address identified issue(s).

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

Details about resources involved in the IAM analysis. For identity-centric analysis, this represents resources the identity can access. For resource-centric analysis, this represents the resource being analyzed and related resources in the access chain.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: recommended
- **Group**: primary

Details about the identity (user, role, service account, or other principal) that is the subject of the IAM analysis. This provides context about the identity being evaluated for security risks and access patterns.
