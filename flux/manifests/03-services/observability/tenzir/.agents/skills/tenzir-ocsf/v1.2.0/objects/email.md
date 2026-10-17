# Email (email)

The Email object describes the email metadata such as sender, recipients, and direction. Defined by D3FEND [d3f:Email](https://d3fend.mitre.org/dao/artifact/d3f:Email/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `cc`

- **Type**: `email_t`
- **Requirement**: optional

The email header Cc values, as defined by RFC 5322.

### `delivered_to`

- **Type**: `email_t`
- **Requirement**: optional

The Delivered-To email header field.

### `from`

- **Type**: `email_t`
- **Requirement**: required

The email header From values, as defined by RFC 5322.

### `message_uid`

- **Type**: `string_t`
- **Requirement**: recommended

The email header Message-Id value, as defined by RFC 5322.

### `raw_header`

- **Type**: `string_t`
- **Requirement**: optional

The email authentication header.

### `reply_to`

- **Type**: `email_t`
- **Requirement**: recommended

The email header Reply-To values, as defined by RFC 5322.

### `size`

- **Type**: `long_t`
- **Requirement**: recommended

The size in bytes of the email, including attachments.

### `smtp_from`

- **Type**: `email_t`
- **Requirement**: recommended

The value of the SMTP MAIL FROM command.

### `smtp_to`

- **Type**: `email_t`
- **Requirement**: recommended

The value of the SMTP envelope RCPT TO command.

### `subject`

- **Type**: `string_t`

The email header Subject value, as defined by RFC 5322.

### `to`

- **Type**: `email_t`
- **Requirement**: required

The email header To values, as defined by RFC 5322.

### `x_originating_ip`

- **Type**: `ip_t`
- **Requirement**: optional

The X-Originating-IP header identifying the emails originating IP address(es).

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The email unique identifier.
