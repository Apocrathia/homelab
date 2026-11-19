# Envoy Gateway

Deploys Envoy Gateway, the cluster's Gateway API implementation.
`helmrelease.yaml` runs the chart and `gatewayclass.yaml` registers the
`envoy` GatewayClass. The admin endpoint is exposed through Authentik:
`admin-service.yaml` fronts the control plane on port 19000, and the
Crossplane Workspace in `crossplane.yaml` runs the HCL from `authentik.tf`,
which kustomize stitches into the Workspace at build time.

> **Navigation**: [← Back to Services README](../README.md)
