# Script (script)

The Script object describes a script or command that can be executed by a shell, script engine, or interpreter. Examples include Bash, JavsScript, PowerShell, Python, VBScript, etc. Note that the term script here denotes not only a script contained within a file but also a script or command typed interactively by a user, supplied on the command line, or provided by some other file-less mechanism.

- **Extends**: [Object (object)](object.md)

## Attributes

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: optional

Present if this script is associated with a file. Not present in the case of a file-less script.

### `hashes`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

An array of the script's cryptographic hashes. Note that these hashes are calculated on the script in its original encoding, and not on the normalized UTF-8 encoding found in the `script_content` attribute.

### `name`

- **Type**: `string_t`
- **Requirement**: optional

Unique identifier for the script or macro, independent of the containing file, used for tracking, auditing, and security analysis.

### `parent_uid`

- **Type**: `string_t`
- **Requirement**: optional

This attribute relates a sub-script to a parent script having the matching `uid` attribute. In the case of PowerShell, sub-script execution can be identified by matching the activity correlation ID of the raw ETW events provided by the OS.

### `script_content`

- **Type**: [`long_string`](long_string.md)
- **Requirement**: required
- **Observable**: 36

The script content, normalized to UTF-8 encoding irrespective of its original encoding. When emitting this attribute, it may be appropriate to truncate large scripts. When consuming this attribute, large scripts should be anticipated.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The script type, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The script type is unknown.
- `1`: `Windows Command Prompt`
- `2`: `PowerShell`
- `3`: `Python`
- `4`: `JavaScript`
- `5`: `VBScript`
- `6`: `Unix Shell`
- `7`: `VBA`
- `99`: `Other` - The script type is not mapped. See the `type` attribute which contains an event source specific value.

The normalized script type ID.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

Some script engines assign a unique ID to each individual execution of a given script. This attribute captures that unique ID. In the case of PowerShell, the unique ID corresponds to the `ScriptBlockId` in the raw ETW events provided by the OS.
