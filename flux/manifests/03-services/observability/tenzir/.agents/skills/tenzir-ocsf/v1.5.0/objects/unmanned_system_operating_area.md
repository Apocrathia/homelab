# Unmanned System Operating Area (unmanned_system_operating_area)

The Unmanned System Operating Area object describes details about a precise area of operations for a UAS flight or mission.

- **Extends**: [Geo Location (location)](location.md)

## Attributes

### `altitude_ceiling`

- **Type**: `string_t`
- **Requirement**: optional

Maximum altitude (WGS-84 HAE) for a group or an Intent-Based Network Participant. Measured in meters. Special Values: `Invalid`, `No Value`, or `Unknown: -1000 m`.

### `altitude_floor`

- **Type**: `string_t`
- **Requirement**: optional

Minimum altitude (WGS-84 HAE) for a group or an Intent-Based Network Participant. Measured in meters. Special Values: `Invalid`, `No Value`, or `Unknown: -1000 m`.

### `count`

- **Type**: `integer_t`
- **Requirement**: recommended

Indicates the number of UAS in the operating area.

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The date and time at which a group or an Intent-Based Network Participant operation ends. (This field is only applicable to Network Remote ID.)

### `locations`

- **Type**: [`location`](location.md)
- **Requirement**: recommended

A list of Position Location Information (PLI) (latitude/longitude pairs) defining the area where a group or Intent-Based Network Participant operation is taking place. (This field is only applicable to Network Remote ID.)

### `radius`

- **Type**: `string_t`
- **Requirement**: optional

Farthest horizontal distance from the reported location at which any UA in a group may be located (meters). Also allows defining the area where an Intent-Based Network Participant operation is taking place. Default: 0 m.

### `start_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The date and time at which a group or an Intent-Based Network Participant operation starts. (This field is only applicable to Network Remote ID.)

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of operating area. For example, `Takeoff Location`, `Fixed Location`, `Dynamic Location`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown/Undeclared` - The UA type is empty or not declared.
- `1`: `Takeoff Location`
- `2`: `Fixed Location`
- `3`: `Dynamic Location`
- `99`: `Other`

The operating area type identifier.
