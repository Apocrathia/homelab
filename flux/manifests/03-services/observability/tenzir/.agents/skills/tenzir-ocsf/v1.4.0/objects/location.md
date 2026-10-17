# Geo Location (location)

The Geo Location object describes a geographical location, usually associated with an IP address.

- **Extends**: [Object (object)](object.md)

## Attributes

### `aerial_height`

- **Type**: `string_t`
- **Requirement**: optional

Expressed as either height above takeoff location or height above ground level (AGL) for a UAS current location. This value is provided in meters and must have a minimum resolution of 1 m. Special Values: `Invalid`, `No Value`, or `Unknown: -1000 m`.

### `city`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the city.

### `continent`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the continent.

### `coordinates`

- **Type**: `float_t`
- **Requirement**: optional

> **Deprecated since v1.2.0.** Use specific `lat, long` attributes instead.

A two-element array, containing a longitude/latitude pair. The format conforms with [GeoJSON](https://geojson.org). For example: `[-73.983, 40.719]`.

### `country`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 14

The ISO 3166-1 Alpha-2 country code.

Note: The two letter country code should be capitalized. For example: `US` or `CA`.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the geographical location.

### `geodetic_altitude`

- **Type**: `string_t`
- **Requirement**: optional

The aircraft distance above or below the ellipsoid as measured along a line that passes through the aircraft and is normal to the surface of the WGS-84 ellipsoid. This value is provided in meters and must have a minimum resolution of 1 m. Special Values: `Invalid`, `No Value`, or `Unknown: -1000 m`.

### `geodetic_vertical_accuracy`

- **Type**: `string_t`
- **Requirement**: optional

Provides quality/containment on geodetic altitude. This is based on ADS-B Geodetic Vertical Accuracy (GVA). Measured in meters.

### `geohash`

- **Type**: `string_t`
- **Requirement**: optional

Geohash of the geo-coordinates (latitude and longitude).

[Geohashing](https://en.wikipedia.org/wiki/Geohash) is a geocoding system used to encode geographic coordinates in decimal degrees, to a single string.

### `horizontal_accuracy`

- **Type**: `string_t`
- **Requirement**: optional

Provides quality/containment on horizontal position. This is based on ADS-B NACp. Measured in meters.

### `is_on_premises`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the location is on premises.

### `isp`

- **Type**: `string_t`
- **Requirement**: optional

The name of the Internet Service Provider (ISP).

### `lat`

- **Type**: `float_t`
- **Requirement**: optional

The geographical Latitude coordinate represented in Decimal Degrees (DD). For example: `42.361145`.

### `long`

- **Type**: `float_t`
- **Requirement**: optional

The geographical Longitude coordinate represented in Decimal Degrees (DD). For example: `-71.057083`.

### `postal_code`

- **Type**: `string_t`
- **Requirement**: optional

The postal code of the location.

### `pressure_altitude`

- **Type**: `string_t`
- **Requirement**: optional

The uncorrected barometric pressure altitude (based on reference standard 29.92 inHg, 1013.25 mb) provides a reference for algorithms that utilize 'altitude deltas' between aircraft. This value is provided in meters and must have a minimum resolution of 1 m.. Special Values: `Invalid`, `No Value`, or `Unknown: -1000 m`.

### `provider`

- **Type**: `string_t`
- **Requirement**: optional

The provider of the geographical location data.

### `region`

- **Type**: `string_t`
- **Requirement**: optional

The alphanumeric code that identifies the principal subdivision (e.g. province or state) of the country. For example, 'CH-VD' for the Canton of Vaud, Switzerland
