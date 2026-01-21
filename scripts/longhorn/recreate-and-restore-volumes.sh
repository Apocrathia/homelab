#!/bin/bash
# Recreate stuck Longhorn volumes and restore from backup
# This deletes the stuck Volume CRs and PVCs, lets them recreate, then restores

set -euo pipefail

NAMESPACE="longhorn-system"

VOLUMES=(
  "plex-config:plex"
  "sabnzbd-config:sabnzbd"
  "tunarr-config:tunarr"
  "romm-assets:romm"
  "romm-config:romm"
  "archisteamfarm-plugins:archisteamfarm"
)

echo "⚠️  WARNING: This will:"
echo "   1. Delete Longhorn Volume CRs for stuck volumes"
echo "   2. Delete PVCs (they will be recreated automatically)"
echo "   3. Wait for new volumes to be created"
echo "   4. Restore from backup"
echo ""
echo "   This is SAFE because:"
echo "   - Current volumes are empty (0 bytes)"
echo "   - Backups are valid and will be restored"
echo "   - PVCs will be recreated by your Helm charts"
echo ""

read -r -p "Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 1: Getting backup URLs..."
declare -A BACKUP_URLS
for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"
  backup=$(kubectl get volumes.longhorn.io "$vol_name" -n "${NAMESPACE}" -o jsonpath='{.status.lastBackup}' 2>/dev/null || echo "")
  if [ -n "$backup" ] && [ "$backup" != "null" ]; then
    backup_url=$(kubectl get backups.longhorn.io "$backup" -n "${NAMESPACE}" -o jsonpath='{.status.url}' 2>/dev/null)
    if [ -n "$backup_url" ] && [ "$backup_url" != "null" ]; then
      BACKUP_URLS["$vol_name"]="$backup_url"
      echo "  $vol_name: $backup_url"
    else
      echo "  WARNING: Could not get backup URL for $vol_name"
    fi
  else
    echo "  WARNING: No backup found for $vol_name"
  fi
done

echo ""
echo "Step 2: Deleting Longhorn Volume CRs..."
for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"
  echo "  Deleting Longhorn volume $vol_name..."
  kubectl delete volumes.longhorn.io "$vol_name" -n "${NAMESPACE}" --wait=false 2>&1 | head -1 || echo "    (may already be deleted)"
done

echo ""
echo "Step 3: Waiting for volumes to be fully deleted..."
sleep 10

echo ""
echo "Step 4: Deleting PVCs (they will be recreated by Helm)..."
for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"
  echo "  Deleting PVC $ns/$vol_name..."
  kubectl delete pvc "$vol_name" -n "$ns" 2>&1 | head -1 || echo "    (may already be deleted)"
done

echo ""
echo "Step 5: Triggering Helm reconciliation to recreate PVCs..."
# Trigger Flux HelmRelease reconciliation for each namespace
for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"
  # Find HelmRelease in the namespace (assuming it matches the namespace name or app name)
  hr_name=$(kubectl get hr -n "$ns" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  if [ -n "$hr_name" ]; then
    echo "  Triggering reconciliation for $ns/$hr_name..."
    kubectl annotate hr "$hr_name" -n "$ns" \
      reconcile.fluxcd.io/requestedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --overwrite > /dev/null 2>&1 || true
  else
    echo "  WARNING: No HelmRelease found in namespace $ns"
  fi
done

echo ""
echo "Step 6: Waiting for PVCs and volumes to be recreated..."
echo "  This may take 1-2 minutes..."
sleep 30

# Wait for volumes to be recreated
MAX_WAIT=300
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  recreated=0
  for vol_ns in "${VOLUMES[@]}"; do
    IFS=':' read -r vol_name ns <<< "$vol_ns"
    if kubectl get volumes.longhorn.io "$vol_name" -n "${NAMESPACE}" > /dev/null 2>&1; then
      ((recreated++))
    fi
  done

  if [ $recreated -eq ${#VOLUMES[@]} ]; then
    echo "  All volumes recreated!"
    break
  fi

  if [ $((WAITED % 30)) -eq 0 ]; then
    echo "  Waiting for volumes to recreate... (${recreated}/${#VOLUMES[@]} done, ${WAITED}s)"
  fi

  sleep 10
  WAITED=$((WAITED + 10))
done

echo ""
echo "Step 7: Verifying PVCs were recreated by Helm..."
PVC_ISSUES=0
for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"

  if ! kubectl get pvc "$vol_name" -n "$ns" > /dev/null 2>&1; then
    echo "  ✗ WARNING: PVC $ns/$vol_name does not exist"
    ((PVC_ISSUES++))
    continue
  fi

  # Check for Helm management labels
  helm_name=$(kubectl get pvc "$vol_name" -n "$ns" -o jsonpath='{.metadata.labels.helm\.toolkit\.fluxcd\.io/name}' 2>/dev/null || echo "")
  helm_ns=$(kubectl get pvc "$vol_name" -n "$ns" -o jsonpath='{.metadata.labels.helm\.toolkit\.fluxcd\.io/namespace}' 2>/dev/null || echo "")

  if [ -z "$helm_name" ] || [ -z "$helm_ns" ]; then
    echo "  ✗ WARNING: PVC $ns/$vol_name is missing Helm management labels"
    echo "    This PVC was likely created manually. Helm may not manage it properly."
    echo "    Consider deleting it and letting Helm recreate it."
    ((PVC_ISSUES++))
  else
    echo "  ✓ PVC $ns/$vol_name is managed by Helm ($helm_ns/$helm_name)"
  fi
done

if [ $PVC_ISSUES -gt 0 ]; then
  echo ""
  echo "  ⚠️  WARNING: Some PVCs have issues. You may need to:"
  echo "    1. Delete the problematic PVCs manually"
  echo "    2. Trigger Helm reconciliation to recreate them"
  echo "    3. Verify they have Helm labels and correct sizes"
fi

echo ""
echo "Step 8: Restoring volumes from backup..."
RESTORED=0
FAILED=0

for vol_ns in "${VOLUMES[@]}"; do
  IFS=':' read -r vol_name ns <<< "$vol_ns"

  if [ -z "${BACKUP_URLS[$vol_name]:-}" ]; then
    echo "  SKIP $vol_name (no backup URL)"
    ((FAILED++))
    continue
  fi

  echo -n "  Restoring $vol_name... "

  if kubectl patch volumes.longhorn.io "$vol_name" -n "${NAMESPACE}" \
    --type merge \
    -p "{\"spec\":{\"fromBackup\":\"${BACKUP_URLS[$vol_name]}\"}}" > /dev/null 2>&1; then
    ((RESTORED++))
    echo "✓"
  else
    ((FAILED++))
    echo "✗"
  fi

  sleep 1
done

echo ""
echo "=== Complete ==="
echo "Restored: ${RESTORED} volumes"
if [ "${FAILED}" -gt 0 ]; then
  echo "Failed: ${FAILED} volumes"
fi
echo ""
echo "Volumes are now restoring from backup. This may take several minutes."
echo "Monitor with: kubectl get volumes -n longhorn-system -w"
echo ""
echo "Note: You may need to scale workloads back up after restore completes."
