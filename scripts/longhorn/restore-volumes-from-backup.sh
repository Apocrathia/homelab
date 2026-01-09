#!/bin/bash
# Restore volumes from their last backup when volumes are stuck in creating state
# This is a recovery script for volumes that lost their state after engine restarts

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding volumes stuck in creating state with backups..."
echo ""

# Get volumes in creating state that have a lastBackup
# Fetch backup URLs from backup resources since Longhorn requires full URLs, not just backup names
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] |
    select(.status.state == "creating") |
    select(.status.lastBackup != null and .status.lastBackup != "") |
    "\(.metadata.name)|\(.status.lastBackup)"' > /tmp/volumes-to-restore-names.txt

# Convert backup names to backup URLs
> /tmp/volumes-to-restore.txt
while IFS='|' read -r volume_name backup_name; do
  backup_url=$(kubectl get backups.longhorn.io "${backup_name}" -n "${NAMESPACE}" -o jsonpath='{.status.url}' 2>/dev/null)
  if [ -n "${backup_url}" ] && [ "${backup_url}" != "null" ]; then
    echo "${volume_name}|${backup_url}" >> /tmp/volumes-to-restore.txt
  else
    echo "WARNING: Could not find backup URL for ${backup_name}, skipping ${volume_name}" >&2
  fi
done < /tmp/volumes-to-restore-names.txt
rm -f /tmp/volumes-to-restore-names.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-restore.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No volumes in creating state with backups found."
  rm -f /tmp/volumes-to-restore.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes in creating state with backups"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-restore.txt | while IFS='|' read -r volume_name backup_url; do
  # Extract backup name from URL for display
  backup_name=$(echo "${backup_url}" | grep -oP 'backup=\K[^&]+' || echo "${backup_url}")
  echo "  ${volume_name} (backup: ${backup_name})"
done

if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi

echo ""
echo "⚠️  WARNING: This will restore volumes from backups."
echo "   This will:"
echo "   1. Set fromBackup field to trigger restore"
echo "   2. Clear restoreRequired/restoreInitiated if needed"
echo "   3. Force engine to start"
echo ""
echo "   The volumes are currently in 'creating' state and may have lost"
echo "   their state after engine restarts. Restoring from backup will"
echo "   recover the data but may take time depending on backup size."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-restore.txt
  exit 0
fi

echo ""
echo "Restoring volumes from backups..."
RESTORED=0
FAILED=0
COUNTER=0

while IFS='|' read -r volume_name backup_url; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume_name}... "

  # Set fromBackup to trigger restore (must use full backup URL, not just backup name)
  # Clear restore flags if they exist
  # Force engine to start
  if kubectl patch volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" \
    --type merge \
    -p "{\"spec\":{\"fromBackup\":\"${backup_url}\"}}" > /dev/null 2>&1 && \
    kubectl apply --server-side --force-conflicts --subresource=status \
    -f - <<EOF > /dev/null 2>&1
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: ${volume_name}
  namespace: ${NAMESPACE}
status:
  restoreRequired: true
  restoreInitiated: false
EOF
  then
    # Find and start the engine
    ENGINE_NAME=$(kubectl get engines.longhorn.io -n "${NAMESPACE}" -o json 2>/dev/null | \
      jq -r --arg vol "$volume_name" '.items[] | select(.spec.volumeName == $vol) | .metadata.name' | head -1)

    if [ -n "${ENGINE_NAME}" ]; then
      kubectl patch engines.longhorn.io "${ENGINE_NAME}" -n "${NAMESPACE}" \
        --type merge -p '{"spec":{"desireState":"running"}}' > /dev/null 2>&1 || true
    fi

    ((RESTORED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  # Brief pause to avoid overwhelming the API
  sleep 0.5
done < /tmp/volumes-to-restore.txt

echo ""
echo "=== Complete ==="
echo "Restored: ${RESTORED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Volumes are now restoring from backups. This may take time depending"
echo "on backup size. Monitor progress with:"
echo "  kubectl get volumes -n longhorn-system -w"
echo "  kubectl get engines -n longhorn-system -w"

rm -f /tmp/volumes-to-restore.txt
