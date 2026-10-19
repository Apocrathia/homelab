# Query Evidence (query_evidence)

The specific resulting evidence information that was queried or discovered. When mapping raw telemetry data users should select the appropriate child object that best matches the evidence type as defined by query_type_id.

## Attributes

### `connection_info`

- **Type**: [`network_connection_info`](network_connection_info.md)
- **Requirement**: recommended
- **Group**: primary

The network connection information related to a Network Connection query type.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended
- **Group**: primary

The file that is the target of the query when query_type_id indicates a File query.

### `folder`

- **Type**: [`file`](file.md)
- **Requirement**: recommended
- **Group**: primary

The folder that is the target of the query when query_type_id indicates a Folder query.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: recommended
- **Group**: primary

The administrative group that is the target of the query when query_type_id indicates an Admin Group query.

### `job`

- **Type**: [`job`](job.md)
- **Requirement**: recommended
- **Group**: primary

The job object that pertains to the event when query_type_id indicates a Job query.

### `kernel`

- **Type**: [`kernel`](kernel.md)
- **Requirement**: recommended
- **Group**: primary

The kernel object that pertains to the event when query_type_id indicates a Kernel query.

### `module`

- **Type**: [`module`](module.md)
- **Requirement**: recommended
- **Group**: primary

The module that pertains to the event when query_type_id indicates a Module query.

### `network_interfaces`

- **Type**: [`network_interface`](network_interface.md)
- **Requirement**: recommended
- **Group**: primary

The physical or virtual network interfaces that are associated with the device when query_type_id indicates a Network Interfaces query.

### `peripheral_device`

- **Type**: [`peripheral_device`](peripheral_device.md)
- **Requirement**: recommended
- **Group**: primary

The peripheral device that triggered the event when query_type_id indicates a Peripheral Device query.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended
- **Group**: primary

The process that pertains to the event when query_type_id indicates a Process query.

### `query_type`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The normalized caption of query_type_id or the source-specific query type.

### `query_type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `query_type`

#### Enum values

- `0`: `Unknown` - The query type was unknown or not specified.
- `1`: `Kernel` - A query about kernel resources including system calls, shared mutex, or other kernel components.
- `2`: `File` - A query about file attributes, metadata, content, hash values, or properties.
- `3`: `Folder` - A query about folder attributes, metadata, content, or structure.
- `4`: `Admin Group` - A query about group membership, privileges, domain, or group properties.
- `5`: `Job` - A query about scheduled jobs, their command lines, run states, or execution times.
- `6`: `Module` - A query about loaded modules, their base addresses, load types, or function entry points.
- `7`: `Network Connection` - A query about active network connections, boundaries, protocols, or TCP states.
- `8`: `Network Interfaces` - A query about physical or virtual network interfaces, their IP/MAC addresses, or types.
- `9`: `Peripheral Device` - A query about attached peripheral devices, their classes, models, or vendor information.
- `10`: `Process` - A query about running processes, command lines, ancestry, loaded modules, or execution context.
- `11`: `Service` - A query about system services, their names, versions, labels, or properties.
- `12`: `Session` - A query about authenticated user or service sessions, their creation times, or issuer details.
- `13`: `User` - A query about user accounts, their properties, credentials, or domain information.
- `14`: `Users` - A query about multiple users belonging to an administrative group.
- `15`: `Startup Item` - A query about startup configuration items, their run modes, start types, or current states.
- `16`: `Registry Key` - A Windows-specific query about registry keys, their paths, security descriptors, or modification times.
- `17`: `Registry Value` - A Windows-specific query about registry values, their data types, content, or names.
- `18`: `Prefetch` - A Windows-specific query about prefetch files, their run counts, last execution times, or existence.
- `99`: `Other` - The query type was not mapped to a standard category. See the query_type attribute for source-specific value.

The normalized type of system query performed against a device or system component.

### `service`

- **Type**: [`service`](service.md)
- **Requirement**: recommended
- **Group**: primary

The service that pertains to the event when query_type_id indicates a Service query.

### `session`

- **Type**: [`session`](session.md)
- **Requirement**: recommended
- **Group**: primary

The authenticated user or service session when query_type_id indicates a Session query.

### `startup_item`

- **Type**: [`startup_item`](startup_item.md)
- **Requirement**: recommended
- **Group**: primary

The startup item object that pertains to the event when query_type_id indicates a Startup Item query.

### `state`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The state of the socket, normalized to the caption of the state_id value. In the case of 'Other', it is defined by the event source.

### `tcp_state_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

#### Enum values

- `0`: `Unknown` - The socket state is unknown.
- `1`: `ESTABLISHED` - The socket has an established connection between a local application and a remote peer.
- `2`: `SYN-SENT` - The socket is actively trying to establish a connection to a remote peer.
- `3`: `SYN-RECEIVED` - The socket has passively received a connection request from a remote peer.
- `4`: `FIN-WAIT-1` - The socket connection has been closed by the local application, the remote peer has not yet acknowledged the close, and the system is waiting for it to close its half of the connection.
- `5`: `FIN-WAIT-2` - The socket connection has been closed by the local application, the remote peer has acknowledged the close, and the system is waiting for it to close its half of the connection.
- `6`: `TIME-WAIT` - The socket connection has been closed by the local application, the remote peer has closed its half of the connection, and the system is waiting to be sure that the remote peer received the last acknowledgement.
- `7`: `CLOSED` - The socket is not in use.
- `8`: `CLOSE-WAIT` - The socket connection has been closed by the remote peer, and the system is waiting for the local application to close its half of the connection.
- `9`: `LAST-ACK` - The socket connection has been closed by the remote peer, the local application has closed its half of the connection, and the system is waiting for the remote peer to acknowledge the close.
- `10`: `LISTEN` - The socket is listening for incoming connections.
- `11`: `CLOSING` - The socket connection has been closed by the local application and the remote peer simultaneously, and the remote peer has not yet acknowledged the close attempt of the local application.

The state of the TCP socket for the network connection.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended
- **Group**: primary

The user that pertains to the event when query_type_id indicates a User query.

### `users`

- **Type**: [`user`](user.md)
- **Requirement**: optional
- **Group**: context

The users that belong to the administrative group when query_type_id indicates a Users query.
