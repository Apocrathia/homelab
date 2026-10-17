# File (file)

The File object represents the metadata associated with a file stored in a computer system. It encompasses information about the file itself, including its attributes, properties, and organizational details.

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

- `0`: `Unknown` - The confidentiality is unknown.
- `1`: `Not Confidential`
- `2`: `Confidential`
- `3`: `Secret`
- `4`: `Top Secret`
- `5`: `Private`
- `6`: `Restricted`
- `99`: `Other` - The confidentiality is not mapped. See the `confidentiality` attribute, which contains a data source specific value.

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

### `drive_type`

- **Type**: `string_t`
- **Requirement**: optional

The drive type, normalized to the caption of the `drive_type_id` value. In the case of `Other`, it is defined by the source.

### `drive_type_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `drive_type`

#### Enum values

- `0`: `Unknown` - The drive type is unknown.
- `1`: `Removable` - The drive has removable media; for example, a floppy drive, thumb drive, or flash card reader.
- `2`: `Fixed` - The drive has fixed media; for example, a hard disk drive or flash drive.
- `3`: `Remote` - The drive is a remote (network) drive.
- `4`: `CD-ROM` - The drive is a CD-ROM drive.
- `5`: `RAM Disk` - The drive is a RAM disk.
- `99`: `Other` - The drive type is not mapped. See the `drive_type` attribute, which contains a data source specific value.

Identifies the type of a disk drive, i.e. fixed, removable, etc.

### `encryption_details`

- **Type**: [`encryption_details`](encryption_details.md)
- **Requirement**: optional

The encryption details of the file. Should be populated if the file is encrypted.

### `ext`

- **Type**: `string_t`
- **Requirement**: recommended

The extension of the file, excluding the leading dot. For example: `exe` from `svchost.exe`, or `gz` from `export.tar.gz`.

### `hashes`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

An array of hash attributes.

### `internal_name`

- **Type**: `string_t`
- **Requirement**: optional

The name of the file as identified within the file itself. This contrasts with the name by which the file is known on disk. Where available, the internal name is widely used by security practitioners and detection content because the on-disk file name is not reliable. On the Windows OS, most PE files contain a [VERSIONINFO](https://learn.microsoft.com/en-us/windows/win32/menurc/versioninfo-resource) resource from which the internal name can be obtained. On macOS, binaries can optionally embed a copy of the application's Info.plist file which in turn contains the name of the executable.

### `is_deleted`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the file was deleted from the filesystem.

### `is_encrypted`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the file is encrypted.

### `is_public`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the file is publicly accessible. For example in an object's public access in AWS S3

### `is_readonly`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates that the file cannot be modified.

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

- **Type**: `file_path_t`
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

### `storage_class`

- **Type**: `string_t`
- **Requirement**: optional

The storage class of the file. For example in AWS S3: `STANDARD, STANDARD_IA, GLACIER`.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the file.

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
- `8`: `Executable File`
- `99`: `Other`

The file type ID. Note the distinction between a `Regular File` and an `Executable File`. If the distinction is not known, or not indicated by the log, use `Regular File`. In this case, it should not be assumed that a Regular File is not executable.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the file as defined by the storage system, such the file system file ID.

### `uri`

- **Type**: `url_t`
- **Requirement**: optional

The file URI, such as those reporting by static analysis tools. E.g., `file:///C:/dev/sarif/sarif-tutorials/samples/Introduction/simple-example.js`

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: optional

The URL of the file, when applicable.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The file version. For example: `8.0.7601.17514`.

### `volume`

- **Type**: `string_t`
- **Requirement**: optional

The volume on the storage device where the file is located.

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
