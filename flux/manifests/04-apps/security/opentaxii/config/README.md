# OpenTAXII config

TAXII 1.x bootstrap data loaded by `opentaxii-sync-data` on every boot:
discovery, inbox, and poll services. Authentication is off because the
service is ClusterIP-only; the header comment documents how to add
accounts when a feeder needs real auth.

> **Navigation**: [← Back to OpenTAXII README](../README.md)
