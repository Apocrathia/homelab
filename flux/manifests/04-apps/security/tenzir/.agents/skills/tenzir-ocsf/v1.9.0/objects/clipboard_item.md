# Clipboard Item (clipboard_item)

A piece of data on the system clipboard.

- **Extends**: [Object (object)](object.md)

## Attributes

### `binary_data`

- **Type**: `bytestring_t`
- **Requirement**: optional

The item's data in binary form, used when the clipboard content cannot be represented as text or when preserving the exact binary representation is required.

### `clipboard_native_type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the item's data, in an operating specific form. For example: `CF_TEXT` or `public.utf8-plain-text`.

### `mime_type`

- **Type**: `string_t`
- **Requirement**: required

The Multipurpose Internet Mail Extensions (MIME) type of the item's data. For example: `text/plain`.

### `string_data`

- **Type**: `string_t`
- **Requirement**: optional

The item's data if it can be represented as a UTF-8 string.
