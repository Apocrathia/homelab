#!/usr/bin/env bash
# Bootstrap curl + jq + OpenTofu + Terragrunt in minimal/non-root CI images.
set -euo pipefail

ci_bin_dir() {
  printf '%s\n' "${CI_PROJECT_DIR:-$(pwd)}/.ci-bin"
}

ci_arch_suffix() {
  case "$(uname -m)" in
    x86_64) echo amd64 ;;
    aarch64 | arm64) echo arm64 ;;
    *)
      echo "ERROR: unsupported arch: $(uname -m)" >&2
      return 1
      ;;
  esac
}

ci_curl_bootstrap() {
  if command -v curl >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v wget >/dev/null 2>&1; then
    echo "ERROR: neither curl nor wget is available to bootstrap HTTP client" >&2
    return 127
  fi

  local arch dir dest
  arch=$(ci_arch_suffix)
  dir=$(ci_bin_dir)
  dest="${dir}/curl"
  mkdir -p "$dir"

  wget -qO "$dest" \
    "https://github.com/moparisthebest/static-curl/releases/download/v8.11.0/curl-${arch}"
  chmod +x "$dest"
  export PATH="${dir}:${PATH}"

  command -v curl >/dev/null 2>&1 || {
    echo "ERROR: static curl bootstrap failed" >&2
    return 1
  }

  echo "Bootstrapped curl to ${dest}"
}

ci_jq_bootstrap() {
  if command -v jq >/dev/null 2>&1; then
    return 0
  fi

  local arch dir dest
  ci_curl_bootstrap
  arch=$(ci_arch_suffix)
  dir=$(ci_bin_dir)
  dest="${dir}/jq"
  mkdir -p "$dir"

  curl --silent --show-error --fail -L \
    "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-${arch}" \
    -o "$dest"
  chmod +x "$dest"
  export PATH="${dir}:${PATH}"

  command -v jq >/dev/null 2>&1 || {
    echo "ERROR: static jq bootstrap failed" >&2
    return 1
  }

  echo "Bootstrapped jq to ${dest}"
}

ci_tofu_bootstrap() {
  local dir dest arch version tmp
  dir=$(ci_bin_dir)
  dest="${dir}/tofu"
  if [ -x "$dest" ]; then
    export PATH="${dir}:${PATH}"
    return 0
  fi

  ci_curl_bootstrap
  arch=$(ci_arch_suffix)
  version="${CI_OPENTOFU_VERSION:-1.12.5}"
  tmp=$(mktemp -d)

  curl --silent --show-error --fail -L \
    "https://github.com/opentofu/opentofu/releases/download/v${version}/tofu_${version}_linux_${arch}.tar.gz" \
    | tar -xzf - -C "$tmp" tofu

  mkdir -p "$dir"
  mv "$tmp/tofu" "$dest"
  chmod +x "$dest"
  rm -rf "$tmp"
  export PATH="${dir}:${PATH}"

  command -v tofu >/dev/null 2>&1 || {
    echo "ERROR: OpenTofu bootstrap failed" >&2
    return 1
  }

  echo "Bootstrapped OpenTofu ${version} to ${dest}"
}

ci_terragrunt_bootstrap() {
  local dir dest arch version
  dir=$(ci_bin_dir)
  dest="${dir}/terragrunt"
  if [ -x "$dest" ]; then
    export PATH="${dir}:${PATH}"
    return 0
  fi

  ci_curl_bootstrap
  arch=$(ci_arch_suffix)
  version="${CI_TERRAGRUNT_VERSION:-1.1.1}"

  mkdir -p "$dir"
  curl --silent --show-error --fail -L \
    "https://github.com/gruntwork-io/terragrunt/releases/download/v${version}/terragrunt_linux_${arch}" \
    -o "$dest"
  chmod +x "$dest"
  export PATH="${dir}:${PATH}"

  command -v terragrunt >/dev/null 2>&1 || {
    echo "ERROR: Terragrunt bootstrap failed" >&2
    return 1
  }

  echo "Bootstrapped Terragrunt ${version} to ${dest}"
}

ci_deps_bootstrap() {
  local dir
  ci_curl_bootstrap
  ci_jq_bootstrap
  ci_tofu_bootstrap
  ci_terragrunt_bootstrap
  dir=$(ci_bin_dir)
  export PATH="${dir}:${PATH}"
  export TERRAGRUNT_TFPATH="${dir}/tofu"
}

if [[ "${BASH_SOURCE[0]:-}" == "${0:-}" ]]; then
  ci_deps_bootstrap
fi
