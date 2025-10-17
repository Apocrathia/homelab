# Helm Repository Management

This directory contains the configuration for Helm repositories used across the homelab cluster.

> **Navigation**: [← Back to Bootstrap README](../README.md)

## Overview

Helm repositories provide access to packaged applications and services. This setup manages repository configuration through Flux's `HelmRepository` resources, ensuring:

- Centralized repository management
- Version consistency across deployments
- Automated repository synchronization
- Security through trusted sources

## Repository Configuration

### Core Infrastructure Repositories

#### 1Password (`1password.yaml`)

- **Repository**: `https://1password.github.io/connect-helm-charts`
- **Purpose**: 1Password Connect and Operator deployment
- **Update Interval**: 2 hours
- **Usage**: Secrets management and operator deployment

#### Cilium (`cilium.yaml`)

- **Repository**: `https://helm.cilium.io`
- **Purpose**: CNI, networking, and security
- **Update Interval**: 30 minutes
- **Usage**: Network policies, load balancing, service mesh

#### Longhorn (`longhorn.yaml`)

- **Repository**: `https://charts.longhorn.io`
- **Purpose**: Distributed block storage
- **Update Interval**: 30 minutes
- **Usage**: Persistent volumes, backup, disaster recovery

### Platform Services

#### Authentik (`authentik.yaml`)

- **Repository**: `https://charts.goauthentik.io`
- **Purpose**: Identity and access management
- **Update Interval**: 30 minutes
- **Usage**: SSO, OAuth, LDAP integration

#### Cert Manager (`cert-manager.yaml`)

- **Repository**: `https://charts.jetstack.io`
- **Purpose**: Certificate management
- **Update Interval**: 30 minutes
- **Usage**: TLS certificates, ACME integration

#### Kyverno (`kyverno.yaml`)

- **Repository**: `https://kyverno.github.io/kyverno`
- **Purpose**: Policy management and compliance
- **Update Interval**: 30 minutes
- **Usage**: Security policies, compliance checks

### Monitoring and Observability

#### Prometheus Community (`prometheus-community.yaml`)

- **Repository**: `https://prometheus-community.github.io/helm-charts`
- **Purpose**: Monitoring stack components
- **Update Interval**: 30 minutes
- **Usage**: Prometheus, Alertmanager, exporters

#### Grafana (`grafana.yaml`)

- **Repository**: `https://grafana.github.io/helm-charts`
- **Purpose**: Visualization and dashboards
- **Update Interval**: 30 minutes
- **Usage**: Loki, Mimir, Alloy integration

### Development and Operations

#### GitLab (`gitlab.yaml`)

- **Repository**: `https://charts.gitlab.io`
- **Purpose**: GitLab Agent and Runner
- **Update Interval**: 30 minutes
- **Usage**: CI/CD integration, GitOps automation

#### Metrics Server (`metrics-server.yaml`)

- **Repository**: `https://kubernetes-sigs.github.io/metrics-server`
- **Purpose**: Resource metrics collection
- **Update Interval**: 30 minutes
- **Usage**: Horizontal Pod Autoscaling, resource monitoring

### Security and Compliance

#### Aqua Security (`aqua.yaml`)

- **Repository**: `https://aquasecurity.github.io/helm-charts`
- **Purpose**: Security scanning and compliance
- **Update Interval**: 30 minutes
- **Usage**: Trivy Operator, vulnerability scanning

#### Bitnami (`bitnami.yaml`)

- **Repository**: `https://charts.bitnami.com/bitnami`
- **Purpose**: Application packaging
- **Update Interval**: 30 minutes
- **Usage**: Supporting components and utilities

### Storage and Integration

#### CSI Driver SMB (`csi-driver-smb.yaml`)

- **Repository**: `https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts`
- **Purpose**: SMB storage integration
- **Update Interval**: 30 minutes
- **Usage**: Windows file share mounting

#### MinIO (`minio.yaml`)

- **Repository**: `https://charts.min.io`
- **Purpose**: S3-compatible object storage
- **Update Interval**: 30 minutes
- **Usage**: Backup storage, object storage

## Repository Management

### Update Strategy

Repositories are configured with different update intervals based on:

- **Critical infrastructure**: 30-minute intervals (cilium, longhorn, cert-manager)
- **Standard services**: 30-minute intervals (most repositories)
- **Security tools**: 2-hour intervals (1password for stability)

### Security Considerations

- All repositories use HTTPS
- Repository authenticity verified through Helm
- Chart signatures validated where available
- Access controlled through network policies

### Version Management

- **Automatic Updates**: Flux manages repository synchronization
- **Version Pinning**: HelmReleases specify exact chart versions
- **Renovate Integration**: Automated dependency updates
- **Rollback Support**: Version history maintained

## Integration with Flux

The repository configuration integrates with Flux through:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 30m
  url: https://helm.cilium.io
```

### Dependency Chain

Repository availability affects:

- HelmRelease reconciliation
- Chart version resolution
- Deployment rollouts
- Security updates

## Monitoring and Troubleshooting

### Health Checks

```bash
# Check repository status
kubectl get helmrepositories -n flux-system

# Check repository synchronization
kubectl describe helmrepository <name> -n flux-system

# Verify chart availability
helm search repo <repository-name>
```

### Common Issues

1. **Repository Sync Failures**

   ```bash
   # Check Flux logs
   kubectl logs -n flux-system deployment/source-controller

   # Manual sync
   flux reconcile source helm <repository-name>
   ```

2. **Network Connectivity**

   ```bash
   # Test repository access
   curl -I https://helm.cilium.io/index.yaml

   # Check DNS resolution
   nslookup helm.cilium.io
   ```

3. **Certificate Issues**
   ```bash
   # Verify certificate chain
   openssl s_client -connect helm.cilium.io:443 -servername helm.cilium.io
   ```

### Repository Metrics

Repositories are monitored through:

- **Flux source metrics**
- **Repository sync duration**
- **Chart download success rate**
- **Error rates and retry counts**

## Best Practices

### Repository Management

1. **Regular Updates**: Keep repository URLs current
2. **Security Verification**: Validate repository authenticity
3. **Access Control**: Implement network policies
4. **Monitoring**: Track repository health and availability

### Chart Selection

1. **Version Consistency**: Use stable chart versions
2. **Security Scanning**: Scan charts for vulnerabilities
3. **Documentation Review**: Verify chart documentation
4. **Community Support**: Prefer well-maintained charts

### Maintenance

1. **Backup Strategy**: Document repository configurations
2. **Change Management**: Use GitOps for repository changes
3. **Testing**: Validate changes in development first
4. **Documentation**: Keep repository documentation current

## External Resources

- [Helm Repository Guide](https://helm.sh/docs/topics/chart_repository/)
- [Flux Helm Repository Documentation](https://fluxcd.io/flux/components/source/helmrepositories/)
- [Artifact Hub](https://artifacthub.io/) - Chart discovery
- [Helm Security Guide](https://helm.sh/docs/topics/security/)
