---
alwaysApply: true
description: Security scanning workflow, secret hygiene, and core security principles
---

# Security

## Scan-on-change

- On **any code change**, run the project's configured security tooling ASAP (secrets scan, SAST on changed files, dependency/manifest scan, IaC checks when relevant).
- **After making changes in any package dependency or manifest files**, scan the project for security vulnerabilities.
- **Report findings immediately in-editor** with severity, file/line, and minimal repro.
- Apply **only** fixes explicitly recommended by the scanner that are **scoped to the current change**; list unrelated findings but **do not modify** code for them.
- Apply security fixes only according to the desired version reported by the scanner.
- After applying a fix, **re-scan** to verify the issue is resolved.
- If a tool errors or times out, **surface the error** and do not assume success.
- Prefer **incremental/fast scans** on save and **full scans** on pre-push.

## Core principles

- **Never commit secrets** or sensitive data to the repository. See `secrets.mdc` for patterns when editing config files.
- **Use 1Password Item Custom Resources** to manage secrets — not native Kubernetes Secret resources.
- Follow the principle of **least privilege**.
- Implement proper access controls and RBAC.
- Keep all components up to date with security patches (Renovate handles version bumps).
- Regularly audit security configurations.
