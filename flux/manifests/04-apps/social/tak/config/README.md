# OpenTAKServer config

Runtime config template for OpenTAKServer, rendered by the render-config
init container with 1Password secret placeholders (`__OTS_DB_PASSWORD__`).
Holds the settings without env-var support upstream: LDAP (dedicated
Authentik outpost, LDAPS on 636) and the database URI.

> **Navigation**: [← Back to OpenTAKServer README](../README.md)
