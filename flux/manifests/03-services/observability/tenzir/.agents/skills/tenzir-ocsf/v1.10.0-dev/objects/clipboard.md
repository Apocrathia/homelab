# Clipboard (clipboard)

The Clipboard object represents an endpoint clipboard and its contents.

- **Extends**: [Object (object)](object.md)

## Attributes

### `contents`

- **Type**: [`clipboard_item`](clipboard_item.md)
- **Requirement**: recommended

The data items written to, or read from, the clipboard.

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the clipboard on systems with named clipboards. For example: `General` or `Drag`.
