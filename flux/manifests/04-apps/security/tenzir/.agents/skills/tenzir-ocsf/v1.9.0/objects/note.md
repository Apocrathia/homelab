# Note (note)

Represents a note or a comment in the system. Notes can be used to provide additional context, explanations, or observations related to an event, object, or any other entity in the system. They can be created and modified by users to capture important information that may not be directly represented in the structured data.

- **Extends**: [Object (object)](object.md)

## Attributes

### `comment`

- **Type**: `string_t`
- **Requirement**: required

A user provided comment.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the note was created.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the note was last modified.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The user who created or last modified the note. Typically the same user that created the note can modify the note.

### `title`

- **Type**: `string_t`
- **Requirement**: optional

A short description of the comment, if applicable.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the note, if applicable.
