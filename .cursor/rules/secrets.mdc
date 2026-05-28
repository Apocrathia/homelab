---
globs: **/*.yaml,**/*.yml,**/*.tf,**/*.env,**/*.json,**/*.sh,**/*.conf
alwaysApply: false
description: Secret patterns to flag, file types to check, 1Password best practices
---

# Secrets Management Rules

## Patterns to Flag

The following patterns should be flagged as potential secrets:

```regex
# API Keys and Tokens
(?i)(api[_-]?key|token|secret)['\"]?\s*[:=]\s*['\"]\S+['\"]
(?i)(bearer|jwt|oauth).{0,20}['\"]\S+['\"]

# Passwords and Credentials
(?i)password['\"]?\s*[:=]\s*['\"]\S+['\"]
(?i)(pass|pwd|passwd)['\"]?\s*[:=]\s*['\"]\S+['\"]

# Private Keys and Certificates
-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----
-----BEGIN\s+CERTIFICATE-----

# Environment Variables
(?i)env['\"]?\s*[:=]\s*['\"]\S+['\"]

# Database Connection Strings
(?i)(jdbc|mongodb|postgresql|mysql).*[:=].*password
```

## File Patterns to Check

- `*.yaml`, `*.yml`: Kubernetes manifests and configurations
- `*.tf`: Terraform HCL (no `*.tfvars` in this tree; treat them the same if you add any)
- `*.env`, `*.env.*`: Environment files
- `*.json`: Configuration files
- `*.sh`: Shell scripts
- `*.conf`: Embedded config snippets (no tracked `*.config` / `*.properties` here; same rules apply if they appear)

## Exceptions

- `*.example`, `*.template`: Template files can contain placeholder values
- `*test*`: Test files with mock values
- `.gitignore`: File patterns to ignore
- `README.md`: Documentation with examples

## Best Practices

1. Use 1Password Item Custom Resources (CR) for secret management
2. Store sensitive values in external secret management systems
3. Use environment variables for local development
4. Template files should use placeholders like `${SECRET_NAME}`
5. Use 1Password Item CRs for cluster configuration instead of native Kubernetes secrets
6. Reference secrets in manifests using Flux's fromValues function, never include the actual values
7. **Never embed secrets as base64-encoded values** in source code - remove any secret handling that does so

## Enforcement

- All files should be scanned before commit
- CI/CD pipelines should include secret scanning
- Developers should use pre-commit hooks for local validation
- Regular audits of committed files
- **After making changes in any package dependency/manifest files, scan the project for security vulnerabilities**
- Apply security fixes only according to the desired version reported by the scanner

## Remediation

If secrets are accidentally committed:

1. Immediately rotate the exposed credentials
2. Remove the secret from git history
3. Update all systems using the exposed secret
4. Document the incident and update procedures
