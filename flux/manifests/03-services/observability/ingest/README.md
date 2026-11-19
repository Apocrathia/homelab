# Observability Ingress

A Cilium IP pool and L2 announcement policy that hand the shared ingest
LoadBalancer address (`10.100.1.96`) to any Service labeled
`apocrathia.com/ingest: "true"` on `eth0`. Alloy's syslog and CEF listeners
are the services behind it.

> **Navigation**: [← Back to Observability README](../README.md)
