# Unmanned Systems (unmanned_systems)

Abstract base class for Unmanned Systems event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Unmanned Systems
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `activity_id` (required)
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: recommended
- **Group**: context

The network connection information.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: context

The destination network endpoint of the Unmanned Aerial System (UAS), Counter Unmanned Aerial System (CUAS) platform, or other unmanned systems monitoring and/or sensing infrastructure.

### `proxy_endpoint`

- **Type**: [`network_proxy`](../objects/network_proxy.md)
- **Requirement**: recommended
- **Group**: context

The proxy (server) in a network connection.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: context

The source network endpoint of the Unmanned Aerial System (UAS), Counter Unmanned Aerial System (CUAS) platform, or other unmanned systems monitoring and/or sensing infrastructure.

### `tls`

- **Type**: [`tls`](../objects/tls.md)
- **Requirement**: optional
- **Group**: context

The Transport Layer Security (TLS) attributes.

### `traffic`

- **Type**: [`network_traffic`](../objects/network_traffic.md)
- **Requirement**: recommended
- **Group**: context

The network traffic refers to the amount of data moving across a network at a given point of time. Intended to be used alongside Network Connection.
