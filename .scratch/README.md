# `.scratch/` — agent ephemeral workspace

Use this directory for temporary files during agent work: extracted Helm values, rendered manifests, chart downloads, one-off scripts, dump staging, etc.

## Rules

- Prefer **`.scratch/`** over **`/tmp`**. Files here stay in the workspace, so shell sandboxing and review stay sane.
- Do **not** commit contents of this directory. Git ignores everything under `.scratch/` except this README.
- Clean up when finished (`rm` / `mv` confined to `.scratch/` is allowed by the shell guard without an extra approval). Prefer leaving clutter over deleting paths outside `.scratch/`.
- Do **not** put secrets here. Prefer 1Password Item CRs and never write credentials to disk for convenience.
- Manifests under `.scratch/` are for local apply / validation only — never commit them as recovery YAML.

## Examples

```bash
yq '.spec.values' flux/manifests/04-apps/example/helmrelease.yaml > .scratch/example-helm-values.yaml
helm template example helm/generic-app -f .scratch/example-helm-values.yaml --namespace example
```

```bash
# chart review during helm-deployment skill
mkdir -p .scratch/charts
helm pull oci://… --untar --untardir .scratch/charts
```
