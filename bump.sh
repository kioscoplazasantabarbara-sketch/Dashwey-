#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# bump.sh — Dashwey version control
# ═══════════════════════════════════════════════════════════════
# USO:
#   ./bump.sh          → incrementa PATCH (1.2.9-dev → 1.2.10-dev)
#   ./bump.sh 1.3.0    → fuerza versión específica
#
# FUENTE DE VERDAD: version.json
# PROPAGA A:
#   - version.json
#   - version.txt
#   - index.html  (title, manifest link, icon link, _APP_VERSION, CACHE_NAME comment)
#   - sw.js       (CACHE_NAME, version strings)
#   - ZIP final   dashwey-{version}.zip
# ═══════════════════════════════════════════════════════════════
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Leer versión actual desde version.json ──────────────────

echo "📌 Versión actual: $CURRENT"

# ── 2. Calcular nueva versión ──────────────────────────────────
if [ -n "$1" ]; then
  NEW="$1"
else
  # Extraer MAJOR.MINOR.PATCH del formato X.Y.Z-dev
  BASE="${CURRENT%-dev}"
  MAJOR=$(echo "$BASE" | cut -d. -f1)
  MINOR=$(echo "$BASE" | cut -d. -f2)
  PATCH=$(echo "$BASE" | cut -d. -f3)
  PATCH=$((PATCH + 1))
  NEW="${MAJOR}.${MINOR}.${PATCH}-dev"
fi

TODAY=$(date +%Y-%m-%d)
CACHE_KEY="dashwey-v$(echo $NEW | tr '.' '-' | sed 's/-dev$/-dev/')"

echo "🚀 Nueva versión:  $NEW"
echo "📅 Fecha:          $TODAY"
echo "🔑 Cache key:      $CACHE_KEY"
echo ""

# ── 3. Actualizar version.json ─────────────────────────────────
cat > "$DIR/version.json" << EOF
{
  "version": "$NEW",
  "build":   "v$NEW",
  "date":    "$TODAY"
}
EOF
echo "✅ version.json"

# ── 4. Actualizar index.html ───────────────────────────────────
# 4a. <title>
sed -i "s|<title>Dashwey v[^<]*</title>|<title>Dashwey v$NEW</title>|" "$DIR/index.html"
# 4b. manifest cache-bust
sed -i "s|manifest\.json?v=[^\"]*|manifest.json?v=$NEW|" "$DIR/index.html"
# 4c. apple-touch-icon cache-bust
sed -i "s|icon-192\.png?v=[0-9][^\"]*\"><!-- v1\.1\.8-dev|icon-192.png?v=$NEW\"><!-- v1.1.8-dev|" "$DIR/index.html"
# 4d. _APP_VERSION constant
sed -i "s|const _APP_VERSION = 'v[^']*'|const _APP_VERSION = 'v$NEW'|" "$DIR/index.html"
echo "✅ index.html"

# ── 5. Actualizar sw.js ────────────────────────────────────────
# 5a. CACHE_NAME constant
sed -i "s|const CACHE_NAME  = '[^']*'|const CACHE_NAME  = '$CACHE_KEY'|" "$DIR/sw.js"
# 5b. Comment header line
sed -i "s|Cache: dashwey-v[^$]*|Cache: $CACHE_KEY|" "$DIR/sw.js"
# 5c. version strings in push/notification payloads
sed -i "s|version: '[0-9][^']*-dev'|version: '$NEW'|g" "$DIR/sw.js"
echo "✅ sw.js"

# ── 6. Actualizar version.txt ──────────────────────────────────
# Solo actualiza la primera línea (nombre de versión)
sed -i "1s|Dashwey v[^ ]*|Dashwey v$NEW|" "$DIR/version.txt"
echo "✅ version.txt"

# ── 7. Crear ZIP final ─────────────────────────────────────────
ZIPNAME="dashwey-${NEW}.zip"
PARENT="$(dirname "$DIR")"
FOLDER="$(basename "$DIR")"

# Renombrar carpeta si no coincide con la versión
EXPECTED_FOLDER="dashwey-${NEW}"
if [ "$FOLDER" != "$EXPECTED_FOLDER" ]; then
  mv "$DIR" "$(dirname "$DIR")/$EXPECTED_FOLDER"
  DIR="$(dirname "$DIR")/$EXPECTED_FOLDER"
  FOLDER="$EXPECTED_FOLDER"
  echo "📁 Carpeta renombrada → $FOLDER"
fi

cd "$PARENT"
zip -qr "$ZIPNAME" "$FOLDER/"
echo "✅ ZIP: $ZIPNAME ($(du -h "$ZIPNAME" | cut -f1))"

echo ""
echo "═══════════════════════════════════════"
echo "  dashwey-${NEW}.zip listo para GitHub"
echo "═══════════════════════════════════════"
