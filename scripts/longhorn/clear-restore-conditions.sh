#!/bin/bash
# Clear Restore condition from Longhorn volumes stuck with RestoreInProgress
# This allows Longhorn to properly reconcile volume status

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding volumes with Restore condition stuck in progress..."
echo ""

# Get volumes with Restore condition status=True and reason=RestoreInProgress
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] |
    select(.status.conditions != null) |
    select([.status.conditions[] | select(.type == "Restore" and .status == "True" and .reason == "RestoreInProgress")] | length > 0) |
    .metadata.name' > /tmp/volumes-to-fix.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-fix.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No volumes with stuck Restore condition found."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes with stuck Restore condition"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-fix.txt | while read -r volume_name; do
  echo "  ${volume_name}"
done

if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi

echo ""
echo "This will clear the Restore condition from volume status,"
echo "allowing Longhorn to properly reconcile and recognize replicas."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-fix.txt
  exit 0
fi

echo ""
echo "Clearing Restore condition from volumes..."
FIXED=0
FAILED=0
COUNTER=0

while read -r volume_name; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume_name}... "

  # Get current conditions, filter out the Restore condition, add a new False one
  CONDITIONS=$(kubectl get volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" -o json | \
    jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
      .status.conditions |
      map(select(.type != "Restore")) |
      . + [{
        "type": "Restore",
        "status": "False",
        "reason": "RestoreCancelled",
        "lastTransitionTime": $now,
        "lastProbeTime": "",
        "message": ""
      }]')

  # Create temporary YAML with updated conditions
  cat > /tmp/volume-conditions-${volume_name}.yaml <<EOF
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: ${volume_name}
  namespace: ${NAMESPACE}
status:
  conditions: $(echo "${CONDITIONS}" | jq -c .)
EOF

  if kubectl apply --server-side --force-conflicts --subresource=status -f /tmp/volume-conditions-${volume_name}.yaml > /dev/null 2>&1; then
    rm -f /tmp/volume-conditions-${volume_name}.yaml
    ((FIXED++))
    echo "✓"
  else
    rm -f /tmp/volume-conditions-${volume_name}.yaml
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
echo "Volumes should now be able to reconcile properly. Longhorn will"
echo "recognize the existing replicas and update volume status."
echo ""
echo "Monitor progress with:"
echo "  kubectl get volumes -n longhorn-system -w"

rm -f /tmp/volumes-to-fix.txt
