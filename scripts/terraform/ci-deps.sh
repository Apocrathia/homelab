#!/usr/bin/env bash
# Bootstrap curl + jq in minimal/non-root CI images (e.g. alpine/terragrunt).
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

  if ! command -v wget >/dev/null 2>&1; then
    echo "ERROR: wget is required to bootstrap jq" >&2
    return 127
  fi

  local arch dir dest
  arch=$(ci_arch_suffix)
  dir=$(ci_bin_dir)
  dest="${dir}/jq"
  mkdir -p "$dir"

  wget -qO "$dest" \
    "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-${arch}"
  chmod +x "$dest"
  export PATH="${dir}:${PATH}"

  command -v jq >/dev/null 2>&1 || {
    echo "ERROR: static jq bootstrap failed" >&2
    return 1
  }

  echo "Bootstrapped jq to ${dest}"
}

ci_deps_bootstrap() {
  ci_curl_bootstrap
  ci_jq_bootstrap
}

if [[ "${BASH_SOURCE[0]:-}" == "${0:-}" ]]; then
  ci_deps_bootstrap
fi
