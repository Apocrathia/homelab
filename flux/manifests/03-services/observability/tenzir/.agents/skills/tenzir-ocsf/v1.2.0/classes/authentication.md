# Authentication (authentication)

Authentication events report authentication session activities such as user attempts a logon or logoff, successfully or otherwise.

- **Class UID**: `3002`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Constraints

- **At least one of**: `service`, `dst_endpoint`

## Associations

- `actor.user` ↔ `src_endpoint`
- `dst_endpoint` ↔ `user`
- `src_endpoint` ↔ `actor.user`
- `user` ↔ `dst_endpoint`

## Inherited attributes

**From Identity & Access Management:**
- `src_endpoint` (recommended)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Logon` - A new logon session was requested.
- `2`: `Logoff` - A logon session was terminated and no longer exists.
- `3`: `Authentication Ticket` - A Kerberos authentication ticket (TGT) was requested.
- `4`: `Service Ticket Request` - A Kerberos service ticket was requested.
- `5`: `Service Ticket Renew` - A Kerberos service ticket was renewed.
- `6`: `Preauth` - A preauthentication stage was engaged.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Group**: context

The actor that requested the authentication.

### `auth_factors`

- **Type**: [`auth_factor`](../objects/auth_factor.md)
- **Requirement**: optional
- **Group**: context

Describes a category of methods used for identity verification in an authentication attempt.

### `auth_protocol`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The authentication protocol as defined by the caption of 'auth_protocol_id'. In the case of 'Other', it is defined by the event source.

### `auth_protocol_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `auth_protocol`

#### Enum values

- `99`: `Other` - The authentication protocol is not mapped. See the `auth_protocol` attribute, which contains a data source specific value.
- `0`: `Unknown` - The authentication protocol is unknown.
- `1`: `NTLM`
- `10`: `RADIUS`
- `2`: `Kerberos`
- `3`: `Digest`
- `4`: `OpenID`
- `5`: `SAML`
- `6`: `OAUTH 2.0`
- `7`: `PAP`
- `8`: `CHAP`
- `9`: `EAP`

The normalized identifier of the authentication protocol used to create the user session.

### `certificate`

- **Type**: [`certificate`](../objects/certificate.md)
- **Requirement**: recommended
- **Group**: primary

The certificate associated with the authentication or pre-authentication (Kerberos).

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The endpoint to which the authentication was targeted.

### `is_cleartext`

- **Type**: `boolean_t`
- **Requirement**: optional
- **Group**: context

Indicates whether the credentials were passed in clear text.

Note: True if the credentials were passed in a clear text protocol such as FTP or TELNET, or if Windows detected that a user's logon password was passed to the authentication package in clear text.

### `is_mfa`

- **Type**: `boolean_t`
- **Requirement**: recommended
- **Group**: primary

Indicates whether Multi Factor Authentication was used during authentication.

### `is_new_logon`

- **Type**: `boolean_t`
- **Requirement**: optional
- **Group**: context

Indicates logon is from a device not seen before or a first time account logon.

### `is_remote`

- **Type**: `boolean_t`
- **Requirement**: recommended
- **Group**: primary

The attempted authentication is over a remote connection.

### `logon_process`

- **Type**: [`process`](../objects/process.md)
- **Group**: context

The trusted process that validated the authentication credentials.

### `logon_type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The logon type, normalized to the caption of the logon_type_id value. In the case of 'Other', it is defined by the event source.

### `logon_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `logon_type`

#### Enum values

- `99`: `Other` - The logon type is not mapped. See the `logon_type` attribute, which contains a data source specific value.
- `0`: `Unknown` - The logon type is unknown.
- `1`: `System` - Used only by the System account, for example at system startup.
- `10`: `Remote Interactive` - A remote logon using Terminal Services or remote desktop application.
- `11`: `Cached Interactive` - A user logged on to this device with network credentials that were stored locally on the device and the domain controller was not contacted to verify the credentials.
- `12`: `Cached Remote Interactive` - Same as Remote Interactive. This is used for internal auditing.
- `13`: `Cached Unlock` - Workstation logon.
- `2`: `Interactive` - A local logon to device console.
- `3`: `Network` - A user or device logged onto this device from the network.
- `4`: `Batch` - A batch server logon, where processes may be executing on behalf of a user without their direct intervention.
- `5`: `OS Service` - A logon by a service or daemon that was started by the OS.
- `7`: `Unlock` - A user unlocked the device.
- `8`: `Network Cleartext` - A user logged on to this device from the network. The user's password in the authentication package was not hashed.
- `9`: `New Credentials` - A caller cloned its current token and specified new credentials for outbound connections. The new logon session has the same local identity, but uses different credentials for other network connections.

The normalized logon type identifier.

### `service`

- **Type**: [`service`](../objects/service.md)
- **Requirement**: recommended
- **Group**: primary

The service or gateway to which the user or process is being authenticated

### `session`

- **Type**: [`session`](../objects/session.md)
- **Requirement**: recommended
- **Group**: primary

The authenticated user or service session.

### `status_detail`

- **Type**: `string_t`

The details about the authentication request. For example, possible details for Windows logon or logoff events are:

- Success

- LOGOFF_USER_INITIATED
- LOGOFF_OTHER

- Failure

- USER_DOES_NOT_EXIST
- INVALID_CREDENTIALS
- ACCOUNT_DISABLED
- ACCOUNT_LOCKED_OUT
- PASSWORD_EXPIRED

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The subject (user/role or account) to authenticate.
