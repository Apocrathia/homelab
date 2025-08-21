# Bootstrap Configuration

This directory contains the initial Flux configuration and core components needed to bootstrap the cluster.

> **Navigation**: [← Back to Flux README](../README.md)

## Overview

The bootstrap layer provides the foundational components required to establish GitOps-based cluster management:

- **Flux System**: Core GitOps toolkit components and controllers
- **Helm Repositories**: Chart repository definitions for all components
- **Custom Resource Definitions**: CRDs for extended Kubernetes APIs
- **1Password Connect**: Secrets management and operator deployment

## Components

### Core Infrastructure

- [**Flux System**](flux-system/README.md) - GitOps toolkit components and Git repository configuration
- [**1Password Connect**](1password/README.md) - Secrets management operator and setup guide

### Package Management

- [**Helm Repositories**](helm/README.md) - Chart repository configuration and management
- [**Custom Resource Definitions**](crds/README.md) - Extended Kubernetes API definitions

## Architecture

The bootstrap process follows this sequence:

1. **Flux System Deployment**: Core controllers and Git repository configuration
2. **CRD Installation**: Custom resource definitions for extended APIs
3. **Helm Repository Setup**: Chart repository definitions for package management
4. **1Password Integration**: Secrets management operator deployment
5. **Root Kustomization**: Bootstrap of all other layers

## Dependencies

- **Kubernetes Cluster**: Running cluster with Cilium CNI
- **Git Repository**: Accessible Git repository for configuration storage
- **1Password Account**: 1Password account for secrets management
- **Network Access**: Outbound access to Helm repositories and container registries

## Security Considerations

- **Git Access**: SSH key-based authentication for Git repository access
- **Secrets Management**: 1Password integration for secure secret storage
- **RBAC**: Minimal required permissions for bootstrap operations
- **Network Security**: Controlled access to external resources

## Troubleshooting

### Common Bootstrap Issues

1. **Git Repository Access**

   ```bash
   # Check Git repository connectivity
   kubectl exec -n flux-system deployment/source-controller -- ssh -T git@gitlab.com

   # Verify SSH key configuration
   kubectl get secret flux-system -n flux-system -o yaml
   ```

2. **CRD Installation Failures**

   ```bash
   # Check CRD status
   kubectl get crd | grep -E "(flux|onepassword|kyverno|longhorn|cilium)"

   # Verify CRD installation order
   kubectl get kustomizations -n flux-system
   ```

3. **1Password Integration Issues**

   ```bash
   # Check 1Password operator status
   kubectl get pods -n onepassword-system

   # Verify credentials secret
   kubectl get secret 1password-credentials -n onepassword-system
   ```

### Verification Commands

```bash
# Check overall bootstrap status
flux check

# Verify Flux system components
kubectl get pods -n flux-system

# Check Git repository status
flux get sources git

# Verify 1Password operator
kubectl get pods -n onepassword-system
```

## Best Practices

### Bootstrap Configuration

1. **Minimal Footprint**: Include only essential components
2. **Security First**: Secure Git access and secrets management
3. **Documentation**: Document all manual setup steps
4. **Testing**: Test bootstrap process in development environment

### Maintenance

1. **Version Updates**: Keep Flux components updated
2. **Security Audits**: Regular security review of bootstrap components
3. **Backup Strategy**: Backup bootstrap configurations
4. **Monitoring**: Monitor bootstrap component health

## Next Steps

After successful bootstrap:

1. **Infrastructure Layer**: Deploy storage, networking, and monitoring
2. **Services Layer**: Deploy platform services and applications
3. **Applications Layer**: Deploy user-facing applications

## External Resources

- [Flux Bootstrap Guide](https://fluxcd.io/flux/installation/bootstrap/)
- [GitOps Toolkit Documentation](https://fluxcd.io/flux/)
- [1Password Connect Documentation](https://developer.1password.com/docs/connect)
- [Kubernetes CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
