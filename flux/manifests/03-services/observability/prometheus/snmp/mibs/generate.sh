#!/usr/bin/env bash
# Generate snmp.yml from MIB files
#
# This script uses the prometheus/snmp-generator Docker image to parse MIB files
# and generate the snmp.yml configuration for prometheus-snmp-exporter.
#
# Usage: ./generate.sh
#
# Prerequisites:
# - Docker must be running
# - MIB files (*.mib) in this directory
# - generator.yml configuration in this directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$(dirname "$SCRIPT_DIR")"
GENERATOR_VERSION="${GENERATOR_VERSION:-v0.26.0}"

echo "==> Generating SNMP exporter config from MIBs..."
echo "    MIB directory: $SCRIPT_DIR"
echo "    Output: $OUTPUT_DIR/snmp.yml"
echo "    Generator version: $GENERATOR_VERSION"

# Run the generator
# - Mount this directory to /opt (where generator looks for mibs and generator.yml)
# - Set MIBDIRS to include both default MIBs and our custom ones
docker run --rm \
  --platform linux/amd64 \
  -v "$SCRIPT_DIR:/opt" \
  -e "MIBDIRS=/opt:/usr/share/snmp/mibs" \
  "prom/snmp-generator:${GENERATOR_VERSION}" \
  generate --no-fail-on-parse-errors

# Move generated file to parent directory and add YAML doc start
if [[ -f "$SCRIPT_DIR/snmp.yml" ]]; then
  # Add --- doc start for yamllint compliance
  { echo "---"; cat "$SCRIPT_DIR/snmp.yml"; } > "$OUTPUT_DIR/snmp.yml"
  rm "$SCRIPT_DIR/snmp.yml"
  echo "==> Generated $OUTPUT_DIR/snmp.yml"
  echo "    Modules:"
  grep -E "^  [a-z_]+:" "$OUTPUT_DIR/snmp.yml" | head -20 || true
else
  echo "ERROR: snmp.yml was not generated"
  exit 1
fi
