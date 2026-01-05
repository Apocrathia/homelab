# Metrics Server - Resource Metrics Collection

This directory contains the deployment configuration for Metrics Server, which provides resource usage metrics for Kubernetes workloads.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

Metrics Server is a scalable, efficient source of container resource metrics for Kubernetes built-in autoscaling pipelines. It provides:

- **Resource Metrics**: CPU and memory usage for pods and nodes
- **Horizontal Pod Autoscaling**: Metrics for HPA controllers
- **Resource Monitoring**: Real-time resource utilization data
- **Cluster Efficiency**: Insights into resource allocation and usage

## Architecture

### Components

- **Metrics Server**: Core metrics collection and serving
- **API Server Integration**: Native Kubernetes API integration
- **Metrics Pipeline**: Efficient metrics aggregation and serving

### Data Collection

Metrics Server collects metrics from:

- **Kubelet**: Container and node resource usage
- **cAdvisor**: Container runtime metrics
- **Node Exporter**: Node-level system metrics
- **Container Runtime**: Docker/containerd metrics

## Features

### Core Functionality

- **Resource Metrics API**: Standard Kubernetes metrics APIs
- **Efficient Storage**: In-memory metrics storage
- **Horizontal Scaling**: Handles large clusters efficiently
- **High Availability**: Supports multiple replicas

### Autoscaling Support

- **HPA Integration**: Provides metrics for Horizontal Pod Autoscaler
- **Custom Metrics**: Support for custom resource metrics
- **Scaling Policies**: Configurable scaling thresholds

### Monitoring Integration

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Alertmanager**: Automated alerting

## Configuration

### Deployment Configuration

The Metrics Server is configured with:

- **Replicas**: 2 replicas for high availability
- **Resource Limits**: Appropriate CPU and memory limits
- **Security Context**: Non-root execution with minimal privileges
- **Service Account**: Dedicated service account with minimal permissions

### Key Parameters

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: metrics-server
          args:
            - --cert-dir=/tmp
            - --secure-port=4443
            - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
            - --kubelet-use-node-status-port
            - --metric-resolution=15s
            - --kubelet-insecure-tls
```

## Usage Examples

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
```

### Resource Monitoring

```bash
# View resource usage
kubectl top pods
kubectl top nodes

# Get detailed metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

### Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-hpa
spec:
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## Integration with Homelab

### Kube Prometheus Stack Integration

- **Metrics Collection**: Automatic metrics scraping
- **Dashboards**: Pre-built Grafana dashboards
- **Alerts**: Resource usage and scaling alerts
- **Visualization**: Real-time resource monitoring

### Authentik Integration

- **Authentication**: SSO for metrics access
- **Authorization**: Role-based access to metrics
- **Audit**: Access logging and monitoring

### Cilium Integration

- **Network Metrics**: Network policy metrics
- **Security Metrics**: Security policy effectiveness
- **Performance**: Network performance monitoring

## Security Considerations

### Authentication & Authorization

- **Service Account**: Minimal permissions for metrics collection
- **RBAC**: ClusterRole with necessary API access
- **Network Policies**: Restrict metrics traffic
- **TLS**: Secure communication with API server

### Data Protection

- **In-Memory Storage**: No persistent data storage
- **Access Control**: API-level access control
- **Audit Logging**: Comprehensive audit trails
- **Compliance**: GDPR and security compliance

## Troubleshooting

### Common Issues

1. **Metrics Unavailable**

   ```bash
   # Check Metrics Server status
   kubectl get pods -n kube-system -l k8s-app=metrics-server

   # Check logs
   kubectl logs -n kube-system deployment/metrics-server

   # Verify API availability
   kubectl get apiservice v1beta1.metrics.k8s.io
   ```

2. **HPA Not Working**

   ```bash
   # Check HPA status
   kubectl describe hpa <hpa-name>

   # Check target deployment
   kubectl describe deployment <deployment-name>

   # Verify metrics availability
   kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq .
   ```

3. **Performance Issues**

   ```bash
   # Check resource usage
   kubectl top pods -n kube-system

   # Check node capacity
   kubectl describe nodes
   ```

### Health Checks

```bash
# Check Metrics Server health
kubectl get componentstatus

# Check metrics API
kubectl get --raw /apis/metrics.k8s.io/v1beta1 | jq .

# Verify HPA functionality
kubectl get hpa --all-namespaces
```

### Log Analysis

```bash
# View Metrics Server logs
kubectl logs -n kube-system deployment/metrics-server

# Check kubelet logs
kubectl logs -n kube-system kubelet

# Monitor API server logs
kubectl logs -n kube-system kube-apiserver
```

## Best Practices

### Configuration

1. **Resource Limits**: Set appropriate resource limits
2. **High Availability**: Use multiple replicas
3. **Security**: Enable secure TLS communication
4. **Monitoring**: Monitor Metrics Server itself

### Operations

1. **Version Updates**: Keep Metrics Server updated
2. **Capacity Planning**: Monitor cluster resource usage
3. **Alerting**: Set up alerts for resource thresholds
4. **Documentation**: Maintain scaling policies

### Security

1. **Access Control**: Limit access to metrics APIs
2. **Network Security**: Secure metrics traffic
3. **Audit**: Regular security audits
4. **Compliance**: Meet regulatory requirements

## Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.

## Monitoring

### Metrics Exposed

- **Collection Latency**: Time to collect metrics
- **API Response Time**: API server response times
- **Resource Usage**: CPU and memory usage
- **Error Rates**: Collection and serving errors

### Alerting

- **High Resource Usage**: Alert on high resource utilization
- **Collection Failures**: Alert on metrics collection issues
- **API Errors**: Alert on API server issues
- **Scaling Events**: Alert on scaling activities

## External Resources

- [Metrics Server Documentation](https://github.com/kubernetes-sigs/metrics-server)
- [Kubernetes HPA Guide](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Prometheus Metrics Guide](https://prometheus.io/docs/concepts/data_model/)
- [Resource Management Best Practices](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
