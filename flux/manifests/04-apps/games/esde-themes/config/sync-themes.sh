#!/bin/bash
# Mirror ES-DE themes-list into Emulation/themes/<reponame>/.
# Full clones only — ES-DE rejects shallow theme repos.
set -euo pipefail

THEMES_ROOT="${THEMES_ROOT:-/emulation/themes}"
LIST_DIR="${THEMES_ROOT}/themes-list"
LIST_REPO="${LIST_REPO:-https://gitlab.com/es-de/themes/themes-list.git}"
LIST_JSON="${LIST_DIR}/themes.json"

export GIT_TERMINAL_PROMPT=0

# SMB mounts often look "owned" by unexpected uids; don't abort git on that.
git config --global --add safe.directory '*'

mkdir -p "${THEMES_ROOT}"

is_shallow() {
  local dest="$1"
  [[ "$(git -C "${dest}" rev-parse --is-shallow-repository 2>/dev/null || echo false)" == "true" ]]
}

sync_repo() {
  local dest="$1"
  local url="$2"

  if [[ -d "${dest}/.git" ]]; then
    git -C "${dest}" remote set-url origin "${url}"
    if is_shallow "${dest}"; then
      echo "unshallow ${dest}"
      git -C "${dest}" fetch --unshallow --quiet
    fi
    if ! git -C "${dest}" pull --ff-only --quiet; then
      git -C "${dest}" fetch --quiet origin
      local branch
      branch="$(git -C "${dest}" rev-parse --abbrev-ref HEAD)"
      git -C "${dest}" reset --hard "origin/${branch}"
    fi
    return 0
  fi

  if [[ -e "${dest}" ]]; then
    echo "WARNING: ${dest} exists but is not a git repo; skipping" >&2
    return 1
  fi

  git clone --quiet "${url}" "${dest}"
}

echo "=== ES-DE theme sync starting ==="
echo "Themes root: ${THEMES_ROOT}"

echo "=== sync themes-list ==="
if ! sync_repo "${LIST_DIR}" "${LIST_REPO}"; then
  echo "ERROR: failed to sync themes-list" >&2
  exit 1
fi

if [[ ! -f "${LIST_JSON}" ]]; then
  echo "ERROR: missing ${LIST_JSON}" >&2
  exit 1
fi

FAILED=()
SYNCED=0

while IFS=$'\t' read -r reponame url; do
  [[ -n "${reponame}" && -n "${url}" ]] || continue
  dest="${THEMES_ROOT}/${reponame}"
  echo "=== sync ${reponame} ==="
  if sync_repo "${dest}" "${url}"; then
    SYNCED=$((SYNCED + 1))
  else
    echo "WARNING: sync failed for ${reponame}" >&2
    FAILED+=("${reponame}")
  fi
done < <(jq -r '.themes[] | [.reponame, .url] | @tsv' "${LIST_JSON}")

echo "=== ES-DE theme sync finished: synced=${SYNCED} failed=${#FAILED[@]} ==="
if [[ ${#FAILED[@]} -gt 0 ]]; then
  printf 'FAILED: %s\n' "${FAILED[@]}"
fi

if [[ "${SYNCED}" -eq 0 ]]; then
  echo "ERROR: no themes synced successfully" >&2
  exit 1
fi
