# Windows Resource (win_resource)

The Windows resource object describes a resource object managed by Windows, such as mutant or timer.

- **Extends**: [Resource (_resource)](../../../objects/_resource.md)

## Attributes

### `details`

- **Type**: `string_t`
- **Requirement**: optional

The string detailing the attributes of the resource object.

### `name`

- **Type**: `string_t`

The name of the resource object.

### `svc_name`

- **Type**: `string_t`
- **Requirement**: optional

The Windows service acting as the object server for the resource object, such as Security or Security Account Manager.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the Windows resource object.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The resource object type is unknown.
- `1`: `Directory`
- `2`: `Event`
- `3`: `Timer`
- `4`: `Device`
- `5`: `Mutant`
- `6`: `Type`
- `7`: `File`
- `8`: `Token`
- `9`: `Thread`
- `10`: `Section`
- `11`: `WindowStation`
- `12`: `DebugObject`
- `13`: `FilterCommunicationPort`
- `14`: `EventPair`
- `15`: `Driver`
- `16`: `IoCompletion`
- `17`: `Controller`
- `18`: `SymbolicLink`
- `19`: `WmiGuid`
- `20`: `Process`
- `21`: `Profile`
- `22`: `Desktop`
- `23`: `KeyedEvent`
- `24`: `Adapter`
- `25`: `Key`
- `26`: `WaitablePort`
- `27`: `Callback`
- `28`: `Semaphore`
- `29`: `Job`
- `30`: `Port`
- `31`: `FilterConnectionPort`
- `32`: `ALPC Port`
- `33`: `SAM_ALIAS`
- `34`: `SAM_GROUP`
- `35`: `SAM_USER`
- `36`: `SAM_DOMAIN`
- `37`: `SAM_SERVER`
- `99`: `Other` - The resource object type is not mapped. See the `type` attribute, which may contain a data source specific value.

The normalized type identifier of the Windows resource object accessed.

### `uid`

- **Type**: `string_t`

The Windows provided handle identifier for the resource object
