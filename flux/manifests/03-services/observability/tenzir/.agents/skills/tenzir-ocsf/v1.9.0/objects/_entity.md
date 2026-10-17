# Entity (_entity)

The Entity object is an unordered collection of attributes, with a name and unique identifier. It serves as a base object that defines a set of attributes and default constraints available in all objects that extend it.

- **Extends**: [Object (object)](object.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the entity.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the entity.

### `uid_numeric`

- **Type**: `long_t`
- **Requirement**: optional

The `uid` attribute in numeric form where applicable.
Note: Producers may populate `uid_numeric` only in addition to `uid` and not as an alternative to it.
