#!/bin/bash
# Restart engines for degraded volumes to force Longhorn reconciliation
# This helps volumes stuck with null replicaDirectoryMap to properly update status

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding degraded volumes with engines to restart..."
echo ""

# Get degraded volumes that are attached (have engines)
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] |
    select(.status.robustness == "degraded") |
    select(.status.state == "attached") |
    .metadata.name' > /tmp/volumes-to-fix.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-fix.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No degraded attached volumes found."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} degraded volumes with engines"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-fix.txt | while read -r volume_name; do
  echo "  ${volume_name}"
done

if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi

echo ""
echo "This will restart the engines for these volumes, forcing Longhorn"
echo "to reconcile and properly recognize existing replicas."
echo ""
echo "⚠️  WARNING: This will briefly interrupt I/O for these volumes."
echo "   The volumes are attached, so pods using them may experience"
echo "   brief disconnections during engine restart."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo ""
echo "Restarting engines for degraded volumes..."
RESTARTED=0
FAILED=0
COUNTER=0

# Pre-fetch all engines once to avoid repeated API calls
ENGINES_JSON=$(kubectl get engines.longhorn.io -n "${NAMESPACE}" -o json 2>/dev/null)

while read -r volume_name; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume_name}... "

  # Find the engine for this volume from pre-fetched data
  ENGINE_NAME=$(echo "${ENGINES_JSON}" | \
    jq -r --arg vol "$volume_name" '.items[] | select(.spec.volumeName == $vol) | .metadata.name' | head -1)

  if [ -z "${ENGINE_NAME}" ]; then
    echo "✗ (no engine found)"
    ((FAILED++))
    continue
  fi

  # Check if engine is already being deleted
  ENGINE_DELETING=$(kubectl get engines.longhorn.io "${ENGINE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.metadata.deletionTimestamp}' 2>/dev/null || echo "")
  if [ -n "${ENGINE_DELETING}" ]; then
    echo "⏳ (already deleting)"
    ((RESTARTED++))
    continue
  fi

  # Delete the engine (Longhorn will recreate it)
  # Use timeout and --wait=false to prevent hanging
  # Redirect stderr to /dev/null to avoid finalizer warnings
  if timeout 10s kubectl delete engines.longhorn.io "${ENGINE_NAME}" -n "${NAMESPACE}" --wait=false 2>/dev/null; then
    ((RESTARTED++))
    echo "✓"
  else
    # If delete fails or times out, try force delete with grace period 0
    if timeout 5s kubectl delete engines.longhorn.io "${ENGINE_NAME}" -n "${NAMESPACE}" --grace-period=0 --force --wait=false 2>/dev/null; then
      ((RESTARTED++))
      echo "✓ (forced)"
    else
      ((FAILED++))
      echo "✗"
    fi
  fi

  # Brief pause to avoid overwhelming the API
  sleep 0.5
done < /tmp/volumes-to-fix.txt

echo ""
echo "=== Complete ==="
echo "Restarted: ${RESTARTED} engines"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} engines"
fi
echo ""
echo "Engines are being recreated by Longhorn. Volumes should reconcile"
echo "and become healthy as Longhorn recognizes the existing replicas."
echo ""
echo "Monitor progress with:"
echo "  kubectl get volumes -n longhorn-system -w"
echo ""
echo "Note: Engine recreation typically takes 10-30 seconds per volume."

rm -f /tmp/volumes-to-fix.txt
