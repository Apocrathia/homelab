#!/bin/bash
# Apply backup-tier group labels to all Longhorn volumes.
#
# Tier policy + per-volume rationale: flux/manifests/02-infrastructure/longhorn/README.md
# ("Backup tier policy"). This script is the executor; the classification below
# is the source of truth for which volume gets which tier.
#
# Mechanics (longhorn v1.13.0, verified against manager source):
#   - Volumes select RecurringJobs by group label:
#       recurring-job-group.longhorn.io/<tier>=enabled
#   - A volume with ANY job label is OUT of the "default" group, so applying a
#     tier also removes the auto-applied default label (without that, tier
#     volumes would keep riding daily-backup).
#   - longhorn only re-adds the default label when a volume has ZERO job
#     labels (datastore.FixupRecurringJob), so the removal sticks.
#
# Idempotent: safe to re-run. New volumes stay in the default group (daily
# backup) until they are classified here.
set -euo pipefail

NAMESPACE="longhorn-system"
LABEL_PREFIX="recurring-job-group.longhorn.io"

CRITICAL_VOLUMES=(
  "duckdb-data" \
  "firecrawl-postgres-data" \
  "hermes-agent-state" \
  "prime-agent-state" \
  "projectsend-mysql-data" \
  "pvc-13b79a66-bc24-4590-9ca6-cb9ca817c478" \
  "pvc-21fb46ea-4b66-4f5e-ba76-05f959d7aa78" \
  "pvc-2eac4f6a-2741-4b6b-b3ba-f8f2c33ac782" \
  "pvc-2f75cac7-92f2-4bdc-8973-f0a541a4a944" \
  "pvc-348cfddf-a971-493d-af9c-5741452edc92" \
  "pvc-362ad954-21f8-45dc-90b8-79b8ca4d3fe5" \
  "pvc-38a96482-e42c-46d7-8ad5-429567dce500" \
  "pvc-3dc4ed86-1fcc-45f6-98b9-e4a280d5bd44" \
  "pvc-4b191226-9c44-4389-b960-2f3bfeef4943" \
  "pvc-5e91bf4d-0bb8-4fb6-b083-7fd90ade2801" \
  "pvc-6d18c218-57c4-49c0-b8d1-1b0fe2bfc771" \
  "pvc-727b21f0-048a-4997-ad91-0242fb1be2fd" \
  "pvc-743ac2a3-8746-44f8-aa69-b64989ae410d" \
  "pvc-8b3bc323-c524-44a9-9c9b-dcf53a84d161" \
  "pvc-9c6c2822-9f91-41ff-a5e8-786a5df4c219" \
  "pvc-a1fa04a6-841d-4275-8b8d-3d8df3534eb8" \
  "pvc-a70b364c-c5df-4a5a-96f3-a471d19853fb" \
  "pvc-aa0ab391-ed51-4d43-85f0-b5502fc32445" \
  "pvc-aa536dd0-ef26-4d09-ac93-30ea6eb75356" \
  "pvc-b6ef3dc9-da28-44a0-ba2e-a4229ca48551" \
  "pvc-bbae135d-facb-45e3-a31b-02b914d10064" \
  "pvc-bdcea90a-cb5f-4d45-b97d-097ab1f575c6" \
  "pvc-c1815ef1-a229-4058-a33a-fe012a20e1ef" \
  "pvc-c6b71583-f933-4369-abd5-acfa96223f6f" \
  "pvc-c94ac7e9-7ba2-4991-a689-cef380f036b0" \
  "pvc-cb14ab7c-3851-49a5-935e-fe9d070b96ed" \
  "pvc-dae14a6e-1bd7-47cc-a55a-22a9f9a10e26" \
  "pvc-f7e9f86d-3ce3-492a-8595-8319fa6fc523" \
  "tak-data" \
)

STATEFUL_VOLUMES=(
  "archisteamfarm-config" \
  "aurral-config" \
  "bazarr-config" \
  "calibre-web-automated-config" \
  "cantinarr-config" \
  "changedetection-io-config" \
  "chaptarr-config" \
  "cleanuparr-config" \
  "comfyui-data" \
  "companion-data" \
  "copyparty-state" \
  "endurain-data" \
  "halcyon-data" \
  "houndarr-data" \
  "icloudpd-config" \
  "jellyfin-config" \
  "kavita-config" \
  "komga-config" \
  "lidarr-config" \
  "lidarr-youtube-downloader-config" \
  "mealie-data" \
  "mecatl-valkey-data" \
  "meshtastic-data" \
  "moonlight-web-data" \
  "mumble-data" \
  "n8n-data" \
  "opencanary-data" \
  "prism-results" \
  "prism-scan-data" \
  "prism-watchlist-data" \
  "projectsend-storage" \
  "projectsend-valkey-data" \
  "promptfoo-data" \
  "prowlarr-config" \
  "pvc-30f87d1e-7d30-4347-bb64-d1737e7ed03c" \
  "pvc-61ca0880-77fa-4ebc-a2f0-891f1eb57556" \
  "pvc-78ecd672-a9b5-41df-aa87-0e81f3042c34" \
  "pvc-7a222244-99c4-4bbf-bba0-77808d29595f" \
  "pvc-84500b89-7c1c-40ae-ac3e-3b8f7617e651" \
  "pvc-c961826d-cffc-4a20-8677-c19784328608" \
  "pvc-d17ed758-f6eb-4476-a954-874b3015044e" \
  "pvc-e948563e-d03f-4e11-b419-1c0ca3f109b5" \
  "pvc-fd27f0f0-1ac9-48c9-b513-ddf13e54f033" \
  "pyrit-data" \
  "qbittorrent-config" \
  "radarr-config" \
  "rclone-app-data" \
  "rclone-config" \
  "restreamer-config" \
  "restreamer-data" \
  "romm-assets" \
  "romm-config" \
  "sabnzbd-config" \
  "searxng-config" \
  "seerr-config" \
  "slskd-data" \
  "sonarr-config" \
  "soularr-data" \
  "suwayomi-data" \
  "synapse-data" \
  "tdarr-server-config" \
  "terminus-uploads" \
  "terminus-valkey-data" \
  "thelounge-data" \
  "tunarr-config" \
  "uptime-kuma-data" \
  "whisparr-config" \
)

CACHE_VOLUMES=(
  "archisteamfarm-plugins" \
  "ate-cache-data" \
  "bazarr-models" \
  "demo-app-data" \
  "jellyfin-ai-upscaler-data" \
  "jetkvm-api-app-source" \
  "jetkvm-app-build-cache" \
  "pvc-0318e179-b046-42aa-9e71-186549767add" \
  "pvc-13c92990-e678-499a-b2f6-a2852b6bd4d3" \
  "pvc-157ba8ee-ddbe-486d-8d86-2a95749f0b35" \
  "pvc-2108d78d-31c2-43e0-9313-1892760c94e4" \
  "pvc-45a537ce-7ea6-4948-9aca-6b5fea07db24" \
  "pvc-7f0c4ff9-abc4-4078-b601-412c677ddb8c" \
  "pvc-a5208775-448d-43e7-828d-2c2c791c8b65" \
  "pvc-acd04be8-cfc9-414d-8f67-6739c587f992" \
  "pvc-b136fb45-f55d-45d7-88e4-cbfd5178f2ff" \
  "pvc-b48b91e3-9187-4bdc-b459-6f6e9ce4fc62" \
  "pvc-da9338d5-99ef-4322-8bac-8a6f18e1df87" \
  "pvc-ebd7c851-9ffd-4063-ae4a-07e510c4bda9" \
  "searxng-cache" \
  "tdarr-server-cache" \
  "tdarr-server-logs" \
)

echo "Tier classification: ${#CRITICAL_VOLUMES[@]} critical / ${#STATEFUL_VOLUMES[@]} stateful / ${#CACHE_VOLUMES[@]} cache"

# All volumes that appear in exactly one tier list; anything else is a bug.
ALL_TIERED=("${CRITICAL_VOLUMES[@]}" "${STATEFUL_VOLUMES[@]}" "${CACHE_VOLUMES[@]}")

apply_tier() {
  local volume="$1" tier="$2"
  local tier_label="${LABEL_PREFIX}/${tier}"
  local vol_json current current_default
  # The cluster can change mid-run (volume deleted, PVC recreated): a NotFound
  # here means the list drifted from live state — skip and report instead of
  # dying under set -e.
  if ! vol_json="$(kubectl get volume.longhorn.io "${volume}" -n "${NAMESPACE}" -o json 2>/dev/null)"; then
    echo "  ✗ ${volume} not found (deleted mid-run or stale list entry) — skipped"
    return 0
  fi
  current="$(jq -r --arg key "${tier_label}" '.metadata.labels[$key] // ""' <<<"${vol_json}")"
  current_default="$(jq -r --arg key "${LABEL_PREFIX}/default" '.metadata.labels[$key] // ""' <<<"${vol_json}")"

  if [[ "${current}" == "enabled" && "${current_default}" != "enabled" ]]; then
    echo "  ✓ ${volume} already ${tier}"
    return 0
  fi
  # Label the tier, drop the auto-default label if present. "${args[@]+…}"
  # (not "${args[@]:-}") expands to zero words when args is empty: the :- form
  # passes a single empty-string argument on bash 3.2 (the operator's machine).
  local args=()
  [[ "${current_default}" == "enabled" ]] && args+=("${LABEL_PREFIX}/default-")
  kubectl label volume.longhorn.io "${volume}" -n "${NAMESPACE}" \
    "${tier_label}=enabled" "${args[@]+"${args[@]}"}" --overwrite >/dev/null
  echo "  ✓ ${volume} -> ${tier}${current_default:+ (default label removed)}"
}

confirm() {
  if [[ -t 0 ]]; then read -r -p "$1 (yes/no): " confirm < /dev/tty; else read -r -p "$1 (yes/no): " confirm; fi
  [[ "${confirm:-no}" == "yes" ]]
}

# Preview
echo ""
echo "Preview:"
for tier in critical stateful cache; do
  case "${tier}" in
    critical) list=("${CRITICAL_VOLUMES[@]}") ;;
    stateful) list=("${STATEFUL_VOLUMES[@]}") ;;
    cache) list=("${CACHE_VOLUMES[@]}") ;;
  esac
  echo "  ${tier} (${#list[@]} volumes): ${list[0]:-} ... ${list[${#list[@]}-1]:-}"
done

echo ""
echo "Checking live volumes not covered by any tier (they stay in the default group):"
LIVE=$(kubectl get volumes.longhorn.io -n "${NAMESPACE}" -o json | jq -r '.items[].metadata.name' | sort)
UNCOVERED=$(comm -23 <(echo "$LIVE") <(printf '%s\n' "${ALL_TIERED[@]}" | sort) || true)
if [[ -n "${UNCOVERED:-}" ]]; then
  echo "  (live volumes absent from classification — add them to this script's tier lists)"
  nl='
'
  echo "    ${UNCOVERED//$nl/$nl    }"
else
  echo "  none — all live volumes are classified"
fi

echo ""
if ! confirm "Apply tier labels to ${#ALL_TIERED[@]} volumes?"; then
  echo "Aborted."
  exit 0
fi

echo ""
for v in "${CRITICAL_VOLUMES[@]}"; do apply_tier "$v" critical; done
for v in "${STATEFUL_VOLUMES[@]}"; do apply_tier "$v" stateful; done
for v in "${CACHE_VOLUMES[@]}"; do apply_tier "$v" cache; done

echo ""
echo "Done. Volumes now select backup jobs only from their tier group."
echo "Verify: kubectl get volumes.longhorn.io -n ${NAMESPACE} -L ${LABEL_PREFIX}/critical,${LABEL_PREFIX}/stateful,${LABEL_PREFIX}/cache"
