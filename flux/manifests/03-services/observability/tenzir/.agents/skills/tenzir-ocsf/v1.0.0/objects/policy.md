# Policy (policy)

The Policy object describes the policies that are applicable.

Policy attributes provide traceability to the operational state of the security product at the time that the event was captured, facilitating forensics, troubleshooting, and policy tuning/adjustments.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the policy.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The policy group.

### `name`

- **Type**: `string_t`

The policy name. For example: `IAM Policy`.

### `uid`

- **Type**: `string_t`

A unique identifier of the policy instance.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The policy version number.
