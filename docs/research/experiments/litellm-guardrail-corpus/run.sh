#!/usr/bin/env bash
# LiteLLM guardrail regression corpus runner.
# Calls POST /guardrails/apply_guardrail against the configured gateway URL
# and asserts each corpus entry matches its expected outcome.

set -euo pipefail

SECRETS_FILE="$HOME/.prime/agent/mcp-secrets.json"
CORPUS_FILE="$(dirname "$0")/corpus.json"

if [[ ! -f "$SECRETS_FILE" ]]; then
    echo "SKIP: no mcp-secrets.json at $SECRETS_FILE" >&2
    exit 0
fi

BASE_URL=$(python3 -c "import json; print(json.load(open('$SECRETS_FILE'))['litellm']['base_url'].rstrip('/'))")
AUTH_HEADER=$(python3 -c "import json; d=json.load(open('$SECRETS_FILE'))['litellm']['headers']; k=list(d.keys())[0]; print(f'{k}: {d[k]}')")

GREEN="\033[32m"
RED="\033[31m"
NC="\033[0m"

pass=0 fail=0

while IFS= read -r entry; do
    id=$(echo "$entry" | jq -r '.id')
    text=$(echo "$entry" | jq -r '.text')
    expected=$(echo "$entry" | jq -r '.expected')
    guardrail=$(echo "$entry" | jq -r '.guardrail')

    resp=$(curl -s -X POST "$BASE_URL/guardrails/apply_guardrail" \
        -H 'Content-Type: application/json' \
        -H "$AUTH_HEADER" \
        -d "$(jq -n --arg t "$text" --arg g "$guardrail" '{text: $t, guardrail_name: $g}')" 2>/dev/null || echo '{}')

    redacted=$(echo "$resp" | jq -r '.data.text // .text // ""')
    was_modified="$([[ "$redacted" != "$text" ]] && echo "mask" || echo "pass")"

    if [[ "$was_modified" == "$expected" ]]; then
        ((pass++))
        echo -e "${GREEN}PASS${NC} $id ($expected)"
    else
        ((fail++))
        echo -e "${RED}FAIL${NC} $id: expected $expected, got $was_modified"
        echo "  in:  $text"
        echo "  out: $redacted"
    fi
done < <(jq -c '.[]' "$CORPUS_FILE")

echo ""
echo "=== $pass passed, $fail failed ==="
exit $((fail > 0 ? 1 : 0))
