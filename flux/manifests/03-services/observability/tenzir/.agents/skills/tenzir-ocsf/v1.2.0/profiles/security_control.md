# Security Control (security_control)

The attributes including disposition that represent the outcome of a security control including but not limited to access control, malware or policy violation, network proxy, firewall, or data control.  The profile is intended to augment activities or findings with an outcome where a security control has intervened.

## Applies to

- Data Security Finding
- Datastore Activity
- Detection Finding
- DHCP Activity
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
- Network
- Network Activity
- Network File Activity
- NTP Activity
- Process Activity
- RDP Activity
- Scheduled Job Activity
- SMB Activity
- SSH Activity
- System Activity
- Tunnel Activity
- Web Resources Activity

## Attributes

### `action`

- **Type**: `string_t`
- **Requirement**: optional

The normalized caption of `action_id`.

### `action_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `action`

#### Enum values

- `0`: `Unknown` - The action was unknown. The `disposition_id` attribute may still be set to a non-unknown value, for example 'Count', 'Uncorrected', 'Isolated', 'Quarantined' or 'Exonerated'.
- `1`: `Allowed` - The activity was allowed. The `disposition_id` attribute should be set to a value that conforms to this action, for example 'Allowed', 'Approved', 'Delayed', 'No Action', 'Count' etc.
- `2`: `Denied` - The attempted activity was denied. The `disposition_id` attribute should be set to a value that conforms to this action, for example 'Blocked', 'Rejected', 'Quarantined', 'Isolated', 'Dropped', 'Access Revoked, etc.

The action taken by a control or other policy-based system leading to an outcome or disposition. Dispositions conform to an action of `1` 'Allowed' or `2` 'Denied' in most cases. Note that `99` 'Other' is not an option. No action would equate to `1` 'Allowed'. An unknown action may still correspond to a known disposition. Refer to `disposition_id` for the outcome of the action.

### `attacks`

- **Type**: [`attack`](../objects/attack.md)
- **Requirement**: optional

An array of [MITRE ATT&CK®](https://attack.mitre.org) objects describing the tactics, techniques & sub-techniques identified by a security control or finding.

### `authorizations`

- **Type**: [`authorization`](../objects/authorization.md)
- **Requirement**: optional

Provides details about an authorization, such as authorization outcome, and any associated policies related to the activity/event.

### `disposition`

- **Type**: `string_t`
- **Requirement**: optional

The disposition name, normalized to the caption of the disposition_id value. In the case of 'Other', it is defined by the event source.

### `disposition_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `disposition`

#### Enum values

- `99`: `Other` - The disposition is not listed. The `disposition` attribute should be populated with a source specific caption.
- `0`: `Unknown` - The disposition was not known.
- `1`: `Allowed` - Granted access or allowed the action to the protected resource.
- `2`: `Blocked` - Denied access or blocked the action to the protected resource.
- `3`: `Quarantined` - A suspicious file or other content was moved to a benign location.
- `4`: `Isolated` - A session was isolated on the network or within a browser.
- `5`: `Deleted` - A file or other content was deleted.
- `6`: `Dropped` - The request was detected as a threat and resulted in the connection being dropped.
- `7`: `Custom Action` - A custom action was executed such as running of a command script. Use the `message` attribute of the base class for details.
- `8`: `Approved` - A request or submission was approved. For example, when a form was properly filled out and submitted. This is distinct from `1` 'Allowed'.
- `9`: `Restored` - A quarantined file or other content was restored to its original location.
- `10`: `Exonerated` - A suspicious or risky entity was deemed to no longer be suspicious (re-scored).
- `11`: `Corrected` - A corrupt file or configuration was corrected.
- `12`: `Partially Corrected` - A corrupt file or configuration was partially corrected.
- `13`: `Uncorrected` - A corrupt file or configuration was not corrected.
- `14`: `Delayed` - An operation was delayed, for example if a restart was required to finish the operation.
- `15`: `Detected` - Suspicious activity or a policy violation was detected without further action.
- `16`: `No Action` - The outcome of an operation had no action taken.
- `17`: `Logged` - The operation or action was logged without further action.
- `18`: `Tagged` - A file or other entity was marked with extended attributes.
- `19`: `Alert` - The request or activity was detected as a threat and resulted in a notification but request was not blocked.
- `20`: `Count` - Counted the request or activity but did not determine whether to allow it or block it.
- `21`: `Reset` - The request was detected as a threat and resulted in the connection being reset.
- `22`: `Captcha` - Required the end user to solve a CAPTCHA puzzle to prove that a human being is sending the request.
- `23`: `Challenge` - Ran a silent challenge that required the client session to verify that it's a browser, and not a bot.
- `24`: `Access Revoked` - The requestor's access has been revoked due to security policy enforcements. Note: use the `Host` profile if the `User` or `Actor` requestor is not present in the event class.
- `25`: `Rejected` - A request or submission was rejected. For example, when a form was improperly filled out and submitted. This is distinct from `2` 'Blocked'.
- `26`: `Unauthorized` - An attempt to access a resource was denied due to an authorization check that failed. This is a more specific disposition than `2` 'Blocked' and can be complemented with the `authorizations` attribute for more detail.
- `27`: `Error` - An error occurred during the processing of the activity or request. Use the `message` attribute of the base class for details.

Describes the outcome or action taken by a security control, such as access control checks, malware detections or various types of policy violations.

### `firewall_rule`

- **Type**: [`firewall_rule`](../objects/firewall_rule.md)
- **Requirement**: optional

The firewall rule that triggered the event.

### `malware`

- **Type**: [`malware`](../objects/malware.md)
- **Requirement**: optional

A list of Malware objects, describing details about the identified malware.
