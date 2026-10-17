# SSH Activity (ssh_activity)

SSH Activity events report remote client connections to a server using the Secure Shell (SSH) Protocol.

- **Class UID**: `4007`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Host](../profiles/host.md), [Network Proxy](../profiles/network_proxy.md), [Security Control](../profiles/security_control.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Network:**
- `dst_endpoint` (required)
- `src_endpoint` (required)
- `connection_info` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `auth_type`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The SSH authentication type, normalized to the caption of 'auth_type_id'. In the case of 'Other', it is defined by the event source.

### `auth_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `auth_type`

#### Enum values

- `99`: `Other`
- `0`: `Unknown`
- `1`: `Certificate Based` - Authentication using digital certificates.
- `2`: `GSSAPI` - GSSAPI for centralized authentication.
- `3`: `Host Based` - Authentication based on the client host's identity.
- `4`: `Keyboard Interactive` - Multi-step, interactive authentication.
- `5`: `Password` - Password Authentication.
- `6`: `Public Key` - Paired public key authentication.

The normalized identifier of the SSH authentication type.

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
