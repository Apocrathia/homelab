# Account (account)

The Account object contains details about the account that initiated or performed a specific activity within a system or application.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The name of the account (e.g. GCP Account Name).

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The account type, normalized to the caption of 'account_type_id'. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `99`: `Other` - The account type is not mapped.
- `0`: `Unknown` - The account type is unknown.
- `1`: `LDAP Account`
- `2`: `Windows Account`
- `3`: `AWS IAM User`
- `4`: `AWS IAM Role`
- `5`: `GCP Account`
- `6`: `Azure AD Account`
- `7`: `Mac OS Account`
- `8`: `Apple Account`
- `9`: `Linux Account`
- `10`: `AWS Account`

The normalized account type identifier.

### `uid`

- **Type**: `string_t`

The unique identifier of the account (e.g. AWS Account ID).

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels/tags associated to the account.
