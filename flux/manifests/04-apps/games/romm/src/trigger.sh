#!/bin/sh
set -eu

POD="$(
  kubectl get pods \
    -n romm \
    -l app=romm \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[0].metadata.name}'
)"

if [ -z "${POD}" ]; then
  echo "no running romm pod found" >&2
  exit 1
fi

echo "using pod ${POD}"
# Pipe the enqueue script into the romm container so it uses RomM's Python env
# and local Valkey — no HTTP auth, no exposed Redis.
kubectl exec -i -n romm -c romm "${POD}" -- \
  env \
    SCAN_TYPE="${SCAN_TYPE:-unmatched}" \
    SCAN_METADATA_SOURCES="${SCAN_METADATA_SOURCES:-}" \
  python - < /scripts/enqueue-scan.py
