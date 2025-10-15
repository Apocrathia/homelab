# [Application Name]

[Brief description - 1-2 sentences explaining what the application does and its purpose in the homelab.]

> **Navigation**: [← Back to [Category] README](../README.md)

## Documentation

- **[Official Documentation](https://example.com/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/example/repo)** - Source code and issues
- **[Helm Chart](https://github.com/example/helm-charts)** - Deployment configuration

## Overview

This deployment includes:

- [Key feature 1]
- [Key feature 2]
- [Key feature 3]
- [Integration details]

## Configuration

### 1Password Secrets

Create a 1Password item:

#### [app-name]-secrets (`vaults/Secrets/items/[app-name]-secrets`)

- `[secret-key]`: [Description of what this secret is used for]
- `[another-key]`: [Description]

### Storage

- **[Storage Type]**: [Description of storage usage]
- **[Another Storage]**: [Description]

### Access

- **External URL**: `https://[app-name].gateway.services.apocrathia.com`
- **Internal Service**: `http://[app-name].[namespace].svc.cluster.local:[port]`

## Authentication

[If applicable - describe how authentication works]

Authentication is handled through [method]:

1. **[Step 1]**: [Description]
2. **[Step 2]**: [Description]

## Security Considerations

[If applicable - security-specific notes]

- **[Security Aspect]**: [Description]
- **[Another Aspect]**: [Description]

## Troubleshooting

### Common Issues

1. **[Issue Type]**

   ```bash
   # Check [component] status
   kubectl -n [namespace] get [resource]

   # View logs
   kubectl -n [namespace] logs -l [selector]
   ```

2. **[Another Issue]**

   ```bash
   # Diagnostic command
   kubectl -n [namespace] describe [resource] [name]
   ```

### Health Checks

```bash
# Overall status
kubectl -n [namespace] get pods,svc,pvc

# Specific component
kubectl -n [namespace] get [resource] -l [selector]
```
