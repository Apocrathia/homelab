# NTP Activity (ntp_activity)

The Network Time Protocol (NTP) Activity events report instances of remote clients synchronizing their clocks with an NTP server, as observed on the network.

- **Class UID**: `4013`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Network Proxy](../profiles/network_proxy.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `dst_endpoint`, `src_endpoint`

## Inherited attributes

**From Network:**
- `connection_info` (recommended)
- `dst_endpoint` (recommended)
- `proxy` (recommended)
- `src_endpoint` (recommended)
- `traffic` (recommended)

**From Base Event:**
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

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `0`: `Unknown` - Not used in standard NTP implementations.
- `1`: `Symmetric Active Exchange` - Bidirectional time exchange between devices.
- `2`: `Symmetric Passive Response` - Device responds as a server to peers in symmetric active mode.
- `3`: `Client Synchronization` - NTP client, syncs with servers.
- `4`: `Server Response` - Dedicated NTP time server, responds to clients.
- `5`: `Broadcast` - Broadcast time info to network devices.
- `6`: `Control` - Monitoring and control messaging.
- `7`: `Private Use Case` - Reserved - Not defined in standard NTP specifications.
- `99`: `Other` - The event activity is not mapped.

The normalized identifier of the activity that triggered the event.

### `delay`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The total round-trip delay to the reference clock in milliseconds.

### `dispersion`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The dispersion in the NTP protocol is the estimated time error or uncertainty relative to the reference clock in milliseconds.

### `precision`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The NTP precision quantifies a clock's accuracy and stability in log2 seconds, as defined in RFC-5905.

### `stratum`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The stratum level of the NTP server's time source, normalized to the caption of the stratum_id value.

### `stratum_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `stratum`

#### Enum values

- `0`: `Unknown` - Unspecified or invalid.
- `1`: `Primary Server` - The highest precision primary server (e.g atomic clock or GPS).
- `2`: `Secondary Server` - A secondary level server (possible values: 2-15).
- `16`: `Unsynchronized`
- `17`: `Reserved` - Reserved stratum (possible values: 17-255).
- `99`: `Other` - The stratum level is not mapped. See the `stratum` attribute, which contains a data source specific value.

The normalized identifier of the stratum level, as defined in [RFC-5905](https://www.rfc-editor.org/rfc/rfc5905.html).

### `version`

- **Type**: `string_t`
- **Requirement**: required
- **Group**: context

The version number of the NTP protocol.
