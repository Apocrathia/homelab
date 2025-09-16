# Grafana Operator

The Grafana Operator manages Grafana instances and their resources through Kubernetes Custom Resources.

## Overview

This deployment installs the Grafana Operator using the official Helm chart from the Grafana repository. The operator enables:

- Multi-instance Grafana deployments
- Dashboard and datasource management through CRDs
- GitOps-friendly resource management
- External Grafana instance management

## Usage

After deployment, you can create Grafana instances using the `Grafana` CRD:

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: Grafana
metadata:
  name: my-grafana
spec:
  config:
    log:
      mode: "console"
    security:
      admin_user: admin
      admin_password: secret
```

## Documentation

- [Grafana Operator Documentation](https://grafana.github.io/grafana-operator/docs/)
- [GitHub Repository](https://github.com/grafana/grafana-operator)
