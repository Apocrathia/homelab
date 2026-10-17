# Operating System (OS) (os)

The Operating System (OS) object describes characteristics of an OS, such as Linux or Windows.

- **Extends**: [Object (object)](object.md)

## Attributes

### `build`

- **Type**: `string_t`
- **Requirement**: optional

The operating system build number.

### `country`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 14

The operating system country code, as defined by the ISO 3166-1 standard (Alpha-2 code).

Note: The two letter country code should be capitalized. For example: `US` or `CA`.

### `cpe_name`

- **Type**: `string_t`
- **Requirement**: optional

The Common Platform Enumeration (CPE) name as described by ([NIST](https://nvd.nist.gov/products/cpe)) For example: `cpe:/a:apple:safari:16.2`.

### `cpu_bits`

- **Type**: `integer_t`
- **Requirement**: optional

The cpu architecture, the number of bits used for addressing in memory. For example: `32` or `64`.

### `edition`

- **Type**: `string_t`
- **Requirement**: optional

The operating system edition. For example: `Professional`.

### `kernel_release`

- **Type**: `string_t`
- **Requirement**: optional

The kernel release of the operating system. On Unix-based systems, this is determined from the `uname -r` command output, for example "5.15.0-122-generic".

### `lang`

- **Type**: `string_t`
- **Requirement**: optional

The two letter lower case language codes, as defined by [ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1). For example: `en` (English), `de` (German), or `fr` (French).

### `name`

- **Type**: `string_t`
- **Requirement**: required

The operating system name.

### `sp_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the latest Service Pack.

### `sp_ver`

- **Type**: `integer_t`
- **Requirement**: optional

The version number of the latest Service Pack.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the operating system.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `100`: `Windows`
- `101`: `Windows Mobile`
- `200`: `Linux`
- `201`: `Android`
- `300`: `macOS`
- `301`: `iOS`
- `302`: `iPadOS`
- `400`: `Solaris`
- `401`: `AIX`
- `402`: `HP-UX`

The type identifier of the operating system.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the OS running on the device that originated the event. For example: "Windows 10", "OS X 10.7", or "iOS 9".
