#!/bin/bash
# Cancel stuck Longhorn volume restores triggered by pasture-operator
# This clears the fromBackup field for volumes stuck in restore state
# Only processes volumes that are in error state or have been stuck for hours

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding volumes stuck in restore state..."
echo ""

# Get volumes with fromBackup set that are either:
# 1. In error state (pasture.longhorn.io/status=error), OR
# 2. Have been stuck restoring for more than 30 minutes (restore timeout)
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
    .items[] |
    select(.spec.fromBackup != "") |
    . as $vol |
    ($vol.metadata.annotations."pasture.longhorn.io/status" // "") as $status |
    ($vol.metadata.annotations."pasture.longhorn.io/restore-started-at" // "") as $started |
    (if $started != "" then
      (($now | fromdateiso8601) - ($started | fromdateiso8601)) / 60
    else 0 end) as $minutes |
    if $status == "error" or $minutes > 30 then
      "\($vol.metadata.name)|\($status)|\($minutes)"
    else empty
    end' > /tmp/volumes-to-fix.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-fix.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No volumes stuck in restore state found."
  echo ""
  echo "Note: Only volumes in error state or stuck for >30 minutes are processed."
  echo "      Healthy volumes with fromBackup set are left alone."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes stuck in restore state"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-fix.txt | while IFS='|' read -r volume_name status minutes; do
  if [ -n "$minutes" ] && [ "$minutes" != "0" ]; then
    echo "  ${volume_name} (status: ${status:-unknown}, stuck for ${minutes%.*} minutes)"
  else
    echo "  ${volume_name} (status: ${status:-unknown})"
  fi
done

if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi

echo ""
echo "This will:"
echo "  1. Clear the fromBackup field from volume spec (allows normal startup)"
echo "  2. Update pasture.longhorn.io/status to 'error' if not already set"
echo "  3. Keep the restore annotation (pasture.longhorn.io/restore) intact"
echo ""
echo "⚠️  WARNING: This will cancel any pending restore operations."
echo "   Volumes will start normally with existing data (if any)."
echo "   The restore annotation is kept so future upgrades won't trigger restores."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo ""
echo "Clearing stuck restore operations..."
FIXED=0
FAILED=0
COUNTER=0

while IFS='|' read -r volume_name status minutes; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume_name}... "

  # Clear fromBackup field using JSON patch
  # Also set status annotation to error to prevent future restore attempts
  if kubectl patch volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" \
    --type json \
    -p '[{"op": "remove", "path": "/spec/fromBackup"}]' > /dev/null 2>&1 && \
    kubectl annotate volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" \
    "pasture.longhorn.io/status=error" --overwrite > /dev/null 2>&1; then
    ((FIXED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  # Brief pause to avoid overwhelming the API
  sleep 0.1
done < /tmp/volumes-to-fix.txt

echo ""
echo "=== Complete ==="
echo "Fixed: ${FIXED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Volumes should now start normally. Monitor with:"
echo "  kubectl get volumes -n longhorn-system -w"
echo "  kubectl get pods --all-namespaces -w | grep ContainerCreating"
echo ""
echo "Note: The restore annotation (pasture.longhorn.io/restore) was kept."
echo "      This prevents the operator from trying to restore existing volumes"
echo "      during future upgrades or node reboots."

rm -f /tmp/volumes-to-fix.txt
