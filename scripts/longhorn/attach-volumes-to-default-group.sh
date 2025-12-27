#!/bin/bash
# Attach all Longhorn volumes to the default recurring job group
# This ensures volumes receive backup and snapshot jobs from recurring jobs in the default group

set -euo pipefail

NAMESPACE="longhorn-system"
GROUP_NAME="default"

echo "Finding volumes not attached to the '${GROUP_NAME}' recurring job group..."

LABEL_KEY="recurring-job-group.longhorn.io/${GROUP_NAME}"
LABEL_VALUE="enabled"

# Get volumes that need updating (those without the label)
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r --arg key "${LABEL_KEY}" --arg value "${LABEL_VALUE}" '
    .items[] |
    select(
      .metadata.labels == null or
      .metadata.labels[$key] != $value
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

  # Check if label already exists (double-check before patching)
  # Use jq because jsonpath doesn't handle label keys with dots properly
  CURRENT_LABEL=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o json 2>/dev/null | \
    jq -r --arg key "${LABEL_KEY}" '.metadata.labels[$key] // ""' || echo "")

  if [ "${CURRENT_LABEL}" = "${LABEL_VALUE}" ]; then
    echo "⊘ (already has label, skipping)"
    continue
  fi

  # Add the label to attach volume to the recurring job group
  PATCH_OUTPUT=$(timeout 15 kubectl label volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    "${LABEL_KEY}=${LABEL_VALUE}" \
    --overwrite 2>&1)
  PATCH_EXIT=$?

  # Brief pause to let API settle
  sleep 0.5

  # Verify the label was added
  # Use jq because jsonpath doesn't handle label keys with dots properly
  NEW_LABEL=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o json 2>/dev/null | \
    jq -r --arg key "${LABEL_KEY}" '.metadata.labels[$key] // ""' || echo "")

  if [ "${NEW_LABEL}" = "${LABEL_VALUE}" ]; then
    ((UPDATED++))
    echo "✓ (label added)"
  else
    ((FAILED++))
    echo "✗ (label not set)"
    if [ "${PATCH_EXIT}" -eq 124 ]; then
      echo "    → Label command timed out (volume may be busy - check if label was added anyway)"
      # Check one more time after timeout
      sleep 1
      FINAL_CHECK=$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o json 2>/dev/null | \
        jq -r --arg key "${LABEL_KEY}" '.metadata.labels[$key] // ""' || echo "")
      if [ "${FINAL_CHECK}" = "${LABEL_VALUE}" ]; then
        ((UPDATED++))
        ((FAILED--))
        echo "    → Actually succeeded! (verified: label is set)"
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
