# Organization (organization)

The Organization object describes characteristics of an organization or company and its division if any.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The name of the organization. For example, Widget, Inc.

### `ou_name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the organizational unit, within an organization.  For example, Finance, IT, R&D

### `ou_uid`

- **Type**: `string_t`
- **Requirement**: optional

The alternate identifier for an entity's unique identifier. For example, its Active Directory OU DN or AWS OU ID.

### `uid`

- **Type**: `string_t`

The unique identifier of the organization. For example, its Active Directory or AWS Org ID.
