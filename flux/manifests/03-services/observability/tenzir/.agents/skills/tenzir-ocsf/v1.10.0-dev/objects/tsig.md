# TSIG (tsig)

The TSIG (Transaction Signature) object represents a TSIG resource record as defined in RFC 2845. TSIG uses a shared secret key and one-way hash function to authenticate DNS messages. Per RFC 2845, at most one TSIG record is permitted per DNS message.

- **Extends**: [Object (object)](object.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: recommended

The HMAC algorithm used to compute the MAC. For example: `hmac-sha256`.

### `error`

- **Type**: `string_t`
- **Requirement**: optional

The TSIG error, normalized to the caption of the `error_id` value. In the case of 'Other', it is defined by the event source.

### `error_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `error`

#### Enum values

- `0`: `NoError` - No error.
- `16`: `BADSIG` - TSIG signature failure.
- `17`: `BADKEY` - Key not recognized.
- `18`: `BADTIME` - Signature out of time window.
- `99`: `Other` - The TSIG error code is not listed. See the `error` attribute, which contains a data source specific value.

The normalized TSIG-specific error code as defined in RFC 2845 and RFC 6895. This is independent of the DNS message header RCODE.

### `key_name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the shared secret key used to sign the DNS message. For example: `my-tsig-key.example.com.`
