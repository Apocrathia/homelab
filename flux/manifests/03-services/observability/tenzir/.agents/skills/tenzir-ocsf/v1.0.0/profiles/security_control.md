# Security Control (security_control)

The attributes that identify security controls such as malware or policy violations.

## Applies to

- DNS Activity
- Email Activity
- Email File Activity
- Email URL Activity
- File System Activity
- FTP Activity
- HTTP Activity
- Kernel Activity
- Kernel Extension Activity
- Memory Activity
- Module Activity
- Network Activity
- Process Activity
- RDP Activity
- Scheduled Job Activity
- SMB Activity
- SSH Activity
- System Activity

## Attributes

### `attacks`

- **Type**: [`attack`](../objects/attack.md)
- **Requirement**: recommended

An array of attacks associated with an event.

### `disposition`

- **Type**: `string_t`
- **Requirement**: optional

The event disposition name, normalized to the caption of the disposition_id value. In the case of 'Other', it is defined by the event source.

### `disposition_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `disposition`

#### Enum values

- `99`: `Other`
- `0`: `Unknown`
- `1`: `Allowed`
- `2`: `Blocked`
- `3`: `Quarantined`
- `4`: `Isolated`
- `5`: `Deleted`
- `6`: `Dropped`
- `7`: `Custom Action` - Executed custom action such as run a command script.
- `8`: `Approved`
- `9`: `Restored`
- `10`: `Exonerated` - No longer suspicious (re-scored).
- `11`: `Corrected`
- `12`: `Partially Corrected`
- `13`: `Uncorrected`
- `14`: `Delayed` - Requires reboot to finish the operation.
- `15`: `Detected`
- `16`: `No Action`
- `17`: `Logged`
- `18`: `Tagged` - Marked with extended attributes.

When security issues, such as malware or policy violations, are detected and possibly corrected, then `disposition_id` describes the action taken by the security product.

### `malware`

- **Type**: [`malware`](../objects/malware.md)
- **Requirement**: optional

The list of malware identified by a finding.
