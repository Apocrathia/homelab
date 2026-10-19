# Startup Item (startup_item)

The startup item object describes an application component that has associated startup criteria and configurations.

## Attributes

### `driver`

- **Type**: [`kernel_driver`](kernel_driver.md)
- **Requirement**: optional

The startup item kernel driver resource.

### `job`

- **Type**: [`job`](job.md)
- **Requirement**: optional

The startup item job resource.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The unique name of the startup item.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: optional

The startup item process resource.

### `run_mode_ids`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `run_modes`

#### Enum values

- `1`: `Interactive` - The startup item interacts with the desktop.
- `2`: `Own Process` - The startup item runs in its own process.
- `3`: `Shared Process` - The startup item runs in a shared process.

The list of normalized identifiers that describe the startup items' properties when it is running.  Use this field to capture extended information about the process, which may depend on the type of startup item.  E.g., A Windows service that interacts with the desktop.

### `run_modes`

- **Type**: `string_t`
- **Requirement**: optional

The list of run_modes, normalized to the captions of the run_mode_id values.  In the case of 'Other', they are defined by the event source.

### `run_state`

- **Type**: `string_t`
- **Requirement**: optional

The run state of the startup item.

### `run_state_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `run_state`

#### Enum values

- `1`: `Stopped` - The service is not running.
- `2`: `Start Pending` - The service is starting.
- `3`: `Stop Pending` - The service is stopping.
- `4`: `Running` - The service is running.
- `5`: `Continue Pending` - The service is pending continue.
- `6`: `Pause Pending` - The service is pending pause.
- `7`: `Paused` - The service is paused.
- `8`: `Restart Pending` - The service is pending restart.

The run state ID of the startup item.

### `start_type`

- **Type**: `string_t`
- **Requirement**: optional

The start type of the startup item.

### `start_type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `start_type`

#### Enum values

- `0`: `Unknown` - The start type is unknown.
- `1`: `Auto` - Service started automatically during system startup.
- `2`: `Boot` - Device driver started by the system loader.
- `3`: `On Demand` - Started on demand. For example, by the Windows Service Control Manager when a process calls the StartService function.
- `4`: `Disabled` - The service is disabled, and cannot be started.
- `5`: `All Logins` - Started on all user logins.
- `6`: `Specific User Login` - Started on specific user logins.
- `7`: `Scheduled` - Stared according to a schedule.
- `8`: `System Changed` - Started when a system item, such as a file or registry key, changes.
- `99`: `Other` - The start type is not mapped. See the `start_type` attribute, which contains a data source specific value.

The start type ID of the startup item.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The startup item type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The type is unknown.
- `1`: `Kernel Mode Driver` - Kernel mode driver.
- `2`: `User Mode Driver` - User mode driver.
- `3`: `Service` - A background process typically managed by the operating system, e.g., a service process on Windows or a systemd-managed daemon on Linux.
- `4`: `User Mode Application` - An application that runs in the user space.
- `5`: `Autoload` - The macOS Autoload Application.
- `6`: `System Extension` - System extensions on macOS enables 3rd parties to extend the capabilities of macOS.
- `7`: `Kernel Extension` - Kernel extensions on macOS includes Apple provided pre-installs and 3rd party installs which enables support for specific hardware or software features not natively supported by macOS.
- `8`: `Scheduled Job, Task` - A job or task that runs on a configured schedule.
- `99`: `Other` - The startup item type is not mapped. See the `type` attribute, which contains data source specific values.

The startup item type identifier.
