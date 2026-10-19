# Job Action (job_action)

The action that will be performed by the job when certain conditions are met.

## Attributes

### `cmd_line`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 13

When `type_id` is `Execute (2)`, this describes the command line that is executed.

When `type_id` is `COM Handler (1)`, this may describe the DLL path stored in the COM component's `InprocServer32` key or the command line stored in the COM component's `LocalServer32` key.

### `com_class_uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

When `type_id` is `COM Handler (1)`, this describes the COM Class Identifier (CLSID).

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: optional

When known, describes the image file that is executed when `type_id` is `COM Handler` or `Execute`. Note that this attribute is intended to supplement the `com_class_uid` or `cmd_line` attributes, and is not an alternative to them.

### `properties`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: recommended

The list of properties associated with the performed action.
Can be populated with additional attributes of a program execution process, COM object attributes, fields of a message box or an email.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The job action type, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The performed action is unknown.
- `1`: `COM Handler` - The action fires a COM handler. When this type is used, `com_class_uuid` and `file` attributes may be populated.
- `2`: `Execute` - The action executes a command-line operation. When this type is used, `cmd_line` and `file` attributes may be populated.
- `3`: `E-mail` - The action sends an email.
- `4`: `Show Message` - The action shows a message box with specified message and title.
- `99`: `Other` - The performed action is not mapped. See the `type` attribute, which contains a data source specific value.

The job action type.

### `working_directory`

- **Type**: `string_t`
- **Requirement**: optional

When `type_id` is `Execute (2)`, this describes the working directory of a program that is run by the job.
