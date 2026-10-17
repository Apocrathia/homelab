# Network Endpoint (network_endpoint)

The Network Endpoint object describes characteristics of a network endpoint. These can be a source or destination of a network connection.

- **Extends**: [Endpoint (endpoint)](endpoint.md)

## Attributes

### `autonomous_system`

- **Type**: [`autonomous_system`](autonomous_system.md)
- **Requirement**: optional

The Autonomous System details associated with an IP address.

### `intermediate_ips`

- **Type**: `ip_t`
- **Requirement**: optional

The intermediate IP Addresses. For example, the IP addresses in the HTTP X-Forwarded-For header.

### `isp`

- **Type**: `string_t`
- **Requirement**: optional

The name of the Internet Service Provider (ISP).

### `isp_org`

- **Type**: `string_t`
- **Requirement**: optional

The organization name of the Internet Service Provider (ISP). This represents the parent organization or company that owns/operates the ISP. For example, Comcast Corporation would be the ISP org for Xfinity internet service. This attribute helps identify the ultimate provider when ISPs operate under different brand names.

### `network_scope`

- **Type**: `string_t`
- **Requirement**: optional

Indicates whether the endpoint resides inside the customer’s network, outside on the Internet, or if its location relative to the customer’s network cannot be determined. The value is normalized to the caption of the `network_scope_id`.

### `network_scope_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `network_scope`

#### Enum values

- `0`: `Unknown` - Unknown whether this endpoint resides within the customer’s network.
- `1`: `Internal` - The endpoint resides inside the customer’s network.
- `2`: `External` - The endpoint is on the Internet or otherwise external to the customer’s network.
- `99`: `Other` - The network scope is not mapped. See the `network_scope` attribute, which contains a data source specific value.

The normalized identifier of the endpoint’s network scope. The normalized network scope identifier indicates whether the endpoint resides inside the customer’s network, outside on the Internet, or if its location relative to the customer’s network cannot be determined.

### `port`

- **Type**: `port_t`
- **Requirement**: recommended

The port used for communication within the network connection.

### `proxy_endpoint`

- **Type**: [`network_proxy`](network_proxy.md)
- **Requirement**: optional

The network proxy information pertaining to a specific endpoint. This can be used to describe information pertaining to network address translation (NAT).

### `svc_name`

- **Type**: `string_t`
- **Requirement**: recommended

The service name in service-to-service connections. For example, AWS VPC logs the pkt-src-aws-service and pkt-dst-aws-service fields identify the connection is coming from or going to an AWS service.

### `type`

- **Type**: `string_t`

The network endpoint type. For example: `unknown`, `server`, `desktop`, `laptop`, `tablet`, `mobile`, `virtual`, `browser`, or `other`.

### `type_id`

- **Type**: `integer_t`
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The type is unknown.
- `99`: `Other` - The type is not mapped. See the `type` attribute, which contains a data source specific value.

The network endpoint type ID.

### `uid`

- **Type**: `string_t`
- **Observable**: 48

The unique identifier. See specific usage.
