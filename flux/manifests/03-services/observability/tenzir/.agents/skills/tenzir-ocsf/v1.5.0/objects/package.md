# Software Package (package)

The Software Package object describes details about a software package.

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

### `license_url`

- **Type**: `url_t`
- **Requirement**: optional

The URL pointing to the license applied on package or software. This is typically a `LICENSE.md` file within a repository.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The software package name.

### `package_manager`

- **Type**: `string_t`
- **Requirement**: optional

The software packager manager utilized to manage a package on a system, e.g. npm, yum, dpkg etc.

### `package_manager_url`

- **Type**: `url_t`
- **Requirement**: optional

The URL of the package or library at the package manager, or the specific URL or URI of an internal package manager link such as `AWS CodeArtifact` or `Artifactory`.

### `purl`

- **Type**: `string_t`
- **Requirement**: optional

A purl is a URL string used to identify and locate a software package in a mostly universal and uniform way across programming languages, package managers, packaging conventions, tools, APIs and databases.

### `release`

- **Type**: `string_t`
- **Requirement**: optional

Release is the number of times a version of the software has been packaged.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The link to the specific library or package such as within `GitHub`, this is different from the link to the package manager where the library or package is hosted.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of software package, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Application` - An application software package.
- `2`: `Operating System` - An operating system software package.

The type of software package.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

A unique identifier for the package or library reported by the source tool. E.g., the `libId` within the `sbom` field of an OX Security Issue or the SPDX `components.*.bom-ref`.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the vendor who published the software package.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The software package version.
