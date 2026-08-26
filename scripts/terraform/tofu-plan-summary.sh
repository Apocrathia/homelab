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

unit_has_resource_drift() {
  local unit=$1
  grep -F "[${unit}]" <<<"$PLAN_TEXT" | grep -E '(tofu|terraform): Plan:' |
    grep -qvE 'Plan: 0 to add, 0 to change, 0 to destroy(\.|, 0 to replace\.)?'
}

summarize() {
  local -a lines=()
  local line unit plan

  while IFS= read -r line; do
    case "$line" in
      *"terraform: Plan:"* | *"tofu: Plan:"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        plan=$(printf '%s' "$line" | sed -nE 's/^.*(tofu|terraform): (Plan:.*)$/\2/p')
        if [ -n "$unit" ]; then
          lines+=("${unit}: ${plan}")
        else
          lines+=("$plan")
        fi
        ;;
      *"terraform: No changes"* | *"tofu: No changes"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        if [ -n "$unit" ]; then
          lines+=("${unit}: No changes")
        else
          lines+=("No changes")
        fi
        ;;
      *"Changes to Outputs:"*)
        unit=$(printf '%s' "$line" | sed -nE 's/^.*\[([^]]+)\].*/\1/p')
        if [ -n "$unit" ] && unit_has_resource_drift "$unit"; then
          :
        elif [ -n "$unit" ]; then
          lines+=("${unit}: Changes to Outputs only")
        else
          lines+=("Changes to Outputs only")
        fi
        ;;
    esac
  done <<<"$PLAN_TEXT"

  if ((${#lines[@]} > 0)); then
    printf '%s\n' "${lines[@]}" | sort -u
    return
  fi

  grep -E '^Run Summary|Succeeded|Failed' <<<"$PLAN_TEXT" | tail -5 || echo "No plan summary lines found"
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

  sample='[unit/a] tofu: Plan: 1 to add, 0 to change, 0 to destroy.'
  PLAN_TEXT="$sample"
  drift=$(drift_status)
  [ "$drift" = "drift_detected" ] || {
    echo "self-check failed: expected tofu drift_detected, got $drift" >&2
    return 1
  }
  summary=$(summarize)
  [ "$summary" = "unit/a: Plan: 1 to add, 0 to change, 0 to destroy." ] || {
    echo "self-check failed: expected tofu plan summary line, got $summary" >&2
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
