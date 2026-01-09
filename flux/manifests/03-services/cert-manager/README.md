# Cert Manager - Certificate Management

Kubernetes add-on to automate the management and issuance of TLS certificates.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[cert-manager Documentation](https://cert-manager.io/docs/)** - Official documentation
- **[Let's Encrypt](https://cert-manager.io/docs/configuration/acme/)** - ACME integration
- **[DNS-01 Challenge](https://cert-manager.io/docs/configuration/acme/dns01/)** - DNS challenge setup

## Overview

cert-manager automates certificate management with:

- **Automatic Certificate Issuance**: Automated TLS certificate provisioning
- **Multiple Issuers**: Support for Let's Encrypt, private CAs, and self-signed
- **DNS Integration**: Automatic DNS-01 challenge solving
- **Certificate Renewal**: Automatic certificate renewal before expiration
- **CRD-Based Management**: Kubernetes-native certificate management

## Architecture

### Core Components

#### cert-manager Controller

- **Certificate Management**: Manages Certificate resources
- **Issuer Management**: Handles Issuer and ClusterIssuer resources
- **Challenge Solving**: Handles ACME challenge responses
- **Certificate Lifecycle**: Manages certificate issuance and renewal

#### cainjector

- **Webhook Injection**: Injects CA data into webhooks
- **Secret Management**: Manages CA certificate secrets
- **Trust Bundle Management**: Manages trusted certificate bundles

#### webhook

- **Validation**: Validates Certificate and Issuer resources
- **Admission Control**: Kubernetes admission webhook
- **Resource Validation**: Ensures resource correctness

### Custom Resources

#### Certificate

- **TLS Certificates**: X.509 certificate management
- **Private Keys**: Automatic private key generation
- **Subject Alternative Names**: Support for multiple DNS names
- **Key Usage**: Configurable certificate usage extensions

#### Issuer/ClusterIssuer

- **ACME Issuers**: Let's Encrypt integration
- **CA Issuers**: Private certificate authority
- **Self-Signed Issuers**: Self-signed certificate generation
- **Vault Issuers**: HashiCorp Vault integration

#### CertificateRequest

- **Request Processing**: Internal certificate request processing
- **Status Tracking**: Certificate request status management
- **Approval Workflow**: Manual approval for private CAs

## 1Password Setup

Before deploying cert-manager, create the Cloudflare API token in 1Password:

1. In your 1Password vault, create a new item called `cloudflare-api-token-secret`
2. Add this field:
   - **Field Label**: `api-token` | **Value**: `your-cloudflare-api-token`

The 1Password Connect Operator will automatically create a Kubernetes secret with this token for DNS-01 challenge solving.

## Features

### Certificate Types

- **TLS Certificates**: Standard TLS server certificates
- **Client Certificates**: Client authentication certificates
- **CA Certificates**: Certificate authority certificates
- **Self-Signed**: Self-signed certificates for internal use

### Issuing Authorities

- **Let's Encrypt**: Public certificate authority with staging/production
- **Private CA**: Internal certificate authorities
- **Self-Signed**: Generated certificates for development/testing
- **External Issuers**: Integration with external certificate services

### Challenge Types

- **HTTP-01**: HTTP-based challenge validation
- **DNS-01**: DNS-based challenge validation (recommended)
- **Self-Signed**: No challenge validation required

## Configuration

### ClusterIssuers

#### Let's Encrypt Staging

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@apocrathia.com
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
      - dns01:
          cloudflare:
            email: admin@apocrathia.com
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token
```

#### Let's Encrypt Production

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@apocrathia.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - dns01:
          cloudflare:
            email: admin@apocrathia.com
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token
```

### Certificate Examples

#### Wildcard Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-apocrathia-com
  namespace: cert-manager
spec:
  secretName: wildcard-apocrathia-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: "*.apocrathia.com"
  dnsNames:
    - "*.apocrathia.com"
```

#### Gateway Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gateway-services-tls
  namespace: cilium-secrets
spec:
  secretName: cert-manager-gateway-services-apocrathia-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: "*.gateway.services.apocrathia.com"
  dnsNames:
    - "*.gateway.services.apocrathia.com"
```

## Integration with Homelab

### Gateway API Integration

- **TLS Termination**: Gateway API TLS certificate references
- **Certificate Management**: Automatic certificate provisioning
- **Domain Validation**: DNS-01 challenge solving
- **Certificate Rotation**: Automatic certificate renewal

### Application Integration

- **Ingress TLS**: Automatic TLS for ingress resources
- **Service Certificates**: mTLS between services
- **Client Authentication**: Client certificate validation
- **Certificate Authority**: Private CA for internal services

### DNS Integration

- **Cloudflare DNS**: Automatic DNS challenge solving
- **API Token Management**: Secure API token storage
- **Zone Management**: Support for multiple DNS zones
- **Propagation Waiting**: Configurable DNS propagation waits

### Monitoring Integration

- **Metrics Collection**: Prometheus metrics for certificate status
- **Dashboard Integration**: Grafana dashboards for certificate monitoring
- **Alert Configuration**: Alerts for certificate expiration
- **Health Monitoring**: Certificate health and validity monitoring

## Security Considerations

### Certificate Security

- **Private Key Protection**: Secure private key storage
- **Certificate Validation**: Proper certificate chain validation
- **Revocation Checking**: Certificate revocation list checking
- **Key Rotation**: Automatic key rotation and renewal

### DNS Security

- **API Token Security**: Secure storage of DNS API tokens
- **DNS Spoofing Protection**: DNS-01 challenge validation
- **Zone Access Control**: Limited DNS zone access
- **Challenge Cleanup**: Automatic cleanup of DNS challenges

### Network Security

- **TLS Encryption**: End-to-end encryption for certificate operations
- **Network Policies**: Restrict certificate management traffic
- **API Security**: Secure communication with certificate authorities
- **Audit Logging**: Comprehensive audit trail

## Troubleshooting

### Common Issues

1. **Certificate Issuance Failures**

   ```bash
   # Check certificate status
   kubectl describe certificate <certificate-name> -n <namespace>

   # Check order status
   kubectl describe order <order-name> -n <namespace>

   # Check challenge status
   kubectl describe challenge <challenge-name> -n <namespace>
   ```

2. **DNS Challenge Issues**

   ```bash
   # Check DNS propagation
   dig _acme-challenge.example.com TXT

   # Check Cloudflare API token
   kubectl describe secret cloudflare-api-token-secret -n cert-manager
   ```

3. **Renewal Issues**

   ```bash
   # Check certificate expiration
   kubectl get certificate -A

   # Force renewal
   kubectl delete order <order-name> -n <namespace>
   ```

### Health Checks

```bash
# Check cert-manager status
kubectl get pods -n cert-manager

# Check certificate status
kubectl get certificate -A

# Check issuer status
kubectl get clusterissuer

# Check ACME account status
kubectl get secret letsencrypt-prod -n cert-manager -o yaml
```

### Log Analysis

```bash
# Controller logs
kubectl logs -n cert-manager deployment/cert-manager

# Cainjector logs
kubectl logs -n cert-manager deployment/cert-manager-cainjector

# Webhook logs
kubectl logs -n cert-manager deployment/cert-manager-webhook
```

## Best Practices

### Certificate Management

1. **Staging First**: Always test with staging issuer first
2. **DNS Validation**: Prefer DNS-01 over HTTP-01 challenges
3. **Wildcard Usage**: Use wildcards appropriately, not for everything
4. **Renewal Monitoring**: Monitor certificate expiration dates

### DNS Configuration

1. **API Token Security**: Use restricted API tokens
2. **DNS Propagation**: Configure appropriate propagation times
3. **Zone Management**: Keep DNS zones organized
4. **Access Control**: Limit DNS API access

### Operations

1. **Resource Limits**: Set appropriate resource limits
2. **Monitoring**: Monitor certificate lifecycle events
3. **Backup**: Backup certificate configurations
4. **Updates**: Keep cert-manager updated

### Security

1. **Private Key Management**: Secure private key handling
2. **Certificate Validation**: Validate certificate chains
3. **Access Control**: Implement least privilege access
4. **Audit**: Regular security audits of certificate practices

## Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.
