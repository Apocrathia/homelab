# Gaming PC Monitoring

Prometheus scrapes node-exporter metrics from the Fedora gaming workstation.

> **Navigation**: [← Back to Prometheus extras README](../README.md)

## Overview

The gaming PC runs `prometheus-node-exporter` via dnf. Prometheus pulls metrics over the LAN using a `ScrapeConfig` and forwards them to Mimir through the existing kube-prometheus-stack remote write path.

## Components

### ScrapeConfig (`scrapeconfig.yaml`)

- **Target**: `ians-gaming-pc.access.apocrathia.com:9100`
- **Job label**: `node`
- **Instance label**: `ians-gaming-pc`
- **Device type**: `workstation`
- **Scrape interval**: 30 seconds
- **Metrics path**: `/metrics`

## Fedora host setup

The dnf package stores its configuration in `/etc/default/prometheus-node-exporter`. The systemd unit passes flags through the `ARGS` variable.

| Path                                    | Purpose               |
| --------------------------------------- | --------------------- |
| `/etc/default/prometheus-node-exporter` | CLI flags via `$ARGS` |
| `prometheus-node-exporter.service`      | systemd unit          |
| `prometheus` user                       | service account       |

### Configure and enable

```bash
sudo vi /etc/default/prometheus-node-exporter
```

Bind to the LAN IP:

```bash
ARGS="--web.listen-address=10.100.x.x:9100"
```

Or listen on all interfaces and restrict access with the firewall:

```bash
ARGS="--web.listen-address=:9100"
```

```bash
sudo systemctl enable --now prometheus-node-exporter
sudo systemctl restart prometheus-node-exporter
curl -s localhost:9100/metrics | head
```

### Firewall

Allow scrape traffic from the cluster network only:

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.100.0.0/16" port protocol="tcp" port="9100" accept'
sudo firewall-cmd --reload
```

### DNS

The scrape target expects `ians-gaming-pc.access.apocrathia.com` to resolve to the gaming PC's LAN address.

## Metrics

Standard node-exporter metrics are available under the `node` job with `instance="ians-gaming-pc"`. Useful starting points:

- `node_cpu_seconds_total`
- `node_memory_MemAvailable_bytes`
- `node_filesystem_avail_bytes`
- `node_network_receive_bytes_total`
- `node_hwmon_temp_celsius`

## Usage

### Example queries

```promql
up{instance="ians-gaming-pc"}
node_memory_MemAvailable_bytes{instance="ians-gaming-pc"}
rate(node_cpu_seconds_total{instance="ians-gaming-pc", mode!="idle"}[5m])
```

Grafana node dashboards from kube-prometheus-stack apply when filtered to `instance="ians-gaming-pc"`.

## Troubleshooting

### Metrics not appearing

1. Verify node-exporter is running: `systemctl status prometheus-node-exporter`
2. Check local metrics: `curl http://localhost:9100/metrics`
3. Confirm DNS resolves from the cluster: `nslookup ians-gaming-pc.access.apocrathia.com`
4. Verify the ScrapeConfig exists: `kubectl get scrapeconfig -n prometheus-system gaming-pc-node-exporter`
5. Check Prometheus targets for `scrapeconfig/prometheus-system/gaming-pc-node-exporter`

### Scrape failures when the PC is off

The gaming PC may sleep or power off. Gaps in `up` are expected unless the host is always on.

## References

- [node-exporter documentation](https://github.com/prometheus/node_exporter)
- [Fedora node-exporter package](https://packages.fedoraproject.org/pkgs/node-exporter/node-exporter/)
