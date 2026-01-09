#!/bin/bash
# Clear restoreRequired and restoreInitiated from Longhorn volumes stuck in restore state
# This forces Longhorn to stop treating volumes as being restored and allows normal operation

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding volumes stuck with restoreRequired=true..."
echo ""

# Get volumes with restoreRequired=true
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] | select(.status.restoreRequired == true) | .metadata.name' > /tmp/volumes-to-fix.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-fix.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No volumes with restoreRequired=true found."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes stuck with restoreRequired=true"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-fix.txt | while read -r volume_name; do
  echo "  ${volume_name}"
done

if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi

echo ""
echo "This will clear restoreRequired and restoreInitiated from volume status,"
echo "allowing Longhorn to stop treating these volumes as being restored."
echo "Volumes will then be able to start replicas normally."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo ""
echo "Clearing restore status from volumes..."
FIXED=0
FAILED=0
COUNTER=0

while read -r volume_name; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume_name}... "

  # Use kubectl apply with status subresource to clear restore flags
  # Create a temporary YAML file with just the status fields we want to update
  cat > /tmp/volume-status-${volume_name}.yaml <<EOF
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: ${volume_name}
  namespace: ${NAMESPACE}
status:
  restoreRequired: false
  restoreInitiated: false
EOF

  if kubectl apply --server-side --force-conflicts --subresource=status -f /tmp/volume-status-${volume_name}.yaml > /dev/null 2>&1; then
    rm -f /tmp/volume-status-${volume_name}.yaml
    ((FIXED++))
    echo "✓"
  else
    rm -f /tmp/volume-status-${volume_name}.yaml
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
echo "Volumes should now be able to start replicas normally. Longhorn will"
echo "rebuild missing replicas to bring volumes to healthy state."
echo ""
echo "Monitor progress with:"
echo "  kubectl get volumes -n longhorn-system -w"
echo "  kubectl get pods --all-namespaces -w | grep ContainerCreating"

rm -f /tmp/volumes-to-fix.txt
