#!/usr/bin/env bash
# Vérifie qu'une session admin peut écrire un global (détecte les erreurs CSRF 401/403).
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${PAYLOAD_PUBLIC_URL:-http://localhost:3001}"
COOKIE_JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$BODY"' EXIT

python3 - <<'PY'
import json, pathlib
raw = pathlib.Path('.env').read_text()
password = next((line.split('=', 1)[1] for line in raw.splitlines() if line.startswith('SEED_ADMIN_PASSWORD=')), '')
pathlib.Path('/tmp/iamfabriceg-cms-smoke-login.json').write_text(
    json.dumps({'email': 'bot@iamfabriceg.local', 'password': password})
)
PY
cp /tmp/iamfabriceg-cms-smoke-login.json "$BODY"

LOGIN_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -c "$COOKIE_JAR" -X POST "$BASE/api/users/login" \
  -H 'Content-Type: application/json' -H "Origin: $BASE" \
  --data-binary "@$BODY")"
test "$LOGIN_CODE" = "200" || { echo "Échec login: HTTP $LOGIN_CODE"; exit 1; }

echo '{"socialLinks":[{"label":"Smoke test","url":"https://example.com"}]}' > "$BODY"
POST_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" -X POST "$BASE/api/globals/botSettings?depth=0" \
  -H 'Content-Type: application/json' -H "Origin: $BASE" \
  --data-binary "@$BODY")"
test "$POST_CODE" = "200" || { echo "Échec écriture global: HTTP $POST_CODE"; exit 1; }

echo '{"socialLinks":[]}' > "$BODY"
RESTORE_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" -X POST "$BASE/api/globals/botSettings?depth=0" \
  -H 'Content-Type: application/json' -H "Origin: $BASE" \
  --data-binary "@$BODY")"
test "$RESTORE_CODE" = "200" || { echo "Échec restauration: HTTP $RESTORE_CODE"; exit 1; }

echo "OK — login + écriture/restauration botSettings (CSRF $BASE autorisé)"
