# defaults — kopia role variables

`main.yml` pins the kopia package version (Renovate-managed, must not exceed the
shared repo's format version), the RustFS S3 endpoint and bucket, per-path GFS
retention, and the snapshot schedule. The three secrets have no defaults — the
playbook supplies them via 1Password lookup.

> **Navigation**: [← Back to kopia README](../README.md)
