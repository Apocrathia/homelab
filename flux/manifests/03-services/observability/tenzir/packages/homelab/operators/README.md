# Operators

Per-source TQL operators, one folder per feed. Each operator is a
self-contained pipeline stage: parse (raw payload -> structured record),
ocsf (structured record -> OCSF event), or findings (Detection Finding
post-processing). Tests in [`../tests/`](../tests/README.md) pin their
output shape.
