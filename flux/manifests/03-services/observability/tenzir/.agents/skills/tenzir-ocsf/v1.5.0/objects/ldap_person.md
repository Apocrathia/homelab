# LDAP Person (ldap_person)

The additional LDAP attributes that describe a person.

- **Extends**: [Object (object)](object.md)

## Attributes

### `cost_center`

- **Type**: `string_t`
- **Requirement**: optional

The cost center associated with the user.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when the user was created.

### `deleted_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when the user was deleted. In Active Directory (AD), when a user is deleted they are moved to a temporary container and then removed after 30 days. So, this field can be populated even after a user is deleted for the next 30 days.

### `display_name`

- **Type**: `string_t`
- **Requirement**: optional

The display name of the LDAP person. According to RFC 2798, this is the preferred name of a person to be used when displaying entries.

### `email_addrs`

- **Type**: `email_t`
- **Requirement**: optional

A list of additional email addresses for the user.

### `employee_uid`

- **Type**: `string_t`
- **Requirement**: optional

The employee identifier assigned to the user by the organization.

### `given_name`

- **Type**: `string_t`
- **Requirement**: optional

The given or first name of the user.

### `hire_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when the user was or will be hired by the organization.

### `job_title`

- **Type**: `string_t`
- **Requirement**: optional

The user's job title.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The labels associated with the user. For example in AD this could be the `userType`, `employeeType`. For example: `Member, Employee`.

### `last_login_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The last time when the user logged in.

### `ldap_cn`

- **Type**: `string_t`
- **Requirement**: optional

The LDAP and X.500 `commonName` attribute, typically the full name of the person. For example, `John Doe`.

### `ldap_dn`

- **Type**: `string_t`
- **Requirement**: optional

The X.500 Distinguished Name (DN) is a structured string that uniquely identifies an entry, such as a user, in an X.500 directory service For example, `cn=John Doe,ou=People,dc=example,dc=com`.

### `leave_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when the user left or will be leaving the organization.

### `location`

- **Type**: [`location`](location.md)
- **Requirement**: optional

The geographical location associated with a user. This is typically the user's usual work location.

### `manager`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user's manager. This helps in understanding an org hierarchy. This should only ever be populated once in an event. I.e. there should not be a manager's manager in an event.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The timestamp when the user entry was last modified.

### `office_location`

- **Type**: `string_t`
- **Requirement**: optional

The primary office location associated with the user. This could be any string and isn't a specific address. For example, `South East Virtual`.

### `phone_number`

- **Type**: `string_t`
- **Requirement**: optional

The telephone number of the user. Corresponds to the LDAP `Telephone-Number` CN.

### `surname`

- **Type**: `string_t`
- **Requirement**: optional

The last or family name for the user.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the user.
