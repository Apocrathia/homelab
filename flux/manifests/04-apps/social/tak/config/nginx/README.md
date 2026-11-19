# OpenTAKServer nginx config

nginx server blocks for OpenTAKServer. `https-8443.conf` serves the
Marti API with client-certificate mTLS (ATAK presents certs signed by the
OTS CA; Authentik is bypassed on purpose). `http-80.conf` and
`https-8446.conf` cover the remaining listeners.

> **Navigation**: [← Back to OpenTAKServer config README](../README.md)
