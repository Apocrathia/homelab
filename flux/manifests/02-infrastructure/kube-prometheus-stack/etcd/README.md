# etcd Monitoring Configuration

This directory contains the monitoring configuration for etcd running on Talos control plane nodes.

> **Navigation**: [← Back to kube-prometheus-stack README](../README.md)

## Documentation

- **[etcd Documentation](https://etcd.io/docs/)** - Primary documentation source
- **[Talos etcd Guide](https://www.talos.dev/v1.9/talos-guides/configuration/editing-machine-configuration/)** - etcd configuration on Talos

## Overview

etcd is the distributed key-value store that serves as the backbone of Kubernetes. Monitoring etcd performance is critical for cluster stability, especially for detecting leader changes, slow requests, and memory pressure issues.

## Components

### ScrapeConfig (`scrapeconfig.yaml`)

Configures Prometheus to scrape etcd metrics directly from Talos nodes:

- **Static targets** pointing to node IPs: `10.100.1.80-83:2381`
- **Job label**: `etcd-metrics` for proper identification
- **Scrape interval**: 30 seconds
- **Metrics path**: `/metrics`
- **Direct access** without Kubernetes service abstraction

### Alerting Rules (`alerts.yaml`)

Monitors etcd performance and availability:

#### Performance Alerts

- **EtcdSlowRequests**: WAL fsync taking > 0.5s (warning)
- **EtcdHighRequestLatency**: Request latency > 0.1s (warning)
- **EtcdSlowReadIndex**: ReadIndex failures detected (warning)
- **EtcdHighMemoryUsage**: Memory usage > 80% of quota limit (warning)
- **EtcdTooManyOpenConnections**: High network traffic (warning)

#### Availability Alerts

- **EtcdLeaderChanges**: > 2 leader changes per hour (critical)
- **EtcdClusterDown**: etcd cluster unavailable (critical)
- **EtcdClusterUnhealthy**: Health check failures (critical)

## Prerequisites

### Talos Configuration

etcd metrics must be enabled in Talos configuration:

```yaml
cluster:
  etcd:
    extraArgs:
      metrics: "basic"
      listen-metrics-urls: "http://0.0.0.0:2381"
```

### Network Access

- Prometheus must be able to reach Talos nodes on port 2381
- Direct IP access to node IPs (10.100.1.80-83) from Prometheus pods

## Metrics Collected

Key etcd metrics that will be available in Prometheus:

- `etcd_disk_wal_fsync_duration_seconds` - WAL fsync latency
- `etcd_server_leader_changes_seen_total` - Leader change counter
- `etcd_server_read_indexes_failed_total` - ReadIndex failure counter
- `etcd_mvcc_db_total_size_in_bytes` - Database size
- `etcd_server_quota_backend_bytes` - Quota limit
- `etcd_network_peer_sent_bytes_total` - Network traffic
- `etcd_server_health_failures` - Health check failures

## Usage

### Prometheus Queries

Example queries for etcd monitoring:

```promql
# WAL fsync latency 99th percentile
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# Leader changes per hour
increase(etcd_server_leader_changes_seen_total[1h])

# ReadIndex failures
increase(etcd_server_read_indexes_failed_total[5m])

# Memory usage percentage
(etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes) * 100
```

## Troubleshooting

### Metrics Not Appearing

1. Verify etcd metrics are enabled in Talos config
2. Check if etcd is listening on port 2381: `curl http://10.100.1.80:2381/metrics`
3. Verify ScrapeConfig is created: `kubectl get scrapeconfig -n prometheus-system`
4. Check Prometheus targets: Access Prometheus UI and check `/targets`

### High Alert Volume

- Adjust alert thresholds in `alerts.yaml` based on your environment
- Consider increasing scrape intervals if needed
- Review etcd performance tuning in Talos configuration

### Network Issues

- Ensure Prometheus pods can reach Talos nodes on port 2381
- Verify direct IP access to node IPs (10.100.1.80-83)
- Check firewall rules allow port 2381 access

## Related Configuration

- **Talos etcd tuning**: See `talos/patches/unified-patch.yaml`
- **Prometheus configuration**: See parent directory `helmrelease.yaml`
- **Alertmanager routing**: Configured in main kube-prometheus-stack
