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

The chassis type describes the system enclosure or physical form factor. Such as the following examples for Windows [Windows Chassis Types](https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-systemenclosure)

### `cpu_bits`

- **Type**: `integer_t`
- **Requirement**: optional

The cpu architecture, the number of bits used for addressing in memory. For example: `32` or `64`.

### `cpu_count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of physical processors on a system. For example: `1`.

### `cpu_cores`

- **Type**: `integer_t`
- **Requirement**: optional

The number of processor cores in all installed processors. For Example: `42`.

### `cpu_speed`

- **Type**: `integer_t`
- **Requirement**: optional

The speed of the processor in Mhz. For Example: `4200`.

### `cpu_type`

- **Type**: `string_t`
- **Requirement**: optional

The processor type. For example: `x86 Family 6 Model 37 Stepping 5`.

### `desktop_display`

- **Type**: [`display`](display.md)
- **Requirement**: optional

The desktop display affiliated with the event

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

The device manufacturer serial number.
