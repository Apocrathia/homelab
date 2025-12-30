#!/bin/bash
# Quick IO benchmark script - runs a simple test and shows volume placement

set -euo pipefail

NAMESPACE="storage-test"
PVC_NAME="io-benchmark-pvc"

echo "=== Storage IO Quick Test ==="
echo ""

# Check if pod exists
if ! kubectl get pod io-benchmark -n "${NAMESPACE}" &>/dev/null; then
    echo "Benchmark pod not found. Creating..."
    kubectl apply -f "$(dirname "$0")/io-benchmark-pod.yaml"
    echo "Waiting for pod to be ready..."
    kubectl wait --for=condition=ready pod/io-benchmark -n "${NAMESPACE}" --timeout=300s
    echo ""
fi

# Get pod node
POD_NODE=$(kubectl get pod io-benchmark -n "${NAMESPACE}" -o jsonpath='{.spec.nodeName}')
echo "Pod running on node: ${POD_NODE}"
echo ""

# Get PVC and volume info
PVC=$(kubectl get pvc "${PVC_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.volumeName}')
if [ -n "${PVC}" ]; then
    echo "PVC Volume: ${PVC}"

    # Get Longhorn volume info
    VOLUME_NAME=$(kubectl get pvc "${PVC_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.volumeName}')
    if kubectl get volume.longhorn.io "${VOLUME_NAME}" -n longhorn-system &>/dev/null; then
        echo ""
        echo "Longhorn Volume Details:"
        echo "----------------------"

        # Get data locality
        DATA_LOCALITY=$(kubectl get volume.longhorn.io "${VOLUME_NAME}" -n longhorn-system -o jsonpath='{.spec.dataLocality}')
        echo "Data Locality: ${DATA_LOCALITY}"

        # Get replicas
        echo ""
        echo "Replica Locations:"
        kubectl get volume.longhorn.io "${VOLUME_NAME}" -n longhorn-system -o jsonpath='{.status.replicaModeMap}' | jq -r 'to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  (checking...)"

        # Get attached node
        ATTACHED_NODE=$(kubectl get volume.longhorn.io "${VOLUME_NAME}" -n longhorn-system -o jsonpath='{.status.ownerID}')
        echo ""
        echo "Attached to node: ${ATTACHED_NODE}"

        if [ "${ATTACHED_NODE}" = "${POD_NODE}" ]; then
            echo "✅ Volume is attached to the same node as the pod (good for performance)"
        else
            echo "⚠️  Volume is attached to a different node (network IO overhead)"
        fi
    fi
fi

echo ""
echo "Running quick IO test..."
echo ""

# Run a quick fio test
kubectl exec -n "${NAMESPACE}" io-benchmark -- fio \
    --name=quick-test \
    --rw=randwrite \
    --bs=4k \
    --size=1G \
    --numjobs=4 \
    --iodepth=16 \
    --runtime=30 \
    --time_based \
    --group_reporting \
    --output-format=normal \
    --directory=/data/benchmark 2>/dev/null || {
    echo "Running full benchmark (this may take a few minutes)..."
    echo "Watch logs with: kubectl logs -f io-benchmark -n ${NAMESPACE}"
}

echo ""
echo "=== Test Complete ==="
echo ""
echo "View full results:"
echo "  kubectl logs io-benchmark -n ${NAMESPACE}"
echo ""
echo "View detailed JSON results:"
echo "  kubectl exec -n ${NAMESPACE} io-benchmark -- cat /data/benchmark/rand-read.json"
echo "  kubectl exec -n ${NAMESPACE} io-benchmark -- cat /data/benchmark/latency.json"
