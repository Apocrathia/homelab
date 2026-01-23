# Observability Stack (LGTM)

This directory contains the deployment configuration for the full LGTM (Loki, Grafana, Tempo, Mimir) observability stack.

> **Navigation**: [← Back to Services README](../README.md)

## Components Deployed

### 1. **Grafana Operator** (`grafana/`)

- **Purpose**: Manage Grafana dashboards and datasources via Kubernetes CRDs
- **Deployment**: Via Grafana Operator Helm chart
- **Features**:
  - Dashboard management through `GrafanaDashboard` CRDs
  - Datasource management through `GrafanaDatasource` CRDs
  - GitOps-friendly dashboard deployment
  - Integration with existing kube-prometheus-stack Grafana instance
- **Note**: The actual Grafana UI is deployed via kube-prometheus-stack in infrastructure

### 2. **Grafana Alloy** (`alloy/`)

- **Purpose**: Log collection, metrics forwarding, and external syslog/CEF ingestion
- **Deployment**: Via Grafana Alloy Helm chart
- **Features**:
  - Kubernetes pod log collection
  - Syslog ingestion (RFC3164/5424) on ports 6514/TCP and 514/UDP
  - CEF log ingestion from UniFi devices on port 1514/TCP
  - OpenTelemetry trace collection (OTLP gRPC/HTTP)
  - Integration with Loki for log storage
- **External Access**: Via shared ingest LoadBalancer IP (`ingest.services.apocrathia.com`)

### 3. **Loki** (`loki/`)

- **Purpose**: Log aggregation and storage
- **Deployment**: Via Loki Helm chart
- **Features**:
  - Log collection from Kubernetes pods
  - S3-compatible storage (MinIO)
  - Grafana integration for log querying
  - Log retention and management
- **Storage**: MinIO with Longhorn persistent volumes

### 4. **Mimir** (`mimir/`)

- **Purpose**: Long-term metrics storage and querying
- **Deployment**: Via Mimir distributed Helm chart
- **Features**:
  - Prometheus-compatible metrics storage
  - Long-term retention and scalability
  - Grafana integration for metrics visualization
  - Multi-tenant support
- **Storage**: S3-compatible storage (MinIO)

### 5. **Tempo** (`tempo/`)

- **Purpose**: Distributed tracing backend
- **Deployment**: Via Tempo distributed Helm chart
- **Features**:
  - OTLP trace ingestion (gRPC and HTTP)
  - Trace-to-logs correlation with Loki
  - Trace-to-metrics with Prometheus
  - Service graph and node graph visualization
  - Metrics generation from traces
- **Storage**: S3-compatible storage (MinIO)

### 6. **OpenTelemetry Operator** (`otel-operator/`)

- **Purpose**: Manage OpenTelemetry components via Kubernetes CRDs
- **Deployment**: Via OpenTelemetry Operator Helm chart
- **Features**:
  - Auto-instrumentation injection for Python, Java, Node.js, .NET
  - `OpenTelemetryCollector` CRD for deploying collectors
  - `Instrumentation` CRD for language-specific agent configuration
  - Pod/namespace annotation-based opt-in for instrumentation
- **Usage**: Annotate pods with `instrumentation.opentelemetry.io/inject-<language>: "otel-system/<language>"`

### 7. **goflow2** (`goflow2/`)

- **Purpose**: NetFlow/IPFIX/sFlow collection for network traffic analysis
- **Deployment**: Via generic-app Helm chart with goflow2 container
- **Features**:
  - IPFIX v10 ingestion from UniFi devices on port 2055/UDP
  - NetFlow v5/v9 support
  - sFlow v5 support
  - Prometheus metrics export for flow data
- **External Access**: Via shared ingest LoadBalancer IP (`ingest.services.apocrathia.com`)
- **Dashboard**: NetFlow Exporter Overview (Grafana dashboard ID 11408)

### 8. **Shared Ingest Pool** (`ingest/`)

- **Purpose**: Shared LoadBalancer IP for external telemetry ingestion
- **IP Address**: `10.100.1.96` (`ingest.services.apocrathia.com`)
- **Services Sharing IP**:
  - Alloy: syslog (514/UDP, 6514/TCP), CEF (1514/TCP)
  - goflow2: IPFIX (2055/UDP)
- **Implementation**: Cilium LB IPAM with `lbipam.cilium.io/sharing-key` annotation

### 9. **Fluent Operator** (`fluent/`)

- **Purpose**: Declarative Fluent Bit and Fluentd management via CRDs
- **Deployment**: Via Fluent Operator Helm chart
- **Features**:
  - Fluent Bit DaemonSet for node-level log collection
  - CRD-based pipeline configuration
  - ServiceMonitor for Prometheus integration

### 10. **Prometheus Extras** (`prometheus/`)

- **Purpose**: Additional Prometheus scrape targets and exporters
- **Components**:
  - SNMP Exporter for network device monitoring (UPS, NAS, switches)
  - etcd ScrapeConfig for Talos cluster metrics

## Architecture

The observability stack integrates with the existing kube-prometheus-stack deployment:

- **kube-prometheus-stack** (deployed in infrastructure) provides:

  - Grafana UI for visualization
  - Prometheus for metrics collection
  - Alertmanager for alerting

- **Observability components** (this folder) provide:

  - Grafana Operator for dashboard/datasource management via CRDs
  - Loki for log aggregation and storage
  - Tempo for distributed tracing
  - Mimir for long-term metrics storage
  - Grafana Alloy for log, metrics, and trace collection
  - OpenTelemetry Operator for auto-instrumentation and collector management

- **Data flow**: All components store data in MinIO (S3-compatible storage) and feed into the kube-prometheus-stack Grafana instance for unified visualization.

## Data Flow

1. **Pod Logs**: Kubernetes pods → Grafana Alloy → Loki → MinIO storage → Grafana
2. **Syslog/CEF**: Network devices → Alloy (via ingest LB) → Loki → Grafana
3. **NetFlow/IPFIX**: Network devices → goflow2 (via ingest LB) → Prometheus metrics → Grafana
4. **Traces**: Applications (OTLP) → Grafana Alloy → Tempo → MinIO storage → Grafana
5. **Metrics**: Prometheus → Mimir → MinIO storage → Grafana
6. **Trace Metrics**: Tempo metrics generator → Mimir (service graphs, span metrics)

## Configuration

- **Authentication**: Integrated with Authentik for SSO
- **Storage**: MinIO for S3-compatible object storage
- **Persistence**: Longhorn storage class for MinIO
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

- **Infrastructure**: Longhorn storage, MinIO
- **Security**: Authentik for authentication
- **Networking**: Gateway API for external access (HTTP, TCP, UDP)
- **Monitoring**: Prometheus stack for component metrics

## Maintenance

- **Updates**: Managed via Renovate bot
- **Backups**: MinIO data backed up via Longhorn
- **Scaling**: Horizontal scaling supported for all components
- **Monitoring**: Self-monitoring via ServiceMonitors

## References

- **[Grafana Documentation](https://grafana.com/docs/)** - Dashboards and visualization
- **[Grafana Operator](https://grafana.github.io/grafana-operator/docs/)** - CRD-based management
- **[Loki Documentation](https://grafana.com/docs/loki/)** - Log aggregation
- **[Tempo Documentation](https://grafana.com/docs/tempo/)** - Distributed tracing
- **[Mimir Documentation](https://grafana.com/docs/mimir/)** - Long-term metrics storage
- **[Grafana Alloy](https://grafana.com/docs/alloy/)** - Telemetry collector
- **[OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)** - Auto-instrumentation
