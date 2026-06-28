#!/usr/bin/env bash
# Sync terraform/.env values to GitLab project CI/CD variables via glab.
#
# Usage:
#   scripts/sync-gitlab-ci-variables.sh          # prompt before writing
#   scripts/sync-gitlab-ci-variables.sh -y       # apply without prompt
#   scripts/sync-gitlab-ci-variables.sh --dry-run
#
# Requires: glab authenticated for the target project (glab auth status).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${TERRAFORM_ENV_FILE:-${REPO_ROOT}/terraform/.env}"
REPO="${GITLAB_REPO:-Apocrathia/homelab}"
SCOPE='*'

DRY_RUN=false
ASSUME_YES=false

usage() {
  sed -n '2,8p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y | --yes)
      ASSUME_YES=true
      shift
      ;;
    -n | --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if ! command -v glab >/dev/null 2>&1; then
  echo "glab is required but not installed" >&2
  exit 1
fi

if ! glab auth status >/dev/null 2>&1; then
  echo "glab is not authenticated; run: glab auth login" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${TOFU_TOKEN:-}" && -n "${TOFU_MR_TOKEN:-}" ]]; then
  TOFU_TOKEN="$TOFU_MR_TOKEN"
fi

required=(
  TF_HTTP_ADDRESS
  TF_HTTP_USERNAME
  TF_HTTP_PASSWORD
  PROXMOX_VE_ENDPOINT
  PROXMOX_VE_API_TOKEN
  PROXMOX_VE_INSECURE
  TOFU_TOKEN
)

missing=()
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "Missing values in ${ENV_FILE}:" "${missing[@]}" >&2
  exit 1
fi

can_mask_gitlab() {
  local value=$1
  [[ "$value" =~ ^[a-zA-Z0-9_+=/@:.~-]{8,}$ ]]
}

can_mask_gitlab_raw() {
  local value=$1
  [[ "$value" =~ ^[^[:space:]]{8,}$ ]]
}

verify_state_auth() {
  local username=$1
  local password=$2
  local label=$3
  local probe_url="${TF_HTTP_ADDRESS}-proxmox-talos-cluster-talos-01"
  local http_code body

  http_code=$(curl -s -o /tmp/gitlab-state-probe.json -w '%{http_code}' \
    -u "${username}:${password}" "$probe_url")
  body=$(tr -d '\n' </tmp/gitlab-state-probe.json | head -c 240)

  case "$http_code" in
    401)
      echo "ERROR: ${label} cannot read GitLab terraform state (HTTP 401)." >&2
      echo "       ${body}" >&2
      return 1
      ;;
    404)
      echo "OK: ${label} authenticated (state missing or empty is fine for drift check)"
      return 0
      ;;
    200)
      echo "OK: ${label} authenticated and state reachable"
      return 0
      ;;
    *)
      echo "WARN: ${label} probe returned HTTP ${http_code}: ${body}" >&2
      return 0
      ;;
  esac
}

verify_state_lock_auth() {
  local username=$1
  local password=$2
  local probe_url="${TF_HTTP_ADDRESS}-proxmox-talos-cluster-talos-01/lock"
  local http_code body

  http_code=$(curl -s -o /tmp/gitlab-lock-probe.json -w '%{http_code}' \
    -X POST -u "${username}:${password}" \
    -H 'Content-Type: application/json' \
    -d '{"ID":"sync-script-probe","Operation":"OperationTypePlan","Info":"","Who":"sync-script","Version":"1.0","Created":"2026-06-28T20:00:00Z","Path":""}' \
    "$probe_url")
  body=$(tr -d '\n' </tmp/gitlab-lock-probe.json | head -c 240)

  case "$http_code" in
    200 | 201 | 409)
      curl -s -o /dev/null -X DELETE -u "${username}:${password}" "$probe_url" || true
      echo "OK: ${1} can acquire terraform state locks (apply-ready token)"
      return 0
      ;;
    403)
      echo "WARN: token cannot lock terraform state (HTTP 403). Drift check uses -lock=false; apply needs Maintainer + api PAT." >&2
      return 0
      ;;
    *)
      echo "WARN: lock probe returned HTTP ${http_code}: ${body}" >&2
      return 0
      ;;
  esac
}

if ! verify_state_auth "$TF_HTTP_USERNAME" "$TF_HTTP_PASSWORD" "TF_HTTP_PASSWORD"; then
  if [[ -n "${TOFU_MR_TOKEN:-}" && "$TOFU_MR_TOKEN" != "$TF_HTTP_PASSWORD" ]] \
    && verify_state_auth "$TF_HTTP_USERNAME" "$TOFU_MR_TOKEN" "TOFU_MR_TOKEN"; then
    echo "hint: set TF_HTTP_PASSWORD to the same value as TOFU_MR_TOKEN in ${ENV_FILE}" >&2
  fi
  exit 1
fi

verify_state_lock_auth "$TF_HTTP_USERNAME" "$TF_HTTP_PASSWORD"

var_exists() {
  local key=$1
  glab variable list -R "$REPO" --output json --per-page 100 |
    jq -e --arg k "$key" '.[] | select(.key == $k)' >/dev/null
}

upsert_variable() {
  local key=$1
  local value=$2
  local sensitive=${3:-false}

  local cmd=set
  if var_exists "$key"; then
    cmd=update
  fi

  local -a flags=(-R "$REPO" -p -r -s "$SCOPE")
  local mask_label=visible

  if can_mask_gitlab "$value"; then
    flags+=(-m)
    mask_label=masked
    if [[ "$cmd" == set && "$sensitive" == true ]]; then
      flags+=(--hidden)
    fi
  elif can_mask_gitlab_raw "$value"; then
    flags+=(-m)
    mask_label=masked-raw
    echo "note: ${key} uses masked raw (Proxmox-style tokens include !, which GitLab cannot standard-mask)"
  elif [[ "$sensitive" == true ]]; then
    echo "note: ${key} stored protected but visible (value cannot meet GitLab mask requirements)"
  fi

  if $DRY_RUN; then
    echo "[dry-run] glab variable $cmd $key (protected, scope=${SCOPE}, ${mask_label})"
    return 0
  fi

  printf '%s' "$value" | glab variable "$cmd" "$key" "${flags[@]}"
  echo "✓ ${cmd} ${key}"
}

echo "Target: ${REPO}"
echo "Source: ${ENV_FILE}"
echo "Keys:   ${required[*]}"
echo

if ! $ASSUME_YES && ! $DRY_RUN; then
  read -r -p "Write these variables to GitLab? [y/N] " reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

upsert_variable TF_HTTP_ADDRESS "$TF_HTTP_ADDRESS" false
upsert_variable TF_HTTP_USERNAME "$TF_HTTP_USERNAME" false
upsert_variable TF_HTTP_PASSWORD "$TF_HTTP_PASSWORD" true
upsert_variable PROXMOX_VE_ENDPOINT "$PROXMOX_VE_ENDPOINT" false
upsert_variable PROXMOX_VE_API_TOKEN "$PROXMOX_VE_API_TOKEN" true
upsert_variable PROXMOX_VE_INSECURE "$PROXMOX_VE_INSECURE" false
upsert_variable TOFU_TOKEN "$TOFU_TOKEN" true

echo
if $DRY_RUN; then
  echo "Dry run complete — no changes written."
else
  echo "Done. Verify: glab variable list -R ${REPO}"
fi
