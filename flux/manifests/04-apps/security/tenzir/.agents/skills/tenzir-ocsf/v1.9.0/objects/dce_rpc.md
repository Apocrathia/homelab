# DCE/RPC (dce_rpc)

The DCE/RPC, or Distributed Computing Environment/Remote Procedure Call, object describes the remote procedure call system for distributed computing environments.

- **Extends**: [Object (object)](object.md)

## Attributes

### `command`

- **Type**: `string_t`
- **Requirement**: recommended

The request command (e.g. REQUEST, BIND).

### `command_response`

- **Type**: `string_t`
- **Requirement**: recommended

The reply to the request command (e.g. RESPONSE, BINDACK or FAULT).

### `flags`

- **Type**: `string_t`
- **Requirement**: required

The list of interface flags.

### `opnum`

- **Type**: `integer_t`
- **Requirement**: recommended

An operation number used to identify a specific remote procedure call (RPC) method or a method in an interface.

### `rpc_interface`

- **Type**: [`rpc_interface`](rpc_interface.md)
- **Requirement**: required

The RPC Interface object describes the details pertaining to the remote procedure call interface.
