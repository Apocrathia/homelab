# Device (device)

The Device object represents an addressable computer system or host, which is typically connected to a computer network and participates in the transmission or processing of data within the computer network.

- **Extends**: [Endpoint (endpoint)](endpoint.md)

## Attributes

### `autoscale_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the cloud autoscale configuration.

### `boot_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time the system was booted.

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
- **Requirement**: optional

The network domain where the device resides. For example: `work.example.com`.

### `eid`

- **Type**: `string_t`
- **Requirement**: optional

An Embedded Identity Document, is a unique serial number that identifies an eSIM-enabled device.

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The initial discovery time of the device.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the device belongs. For example: `["Windows Laptops", "Engineering"]`.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The device hostname.

### `hypervisor`

- **Type**: `string_t`
- **Requirement**: optional

The name of the hypervisor running on the device. For example, `Xen`, `VMware`, `Hyper-V`, `VirtualBox`, etc.

### `image`

- **Type**: [`image`](image.md)
- **Requirement**: optional

The image used as a template to run the virtual machine.

### `iccid`

- **Type**: `string_t`
- **Requirement**: optional

The Integrated Circuit Card Identification of a mobile device. Typically it is a unique 18 to 22 digit number that identifies a SIM card.

### `imei`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `imei_list` attribute instead.

The International Mobile Equipment Identity that is associated with the device.

### `imei_list`

- **Type**: `string_t`
- **Requirement**: optional

The International Mobile Equipment Identity values that are associated with the device.

### `ip`

- **Type**: `ip_t`
- **Requirement**: optional

The device IP address, in either IPv4 or IPv6 format.

### `is_backed_up`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the device or resource has a backup enabled, such as an automated snapshot or a cloud backup. For example, this is indicated by the `cloudBackupEnabled` value within JAMF Pro mobile devices or the registration of an AWS ARN with the AWS Backup service.

### `is_compliant`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a compliant device.

### `is_managed`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a managed device.

### `is_mobile_account_active`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the device has an active mobile account. For example, this is indicated by the `itunesStoreAccountActive` value within JAMF Pro mobile devices.

### `is_personal`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a personal device.

### `is_shared`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a shared device.

### `is_supervised`

- **Type**: `boolean_t`
- **Requirement**: optional

The event occurred on a supervised device. Devices that are supervised are typically mobile devices managed by a Mobile Device Management solution and are restricted from specific behaviors such as Apple AirDrop.

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
- **Requirement**: optional

The geographical location of the device.

### `meid`

- **Type**: `string_t`
- **Requirement**: optional

The Mobile Equipment Identifier. It's a unique number that identifies a Code Division Multiple Access (CDMA) mobile device.

### `model`

- **Type**: `string_t`
- **Requirement**: optional

The model of the device. For example `ThinkPad X1 Carbon`.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the device was last known to have been modified.

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The alternate device name, ordinarily as assigned by an administrator.

Note: The Name could be any other string that helps to identify the device, such as a phone number; for example `310-555-1234`.

### `network_interfaces`

- **Type**: [`network_interface`](network_interface.md)
- **Requirement**: optional

The physical or virtual network interfaces that are associated with the device, one for each unique MAC address/IP address/hostname/name combination.

Note: The first element of the array is the network information that pertains to the event.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

Organization and org unit related to the device.

### `os_machine_uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

The operating system assigned Machine ID. In Windows, this is the value stored at the registry path: `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography\MachineGuid`. In Linux, this is stored in the file: `/etc/machine-id`.

### `region`

- **Type**: `string_t`
- **Requirement**: recommended

The region where the virtual machine is located. For example, an AWS Region.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional

The risk level, normalized to the caption of the risk_level_id value.

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
- `99`: `Other` - The risk level is not mapped. See the `risk_level` attribute, which contains a data source specific value.

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
- **Requirement**: recommended

The device type. For example: `unknown`, `server`, `desktop`, `laptop`, `tablet`, `mobile`, `virtual`, `browser`, or `other`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The type is unknown.
- `99`: `Other` - The type is not mapped. See the `type` attribute, which contains a data source specific value.

The device type ID.

### `udid`

- **Type**: `string_t`
- **Requirement**: optional

The Apple assigned Unique Device Identifier (UDID). For iOS, iPadOS, tvOS, watchOS and visionOS devices, this is the UDID. For macOS devices, it is the Provisioning UDID. For example: `00008020-008D4548007B4F26`

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the device. For example the Windows TargetSID or AWS EC2 ARN.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

An alternate unique identifier of the device if any. For example the ActiveDirectory DN.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: recommended

The vendor for the device. For example `Dell` or `Lenovo`.

### `boot_uid`

- **Type**: `string_t`
- **Requirement**: optional

A unique identifier of the device that changes after every reboot. For example, the value of `/proc/sys/kernel/random/boot_id` from Linux's procfs.
