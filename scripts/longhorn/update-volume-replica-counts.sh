#!/bin/bash
# Update existing Longhorn volumes to use the new replica count
# This patches volumes that still have 3 replicas to the new count of 2

set -euo pipefail

NAMESPACE="longhorn-system"
NEW_REPLICA_COUNT=2

echo "Finding volumes with numberOfReplicas > ${NEW_REPLICA_COUNT}..."

# Get volumes that need updating
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg count "${NEW_REPLICA_COUNT}" '
    .items[] |
    select(.spec.numberOfReplicas > ($count | tonumber)) |
    .metadata.name
  ' > /tmp/volumes-to-update.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-update.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "All volumes already have numberOfReplicas <= ${NEW_REPLICA_COUNT}."
  rm -f /tmp/volumes-to-update.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes to update"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-update.txt | awk '{printf "  %s\n", $0}'
if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi
echo ""

# Function to prompt for confirmation
prompt_confirm() {
  local message="$1"
  if [ -t 0 ]; then
    read -p "${message} (yes/no): " confirm < /dev/tty
  else
    read -p "${message} (yes/no): " confirm
  fi
  echo "${confirm}"
}

CONFIRM=$(prompt_confirm "Update ${VOLUME_COUNT} volumes to numberOfReplicas=${NEW_REPLICA_COUNT}?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-update.txt
  exit 0
fi

echo ""
echo "Updating volumes..."
echo "(Longhorn will automatically remove the extra replica)"
UPDATED=0
FAILED=0
COUNTER=0

while IFS= read -r volume; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume}... "

  # Get current replica count
  CURRENT=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.numberOfReplicas}' 2>/dev/null || echo "")

  # Try to patch the volume with a timeout (increased to 15s for busy volumes)
  PATCH_OUTPUT=$(timeout 15 kubectl patch volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    --type merge \
    -p "{\"spec\":{\"numberOfReplicas\":${NEW_REPLICA_COUNT}}}" 2>&1)
  PATCH_EXIT=$?

  # Brief pause to let API settle
  sleep 0.5

  # Verify the patch actually worked by checking the current value
  NEW_CURRENT=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.numberOfReplicas}' 2>/dev/null || echo "")

  if [ "${NEW_CURRENT}" = "${NEW_REPLICA_COUNT}" ]; then
    ((UPDATED++))
    echo "✓ (${CURRENT} → ${NEW_CURRENT})"
  else
    ((FAILED++))
    echo "✗ (current: ${NEW_CURRENT:-null}, expected: ${NEW_REPLICA_COUNT})"
    if [ "${PATCH_EXIT}" -eq 124 ]; then
      echo "    → Patch command timed out (volume may be busy - check if patch succeeded anyway)"
      # Check one more time after timeout - sometimes it succeeds but times out
      sleep 1
      FINAL_CHECK=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.numberOfReplicas}' 2>/dev/null || echo "")
      if [ "${FINAL_CHECK}" = "${NEW_REPLICA_COUNT}" ]; then
        ((UPDATED++))
        ((FAILED--))
        echo "    → Actually succeeded! (verified: ${FINAL_CHECK})"
      fi
    elif [ "${PATCH_EXIT}" -ne 0 ] && [ -n "${PATCH_OUTPUT}" ]; then
      echo "    → Error: ${PATCH_OUTPUT}"
    fi
  fi
done < /tmp/volumes-to-update.txt

echo ""
echo "=== Complete ==="
echo "Updated: ${UPDATED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Note: Longhorn will gradually remove the extra replicas. This may take a few minutes."

rm -f /tmp/volumes-to-update.txt
