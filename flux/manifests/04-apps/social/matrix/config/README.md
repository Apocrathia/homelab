# Matrix config

Synapse and MAS configuration templates for
`matrix.apocrathia.com`. A render-config init container renders
`homeserver.yaml` (only the DB password is substituted; auth is fully
delegated to MAS), `mas-config.yaml` (secret-free, credentials read from
files), and `homeserver.log.config` (console handler only).

> **Navigation**: [← Back to Matrix README](../README.md)
