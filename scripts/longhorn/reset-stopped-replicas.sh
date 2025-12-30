#!/bin/bash
# Reset rebuild retry count for stopped Longhorn replicas that have hit the retry limit
# This allows Longhorn to retry starting the replicas instead of deleting them

set -euo pipefail

NAMESPACE="longhorn-system"
NODE="${1:-}"

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

echo "Finding stopped replicas with rebuildRetryCount >= 5..."
echo ""

# Build jq filter
if [ -n "${NODE}" ]; then
  FILTER=".items[] | select(.spec.nodeID == \"${NODE}\" and .status.currentState == \"stopped\" and (.spec.rebuildRetryCount // 0) >= 5)"
  echo "Filtering for node: ${NODE}"
else
  FILTER=".items[] | select(.status.currentState == \"stopped\" and (.spec.rebuildRetryCount // 0) >= 5)"
  echo "Finding stopped replicas on all nodes"
fi

# Get stopped replicas that have hit the retry limit
kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r "${FILTER} | \"\(.metadata.name)|\(.spec.volumeName)|\(.spec.nodeID)|\(.spec.rebuildRetryCount // 0)\"" > /tmp/stopped-replicas-to-reset.txt

REPLICA_COUNT=$(wc -l < /tmp/stopped-replicas-to-reset.txt | tr -d ' ')

if [ "${REPLICA_COUNT}" -eq 0 ]; then
  echo "No stopped replicas with rebuildRetryCount >= 5 found."
  rm -f /tmp/stopped-replicas-to-reset.txt
  exit 0
fi

echo "Found ${REPLICA_COUNT} stopped replicas with rebuildRetryCount >= 5"
echo ""

# Show preview
echo "Preview (first 10):"
head -10 /tmp/stopped-replicas-to-reset.txt | while IFS='|' read -r replica_name volume_name node_id retry_count; do
  echo "  ${replica_name} (volume: ${volume_name}, node: ${node_id}, retries: ${retry_count})"
done

if [ "${REPLICA_COUNT}" -gt 10 ]; then
  echo "... and $((REPLICA_COUNT - 10)) more"
fi

echo ""
echo "This will reset rebuildRetryCount to 0 for these replicas, allowing Longhorn to retry starting them."
echo ""

CONFIRM=$(prompt_confirm "Reset rebuildRetryCount for ${REPLICA_COUNT} stopped replicas?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/stopped-replicas-to-reset.txt
  exit 0
fi

echo ""
echo "Resetting rebuildRetryCount..."
RESET=0
FAILED=0
COUNTER=0

while IFS='|' read -r replica_name volume_name node_id retry_count; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${REPLICA_COUNT}] ${replica_name}... "

  if kubectl patch replicas.longhorn.io "${replica_name}" -n "${NAMESPACE}" \
    --type merge \
    -p '{"spec":{"rebuildRetryCount":0}}' > /dev/null 2>&1; then
    ((RESET++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  # Brief pause to avoid overwhelming the API
  sleep 0.2
done < /tmp/stopped-replicas-to-reset.txt

echo ""
echo "=== Complete ==="
echo "Reset: ${RESET} replicas"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} replicas"
fi
echo ""
echo "Longhorn will now attempt to start these replicas. Monitor volume status to verify recovery."

rm -f /tmp/stopped-replicas-to-reset.txt
