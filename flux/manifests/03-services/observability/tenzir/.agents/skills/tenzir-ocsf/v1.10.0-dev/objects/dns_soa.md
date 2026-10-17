# DNS SOA Record (dns_soa)

The DNS SOA (Start of Authority) object represents the RDATA of a Start of Authority resource record. It carries the authoritative parameters of a DNS zone, including the serial number used to coordinate zone transfers between primary and secondary name servers.

- **Extends**: [Object (object)](object.md)

## Attributes

### `primary_server`

- **Type**: `string_t`
- **Requirement**: recommended

The DNS SOA MNAME field: the fully qualified domain name of the primary name server that is the original source of data for the zone. For example: `ns1.example.com`.

### `responsible_party`

- **Type**: `string_t`
- **Requirement**: recommended

The DNS SOA RNAME field: the email address of the party responsible for the zone, encoded as a domain name (the first label is the local part of the address). For example: `hostmaster.example.com` represents `hostmaster@example.com`.

### `sequence_number`

- **Type**: `long_t`
- **Requirement**: recommended

The DNS SOA SERIAL field: the unsigned 32-bit version number of the zone, incremented when the zone contents change. Secondary name servers compare this value to decide whether a zone transfer is needed.

### `refresh_interval`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The DNS SOA REFRESH field: the time interval before a secondary name server should query the primary to check for zone updates. Populate `duration_secs`, as the wire value is always a count of seconds.

### `retry_interval`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The DNS SOA RETRY field: the time interval before a secondary name server should retry a failed zone refresh. Populate `duration_secs`, as the wire value is always a count of seconds.

### `expire_interval`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The DNS SOA EXPIRE field: the time interval after which a secondary name server that has been unable to refresh the zone stops answering authoritatively for it. Populate `duration_secs`, as the wire value is always a count of seconds.

### `minimum_ttl`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The DNS SOA MINIMUM field: the time interval that defines the TTL for negative caching of records from this zone. Populate `duration_secs`, as the wire value is always a count of seconds.
