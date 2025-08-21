# Kube Prometheus Stack - Monitoring and Observability

This directory contains the deployment configuration for the kube-prometheus-stack, a comprehensive monitoring solution for Kubernetes based on Prometheus.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

The kube-prometheus-stack provides a complete monitoring platform with:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert management and routing
- **Node Exporter**: Node-level metrics collection
- **Kube State Metrics**: Kubernetes object state metrics
- **Prometheus Operator**: Declarative configuration management

## Architecture

### Core Components

#### Prometheus

- **Metrics Collection**: Scrapes metrics from Kubernetes components
- **Time Series Storage**: Efficient storage for time series data
- **Query Language**: PromQL for data querying and analysis
- **Alerting Engine**: Rule-based alerting system

#### Grafana

- **Dashboards**: Pre-built and custom dashboards
- **Data Sources**: Multiple data source support
- **Alerting**: Integrated alerting with Prometheus
- **User Management**: Authentication and authorization

#### Alertmanager

- **Alert Routing**: Configurable alert routing and grouping
- **Notification**: Multiple notification channels
- **Silencing**: Alert suppression and management
- **High Availability**: Clustered deployment

### Supporting Components

#### Node Exporter

- **System Metrics**: Node-level system metrics
- **Hardware Monitoring**: CPU, memory, disk, network metrics
- **Process Information**: System process monitoring

#### Kube State Metrics

- **Kubernetes Objects**: State metrics for Kubernetes objects
- **Resource Usage**: Pod, node, deployment metrics
- **Cluster State**: Overall cluster health metrics

#### Prometheus Operator

- **CRD Management**: Custom resources for Prometheus components
- **Configuration Management**: Declarative configuration
- **Lifecycle Management**: Automated deployment and scaling

## 1Password Setup

Before deploying, create the local account credentials in 1Password:

1. In your 1Password vault, create a new item called `local-account`
2. Add these fields:
   - **Field Label**: `username` | **Value**: `admin`
   - **Field Label**: `password` | **Value**: `your-secure-password`

The 1Password Connect Operator will automatically create a Kubernetes secret with these values for Grafana admin access.

## Features

### Monitoring Capabilities

- **Cluster Monitoring**: Node and pod-level metrics
- **Application Monitoring**: Custom application metrics
- **Service Monitoring**: Service availability and performance
- **Infrastructure Monitoring**: Network and storage metrics

### Alerting Features

- **Rule-Based Alerting**: Configurable alert rules
- **Multi-Channel Notifications**: Email, Slack, PagerDuty, etc.
- **Alert Grouping**: Intelligent alert grouping and routing
- **Silencing**: Alert suppression during maintenance

### Visualization

- **Pre-built Dashboards**: Kubernetes, node, and application dashboards
- **Custom Dashboards**: User-defined visualizations
- **Data Exploration**: Ad-hoc queries and analysis
- **Real-time Updates**: Live data updates

## Access and Usage

### Grafana Access

- **Internal URL**: `http://grafana.grafana-system.svc:80`
- **External Access**: Via Gateway API with Authentik authentication
- **Admin Credentials**: Stored in 1Password `local-account` item

### Prometheus Access

- **Internal URL**: `http://prometheus-k8s.prometheus-system.svc:9090`
- **Query API**: REST API for metrics querying
- **Alert Rules**: Configurable alerting rules

### Alertmanager Access

- **Internal URL**: `http://alertmanager-operated.prometheus-system.svc:9093`
- **Alert Status**: View active and resolved alerts
- **Silence Management**: Manage alert suppressions

## Configuration

### Resource Requirements

- **Prometheus**: 500m-2000m CPU, 1Gi-4Gi memory
- **Grafana**: 100m-500m CPU, 256Mi-1Gi memory
- **Alertmanager**: 100m-500m CPU, 256Mi-512Mi memory
- **Node Exporter**: 50m-100m CPU, 64Mi-128Mi memory per node
- **Kube State Metrics**: 100m-200m CPU, 256Mi-512Mi memory

### Storage Configuration

- **Prometheus Data**: Persistent volume for metrics storage
- **Grafana Data**: Persistent volume for dashboards and settings
- **Retention**: Configurable metrics retention period

### Security Configuration

- **RBAC**: Role-based access control
- **Network Policies**: Network traffic restrictions
- **TLS**: Secure communication between components
- **Authentication**: SSO integration with Authentik

## Integration with Homelab

### Authentik Integration

- **SSO**: Single sign-on for Grafana access
- **User Management**: Automated user provisioning
- **Authorization**: Role-based dashboard access
- **Audit Logging**: Authentication and access logging

### Longhorn Integration

- **Storage Monitoring**: Longhorn-specific dashboards
- **Backup Monitoring**: Backup job monitoring
- **Performance Metrics**: Storage performance visualization

### Cilium Integration

- **Network Monitoring**: Network policy monitoring
- **Security Metrics**: Security event visualization
- **Performance**: Network performance dashboards

### Application Integration

- **ServiceMonitors**: Automatic service discovery
- **PodMonitors**: Pod-level metrics collection
- **Custom Metrics**: Application-specific monitoring
- **Alerting**: Application-specific alerts

## Dashboards and Alerts

### Pre-configured Dashboards

- **Kubernetes Cluster**: Node and pod overview
- **Kubernetes Resources**: Resource usage and limits
- **Prometheus**: Prometheus server metrics
- **Grafana**: Grafana server metrics
- **Alertmanager**: Alert management overview
- **Node Exporter**: Node-level system metrics
- **Longhorn**: Storage system monitoring

### Alert Rules

- **Node Down**: Alert when nodes become unavailable
- **Pod CrashLoopBackOff**: Alert on crashing pods
- **High Resource Usage**: CPU and memory threshold alerts
- **Storage Issues**: Disk space and I/O alerts
- **Network Issues**: Network connectivity problems

## Security Considerations

### Access Control

- **Grafana Authentication**: SSO through Authentik
- **Prometheus Security**: Network policies and RBAC
- **Alertmanager Access**: Restricted to administrators
- **API Security**: TLS and authentication

### Data Protection

- **Metrics Encryption**: Data encryption in transit
- **Access Logging**: Comprehensive audit trails
- **Backup Strategy**: Regular backup of configurations
- **Compliance**: Security and compliance monitoring

## Troubleshooting

### Common Issues

1. **Metrics Collection Failures**

   ```bash
   # Check Prometheus targets
   kubectl port-forward -n prometheus-system svc/prometheus-k8s 9090:9090

   # Check target health
   curl http://localhost:9090/api/v1/targets | jq .
   ```

2. **Grafana Access Issues**

   ```bash
   # Check Grafana pods
   kubectl get pods -n grafana-system

   # Check Grafana logs
   kubectl logs -n grafana-system deployment/grafana
   ```

3. **Alertmanager Issues**

   ```bash
   # Check alertmanager status
   kubectl get pods -n prometheus-system -l app.kubernetes.io/name=alertmanager

   # Check alert routing
   kubectl port-forward -n prometheus-system svc/alertmanager-operated 9093:9093
   ```

### Health Checks

```bash
# Check all components
kubectl get pods -n prometheus-system
kubectl get pods -n grafana-system

# Check Prometheus health
kubectl port-forward -n prometheus-system svc/prometheus-k8s 9090:9090
curl http://localhost:9090/-/healthy

# Check Grafana health
kubectl port-forward -n grafana-system svc/grafana 3000:80
curl http://localhost:3000/api/health
```

### Log Analysis

```bash
# Prometheus logs
kubectl logs -n prometheus-system statefulset/prometheus-k8s

# Grafana logs
kubectl logs -n grafana-system deployment/grafana

# Alertmanager logs
kubectl logs -n prometheus-system -l app.kubernetes.io/name=alertmanager
```

## Best Practices

### Configuration Management

1. **Version Pinning**: Pin Helm chart versions
2. **Configuration Backup**: Regular backup of Grafana dashboards
3. **Alert Tuning**: Fine-tune alert thresholds
4. **Dashboard Organization**: Organize dashboards by namespace

### Operations

1. **Resource Monitoring**: Monitor monitoring stack resources
2. **Metrics Retention**: Configure appropriate retention periods
3. **Alert Management**: Regular review and cleanup of alerts
4. **Performance Tuning**: Optimize Prometheus query performance

### Security

1. **Access Control**: Implement least privilege access
2. **Network Security**: Use network policies and encryption
3. **Monitoring**: Monitor the monitoring stack itself
4. **Updates**: Regular security updates

## External Resources

- [Kube Prometheus Stack Documentation](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)
