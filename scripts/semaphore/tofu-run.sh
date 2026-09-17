#!/usr/bin/env bash
# tofu plan/apply runner for Semaphore — mirrors .gitlab/tofu.gitlab-ci.yml.
# Usage: tofu-run.sh <plan|apply> [target]
#   target: --all (default) or a top-level dir under terraform/deployments/
# Env (from the tofu-context Semaphore environment):
#   TF_HTTP_ADDRESS/USERNAME/PASSWORD — GitLab HTTP remote state
#   OP_CONNECT_HOST/TOKEN             — 1Password Connect for tofu secrets
set -euo pipefail

mode="${1:?usage: tofu-run.sh <plan|apply> [ --all | <top-dir> ]}"
target="${2:---all}"

repo="$(cd "$(dirname "$0")/../.." && pwd)"

export TF_IN_AUTOMATION=true
export TG_NO_COLOR=true
# glibc loader + libc staged at /lib64 by the semaphore deployment's
# glibc-stage initContainer (Alpine pod; 1Password provider is glibc-linked).
export LD_LIBRARY_PATH="/lib64${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

# Pinned tofu + terragrunt, same as CI (the pod bundles older versions).
# ci-deps.sh lives outside this hook's file set; it is CI's own bootstrap.
# shellcheck disable=SC1091
. "${repo}/scripts/terraform/ci-deps.sh"
ci_deps_bootstrap

cd "${repo}/terraform/deployments"
if [ "${target}" != "--all" ]; then
  cd "${target}"
fi

case "${mode}" in
  plan)
    terragrunt run --all -- plan -no-color
    ;;
  apply)
    # --parallelism 1: prevent simultaneous control plane reboots (same as CI)
    terragrunt run --all --parallelism 1 --non-interactive -- apply -auto-approve
    ;;
  *)
    echo "unknown mode: ${mode}" >&2
    exit 1
    ;;
esac
