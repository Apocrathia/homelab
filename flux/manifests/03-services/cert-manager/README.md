# Cert Manager

Kubernetes add-on that automates TLS certificate issuance, renewal, and management.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

cert-manager automates certificate management:

- Automatic issuance and renewal before expiration
- Let's Encrypt, private CA, and self-signed issuers
- Automatic DNS-01 challenge solving
- Kubernetes-native CRD management

## Architecture

### Core components

The **cert-manager controller** manages Certificate, Issuer, and
ClusterIssuer resources, solves ACME challenges, and drives issuance and
renewal.

**cainjector** injects CA data into webhooks and manages CA certificate
secrets and trust bundles.

**webhook** validates Certificate and Issuer resources at admission.

### Custom resources

**Certificate** requests an X.509 certificate: private key generated
automatically, multiple DNS SANs, configurable key usage.

**Issuer/ClusterIssuer** declares the signing authority: ACME (Let's
Encrypt), private CA, self-signed, or Vault.

**CertificateRequest** carries per-request state and the manual approval
workflow for private CAs.

## 1Password Setup

Before deploying cert-manager, create the Cloudflare API token in 1Password:

1. In your 1Password vault, create a new item called `cloudflare-api-token-secret`
2. Add this field:
   - **Field Label**: `api-token` | **Value**: `your-cloudflare-api-token`

The 1Password Connect Operator will automatically create a Kubernetes secret with this token for DNS-01 challenge solving.

## Features

### Certificate types

- TLS server, client-auth, CA, and self-signed certificates

### Issuing authorities

- Let's Encrypt (staging and production), private CAs, self-signed, and external issuer integrations

### Challenge types

- HTTP-01 and DNS-01 (recommended); self-signed needs no challenge

## Configuration

### ClusterIssuers

All three issuers live in `cluster-issuer.yaml` (don't duplicate their specs
here; they drift):

| Issuer                | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `letsencrypt-staging` | Staging ACME: test issuance before switching to prod |
| `letsencrypt-prod`    | Production ACME certificates                         |
| `self-signed`         | Self-signed CA for internal/dev certificates         |

Both Let's Encrypt issuers solve DNS-01 challenges against Cloudflare with the
`cloudflare-api-token-secret` 1Password-backed secret (`api-token` field).

### Certificate Examples

**Wildcard Certificate**

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

**Gateway Certificate**

The `main-gateway` wildcard lives in
[`03-services/gateway/gateway-cert.yaml`](../gateway/gateway-cert.yaml):
`gateway-services-apocrathia-com-tls` in namespace `cert-manager`, issued by
`letsencrypt-prod`, consumed by the Gateway listener through a ReferenceGrant.

## Integration with Homelab

### Gateway API integration

- Certificates for Gateway listeners and routes (this repo uses Gateway API only, no Ingress)
- Automatic provisioning and renewal against DNS-01 validation

### Application integration

- mTLS service certificates and client-certificate validation
- Private CA for internal services

### DNS integration

- Cloudflare DNS-01 challenge solving
- API token stored securely; multiple zones and configurable propagation waits

### Monitoring integration

- Prometheus metrics and Grafana dashboards for certificate status
- Expiration alerts and validity monitoring

## Security Considerations

### Certificate security

- Private keys stored securely, rotated and renewed automatically
- Chain validation and revocation checking

### DNS security

- DNS API tokens stored securely
- DNS-01 validation, limited zone access, automatic challenge cleanup

### Network security

- TLS for certificate operations, network policies restricting management traffic
- Secure communication with certificate authorities; audit logging

## Troubleshooting

### Common issues

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

## References

- **[cert-manager Documentation](https://cert-manager.io/docs/)** - Official documentation
- **[Let's Encrypt](https://cert-manager.io/docs/configuration/acme/)** - ACME integration
- **[DNS-01 Challenge](https://cert-manager.io/docs/configuration/acme/dns01/)** - DNS challenge setup

## Best Practices

### Certificate management

1. Test with the staging issuer first
2. Prefer DNS-01 over HTTP-01 challenges
3. Use wildcards deliberately, not for everything
4. Watch expiration dates

### DNS configuration

1. Restricted API tokens
2. Appropriate propagation times
3. Organized zones and limited DNS API access

### Operations

1. Appropriate resource limits
2. Lifecycle monitoring
3. Back up certificate configurations
4. Keep cert-manager updated

### Security

1. Secure private key handling
2. Validate certificate chains
3. Least-privilege access
4. Regular audits of certificate practices

## Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.
