#!/bin/bash
# Update existing Longhorn volumes to use the new snapshotMaxCount limit
# This patches volumes that still have the old 250 limit to the new limit of 5

set -euo pipefail

NAMESPACE="longhorn-system"
NEW_LIMIT=5

echo "Finding volumes with snapshotMaxCount != ${NEW_LIMIT}..."

# Get volumes that need updating
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg limit "${NEW_LIMIT}" '
    .items[] |
    select(.spec.snapshotMaxCount != $limit) |
    select(.spec.snapshotMaxCount == 250 or .spec.snapshotMaxCount == null) |
    .metadata.name
  ' > /tmp/volumes-to-update.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-update.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "All volumes already have snapshotMaxCount=${NEW_LIMIT}."
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

CONFIRM=$(prompt_confirm "Update ${VOLUME_COUNT} volumes to snapshotMaxCount=${NEW_LIMIT}?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-update.txt
  exit 0
fi

echo ""
echo "Updating volumes..."
echo "(Volumes with more than ${NEW_LIMIT} snapshots will be skipped - clean them up first)"
UPDATED=0
FAILED=0
SKIPPED=0
COUNTER=0

while IFS= read -r volume; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume}... "

  # Check current snapshot count for this volume
  SNAPSHOT_COUNT=$(kubectl get snapshots.longhorn.io -n "${NAMESPACE}" -o json 2>/dev/null | \
    jq -r --arg vol "${volume}" '[.items[] | select(.spec.volume == $vol)] | length' || echo "0")

  # If volume has more snapshots than the new limit, we can't patch it
  if [ "${SNAPSHOT_COUNT}" -gt "${NEW_LIMIT}" ]; then
    ((SKIPPED++))
    echo "⊘ (has ${SNAPSHOT_COUNT} snapshots, run cleanup script first)"
    continue
  fi

  # Try to patch the volume with a timeout
  PATCH_OUTPUT=$(timeout 10 kubectl patch volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    --type merge \
    -p "{\"spec\":{\"snapshotMaxCount\":${NEW_LIMIT}}}" 2>&1)
  PATCH_EXIT=$?

  # If patch timed out or failed, check current value anyway (might have succeeded)
  sleep 0.3  # Brief pause to let API settle

  # Verify the patch actually worked by checking the current value
  CURRENT=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.snapshotMaxCount}' 2>/dev/null || echo "")

  if [ "${CURRENT}" = "${NEW_LIMIT}" ]; then
    ((UPDATED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗ (current: ${CURRENT:-null})"
    if [ "${PATCH_EXIT}" -eq 124 ]; then
      echo "    → Patch command timed out (volume may be busy)"
    elif [ "${PATCH_EXIT}" -ne 0 ] && [ -n "${PATCH_OUTPUT}" ]; then
      # Check if error is about too many snapshots
      if echo "${PATCH_OUTPUT}" | grep -q "can't make snapshotMaxCount.*smaller than current usage"; then
        echo "    → Volume has too many snapshots (${SNAPSHOT_COUNT}), run cleanup script first"
      else
        echo "    → Error: ${PATCH_OUTPUT}"
      fi
    fi
  fi
done < /tmp/volumes-to-update.txt

echo ""
echo "=== Complete ==="
echo "Updated: ${UPDATED} volumes"
if [ "${SKIPPED}" -gt 0 ]; then
  echo "Skipped: ${SKIPPED} volumes (have more than ${NEW_LIMIT} snapshots - run cleanup script first)"
fi
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi

rm -f /tmp/volumes-to-update.txt
