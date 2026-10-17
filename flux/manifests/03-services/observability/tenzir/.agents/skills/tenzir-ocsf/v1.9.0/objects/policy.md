# Policy (policy)

The Policy object describes the policies that are applicable.

Policy attributes provide traceability to the operational state of the security product at the time that the event was captured, facilitating forensics, troubleshooting, and policy tuning/adjustments.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional data about the policy such as the underlying JSON policy itself or other details.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the policy.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The policy group.

### `is_applied`

- **Type**: `boolean_t`
- **Requirement**: recommended

A determination if the content of a policy was applied to a target or request, or not.

### `name`

- **Type**: `string_t`

The policy name. For example: `AdministratorAccess Policy`.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The policy type. For example: `Identity Policy, Resource Policy, Service Control Policy, etc.`.

### `uid`

- **Type**: `string_t`

A unique identifier of the policy instance.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The policy version number.
