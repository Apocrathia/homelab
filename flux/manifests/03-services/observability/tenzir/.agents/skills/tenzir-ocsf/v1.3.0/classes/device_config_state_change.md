# Device Config State Change (device_config_state_change)

Device Config State Change events report state changes that impact the security of the device.

- **Class UID**: `5019`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
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

### `prev_security_level`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The previous security level of the entity

### `prev_security_level_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `prev_security_level`

#### Enum values

- `0`: `Unknown`
- `1`: `Secure`
- `2`: `At Risk`
- `3`: `Compromised`
- `99`: `Other` - The security level is not mapped. See the `prev_security_level` attribute, which contains data source specific values.

The previous security level of the entity

### `prev_security_states`

- **Type**: [`security_state`](../objects/security_state.md)
- **Requirement**: recommended
- **Group**: primary

The previous security states of the device.

### `security_level`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The current security level of the entity

### `security_level_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `security_level`

#### Enum values

- `0`: `Unknown`
- `1`: `Secure`
- `2`: `At Risk`
- `3`: `Compromised`
- `99`: `Other` - The security level is not mapped. See the `security_level` attribute, which contains data source specific values.

The current security level of the entity

### `security_states`

- **Type**: [`security_state`](../objects/security_state.md)
- **Requirement**: recommended
- **Group**: primary

The current security states of the device.

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The Config Change Stat, normalized to the caption of the state_id value. In the case of 'Other', it is defined by the source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `state`

#### Enum values

- `0`: `Unknown` - The Config Change state is unknown.
- `1`: `Disabled` - Config State Changed to Disabled.
- `2`: `Enabled` - Config State Changed to Enabled.
- `99`: `Other` - The Config Change is not mapped. See the `state` attribute, which contains data source specific values.

The Config Change State of the managed entity.
