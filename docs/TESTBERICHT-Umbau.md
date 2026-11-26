# Testbericht Umbau 10.11.2026

## Automatisierte Tests (Node) – 129 Prüfungen, alle bestanden
admin-unchanged 11/11 · assets-exist 1/1 · bookkeeping 17/17 · core-smoke 11/11 · homepage-redesign 12/12 · homepage-reference-composition 7/7 · homepage-structure 18/18 · invoice-balance-layout 5/5 · invoice-branding 10/10 · local-feature 13/13 · project-configurator 10/10 · public-layout-refresh 8/8 · regression-fixes 6/6

## Browser-Tests (Chromium) – 50/50 bestanden
Alle 10 öffentlichen Seiten bei 1440, 820 und 390 px: keine JS-Fehler, keine fehlenden Bilder, kein horizontaler Scroll. Navigation und mobiles Menü (öffnen, Escape, Linknavigation). Projektfilter und Detailansicht. Konfigurator mit allen 11 Leistungen, Monatspaket, Hosting, Speicherung. Kundenportal-Login. Administration: 16 Ansichten ohne JS-Fehler und ohne defekte Bilder. Dokumente (Rechnung, Angebot, Mahnung) und PDF-Druckausgabe.

## Administration – Praxistests im Browser (52 Prüfungen, alle bestanden)
Ablauf 1 (22): Login richtig/falsch, Kundin anlegen, Projekt, Angebot, Rechnung centgenau (3 × 33,33 € mit 10 % Rabatt und 19 % USt = 107,09 €), Teilzahlung und Restzahlung (Status „Bezahlt“), Dokument mit getrennten Beträgen, Zeiterfassung mit Live-Dauer, Abrechnung von Zeiten ohne Doppelabrechnung, Monatsvertrag mit Bestätigung, Duplikatschutz und Terminfortschreibung, Mahnung mit Gebühr, Persistenz nach Neuladen.
Ablauf 2 (18): Buchhaltungs-Dashboard, Ausgabe erfassen und freigeben, 7 Demo-Bankbuchungen (kein Duplikat bei erneutem Import), mehrdeutige Einnahme wird nicht automatisch zugeordnet, Ausgabe-Zuordnung, Simulationshinweis, CSV-Exporte, Anlagenverzeichnis, Website-Einstellungen wirken auf Startseite, Portfolio und Konfigurator, Datensicherung exportieren/importieren, Demo-Reset, Passwortprüfung.
Ablauf 3 (12): Projektanfrage auf der Website → Administration (Leistung, Detailantworten, Paket, Support, Hosting) → Übernahme in Projekt und Kunde → Vertrag aus dem Projekt → Kundenportal zeigt Rechnungen, Entwürfe bleiben unsichtbar.
Tablet und Smartphone: kein Quer-Scroll in den geprüften Bereichen.
Die Skripte liegen in `tests/browser/`.

## Visuelle Abnahme
Screenshots in `screenshots/` (Desktop 1440/1920, Tablet, Smartphone, Unterseiten, Portal, Administration, Rechnung, Vergleich mit der Referenz).

## Einschränkungen
- Die Administration wirkt auf dem Smartphone bedienbar, aber die Menüleiste nimmt viel Platz ein (Verhalten des Originals, nicht angepasst).
- Geprüft wurde in Chromium. Safari und Firefox wurden nicht getestet (`backdrop-filter`, `:has()` im Druck sind dort in aktuellen Versionen verfügbar).
- Der echte E-Mail-Versand über FormSubmit wurde nicht ausgelöst (Netzwerkaufruf im Test abgefangen).
- Der Hintergrund entspricht der Referenz in Komposition und Elementen; in Brillanz und Detailtiefe (Horizontlicht, Lichtstrahlen, Kontinentstruktur) bleibt er hinter dem gerenderten Referenzbild zurück. Eine höher aufgelöste, textfreie Grafik kann als `assets/images/nexora-hero-bg.jpg` direkt ausgetauscht werden.

## Nachtrag: Zusatzfunktionen (Homepage + Admin)
Neuer Browser-Test `tests/browser/extras-test.py`: 21/21 bestanden (Vertrauensleiste, FAQ, Einblenden, Handy-Button, reduzierte Bewegung, Dashboard-Handlungsbedarf, 4 Schnellaktionen, Status-Chips, Sicherungs-Hinweis, keine JS-Fehler). Bestehende Tests unverändert bestanden. Nicht getestet: Safari/Firefox, echter FormSubmit-Versand.

`tests/browser/extras-test.py` jetzt 29/29 (zusätzlich: Leistungsfilter, Zeitleiste, Nach-oben-Button, globale Suche, Tastaturkürzel). Alle übrigen Tests unverändert bestanden.

`tests/browser/konto-archiv-test.py`: 16/16 bestanden (Admin archiviert/stellt wieder her, Kunde gesperrt bei Admin-Archivierung, Kunden-Löschung in 3 Schritten, Selbst-Wiederherstellung, Ablauf nach 30 Tagen, Geschäftsdaten bleiben).

`tests/browser/dashboard-diagramme-test.py`: 19/19 bestanden (Zeiträume, Kurven, Farben, Zähler, Menü). Alle übrigen Tests unverändert bestanden.

`tests/browser/anfrage-formular-test.py`: 15/15 (Pflichtangaben, Kacheln, Adressübernahme, weiße Dropdowns). Alle übrigen Tests bestanden.

## Nachtrag 7 – Tests
Node-Tests 13/13; Browser: E2E 50/50, Admin-Abläufe 22/22, 18/18, 12/12, Admin-Durchlauf ohne Fehler, Extras 29/29, Konto-Archiv 16/16, Diagramme 19/19, Anfrageformular 15/15, 20-Nutzer-Test 20/20.
Nachtrag 8: Zeit-Filter-Test 10/10, alle bisherigen Suiten weiterhin grün.
Nachtrag 9: Preis-Test 8/8, Rechtstexte 26/26, alle bisherigen Suiten grün.
Nachtrag 10: Dashboard-kompakt 17/17, alle Suiten grün.
Nachtrag 11: Dashboard-Layout 46/46, alle Suiten grün.
Nachtrag 12: mobil-kennzahlen 38/38, alle Suiten grün.
Nachtrag 13: auto-backup 18/18, dashboard-kompakt 46/46, alle Suiten grün.
Nachtrag 14: kalender 57/57, auto-backup 18/18, alle Suiten grün.
Nachtrag 15: kalender 81/81, alle Suiten grün.
Nachtrag 19: erinnerung 22/22, kalender 87/87, menue 27/27, alle Suiten grün.
Nachtrag 20: anfrage-formular 21/21, e2e 50/50, alle Suiten grün.
