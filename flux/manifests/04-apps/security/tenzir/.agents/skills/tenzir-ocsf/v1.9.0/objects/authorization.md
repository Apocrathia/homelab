# Authorization Result (authorization)

The Authorization Result object provides details about the authorization outcome and associated policies related to activity.

- **Extends**: [Object (object)](object.md)

## Attributes

### `decision`

- **Type**: `string_t`
- **Requirement**: recommended

Authorization Result/outcome, e.g. allowed, denied.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

Details about the Identity/Access management policies that are applicable.
