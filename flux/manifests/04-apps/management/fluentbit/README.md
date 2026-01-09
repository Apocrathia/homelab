# FluentBit Log Collector

Generic FluentBit deployment configured to collect logs from various sources and forward them to Loki.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Fluent Bit Documentation](https://docs.fluentbit.io/)** - Official documentation
- **[Fluent Operator](https://github.com/fluent/fluent-operator)** - Kubernetes operator
- **[Syslog Input](https://docs.fluentbit.io/manual/data-pipeline/inputs/syslog)** - Syslog plugin documentation

## Components

- **FluentBit**: Main Fluent Bit instance running as LoadBalancer service
- **ClusterInput**: Input plugins for various log sources (currently syslog)
- **ClusterOutput**: Loki output plugin forwarding logs to Loki service
- **ClusterFluentBitConfig**: Configuration selector linking inputs and outputs

## Current Input Sources

### Syslog Collection

- **Protocol**: TCP/UDP (RFC3164/RFC5424 syslog format)
- **Ports**:
  - TCP: 6514 (internal) → 6514 (external via LoadBalancer)
  - UDP: 5140 (internal) → 514 (external via LoadBalancer)
- **Parser**: syslog-rfc3164 and syslog-rfc5424 with fallback parsing
- **Buffer**: 32KB chunks, 64KB max

## Output Configuration

- **Destination**: Loki service in loki-system namespace
- **Labels**: job=fluentbit, component=syslog
- **Format**: JSON with Kubernetes labels

## Usage

External systems can send syslog messages to the LoadBalancer IP on:

- **TCP 6514**: Syslog messages
- **UDP 514**: Syslog messages

The messages will be parsed and forwarded to Loki for storage and querying.

## Network Configuration

The LoadBalancer service exposes:

- **TCP 6514**: Syslog messages
- **UDP 514**: Syslog messages

## Extensibility

This deployment is designed to be extensible. Additional input sources can be added by:

1. Creating new ClusterInput resources with `fluentbit.fluent.io/enabled: "true"` label
2. Adding corresponding ClusterFilter resources if needed
3. The existing FluentBit configuration will automatically pick up new inputs

## Troubleshooting

```bash
# Pod status
kubectl get pods -n fluentbit

# FluentBit logs
kubectl logs -n fluentbit deployment/fluentbit -f

# Check ClusterInput resources
kubectl get clusterinputs -l fluentbit.fluent.io/enabled=true

# Verify Loki output connectivity
kubectl logs -n fluentbit deployment/fluentbit | grep -i loki
```
