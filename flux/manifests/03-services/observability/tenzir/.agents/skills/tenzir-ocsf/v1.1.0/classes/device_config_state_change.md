# Device Config State Change (device_config_state_change)

Device Config State Change events report state changes that impact the security of the device.

- **Class UID**: `5019`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

The device that is impacted by the state change.

### `security_level`

- **Type**: `string_t`
- **Group**: primary

The current security level of the entity

### `security_level_id`

- **Type**: `integer_t`
- **Group**: primary
- **Sibling**: `security_level`

#### Enum values

- `99`: `Other` - The security level is not mapped. See the `security_level` attribute, which contains data source specific values.
- `0`: `Unknown`
- `1`: `Secure`
- `2`: `At Risk`
- `3`: `Compromised`

The current security level of the entity

### `security_states`

- **Type**: [`security_state`](../objects/security_state.md)
- **Group**: primary

The current security states of the device.

### `prev_security_level`

- **Type**: `string_t`
- **Group**: primary

The previous security level of the entity

### `prev_security_level_id`

- **Type**: `integer_t`
- **Group**: primary
- **Sibling**: `prev_security_level`

#### Enum values

- `99`: `Other` - The security level is not mapped. See the `prev_security_level` attribute, which contains data source specific values.
- `0`: `Unknown`
- `1`: `Secure`
- `2`: `At Risk`
- `3`: `Compromised`

The previous security level of the entity

### `prev_security_states`

- **Type**: [`security_state`](../objects/security_state.md)
- **Group**: primary

The previous security states of the device.
