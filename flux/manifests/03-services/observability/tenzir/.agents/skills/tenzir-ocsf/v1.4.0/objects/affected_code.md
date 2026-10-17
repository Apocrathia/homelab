# Affected Code (affected_code)

The Affected Code object describes details about a code block identified as vulnerable.

- **Extends**: [Object (object)](object.md)

## Attributes

### `end_line`

- **Type**: `integer_t`
- **Requirement**: recommended

The line number of the last line of code block identified as vulnerable.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: required

Details about the file that contains the affected code block.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: optional

Details about the user that owns the affected file.

### `remediation`

- **Type**: [`remediation`](remediation.md)
- **Requirement**: optional

Describes the recommended remediation steps to address identified issue(s).

### `start_line`

- **Type**: `integer_t`
- **Requirement**: recommended

The line number of the first line of code block identified as vulnerable.
