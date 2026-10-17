# User (user)

The User object describes the characteristics of a user/person or a security principal. Defined by D3FEND [d3f:UserAccount](https://d3fend.mitre.org/dao/artifact/d3f:UserAccount/).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `account`

- **Type**: [`account`](account.md)
- **Requirement**: optional

The user's account or the account associated with the user.

### `credential_uid`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 19

The unique identifier of the user's credential. For example, AWS Access Key ID.

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The domain where the user is defined. For example: the LDAP or Active Directory domain.

### `email_addr`

- **Type**: `email_t`
- **Requirement**: optional

The user's primary email address.

### `full_name`

- **Type**: `string_t`
- **Requirement**: optional

The full name of the person, as per the LDAP Common Name attribute (cn).

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The administrative groups to which the user belongs.

### `ldap_person`

- **Type**: [`ldap_person`](ldap_person.md)
- **Requirement**: optional

The additional LDAP attributes that describe a person.

### `name`

- **Type**: `username_t`
- **Requirement**: recommended

The username. For example, `janedoe1`.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

Organization and org unit related to the user.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional

The risk level, normalized to the caption of the risk_level_id value.

### `risk_level_id`

- **Type**: `integer_t`
- **Requirement**: optional
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

The risk score as reported by the event source.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the user. For example, System, AWS IAM User, etc.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `User` - Regular user account.
- `2`: `Admin` - Admin/root user account.
- `3`: `System` - System account. For example, Windows computer accounts with a trailing dollar sign ($).
- `99`: `Other`

The account type identifier.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique user identifier. For example, the Windows user SID, ActiveDirectory DN or AWS user ARN.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

The alternate user identifier. For example, the Active Directory user GUID or AWS user Principal ID.
