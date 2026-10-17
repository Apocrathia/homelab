# Security State (security_state)

The Security State object describes the security related state of a managed entity.

- **Extends**: [Object (object)](object.md)

## Attributes

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The security state, normalized to the caption of the state_id value. In the case of 'Other', it is defined by the source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `state`

#### Enum values

- `0`: `Unknown` - The security state is unknown.
- `1`: `Missing or outdated content` - The content is missing or outdated.
- `2`: `Policy mismatch` - Not in compliance with the expected security policy.
- `3`: `In network quarantine` - Isolated from the network.
- `4`: `Protection off` - Not protected by a security solution.
- `5`: `Protection malfunction` - The security solution is not functioning properly.
- `6`: `Protection not licensed` - The security solution does not have a valid license.
- `7`: `Unremediated threat` - A detected threat has not been remediated.
- `8`: `Suspicious reputation` - Reputation of the entity is suspicious.
- `9`: `Reboot pending` - A reboot is required for one or more pending actions.
- `10`: `Content is locked` - The content is locked to a specific version.
- `11`: `Not installed` - The entity is not installed.
- `12`: `Writable system partition` - The system partition is writeable.
- `13`: `SafetyNet failure` - The device has failed the SafetyNet check.
- `14`: `Failed boot verify` - The device has failed the boot verification process.
- `15`: `Modified execution environment` - The execution environment has been modified.
- `16`: `SELinux disabled` - The SELinux security feature has been disabled.
- `17`: `Elevated privilege shell` - An elevated privilege shell has been detected.
- `18`: `iOS file system altered` - The file system has been altered on an iOS device.
- `19`: `Open remote access` - Remote access is enabled.
- `20`: `OTA updates disabled` - Mobile OTA (Over The Air) updates have been disabled.
- `21`: `Rooted` - The device has been modified to allow root access.
- `22`: `Android partition modified` - The Android partition has been modified.
- `23`: `Compliance failure` - The entity is not compliant with the associated security policy.
- `99`: `Other` - The security state is not mapped. See the `state` attribute, which contains data source specific values.

The security state of the managed entity.
