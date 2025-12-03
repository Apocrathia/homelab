#!/bin/bash
# Clean up stopped Longhorn replicas that have hit the rebuild retry limit
# These replicas consume disk space but are not active and safe to delete
# as long as the volume has sufficient healthy replicas on other nodes

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

echo "Finding stopped replicas..."
echo ""

# Build jq filter
if [ -n "${NODE}" ]; then
  FILTER=".items[] | select(.spec.nodeID == \"${NODE}\" and .status.currentState == \"stopped\")"
  echo "Filtering for node: ${NODE}"
else
  FILTER=".items[] | select(.status.currentState == \"stopped\")"
  echo "Finding stopped replicas on all nodes"
fi

# Get stopped replicas
kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r "${FILTER} | \"\(.metadata.name)|\(.spec.volumeName)|\(.spec.nodeID)|\(.spec.rebuildRetryCount // 0)\"" > /tmp/stopped-replicas.txt

REPLICA_COUNT=$(wc -l < /tmp/stopped-replicas.txt | tr -d ' ')

if [ "${REPLICA_COUNT}" -eq 0 ]; then
  echo "No stopped replicas found."
  rm -f /tmp/stopped-replicas.txt
  exit 0
fi

echo "Found ${REPLICA_COUNT} stopped replicas"
echo ""

# Verify volumes have enough healthy replicas
echo "Verifying volumes have sufficient healthy replicas..."
echo ""

SAFE_TO_DELETE=0
UNSAFE_TO_DELETE=0

while IFS='|' read -r replica_name volume_name node_id retry_count; do
  # Get volume replica count and actual running replicas
  volume_info=$(kubectl get volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" -o json 2>/dev/null || echo "{}")

  if [ "${volume_info}" = "{}" ]; then
    echo "  WARNING: Volume ${volume_name} not found, skipping ${replica_name}"
    ((UNSAFE_TO_DELETE++))
    continue
  fi

  desired_replicas=$(echo "${volume_info}" | jq -r '.spec.numberOfReplicas // 2')
  running_replicas=$(kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | \
    jq -r "[.items[] | select(.spec.volumeName == \"${volume_name}\" and .status.currentState == \"running\")] | length")

  if [ "${running_replicas}" -ge "${desired_replicas}" ]; then
    ((SAFE_TO_DELETE++))
  else
    echo "  WARNING: Volume ${volume_name} only has ${running_replicas}/${desired_replicas} running replicas, skipping ${replica_name}"
    ((UNSAFE_TO_DELETE++))
  fi
done < /tmp/stopped-replicas.txt

echo ""
echo "Summary:"
echo "  Safe to delete: ${SAFE_TO_DELETE}"
echo "  Unsafe to delete: ${UNSAFE_TO_DELETE}"
echo ""

if [ "${SAFE_TO_DELETE}" -eq 0 ]; then
  echo "No replicas are safe to delete."
  rm -f /tmp/stopped-replicas.txt
  exit 0
fi

# Show preview
echo "Preview (first 10 safe to delete):"
SAFE_COUNT=0
while IFS='|' read -r replica_name volume_name node_id retry_count; do
  volume_info=$(kubectl get volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" -o json 2>/dev/null || echo "{}")
  if [ "${volume_info}" = "{}" ]; then
    continue
  fi
  desired_replicas=$(echo "${volume_info}" | jq -r '.spec.numberOfReplicas // 2')
  running_replicas=$(kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | \
    jq -r "[.items[] | select(.spec.volumeName == \"${volume_name}\" and .status.currentState == \"running\")] | length")

  if [ "${running_replicas}" -ge "${desired_replicas}" ]; then
    echo "  ${replica_name} (volume: ${volume_name}, node: ${node_id}, retries: ${retry_count})"
    ((SAFE_COUNT++))
    if [ "${SAFE_COUNT}" -ge 10 ]; then
      break
    fi
  fi
done < /tmp/stopped-replicas.txt

if [ "${SAFE_TO_DELETE}" -gt 10 ]; then
  echo "... and $((SAFE_TO_DELETE - 10)) more"
fi

echo ""

CONFIRM=$(prompt_confirm "Delete ${SAFE_TO_DELETE} stopped replicas?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/stopped-replicas.txt
  exit 0
fi

echo ""
echo "Deleting stopped replicas..."
DELETED=0
FAILED=0

while IFS='|' read -r replica_name volume_name node_id retry_count; do
  # Verify volume still has enough replicas before deleting
  volume_info=$(kubectl get volumes.longhorn.io "${volume_name}" -n "${NAMESPACE}" -o json 2>/dev/null || echo "{}")
  if [ "${volume_info}" = "{}" ]; then
    continue
  fi

  desired_replicas=$(echo "${volume_info}" | jq -r '.spec.numberOfReplicas // 2')
  running_replicas=$(kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | \
    jq -r "[.items[] | select(.spec.volumeName == \"${volume_name}\" and .status.currentState == \"running\")] | length")

  if [ "${running_replicas}" -ge "${desired_replicas}" ]; then
    if kubectl delete replicas.longhorn.io "${replica_name}" -n "${NAMESPACE}" --ignore-not-found=true > /dev/null 2>&1; then
      ((DELETED++))
      if [ $((DELETED % 10)) -eq 0 ]; then
        echo "  Deleted ${DELETED} replicas..."
      fi
    else
      ((FAILED++))
      echo "  Failed to delete ${replica_name}"
    fi
  fi
done < /tmp/stopped-replicas.txt

echo ""
echo "Cleanup complete:"
echo "  Deleted: ${DELETED}"
echo "  Failed: ${FAILED}"
echo "  Skipped (unsafe): ${UNSAFE_TO_DELETE}"

rm -f /tmp/stopped-replicas.txt
