# Device (device)

The Device object represents an addressable computer system or host, which is typically connected to a computer network and participates in the transmission or processing of data within the computer network. Defined by D3FEND [d3f:Host](https://d3fend.mitre.org/dao/artifact/d3f:Host/).

- **Extends**: [Endpoint (endpoint)](endpoint.md)

## Attributes

### `autoscale_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the cloud autoscale configuration.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the device was known to have been created.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the device, ordinarily as reported by the operating system.

### `domain`

- **Type**: `string_t`

The network domain where the device resides. For example: `work.example.com`.

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The initial discovery time of the device.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the device belongs. For example: `["Windows Laptops", "Engineering"].`

### `hostname`

- **Type**: `hostname_t`

The device hostname.

### `hw_info`

- **Type**: [`device_hw_info`](device_hw_info.md)
- **Requirement**: optional

The device hardware information.

### `hypervisor`

- **Type**: `string_t`
- **Requirement**: optional

The name of the hypervisor running on the device. For example, `Xen`, `VMware`, `Hyper-V`, `VirtualBox`, etc.

### `image`

- **Type**: [`image`](image.md)
- **Requirement**: optional

The image used as a template to run the virtual machine.

### `imei`

- **Type**: `string_t`
- **Requirement**: optional

The International Mobile Station Equipment Identifier that is associated with the device.

### `ip`

- **Type**: `ip_t`

The device IP address, in either IPv4 or IPv6 format.

### `is_compliant`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a compliant device.

### `is_managed`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a managed device.

### `is_personal`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a personal device.

### `is_trusted`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a trusted device.

### `last_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent discovery time of the device.

### `location`

- **Type**: [`location`](location.md)

The geographical location of the device.

### `mac`

- **Type**: `mac_t`

The device Media Access Control (MAC) address.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the device was last known to have been modified.

### `name`

- **Type**: `string_t`

The alternate device name, ordinarily as assigned by an administrator.

Note: The Name could be any other string that helps to identify the device, such as a phone number; for example `310-555-1234`.

### `network_interfaces`

- **Type**: [`network_interface`](network_interface.md)
- **Requirement**: optional

The network interfaces that are associated with the device, one for each unique MAC address/IP address/hostname/name combination.

Note: The first element of the array is the network information that pertains to the event.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

Organization and org unit related to the device.

### `os`

- **Type**: [`os`](os.md)
- **Requirement**: optional

The device operating system.

### `region`

- **Type**: `string_t`
- **Requirement**: recommended

The region where the virtual machine is located. For example, an AWS Region.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional

The risk level, normalized to the caption of the risk_level_id value. In the case of 'Other', it is defined by the event source.

### `risk_level_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `risk_level`

#### Enum values

- `0`: `Info`
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `4`: `Critical`

The normalized risk level id.

### `risk_score`

- **Type**: `integer_t`
- **Requirement**: optional

The risk score as reported by the event source.

### `subnet`

- **Type**: `subnet_t`
- **Requirement**: optional

The subnet mask.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The device type. For example: `unknown`, `server`, `desktop`, `laptop`, `tablet`, `mobile`, `virtual`, `browser`, or `other`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `1`: `Server`
- `2`: `Desktop`
- `3`: `Laptop`
- `4`: `Tablet`
- `5`: `Mobile`
- `6`: `Virtual`
- `7`: `IOT`
- `8`: `Browser`

The device type ID.

### `uid`

- **Type**: `string_t`

The unique identifier of the device. For example the Windows TargetSID or AWS EC2 ARN.

### `uid_alt`

- **Type**: `string_t`

An alternate unique identifier of the device if any. For example the ActiveDirectory DN.
