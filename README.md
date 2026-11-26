# NEXORA by AL

Website, Admin-Bereich und Kundenportal mit Node-Server und Postgres-Datenbank (Betrieb auf Ample). Ohne Server läuft dieselbe Seite lokal im Browser (Live Server), dann liegen die Daten im `localStorage`.

## Ersteinrichtung (keine Zugangsdaten im Code)
Beim ersten Aufruf von `/admin/` erscheint die **Ersteinrichtung**: Benutzername und Passwort (mind. 12 Zeichen, Buchstaben und Zahlen) selbst wählen. Mit Server zusätzlich den **Einrichtungs-Code** eingeben (Umgebungsvariable `NX_SETUP_CODE`). Weitere Administratoren legst du unter „Passwort ändern“ an.
Die Datenbank startet leer: keine Kunden- oder Beispieldaten.

## Aufbau
- `index.html`, `*.html`, `assets/`, `admin/` – Webseite, Admin, Kundenportal
- `server/` – Node-Server (nur Paket `pg`): Anmeldung, rollenbasierte Daten, Postgres
- `build_ample/make_ample.sh` – baut `nexora-ample.tar.gz` (Server + Seite) zum Hochladen

## Server
Umgebungsvariablen: `DATABASE_URL` (Postgres), `NX_SETUP_CODE` (Einrichtungs-Code), `NX_MODE` (`public` = Webseite + Kundenportal, `admin` = nur Administration, Standard `all`), `NX_PUBLIC_URL` (Adresse der öffentlichen App; Admin-App leitet dorthin), optional `NX_RESET_ID` (leert die Datenbank einmalig beim Start), `PORT`.
Die Seite erkennt den Server automatisch (`/api/db`). Passwörter werden im Browser gehasht und auf dem Server zusätzlich mit scrypt gesichert. Sitzungen sind 8 Stunden gültig.

## Lokal ohne Server
Ordner in VS Code öffnen, „Go Live“ (Live Server). Beim ersten Aufruf von `/admin/` die Ersteinrichtung durchführen.

Siehe auch `docs/AENDERUNGEN.md`.
