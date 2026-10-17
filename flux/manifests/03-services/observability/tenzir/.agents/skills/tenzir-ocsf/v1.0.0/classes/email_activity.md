# Email Activity (email_activity)

Email events report activities of emails.

- **Class UID**: `4009`
- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Send`
- `2`: `Receive`
- `3`: `Scan` - Email being scanned (example: security scanning)

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

The initial SMTP connection response that a messaging server receives after it connects to a email server.

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
- **Requirement**: optional
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

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: optional
- **Group**: primary

The initiator (client) sending the email.

### `smtp_hello`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The value of the SMTP HELO or EHLO command sent by the initiator (client).
