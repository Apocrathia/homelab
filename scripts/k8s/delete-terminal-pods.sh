#!/usr/bin/env bash
# Delete pods in terminal phases after cluster disruption (Succeeded / Failed / Evicted).
# Prereq: kubectl, jq. Default is dry-run — set DRY_RUN=0 to delete.
#
# Examples:
#   DRY_RUN=0 ./scripts/k8s/delete-terminal-pods.sh
#   ONLY_JOB_OWNED_FAILED=1 DRY_RUN=0 ./scripts/k8s/delete-terminal-pods.sh   # Failed pods owned by Job only
#
# Optional — delete finished Job objects (removes their pods too); keeps failed jobs unless DELETE_FAILED_JOBS=1:
#   DELETE_JOBS=1 DELETE_FAILED_JOBS=0 DRY_RUN=0 ./scripts/k8s/delete-terminal-pods.sh
set -euo pipefail

DRY_RUN="${DRY_RUN:-1}"
ONLY_JOB_OWNED_FAILED="${ONLY_JOB_OWNED_FAILED:-0}"
DELETE_JOBS="${DELETE_JOBS:-0}"
DELETE_FAILED_JOBS="${DELETE_FAILED_JOBS:-0}"

delete_pods_from_json() {
  local json=$1
  echo "${json}" | jq -r --arg onlyjob "${ONLY_JOB_OWNED_FAILED}" '
    .items[]
    | select(
        .status.phase == "Succeeded"
        or (.status.reason == "Evicted")
        or (
          .status.phase == "Failed"
          and (
            $onlyjob == "0"
            or any(.metadata.ownerReferences[]?; .kind == "Job")
          )
        )
      )
    | "\(.metadata.namespace) \(.metadata.name)"
  ' | while read -r ns pod; do
    [ -z "${ns}" ] && continue
    if [ "${DRY_RUN}" = "1" ]; then
      echo "DRY-RUN: kubectl delete pod ${pod} -n ${ns} --wait=false"
    else
      kubectl delete pod "${pod}" --namespace "${ns}" --wait=false
    fi
  done
}

echo "=== Terminal pods (Succeeded / Evicted / Failed; ONLY_JOB_OWNED_FAILED=${ONLY_JOB_OWNED_FAILED}) ==="
PODS_JSON=$(kubectl get pods -A -o json)
delete_pods_from_json "${PODS_JSON}"

if [ "${DELETE_JOBS}" = "1" ]; then
  echo ""
  echo "=== Finished Job objects (active==0; succeeded>0 or (failed>0 if DELETE_FAILED_JOBS=1)) ==="
  kubectl get jobs -A -o json | jq -r --arg ff "${DELETE_FAILED_JOBS}" '
    .items[]
    | select((.status.active // 0) == 0)
    | select((.status.succeeded // 0) > 0 or ($ff == "1" and (.status.failed // 0) > 0))
    | "\(.metadata.namespace) \(.metadata.name)"
  ' | while read -r ns job; do
    [ -z "${ns}" ] && continue
    if [ "${DRY_RUN}" = "1" ]; then
      echo "DRY-RUN: kubectl delete job ${job} -n ${ns} --wait=false"
    else
      kubectl delete job "${job}" --namespace "${ns}" --wait=false
    fi
  done
fi

if [ "${DRY_RUN}" = "1" ]; then
  echo ""
  echo "Dry-run only. Re-run with DRY_RUN=0 to apply."
fi
