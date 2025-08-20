# GitLab CI for Kustomize Diff and Kubeconform

Self-contained CI jobs for previewing Kustomize changes and validating rendered manifests.

## Pipeline layout

- Root pipeline: `.gitlab-ci.yml`
  - Defines stages and shared variables (e.g., `KUSTOMIZE_DIR`)
  - Includes the two job files below
- Jobs:
  - `.gitlab/kustomize-diff.gitlab-ci.yml` → job `kustomize-diff`
  - `.gitlab/kubeval.gitlab-ci.yml` → job `kubeval`

Stage: `verify`

## Jobs overview

### kustomize-diff (Kustomize diff)

- Purpose: Show a unified diff between the base branch and the current change for each impacted Kustomize root
- How it works:
  - Finds changed files under `DIFF_INCLUDE` (defaults to `flux/manifests`)
  - Walks up to the nearest directory containing `kustomization.yaml`
  - Renders base from `origin/$CI_DEFAULT_BRANCH` in a temporary worktree
  - Renders target from `HEAD`
  - Diffs the two rendered outputs and prints the result in job logs
  - Emits a dotenv artifact with `CHANGED_DIRS` (space-separated list of roots)
- Rendering flags: `kustomize build --enable-helm --load-restrictor LoadRestrictionsNone`

### kubeval (Kubeconform validation)

- Purpose: Validate rendered manifests for all changed Kustomize roots
- How it works:
  - Consumes `CHANGED_DIRS` from the `kustomize-diff` job artifact
  - Builds each root with Kustomize and pipes to `kubeconform`
  - Flags set: `-strict -ignore-missing-schemas -summary`
  - Optional: set `KUBECONFORM_SCHEMA_LOCATION` to point at custom schema URLs/paths

## Configuration knobs (CI variables)

- Global (in `.gitlab-ci.yml`):
  - `KUSTOMIZE_DIR`: default path for validation when no changes are detected (default: `flux/manifests`)
- kustomize-diff:
  - `DIFF_TARGET_DIR`: fallback Kustomize root when no changes detected (default: `flux/manifests`)
  - `DIFF_SCAN_PATH`: path filter for change detection (default: `flux/manifests`)
  - `DIFF_EXCLUDE`: regex for excluding changed files from diff roots (default: empty)
  - `DIFF_ENV_FILE`: name of the dotenv artifact file (default: `kustomize-diff.env`)
- kubeval:
  - `KUBECONFORM_FLAGS`: additional flags for kubeconform (default: `-strict -ignore-missing-schemas -summary`)
  - `KUBECONFORM_SCHEMA_LOCATION`: custom schema base(s) (e.g., `-schema-location default -schema-location <url or path>`)

Override any of these via GitLab CI/CD Variables at pipeline, project, or group scope.

## Typical usage

1. Open a Merge Request
2. Pipeline runs the `verify` stage
3. Inspect `kustomize-diff` job logs for the rendered diff per Kustomize root
4. Inspect `kubeval` job logs for schema validation results

Note: These jobs do not post MR comments; results live in job logs. If you want MR comments, we can add a small helper job that posts the diff/summary as a comment.

## Notes and caveats

- Kustomize Helm support is enabled, but this repo primarily uses Flux `HelmRelease` CRDs. Those are treated as regular resources in the diff/validation (they are not rendered into chart output by CI).
- `--load-restrictor LoadRestrictionsNone` is used to allow remote bases.
- `kubeconform` runs with `-ignore-missing-schemas` to avoid failing on CRDs without published schemas. Provide schema locations and remove that flag if you want stricter validation.

## Troubleshooting

- No changed roots detected: `kustomize-diff` falls back to `DIFF_TARGET_DIR`.
- Remote bases fail to fetch: ensure network access in runners, or vendor remote bases locally.
- Helm charts not rendering: only Kustomize-native helm rendering is supported. Flux `HelmRelease` is not rendered by these jobs.
