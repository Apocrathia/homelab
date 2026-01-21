# Security Policy

## Reporting a Vulnerability

This is my personal homelab. If you find a security issue, message me with what you found, how to reproduce it, and how bad you think it is. If you can't figure out how to message me, then get better at OSINT.

## What's in Place

- Gitleaks scans commits for secrets (pre-commit hooks + CI)
- kube-linter checks manifests for security issues
- Renovate keeps dependencies updated
- 1Password Operator handles secrets (nothing hardcoded)

## Out of Scope

Report these to the upstream maintainers instead:

- Third-party apps deployed via Helm charts
- Talos Linux itself
- Proxmox vulnerabilities

## Response Time

I'll try to respond within a few days. Fix timeline depends on severity.
