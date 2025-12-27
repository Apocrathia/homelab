#!/bin/bash
# Attach all Longhorn volumes to the default recurring job group
# This ensures volumes receive backup and snapshot jobs from recurring jobs in the default group

set -euo pipefail

NAMESPACE="longhorn-system"
GROUP_NAME="default"

echo "Finding volumes not attached to the '${GROUP_NAME}' recurring job group..."

# Get volumes that need updating (those without the default group in their recurringJobSelector)
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg group "${GROUP_NAME}" '
    .items[] |
    select(
      .spec.recurringJobSelector == null or
      (.spec.recurringJobSelector.groups // [] | index($group) == null)
    ) |
    .metadata.name
  ' > /tmp/volumes-to-update.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-update.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "All volumes are already attached to the '${GROUP_NAME}' recurring job group."
  rm -f /tmp/volumes-to-update.txt
  exit 0
fi

echo "Found ${VOLUME_COUNT} volumes to update"
echo ""
echo "Preview (first 10):"
head -10 /tmp/volumes-to-update.txt | awk '{printf "  %s\n", $0}'
if [ "${VOLUME_COUNT}" -gt 10 ]; then
  echo "... and $((VOLUME_COUNT - 10)) more"
fi
echo ""

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

CONFIRM=$(prompt_confirm "Attach ${VOLUME_COUNT} volumes to the '${GROUP_NAME}' recurring job group?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-update.txt
  exit 0
fi

echo ""
echo "Attaching volumes to '${GROUP_NAME}' group..."
echo "(This will enable backup and snapshot jobs for these volumes)"
UPDATED=0
FAILED=0
COUNTER=0

while IFS= read -r volume; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${VOLUME_COUNT}] ${volume}... "

  # Get current recurring job selector
  CURRENT_SELECTOR=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.recurringJobSelector}' 2>/dev/null || echo "null")

  # Build the patch payload
  # If recurringJobSelector is null or empty, create it with the default group
  # If it exists, add default group to the groups array
  PATCH_PAYLOAD=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o json | \
    jq --arg group "${GROUP_NAME}" '
      if .spec.recurringJobSelector == null then
        .spec.recurringJobSelector = { groups: [$group] }
      elif .spec.recurringJobSelector.groups == null then
        .spec.recurringJobSelector.groups = [$group]
      elif (.spec.recurringJobSelector.groups | index($group)) == null then
        .spec.recurringJobSelector.groups += [$group]
      else
        .  # Already has the group, no change needed
      end |
      { spec: { recurringJobSelector: .spec.recurringJobSelector } }
    ')

  # Try to patch the volume with a timeout
  PATCH_OUTPUT=$(timeout 15 kubectl patch volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    --type merge \
    -p "${PATCH_PAYLOAD}" 2>&1)
  PATCH_EXIT=$?

  # Brief pause to let API settle
  sleep 0.5

  # Verify the patch worked by checking if default group is now in the selector
  NEW_SELECTOR=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.recurringJobSelector.groups[*]}' 2>/dev/null || echo "")

  if echo "${NEW_SELECTOR}" | grep -q "${GROUP_NAME}"; then
    ((UPDATED++))
    echo "✓ (groups: ${NEW_SELECTOR})"
  else
    ((FAILED++))
    echo "✗ (groups: ${NEW_SELECTOR:-none})"
    if [ "${PATCH_EXIT}" -eq 124 ]; then
      echo "    → Patch command timed out (volume may be busy - check if patch succeeded anyway)"
      # Check one more time after timeout
      sleep 1
      FINAL_CHECK=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o jsonpath='{.spec.recurringJobSelector.groups[*]}' 2>/dev/null || echo "")
      if echo "${FINAL_CHECK}" | grep -q "${GROUP_NAME}"; then
        ((UPDATED++))
        ((FAILED--))
        echo "    → Actually succeeded! (verified: ${FINAL_CHECK})"
      fi
    elif [ "${PATCH_EXIT}" -ne 0 ] && [ -n "${PATCH_OUTPUT}" ]; then
      echo "    → Error: ${PATCH_OUTPUT}"
    fi
  fi
done < /tmp/volumes-to-update.txt

echo ""
echo "=== Complete ==="
echo "Updated: ${UPDATED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Note: Volumes are now attached to the '${GROUP_NAME}' recurring job group."
echo "      Backup and snapshot jobs from recurring jobs in this group will now run on these volumes."

rm -f /tmp/volumes-to-update.txt
