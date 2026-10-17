# Account (account)

The Account object contains details about the account that initiated or performed a specific activity within a system or application. Additionally, the Account object refers to logical Cloud and Software-as-a-Service (SaaS) based containers such as AWS Accounts, Azure Subscriptions, Oracle Cloud Compartments, Google Cloud Projects, and otherwise.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated to the account.

### `name`

- **Type**: `string_t`
- **Observable**: 34

The name of the account (e.g.  `GCP Project name` ,  `Linux Account name`  or  `AWS Account name`).

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the account.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The account type, normalized to the caption of 'account_type_id'. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The account type is unknown.
- `1`: `LDAP Account`
- `10`: `AWS Account`
- `11`: `GCP Project`
- `12`: `OCI Compartment`
- `13`: `Azure Subscription`
- `14`: `Salesforce Account`
- `15`: `Google Workspace`
- `16`: `Servicenow Instance`
- `17`: `M365 Tenant`
- `18`: `Email Account`
- `2`: `Windows Account`
- `3`: `AWS IAM User`
- `4`: `AWS IAM Role`
- `5`: `GCP Account`
- `6`: `Azure AD Account`
- `7`: `Mac OS Account`
- `8`: `Apple Account`
- `9`: `Linux Account`
- `99`: `Other` - The account type is not mapped.

The normalized account type identifier.

### `uid`

- **Type**: `string_t`
- **Observable**: 35

The unique identifier of the account (e.g.  `AWS Account ID` ,  `OCID` ,  `GCP Project ID` ,  `Azure Subscription ID` ,  `Google Workspace Customer ID` , or  `M365 Tenant UID`).
