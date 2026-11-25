#!/usr/bin/env bash
# Serves dist/ with the official Apache image (httpd:2.4) the way a LAMP host would, using only the
# generated <base>/.htaccess, and checks the answers with curl. Needs Docker with a running daemon.
# Usage: npm run test:apache   (run `npm run build` first). Exit code 1 on any failed check.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: the Docker daemon is not running (docker info failed). The Apache test could not run."
  exit 2
fi
if [ ! -d dist ]; then
  echo "FAIL: dist/ not found, run npm run build first"
  exit 1
fi

# Everything report-specific comes from report.config.json and the English strings.
eval "$(node -e '
  const c = JSON.parse(require("fs").readFileSync("report.config.json", "utf8"));
  const en = JSON.parse(require("fs").readFileSync("src/i18n/en.json", "utf8"));
  const base = c.basePath.replace(/^\/+|\/+$/g, "");
  const def = c.languages.find((l) => l.default).code;
  const summary = c.languages.filter((l) => l.scope === "summary").map((l) => l.code);
  console.log(`BASE=${JSON.stringify("/" + base)}`);
  console.log(`DEFAULT=${JSON.stringify(def)}`);
  console.log(`FULL=${JSON.stringify(c.languages.filter((l) => l.scope === "full").map((l) => l.code).join(" "))}`);
  console.log(`SUMMARY_LANGS=${JSON.stringify(summary.join(" "))}`);
  console.log(`NOT_FOUND_TITLE=${JSON.stringify(en["notFound.title"])}`);
')"

NAME="report-apache-test-$$"
WORK="$(mktemp -d)"
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1
  rm -rf "$WORK"
}
trap cleanup EXIT

cat >"$WORK/test.conf" <<'CONF'
# Test overrides: the modules the .htaccess needs, and AllowOverride for the document root.
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
LoadModule expires_module modules/mod_expires.so
<Directory "/usr/local/apache2/htdocs">
  AllowOverride All
</Directory>
CONF

if ! docker run -d --name "$NAME" -p 127.0.0.1:0:80 \
  -v "$ROOT/dist:/usr/local/apache2/htdocs:ro" \
  -v "$WORK/test.conf:/usr/local/apache2/conf/extra/mr-test.conf:ro" \
  httpd:2.4 httpd-foreground -c "Include conf/extra/mr-test.conf" >/dev/null; then
  echo "FAIL: could not start the httpd:2.4 container"
  exit 1
fi

PORT="$(docker port "$NAME" 80/tcp | head -n 1 | sed 's/.*://')"
URL="http://127.0.0.1:$PORT"
if ! curl -s -o /dev/null --retry 30 --retry-connrefused --retry-delay 1 "$URL/"; then
  echo "FAIL: the server did not answer"
  docker logs "$NAME" 2>&1 | tail -n 20
  exit 1
fi

FAILS=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1 ($2)"; FAILS=$((FAILS + 1)); }
skip() { echo "SKIP $1 ($2)"; }

# expect <name> <expected> <actual>
expect() {
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "expected '$2', got '$3'"; fi
}
# expect_contains <name> <needle> <haystack>
expect_contains() {
  case "$3" in *"$2"*) pass "$1" ;; *) fail "$1" "'$2' not found in '$3'" ;; esac
}
content_type() { curl -s -o /dev/null -w '%{content_type}' "$URL$1" | cut -d';' -f1; }
status() { curl -s -o /dev/null -w '%{http_code}' "$URL$1"; }
header() { curl -s -D - -o /dev/null "$URL$1" | tr -d '\r' | grep -i "^$2:" | head -n 1 | cut -d' ' -f2-; }

# Root redirect: only the exact base.
expect "$BASE/ gives 301" "301" "$(status "$BASE/")"
expect "$BASE/ redirects to $BASE/$DEFAULT/" "$BASE/$DEFAULT/" "$(curl -s -o /dev/null -w '%{redirect_url}' "$URL$BASE/" | sed "s|^$URL||")"

# Pages.
for lang in $FULL; do
  expect "$BASE/$lang/ gives 200" "200" "$(status "$BASE/$lang/")"
done
expect "$BASE/$DEFAULT/ is text/html" "text/html" "$(content_type "$BASE/$DEFAULT/")"
for lang in $SUMMARY_LANGS; do
  expect "$BASE/$lang/summary/ gives 200" "200" "$(status "$BASE/$lang/summary/")"
done
expect "a directory without the slash redirects" "301" "$(status "$BASE/$DEFAULT")"

# Missing page: 404 with the report 404 page.
expect "a missing page gives 404" "404" "$(status "$BASE/does-not-exist/")"
expect_contains "the 404 page body is the report 404 page" "$NOT_FOUND_TITLE" "$(curl -s "$URL$BASE/does-not-exist/")"

# MIME types.
WASM="$(cd dist && find "${BASE#/}/pagefind" -name '*.wasm' 2>/dev/null | head -n 1)"
if [ -n "$WASM" ]; then
  expect "a .wasm file is application/wasm" "application/wasm" "$(content_type "/$WASM")"
else
  skip "a .wasm file is application/wasm" "Pagefind ships no .wasm file, it uses wasm.<lang>.pagefind"
fi
PF="$(cd dist && find "${BASE#/}/pagefind" \( -name '*.pagefind' -o -name '*.pf_meta' \) | head -n 1)"
if [ -n "$PF" ]; then
  expect "a Pagefind file ($PF) is application/octet-stream" "application/octet-stream" "$(content_type "/$PF")"
else
  fail "a Pagefind file is application/octet-stream" "no Pagefind file in dist/"
fi
CSV="$(cd dist && find "${BASE#/}" -name '*.csv' | head -n 1)"
if [ -n "$CSV" ]; then
  expect "a CSV download is text/csv" "text/csv" "$(content_type "/$CSV")"
else
  fail "a CSV download is text/csv" "no CSV file in dist/"
fi
SVG="$(cd dist && find "${BASE#/}" -name '*.svg' | head -n 1)"
[ -n "$SVG" ] && expect "an SVG is image/svg+xml" "image/svg+xml" "$(content_type "/$SVG")"
expect_contains "HTML is served as UTF-8" "charset=utf-8" "$(curl -s -o /dev/null -w '%{content_type}' "$URL$BASE/$DEFAULT/" | tr 'A-Z' 'a-z')"

# Caching.
ASSET="$(cd dist && find "${BASE#/}/_astro" -type f | head -n 1)"
if [ -n "$ASSET" ]; then
  expect_contains "a hashed asset is cached as immutable" "immutable" "$(header "/$ASSET" Cache-Control)"
else
  fail "a hashed asset is cached as immutable" "no file in _astro/"
fi
expect "a page is revalidated (no-cache)" "no-cache" "$(header "$BASE/$DEFAULT/" Cache-Control)"

if [ "$FAILS" -gt 0 ]; then
  echo "apache test: $FAILS FAIL"
  exit 1
fi
echo "apache test: all checks passed"
