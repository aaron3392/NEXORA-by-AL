# NEXORA by AL – lokaler Start (VS Code + Live Server)

Kein Node.js, kein npm, kein Backend und keine Datenbank erforderlich.

1. ZIP-Datei entpacken. Es entsteht der Ordner `NEXORA-by-AL`.
2. Den **gesamten Ordner** in Visual Studio Code öffnen (Datei → Ordner öffnen).
3. Erweiterung **Live Server** installieren (einmalig), dann Rechtsklick auf `index.html` → **Open with Live Server**.
4. Öffentliche Website: `http://127.0.0.1:5500/` · Administration: `http://127.0.0.1:5500/admin/` (Zugangsdaten wie bisher) · Kundenportal: `kundenportal.html`.

**Wichtig**
- Immer über Live Server öffnen, nicht per Doppelklick auf die HTML-Datei (relative Pfade und Speicher verhalten sich sonst anders).
- Alle Daten liegen im `localStorage` des Browsers. Dieselbe Adresse (z. B. `127.0.0.1:5500`) und denselben Browser weiterverwenden, Browserdaten nicht löschen, regelmäßig die Backup-Funktion der Administration nutzen.
- Nach dem Austausch von Dateien bei Bedarf hart neu laden (Strg + Shift + R), damit der Browser das neue Stylesheet und die neue Hintergrundgrafik lädt.

**Optionale Tests (nur für Entwickler, nicht für den Betrieb)**
- Mit installiertem Node.js: `node tests/core-smoke-test.js` usw. (alle Dateien `tests/*-test.js`).
- Browser-Test: `tests/browser/` (Python + Playwright), siehe Kommentar am Dateianfang.

## Schnellstart in 3 Schritten
1. ZIP entpacken – es entsteht der Ordner `NEXORA-by-AL`.
2. In VS Code: **Datei → Ordner öffnen…** und genau diesen Ordner wählen.
3. Rechtsklick auf `index.html` → **Open with Live Server**. Administration: `/admin/index.html`.
