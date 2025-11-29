#!/bin/bash
# Clean up disk space on a Talos Kubernetes node using a privileged pod
# This script creates a pod that can clean up containerd images, logs, and other data

set -euo pipefail

NODE_NAME="${1:-}"
NAMESPACE="kube-system"

if [ -z "${NODE_NAME}" ]; then
  echo "Usage: $0 <node-name>"
  echo "Example: $0 talos-03"
  exit 1
fi

echo "Creating cleanup pod on ${NODE_NAME}..."

# Create a privileged pod that can clean up the node (Talos uses containerd)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: node-cleanup-${NODE_NAME}
  namespace: ${NAMESPACE}
spec:
  nodeName: ${NODE_NAME}
  hostNetwork: true
  hostPID: true
  containers:
  - name: cleanup
    image: docker.io/library/alpine:latest
    command:
    - sh
    - -c
    - |
      set +u  # Disable unbound variable check in the pod script
      apk add --no-cache findutils curl

      # Install containerd/ctr if not available
      if ! command -v ctr >/dev/null 2>&1; then
        echo "Installing containerd tools..."
        # Download ctr from containerd releases (simplified - use host binary if available)
        if [ -f /host/usr/bin/ctr ]; then
          cp /host/usr/bin/ctr /usr/local/bin/ctr
          chmod +x /usr/local/bin/ctr
        else
          echo "Warning: ctr not found, trying alternative cleanup methods"
        fi
      fi

      echo "=== Checking disk usage ==="
      df -h /host | tail -1
      echo ""

      echo "=== Cleaning up containerd images ==="
      # Try to use ctr if available, otherwise try crictl
      if command -v ctr >/dev/null 2>&1; then
        ctr -n k8s.io images prune -a 2>&1 || echo "Note: Some images may be in use"
      elif command -v crictl >/dev/null 2>&1; then
        crictl rmi --prune 2>&1 || echo "Note: Some images may be in use"
      else
        echo "Warning: Neither ctr nor crictl available. Cleaning up manually..."
        # Fallback: try to remove old/unused images from containerd directory
        if [ -d "/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs" ]; then
          echo "Attempting to clean containerd snapshots..."
          find /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
        fi
      fi

      echo ""
      echo "=== Cleaning up kubelet logs (aggressive) ==="
      # Aggressively clean up old logs to free space (keep last 1 day)
      if [ -d "/host/var/log/pods" ]; then
        BEFORE_VAL="unknown"
        BEFORE_VAL=\$(du -sh /host/var/log/pods 2>/dev/null | cut -f1) || BEFORE_VAL="unknown"
        find /host/var/log/pods -type f -name "*.log" -mtime +1 -delete 2>/dev/null || true
        AFTER_VAL="unknown"
        AFTER_VAL=\$(du -sh /host/var/log/pods 2>/dev/null | cut -f1) || AFTER_VAL="unknown"
        echo "Cleaned up old pod logs (before: \${BEFORE_VAL}, after: \${AFTER_VAL})"
      fi
      if [ -d "/host/var/log/containers" ]; then
        BEFORE_VAL="unknown"
        BEFORE_VAL=\$(du -sh /host/var/log/containers 2>/dev/null | cut -f1) || BEFORE_VAL="unknown"
        find /host/var/log/containers -type f -name "*.log" -mtime +1 -delete 2>/dev/null || true
        AFTER_VAL="unknown"
        AFTER_VAL=\$(du -sh /host/var/log/containers 2>/dev/null | cut -f1) || AFTER_VAL="unknown"
        echo "Cleaned up old container logs (before: \${BEFORE_VAL}, after: \${AFTER_VAL})"
      fi

      echo ""
      echo "=== Attempting containerd image cleanup ==="
      # Try to use host's ctr if available
      if [ -f "/host/usr/bin/ctr" ] && [ -S "/run/containerd/containerd.sock" ]; then
        /host/usr/bin/ctr -a /run/containerd/containerd.sock -n k8s.io images prune -a 2>&1 | head -20 || echo "Image prune completed or had errors"
      elif [ -S "/run/containerd/containerd.sock" ]; then
        # Try crictl if available
        if command -v crictl >/dev/null 2>&1; then
          crictl rmi --prune 2>&1 | head -20 || echo "Image prune completed or had errors"
        else
          echo "Neither ctr nor crictl available, skipping image cleanup"
        fi
      else
        echo "Containerd socket not found, skipping image cleanup"
      fi

      echo ""
      echo "=== Checking disk usage after cleanup ==="
      df -h /host | tail -1

      echo ""
      echo "=== Cleanup complete ==="
    securityContext:
      privileged: true
    volumeMounts:
    - name: containerd-sock
      mountPath: /run/containerd/containerd.sock
    - name: containerd-root
      mountPath: /var/lib/containerd
    - name: usr-bin
      mountPath: /host/usr/bin
      readOnly: true
    - name: kubelet-logs
      mountPath: /host/var/log
    - name: rootfs
      mountPath: /host
      readOnly: false
  volumes:
  - name: containerd-sock
    hostPath:
      path: /run/containerd/containerd.sock
  - name: containerd-root
    hostPath:
      path: /var/lib/containerd
  - name: usr-bin
    hostPath:
      path: /usr/bin
  - name: kubelet-logs
    hostPath:
      path: /var/log
  - name: rootfs
    hostPath:
      path: /
  restartPolicy: Never
EOF

echo "Waiting for pod to start..."
sleep 5

echo "Following cleanup logs (Ctrl+C to stop)..."
kubectl logs -f -n "${NAMESPACE}" "node-cleanup-${NODE_NAME}" || true

echo ""
echo "Cleaning up pod..."
kubectl delete pod -n "${NAMESPACE}" "node-cleanup-${NODE_NAME}" --ignore-not-found=true

echo "Done!"
