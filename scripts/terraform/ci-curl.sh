#!/usr/bin/env bash
# Ensure curl exists in minimal/non-root CI images (e.g. alpine/terragrunt).
# Downloads a static binary into .ci-bin/ when curl is not on PATH.
set -euo pipefail

ci_curl_bootstrap() {
  if command -v curl >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v wget >/dev/null 2>&1; then
    echo "ERROR: neither curl nor wget is available to bootstrap HTTP client" >&2
    return 127
  fi

  local arch curl_arch dest dir
  arch=$(uname -m)
  case "$arch" in
    x86_64) curl_arch=amd64 ;;
    aarch64 | arm64) curl_arch=arm64 ;;
    *)
      echo "ERROR: unsupported arch for static curl bootstrap: ${arch}" >&2
      return 1
      ;;
  esac

  dir="${CI_PROJECT_DIR:-$(pwd)}/.ci-bin"
  dest="${dir}/curl"
  mkdir -p "$dir"

  wget -qO "$dest" \
    "https://github.com/moparisthebest/static-curl/releases/download/v8.11.0/curl-${curl_arch}"
  chmod +x "$dest"
  export PATH="${dir}:${PATH}"

  if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: static curl bootstrap failed" >&2
    return 1
  fi

  echo "Bootstrapped curl to ${dest}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ci_curl_bootstrap
fi
