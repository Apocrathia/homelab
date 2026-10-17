# Email Activity (email_activity)

Email Activity events report SMTP protocol and email activities including those with embedded URLs and files. See the `Email` object for details.

- **Class UID**: `4009`
- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Send`
- `2`: `Receive`
- `3`: `Scan` - Email being scanned (example: security scanning)
- `4`: `Trace` - Follow an email message as it travels through an organization. The `message_trace_uid` should be populated when selected.
- `5`: `MTA Relay` - Email processed by an MTA, typically combining send, receive, and scan operations into a single activity.

The normalized identifier of the activity that triggered the event.

### `attempt`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The attempt number for attempting to deliver the email.

### `banner`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The initial connection response that a messaging server receives after it connects to an email server.

### `command`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The command issued by the initiator (client), such as SMTP HELO or EHLO.

### `direction`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The direction of the email, as defined by the `direction_id` value.

### `direction_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: context
- **Sibling**: `direction`

#### Enum values

- `0`: `Unknown` - The email direction is unknown.
- `1`: `Inbound` - Email Inbound, from the Internet or outside network destined for an entity inside network.
- `2`: `Outbound` - Email Outbound, from inside the network destined for an entity outside network.
- `3`: `Internal` - Email Internal, from inside the network destined for an entity inside network.
- `99`: `Other`

The direction of the email relative to the scanning host or organization.

Email scanned at an internet gateway might be characterized as inbound to the organization from the Internet, outbound from the organization to the Internet, or internal within the organization. Email scanned at a workstation might be characterized as inbound to, or outbound from the workstation.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The responder (server) receiving the email.

### `email`

- **Type**: [`email`](../objects/email.md)
- **Requirement**: required
- **Group**: primary

The email object.

### `email_auth`

- **Type**: [`email_auth`](../objects/email_auth.md)
- **Requirement**: recommended
- **Group**: primary

The SPF, DKIM and DMARC attributes of an email.

### `from`

- **Type**: `email_t`
- **Requirement**: recommended
- **Group**: primary

The sender address from the transmission envelope. This reflects the actual sending party and may differ from the 'From' header in the message.

### `message_trace_uid`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The identifier that tracks a message that travels through multiple points of a messaging service.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The Protocol Name specifies the email communication protocol, such as SMTP, IMAP, or POP3.

### `smtp_hello`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.4.0.** Use the `command` attribute instead.

The value of the SMTP HELO or EHLO command sent by the initiator (client).

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The initiator (client) sending the email.

### `to`

- **Type**: `email_t`
- **Requirement**: recommended
- **Group**: primary

The recipient address from the transmission envelope. This may differ from the 'To' header and represents where the message was actually delivered.
