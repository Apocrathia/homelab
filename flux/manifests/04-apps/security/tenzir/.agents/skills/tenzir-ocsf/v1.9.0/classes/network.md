# Network (network)

Abstract base class for Network Activity event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Network Proxy](../profiles/network_proxy.md), [Load Balancer](../profiles/load_balancer.md), [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `dst_endpoint`, `src_endpoint`

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

### `app_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The network application name identified by tools such as NBAR or App ID (e.g., youtube, facebook, webex). This represents a specific network application that uses standard protocols (such as https or quic) to deliver its service.

### `app_protocol_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The application-layer (Layer 7) protocol name identified by deep packet inspection or packet parsing (e.g., `https`, `quic`, `ssh`, `dns`), expressed as an IANA-registered service name from the IANA Service Name and Transport Protocol Port Number Registry.

Note: Port numbers alone are not always a reliable indicator of the actual application protocol in use.

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: recommended
- **Group**: primary

The network connection information.

### `cumulative_traffic`

- **Type**: [`network_traffic`](../objects/network_traffic.md)
- **Requirement**: optional
- **Group**: context

The cumulative (running total) network traffic aggregated from the start of a flow or session. Use when reporting: (1) total accumulated bytes/packets since flow initiation, (2) combined aggregation models where both incremental deltas and running totals are reported together (populate both `traffic` for the delta and this attribute for the cumulative total), or (3) final summary metrics when a long-lived connection closes. This represents the sum of all activity from flow start to the current observation, not a delta or point-in-time value.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The responder (server) in a network connection.

### `ja4_fingerprint_list`

- **Type**: [`ja4_fingerprint`](../objects/ja4_fingerprint.md)
- **Requirement**: optional
- **Group**: context

A list of the JA4+ network fingerprints.

### `network_observation_point`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: optional
- **Group**: context

The network endpoint that observes or inspects network traffic as a third-party system, used when the observer is neither the source nor the destination of the communication (when `observation_point_id` = 3). Examples include network taps, span ports, inline security devices, or packet capture systems that monitor traffic between other endpoints.

### `observation_point`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

Indicates whether the source network endpoint, destination network endpoint, or neither served as the observation point for the activity. The value is normalized to the caption of the `observation_point_id`.

### `observation_point_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `observation_point`

#### Enum values

- `0`: `Unknown` - The observation point is unknown.
- `1`: `Source` - The source network endpoint is the observation point.
- `2`: `Destination` - The destination network endpoint is the observation point.
- `3`: `Neither` - Neither the source nor destination network endpoint is the observation point. Refer to the `network_observation_point` attribute for details.
- `4`: `Both` - Both the source and destination network endpoint are the observation point. This typically occurs in localhost or internal communications where the source and destination are the same endpoint, often resulting in a `connection_info.direction` of `Local`.
- `99`: `Other` - The observation point is not mapped. See the `observation_point` attribute for a data source specific value.

The normalized identifier of the observation point. The observation point identifier indicates whether the source network endpoint, destination network endpoint, or neither served as the observation point for the activity.

### `packet_list`

- **Type**: [`packet`](../objects/packet.md)
- **Requirement**: optional
- **Group**: context

The list of packet objects describing captured network packets.

### `proxy`

- **Type**: [`network_proxy`](../objects/network_proxy.md)
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.1.0.** Use the `proxy_endpoint` attribute instead.

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

The network traffic for this observation period. Use when reporting: (1) delta values (bytes/packets transferred since the last observation), (2) instantaneous measurements at a specific point in time, or (3) standalone single-event metrics. This attribute represents a point-in-time measurement or incremental change, not a running total. For accumulated totals across multiple observations or the lifetime of a flow, use `cumulative_traffic` instead.
