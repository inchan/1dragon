#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASE_NAME="${1:-baseline}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
SESSION_COOKIE="${SESSION_COOKIE:-}"
AGENTIC_IMAGE_URL="${AGENTIC_IMAGE_URL:-}"
VERIFY_DUPLICATE="${VERIFY_DUPLICATE:-0}"
IDEMPOTENCY_KEY="curl-${CASE_NAME}-$(date +%s)"

if [[ -z "$SESSION_COOKIE" ]]; then
  echo "SESSION_COOKIE environment variable is required." >&2
  exit 1
fi

BODY_FILE="$(mktemp)"
DUP_BODY_FILE="$(mktemp)"
DUP_SUMMARY_FILE="$(mktemp)"
cleanup() {
  rm -f "$BODY_FILE" "$DUP_BODY_FILE" "$DUP_SUMMARY_FILE"
}
trap cleanup EXIT

PAYLOAD="$(node "$SCRIPT_DIR/agentic-validation-cases.mjs" payload "$CASE_NAME" "$AGENTIC_IMAGE_URL" "$IDEMPOTENCY_KEY")"

echo "== Agentic validation request =="
echo "case: $CASE_NAME"
echo "baseUrl: $API_BASE_URL"
echo "idempotencyKey: $IDEMPOTENCY_KEY"

HTTP_STATUS="$(
  curl -sS \
    -o "$BODY_FILE" \
    -w '%{http_code}' \
    -X POST "$API_BASE_URL/api/v1/media/jobs" \
    -H "Content-Type: application/json" \
    -H "Cookie: $SESSION_COOKIE" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    --data "$PAYLOAD"
)"

echo "httpStatus: $HTTP_STATUS"
cat "$BODY_FILE"
echo

if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then
  echo "Expected HTTP 200 or 201." >&2
  exit 1
fi

echo "== Validation result =="
printf '%s' "$(cat "$BODY_FILE")" | node "$SCRIPT_DIR/agentic-validation-cases.mjs" validate "$CASE_NAME"
echo

if [[ "$VERIFY_DUPLICATE" != "1" ]]; then
  exit 0
fi

echo "== Duplicate request =="
DUP_HTTP_STATUS="$(
  curl -sS \
    -o "$DUP_BODY_FILE" \
    -w '%{http_code}' \
    -X POST "$API_BASE_URL/api/v1/media/jobs" \
    -H "Content-Type: application/json" \
    -H "Cookie: $SESSION_COOKIE" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    --data "$PAYLOAD"
)"

echo "httpStatus: $DUP_HTTP_STATUS"
cat "$DUP_BODY_FILE"
echo

if [[ "$DUP_HTTP_STATUS" != "200" ]]; then
  echo "Expected duplicate HTTP 200." >&2
  exit 1
fi

printf '%s' "$(cat "$DUP_BODY_FILE")" | node "$SCRIPT_DIR/agentic-validation-cases.mjs" validate "$CASE_NAME" >"$DUP_SUMMARY_FILE"
node -e "const fs=require('node:fs'); const summary=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(summary.isDuplicate!==true){console.error('Expected isDuplicate=true'); process.exit(1)} console.log(JSON.stringify(summary))" "$DUP_SUMMARY_FILE"
