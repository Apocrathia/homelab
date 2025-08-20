# Observability Stack (LGTM)

This directory contains the deployment configuration for the LGTM (Loki, Grafana, Tempo, Mimir) observability stack components. We're deploying a subset focused on logs, metrics, and visualization.

## Components Deployed

### 1. **Grafana Alloy** (`alloy/`)

- **Purpose**: Log and metrics collection using OpenTelemetry Collector
- **Deployment**: Via Grafana Alloy Helm chart
- **Features**:
  - Kubernetes pod log collection
  - Metrics collection and forwarding
  - Integration with existing kube-prometheus-stack Grafana instance
  - OpenTelemetry-based architecture for future extensibility
- **Note**: The actual Grafana UI is deployed via kube-prometheus-stack in infrastructure

### 2. **Loki** (`loki/`)

- **Purpose**: Log aggregation and storage
- **Deployment**: Via Loki Helm chart
- **Features**:
  - Log collection from Kubernetes pods
  - S3-compatible storage (MinIO)
  - Grafana integration for log querying
  - Log retention and management
- **Storage**: MinIO with Longhorn persistent volumes

### 3. **Mimir** (`mimir/`)

- **Purpose**: Long-term metrics storage and querying
- **Deployment**: Via Mimir distributed Helm chart
- **Features**:
  - Prometheus-compatible metrics storage
  - Long-term retention and scalability
  - Grafana integration for metrics visualization
  - Multi-tenant support
- **Storage**: S3-compatible storage (MinIO)

## Architecture

The observability stack integrates with the existing kube-prometheus-stack deployment:

- **kube-prometheus-stack** (deployed in infrastructure) provides:

  - Grafana UI for visualization
  - Prometheus for metrics collection
  - Alertmanager for alerting

- **Observability components** (this folder) provide:

  - Loki for log aggregation and storage
  - Mimir for long-term metrics storage
  - Grafana Alloy for log and metrics collection

- **Data flow**: All components store data in MinIO (S3-compatible storage) and feed into the kube-prometheus-stack Grafana instance for unified visualization.

## Data Flow

1. **Logs**: Kubernetes pods → Grafana Alloy → Loki → MinIO storage → Grafana visualization (via kube-prometheus-stack)
2. **Metrics**: Prometheus → Mimir → MinIO storage → Grafana visualization (via kube-prometheus-stack)
3. **Log Collection**: Grafana Alloy collects logs from pods and forwards to Loki
4. **Datasources**: Configured directly in kube-prometheus-stack Grafana instance

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

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Mimir Documentation](https://grafana.com/docs/mimir/)
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/)
- [LGTM Stack Overview](https://grafana.com/docs/grafana-cloud/quickstart/)
