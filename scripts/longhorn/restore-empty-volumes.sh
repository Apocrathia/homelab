#!/bin/bash
# Restore empty Longhorn volumes from backup
# This script scales down workloads, restores volumes, then scales them back up
# Required because Longhorn cannot restore attached volumes

set -euo pipefail

NAMESPACE="longhorn-system"

echo "Finding volumes in creating state with 0 bytes and backups..."
echo ""

# Get volumes in creating state that have a lastBackup and 0 actualSize
kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
  jq -r '.items[] |
    select(.status.state == "creating") |
    select(.status.lastBackup != null and .status.lastBackup != "") |
    select(.status.actualSize == 0) |
    "\(.metadata.name)|\(.status.lastBackup)"' > /tmp/volumes-to-restore-names.txt

VOLUME_COUNT=$(wc -l < /tmp/volumes-to-restore-names.txt | tr -d ' ')

if [ "${VOLUME_COUNT}" -eq 0 ]; then
  echo "No empty volumes in creating state with backups found."
  rm -f /tmp/volumes-to-restore-names.txt
  exit 0
fi

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

ACTUAL_COUNT=$(wc -l < /tmp/volumes-to-restore.txt | tr -d ' ')

if [ "${ACTUAL_COUNT}" -eq 0 ]; then
  echo "No volumes with valid backup URLs found."
  rm -f /tmp/volumes-to-restore.txt
  exit 0
fi

echo "Found ${ACTUAL_COUNT} empty volumes to restore"
echo ""
echo "Preview:"
while IFS='|' read -r volume_name backup_url; do
  # Extract backup name from URL (macOS-compatible, no -P flag)
  backup_name=$(echo "${backup_url}" | sed -n 's/.*backup=\([^&]*\).*/\1/p' || echo "${backup_url}")
  echo "  ${volume_name} (backup: ${backup_name})"
done < /tmp/volumes-to-restore.txt

echo ""
echo "⚠️  WARNING: This will:"
echo "   1. Scale down workloads using these volumes (causes downtime)"
echo "   2. Detach volumes"
echo "   3. Restore volumes from backups"
echo "   4. Scale workloads back up"
echo ""
echo "   This will cause downtime for affected applications."
echo ""

read -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  rm -f /tmp/volumes-to-restore.txt
  exit 0
fi

echo ""
echo "Step 1: Scaling down workloads..."
SCALED_DOWN=()

while IFS='|' read -r volume_name backup_url; do
  # Find pods using this volume
  pod_info=$(kubectl get pods --all-namespaces -o json | \
    jq -r --arg vol "$volume_name" '.items[] |
      select(.spec.volumes[]?.persistentVolumeClaim.claimName // "" | contains($vol)) |
      "\(.metadata.namespace)|\(.metadata.ownerReferences[0].kind)|\(.metadata.ownerReferences[0].name)"' | head -1)

  if [ -n "$pod_info" ]; then
    IFS='|' read -r ns owner_kind owner_name <<< "$pod_info"

    # If pod is owned by ReplicaSet, find the Deployment/StatefulSet that owns it
    if [ "$owner_kind" = "ReplicaSet" ]; then
      rs_info=$(kubectl get replicaset "$owner_name" -n "$ns" -o json 2>/dev/null | \
        jq -r '.metadata.ownerReferences[]? | select(.kind == "Deployment" or .kind == "StatefulSet") | "\(.kind)|\(.name)"' | head -1)

      if [ -n "$rs_info" ]; then
        IFS='|' read -r kind name <<< "$rs_info"
      else
        echo "  WARNING: ReplicaSet ${ns}/${owner_name} has no Deployment/StatefulSet owner, skipping"
        continue
      fi
    else
      kind="$owner_kind"
      name="$owner_name"
    fi

    echo "  Scaling down ${ns}/${kind}/${name}..."

    case "$kind" in
      Deployment)
        replicas=$(kubectl get deployment "$name" -n "$ns" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        kubectl scale deployment "$name" -n "$ns" --replicas=0 > /dev/null 2>&1
        SCALED_DOWN+=("${ns}|${kind}|${name}|${replicas}")
        ;;
      StatefulSet)
        replicas=$(kubectl get statefulset "$name" -n "$ns" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        kubectl scale statefulset "$name" -n "$ns" --replicas=0 > /dev/null 2>&1
        SCALED_DOWN+=("${ns}|${kind}|${name}|${replicas}")
        ;;
      *)
        echo "    WARNING: Unknown owner kind ${kind}, cannot scale down automatically"
        ;;
    esac
  else
    echo "  WARNING: Could not find pod using volume ${volume_name}"
  fi
done < /tmp/volumes-to-restore.txt

echo ""
echo "Waiting for pods to terminate and volumes to detach..."
sleep 10

# Wait for volumes to detach
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  # Build list of volume names to check
  volume_names=$(while IFS='|' read -r volume_name backup_url; do echo "$volume_name"; done < /tmp/volumes-to-restore.txt | tr '\n' '|' | sed 's/|$//')

  attached_count=$(kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
    jq -r --arg names "$volume_names" '
      ($names | split("|")) as $vol_list |
      [.items[] | select(.metadata.name as $n | $vol_list | index($n) != null) |
        select(.status.state == "attached" or .status.state == "creating")] | length')

  if [ "${attached_count}" -eq 0 ]; then
    break
  fi

  echo "  Waiting for volumes to detach... (${WAITED}s)"
  sleep 5
  WAITED=$((WAITED + 5))
done

echo ""
echo "Step 2: Restoring volumes from backups..."
RESTORED=0
FAILED=0
COUNTER=0

while IFS='|' read -r volume_name backup_url; do
  ((COUNTER++))
  echo -n "[${COUNTER}/${ACTUAL_COUNT}] ${volume_name}... "

  # Set fromBackup with full URL
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
    ((RESTORED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  sleep 0.5
done < /tmp/volumes-to-restore.txt

echo ""
echo "Step 3: Waiting for restore to complete..."
echo "  This may take several minutes depending on backup sizes."
echo "  Monitor with: kubectl get volumes -n longhorn-system -w"
echo ""

# Wait for restore to complete (check every 30 seconds)
MAX_RESTORE_WAIT=3600  # 1 hour max
RESTORE_WAITED=0
while [ $RESTORE_WAITED -lt $MAX_RESTORE_WAIT ]; do
  # Build list of volume names to check
  volume_names=$(while IFS='|' read -r volume_name backup_url; do echo "$volume_name"; done < /tmp/volumes-to-restore.txt | tr '\n' '|' | sed 's/|$//')

  restoring_count=$(kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | \
    jq -r --arg names "$volume_names" '
      ($names | split("|")) as $vol_list |
      [.items[] | select(.metadata.name as $n | $vol_list | index($n) != null) |
        select(.status.state == "creating" or .status.restoreRequired == true)] | length')

  if [ "${restoring_count}" -eq 0 ]; then
    echo "  All volumes have completed restore."
    break
  fi

  if [ $((RESTORE_WAITED % 60)) -eq 0 ]; then
    echo "  Still restoring ${restoring_count} volumes... (${RESTORE_WAITED}s)"
  fi

  sleep 30
  RESTORE_WAITED=$((RESTORE_WAITED + 30))
done

echo ""
echo "Step 4: Scaling workloads back up..."
for item in "${SCALED_DOWN[@]}"; do
  IFS='|' read -r ns kind name replicas <<< "$item"
  echo "  Scaling up ${ns}/${kind}/${name} to ${replicas} replicas..."

  case "$kind" in
    Deployment)
      kubectl scale deployment "$name" -n "$ns" --replicas="$replicas" > /dev/null 2>&1
      ;;
    StatefulSet)
      kubectl scale statefulset "$name" -n "$ns" --replicas="$replicas" > /dev/null 2>&1
      ;;
  esac
done

echo ""
echo "=== Complete ==="
echo "Restored: ${RESTORED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Volumes should now be restored and workloads scaled back up."
echo "Monitor volume status with: kubectl get volumes -n longhorn-system -w"

rm -f /tmp/volumes-to-restore.txt
