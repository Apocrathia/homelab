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
# Pipe the importer into the romm container so it runs with RomM's Python env
# and filesystem handlers — no HTTP auth, same trust model as the scan trigger.
kubectl exec -i -n romm -c romm "${POD}" -- \
  env \
    PLATFORMS="${PLATFORMS:-}" \
    COVER_SOURCE="${COVER_SOURCE:-miximages}" \
    MEDIA_TYPES="${MEDIA_TYPES:-}" \
    ROM_LETTERS="${ROM_LETTERS:-}" \
    DRY_RUN="${DRY_RUN:-0}" \
  python - < /scripts/import-esde-media.py
