# DNS Zone Transfer Activity (dns_zone_transfer_activity)

DNS Zone Transfer Activity events report the bulk replication of a DNS zone between name servers, as seen on the network. This includes full transfers (AXFR), incremental transfers (IXFR), and change notifications (NOTIFY). Unlike `DNS Activity`, which reports per-name queries and answers, this class captures whole-zone semantics: SOA serials, the records that make up the zone, and the multi-message streams that carry them.

- **Class UID**: `4015`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Network Proxy](../profiles/network_proxy.md), [Load Balancer](../profiles/load_balancer.md), [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

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

- `1`: `Transfer Request` - A request from a secondary name server to transfer a zone. Whether a full (AXFR) or incremental (IXFR) transfer was requested is conveyed by `transfer_type_id`.
- `2`: `Transfer Response` - A zone transfer response message from the primary name server. A single transfer may be delivered as a stream of multiple response messages. Whether the delivered data is a full (AXFR) or incremental (IXFR) transfer is conveyed by `transfer_type_id`; note that a server may answer an IXFR request with a full transfer when it cannot produce a delta.
- `3`: `Notify` - A NOTIFY exchange, comprising the primary name server's notification that the zone has changed and the secondary's acknowledgement, reported as a single record rather than as separate messages. NOTIFY has no transfer type; the outcome of the acknowledgement is conveyed by `status_id`.
- `4`: `Transfer` - A zone transfer reported as a single summary record rather than as separate request and response messages. Used by sources, such as name server logs, that emit one event per transfer with the zone, record count, byte count, duration, and peer. Whether the transfer was full (AXFR) or incremental (IXFR) is conveyed by `transfer_type_id`; whether it succeeded is conveyed by `status_id`.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `transfer_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `transfer_type`

#### Enum values

- `0`: `Unknown` - The transfer type is unknown. For example, the event source reports a transfer without indicating whether it was full or incremental, or the message has no transfer type (such as a NOTIFY).
- `1`: `Full Transfer (AXFR)` - A full zone transfer, in which the primary name server sends the complete contents of the zone.
- `2`: `Incremental Transfer (IXFR)` - An incremental zone transfer, in which the primary name server sends only the changes since the secondary's known SOA serial.
- `99`: `Other` - The transfer type is not mapped. See the `transfer_type` attribute, which contains a data source specific value.

The normalized identifier of the zone transfer type. On a `Transfer Request` this is the type requested; on a `Transfer Response` or `Transfer` activity this is the type actually delivered.

### `transfer_type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The zone transfer type, normalized to the caption of the `transfer_type_id` value. In the case of 'Other', it is defined by the event source.

### `dns_zone`

- **Type**: `hostname_t`
- **Requirement**: recommended
- **Group**: primary

The DNS zone being transferred, i.e., the zone apex. This is the QNAME present in every message of the transfer or NOTIFY. The message role is conveyed by `activity_id` and the transfer type (AXFR or IXFR) by `transfer_type_id`. For example: `example.com`.

### `soa`

- **Type**: [`dns_soa`](../objects/dns_soa.md)
- **Requirement**: optional
- **Group**: context

The current Start of Authority (SOA) record for the zone. For an IXFR request, this is the SOA the secondary already holds, i.e., the "from" serial that bounds the requested delta.

### `updated_soa`

- **Type**: [`dns_soa`](../objects/dns_soa.md)
- **Requirement**: optional
- **Group**: context

The new Start of Authority (SOA) record for the zone after the transfer, i.e., the "to" serial. Present when the transfer advances the zone to a newer serial.

### `records`

- **Type**: [`dns_resource_record`](../objects/dns_resource_record.md)
- **Requirement**: recommended
- **Group**: primary

The resource records transferred for the zone. For an AXFR this is the complete set of zone records; for an IXFR this is the changed records that make up the delta.

### `authority`

- **Type**: [`dns_resource_record`](../objects/dns_resource_record.md)
- **Requirement**: optional
- **Group**: context

The DNS Authority section resource records. Contains NS records pointing to authoritative name servers, or a SOA record for negative responses (NXDOMAIN).

### `dns_additional`

- **Type**: [`dns_section`](../objects/dns_section.md)
- **Requirement**: optional
- **Group**: context

The Additional section of this DNS message, carrying any supplementary resource records (such as an EDNS OPT pseudo-record) and an optional TSIG record. Because `activity_id` distinguishes the request from the response, each event represents a single DNS message with a single Additional section. The TSIG record authenticating the message is available via `dns_additional.tsig`; a `BADKEY` or `BADSIG` error commonly indicates an unauthorized transfer attempt.

### `num_records`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The number of resource records transferred. Useful when the event source reports a count without shipping every record.

### `rcode`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The DNS server response code, normalized to the caption of the `rcode_id` value. In the case of 'Other', it is defined by the event source. A `Refused` code typically indicates a blocked or unauthorized transfer.

### `rcode_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `rcode`

#### Enum values

- `0`: `NoError` - No Error.
- `1`: `FormError` - Format Error.
- `2`: `ServError` - Server Failure.
- `3`: `NXDomain` - Non-Existent Domain.
- `4`: `NotImp` - Not Implemented.
- `5`: `Refused` - Query Refused. For a zone transfer, this typically indicates the transfer was blocked because the requesting client is not authorized.
- `6`: `YXDomain` - Name Exists when it should not.
- `7`: `YXRRSet` - RR Set Exists when it should not.
- `8`: `NXRRSet` - RR Set that should exist does not.
- `9`: `NotAuth` - Not Authorized or Server Not Authoritative for zone.
- `10`: `NotZone` - Name not contained in zone.
- `11`: `DSOTYPENI` - DSO-TYPE Not Implemented.
- `16`: `BADVERS` - Bad EDNS OPT Version. Indicates that the client requested an EDNS version that the server does not support.
- `17`: `BADKEY` - Key not recognized.
- `18`: `BADTIME` - Signature out of time window.
- `19`: `BADMODE` - Bad TKEY Mode.
- `20`: `BADNAME` - Duplicate key name.
- `21`: `BADALG` - Algorithm not supported.
- `22`: `BADTRUNC` - Bad Truncation.
- `23`: `BADCOOKIE` - Bad/missing Server Cookie.
- `24`: `Unassigned` - The codes deemed to be unassigned by the RFC (unassigned codes: 12-15, 24-3840, 4096-65534).
- `25`: `Reserved` - The codes deemed to be reserved by the RFC (codes: 3841-4095, 65535).
- `99`: `Other` - The dns response code is not defined by the RFC.

The normalized identifier of the DNS server response code. See RFC 6895.

### `transaction_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The 16-bit DNS transaction identifier assigned by the client and echoed unchanged in the server response. This value is the same for both the request and response messages.
