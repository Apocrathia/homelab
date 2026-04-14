#!/usr/bin/env bash
# Longhorn "DiskFilesystemChanged / record diskUUID doesn't match" recovery helper.
#
# Longhorn will NOT let you remove a disk from nodes.longhorn.io while replicas still reference it:
#   "Please disable the disk ... and remove all replicas and backing images first"
#
# Official flow: disable scheduling → request eviction → wait until zero replicas on that disk →
# remove disk from spec → re-add same path (Longhorn records the new filesystem UUID).
#
# If EVERY node's disk is broken, eviction is a DEADLOCK: there is no healthy disk to receive
# replicas. You must introduce at least one schedulable disk (e.g. a second path with a fresh
# filesystem on each node — see scripts/longhorn/README.md "Disk UUID Mismatch").
#
# Usage:
#   ./fix-disk-uuid-mismatch.sh rescan              # bump force-disk-rescan (cheap try)
#   ./fix-disk-uuid-mismatch.sh status              # schedulable disk summary + replica counts
#   ./fix-disk-uuid-mismatch.sh prepare NODE ...    # allowScheduling=false + evictionRequested on disk
#   ./fix-disk-uuid-mismatch.sh finish NODE ...     # remove+re-add disk IF node has zero replicas
#   LONGHORN_DISK_KEY=my-disk ./fix-disk-uuid-mismatch.sh finish talos-03
#   DRY_RUN=1 ./fix-disk-uuid-mismatch.sh finish talos-03
#
set -euo pipefail

NAMESPACE="longhorn-system"
DRY_RUN="${DRY_RUN:-0}"
LONGHORN_DISK_KEY="${LONGHORN_DISK_KEY:-}"

# RFC 6901 escape for a single JSON Pointer path segment (disk map keys with / or ~).
escape_json_pointer_segment() {
  local s=$1
  s=${s//~/~0}
  s=${s//\//~1}
  printf '%s' "$s"
}

cmd_rescan() {
  echo "Annotating nodes.longhorn.io with longhorn.io/force-disk-rescan (and force-sync)..."
  local ts
  ts=$(date +%s)
  kubectl get nodes.longhorn.io -n "${NAMESPACE}" -o json | jq -r '.items[].metadata.name' | while read -r n; do
    [ -z "${n}" ] && continue
    if [ "${DRY_RUN}" = "1" ]; then
      echo "DRY_RUN: annotate ${n} longhorn.io/force-disk-rescan=${ts}"
    else
      kubectl annotate nodes.longhorn.io "${n}" -n "${NAMESPACE}" \
        "longhorn.io/force-disk-rescan=${ts}" \
        "longhorn.io/force-sync=${ts}" \
        --overwrite
      echo "  ${n}: annotated"
    fi
  done
  echo "Wait 1–2 minutes, then: $0 status"
}

cmd_status() {
  echo "=== Schedulable / Ready disks (from nodes.longhorn.io status) ==="
  kubectl get nodes.longhorn.io -n "${NAMESPACE}" -o json | jq -r '
    .items[] as $n
    | ($n.status.diskStatus // {}) | to_entries[] as $d
    | $d.value.conditions[]?
    | select(.type == "Schedulable")
    | "\($n.metadata.name) \($d.key): Schedulable=\(.status) (\(.reason // ""))"
  ' | sort
  echo ""
  echo "=== Replica count per Kubernetes node (spec.nodeID) ==="
  kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json | jq -r '
    [.items[] | .spec.nodeID // "unknown"] | group_by(.) | map({node: .[0], n: length}) | .[]
    | "\(.node)\t\(.n)"
  ' | sort -t$'\t' -k2 -nr
}

replica_count_on_node() {
  local node=$1
  kubectl get replicas.longhorn.io -n "${NAMESPACE}" -o json |
    jq --arg n "${node}" '[.items[] | select(.spec.nodeID == $n)] | length'
}

disk_key_for_node() {
  local node=$1
  kubectl get nodes.longhorn.io "${node}" -n "${NAMESPACE}" -o json | jq -r --arg override "${LONGHORN_DISK_KEY}" '
    if (($override | length) > 0) then $override
    else
      (.spec.disks // {}) as $d
      | if ($d | length) == 0 then empty
        else
          ($d | to_entries | sort_by(.key)) as $e
          | ($e | map(select(.value.path // "" | contains("longhorn"))) | .[0].key)
            // $e[0].key
        end
    end
  '
}

cmd_prepare() {
  local node disk_key patch
  for node in "$@"; do
    disk_key=$(disk_key_for_node "${node}")
    if [ -z "${disk_key}" ]; then
      echo "Skip ${node}: no disk in spec"
      continue
    fi
    echo "=== prepare ${node} disk ${disk_key} (disable scheduling + request eviction) ==="
    patch=$(jq -n --arg k "${disk_key}" \
      '{spec:{disks:{($k):{allowScheduling:false,evictionRequested:true}}}}')
    if [ "${DRY_RUN}" = "1" ]; then
      echo "DRY_RUN: kubectl patch merge ${patch}"
    else
      kubectl patch nodes.longhorn.io "${node}" -n "${NAMESPACE}" --type merge -p "${patch}"
    fi
  done
  echo ""
  echo "Watch eviction: $0 status  and  kubectl get replicas.longhorn.io -n ${NAMESPACE} -w"
  echo "When each target node shows 0 replicas in status, run: $0 finish NODE ..."
}

cmd_finish() {
  local node disk_key disk_spec seg path json_remove merge_patch
  for node in "$@"; do
    disk_key=$(disk_key_for_node "${node}")
    if [ -z "${disk_key}" ]; then
      echo "Skip ${node}: no disk in spec"
      continue
    fi
    local cnt
    cnt=$(replica_count_on_node "${node}")
    echo "=== finish ${node} (replicas on node: ${cnt}) ==="
    if [ "${cnt}" != "0" ]; then
      echo "Refusing: need 0 replicas on ${node} before remove+re-add disk. Prepare/evacuate first."
      continue
    fi
    disk_spec=$(kubectl get nodes.longhorn.io "${node}" -n "${NAMESPACE}" -o json | jq -c --arg k "${disk_key}" '.spec.disks[$k]')
    if [ "${DRY_RUN}" = "1" ]; then
      echo "DRY_RUN: remove spec.disks[${disk_key}] then merge back"
      continue
    fi
    seg=$(escape_json_pointer_segment "${disk_key}")
    path="/spec/disks/${seg}"
    json_remove=$(jq -n --arg p "${path}" '[{op:"remove",path:$p}]' -c)
    merge_patch=$(jq -n --arg k "${disk_key}" --argjson spec "${disk_spec}" '{spec:{disks:{($k):$spec}}}' -c)
    echo "Removing disk from spec..."
    kubectl patch nodes.longhorn.io "${node}" -n "${NAMESPACE}" --type json -p "${json_remove}"
    echo "Waiting 15s..."
    sleep 15
    echo "Re-adding disk..."
    kubectl patch nodes.longhorn.io "${node}" -n "${NAMESPACE}" --type merge -p "${merge_patch}"
    echo "Done ${node}."
  done
  echo "Verify: $0 status"
}

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

main() {
  local sub=${1:-}
  shift || true
  case "${sub}" in
    rescan) cmd_rescan ;;
    status) cmd_status ;;
    prepare) [ "$#" -ge 1 ] || { echo "usage: $0 prepare NODE [NODE...]"; exit 1; }; cmd_prepare "$@" ;;
    finish) [ "$#" -ge 1 ] || { echo "usage: $0 finish NODE [NODE...]"; exit 1; }; cmd_finish "$@" ;;
    -h | --help | help | "") usage ;;
    *)
      echo "Unknown subcommand: ${sub}"
      usage
      ;;
  esac
}

main "$@"
