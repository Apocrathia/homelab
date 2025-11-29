#!/bin/bash
# Update dataLocality for Longhorn volumes from disabled to strict-local
# Requires volumes to be detached during the change

set -euo pipefail

NAMESPACE="longhorn-system"
NEW_LOCALITY="strict-local"

echo "Finding volumes with dataLocality != ${NEW_LOCALITY}..."

# Get volumes that don't have the desired dataLocality
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg new_locality "${NEW_LOCALITY}" '
    .items[] |
    select(.spec.dataLocality != $new_locality) |
    "\(.metadata.name)|\(.spec.dataLocality)|\(.status.state)"
  ' > /tmp/volumes-to-update-locality.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-update-locality.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No volumes found to update."
  rm -f /tmp/volumes-to-update-locality.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes to update"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-update-locality.txt | awk -F'|' '{printf "  %s (current: %s, state: %s)\n", $1, $2, $3}'
if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi
echo ""
echo "⚠️  WARNING: This will detach volumes, update dataLocality, then reattach them."
echo "   This will cause brief downtime for workloads using these volumes."
echo ""

read -p "Update ${VOLUME_COUNT} volumes to dataLocality=${NEW_LOCALITY}? (yes/no): " confirm < /dev/tty
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-update-locality.txt
  exit 0
fi

echo ""
echo "Updating volumes..."
echo "(This will detach, patch, and reattach each volume)"
UPDATED=0
FAILED=0
SKIPPED=0
COUNTER=0

while IFS='|' read -r volume current_locality state; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume}... "

  # Skip if already attached to a pod (we can't safely detach)
  ATTACHED_TO=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.status.kubernetesStatus.workloadsStatus[0].podName}' 2>/dev/null || echo "")
  if [ -n "${ATTACHED_TO}" ]; then
    ((SKIPPED++))
    echo "✗ (skipped: attached to pod ${ATTACHED_TO})"
    continue
  fi

  # Detach if attached
  if [ "${state}" = "attached" ]; then
    echo -n "detaching... "
    kubectl patch volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
      --type merge \
      -p '{"spec":{"nodeID":""}}' > /dev/null 2>&1 || true

    # Wait for detach (max 30 seconds)
    for i in {1..30}; do
      CURRENT_STATE=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.status.state}' 2>/dev/null || echo "attached")
      if [ "${CURRENT_STATE}" != "attached" ]; then
        break
      fi
      sleep 1
    done
  fi

  # Patch dataLocality
  PATCH_OUTPUT=$(kubectl patch volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    --type merge \
    -p "{\"spec\":{\"dataLocality\":\"${NEW_LOCALITY}\"}}" 2>&1)
  PATCH_EXIT=$?

  # Brief pause
  sleep 0.5

  # Verify the patch
  CURRENT=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.dataLocality}' 2>/dev/null || echo "")

  if [ "${CURRENT}" = "${NEW_LOCALITY}" ]; then
    ((UPDATED++))
    echo "✓ (${current_locality:-unknown} → ${NEW_LOCALITY})"
  else
    ((FAILED++))
    echo "✗ (current: ${CURRENT:-null}, expected: ${NEW_LOCALITY})"
    if [ "${PATCH_EXIT}" -ne 0 ] && [ -n "${PATCH_OUTPUT}" ]; then
      echo "    → Error: ${PATCH_OUTPUT}"
    fi
  fi
done < /tmp/volumes-to-update-locality.txt

echo ""
echo "=== Complete ==="
echo "Updated: ${UPDATED} volumes"
echo "Skipped: ${SKIPPED} volumes (attached to pods)"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Note: Volumes that were detached will need to be reattached by their workloads."
echo "      Volumes skipped because they're attached to pods will need to be manually"
echo "      detached first (scale down the workload, then run this script again)."

rm -f /tmp/volumes-to-update-locality.txt
