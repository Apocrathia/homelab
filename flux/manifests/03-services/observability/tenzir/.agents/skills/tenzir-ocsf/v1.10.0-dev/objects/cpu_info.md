# CPU Information (cpu_info)

The CPU information object contains attributes describing a physical CPU package installed in the device.

- **Extends**: [Object (object)](object.md)

## Attributes

### `cores`

- **Type**: `integer_t`
- **Requirement**: optional

The number of processing cores or compute units for the component.

### `cpu_architecture`

- **Type**: `string_t`
- **Requirement**: optional

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

The normalized identifier of the CPU architecture.

### `cpu_bits`

- **Type**: `integer_t`
- **Requirement**: optional

The number of bits used by the CPU for memory addressing.

### `model`

- **Type**: `string_t`
- **Requirement**: recommended

The model name of the CPU. For example: `Intel Xeon Gold 6348`, `AMD EPYC 7763`, or `Apple M3 Max`.

### `speed_mhz`

- **Type**: `integer_t`
- **Requirement**: optional

The nominal clock speed of the unit, expressed in megahertz.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the vendor of the CPU. For example: `Intel`, `AMD`, or `Apple`.
