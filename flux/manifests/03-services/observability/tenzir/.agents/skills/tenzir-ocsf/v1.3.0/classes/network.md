# Network (network)

Abstract base class for Network Activity event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Network Proxy](../profiles/network_proxy.md), [Security Control](../profiles/security_control.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

## Attributes

### `app_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The name of the application associated with the event or object.

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: recommended
- **Group**: primary

The network connection information.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: primary

The responder (server) in a network connection.

### `ja4_fingerprint_list`

- **Type**: [`ja4_fingerprint`](../objects/ja4_fingerprint.md)
- **Requirement**: optional
- **Group**: context

A list of the JA4+ network fingerprints.

### `proxy`

- **Type**: [`network_proxy`](../objects/network_proxy.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.1.0.** Use the  `proxy_endpoint`  attribute instead.

The proxy (server) in a network connection.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The initiator (client) of the network connection.

### `tls`

- **Type**: [`tls`](../objects/tls.md)
- **Requirement**: optional
- **Group**: context

The Transport Layer Security (TLS) attributes.

### `traffic`

- **Type**: [`network_traffic`](../objects/network_traffic.md)
- **Requirement**: recommended
- **Group**: primary

The network traffic refers to the amount of data moving across a network at a given point of time. Intended to be used alongside Network Connection.
