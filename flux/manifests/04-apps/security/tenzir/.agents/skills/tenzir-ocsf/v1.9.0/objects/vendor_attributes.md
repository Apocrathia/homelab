# Vendor Attributes (vendor_attributes)

The Vendor Attributes object can be used to represent values of attributes populated by the Vendor/Finding Provider. It can help distinguish between the vendor-provided values and consumer-updated values, of key attributes like `severity_id`.
The original finding producer should not populate this object. It should be populated by consuming systems that support data mutability.

- **Extends**: [Object (object)](object.md)

## Attributes

### `severity`

- **Type**: `string_t`
- **Requirement**: optional

The finding severity, as reported by the Vendor (Finding Provider). The value should be normalized to the caption of the `severity_id` value. In the case of 'Other', it is defined by the source.

### `severity_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `severity`

#### Enum values

- `0`: `Unknown` - The event/finding severity is unknown.
- `1`: `Informational` - Informational message. No action required.
- `2`: `Low` - The user decides if action is needed.
- `3`: `Medium` - Action is required but the situation is not serious at this time.
- `4`: `High` - Action is required immediately.
- `5`: `Critical` - Action is required immediately and the scope is broad.
- `6`: `Fatal` - An error occurred but it is too late to take remedial action.
- `99`: `Other` - The event/finding severity is not mapped. See the `severity` attribute, which contains a data source specific value.

The finding severity ID, as reported by the Vendor (Finding Provider).
