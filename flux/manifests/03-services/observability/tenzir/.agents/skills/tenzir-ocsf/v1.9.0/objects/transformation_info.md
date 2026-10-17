# Transformation Info (transformation_info)

The transformation_info object represents the mapping or transformation used.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `lang`

- **Type**: `string_t`
- **Requirement**: optional

The transformation language used to transform the data.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the transformation or mapping.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The product or instance used to make the transformation

### `time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

Time of the transformation.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the mapping or transformation.

### `url_string`

- **Type**: `url_t`
- **Requirement**: recommended

The Uniform Resource Locator String where the mapping or transformation exists.
