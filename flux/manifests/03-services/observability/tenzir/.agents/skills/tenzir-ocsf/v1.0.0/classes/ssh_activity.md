# SSH Activity (ssh_activity)

SSH Activity events report remote client connections to a server using the Secure Shell (SSH) Protocol.

- **Class UID**: `4007`
- **Category**: Network Activity
- **Extends**: [Network Activity (network_activity)](network_activity.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `client_hassh`

- **Type**: [`hassh`](../objects/hassh.md)
- **Requirement**: recommended
- **Group**: primary

The Client HASSH fingerprinting object.

### `protocol_ver`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: context

The Secure Shell Protocol version.

### `server_hassh`

- **Type**: [`hassh`](../objects/hassh.md)
- **Requirement**: recommended
- **Group**: primary

The Server HASSH fingerprinting object.
