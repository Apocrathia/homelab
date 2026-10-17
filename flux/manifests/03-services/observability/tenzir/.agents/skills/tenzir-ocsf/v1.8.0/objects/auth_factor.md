# Authentication Factor (auth_factor)

An Authentication Factor object describes a category of methods used for identity verification in an authentication attempt.

- **Extends**: [Object (object)](object.md)

## Attributes

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: recommended
- **Group**: primary

Device used to complete an authentication request.

### `email_addr`

- **Type**: `email_t`
- **Requirement**: optional
- **Group**: context

The email address used in an email-based authentication factor.

### `factor_type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The type of authentication factor used in an authentication attempt.

### `factor_type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: primary
- **Sibling**: `factor_type`

#### Enum values

- `0`: `Unknown`
- `1`: `SMS` - User receives and inputs a code sent to their mobile device via SMS text message.
- `2`: `Security Question` - The user responds to a security question as part of a question-based authentication factor
- `3`: `Phone Call` - System calls the user's registered phone number and requires the user to answer and provide a response.
- `4`: `Biometric` - Devices that verify identity-based on user's physical identifiers, such as fingerprint scanners or retina scanners.
- `5`: `Push Notification` - Push notification is sent to user's registered device and requires the user to acknowledge.
- `6`: `Hardware Token` - Physical device that generates a code to be used for authentication.
- `7`: `OTP` - Application generates a one-time password (OTP) for use in authentication.
- `8`: `Email` - A code or link is sent to a user's registered email address.
- `9`: `U2F` - Typically involves a hardware token, which the user physically interacts with to authenticate.
- `10`: `WebAuthn` - Web-based API that enables users to register devices as authentication factors.
- `11`: `Password` - The user enters a password that they have previously established.
- `99`: `Other`

The normalized identifier for the authentication factor.

### `is_hotp`

- **Type**: `boolean_t`
- **Requirement**: recommended
- **Group**: context

Whether the authentication factor is an HMAC-based One-time Password (HOTP).

### `is_totp`

- **Type**: `boolean_t`
- **Requirement**: recommended
- **Group**: context

Whether the authentication factor is a Time-based One-time Password (TOTP).

### `phone_number`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The phone number used for a telephony-based authentication request.

### `provider`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: context

The name of provider for an authentication factor.

### `security_questions`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The question(s) provided to user for a question-based authentication factor.
