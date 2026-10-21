# Operators

Per-source TQL operators, one folder per feed. Each operator is a
self-contained pipeline stage: parse (raw payload -> structured record),
ocsf (structured record -> OCSF event), or findings (Detection Finding
post-processing); [`record_integrity/`](./record_integrity/README.md)
is the cross-plane attestation lane the investigations wrappers and
the three detection nodes' archive rules (core, tetragon, netflow)
ride. Tests in
[`../tests/`](../tests/README.md) pin their output shape.
