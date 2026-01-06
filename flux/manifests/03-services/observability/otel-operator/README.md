# OpenTelemetry Operator

This directory contains the deployment configuration for the OpenTelemetry Operator, which manages OpenTelemetry components (collectors, instrumentation, target allocators) as Kubernetes custom resources.

> **Navigation**: [← Back to Observability README](../README.md)

## Documentation

- **[OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)** - Primary documentation
- **[Helm Chart](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator)** - Chart source and values

## Custom Resources

The operator manages the following CRDs:

- **OpenTelemetryCollector**: Deploy and manage OTel Collector instances
- **Instrumentation**: Auto-instrument applications with language-specific agents
- **TargetAllocator**: Distribute Prometheus scrape targets across collector instances
- **OpAMPBridge**: Connect collectors to an OpAMP server for remote management

## Architecture

The operator runs as a deployment with:

- **Manager**: Reconciles custom resources and manages component lifecycle
- **kube-rbac-proxy**: Protects the metrics endpoint with RBAC
- **Admission Webhooks**: Validates and mutates custom resources

## Integration

### With cert-manager

The operator's admission webhooks require TLS certificates. This deployment uses cert-manager for automatic certificate management.

### With Grafana Alloy

Alloy already provides OpenTelemetry Collector functionality for log collection. The operator enables additional use cases:

- **Per-application collectors**: Deploy dedicated collectors via CR
- **Auto-instrumentation**: Inject language agents into pods
- **Prometheus target allocation**: Distribute scrape targets for scaling

### With Prometheus

ServiceMonitor is enabled with the `release: kube-prometheus-stack` label for automatic metrics collection.

## Example: OpenTelemetryCollector

```yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: my-collector
  namespace: my-app
spec:
  mode: deployment
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      batch: {}
    exporters:
      otlp:
        endpoint: tempo-distributor.tempo-system.svc:4317
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp]
```

## Auto-Instrumentation

Pre-configured Instrumentation CRs are deployed in `otel-system` for Python, Java, and Node.js. To enable auto-instrumentation on a pod, add the appropriate annotation.

### Enabling on Pods

Add one of these annotations to your pod template:

```yaml
# Python applications (LiteLLM, JupyterHub, Open WebUI)
annotations:
  instrumentation.opentelemetry.io/inject-python: "otel-system/python"

# Java applications
annotations:
  instrumentation.opentelemetry.io/inject-java: "otel-system/java"

# Node.js applications (Overseerr, Ombi)
annotations:
  instrumentation.opentelemetry.io/inject-nodejs: "otel-system/nodejs"

# .NET applications (Sonarr, Radarr, Lidarr, Prowlarr, Bazarr)
annotations:
  instrumentation.opentelemetry.io/inject-dotnet: "otel-system/dotnet"
```

### Example: Enabling on JupyterHub

In the JupyterHub HelmRelease, add to `hub.extraPodSpec`:

```yaml
hub:
  extraPodSpec:
    annotations:
      instrumentation.opentelemetry.io/inject-python: "otel-system/python"
```

### What Gets Instrumented

The Python agent automatically instruments:

- HTTP clients (requests, urllib3, aiohttp, httpx)
- HTTP servers (Flask, FastAPI, Django, Starlette)
- Database clients (psycopg2, asyncpg, sqlalchemy)
- Redis, gRPC, Celery, and more

### Sampling

Default sampling rate is 100% (`argument: "1"`). For high-volume apps, adjust in `instrumentation.yaml`:

```yaml
sampler:
  type: parentbased_traceidratio
  argument: "0.1" # Sample 10% of traces
```

## Troubleshooting

### Check Operator Status

```bash
kubectl get pods -n otel-system
kubectl logs -n otel-system -l app.kubernetes.io/name=opentelemetry-operator
```

### Check CRDs

```bash
kubectl get crd | grep opentelemetry
kubectl get opentelemetrycollectors -A
kubectl get instrumentations -A
```

### Webhook Issues

```bash
# Check webhook configuration
kubectl get validatingwebhookconfigurations | grep opentelemetry
kubectl get mutatingwebhookconfigurations | grep opentelemetry

# Check certificate
kubectl get certificate -n otel-system
```

## References

- [OpenTelemetry Kubernetes](https://opentelemetry.io/docs/kubernetes/)
- [Operator GitHub](https://github.com/open-telemetry/opentelemetry-operator)
- [Auto-Instrumentation](https://opentelemetry.io/docs/kubernetes/operator/automatic/)
