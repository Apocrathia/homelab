# Aircraft (aircraft)

The Aircraft object represents any aircraft or otherwise airborne asset such as an unmanned system, airplane, balloon, spacecraft, or otherwise. The Aircraft object is intended to normalized data captured or otherwise logged from active radar, passive radar, multi-spectral systems, or the Automatic Dependant Broadcast - Surveillance (ADS-B), and/or Mode S systems.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `location`

- **Type**: [`location`](location.md)
- **Requirement**: recommended

The detailed geographical location usually associated with an IP address.

### `model`

- **Type**: `string_t`
- **Requirement**: optional

The model name of the aircraft or unmanned system.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the aircraft, such as the such as the flight name or callsign.

### `serial_number`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 37

The serial number of the aircraft.

### `speed`

- **Type**: `string_t`
- **Requirement**: optional

Ground speed of flight. This value is provided in meters per second with a minimum resolution of 0.25 m/s. Special Values: `Invalid`, `No Value`, or `Unknown: 255 m/s`.

### `speed_accuracy`

- **Type**: `string_t`
- **Requirement**: optional

Provides quality/containment on horizontal ground speed. Measured in meters/second.

### `track_direction`

- **Type**: `string_t`
- **Requirement**: optional

Direction of flight expressed as a “True North-based” ground track angle. This value is provided in clockwise degrees with a minimum resolution of 1 degree. If aircraft is not moving horizontally, use the “Unknown” value

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The primary identification identifier for an aircraft, such as the 24-bit International Civil Aviation Organization (ICAO) identifier of the aircraft, as 6 hex digits.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

A secondary identification identifier for an aircraft, such as the 4-digit squawk (octal representation).

### `vertical_speed`

- **Type**: `string_t`
- **Requirement**: optional

Vertical speed upward relative to the WGS-84 datum, measured in meters per second. Special Values: `Invalid`, `No Value`, or `Unknown: 63 m/s`.
