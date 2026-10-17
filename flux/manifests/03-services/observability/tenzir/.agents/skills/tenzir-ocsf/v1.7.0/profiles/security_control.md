# Security Control (security_control)

The attributes including disposition that represent the outcome of a security control including but not limited to access control, malware or policy violation, network proxy, intrusion detection, firewall, or data control. The profile is intended to augment activities or findings with an outcome when a security control has observed or intervened. If the control detected a security violation, and the `disposition_id` or `action_id` is an alertable outcome or action, the `is_alert` flag may be set to `true`.

## Applies to

- Account Change
- Admin Group Query
- Airborne Broadcast Activity
- API Activity
- Application Activity
- Application Error
- Application Lifecycle
- Application Security Posture Finding
- Authentication
- Authorize Session
- Base Event
- Cloud Resources Inventory Info
- Compliance Finding
- Data Security Finding
- Datastore Activity
- Detection Finding
- Device Config State
- Device Config State Change
- Device Inventory Info
- DHCP Activity
- Discovery
- Discovery Result
- DNS Activity
- Drone Flights Activity
- Email Activity
- Email File Activity
- Email URL Activity
- Entity Management
- Event Log Activity
- File Hosting Activity
- File Query
- File Remediation Activity
- File System Activity
- Finding
- Folder Query
- FTP Activity
- Group Management
- HTTP Activity
- IAM Analysis Finding
- Identity & Access Management
- Incident Finding
- Job Query
- Kernel Activity
- Kernel Extension Activity
- Kernel Object Query
- Live Evidence Info
- Memory Activity
- Module Activity
- Module Query
- Network
- Network Activity
- Network Connection Query
- Network File Activity
- Network Remediation Activity
- Networks Query
- NTP Activity
- Operating System Patch State
- OSINT Inventory Info
- Peripheral Activity
- Peripheral Device Query
- Process Activity
- Process Query
- Process Remediation Activity
- RDP Activity
- Remediation Activity
- Scan Activity
- Scheduled Job Activity
- Script Activity
- Security Finding
- Service Query
- SMB Activity
- Software Inventory Info
- SSH Activity
- Startup Item Query
- System Activity
- Tunnel Activity
- Unmanned Systems
- User Access Management
- User Inventory Info
- User Query
- User Session Query
- Vulnerability Finding
- Web Resource Access Activity
- Web Resources Activity

## Attributes

### `action`

- **Type**: `string_t`
- **Requirement**: optional

The normalized caption of `action_id`.

### `action_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `action`

#### Enum values

- `0`: `Unknown` - The action was unknown. The `disposition_id` attribute may still be set to a non-unknown value, for example 'Custom Action', 'Challenge'.
- `1`: `Allowed` - The activity was allowed. The `disposition_id` attribute should be set to a value that conforms to this action, for example 'Allowed', 'Approved', 'Delayed', 'No Action', 'Count' etc.
- `2`: `Denied` - The attempted activity was denied. The `disposition_id` attribute should be set to a value that conforms to this action, for example 'Blocked', 'Rejected', 'Quarantined', 'Isolated', 'Dropped', 'Access Revoked, etc.
- `3`: `Observed` - The activity was observed, but neither explicitly allowed nor denied. This is common with IDS and EDR controls that report additional information on observed behavior such as TTPs. The `disposition_id` attribute should be set to a value that conforms to this action, for example 'Logged', 'Alert', 'Detected', 'Count', etc.
- `4`: `Modified` - The activity was modified, adjusted, or corrected. The `disposition_id` attribute should be set appropriately, for example 'Restored', 'Corrected', 'Delayed', 'Captcha', 'Tagged'.
- `99`: `Other` - The action is not mapped. See the `action` attribute which contains a data source specific value.

The action taken by a control or other policy-based system leading to an outcome or disposition. An unknown action may still correspond to a known disposition. Refer to `disposition_id` for the outcome of the action.

### `attacks`

- **Type**: [`attack`](../objects/attack.md)
- **Requirement**: optional

An array of MITRE ATT&CK® objects describing identified tactics, techniques & sub-techniques. The objects are compatible with MITRE ATLAS™ tactics, techniques & sub-techniques.

### `authorizations`

- **Type**: [`authorization`](../objects/authorization.md)
- **Requirement**: optional

Provides details about an authorization, such as authorization outcome, and any associated policies related to the activity/event.

### `confidence`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The confidence, normalized to the caption of the confidence_id value. In the case of 'Other', it is defined by the event source.

### `confidence_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context
- **Sibling**: `confidence`

#### Enum values

- `0`: `Unknown` - The normalized confidence is unknown.
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `99`: `Other` - The confidence is not mapped to the defined enum values. See the `confidence` attribute, which contains a data source specific value.

The normalized confidence refers to the accuracy of the rule that created the finding. A rule with a low confidence means that the finding scope is wide and may create finding reports that may not be malicious in nature.

### `confidence_score`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The confidence score as reported by the event source.

### `disposition`

- **Type**: `string_t`
- **Requirement**: optional

The disposition name, normalized to the caption of the disposition_id value. In the case of 'Other', it is defined by the event source.

### `disposition_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `disposition`

#### Enum values

- `0`: `Unknown` - The disposition is unknown.
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
- `99`: `Other` - The disposition is not mapped. See the `disposition` attribute, which contains a data source specific value.

Describes the outcome or action taken by a security control, such as access control checks, malware detections or various types of policy violations.

### `firewall_rule`

- **Type**: [`firewall_rule`](../objects/firewall_rule.md)
- **Requirement**: optional

The firewall rule that pertains to the control that triggered the event, if applicable.

### `is_alert`

- **Type**: `boolean_t`
- **Requirement**: recommended

Indicates that the event is considered to be an alertable signal. Should be set to `true` if `disposition_id = Alert` among other dispositions, and/or `risk_level_id` or `severity_id` of the event is elevated. Not all control events will be alertable, for example if `disposition_id = Exonerated` or `disposition_id = Allowed`.

### `malware`

- **Type**: [`malware`](../objects/malware.md)
- **Requirement**: optional

A list of Malware objects, describing details about the identified malware.

### `malware_scan_info`

- **Type**: [`malware_scan_info`](../objects/malware_scan_info.md)
- **Requirement**: optional

Describes details about the scan job that identified malware on the target system.

### `policy`

- **Type**: [`policy`](../objects/policy.md)
- **Requirement**: optional

The policy that pertains to the control that triggered the event, if applicable. For example the name of an anti-malware policy or an access control policy.

### `risk_details`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

Describes the risk associated with the finding.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The risk level, normalized to the caption of the risk_level_id value.

### `risk_level_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `risk_level`

#### Enum values

- `0`: `Info`
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `4`: `Critical`
- `99`: `Other` - The risk level is not mapped. See the `risk_level` attribute, which contains a data source specific value.

The normalized risk level id.

### `risk_score`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The risk score as reported by the event source.
