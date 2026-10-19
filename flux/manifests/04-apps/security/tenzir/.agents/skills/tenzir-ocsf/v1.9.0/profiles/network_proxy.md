# Network Proxy (network_proxy)

The attributes that identify network proxy attributes.

## Applies to

- DHCP Activity
- DNS Activity
- FTP Activity
- HTTP Activity
- Network
- Network Activity
- Network File Activity
- NTP Activity
- RDP Activity
- SMB Activity
- SSH Activity
- Tunnel Activity
- Web Resource Access Activity
- Web Resources Activity

## Attributes

### `proxy_connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: recommended

The connection information from the proxy server to the remote server.

### `proxy_endpoint`

- **Type**: [`network_proxy`](../objects/network_proxy.md)
- **Requirement**: optional

The proxy (server) in a network connection.

### `proxy_http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: optional

The HTTP Request from the proxy server to the remote server.

### `proxy_http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: optional

The HTTP Response from the remote server to the proxy server.

### `proxy_tls`

- **Type**: [`tls`](../objects/tls.md)
- **Requirement**: recommended

The TLS protocol negotiated between the proxy server and the remote server.

### `proxy_traffic`

- **Type**: [`network_traffic`](../objects/network_traffic.md)
- **Requirement**: recommended

The network traffic refers to the amount of data moving across a network, from proxy to remote server at a given point of time.
