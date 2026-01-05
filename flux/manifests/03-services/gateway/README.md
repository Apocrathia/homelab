# Gateway - Gateway API Implementation

This directory contains the deployment configuration for the Gateway API implementation, providing advanced traffic management and routing capabilities.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

The Gateway implementation provides:

- **Gateway API**: Kubernetes Gateway API implementation
- **Traffic Management**: Advanced routing and traffic policies
- **TLS Termination**: End-to-end TLS certificate management
- **Load Balancing**: Intelligent load balancing and traffic distribution
- **Security**: Advanced security policies and access control

## Architecture

### Core Components

#### Gateway API Resources

##### Gateway

- **Traffic Entry Point**: Defines the entry point for traffic
- **Listener Configuration**: Protocol-specific configuration
- **TLS Configuration**: Certificate management and TLS settings
- **Route Attachment**: Defines which routes can attach to the gateway

##### HTTPRoute

- **HTTP Routing**: HTTP/HTTPS traffic routing rules
- **Path Matching**: URL path-based routing
- **Header Matching**: HTTP header-based routing
- **Traffic Splitting**: Canary deployments and A/B testing

##### ReferenceGrant

- **Cross-Namespace Access**: Allows resources to reference secrets across namespaces
- **Security Boundaries**: Maintains security while enabling cross-namespace references
- **Permission Management**: Controlled access to shared resources

### Gateway Implementation

#### Cilium Gateway

- **eBPF-Based**: High-performance eBPF-based gateway
- **Native Routing**: Native routing capabilities
- **Security Integration**: Deep integration with Cilium security
- **Load Balancing**: Advanced load balancing algorithms

#### Gateway Controller

- **Resource Management**: Manages Gateway API resources
- **Configuration Reconciliation**: Continuous reconciliation of desired state
- **Status Updates**: Provides status information for all resources

## Configuration

### Gateway Configuration

#### Main Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: cilium-system
spec:
  gatewayClassName: cilium
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: cert-manager-gateway-services-apocrathia-com-tls
            namespace: cilium-secrets
```

#### HTTP Redirect

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-redirect
  namespace: cilium-system
spec:
  parentRefs:
    - name: main-gateway
      sectionName: http
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: https
            statusCode: 301
```

### Load Balancer Configuration

#### IP Pool Management

```yaml
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: gateway-pool
spec:
  blocks:
    - cidr: "10.100.1.99/32"
```

#### L2 Announcements

```yaml
apiVersion: "cilium.io/v2alpha1"
kind: CiliumL2AnnouncementPolicy
metadata:
  name: gateway-l2-policy
spec:
  interfaces:
    - eth0
  serviceSelector:
    matchLabels:
      io.cilium.gateway/owning-gateway: main-gateway
```

## Features

### Traffic Management

- **HTTP Routing**: Advanced HTTP routing with path and header matching
- **Traffic Splitting**: Canary deployments and A/B testing
- **Rate Limiting**: Request rate limiting and throttling
- **Request Mirroring**: Traffic mirroring for testing

### Security Features

- **TLS Termination**: End-to-end TLS with automatic certificate management
- **mTLS**: Mutual TLS authentication between services
- **Security Headers**: Automatic security header injection
- **Access Control**: IP-based and header-based access control

### Load Balancing

- **Algorithms**: Maglev, random, round-robin, least-request
- **Session Affinity**: Sticky session support
- **Health Checks**: Active and passive health monitoring
- **Failover**: Automatic failover and recovery

### Observability

- **Metrics**: Comprehensive metrics for traffic and performance
- **Logging**: Detailed access and error logging
- **Tracing**: Distributed tracing integration
- **Monitoring**: Integration with Prometheus and Grafana

## Integration with Homelab

### Certificate Management

- **Automatic Provisioning**: Integration with cert-manager
- **Wildcard Certificates**: Support for wildcard domain certificates
- **Certificate Rotation**: Automatic certificate renewal
- **Cross-Namespace References**: Secure certificate sharing

### Application Integration

- **HTTPRoute Configuration**: Native Gateway API routing
- **Service Discovery**: Automatic service discovery and routing
- **Health Monitoring**: Application health monitoring
- **Traffic Policies**: Application-specific traffic policies

### Security Integration

- **Network Policies**: Integration with Cilium network policies
- **Identity-Aware Routing**: User and service identity-based routing
- **Policy Enforcement**: Security policy enforcement at the gateway
- **Audit Logging**: Comprehensive security audit logging

### Monitoring Integration

- **Prometheus Metrics**: Gateway performance and health metrics
- **Grafana Dashboards**: Traffic visualization and monitoring
- **Alert Configuration**: Automated alerting for gateway issues
- **Log Aggregation**: Centralized logging with Loki

## Routing Examples

### Authentik Authentication

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: authentik
  namespace: authentik
spec:
  parentRefs:
    - name: main-gateway
      namespace: cilium-system
      sectionName: https
  hostnames:
    - "auth.gateway.services.apocrathia.com"
  rules:
    - backendRefs:
        - name: authentik-server
          port: 80
```

### Application with Authentik Outpost

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: demo-app
  namespace: demo-app
spec:
  parentRefs:
    - name: main-gateway
      namespace: cilium-system
      sectionName: https
  hostnames:
    - "demo.gateway.services.apocrathia.com"
  rules:
    - backendRefs:
        - name: ak-outpost-demo-app-outpost
          port: 9000
```

### Reference Grant for Cross-Namespace Access

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: gateway-cert-manager
  namespace: cilium-secrets
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: Gateway
      namespace: cilium-system
  to:
    - group: ""
      kind: Secret
      name: cert-manager-gateway-services-apocrathia-com-tls
```

## Security Considerations

### Network Security

- **TLS Encryption**: End-to-end encryption for all traffic
- **Certificate Management**: Automated certificate lifecycle management
- **Access Control**: Fine-grained access control policies
- **Network Policies**: Kubernetes network policy integration

### Authentication & Authorization

- **Identity Integration**: Integration with Authentik for authentication
- **Policy-Based Access**: Advanced policy-based authorization
- **Session Management**: Secure session handling and management
- **Audit Logging**: Comprehensive security audit trails

### Data Protection

- **Traffic Encryption**: TLS encryption for all data in transit
- **Certificate Validation**: Proper certificate chain validation
- **Key Management**: Secure private key management
- **Compliance**: Security and compliance monitoring

## Troubleshooting

### Common Issues

1. **Routing Issues**

   ```bash
   # Check HTTPRoute status
   kubectl describe httproute <route-name> -n <namespace>

   # Check Gateway status
   kubectl describe gateway main-gateway -n cilium-system

   # Check backend service
   kubectl describe service <service-name> -n <namespace>
   ```

2. **TLS Issues**

   ```bash
   # Check certificate status
   kubectl describe certificate <certificate-name> -n <namespace>

   # Check secret existence
   kubectl get secret <secret-name> -n <namespace>

   # Check TLS configuration
   kubectl describe gateway main-gateway -n cilium-system
   ```

3. **Load Balancer Issues**

   ```bash
   # Check load balancer status
   kubectl get ciliumloadbalancerippool -n cilium-system

   # Check L2 announcements
   kubectl get ciliuml2announcementpolicy -n cilium-system

   # Check IP allocation
   kubectl describe service <service-name> -n <namespace>
   ```

### Health Checks

```bash
# Check gateway status
kubectl get gateway -n cilium-system

# Check HTTPRoute status
kubectl get httproute -A

# Check load balancer health
kubectl get ciliumloadbalancerippool -n cilium-system

# Check certificate health
kubectl get certificate -A
```

### Log Analysis

```bash
# Gateway controller logs
kubectl logs -n cilium-system deployment/cilium-operator

# Cilium agent logs
kubectl logs -n kube-system daemonset/cilium

# Envoy proxy logs (if applicable)
kubectl logs -n cilium-system -l io.cilium.gateway/owning-gateway=main-gateway
```

## Best Practices

### Configuration Management

1. **Route Organization**: Organize routes by application and team
2. **Certificate Management**: Use wildcard certificates where appropriate
3. **Security Policies**: Implement security policies at the gateway level
4. **Monitoring**: Monitor gateway performance and health

### Operations

1. **Traffic Monitoring**: Monitor traffic patterns and performance
2. **Capacity Planning**: Plan for traffic growth and scaling
3. **Backup Strategy**: Backup gateway configurations
4. **Documentation**: Document routing and security policies

### Security

1. **TLS Configuration**: Use strong TLS configurations
2. **Access Control**: Implement least privilege access
3. **Certificate Management**: Regular certificate rotation
4. **Audit**: Regular security audits and reviews

## Resource Requirements

Resource limits and requests are configured in the Gateway manifests.

## External Resources

- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
- [Cilium Gateway Documentation](https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/)
- [HTTPRoute API Reference](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- [TLS Configuration Guide](https://gateway-api.sigs.k8s.io/guides/tls/)
- [Traffic Management](https://gateway-api.sigs.k8s.io/guides/traffic-splitting/)
