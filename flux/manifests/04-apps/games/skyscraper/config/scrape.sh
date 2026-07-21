#!/bin/bash
# Scrape nonempty ES-DE systems → gamelist.xml (metadata only; no media).
set -euo pipefail

ROMS_ROOT="/emulation/roms"
GAMELISTS_ROOT="/emulation/gamelists"
RESOURCE_CACHE="/emulation/tools/skyscraper/cache"
SKYSCRAPER_BIN="${SKYSCRAPER_BIN:-/cache/bin/Skyscraper}"
CONFIG_SRC="/config/config.ini"
RUNTIME_DIR="/cache/runtime"
RUNTIME_CONFIG="${RUNTIME_DIR}/config.ini"
FLAGS="unattend,nobrackets"

: "${SCREENSCRAPER_USERNAME:?SCREENSCRAPER_USERNAME is required}"
: "${SCREENSCRAPER_PASSWORD:?SCREENSCRAPER_PASSWORD is required}"

if [[ ! -x "${SKYSCRAPER_BIN}" ]]; then
  echo "ERROR: Skyscraper binary missing at ${SKYSCRAPER_BIN}" >&2
  exit 1
fi

mkdir -p "${RUNTIME_DIR}" "${GAMELISTS_ROOT}" "${RESOURCE_CACHE}"

# Inject ScreenScraper creds into a writable runtime config (never rewrite the ConfigMap).
sed "s|userCreds=\"PLACEHOLDER\"|userCreds=\"${SCREENSCRAPER_USERNAME}:${SCREENSCRAPER_PASSWORD}\"|" \
  "${CONFIG_SRC}" >"${RUNTIME_CONFIG}"
chmod 600 "${RUNTIME_CONFIG}"

# Directories that are not Skyscraper -p platforms (or not scrapable ROM trees)
SKIP_NAMES=(
  systems.txt
  emulators
  desktop
  steam
  epic
  kodi
  android
  ports
  easyrpg
  chailove
  flash
  j2me
  lowresnx
  lutro
  pico8
  solarus
  tic80
  doom
  quake
  mugen
  openbor
  fpinball
  type-x
  pcarcade
  consolearcade
)

is_skipped() {
  local name="$1"
  local s
  for s in "${SKIP_NAMES[@]}"; do
    [[ "${name}" == "${s}" ]] && return 0
  done
  return 1
}

system_has_roms() {
  local dir="$1"
  # Any real file beyond Apple/Synology junk and ES-DE folder scaffolding
  find "${dir}" -maxdepth 1 -type f \
    ! -name '.DS_Store' \
    ! -name 'Thumbs.db' \
    ! -name 'systems.txt' \
    ! -name 'metadata.txt' \
    ! -name 'systeminfo.txt' \
    ! -name '@eaDir' \
    -print -quit | grep -q .
}

echo "=== Skyscraper ES-DE scrape starting (gamelist only) ==="
echo "Binary: ${SKYSCRAPER_BIN} ($("${SKYSCRAPER_BIN}" --help 2>&1 | head -1 || true))"

# Discover supported platforms once (Skyscraper prints them under -p help)
SUPPORTED="$("${SKYSCRAPER_BIN}" --help 2>&1 || true)"

FAILED=()
SCRAPED=0
SKIPPED=0

for sys_dir in "${ROMS_ROOT}"/*/; do
  [[ -d "${sys_dir}" ]] || continue
  sys="$(basename "${sys_dir}")"

  if is_skipped "${sys}"; then
    echo "--- skip ${sys} (non-ROM / exclude list) ---"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if ! system_has_roms "${sys_dir}"; then
    echo "--- skip ${sys} (empty) ---"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if ! grep -Eq "^\s+${sys}(,|\s|$)|\"${sys}\"|\b${sys}\b" <<<"${SUPPORTED}"; then
    # Soft check — still try; Skyscraper will error if unknown
    echo "--- note: ${sys} may be unknown to this Skyscraper build; attempting anyway ---"
  fi

  mkdir -p "${GAMELISTS_ROOT}/${sys}"

  echo "=== scrape ${sys} (screenscraper, metadata) ==="
  if ! "${SKYSCRAPER_BIN}" \
    -c "${RUNTIME_CONFIG}" \
    -p "${sys}" \
    -s screenscraper \
    --flags "${FLAGS}"; then
    echo "WARNING: scrape failed for ${sys}" >&2
    FAILED+=("${sys}:scrape")
    continue
  fi

  echo "=== generate gamelist ${sys} (esde) ==="
  if ! "${SKYSCRAPER_BIN}" \
    -c "${RUNTIME_CONFIG}" \
    -p "${sys}" \
    -f esde \
    --flags "${FLAGS}"; then
    echo "WARNING: gamelist generate failed for ${sys}" >&2
    FAILED+=("${sys}:generate")
    continue
  fi

  SCRAPED=$((SCRAPED + 1))
done

echo "=== Skyscraper finished: scraped=${SCRAPED} skipped=${SKIPPED} failed=${#FAILED[@]} ==="
if [[ ${#FAILED[@]} -gt 0 ]]; then
  printf 'FAILED: %s\n' "${FAILED[@]}"
fi
# Empty/unsupported platforms fail often; treat the Job as successful when any
# system scraped. Only hard-fail when nothing useful landed (avoids K8s retry
# of a multi-hour ScreenScraper pass).
if [[ "${SCRAPED}" -eq 0 ]]; then
  echo "ERROR: no systems scraped successfully" >&2
  exit 1
fi
