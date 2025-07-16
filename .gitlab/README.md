# GitLab CI/CD Kubernetes Validation

This directory contains GitLab CI/CD pipelines for validating Kubernetes manifests and Flux configurations.

## Jobs Overview

### `flux-validate` (Automatic)

- **Trigger**: Runs automatically on merge requests and manually on main branch
- **Purpose**: Validates that all Flux kustomizations can build successfully
- **Output**: Posts results as MR comments showing:
  - ✅/❌ Build status for each layer
  - 📋 Preview of changes that would be applied
  - 🎉 Overall pass/fail status

### `cluster-validate` (Manual)

- **Trigger**: Manual trigger only
- **Purpose**: Tests manifests against the actual cluster using server-side dry-run
- **Output**: Posts results as MR comments showing:
  - ✅/❌ Server-side validation results
  - ⚠️ Policy warnings from Kyverno or other admission controllers
  - 🔍 Detailed validation logs

## Example MR Comments

**Successful validation:**

```
✅ **Kubernetes Validation Passed** 🎉

✅ **Flux Validation Results**

✅ **Main kustomization builds successfully**
✅ **bootstrap layer**: builds successfully
✅ **infrastructure layer**: builds successfully
✅ **services layer**: builds successfully
✅ **apps layer**: builds successfully

📋 **Changes Preview**: No changes detected
```

**Failed validation:**

```
❌ **Kubernetes Validation Failed** ⚠️

❌ **apps layer**: build failed
```

spec.template.spec.containers[0].image: Invalid value: "nginx:latest": using latest tag is not allowed

```

## Features

- **GitOps-first**: Uses Flux CLI for validation, ensuring compatibility
- **Rich feedback**: Detailed MR comments with emojis and formatting
- **Secure**: Uses GitLab's built-in `CI_JOB_TOKEN` for API access
- **Cluster-aware**: Optional server-side validation against real cluster policies
- **Layered validation**: Tests each bootstrap layer independently

## Configuration

The validation jobs use your existing:
- GitLab Agent for cluster access
- Flux kustomization structure
- Pre-commit hooks for basic linting

No additional configuration needed!

## Usage

1. **Create a merge request** → `flux-validate` runs automatically
2. **Check MR comments** → See validation results inline
3. **Optional**: Click "Run" on `cluster-validate` for server-side testing
4. **Merge when green** → All validations pass

## Troubleshooting

- **No MR comments**: Check that the job has GitLab API access
- **Build failures**: Review the detailed error logs in job output
- **Cluster validation fails**: Ensure GitLab Agent has proper cluster access
```
