#!/bin/sh
# Baut den Ordner "ample-app" (Server + Webseite) und das Archiv nexora-ample.tar.gz zum Hochladen auf Ample.
set -e
cd "$(dirname "$0")/.."
rm -rf ample-app && mkdir -p ample-app/public
cp server/*.js server/package.json ample-app/
cp -r *.html admin assets ample-app/public/; cp manifest.webmanifest ample-app/public/
tar -czf nexora-ample.tar.gz -C ample-app .
echo "fertig: nexora-ample.tar.gz"
