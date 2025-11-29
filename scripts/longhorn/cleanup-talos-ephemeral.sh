#!/bin/bash
# Clean up disk space on a Talos node by wiping the EPHEMERAL partition
# This uses talosctl reset to wipe only the EPHEMERAL partition (container images, logs, etc.)
# without doing a full node reset. This is safe and will free significant space.

set -euo pipefail

NODE_NAME="${1:-}"

if [ -z "${NODE_NAME}" ]; then
  echo "Usage: $0 <node-name>"
  echo "Example: $0 talos-03"
  exit 1
fi

# Get node IP from Kubernetes
NODE_IP=$(kubectl get node "${NODE_NAME}" -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "")

if [ -z "${NODE_IP}" ]; then
  echo "Error: Could not find IP address for node ${NODE_NAME}"
  echo "Please provide the node IP address manually:"
  read -p "Enter IP address for ${NODE_NAME}: " NODE_IP
  if [ -z "${NODE_IP}" ]; then
    echo "Error: IP address required"
    exit 1
  fi
fi

echo "=== Talos EPHEMERAL Partition Cleanup ==="
echo "Node: ${NODE_NAME}"
echo "IP: ${NODE_IP}"
echo ""
echo "This will wipe the EPHEMERAL partition on ${NODE_NAME}, which contains:"
echo "  - Container images"
echo "  - Container data"
echo "  - Kubelet logs"
echo "  - Other ephemeral data"
echo ""
echo "This will NOT affect:"
echo "  - Machine configuration (STATE partition)"
echo "  - Kubernetes cluster membership"
echo "  - Persistent volumes"
echo ""
echo "⚠️  WARNING: This will remove all container images and logs!"
echo "   The node will need to re-download images when pods restart."
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

CONFIRM=$(prompt_confirm "Wipe EPHEMERAL partition on ${NODE_NAME}?")
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Wiping EPHEMERAL partition on ${NODE_NAME} (${NODE_IP})..."
echo "This may take a few minutes..."

# Use talosctl reset to wipe only the EPHEMERAL partition
# --system-labels-to-wipe EPHEMERAL: Only wipe the EPHEMERAL partition
# --graceful: Try to gracefully drain the node first
# --reboot: Reboot the node after wiping (required for changes to take effect)
talosctl reset \
  --nodes "${NODE_IP}" \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=true \
  --reboot \
  --wait=false

echo ""
echo "✅ EPHEMERAL partition wipe initiated!"
echo ""
echo "The node will:"
echo "  1. Drain workloads (if possible)"
echo "  2. Wipe the EPHEMERAL partition"
echo "  3. Reboot"
echo ""
echo "After reboot, the node will:"
echo "  - Rejoin the cluster"
echo "  - Re-download container images as needed"
echo "  - Have significantly more free disk space"
echo ""
echo "Monitor the node status with:"
echo "  kubectl get node ${NODE_NAME} -w"
echo ""
echo "Once the node is back online, Longhorn components should be able to start."
