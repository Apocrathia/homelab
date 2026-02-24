# AGENTS.md

## What this is

A Kubernetes homelab managed through GitOps. Talos Linux VMs on Proxmox, Flux CD for continuous deployment, Cilium for networking, Longhorn for storage, 1Password for secrets. 50+ services across media, AI, productivity, social, and more.

The full stack and architecture are documented in [README.md](./README.md).

## How to behave

- No-nonsense, peer-to-peer tone. Treat the user as an expert.
- Terse yet accurate. Get to the point.
- Profanity encouraged. Don't hold back.
- No chit-chat. Skip introductions and pleasantries.
- Evidence-based analysis. Multiple data points before conclusions. Don't speculate.
- Ask clarifying questions when context is unclear or requirements are ambiguous.

Read `.cursor/rules/` for the full behavioral and domain-specific guidelines. Every rule file there applies. The rest of this document gives you the broad strokes.

## What you can and can't do

**Do freely:**

- Read files, explore the codebase, search for anything
- Run shell commands (validation, linting, scanning, querying)

- Install dev dependencies locally
- Run security scans
- Propose changes and present options

**Requires explicit permission:**

- Modifying live cluster resources (`kubectl apply`, `kubectl delete`, `flux reconcile`, etc.)
- Making git commits or pushing to remote
- Any destructive or irreversible action

The line is simple: explore and validate all you want. Don't touch anything live without asking.

## Project structure

```
flux/manifests/
├── 01-bootstrap/       # Flux, Helm repos, 1Password Connect
├── 02-infrastructure/  # Cilium, Longhorn, Prometheus, CoreDNS
├── 03-services/        # Authentik, cert-manager, GitLab, Kyverno, PostgreSQL
├── 04-apps/            # User-facing applications (media, AI, productivity, etc.)
└── kustomization.yaml  # Root - references all flux-kustomization.yaml files
talos/                  # Talos Linux cluster configuration
helm/                   # Custom Helm charts (generic-app)
```

New components go in the appropriate layer directory with a `flux-kustomization.yaml`, then get added to the root `kustomization.yaml`.

## Non-negotiable decisions

- **GitOps or GTFO.** Everything goes through Flux. Manifests in Git are the source of truth.
- **1Password Item CRs for secrets.** Never create native Kubernetes Secret resources. Never embed secrets as base64 in source. Use Flux's `fromValues` to reference secret values.
- **Gateway API only.** No traditional Ingress resources. If you find old ones, flag them.
- **Pinned image versions.** No `latest` tags. Pin to explicit semantic versions (e.g., `v1.2.3`). Prefer immutable tags or digests when available. Renovate handles version bumps — add Renovate comments so versions get tracked.
- **Kustomize overlays, not duplication.** Reference existing resource directories instead of copying files.
- **Conventional Commits.** All commit messages follow the spec.
- **Manifests are the documentation.** Don't duplicate tunable configuration values (resource limits, replica counts, volume sizes) in docs. They belong in manifests only.

## Validation

Before proposing changes, validate locally:

- `prettier -w <file>` - format code
- `kubectl kustomize <dir>` - validate kustomize output
- `yq '.spec.values' <helmrelease.yaml> | helm template <release> <chart> -f -` - validate HelmRelease values
- Run security scans after any dependency or manifest changes. Re-scan after fixes.

## Detailed rules

The `.cursor/rules/` directory contains domain-specific guidance. Read the relevant rule before working in that area.

| Rule                               | Scope           | Covers                                                                               |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `general.mdc`                      | Always          | Personality, project structure, workflow, documentation standards, quality assurance |
| `security.mdc`                     | Always          | Security scanning workflow, finding remediation, scan-on-change policy               |
| `secrets.mdc`                      | Always          | Secret patterns to flag, file types to check, 1Password best practices               |
| `flux.mdc`                         | `flux/*`        | Directory structure, Flux/Kustomize guidelines, deployment process, security         |
| `helm.mdc`                         | `helm/*`        | Template logic, volume management, values structure, testing                         |
| `talos.mdc`                        | `talos/*`       | Talos Linux configuration, networking, security baseline, maintenance                |
| `renovate.mdc`                     | `renovate.json` | Renovate bot configuration, regex manager format                                     |
| `python.mdc`                       | `**/*.py`       | Toolchain (uv/ruff), style, type hints, async patterns, security                     |
| `conventional-commit-messages.mdc` | On request      | Conventional Commits specification for commit messages                               |
| `humanizer.mdc`                    | `**/*.md`       | Removing AI writing patterns from documentation                                      |
