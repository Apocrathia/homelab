#!/bin/bash
# Patch dataLocality on existing Longhorn volumes (Helm defaults do not retrofit).
# Default matches flux/.../longhorn/helmrelease.yaml (defaultSettings + persistence).
#
# Override: NEW_LOCALITY=strict-local ./update-volume-data-locality.sh
#
# Longhorn rejects converting between strict-local and other modes while the volume is attached.
# Scale down workloads so volumes detach, then run this script.

# No -e: bash returns status 1 for ((var++)) when var was 0, which would kill the loop on first volume.
set -uo pipefail

NAMESPACE="longhorn-system"
NEW_LOCALITY="${NEW_LOCALITY:-best-effort}"

echo "Finding volumes with dataLocality != ${NEW_LOCALITY}..."

# Get volumes that don't have the desired dataLocality
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg new_locality "${NEW_LOCALITY}" '
    .items[] |
    select(.spec.dataLocality != $new_locality) |
    "\(.metadata.name)|\(.spec.dataLocality)|\(.status.state)|\(.status.kubernetesStatus.workloadsStatus[0].podName // "none")"
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
head -10 /tmp/volumes-to-update-locality.txt | awk -F'|' '{printf "  %s (current: %s, state: %s, pod: %s)\n", $1, $2, $3, $4}'
if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi
echo ""
echo "NOTE: Patches only succeed when the volume is detached. If workloads are still using the"
echo "      volume, Longhorn will reject the patch until you scale down / detach."
echo ""

read -r -p "Update ${VOLUME_COUNT} volumes to dataLocality=${NEW_LOCALITY}? (yes/no): " confirm < /dev/tty
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-update-locality.txt
  exit 0
fi

echo ""
echo "Updating volumes..."
UPDATED=0
FAILED=0
COUNTER=0

while IFS='|' read -r volume current_locality _state pod_name; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume}... "

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
    POD_INFO=""
    if [ "${pod_name}" != "none" ] && [ -n "${pod_name}" ]; then
      POD_INFO=" (pod: ${pod_name})"
    fi
    echo "✓ (${current_locality:-unknown} → ${NEW_LOCALITY})${POD_INFO}"
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
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Note: After patching detached volumes, reattach by scaling workloads back up."

rm -f /tmp/volumes-to-update-locality.txt
