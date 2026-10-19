# Load Balancer (load_balancer)

The load balancer object describes the load balancer entity and contains additional information regarding the distribution of traffic across a network.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `classification`

- **Type**: `string_t`
- **Requirement**: optional

The request classification as defined by the load balancer.

### `code`

- **Type**: `integer_t`
- **Requirement**: recommended

The numeric response status code detailing the connection from the load balancer to the destination target.

### `dst_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

The destination to which the load balancer is distributing traffic.

### `endpoint_connections`

- **Type**: [`endpoint_connection`](endpoint_connection.md)
- **Requirement**: recommended

An object detailing the load balancer connection attempts and responses.

### `error_message`

- **Type**: `string_t`
- **Requirement**: optional

The load balancer error message.

### `ip`

- **Type**: `ip_t`
- **Requirement**: optional

The IP address of the load balancer node that handled the client request. Note: the load balancer may have other IP addresses, and this is not an IP address of the target/distribution endpoint - see `dst_endpoint`.

### `message`

- **Type**: `string_t`
- **Requirement**: optional

The load balancer message.

### `metrics`

- **Type**: [`metric`](metric.md)
- **Requirement**: optional

General purpose metrics associated with the load balancer.

### `name`

- **Type**: `string_t`

The name of the load balancer.

### `status_detail`

- **Type**: `string_t`
- **Requirement**: optional

The status detail contains additional status information about the load balancer distribution event.

### `uid`

- **Type**: `string_t`

The unique identifier for the load balancer.
