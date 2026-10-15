# authentik OCSF map

[`map.tql`](./map.tql): authentik event -> OCSF. Logins and logouts map
to Authentication, account mutations to Account Change, every other
action to the Base Event fallback (not archived; see the
[`detections/`](../../../../detections/README.md) README).
