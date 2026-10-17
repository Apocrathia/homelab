# Identity Activity Metrics (identity_activity_metrics)

The Identity Activity Metrics object captures usage patterns, authentication activity, credential usage and other metrics for identities across cloud and on-premises environments. Example identities include AWS IAM Users, Roles, Azure AD Principals, GCP Service Accounts, on-premises Active Directory accounts.

- **Extends**: [Object (object)](object.md)

## Attributes

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when this identity was first observed or created in the system. This helps establish the identity's age and lifecycle stage for risk assessment.

### `last_authentication_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when this identity last successfully authenticated to any system or service. This differs from `last_seen_time` as it specifically tracks authentication events rather than all activities.

### `last_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The timestamp of the most recent activity performed by this identity, including authentication, resource access, or API calls. This is the most comprehensive indicator of identity usage recency.

### `password_last_used_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when password-based authentication was last used by this identity. This helps distinguish between password and other authentication methods (MFA, SSO, certificates) and identify password-specific usage patterns.

### `programmatic_credentials`

- **Type**: [`programmatic_credential`](programmatic_credential.md)
- **Requirement**: optional

Details about the programmatic credentials associated with this identity, such as API keys, service account keys, access tokens, and client certificates used for automated access.
