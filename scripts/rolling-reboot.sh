#!/usr/bin/env bash
# Rolling reboot: drain → talosctl reboot → wait Ready → uncordon, one node at a time.
# Bash 3.2+ (avoid mapfile for macOS /bin/bash).
set -euo pipefail

READY_TIMEOUT="${READY_TIMEOUT:-900s}"
STABILIZE_SECS="${STABILIZE_SECS:-30}"
# GitLab Runner (and similar) often leave pods with no controller; drain refuses without --force.
DRAIN_FORCE="${DRAIN_FORCE:-1}"
# PDBs (CloudNativePG, Tempo, Longhorn instance-manager, etc.) block eviction API forever with minAvailable=1.
# --disable-eviction uses pod delete and skips PDB checks — appropriate for voluntary node maintenance, not for routine deploys.
DRAIN_DISABLE_EVICTION="${DRAIN_DISABLE_EVICTION:-1}"

echo "Starting rolling reboot of all cluster nodes..."
echo "Order: sorted node names, one at a time."
if [ "${DRAIN_DISABLE_EVICTION}" = "1" ]; then
  echo "Drain uses delete (PDBs bypassed). Set DRAIN_DISABLE_EVICTION=0 to enforce PDBs (may hang on single-replica DBs)."
else
  echo "Drain uses eviction API (respects PDBs); may retry indefinitely if PDB blocks."
fi
echo "Overrides: READY_TIMEOUT=${READY_TIMEOUT} STABILIZE_SECS=${STABILIZE_SECS} DRAIN_FORCE=${DRAIN_FORCE} DRAIN_DISABLE_EVICTION=${DRAIN_DISABLE_EVICTION}"
echo ""

NODES=()
while IFS= read -r line; do
  [ -n "${line}" ] && NODES+=("${line}")
done < <(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | sort)
TOTAL="${#NODES[@]}"

if [ "${TOTAL}" -eq 0 ]; then
  echo "No nodes found." >&2
  exit 1
fi

for i in "${!NODES[@]}"; do
  NODE="${NODES[$i]}"
  NODE_IP="$(kubectl get node "${NODE}" -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')"

  if [ -z "${NODE_IP}" ]; then
    echo "No InternalIP for ${NODE}; set talosctl --nodes manually or fix node addresses." >&2
    exit 1
  fi

  echo "==> ${NODE} (${NODE_IP}) — $((i + 1))/${TOTAL}"

  echo "  - Draining (cordon + evict workloads)..."
  DRAIN_OPTS=(--ignore-daemonsets --delete-emptydir-data)
  if [ "${DRAIN_FORCE}" = "1" ]; then
    DRAIN_OPTS+=(--force)
  fi
  if [ "${DRAIN_DISABLE_EVICTION}" = "1" ]; then
    DRAIN_OPTS+=(--disable-eviction=true)
  fi
  kubectl drain "${NODE}" "${DRAIN_OPTS[@]}"

  echo "  - Rebooting via talosctl..."
  talosctl reboot --nodes "${NODE_IP}"

  echo "  - Waiting for Ready..."
  kubectl wait --for=condition=Ready "node/${NODE}" --timeout="${READY_TIMEOUT}"

  echo "  - Uncordoning..."
  kubectl uncordon "${NODE}"

  echo "  ✓ ${NODE} is Ready and schedulable"
  echo ""

  if [ "${i}" -lt $((TOTAL - 1)) ]; then
    echo "  - Sleeping ${STABILIZE_SECS}s before next node..."
    sleep "${STABILIZE_SECS}"
    echo ""
  fi
done

echo "==> Rolling reboot complete (${TOTAL} nodes)."
