# CIS Control (cis_control)

The CIS Control (aka Critical Security Control) object describes a prioritized set of actions to protect your organization and data from cyber-attack vectors. The [CIS Controls](https://www.cisecurity.org/controls) are defined by the Center for Internet Security.

- **Extends**: [Object (object)](object.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The CIS Control description. For example: Uninstall or disable unnecessary services on enterprise assets and software, such as an unused file sharing service, web application module, or service function.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The CIS Control name. For example: 4.8 Uninstall or Disable Unnecessary Services on Enterprise Assets and Software.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The CIS Control version. For example: v8.
