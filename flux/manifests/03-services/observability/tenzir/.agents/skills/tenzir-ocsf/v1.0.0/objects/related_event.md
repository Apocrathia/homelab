# Related Event (related_event)

The Related Event object describes an event related to a finding or detection as identified by the security product.

- **Extends**: [Object (object)](object.md)

## Attributes

### `product_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the product that reported the related event.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the related event. For example: Process Activity: Launch.

### `type_uid`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type_name`

The unique identifier of the related event type. For example: 100701.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the related event.
