# GPU Information (gpu_info)

The GPU information object contains attributes describing graphical processing hardware.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bus_type`

- **Type**: `string_t`
- **Requirement**: optional

The attachment bus or interface standard, normalized to the caption of the bus_type_id value. In the case of 'Other', it is defined by the event source.

### `bus_type_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `bus_type`

#### Enum values

- `0`: `Unknown`
- `1`: `Onboard`
- `2`: `PCIe x16`
- `3`: `PCIe x8`
- `4`: `MXM Type A`
- `5`: `MXM Type B`
- `6`: `M.2`
- `7`: `CXL`
- `99`: `Other`

The normalized identifier of the attachment bus or interface standard.

### `cores`

- **Type**: `integer_t`
- **Requirement**: optional

The number of processing cores or compute units for the component.

### `model`

- **Type**: `string_t`
- **Requirement**: recommended

The model name of the GPU. For example: `GeForce RTX A6000`, `Radeon PRO W7900`, or `Intel Data Center GPU Max 1550`.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the vendor of the GPU. For example: `NVIDIA`, `AMD`, or `Intel`.

### `vram_mode`

- **Type**: `string_t`
- **Requirement**: recommended

The video memory attachment mode, indicating how the VRAM hardware is integrated with the system (e.g., shared or dedicated), normalized to the caption of the vram_mode_id value. For 'Other', the exact attachment mode is defined by the event source.

### `vram_mode_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `vram_mode`

#### Enum values

- `0`: `Unknown`
- `1`: `Shared`
- `2`: `Dedicated`
- `99`: `Other`

The normalized identifier of the video memory attachment mode.

### `vram_size`

- **Type**: `integer_t`
- **Requirement**: recommended

The total amount of installed video RAM.
