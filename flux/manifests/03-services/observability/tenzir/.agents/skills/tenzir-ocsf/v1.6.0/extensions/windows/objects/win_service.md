# Windows Service (win_service)

The Windows Service object describes a Windows service.

- **Extends**: [Service (service)](../../../objects/service.md)

## Inherited attributes

**From Service:**
- `version` (recommended)

## Attributes

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 13

The full command line used to launch the service.

### `load_order_group`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the load ordering group of which this service is a member.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The unique name of the service.

### `service_category`

- **Type**: `string_t`
- **Requirement**: optional

The service category, normalized to the caption of the service_category_id value. In the case of 'Other', it is defined by the event source.

### `service_category_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `service_category`

#### Enum values

- `0`: `Unknown` - The service category is unknown.
- `1`: `Kernel Mode` - A kernel mode driver.
- `2`: `User Mode` - A user mode service.
- `99`: `Other` - The service category is not mapped. See the `service_category` attribute, which contains an event source specific value.

The normalized identifier of the service category.

### `service_dependencies`

- **Type**: `string_t`
- **Requirement**: recommended

The names of other services upon which this service has a dependency.

### `service_error_control`

- **Type**: `string_t`
- **Requirement**: optional

The service error control, normalized to the caption of the `service_error_control_id` value. In the case of 'Other', it is defined by the event source.

### `service_error_control_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `service_error_control`

#### Enum values

- `0`: `Unknown` - The service error control is unknown.
- `1`: `Ignore` - The startup program ignores the error and continues the startup operation.
- `2`: `Normal` - The startup program logs the error in the event log but continues the startup operation.
- `3`: `Severe` - The startup program logs the error in the event log. If the last-known-good configuration is being started, the startup operation continues. Otherwise, the system is restarted with the last-known-good configuration.
- `4`: `Critical` - The startup program logs the error in the event log, if possible. If the last-known-good configuration is being started, the startup operation fails. Otherwise, the system is restarted with the last-known good configuration.
- `99`: `Other` - The service error control is not mapped. See the `service_error_control` attribute, which contains an event source specific value.

The normalized identifier of the service error control.

### `service_start_name`

- **Type**: `string_t`
- **Requirement**: recommended

For a user mode service, this attribute represents the name of the account under which the service is run. For a kernel mode driver, this attribute represents the object name used to load the driver.

### `service_start_type`

- **Type**: `string_t`
- **Requirement**: optional

The service start type, normalized to the caption of the `service_start_type_id` value. In the case of 'Other', it is defined by the event source.

### `service_start_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `service_start_type`

#### Enum values

- `0`: `Unknown` - The service start type is unknown.
- `1`: `Boot` - A kernel mode driver loaded at boot.
- `2`: `System` - A kernel mode driver loaded during system startup.
- `3`: `Auto` - A user mode service started automatically during system startup.
- `4`: `Demand` - A user mode service started on demand when a process calls `StartService`.
- `5`: `Disabled` - A driver or service that cannot be started.
- `99`: `Other` - The service start type is not mapped. See the `service_start_type` attribute, which contains an event source specific value.

The normalized identifier of the service start type.

### `service_type`

- **Type**: `string_t`
- **Requirement**: optional

The service type, normalized to the caption of the service_type_id value. In the case of 'Other', it is defined by the event source.

### `service_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `service_type`

#### Enum values

- `0`: `Unknown` - The service type is unknown.
- `1`: `Kernel Driver` - A kernel mode driver.
- `2`: `File System Driver` - A kernel mode file system minifilter.
- `3`: `Own Process` - A user mode service that runs in its own process.
- `4`: `Share Process` - A user mode service that shares a process with other services.
- `99`: `Other` - The service type is not mapped. See the `service_type` attribute, which contains an event source specific value.

The normalized identifier of the service type.
