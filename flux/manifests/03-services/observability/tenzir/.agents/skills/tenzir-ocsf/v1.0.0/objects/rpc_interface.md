# RPC Interface (rpc_interface)

The RPC Interface represents the remote procedure call interface used in the DCE/RPC session.

- **Extends**: [Object (object)](object.md)

## Attributes

### `ack_reason`

- **Type**: `integer_t`
- **Requirement**: recommended

An integer that provides a reason code or additional information about the acknowledgment result.

### `ack_result`

- **Type**: `integer_t`
- **Requirement**: recommended

An integer that denotes the acknowledgment result of the DCE/RPC call.

### `uuid`

- **Type**: `uuid_t`
- **Requirement**: required

The unique identifier of the particular remote procedure or service.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The version of the DCE/RPC protocol being used in the session.
