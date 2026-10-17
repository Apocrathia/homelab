# Product (product)

The Product object describes characteristics of a software product.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `feature`

- **Type**: [`feature`](feature.md)

The feature that reported the event.

### `lang`

- **Type**: `string_t`
- **Requirement**: recommended

The two letter lower case language codes, as defined by [ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1). For example: `en` (English), `de` (German), or `fr` (French).

### `name`

- **Type**: `string_t`

The name of the product.

### `path`

- **Type**: `string_t`

The installation path of the product.

### `uid`

- **Type**: `string_t`

The unique identifier of the product.

### `url_string`

- **Type**: `url_t`

The URL pointing towards the product.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: required

The name of the vendor of the product.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The version of the product, as defined by the event source. For example: `2013.1.3-beta`.
