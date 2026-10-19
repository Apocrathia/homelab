# IAM Role (iam_role)

The IAM Role object describes permission characteristics (or privileges) associated with a user or group of users as security principals against one or more resources. In some cases only the name or ID of the role is known hence other attributes are optional. In some systems a user or group of users can have multiple roles, imparting the union of privileges to the principal. In some systems the role can serve as a temporary security principal without its own credentials on behalf of the actual security principal.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `account`

- **Type**: [`account`](account.md)
- **Requirement**: optional

The account associated with the role. For example, can be a cross-account role, different from the user or group account, granting access within this account.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 49

The role name. For example, `Power Users`.

### `policies`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

IAM policies associated with the role.

### `privileges`

- **Type**: `string_t`
- **Requirement**: optional

List of privileges assigned to a role.

### `programmatic_credentials`

- **Type**: [`programmatic_credential`](programmatic_credential.md)
- **Requirement**: optional

Programmatic credential (API keys, access tokens, certificates, etc) associated with the role.

### `resources`

- **Type**: [`resource_details`](resource_details.md)
- **Requirement**: optional

Resources that the role applies to.

### `session`

- **Type**: [`session`](session.md)
- **Requirement**: optional

The session where the role is active. Some roles may be temporary and expire when the session expires.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 50

The unique role identifier. For example, the Windows role SID, or AWS role ARN.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

The alternate user identifier. For example, the Active Directory role GUID or the associated LDAP group DN.
