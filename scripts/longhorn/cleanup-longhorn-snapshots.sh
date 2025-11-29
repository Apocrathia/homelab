#!/bin/bash
# Comprehensive Longhorn snapshot cleanup script
# Handles three types of cleanup:
# 1. Old recurring job snapshots beyond retention policy
# 2. Old system-generated snapshots (no RecurringJob label)
# 3. Orphaned snapshots (for deleted volumes)

set -euo pipefail

NAMESPACE="longhorn-system"
RETENTION=3
# Calculate cutoff date as RETENTION days ago (in UTC)
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS date command
  CUTOFF_DATE=$(date -u -v-${RETENTION}d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -v-${RETENTION}d +"%Y-%m-%dT%H:%M:%SZ")
else
  # Linux date command
  CUTOFF_DATE=$(date -u -d "${RETENTION} days ago" +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "${RETENTION} days ago" +"%Y-%m-%dT%H:%M:%SZ")
fi

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

# Function to delete snapshots from a file
delete_snapshots() {
  local file="$1"
  local type="$2"
  local deleted=0
  local failed=0

  while IFS= read -r line; do
    # Extract snapshot name (first field, or entire line if no delimiter)
    local snapshot
    if [[ "${line}" == *"|"* ]]; then
      snapshot=$(echo "${line}" | cut -d'|' -f1)
    else
      snapshot="${line}"
    fi

    if kubectl delete snapshot.longhorn.io "${snapshot}" -n "${NAMESPACE}" --ignore-not-found=true > /dev/null 2>&1; then
      ((deleted++))
      if [ $((deleted % 10)) -eq 0 ]; then
        echo -n "."
      fi
    else
      ((failed++))
      echo "Failed to delete: ${snapshot}"
    fi
  done < "${file}"

  echo ""
  echo "Deleted: ${deleted} ${type} snapshots"
  if [ "${failed}" -gt 0 ]; then
    echo "Failed: ${failed} ${type} snapshots"
  fi
  echo "${deleted}"
}

echo "=== Longhorn Snapshot Cleanup ==="
echo ""

# 1. Find old recurring job snapshots beyond retention
echo "1. Finding old recurring job snapshots (beyond retention of ${RETENTION})..."
kubectl get snapshots.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg cutoff "${CUTOFF_DATE}" '
    .items[] |
    select(.metadata.creationTimestamp < $cutoff) |
    select(.metadata.labels."RecurringJob" != null) |
    "\(.metadata.name)|\(.spec.volume)|\(.metadata.labels."RecurringJob")|\(.metadata.creationTimestamp)"
  ' | \
  sort -t'|' -k2,2 -k3,3 -k4,4 | \
  awk -F'|' -v retention="${RETENTION}" '
    BEGIN {
      prev_vol=""
      prev_job=""
      count=0
    }
    {
      vol=$2
      job=$3
      name=$1

      if (prev_vol != vol || prev_job != job) {
        # New volume/job combination - print old snapshots beyond retention
        if (count > retention) {
          for (i=0; i<count-retention; i++) {
            print snapshots[i]
          }
        }
        # Reset for new group
        delete snapshots
        count=0
        prev_vol=vol
        prev_job=job
      }

      snapshots[count++]=name
    }
    END {
      # Handle last group
      if (count > retention) {
        for (i=0; i<count-retention; i++) {
          print snapshots[i]
        }
      }
    }
  ' > /tmp/recurring-snapshots-to-delete.txt

RECURRING_COUNT=$(wc -l < /tmp/recurring-snapshots-to-delete.txt | tr -d ' ')

# 2. Find old system-generated snapshots
echo "2. Finding old system-generated snapshots (older than ${CUTOFF_DATE}, no RecurringJob label)..."
kubectl get snapshots.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg cutoff "${CUTOFF_DATE}" '
    .items[] |
    select(.metadata.creationTimestamp < $cutoff) |
    select(.metadata.labels."RecurringJob" == null) |
    "\(.metadata.name)|\(.spec.volume)|\(.metadata.creationTimestamp)|\(.status.size // 0)"
  ' | \
  sort -t'|' -k2,2 -k3,3 > /tmp/system-snapshots-to-delete.txt

SYSTEM_COUNT=$(wc -l < /tmp/system-snapshots-to-delete.txt | tr -d ' ')

# 3. Find orphaned snapshots
echo "3. Finding orphaned snapshots (for deleted volumes)..."
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '[.items[].metadata.name]' > /tmp/existing-volumes.json

kubectl get snapshots.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --slurpfile volumes /tmp/existing-volumes.json '
    .items[] |
    select(.spec.volume as $vol | $volumes[0] | index($vol) == null) |
    "\(.metadata.name)|\(.spec.volume)|\(.metadata.creationTimestamp)|\(.status.size // 0)"
  ' | \
  sort -t'|' -k2,2 -k3,3 > /tmp/orphaned-snapshots-to-delete.txt

ORPHANED_COUNT=$(wc -l < /tmp/orphaned-snapshots-to-delete.txt | tr -d ' ')

# Calculate total sizes
RECURRING_SIZE=$(awk -F'|' '{sum+=$4} END {print sum/1024/1024/1024}' /tmp/recurring-snapshots-to-delete.txt 2>/dev/null || echo "0")
SYSTEM_SIZE=$(awk -F'|' '{sum+=$4} END {print sum/1024/1024/1024}' /tmp/system-snapshots-to-delete.txt 2>/dev/null || echo "0")
ORPHANED_SIZE=$(awk -F'|' '{sum+=$4} END {print sum/1024/1024/1024}' /tmp/orphaned-snapshots-to-delete.txt 2>/dev/null || echo "0")

TOTAL_COUNT=$((RECURRING_COUNT + SYSTEM_COUNT + ORPHANED_COUNT))

echo ""
echo "=== Summary ==="
echo "Recurring job snapshots (beyond retention): ${RECURRING_COUNT} (~${RECURRING_SIZE} GB)"
echo "System-generated snapshots (old): ${SYSTEM_COUNT} (~${SYSTEM_SIZE} GB)"
echo "Orphaned snapshots (deleted volumes): ${ORPHANED_COUNT} (~${ORPHANED_SIZE} GB)"
echo "Total snapshots to delete: ${TOTAL_COUNT}"
echo ""

if [ "${TOTAL_COUNT}" -eq 0 ]; then
  echo "No snapshots found to clean up."
  rm -f /tmp/recurring-snapshots-to-delete.txt /tmp/system-snapshots-to-delete.txt /tmp/orphaned-snapshots-to-delete.txt /tmp/existing-volumes.json
  exit 0
fi

# Show previews
if [ "${RECURRING_COUNT}" -gt 0 ]; then
  echo "Preview of recurring job snapshots to delete (first 5):"
  head -5 /tmp/recurring-snapshots-to-delete.txt | awk '{printf "  %s\n", $0}'
  if [ "${RECURRING_COUNT}" -gt 5 ]; then
    echo "  ... and $((RECURRING_COUNT - 5)) more"
  fi
  echo ""
fi

if [ "${SYSTEM_COUNT}" -gt 0 ]; then
  echo "Preview of system snapshots to delete (first 5):"
  head -5 /tmp/system-snapshots-to-delete.txt | awk -F'|' '{printf "  %s (volume: %s, created: %s)\n", $1, $2, $3}'
  if [ "${SYSTEM_COUNT}" -gt 5 ]; then
    echo "  ... and $((SYSTEM_COUNT - 5)) more"
  fi
  echo ""
fi

if [ "${ORPHANED_COUNT}" -gt 0 ]; then
  echo "Preview of orphaned snapshots to delete (first 5):"
  head -5 /tmp/orphaned-snapshots-to-delete.txt | awk -F'|' '{printf "  %s (volume: %s, created: %s)\n", $1, $2, $3}'
  if [ "${ORPHANED_COUNT}" -gt 5 ]; then
    echo "  ... and $((ORPHANED_COUNT - 5)) more"
  fi
  echo ""
fi

# Confirm deletion
CONFIRM=$(prompt_confirm "Delete all ${TOTAL_COUNT} snapshots?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/recurring-snapshots-to-delete.txt /tmp/system-snapshots-to-delete.txt /tmp/orphaned-snapshots-to-delete.txt /tmp/existing-volumes.json
  exit 0
fi

echo ""
echo "=== Deleting Snapshots ==="
echo ""

TOTAL_DELETED=0

# Delete recurring job snapshots
if [ "${RECURRING_COUNT}" -gt 0 ]; then
  echo "Deleting ${RECURRING_COUNT} recurring job snapshots..."
  DELETED=$(delete_snapshots /tmp/recurring-snapshots-to-delete.txt "recurring job")
  TOTAL_DELETED=$((TOTAL_DELETED + DELETED))
  echo ""
fi

# Delete system snapshots
if [ "${SYSTEM_COUNT}" -gt 0 ]; then
  echo "Deleting ${SYSTEM_COUNT} system-generated snapshots..."
  DELETED=$(delete_snapshots /tmp/system-snapshots-to-delete.txt "system-generated")
  TOTAL_DELETED=$((TOTAL_DELETED + DELETED))
  echo ""
fi

# Delete orphaned snapshots
if [ "${ORPHANED_COUNT}" -gt 0 ]; then
  echo "Deleting ${ORPHANED_COUNT} orphaned snapshots..."
  DELETED=$(delete_snapshots /tmp/orphaned-snapshots-to-delete.txt "orphaned")
  TOTAL_DELETED=$((TOTAL_DELETED + DELETED))
  echo ""
fi

echo "=== Complete ==="
echo "Total snapshots deleted: ${TOTAL_DELETED}"
echo "Total space freed: ~$((RECURRING_SIZE + SYSTEM_SIZE + ORPHANED_SIZE)) GB"

# Cleanup temp files
rm -f /tmp/recurring-snapshots-to-delete.txt /tmp/system-snapshots-to-delete.txt /tmp/orphaned-snapshots-to-delete.txt /tmp/existing-volumes.json
