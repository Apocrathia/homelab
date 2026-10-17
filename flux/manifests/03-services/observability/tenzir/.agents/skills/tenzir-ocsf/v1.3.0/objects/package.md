# Software Package (package)

The Software Package object describes details about a software package. Defined by D3FEND [d3f:SoftwarePackage](https://d3fend.mitre.org/dao/artifact/d3f:SoftwarePackage/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `architecture`

- **Type**: `string_t`
- **Requirement**: recommended

Architecture is a shorthand name describing the type of computer hardware the packaged software is meant to run on.

### `cpe_name`

- **Type**: `string_t`
- **Requirement**: optional

The Common Platform Enumeration (CPE) name as described by ([NIST](https://nvd.nist.gov/products/cpe)) For example: `cpe:/a:apple:safari:16.2`.

### `epoch`

- **Type**: `integer_t`
- **Requirement**: optional

The software package epoch. Epoch is a way to define weighted dependencies based on version numbers.

### `hash`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

Cryptographic hash to identify the binary instance of a software component. This can include any component such file, package, or library.

### `license`

- **Type**: `string_t`
- **Requirement**: optional

The software license applied to this package.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The software package name.

### `purl`

- **Type**: `string_t`
- **Requirement**: optional

A purl is a URL string used to identify and locate a software package in a mostly universal and uniform way across programming languages, package managers, packaging conventions, tools, APIs and databases.

### `release`

- **Type**: `string_t`
- **Requirement**: optional

Release is the number of times a version of the software has been packaged.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the vendor who published the software package.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of software package, normalized to the caption of the type_id value. In the case of 'Other', it is defined by the source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Application` - An application software package.
- `2`: `Operating System` - An operating system software package.

The type of software package.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The software package version.
