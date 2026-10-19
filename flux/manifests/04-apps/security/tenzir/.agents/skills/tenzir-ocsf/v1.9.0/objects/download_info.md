# Download Info (download_info)

The Download Info object contains metadata pertaining to a downloaded file.

- **Extends**: [Object (object)](object.md)

## Attributes

### `referrer`

- **Type**: `string_t`
- **Requirement**: optional

The URL that referred to `src_url`. This is typically the URL of a web page containing a download link.

### `src_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: optional

Information about the network endpoint from which the file was downloaded.

### `src_url`

- **Type**: `url_t`
- **Requirement**: recommended

The URL from which the file was downloaded.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The download type, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The file's download type is unknown.
- `1`: `Local Machine` - The file was downloaded from a server running on device.
- `2`: `Intranet` - The file was downloaded from an intranet server.
- `3`: `Trusted` - The file was downloaded from a trusted server.
- `4`: `Internet` - The file was downloaded from an internet server.
- `5`: `Untrusted` - The file was downloaded from an untrusted server.
- `99`: `Other` - The file's download type is not mapped. See the `type` attribute, which contains an event source specific value.

The download type ID. The values correspond to the five permitted values of the `ZoneId` property in the Mark of the Web metadata of a downloaded file on Windows. Note however that each numeric value is 1 greater than its `ZoneId` equivalent.
