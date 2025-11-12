#!/bin/sh
set -e

# Label all nodes as control-plane
CONTROL_PLANE_NODES="talos-01 talos-02 talos-03 talos-04"

for node in $CONTROL_PLANE_NODES; do
    kubectl label node "$node" node-role.kubernetes.io/control-plane= --overwrite
done
