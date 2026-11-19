# templates — cnpg-data-restore chart renders

The Job that runs pg_restore against a CNPG cluster from an SMB-mounted dump
(the chart fails closed unless `backupSmb.enabled` is true), the read-only SMB
PV/PVC pair, and the `_helpers.tpl` defines.

> **Navigation**: [← Back to cnpg-data-restore README](../README.md)
