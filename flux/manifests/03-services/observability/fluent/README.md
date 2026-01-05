# Fluent Operator

Fluent Operator manages Fluent Bit and Fluentd deployments in Kubernetes using a declarative, operator-based approach.

> **Navigation**: [← Back to Observability README](../README.md)

## Documentation

- **[Fluent Operator Documentation](https://github.com/fluent/fluent-operator)** - Primary documentation source
- **[Fluent Bit Documentation](https://docs.fluentbit.io/)** - Fluent Bit reference

## Components

- **Fluent Operator**: Kubernetes operator that manages Fluent Bit and Fluentd instances via CRDs
- **Fluent Bit**: Lightweight log processor and forwarder running as a DaemonSet on all nodes
- **Fluentd**: Advanced log aggregator (disabled by default, can be enabled for complex pipelines)

## Configuration

The operator is configured with:

- **Container Runtime**: `containerd`
- **Fluent Bit**: Enabled as DaemonSet for log collection from all nodes
- **Fluentd**: Disabled (can be enabled if needed for advanced aggregation)
- **Monitoring**: ServiceMonitor enabled for Prometheus integration

## Usage

Configure log collection and forwarding using Fluent Operator CRDs:

- `FluentBit`: Define Fluent Bit instances
- `ClusterFluentBitConfig`: Global Fluent Bit configuration
- `ClusterInput/Input`: Log input sources
- `ClusterFilter/Filter`: Log processing filters
- `ClusterOutput/Output`: Log output destinations
- `ClusterParser/Parser`: Log parsing rules

Example configurations can be added to this directory as needed.

## Resources

- [Fluent Operator Documentation](https://github.com/fluent/fluent-operator)
- [Fluent Bit Documentation](https://docs.fluentbit.io/)
- [Helm Chart](https://github.com/fluent/helm-charts/tree/main/charts/fluent-operator)
