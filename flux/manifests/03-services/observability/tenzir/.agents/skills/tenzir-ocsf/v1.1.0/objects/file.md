# File (file)

The File object represents the metadata associated with a file stored in a computer system. It encompasses information about the file itself, including its attributes, properties, and organizational details. Defined by D3FEND [d3f:File](https://next.d3fend.mitre.org/dao/artifact/d3f:File/).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `accessed_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the file was last accessed.

### `accessor`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The name of the user who last accessed the object.

### `attributes`

- **Type**: `integer_t`
- **Requirement**: optional

The bitmask value that represents the file attributes.

### `company_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the company that published the file. For example: `Microsoft Corporation`.

### `confidentiality`

- **Type**: `string_t`
- **Requirement**: optional

The file content confidentiality, normalized to the confidentiality_id value. In the case of 'Other', it is defined by the event source.

### `confidentiality_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `confidentiality`

#### Enum values

- `99`: `Other` - The confidentiality is not mapped. See the `confidentiality` attribute, which contains a data source specific value.
- `0`: `Unknown` - The confidentiality is unknown.
- `1`: `Not Confidential`
- `2`: `Confidential`
- `3`: `Secret`
- `4`: `Top Secret`

The normalized identifier of the file content confidentiality indicator.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the file was created.

### `creator`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that created the file.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the file, as returned by file system. For example: the description as returned by the Unix file command or the Windows file type.

### `hashes`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

An array of hash attributes.

### `is_system`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the object is part of the operating system.

### `mime_type`

- **Type**: `string_t`
- **Requirement**: optional

The Multipurpose Internet Mail Extensions (MIME) type of the file, if applicable.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the file was last modified.

### `modifier`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that last modified the file.

### `name`

- **Type**: `file_name_t`
- **Requirement**: required

The name of the file. For example: `svchost.exe`

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: optional

The user that owns the file/object.

### `parent_folder`

- **Type**: `string_t`
- **Requirement**: optional

The parent folder in which the file resides. For example: `c:\windows\system32`

### `path`

- **Type**: `string_t`
- **Requirement**: recommended

The full path to the file. For example: `c:\windows\system32\svchost.exe`.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The product that created or installed the file.

### `security_descriptor`

- **Type**: `string_t`
- **Requirement**: optional

The object security descriptor.

### `signature`

- **Type**: [`digital_signature`](digital_signature.md)
- **Requirement**: optional

The digital signature of the file.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of data, in bytes.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The file type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Regular File`
- `2`: `Folder`
- `3`: `Character Device`
- `4`: `Block Device`
- `5`: `Local Socket`
- `6`: `Named Pipe`
- `7`: `Symbolic Link`
- `99`: `Other`

The file type ID.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the file as defined by the storage system, such the file system file ID.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The file version. For example: `8.0.7601.17514`.

### `xattributes`

- **Type**: [`object`](object.md)
- **Requirement**: optional

An unordered collection of zero or more name/value pairs where each pair represents a file or folder extended attribute.For example: Windows alternate data stream attributes (ADS stream name, ADS size, etc.), user-defined or application-defined attributes, ACL, owner, primary group, etc. Examples from DCS:

- ads_name
- ads_size
- dacl
- owner
- primary_group
- link_name - name of the link associated to the file.
- hard_link_count - the number of links that are associated to the file.
