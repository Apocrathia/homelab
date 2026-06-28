#!/usr/bin/env bash
# Parse terragrunt run --all plan output (ANSI prefixes, per-unit blocks).
#
# Usage:
#   terragrunt run --all -- plan ... 2>&1 | scripts/terraform/tofu-plan-summary.sh summarize
#   terragrunt run --all -- plan ... 2>&1 | scripts/terraform/tofu-plan-summary.sh drift-status
#
# drift-status prints: no_drift | output_only | drift_detected | plan_unclear
set -euo pipefail

strip_ansi() {
  sed -E 's/\x1b\[[0-9;]*m//g'
}

read_input() {
  if [ "${1:-}" = "-" ] || [ $# -eq 0 ]; then
    strip_ansi
  elif [ -f "$1" ]; then
    strip_ansi <"$1"
  else
    printf '%s\n' "$1" | strip_ansi
  fi
}

has_resource_changes() {
  grep -qE ' will be (created|updated|destroyed|replaced)| must be replaced' <<<"$PLAN_TEXT" && return 0
  grep 'Plan:' <<<"$PLAN_TEXT" | grep -qvE 'Plan: 0 to add, 0 to change, 0 to destroy(\.|, 0 to replace\.)?' && return 0
  return 1
}

is_no_drift() {
  if grep -qi 'No changes\. Your infrastructure matches' <<<"$PLAN_TEXT"; then
    return 0
  fi
  if grep -q 'Plan:' <<<"$PLAN_TEXT" && ! has_resource_changes; then
    return 0
  fi
  if grep -q 'without changing any real infrastructure' <<<"$PLAN_TEXT" && ! has_resource_changes; then
    return 0
  fi
  if grep -q 'Changes to Outputs:' <<<"$PLAN_TEXT" && ! has_resource_changes; then
    return 0
  fi
  return 1
}

summarize() {
  local found=0 line unit plan saw_output_refresh=0

  while IFS= read -r line; do
    case "$line" in
      *"terraform: Plan:"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        plan=$(printf '%s' "$line" | sed -nE 's/^.*terraform: (Plan:.*)$/\1/p')
        if [ -n "$unit" ]; then
          printf '%s: %s\n' "$unit" "$plan"
        else
          printf '%s\n' "$plan"
        fi
        found=1
        ;;
      *"terraform: No changes"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        if [ -n "$unit" ]; then
          printf '%s: No changes\n' "$unit"
        else
          echo "No changes"
        fi
        found=1
        ;;
      *"Changes to Outputs:"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        if [ -n "$unit" ]; then
          printf '%s: Changes to Outputs only\n' "$unit"
        else
          echo "Changes to Outputs only"
        fi
        found=1
        ;;
      *"without changing any real infrastructure"*)
        if [ "$saw_output_refresh" -eq 0 ]; then
          echo "Output refresh only (no infrastructure changes)"
          saw_output_refresh=1
        fi
        found=1
        ;;
    esac
  done <<<"$PLAN_TEXT"

  if [ "$found" -eq 0 ]; then
    grep -E '^Run Summary|Succeeded|Failed' <<<"$PLAN_TEXT" | tail -5 || echo "No plan summary lines found"
  fi
}

drift_status() {
  if has_resource_changes; then
    echo "drift_detected"
    return 0
  fi
  if is_no_drift; then
    if grep -q 'Changes to Outputs:\|without changing any real infrastructure' <<<"$PLAN_TEXT"; then
      echo "output_only"
    else
      echo "no_drift"
    fi
    return 0
  fi
  echo "plan_unclear"
}

self_check() {
  local sample drift

  sample='[unit/a] terraform: No changes. Your infrastructure matches the configuration.
Run Summary  1 units  1s
   Succeeded    1'
  PLAN_TEXT="$sample"
  drift=$(drift_status)
  [ "$drift" = "no_drift" ] || {
    echo "self-check failed: expected no_drift, got $drift" >&2
    return 1
  }

  sample='[unit/a] terraform: Changes to Outputs:
[unit/a] terraform: without changing any real infrastructure.'
  PLAN_TEXT="$sample"
  drift=$(drift_status)
  [ "$drift" = "output_only" ] || {
    echo "self-check failed: expected output_only, got $drift" >&2
    return 1
  }

  sample='[unit/a] terraform: Plan: 1 to add, 0 to change, 0 to destroy.'
  PLAN_TEXT="$sample"
  drift=$(drift_status)
  [ "$drift" = "drift_detected" ] || {
    echo "self-check failed: expected drift_detected, got $drift" >&2
    return 1
  }

  echo "self-check ok"
}

cmd=${1:-summarize}
shift || true
if [ "$cmd" = "self-check" ]; then
  self_check
  exit $?
fi
PLAN_TEXT=$(read_input "$@")

case "$cmd" in
  summarize)
    summarize
    ;;
  drift-status)
    drift_status
    ;;
  *)
    echo "usage: $0 summarize|drift-status [file|-]" >&2
    exit 2
    ;;
esac
