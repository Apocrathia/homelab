# Device Hardware Info (device_hw_info)

The Device Hardware Information object contains details and specifications of the physical components that make up a device. This information provides an overview of the hardware capabilities, configuration, and characteristics of the device.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bios_date`

- **Type**: `string_t`
- **Requirement**: optional

The BIOS date. For example: `03/31/16`.

### `bios_manufacturer`

- **Type**: `string_t`
- **Requirement**: optional

The BIOS manufacturer. For example: `LENOVO`.

### `bios_ver`

- **Type**: `string_t`
- **Requirement**: optional

The BIOS version. For example: `LENOVO G5ETA2WW (2.62)`.

### `chassis`

- **Type**: `string_t`
- **Requirement**: optional

The chassis type describes the system enclosure or physical form factor. For example, as described for a Windows chassis type.

### `cores`

- **Type**: `integer_t`
- **Requirement**: optional

The total number of processor cores across all installed CPUs on the system. For per-CPU core detail, use `cpu_info_list`.

### `cpu_architecture`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].cpu_architecture` instead.

The CPU architecture, normalized to the caption of the `cpu_architecture_id` value. In the case of `Other`, it is defined by the source.

### `cpu_architecture_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `cpu_architecture`

#### Enum values

- `0`: `Unknown` - The CPU architecture is unknown.
- `1`: `x86` - CPU uses the x86 ISA. For bitness, refer to `cpu_bits`.
- `2`: `ARM` - CPU uses the ARM ISA. For bitness, refer to `cpu_bits`.
- `3`: `RISC-V` - CPU uses the RISC-V ISA. For bitness, refer to `cpu_bits`.
- `99`: `Other` - The CPU architecture is not mapped. See the `cpu_architecture` attribute, which contains a data source specific value.

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].cpu_architecture_id` instead.

The normalized identifier of the CPU architecture.

### `cpu_bits`

- **Type**: `integer_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].cpu_bits` instead.

The cpu architecture, the number of bits used for addressing in memory. For example: `32` or `64`.

### `cpu_cores`

- **Type**: `integer_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].cores` instead.

The number of processor cores in all installed processors. For Example: `42`.

### `cpu_count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of physical processors on a system. For per-CPU detail, use `cpu_info_list`.

### `cpu_info_list`

- **Type**: [`cpu_info`](cpu_info.md)
- **Requirement**: optional

A list of `cpu_info` objects, each describing a physical CPU package installed in the device. Use with `cpu_count`.

### `cpu_speed`

- **Type**: `integer_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].speed_mhz` instead.

The speed of the processor in Mhz. For Example: `4200`.

### `cpu_type`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `cpu_info_list[*].model` and `cpu_info_list[*].vendor_name` instead.

The processor type. For example: `x86 Family 6 Model 37 Stepping 5`.

### `desktop_display`

- **Type**: [`display`](display.md)
- **Requirement**: optional

The desktop display affiliated with the event

### `gpu_count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of graphics processors on a system. For per-GPU detail, use `gpu_info_list`.

### `gpu_info_list`

- **Type**: [`gpu_info`](gpu_info.md)
- **Requirement**: optional

A list of GPU objects describing the hardware properties of each graphics processor installed on the device. Use with `gpu_count`.

### `keyboard_info`

- **Type**: [`keyboard_info`](keyboard_info.md)
- **Requirement**: optional

The keyboard detailed information.

### `ram_size`

- **Type**: `integer_t`
- **Requirement**: optional

The total amount of installed RAM, in Megabytes. For example: `2048`.

### `serial_number`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 37

The device manufacturer serial number.

### `uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

The device manufacturer assigned universally unique hardware identifier. For SMBIOS compatible devices such as those running Linux and Windows, it is the UUID member of the System Information structure in the SMBIOS information. For macOS devices, it is the Hardware UUID (also known as IOPlatformUUID in the I/O Registry).

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

The device manufacturer.
