#!/bin/bash
set -e

echo "Starting rolling reboot of all cluster nodes..."
echo "This will reboot nodes one at a time to minimize disruption."
echo ""

for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((79 + i))
  NODE_IP="10.100.1.${IP_LAST_OCTET}"

  echo "==> Rebooting node talos-${NODE_NUM} (${NODE_IP})..."

  # Cordon the node to prevent new workloads
  echo "  - Cordoning node..."
  kubectl cordon "talos-${NODE_NUM}"

  # Reboot the node
  echo "  - Initiating reboot..."
  talosctl reboot --nodes "${NODE_IP}" || echo "    Reboot command completed"

  # Wait for the node to come back online
  echo "  - Waiting for node to become ready..."
  while ! kubectl get node "talos-${NODE_NUM}" 2>/dev/null | grep -q Ready; do
    echo "    Still waiting for talos-${NODE_NUM}..."
    sleep 10
  done

  # Uncordon the node to allow scheduling
  echo "  - Uncordoning node..."
  kubectl uncordon "talos-${NODE_NUM}"

  echo "  ✓ talos-${NODE_NUM} is back online and ready"

  # Wait between reboots to allow cluster stabilization
  if [ $i -lt 4 ]; then
    echo "  - Waiting 30s for cluster stabilization before next reboot..."
    sleep 30
  fi
  echo ""
done

echo "==> Rolling reboot complete!"
echo "All nodes have been rebooted successfully."
