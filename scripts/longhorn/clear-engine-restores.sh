#!/bin/bash
# Clear requestedBackupRestore from Longhorn engines stuck in restore state
# This allows engines to stop trying to restore from empty backups

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding engines with requestedBackupRestore set..."
echo ""

# Get engines for volumes that are stuck in restore state
# Find volumes with restoreRequired=true, then get their engines
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] | select(.status.restoreRequired == true) | .metadata.name' | \
  while read -r volume_name; do
    kubectl get engines.longhorn.io -n "${NAMESPACE}" -o json | \
      jq -r --arg vol "$volume_name" '.items[] | select(.spec.volumeName == $vol) | "\(.metadata.name)|\(.spec.requestedBackupRestore // "null")"'
  done > /tmp/engines-to-fix.txt

ENGINE_COUNT=$(wc -l < /tmp/engines-to-fix.txt | tr -d ' ')

if [ "${ENGINE_COUNT}" -eq 0 ]; then
  echo "No engines with requestedBackupRestore found."
  rm -f /tmp/engines-to-fix.txt
  exit 0
fi

echo "Found ${ENGINE_COUNT} engines with requestedBackupRestore set"
echo ""
echo "Preview (first 10):"
head -10 /tmp/engines-to-fix.txt | while IFS='|' read -r engine_name backup; do
  echo "  ${engine_name} (backup: ${backup})"
done

if [ "${ENGINE_COUNT}" -gt 10 ]; then
  echo "... and $((ENGINE_COUNT - 10)) more"
fi

echo ""
echo "This will clear requestedBackupRestore from engine specs,"
echo "allowing Longhorn to stop trying to restore from empty backups."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/engines-to-fix.txt
  exit 0
fi

echo ""
echo "Clearing requestedBackupRestore from engines..."
FIXED=0
FAILED=0
COUNTER=0

while IFS='|' read -r engine_name backup; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${ENGINE_COUNT}] ${engine_name}... "

  # Clear requestedBackupRestore by setting it to empty string (works for both null and non-empty values)
  # Using merge instead of JSON patch remove because null values can't be removed
  if kubectl patch engines.longhorn.io "${engine_name}" -n "${NAMESPACE}" \
    --type merge \
    -p '{"spec":{"requestedBackupRestore":""}}' > /dev/null 2>&1; then
    # Trigger reconciliation by annotating the engine (this forces Longhorn to re-evaluate)
    kubectl annotate engines.longhorn.io "${engine_name}" -n "${NAMESPACE}" \
      "longhorn.io/force-deletion=$(date +%s)" --overwrite > /dev/null 2>&1 || true
    ((FIXED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  # Brief pause to avoid overwhelming the API
  sleep 0.1
done < /tmp/engines-to-fix.txt

echo ""
echo "=== Complete ==="
echo "Fixed: ${FIXED} engines"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} engines"
fi
echo ""
echo "Engines should now stop trying to restore. Volumes should recover as"
echo "Longhorn clears the restore state and starts replicas normally."
echo ""
echo "Monitor progress with:"
echo "  kubectl get volumes -n longhorn-system -w"
echo "  kubectl get pods --all-namespaces -w | grep ContainerCreating"

rm -f /tmp/engines-to-fix.txt
