# Email (email)

The Email object describes the email metadata such as sender, recipients, and direction, and can include embedded URLs and files.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bcc`

- **Type**: `email_t`
- **Requirement**: optional

The machine-readable email header Bcc values, as defined by RFC 5322. For example `example.user@usersdomain.com`.

### `bcc_mailboxes`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable email header Bcc Mailbox values. For example `'Example User <example.user@usersdomain.com>'`.

### `cc`

- **Type**: `email_t`
- **Requirement**: optional

The machine-readable email header Cc values, as defined by RFC 5322. For example `example.user@usersdomain.com`.

### `cc_mailboxes`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable email header Cc Mailbox values. For example `'Example User <example.user@usersdomain.com>'`.

### `delivered_to`

- **Type**: `email_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `delivered_to_list` attribute instead.

The machine-readable Delivered-To email header field. For example `example.user@usersdomain.com`

### `delivered_to_list`

- **Type**: `email_t`
- **Requirement**: optional

The machine-readable Delivered-To email header values. For example `example.user@usersdomain.com`

### `files`

- **Type**: [`file`](file.md)
- **Requirement**: optional

The files embedded or attached to the email.

### `from`

- **Type**: `email_t`
- **Requirement**: recommended

The machine-readable email header From value, as defined by RFC 5322. For example `example.user@usersdomain.com`.

### `from_list`

- **Type**: `email_t`
- **Requirement**: optional

The machine-readable email header From values. This array should contain the value in `from`. For example `example.user@usersdomain.com`.

### `from_mailbox`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable email header From Mailbox value. For example `'Example User <example.user@usersdomain.com>'`.

### `from_mailboxes`

- **Type**: `email_t`
- **Requirement**: optional

The human-readable email header From Mailbox values. This array should contain the value in `from_mailbox`. For example `'Example User <example.user@usersdomain.com>'`.

### `http_headers`

- **Type**: [`http_header`](http_header.md)
- **Requirement**: optional

Additional HTTP headers of an HTTP request or response.

### `is_read`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the email has been read.

### `message_uid`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 42

The email header Message-ID value, as defined by RFC 5322.

### `raw_header`

- **Type**: `string_t`
- **Requirement**: optional

The email authentication header.

### `reply_to`

- **Type**: `email_t`
- **Requirement**: recommended

> **Deprecated since v1.4.0.** Use the `reply_to_list` attribute instead.

The machine-readable email header Reply-To value, as defined by RFC 5322. For example `example.user@usersdomain.com`

### `reply_to_list`

- **Type**: `email_t`
- **Requirement**: optional

The machine-readable email header Reply-To values, as defined by RFC 5322. For example `example.user@usersdomain.com`

### `reply_to_mailboxes`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable email header Reply To Mailbox values. For example `'Example User <example.user@usersdomain.com>'`.

### `return_path`

- **Type**: `email_t`
- **Requirement**: optional

The address found in the 'Return-Path' header, which indicates where bounce messages (non-delivery reports) should be sent. This address is often set by the sending system and may differ from the 'From' or 'Sender' addresses. For example, `mailer-daemon@senderserver.com`.

### `sender`

- **Type**: `email_t`
- **Requirement**: optional

The machine readable email address of the system or server that actually transmitted the email message, extracted from the email headers per RFC 5322. This differs from the `from` field, which shows the message author. The sender field is most commonly used when multiple addresses appear in the  `from_list`  field, or when the transmitting system is different from the message author (such as when sending on behalf of someone else).

### `sender_mailbox`

- **Type**: `string_t`
- **Requirement**: optional

The human readable email address of the system or server that actually transmitted the email message, extracted from the email headers per RFC 5322. This differs from the `from_mailbox` field, which shows the message author. The sender mailbox field is most commonly used when multiple addresses appear in the  `from_mailboxes`  field, or when the transmitting system is different from the message author (such as when sending on behalf of someone else).

### `size`

- **Type**: `long_t`
- **Requirement**: recommended

The size in bytes of the email, including attachments.

### `smtp_from`

- **Type**: `email_t`
- **Requirement**: recommended

> **Deprecated since v1.4.0.** Use the `from` attribute instead.

The value of the SMTP MAIL FROM command.

### `smtp_to`

- **Type**: `email_t`
- **Requirement**: recommended

> **Deprecated since v1.4.0.** Use the `to` attribute instead.

The value of the SMTP envelope RCPT TO command.

### `subject`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 40

The email header Subject value, as defined by RFC 5322.

### `to`

- **Type**: `email_t`
- **Requirement**: recommended

The machine-readable email header To values, as defined by RFC 5322. For example `example.user@usersdomain.com`

### `to_mailboxes`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable email header To Mailbox values. For example `'Example User <example.user@usersdomain.com>'`.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 41

The unique identifier of the email thread.

### `urls`

- **Type**: [`url`](url.md)
- **Requirement**: optional

The URLs embedded in the email.

### `x_originating_ip`

- **Type**: `ip_t`
- **Requirement**: optional

The X-Originating-IP header identifying the emails originating IP address(es).
