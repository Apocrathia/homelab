# goflow2 - NetFlow/IPFIX Collection

This directory contains the deployment configuration for goflow2, a high-performance NetFlow/IPFIX/sFlow collector.

> **Navigation**: [← Back to Observability README](../README.md)

## Architecture

goflow2 is deployed as a single-replica Deployment:

- **goflow2**: NetFlow/IPFIX/sFlow collector with Prometheus metrics export
- **LoadBalancer Service**: Shared ingest IP for external IPFIX ingestion
- **ServiceMonitor**: Prometheus scraping for flow metrics
- **Grafana Dashboard**: goflow2 Collector (Network folder; see [`grafana/`](./grafana/))

## Flow Collection

### Supported Protocols

| Protocol      | Port     | Description                        |
| ------------- | -------- | ---------------------------------- |
| IPFIX v10     | 2055/UDP | Primary protocol for UniFi devices |
| NetFlow v5/v9 | 2055/UDP | Legacy NetFlow support             |
| sFlow v5      | 6343/UDP | sFlow sampling (internal only)     |

### External Access

- **IP Address**: `10.100.1.96` (`ingest.services.apocrathia.com`)
- **Port**: 2055/UDP
- **Shared with**: Alloy syslog/CEF services via Cilium LB IPAM

## UniFi Configuration

Configure IPFIX export in UniFi Network Console:

1. Navigate to **Settings → System → Network Flow (IPFIX)**
2. Enable IPFIX and select VLANs to monitor
3. Set **Collector Address**: `ingest.services.apocrathia.com`
4. Set **Port**: `2055`
5. Set **Version**: `10` (IPFIX)
6. Configure timeout/refresh rates as needed

## Prometheus Metrics

goflow2 exposes collector metrics under the `goflow2` namespace (for example
`goflow2_flow_traffic_bytes_total`, `goflow2_flow_process_nf_*`). Series appear
after flow packets are received. Prometheus scrapes them via the ServiceMonitor.

These metrics describe collector health and ingest rates by exporter — not
per-flow top talkers (src/dst host/port). Flow records follow the configured
transport (currently discarded to `/dev/null`).

## Grafana Dashboard

[`grafana/dashboard.json`](./grafana/dashboard.json) is a NetFlow-focused
adaptation of the upstream GoFlow Internals dashboard. It is provisioned as
ConfigMap `goflow2-dashboard` and `GrafanaDashboard/goflow2-collector` in the
Network folder. The datasource variable defaults to Mimir.

Panels cover UDP ingest rates, NetFlow/IPFIX decode/process stats, templates,
errors, and latency.

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n goflow2
kubectl logs -n goflow2 -l app=goflow2
```

### Verify Flow Reception

```bash
# Check for IPFIX template/data reception
kubectl logs -n goflow2 -l app=goflow2 | grep -i "netflow\|ipfix"
```

### Test UDP Connectivity

```bash
# Send test packet (will show "not a NetFlow packet" error if received)
echo -n "test" | nc -u -w 1 10.100.1.96 2055
kubectl logs -n goflow2 -l app=goflow2 --tail=5
```

## References

- [goflow2 GitHub](https://github.com/netsampler/goflow2)
- [IPFIX RFC 7011](https://datatracker.ietf.org/doc/html/rfc7011)
- [Upstream GoFlow Internals dashboard](https://github.com/netsampler/goflow2/blob/main/compose/kcg/grafana/dashboards/perfs.json)
