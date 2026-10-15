# netflow OCSF map

[`map.tql`](./map.tql): flow record -> OCSF Network Activity (4001,
Traffic). Guarded reads cover the v5 fixed record and common v9/IPFIX
template fields; the reader's metadata record (exporter identity,
template, sequence) rides in `unmapped`. Raw flow fields that do not map
are dropped: the raw netflow.v9 record is not stored anywhere.
