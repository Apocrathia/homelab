# KB Article (kb_article)

The KB Article object contains metadata that describes the patch or update.

- **Extends**: [Object (object)](object.md)

## Attributes

### `title`

- **Type**: `string_t`
- **Requirement**: recommended

The title of the kb article.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier for the kb article.

### `os`

- **Type**: [`os`](os.md)
- **Requirement**: recommended

The operating system the kb article applies.

### `severity`

- **Type**: `string_t`
- **Requirement**: recommended

The severity of the kb article.

### `bulletin`

- **Type**: `string_t`
- **Requirement**: optional

The kb article bulletin identifier.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The product details the kb article applies.

### `is_superseded`

- **Type**: `boolean_t`
- **Requirement**: optional

The kb article has been replaced by another.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The date the kb article was released by the vendor.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size in bytes for the kb article.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The kb article link from the source vendor.

### `classification`

- **Type**: `string_t`
- **Requirement**: optional

The vendors classification of the kb article.
