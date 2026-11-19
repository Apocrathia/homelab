# Observability Stack (LGTM)

The LGTM (Loki, Grafana, Tempo, Mimir) observability stack plus its collectors and extras.

> **Navigation**: [← Back to Services README](../README.md)

## Components deployed

### 1. Grafana Operator (`grafana/`)

Manages Grafana dashboards and datasources via Kubernetes CRDs, deployed via
the Grafana Operator Helm chart:

- Dashboard management through `GrafanaDashboard` CRDs
- Datasource management through `GrafanaDatasource` CRDs
- GitOps-friendly dashboard deployment
- Integration with the existing kube-prometheus-stack Grafana instance

The Grafana UI itself is deployed via kube-prometheus-stack in infrastructure.

### 2. Grafana Alloy (`alloy/`)

Parent folder for three Alloy releases, one per subfolder: `alloy` (shared
collector, `logs/`), `alloy-tetragon` (`tetragon/`), `alloy-kube-audit`
(`kube-audit/`). The shared collector handles:

- Kubernetes pod log collection
- Syslog ingestion (RFC3164/5424) on ports 6514/TCP and 514/UDP
- CEF log ingestion from UniFi devices on port 1514/TCP
- OpenTelemetry trace collection (OTLP gRPC/HTTP)
- Integration with Loki for log storage

External access via the shared ingest LoadBalancer IP
(`ingest.services.apocrathia.com`). See [`alloy/README.md`](./alloy/README.md).

### 3. Loki (`loki/`)

Log aggregation and storage, deployed via the Loki Helm chart:

- Log collection from Kubernetes pods
- Grafana integration for log querying
- Log retention and management

Storage is S3-compatible (RustFS on the NAS).

### 4. Mimir (`mimir/`)

Long-term metrics storage and querying, deployed via the Mimir distributed
Helm chart:

- Prometheus-compatible metrics storage
- Long-term retention and scalability
- Grafana integration for metrics visualization
- Multi-tenant support

Storage is S3-compatible (RustFS on the NAS).

### 5. Tempo (`tempo/`)

Distributed tracing backend, deployed via the Tempo distributed Helm chart:

- OTLP trace ingestion (gRPC and HTTP)
- Trace-to-logs correlation with Loki
- Trace-to-metrics with Prometheus
- Service graph and node graph visualization
- Metrics generation from traces

Storage is S3-compatible (RustFS on the NAS).

### 6. OpenTelemetry Operator (`otel-operator/`)

Manages OpenTelemetry components via Kubernetes CRDs, deployed via the
OpenTelemetry Operator Helm chart:

- Auto-instrumentation injection for Python, Java, Node.js, .NET
- `OpenTelemetryCollector` CRD for deploying collectors
- `Instrumentation` CRD for language-specific agent configuration
- Pod/namespace annotation-based opt-in for instrumentation

Usage: annotate pods with
`instrumentation.opentelemetry.io/inject-<language>: "otel-system/<language>"`

### 7. **NetFlow → Tenzir**

- The dedicated Tenzir netflow node owns NetFlow natively via its
  the dedicated Tenzir netflow node owns NetFlow natively via its
  `read_netflow` operator behind
  [`tenzir-ingest-lb`](../../04-apps/security/tenzir/nodes/netflow/service-ingest.yaml)
  (`:2055/UDP` on the shared pool IP, Tenzir namespace); UniFi exporters
  keep their `:2055` target.

### 8. Shared ingest pool (`ingest/`)

Shared LoadBalancer IP (`10.100.1.96`, `ingest.services.apocrathia.com`) for
external telemetry ingestion:

- Alloy: syslog (514/UDP, 6514/TCP), CEF (1514/TCP)
- Tenzir NetFlow (2055/UDP; `goflow2` removed)

Implemented with Cilium LB IPAM and the `lbipam.cilium.io/sharing-key` annotation.

### 9. Prometheus extras (`prometheus/`)

Additional Prometheus scrape targets and exporters:

- SNMP Exporter for network device monitoring (UPS, NAS, switches)
- etcd ScrapeConfig for Talos cluster metrics

### 10. Gatus (`gatus/`): separate Flux Kustomization

In-cluster synthetic uptime checks (complements Uptime Kuma / Uptime Robot),
deployed from the official `gatus-sidecar` chart via Flux Kustomization
`services-gatus`. **Not** included in `services-observability` (depends on
CNPG). See [`gatus/README.md`](./gatus/README.md).

### 11. tailscale2otel (`tailscale2otel/`)

Collects Tailscale configuration audit logs (who did what, when) and tailnet
inventory metrics from the Tailscale API, deployed from the
`tailscale2otel` chart (OCI, ghcr.io/rknightion/charts):

- Polls the configuration audit log API (available on all plans; this
  tailnet is free-plan, so network flow logs are disabled)
- Pushes OTLP logs and metrics to the Alloy ingest service (logs → Loki,
  metrics → Mimir)
- OAuth client credentials from 1Password (`tailscale2otel-secrets` item)

See [`tailscale2otel/README.md`](./tailscale2otel/README.md).

### 12. kube-audit alloy (`alloy/kube-audit/`)

Tails the kube-apiserver audit log on control planes and dual-writes it to
Loki and the Tenzir detection node. Deployed as a dedicated root DaemonSet
from the Grafana Alloy chart (the audit file is root-only; the shared Alloy
runs non-root). See [`alloy/kube-audit/README.md`](./alloy/kube-audit/README.md).

### 13. tetragon alloy (`alloy/tetragon/`)

Root DaemonSet that tails the tetragon agents' JSON export files (0600
root-owned, out of reach of the shared Alloy) and pushes them as OTLP/HTTP
logs to the Tenzir tetragon node; no raw tetragon stream in Loki
(export-stdout sidecar dropped). See
[`alloy/tetragon/README.md`](./alloy/tetragon/README.md).

## Architecture

The observability stack integrates with the existing kube-prometheus-stack deployment:

- kube-prometheus-stack (deployed in infrastructure) provides the Grafana UI,
  Prometheus for metrics collection, and Alertmanager for alerting.
- This folder provides Grafana Operator (dashboard/datasource CRDs), Loki
  (logs), Tempo (traces), Mimir (long-term metrics), Grafana Alloy
  (collection), and the OpenTelemetry Operator (auto-instrumentation).
- All components store data in RustFS (S3-compatible storage on the NAS) and
  feed the kube-prometheus-stack Grafana instance for unified visualization.

## Data Flow

1. **Pod Logs**: Kubernetes pods → Grafana Alloy → Loki → RustFS storage → Grafana
2. **Syslog/CEF**: Network devices → Alloy (via ingest LB) → Loki → Grafana
3. **NetFlow/IPFIX**: Network devices → Tenzir `read_netflow` (goflow2 removed)
4. **Traces**: Applications (OTLP) → Grafana Alloy → Tempo → RustFS storage → Grafana
5. **Metrics**: Prometheus → Mimir → RustFS storage → Grafana
6. **Trace Metrics**: Tempo metrics generator → Mimir (service graphs, span metrics)

## Configuration

- **Authentication**: Integrated with Authentik for SSO
- **Storage**: RustFS for S3-compatible object storage
- **Persistence**: Longhorn storage class for local component data
- **Monitoring**: ServiceMonitors for Prometheus integration
- **Security**: RBAC, network policies, and security contexts
- **Log Collection**: Grafana Alloy with pod log discovery and forwarding

## Usage

### Accessing Grafana

- **Internal**: `http://grafana.grafana-system.svc:80`
- **External**: Via Gateway API with Authentik proxy

### Querying Logs

- Use LogQL syntax in Grafana
- Logs are automatically collected by Grafana Alloy from all pods
- Retention policies configured in Loki
- External log ingestion via TCP/UDP routes (syslog support)

### Viewing Metrics

- PromQL queries in Grafana
- Long-term storage in Mimir
- Pre-configured dashboards for cluster monitoring

### Managing Dashboards

- Deploy dashboards via `GrafanaDashboard` CRDs
- Manage datasources via `GrafanaDatasource` CRDs
- GitOps-friendly dashboard versioning and deployment
- Automatic synchronization with kube-prometheus-stack Grafana instance

## Dependencies

- **Infrastructure**: Longhorn storage, RustFS on the NAS
- **Security**: Authentik for authentication
- **Networking**: Gateway API for external access (HTTP, TCP, UDP)
- **Monitoring**: Prometheus stack for component metrics

## Maintenance

- Updates via Renovate
- Horizontal scaling supported for all components
- Self-monitoring via ServiceMonitors

## References

- **[Grafana Documentation](https://grafana.com/docs/)** - Dashboards and visualization
- **[Grafana Operator](https://grafana.github.io/grafana-operator/docs/)** - CRD-based management
- **[Loki Documentation](https://grafana.com/docs/loki/)** - Log aggregation
- **[Tempo Documentation](https://grafana.com/docs/tempo/)** - Distributed tracing
- **[Mimir Documentation](https://grafana.com/docs/mimir/)** - Long-term metrics storage
- **[Grafana Alloy](https://grafana.com/docs/alloy/)** - Telemetry collector
- **[OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)** - Auto-instrumentation
