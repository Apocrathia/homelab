#!/usr/bin/env bash
# Apply Fleet GitOps YAML (adapted from fleetctl new / fleetdm/fleet-gitops).
# https://fleetdm.com/docs/configuration/yaml-files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLEET_GITOPS_DIR="${FLEET_GITOPS_DIR:-$SCRIPT_DIR}"
FLEET_GLOBAL_FILE="${FLEET_GLOBAL_FILE:-$FLEET_GITOPS_DIR/default.yml}"
FLEETCTL="${FLEETCTL:-fleetctl}"
FLEET_DRY_RUN_ONLY="${FLEET_DRY_RUN_ONLY:-false}"
FLEET_DELETE_OTHER_FLEETS="${FLEET_DELETE_OTHER_FLEETS:-${FLEET_DELETE_OTHER_TEAMS:-true}}"

if [ -f "$FLEET_GLOBAL_FILE" ]; then
  grep -Exq "^org_settings:.*" "$FLEET_GLOBAL_FILE"
else
  FLEET_DELETE_OTHER_FLEETS=false
fi

if compgen -G "$FLEET_GITOPS_DIR"/fleets/*.yml > /dev/null; then
  # Validate unique fleet names (assumes `name: <fleet_name>` lines).
  if perl -nle 'print $1 if /^name:\s*(.+)$/' "$FLEET_GITOPS_DIR"/fleets/*.yml | sort | uniq -d | grep . -cq; then
    echo "Duplicate fleet names found under $FLEET_GITOPS_DIR/fleets/" >&2
    exit 1
  fi
fi

args=()
if [ -f "$FLEET_GLOBAL_FILE" ]; then
  args=(-f "$FLEET_GLOBAL_FILE")
fi

for fleet_file in "$FLEET_GITOPS_DIR"/fleets/*.yml; do
  if [ -f "$fleet_file" ]; then
    args+=(-f "$fleet_file")
  fi
done
if [ "$FLEET_DELETE_OTHER_FLEETS" = true ]; then
  args+=(--delete-other-fleets)
fi

# Always dry-run first; exit early when CI only wants validation.
$FLEETCTL gitops "${args[@]}" --dry-run
if [ "$FLEET_DRY_RUN_ONLY" = true ]; then
  exit 0
fi

$FLEETCTL gitops "${args[@]}"
