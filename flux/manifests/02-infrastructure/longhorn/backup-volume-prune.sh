#!/bin/sh
# Prune BackupVolume CRs whose Longhorn volume no longer exists.
#
# Why: longhorn v1.13.0 never garbage-collects BackupVolume CRs for deleted
# volumes (347 orphans accumulated over ~1 year). Each orphan costs the
# backup-target sync loop a mount/ls/umount subprocess chain every pass.
# Why a recurring job: the CIFS target keeps the orphan's backup folder, so
# a CR-only delete (longhorn.io/delete-custom-resource-only label) is re-synced
# within one pollInterval. A plain `kubectl delete backupvolume` instead uses
# longhorn's own deletion flow, which also removes the target-side data, so the
# orphan cannot regrow.
#
# Safety:
#   - matches like the manual prune: strip the trailing "-<8 hex>" hash from
#     the BackupVolume name and compare against live Volume names
#   - skips orphans whose newest backup (status.lastBackupAt) is younger than
#     PRUNE_GRACE_DAYS, so recently deleted volumes keep a post-mortem restore
#     window and in-flight backup restores are not pulled out from under
#   - PRUNE_MODE=dry-run (default) only logs; PRUNE_MODE=delete actually prunes
#
# Requires: kubectl + busybox sh (alpine/kubectl image). No jq, no bash.
set -eu

MODE="${PRUNE_MODE:-dry-run}"
GRACE_DAYS="${PRUNE_GRACE_DAYS:-14}"
NS="longhorn-system"

case "$MODE" in
  delete) echo "PRUNE_MODE=delete: orphans WILL be deleted" ;;
  *) echo "PRUNE_MODE=$MODE (dry-run): logging only, nothing deleted" ;;
esac

# Grace cutoff as YYYY-MM-DD. Epoch math with the "@seconds" form of date -d:
# busybox (alpine/kubectl image) and GNU date both support it, and busybox
# rejects relative specs ("-d 'N days ago'") and has no -v — the previous
# fallback chain died under set -e before doing any work. This script only runs
# in the CronJob container, so no per-platform fallbacks.
CUTOFF="$(date -u -d "@$(( $(date +%s) - GRACE_DAYS * 86400 ))" +%F)"
echo "Grace window: orphans with a backup newer than $CUTOFF are kept"

# Live volume names -> temp file, one per line
kubectl -n "$NS" get volumes.longhorn.io -o jsonpath='{.items[*].metadata.name}' \
  | tr ' ' '\n' | grep -v '^$' > /tmp/live-volumes.txt || true
LIVE_COUNT=$(wc -l < /tmp/live-volumes.txt | tr -d ' ')

# BackupVolume name + lastBackupAt -> temp file, tab-separated
kubectl -n "$NS" get backupvolumes.longhorn.io \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.lastBackupAt}{"\n"}{end}' \
  > /tmp/backupvolumes.txt

MATCHED=0; GRACE_SKIPPED=0; ORPHANS=0; DELETED=0
: > /tmp/orphans.txt

while read -r NAME LAST_AT; do
  [ -n "$NAME" ] || continue

  # Strip the trailing -<8 hex> hash to get the source volume name.
  BASE="$NAME"
  case "$NAME" in
    *-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
      BASE="${NAME%-*}"
      ;;
  esac

  if grep -qxF "$BASE" /tmp/live-volumes.txt; then
    MATCHED=$((MATCHED + 1))
    continue
  fi

  # Orphan. Apply the grace window on the newest backup date.
  LB_DATE="${LAST_AT%%T*}"
  if [ -n "$LB_DATE" ] && [ "$(awk -v d="$LB_DATE" -v c="$CUTOFF" 'BEGIN {print (d >= c)}')" = "1" ]; then
    GRACE_SKIPPED=$((GRACE_SKIPPED + 1))
    echo "KEEP (grace): $NAME (last backup $LB_DATE, volume '$BASE' deleted < ${GRACE_DAYS}d ago)"
    continue
  fi

  ORPHANS=$((ORPHANS + 1))
  echo "$NAME" >> /tmp/orphans.txt
  if [ -z "$LB_DATE" ]; then
    echo "ORPHAN (no backups ever): $NAME (volume '$BASE')"
  else
    echo "ORPHAN: $NAME (volume '$BASE', last backup $LB_DATE)"
  fi
done < /tmp/backupvolumes.txt

echo "---"
echo "Live volumes: $LIVE_COUNT | BackupVolumes matched: $MATCHED | orphans: $ORPHANS | grace-kept: $GRACE_SKIPPED"

if [ "$MODE" != "delete" ]; then
  echo "dry-run complete: $ORPHANS orphan(s) would be deleted. Set PRUNE_MODE=delete to prune."
  exit 0
fi

while read -r NAME; do
  [ -n "$NAME" ] || continue
  echo "Deleting $NAME ..."
  # --wait=false: the longhorn.io finalizer on BackupVolume makes longhorn-
  # manager clean the target-side data asynchronously; no need to block here.
  kubectl -n "$NS" delete backupvolume.longhorn.io "$NAME" --wait=false \
    && DELETED=$((DELETED + 1)) \
    || echo "WARN: failed to delete $NAME (will retry next run)"
done < /tmp/orphans.txt

echo "Deleted $DELETED/$ORPHANS orphan BackupVolume(s)."
[ "$DELETED" -eq "$ORPHANS" ] || exit 1
