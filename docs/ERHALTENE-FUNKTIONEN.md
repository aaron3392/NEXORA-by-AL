# Erhaltene Funktionen – Nachweis

Methode: unveränderte Dateien per SHA-256, automatisierte Tests (Node), Browser-Durchläufe (Playwright).

| Bereich | Status | Nachweis |
|---|---|---|
| Navigation (7 Einträge), mobiles Menü | erhalten, neu gestaltet | Browser-Test |
| Kontaktformular | **repariert**, funktioniert | Browser- und Regressionstest |
| Projektanfrage / Konfigurator (11 Leistungen, je eigene Fragen) | erhalten | `project-configurator-test` 10/10, Browser: alle 11 Leistungen zeigen Detailfelder |
| Monatszahlung + Paketauswahl, Hosting NEXORA/eigen, Übernahme in Admin | erhalten | Test + Browser (Anfrage gespeichert) |
| FormSubmit-Integration, Empfänger | erhalten | `core-smoke-test` 11/11 |
| Kundenportal (Anmeldung, Daten, Projekte, Dokumente, Löschablauf, jetzt mit 30 Tagen Archiv) | erhalten, bewusst geändert (siehe Nachtrag 4 in AENDERUNGEN.md) | `portal.js`: nur Konto-Archiv und Fehlerbehebung; Browser-Test `konto-archiv-test.py` |
| Administration (16 Ansichten) | unverändert (eine Fehlerkorrektur in `bookkeeping.js`) | Hash-Test, 52 Praxisprüfungen im Browser |
| Angebote, Rechnungen, Teilzahlungen, Mahnungen, Verträge | erhalten; Dokumentlayout verbessert | `invoice-*`, `local-feature` 13/13, Ansichten geöffnet |
| Zeiterfassung, Abrechnung von Zeiten | erhalten | `time.js`, `finance.js` unverändert |
| Buchhaltung (lokal, ohne Backend) | erhalten | `bookkeeping-test` 17/17, `bookkeeping.js` unverändert |
| Pakete, Hosting, Projekte aus Admin-Daten | erhalten | Anzeige aus `NX.db.settings` |
| Lokale Speicherung (localStorage) | erhalten, keine Schlüssel geändert | Tests |
| KI / N26 | nicht aktiviert (wie gefordert) | – |
