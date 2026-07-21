#!/bin/bash
# Build Gemba Skyscraper into the ephemeral /cache emptyDir for this Job pod.
# Sources build on /tmp; install with PREFIX=/cache (binary + peas.json).
# Fresh each run by design — no persistent binary/resource cache.
set -euo pipefail

: "${SKYSCRAPER_VERSION:?SKYSCRAPER_VERSION is required}"

PREFIX="/cache"
BIN="${PREFIX}/bin/Skyscraper"
MARKER="${PREFIX}/bin/VERSION"
PEAS="${PREFIX}/etc/skyscraper/peas.json"
SRC_DIR="/tmp/skyscraper-src"

mkdir -p "${PREFIX}/bin"

if [[ -x "${BIN}" && -f "${MARKER}" && -f "${PEAS}" && "$(cat "${MARKER}")" == "${SKYSCRAPER_VERSION}" ]]; then
  echo "Skyscraper ${SKYSCRAPER_VERSION} already present at ${BIN}"
  exit 0
fi

echo "Building Skyscraper ${SKYSCRAPER_VERSION} (PREFIX=${PREFIX})..."

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  build-essential \
  ca-certificates \
  git \
  libqt6sql6-sqlite \
  p7zip-full \
  qmake6 \
  qt6-base-dev \
  qt6-base-dev-tools \
  wget

rm -rf "${SRC_DIR}"
git clone --depth 1 --branch "${SKYSCRAPER_VERSION}" \
  https://github.com/Gemba/skyscraper.git \
  "${SRC_DIR}"

cd "${SRC_DIR}"
# Bake PREFIX into the binary so it finds /cache/etc/skyscraper/peas.json
PREFIX="${PREFIX}" qmake6
make -j2
make install

if [[ ! -x "${BIN}" ]]; then
  echo "ERROR: expected binary missing at ${BIN}" >&2
  ls -la "${PREFIX}/bin" >&2 || true
  exit 1
fi

if [[ ! -f "${PEAS}" ]]; then
  echo "ERROR: peas.json missing at ${PEAS} after make install" >&2
  find "${PREFIX}" -name 'peas.json' 2>/dev/null || true
  exit 1
fi

echo "${SKYSCRAPER_VERSION}" >"${MARKER}"
echo "Built Skyscraper ${SKYSCRAPER_VERSION} -> ${BIN}"

rm -rf "${SRC_DIR}"

# Scrape may run as root or uid 1000
chown -R 1000:1000 /cache || true
chmod -R a+rX /cache
