# Änderungsübersicht (Stand 10.11.2026)

## Neu
| Datei | Zweck |
|---|---|
| `assets/css/public.css` | Eigenes Designsystem der öffentlichen Seiten (Header, Hero, Karten, Formulare, Footer, responsive). Nur öffentliche Seiten laden es. |
| `assets/images/nexora-hero-bg.jpg` | Eigens erzeugte Hintergrundgrafik (2400×1300): Energiebogen, Planetenhorizont mit Kontinenten und Netzwerk, Mesh-Wellen, Lichtvorhänge, Partikel. Enthält keinen Text und keine Navigation. |
| `assets/images/nexora-logo-hero.png` | Hauptlogo, aus der schwarzen Originalvariante freigestellt (transparent, ohne Rahmen). Nicht nachgezeichnet. |
| `assets/images/nexora-symbol.png` | N-Monogramm für den Header, aus demselben Original freigestellt. |
| `tests/homepage-structure-test.js`, `tests/assets-exist-test.js`, `tests/regression-fixes-test.js`, `tests/browser/` | Neue Tests |
| `referenz/` | Designreferenz und frühere Hero-Versuche (nicht im Seitencode) |
| `screenshots/` | Abnahme-Screenshots |

## Geändert
- **Alle öffentlichen HTML-Seiten**: neuer Rahmen (Kopfbereich, Container), `public.css` eingebunden. Formulare, IDs und Feldnamen unverändert. Impressum, Datenschutz, AGB: Texte unverändert.
- **`index.html`**: Startseite neu aufgebaut. Hero = Logo, Überschrift, Beschreibung, zwei Buttons. Keine Leistungskacheln, kein Doppelpfeil, kein leerer Platzhalter-Container. Darunter: Leistungen, Warum NEXORA, Arbeitsweise, Projekte, Vorteile/Technik, Pakete, Betreuung, Abschluss-CTA.
- **`assets/js/core.js`**: `NX.layout` (Header, Footer) neu. `NX.guard` repariert (siehe unten). Dokument- und Admin-Funktionen unverändert.
- **`assets/js/pages.js`**: Darstellung der Karten (Icons, Vorteile, Beispiele), Projektfilter und Detailansicht, Kontaktformular repariert. Leistungsnamen, Konfigurator-Fragen, Datenstrukturen, Speicherung und FormSubmit unverändert.
- **`assets/css/style.css`**: Originalinhalt unverändert; am Ende nur ein Block für Dokumente und deren Druck (siehe unten).
- **`assets/images/nexora-logo-web.png`**: Inhalt ersetzt durch die horizontale Logovariante mit transparentem Hintergrund (Dateiname und Einbindung unverändert).
- Veraltete Tests (Referenzbild mit Hotspots) ersetzt bzw. an die neue Struktur angepasst.

## Unverändert (Hash-Nachweis in `tests/admin-unchanged-test.js`)
`admin.js`, `billing.js`, `finance.js`, `time.js`, `portal.js`, `admin/index.html`, `admin/verrechnung/index.html`, `admin/zeiterfassung/index.html`.

## Eine Zeile in der Buchhaltung geändert
`assets/js/bookkeeping.js`: Der Button „Demo-Transaktionen importieren“ zeichnete über ein nicht vorhandenes Element (`[data-view="buchhaltung"]`) neu und warf dabei einen JavaScript-Fehler. Die Daten wurden zwar gespeichert, aber die Tabelle blieb leer, bis man den Tab neu öffnete. Jetzt Rückfall auf `#cnt` und der Bank-Tab bleibt geöffnet. Der Hash-Test belegt, dass sonst nichts in der Datei verändert wurde.

## Behobene Fehler des Ausgangsstands
1. **Kontaktformular funktionierte nicht**: Beim Laden JS-Fehler (Konfigurator-Felder fehlen), beim Absenden Neuladen per GET, nichts gespeichert, nichts gesendet. Jetzt: Pflichtprüfung, lokale Speicherung als Anfrage (Quelle „Kontakt“), FormSubmit, Erfolgs- und Fehlermeldung.
2. **Doppelklick-Schutz `NX.guard`**: Im Sperrfall (600 ms) wurde das native Absenden nicht verhindert; die Seite lud neu und die Eingaben standen in der URL. Jetzt wird `preventDefault()` aufgerufen. Wirkt auch auf Admin-Formulare, aber nur im Doppelklick-Fall.
3. **Rechnungsdokument**: Summenbereich war zerbrochen (Rechnungsbetrag, bezahlt und offen nebeneinander, rechts abgeschnitten; Ursache `.doc .tot div`), Logo hatte einen grauen Kasten, Fußleiste war schwarz mit unlesbarem Text. Behoben im Zusatzblock am Ende von `style.css` (nur `.doc`-Selektoren).
4. **Druckausgabe (Strg+P / PDF)**: Der dunkle Dialograhmen wurde mitgedruckt, das Dokument war rechts angeschnitten. Neuer Druckblock, der nur bei geöffnetem Dokumentdialog greift.

## Bewusst nicht geändert
- Keine KI- oder Bankanbindung, kein Backend, kein Node.js, keine neuen localStorage-Schlüssel, keine gelöschten Daten.
- Admin-Header zeigt weiterhin sein bisheriges Monogramm (`nexora-symbol-header-crop.png`, wieder im Ordner).
- `style.css` enthält weiterhin tote Alt-Regeln der früheren Hero-Versuche. Sie greifen auf keiner Seite mehr; die zugehörigen Bilddateien liegen wieder in `assets/images/`, damit es keine toten Verweise gibt.

## Nachtrag: Admin auf dem Smartphone
- Navigationsleiste im Admin bei ≤ 640 px kompakter (Höhe ca. 101 → 69 px); Desktop unverändert (`style.css`, angehängter Block am Dateiende).
- Admin-Kopf nutzt jetzt das saubere N-Monogramm `nexora-symbol.png` (`core.js`, NX.shell).
- `tests/admin-unchanged-test.js`: erlaubte Zusatz-Selektoren um `@media (max-width:640px)` und `.admin-app .side` erweitert.
- Alle 13 Node-Tests bestanden.

## Nachtrag 2: Verbesserungen für Homepage und Admin
**Homepage (neu: `assets/js/public-extras.js`, Ergänzungen in `index.html` und `public.css`)**
- Vertrauensleiste unter dem Hero mit vier Grundsätzen (nur Aussagen ohne erfundene Zahlen oder Kunden).
- FAQ-Bereich „Kurz erklärt“ (5 aufklappbare Fragen). Die Texte sind ein Entwurf – bitte inhaltlich prüfen und bei Bedarf in `index.html` anpassen.
- Sanfte Einblend-Animation beim Scrollen; bei „Bewegung reduzieren“ im System und ohne JavaScript bleibt alles sofort sichtbar.
- Fester „Projekt anfragen“-Button auf dem Smartphone (Start, Leistungen, Projekte, Über uns), erscheint nach dem Hero und verschwindet am Seitenende-Kasten.

**Admin (neu: `assets/js/admin-extras.js`; `admin.js`, `billing.js`, `finance.js`, `time.js`, `portal.js` und die Admin-HTML-Dateien bleiben unverändert)**
- Dashboard: Karte „Handlungsbedarf“ (neue Anfragen, überfällige Rechnungen, Rechnungsentwürfe, ablaufende Angebote, fällige Monatsrechnungen) mit Direktsprung.
- Dashboard: Schnellaktionen (Neue Rechnung, Neues Angebot, Neues Projekt, Zeit erfassen) öffnen direkt das jeweilige Formular.
- Status-Chips über allen Listen mit Status-Filter (bedienen den vorhandenen Filter).
- Sicherungs-Hinweis: zeigt, wann zuletzt exportiert wurde (neuer localStorage-Schlüssel `nexora_last_backup`, nur ein Datum; keine bestehenden Schlüssel geändert) und führt mit „Jetzt sichern“ zum Export.
- `core.js`: NX.shell lädt die Zusatzdatei und meldet das Ereignis `nx:view` nach jedem Rendern einer Ansicht (zwei kleine Ergänzungen).
- `style.css`: angehängter Block (`.nx-ax…`); `tests/admin-unchanged-test.js` erlaubt dafür diese Selektoren.

**Tests:** 13 Node-Testdateien bestanden; Browser: E2E 50/50, Admin-Abläufe 22/22, 18/18, 12/12, Admin-Durchlauf ohne Fehler, neu `tests/browser/extras-test.py` 21/21.

## Nachtrag 3: weitere Verbesserungen
**Homepage (`public-extras.js`, `public.css`)**
- Ablauf-Zeitleiste: Linie und Schritt-Kreise füllen sich beim Scrollen (Desktop; bei „Bewegung reduzieren“ sofort vollständig).
- Leistungen: Kategorie-Filter (Alle / Web / Software & Apps / Betreuung) über den 11 Leistungen.
- „Nach oben“-Button auf dem Desktop.
- Fehlerbehebung: Reveal-Effekt und Handy-Button liefen auf Leistungen, Projekte und Über uns zunächst nicht (dort hat `<main>` keine ID) – jetzt aktiv.

**Admin (`admin-extras.js`, `style.css`)**
- Globale Suche im Kopf (Anfragen, Projekte, Rechnungen, Angebote, Kunden): Treffer öffnet die passende Liste mit gesetztem Suchtext.
- Tastaturkürzel: `/` Suche, `N` Neu anlegen (in Listen mit „Neu“-Button), `?` Hilfe.

**Bewusst nicht umgesetzt** (würden geschützte Admin-/Formular-Logik ändern): Schritt-für-Schritt-Anfrageassistent, gruppiertes Admin-Menü, „Rückgängig“ beim Löschen.

**Tests:** 13 Node-Dateien; Browser E2E 50/50, Admin-Abläufe 22/22, 18/18, 12/12, Durchlauf ohne Fehler, `extras-test.py` 29/29.

## Nachtrag 4: Konto-Archiv mit 30 Tagen Frist (Admin und Kunde)
**Verhalten:** Wird ein Konto gelöscht – durch den Kunden im Portal oder durch den Administrator – wird es nicht sofort entfernt, sondern **deaktiviert und 30 Tage im Archiv aufbewahrt**. Erst nach Ablauf der 30 Tage wird es endgültig gelöscht (automatisch beim nächsten Start der Seite). Angebote, Rechnungen, Projekte und andere Geschäftsdaten bleiben erhalten.
- **Kunde löscht selbst** (3 Schritte mit Passwort und E-Mail-Code): Konto wird 30 Tage archiviert; der Kunde kann es innerhalb der Frist durch Anmeldung selbst wiederherstellen.
- **Administrator löscht:** Der Button heißt jetzt „Benutzer archivieren (30 Tage)“. Das Konto verschwindet aus der Hauptliste und erscheint unter Userverwaltung → **Archiv** mit Restlaufzeit und Button „Wiederherstellen“. Der Kunde kann ein vom Administrator archiviertes Konto nicht selbst wiederherstellen (Hinweis „Konto wurde deaktiviert“).
- **Dashboard:** Hinweis, wenn archivierte Konten in höchstens 7 Tagen endgültig gelöscht werden.
- **Technik:** zentrale Funktionen `NX.accounts` in `core.js` (archive, restore, purgeExpired). Gespeichert wird weiterhin im bestehenden Status `loeschung_vorgemerkt`; neue Felder am Konto: `archivedBy`, `archivedAt`, `statusBefore`. Die Admin-Oberfläche ergänzt das Archiv in `admin-extras.js`.
- **Geänderte geschützte Dateien:** `admin.js` (Löschen → Archivieren, Hauptliste ohne archivierte Konten), `portal.js` (30 statt 14 Tage, Archiv-Funktionen). Der genaue Unterschied zum Ausgangsstand steht in `docs/konto-archiv.diff`; `tests/admin-unchanged-test.js` enthält den neuen freigegebenen Stand.
- **Fehlerbehebung im Original:** Im letzten Schritt der Kunden-Kontolöschung war `sendFormSubmit` nicht definiert (ReferenceError). Die Löschung wurde dadurch nie abgeschlossen. Jetzt behoben.
- **Hinweis zum Datenschutz:** Die Datenschutzerklärung wurde nicht verändert. Die 30-tägige Aufbewahrung im Archiv sollte dort ergänzt werden (Rechtstext bitte selbst prüfen).
- **Tests:** neu `tests/browser/konto-archiv-test.py` (16/16).

## Nachtrag 5: Dashboard-Kurven und Menü
- **Umsatzübersicht als Kurve:** Das Balkendiagramm wurde durch eine glatte Kurve mit Fläche ersetzt (eigener SVG-Code, keine Bibliothek, funktioniert offline). Zeitraum wählbar: **Letzte Woche** (7 Tage), **Letzter Monat** (30 Tage), **Letzte 6 Monate**, **Letztes Jahr** (je Monat) und **Gesamte Zeit** (ab erster Zahlung). Werte = eingegangene Zahlungen, wie bisher. Tooltip beim Darüberfahren/Tippen.
- **Neues Diagramm „Nutzer & Besucher“** mit drei Kurven in verschiedenen Farben und demselben Zeitraum-Schalter: **Aufrufe Startseite** (blau), **Anmeldungen** (gelb), **Neue Registrierungen** (grün). Über die Legende lassen sich Kurven ein- und ausblenden.
- **Woher die Zahlen kommen:** Registrierungen aus dem Anlagedatum der Kundenkonten. Aufrufe und Anmeldungen werden **lokal im Browser** gezählt (neue Schlüssel `nexora_stat_visits` und `nexora_stat_logins`, je Tag eine Zahl). Es gibt kein Server-Tracking: gezählt werden nur Besuche in demselben Browser, die Zählung beginnt mit dieser Version, und Aufrufe während einer Admin-Anmeldung zählen nicht. Für echte Besucherzahlen aller Besucher braucht es später einen Server oder einen Analysedienst.
- Der gewählte Zeitraum wird je Diagramm im Browser gemerkt (`nexora_chart_range`).
- **Menü:** Zeiterfassung → „Tages-/Wochen-/Monatsübersicht“ heißt jetzt **„Übersicht“**. **Userverwaltung** steht jetzt direkt über **Website-Einstellungen** (`admin.js`, nur Reihenfolge/Name).
- **Tests:** neu `tests/browser/dashboard-diagramme-test.py` (19/19); alle übrigen Tests unverändert bestanden.

## Nachtrag 6: Dropdown-Schrift, Anfrageformular, Auswahl-Kacheln
- **Dropdowns:** Schrift und Auswahllisten sind überall (Website, Kundenportal, Administration) weiß auf dunklem Grund; die Auswahllisten haben einen eigenen dunklen Hintergrund (`style.css`, Block am Dateiende). Helle Seiten (Verrechnung/Finanz-Seiten mit hellem Design) bleiben dunkel auf hell. Geprüft per Test an allen Dropdowns der Website und der wichtigsten Admin-Ansichten.
- **Zahlungsmodell und Hosting als Kacheln:** Es gibt nur noch zwei große Kacheln je Auswahl; die ganze Kachel ist anklickbar, der Kreis/Punkt ist entfernt. Die gewählte Kachel leuchtet violett (auch per Tastatur bedienbar).
- **Fehler behoben:** „Monatliches Paket“ war sichtbar, obwohl „Einmalige Zahlung“ gewählt war (`hidden` wurde von der Gestaltung überschrieben).
- **Anfrage fragt jetzt genau das ab, was für Angebot/Rechnung nötig ist:** neu **Rechnungsadresse** (Straße, Hausnummer, PLZ, Ort, Land – Pflicht; Land ist mit Österreich vorbelegt), **Firma** und **UID-Nummer** (optional), **bevorzugter Kontaktweg** und **gewünschter Fertigstellungstermin** (optional). Bereits vorhanden und unverändert: Leistung, Projekttitel, Beschreibung, leistungsspezifische Detailfragen (z. B. bestehende Website, Domain, Inhalte), Budget, Zeitrahmen, Zahlungsmodell, Paket, Hosting. Angemeldete Kunden werden samt Adresse vorausgefüllt.
- **Weiterverarbeitung:** Die neuen Angaben stehen in der Admin-Anfrage-Detailansicht und werden per FormSubmit mitgesendet. Bei „In Projekt übernehmen“ wird der Kunde **mit vollständiger Adresse, Firma und UID** angelegt (bei bestehenden Kunden werden leere Felder ergänzt). Rechnungen/Angebote zeigen Firma und UID im Empfängerblock (`core.js`). Eine Adresse muss also nicht mehr nachgetragen werden.
- **Geänderte geschützte Datei:** `admin.js` (Anfrage-Details, Adressübernahme); der Schutz-Test enthält den neuen Stand, Unterschied siehe `docs/konto-archiv.diff`.
- **Tests:** neu `tests/browser/anfrage-formular-test.py` (15/15); die Test-Skripte für das Formular füllen die neuen Pflichtfelder mit aus.

## Nachtrag 7 – Kundenportal: Kacheln, Support & Wartung, Mehrnutzer-Test
- Dashboard: „Anfragen“, „Dokumente“ und „Abgeschlossene Projekte“ haben jetzt denselben dunklen Hintergrund wie „Offene Aufgaben“ und „Offene Rechnungsbeträge“ (bleiben anklickbar).
- Support & Wartung: Formular hat jetzt die volle Breite wie die Liste „Meine Support-Anfragen“.
- Neues Pflicht-Dropdown „Für welche Website / welches Projekt?“ (eigene Projekte + „Andere Website / Allgemein“). Die Auswahl wird gespeichert, in der Kundenliste als Spalte „Website / Projekt“ und im Admin unter Support- & Wartungsanfragen angezeigt.
- Geänderte geschützte Dateien: portal.js, admin.js (Hashes im Test aktualisiert, docs/konto-archiv.diff neu erzeugt).
- Neuer Test tests/browser/last-test-20-nutzer.py: 20 parallele Browser-Sitzungen (8 Besucher, 7 Kunden mit Login + Support-Anfrage, 3 Anfrageformulare, 2 Admin-Logins). Ergebnis 20/20, keine JS-Fehler, ca. 7 s gesamt.
  Grenze: Die Seite hat keinen Server, alle Daten liegen im localStorage des jeweiligen Browsers – gemeinsamer Serverzustand und echte Serverlast sind daher nicht testbar.

## Nachtrag 8 – Zeiterfassung › Übersicht: Filter
- Tagesübersicht: Von-Datum und optional Bis-Datum; beim Setzen von „Von“ wird „Bis“ automatisch auf denselben Wert gesetzt.
- Wochenübersicht: Filter auf Kalenderwoche.
- Monatsübersicht: Von-Monat, optional Bis-Monat (jeweils inkl. Jahr).
- „Filter zurücksetzen“ und Hinweis bei leerem Ergebnis. Geändert: time.js (Hash im Schutztest aktualisiert). Test: tests/browser/zeit-uebersicht-filter-test.py (10/10).

## Nachtrag 9 – Admin-Logo, Übersicht, Leistungspreise, Rechtstexte
- Admin: Klick auf das Logo führt zum Dashboard.
- Zeiterfassung › Übersicht: Dropdown und Filterfelder kompakter (kleinere Umrandung).
- Leistungen: Pro Leistung ein Mindestpreis, pflegbar unter Website-Einstellungen › „Leistungen – Mindestpreis“. Zahl (z. B. 990) wird als „ab 990 €“ angezeigt, Freitext unverändert; leer = kein Preis. Geändert: admin.js, core.js, pages.js, public.css.
- Impressum (jetzt nach österreichischem Recht: ECG, GewO, Mediengesetz), Datenschutzerklärung (DSGVO/DSG/TKG 2021) und AGB (ABGB/UGB/KSchG/FAGG) vollständig ausformuliert. Firmendaten stehen nur noch in `assets/js/legal.js` (einmal ausfüllen). Fehlende Pflichtangaben werden als Platzhalter markiert, bis sie eingetragen sind.
- Tests: leistungen-preis-test.py (8/8), rechtstexte-test.py (26/26).
- Wichtig: Texte sind sorgfältig vorbereitet, ersetzen aber keine Rechtsberatung; bei Einführung eines Servers/Datenbanks muss die Datenschutzerklärung angepasst werden.

## Nachtrag 10 – Admin-Dashboard kompakt
- Alles auf einen Blick ohne Scrollen (getestet ab 1366×768 bis 1920×1080): Titel + „Jetzt sichern“ in einer Zeile, 8 Kennzahlen in einer Reihe, darunter Handlungsbedarf, Schnellaktionen, Aktivitäten, Änderungen; unten die zwei Diagramme nebeneinander.
- Sicherung: nur noch ein Button „Jetzt sichern“ (orange, wenn lange keine Sicherung; Status im Tooltip).
- Platzfresser entfernt (Untertitel, große Abstände, lange Hinweistexte); Handy-Ansicht bleibt untereinander.
- Test: tests/browser/dashboard-kompakt-test.py (17/17).

## Nachtrag 11 – Dashboard: feste Reihenfolge, Dropdowns, automatische Skalierung
- Reihenfolge: Überschrift + „Jetzt sichern“ · Kennzahlen · Handlungsbedarf | Schnellaktionen · Umsatzübersicht | Nutzer & Besucher · Aktuelle Aktivitäten | Letzte Änderungen.
- Schnellaktionen: 2 × 2 (zwei nebeneinander, zwei untereinander).
- Handlungsbedarf wächst mit seinem Inhalt, kein eigener Scrollbalken mehr.
- Zeitraum der beiden Diagramme jetzt als Dropdown rechts auf Höhe der Überschrift.
- Aktivitäten/Änderungen: 3 Einträge, darunter „+ n weitere“ → Popup in der Bildschirmmitte mit allen Einträgen.
- Das Dashboard füllt die Fensterhöhe; die Diagramme nutzen den freien Platz und zeichnen sich bei Größenänderung neu. Handy/Tablet: einspaltig, gleiche Reihenfolge, große Bedienflächen.
- Test: tests/browser/dashboard-kompakt-test.py (46/46), dashboard-diagramme-test.py angepasst (19/19).
- Nachtrag 11b: Kennzahlen-Kacheln größer (skalieren mit Fensterhöhe), Diagramme etwas niedriger.

## Nachtrag 12 – Beträge in Kennzahlen skalieren, Handy-Menü
- Kennzahl-Kacheln (Dashboard und alle Übersichten): Beträge werden formatiert (Cent und „€“ dezenter) und passen sich automatisch der Kachelbreite an. Bei extrem langen Summen werden zuerst die Schrift verkleinert, dann die Cent ausgeblendet.
- Handy/Tablet (Administration): Menü als ausklappbare Seitenleiste per Menü-Button (wie auf der Homepage) mit denselben Punkten und Untermenüs wie am Desktop; schließt nach Auswahl, per Klick daneben oder Esc. Kein seitliches Scrollen mehr (auch bei 320 px).
- Test: tests/browser/mobil-kennzahlen-test.py (38/38); alle übrigen Suiten grün.

## Nachtrag 13 – Button „Jetzt sichern“ entfernt, automatisches Backup 05:00 / 19:00
- Dashboard: Button „Jetzt sichern“ (und die zugehörige Sicherungs-Anzeige) entfernt.
- Automatisches Backup täglich um 05:00 und 19:00 Uhr (Einstellungen › „Automatisches Backup“). Es entsteht immer genau ein aktuelles Backup: Das neue wird zuerst gespeichert und gegengeprüft, erst danach wird das vorherige gelöscht.
- Ohne Server gilt: Es läuft, solange eine Admin-Seite im Browser geöffnet ist (Prüfung alle 30 s und beim Zurückkehren zum Tab). Ein verpasster Termin wird beim nächsten Öffnen sofort nachgeholt; das erste Backup entsteht beim ersten Öffnen.
- Ablage: IndexedDB im Browser (getrennt von den Arbeitsdaten). Optional zusätzlich als Datei in einem gewählten Ordner (Chrome/Edge; Datei „nexora-auto-backup-JJJJ-MM-TT_HH-MM.json“, die vorherige Datei wird nach dem Schreiben der neuen gelöscht). Der Ordner-Zugriff muss pro Browser-Sitzung einmal erneuert werden („Zugriff erneuern“).
- Im Panel: Letztes Backup/Nächster Termin, „Letztes Backup herunterladen“, „Aus letztem Backup wiederherstellen“ (mit Rückfrage).
- Neue Speicherorte: IndexedDB „nexora-backup“, localStorage „nexora_auto_backup_meta“. Bestehende Schlüssel unverändert; geändert nur admin-extras.js und style.css (Zusatzblock).
- Grenze: Ein Backup im selben Browser schützt nicht vor Verlust des Browser-Speichers oder des Geräts. Für echten Schutz den Ordner-Export nutzen und den Ordner z. B. in einem Cloud-Ordner ablegen.
- Test: tests/browser/auto-backup-test.py (18/18, Uhrzeit simuliert).

## Nachtrag 14 – Menü „Backup“, Menü „Kalender“, keine Demo-Hinweise mehr
- Neuer Menüpunkt **Backup** (ganz unten, nach „Passwort ändern“): enthält „Daten exportieren“, „Backup importieren“ und das automatische Backup (05:00 / 19:00). In den Einstellungen gibt es diese beiden Buttons nicht mehr (dort bleibt „Demo-Daten zurücksetzen“).
- Neuer Menüpunkt **Kalender** (direkt unter „Dashboard“), Aufbau wie Outlook/Teams: Kopfzeile mit „Heute“, Vor/Zurück, Titel (Monat bzw. Woche mit KW), Dropdown **Woche / Monat** und „+ Neuer Termin“.
  - Monat: Mo–So mit Kalenderwochen, heutiger Tag markiert, bis zu mehrere Einträge je Tag, „+ n weitere“ öffnet die Tagesliste; füllt die Fensterhöhe ohne Scrollen. Handy: Punkte-Übersicht, Tipp auf einen Tag öffnet die Tagesliste.
  - Woche: Zeitraster 0–24 Uhr, Ganztägig-Zeile, rote „Jetzt“-Linie, überlappende Termine nebeneinander; Klick in einen freien Zeitslot legt einen Termin an.
  - Termine anlegen/ändern/löschen (Titel, Datum, ganztägig oder Von/Bis, Farbe, Notiz) – gespeichert in den Daten (`events`) und damit in jedem Backup/Export enthalten.
  - Automatisch angezeigt (nichts erfunden): Zeiteinträge, Fälligkeiten (Rechnungen, Angebote, Monatsrechnungen), Projektstart/-ende, österreichische Feiertage. Ein Klick öffnet Details und springt zur passenden Ansicht. Filter-Chips blenden Gruppen aus; Ansicht und Filter werden gemerkt.
- Hinweistexte „lokale Demo / keine echte Sicherheit / nur in diesem Browser“ entfernt: Admin-Login und -Fußzeile, Dashboard, Einstellungen, Website-Einstellungen, Passwort ändern, Benutzerverwaltung, Buchhaltung (Kopfzeile, Bank), Monatliche Verträge, Diagramm-Hinweis, Kundenportal (Login, Dashboard, Chat). Funktions-Buttons wie „Demo-Daten zurücksetzen“ und Beispieldaten selbst bleiben unverändert.
- Geänderte, im Schutztest neu freigegebene Dateien: admin.js, billing.js, portal.js, bookkeeping.js (der Beleg „sonst identisch zum Original“ bleibt rückrechenbar); neue Logik in admin-extras.js, Zusatz in style.css.
- Tests: tests/browser/kalender-test.py (57/57), auto-backup-test.py (18/18), übrige Suiten angepasst und grün.

## Nachtrag 15 – Kalender: Tagesansicht und Datumssuche, Infotexte entfernt
- Kalender-Dropdown: **Tag / Woche / Monat**. Tagesansicht mit Zeitraster 0–24 Uhr, rote Jetzt-Linie, ganztägig-Zeile, Vor/Zurück in Tagesschritten; Klick auf einen Tageskopf in der Wochenansicht öffnet den Tag.
- **Datum suchen** (Von / Bis): Wird „Von“ gesetzt, übernimmt „Bis“ automatisch dasselbe Datum. Eine Änderung bei „Bis“ verändert „Von“ nie. Das Ergebnis erscheint sofort als Liste nach Tagen (Termine, Zeiten, Fristen, Projekte, Feiertage – gemäß Filter); „Bis“ vor „Von“ zeigt einen Hinweis, „Zurücksetzen“ kehrt zur Kalenderansicht zurück.
- Alle Erklär-/Infotexte, was man in einem Menüpunkt tun kann, entfernt (Einstellungen, Website-Einstellungen, Monatliche Verträge, Erinnerungen & Mahnungen, Zeiten abrechnen, Buchhaltung inkl. Bank, Backup). Beibehalten: Datenanzeigen (z. B. Rücklagen, Summen, Status des letzten Backups), Leer-Meldungen, Fehlermeldungen und die steuerlichen Hinweise „Planungswerte, keine Steuerberechnung“ bzw. „Steuerliche Umsatzermittlung kann abweichen“.
- Geänderte, im Schutztest neu freigegebene Dateien: admin.js, billing.js, finance.js, bookkeeping.js (Rückübersetzungsbeleg erweitert).
- Test: tests/browser/kalender-test.py (81/81).

## Nachtrag 16 – Logo im Admin-Header
- Ein Klick auf das N-Logo führt jetzt immer direkt zum Dashboard – ohne Seitenwechsel (Hash-Navigation innerhalb der Administration). Dadurch entsteht keine weiße Seite mehr, auch nicht in der Einzeldatei-Vorschau, in der der frühere Link auf eine nicht vorhandene Datei zeigte. Auf Handy schließt das Logo zusätzlich das Menü. Geändert: admin-extras.js. Test: kalender-test.py.

## Nachtrag 17 – Kalender am Handy, Suche im Menü
- Kalender-Kopfzeile: Reihenfolge jetzt „‹ Monat Jahr › Heute“ (alle Bildschirmgrößen). Am Handy: Zeile 1 Navigation, Zeile 2 Dropdown + „Neuer Termin“ nebeneinander, „Datum suchen“ mit Von/Bis nebeneinander, Filter als eine scrollbare Zeile.
- Admin-Suche: Bei kleinen Bildschirmen (≤ 900 px, Handy/Tablet) steht das Suchfeld ganz oben im ausklappbaren Menü über „Dashboard“ und nicht mehr im Header neben dem Logo; auf großen Bildschirmen bleibt sie im Header. Beim Ändern der Fenstergröße wandert sie mit. Geändert: admin-extras.js, style.css. Tests: kalender-test.py (87/87), mobil-kennzahlen-test.py.

## Nachtrag 18 – Burger-Menü schließt beim Scrollen, genau eine Suchleiste
- Das ausklappbare Menü (Burger) schließt sich, sobald die Seite gescrollt wird (Wischen, Mausrad, Tastatur) – auf jedem Gerät, auch bei schmalem Desktop-Fenster. Scrollen innerhalb des Menüs selbst lässt es offen; der Seiten-Scroll ist bei geöffnetem Menü nicht mehr gesperrt.
- Es gibt immer genau eine globale Suchleiste (am Handy im Menü, am Desktop im Header); abgesichert gegen Doppelungen bei Ansichtswechsel, Größenänderung und Neuladen. Tabellen-Suchfelder innerhalb einer Liste (z. B. bei Anfragen) sind davon getrennte Filterfelder der jeweiligen Seite.
- Test: tests/browser/menue-test.py (27/27).

## Nachtrag 19 – Wunschtermin aus Anfragen im Kalender, Erinnerungs-Mails, .ics-Export
- Jede Anfrage mit „Gewünschter Fertigstellungstermin“ erscheint automatisch im Kalender als ganztägiger Eintrag „Fertig bis: <Betreff>“ (mit Kunde und Anfrage-Nr., Klick → „Öffnen“ springt zu Anfragen). Abgelehnte und archivierte Anfragen werden nicht angezeigt. Eigener Filter-Chip „Anfragen“ (rosa).
- **Erinnerungs-E-Mail 1 Stunde vor jedem Termin** (eigene Termine mit Uhrzeit und Fertigstellungstermine aus Anfragen). Ganztägige Einträge (Fertigstellungstermine, ganztägige eigene Termine) erinnern am Morgen des Tages um 08:00 Uhr. Versand über FormSubmit an die Adresse unter Einstellungen; jede Erinnerung wird nur einmal gesendet, im Mail-Protokoll vermerkt, bereits begonnene Termine lösen nichts mehr aus; bei Fehlern erneuter Versuch nach 10 Minuten.
- Wichtige Grenze ohne Server: Die Mails gehen nur, solange eine NEXORA-Admin-Seite im Browser geöffnet ist (Prüfung alle 30 s). Wird die Seite erst nach dem Zeitpunkt geöffnet und der Termin hat noch nicht begonnen, wird die Erinnerung sofort nachgeholt. FormSubmit muss die Empfängeradresse einmalig per E-Mail bestätigen.
- **„Kalender exportieren“** (.ics): eigene Termine und Fertigstellungstermine mit eingebauter Erinnerung 1 Stunde vorher (ganztägig: 08:00). In Outlook, Google Kalender oder am Handy importieren – die Erinnerung kommt dann auch bei geschlossener Seite, im Kalenderprogramm des Geräts. Die Datei ist ein Stand zum Exportzeitpunkt.
- Test: tests/browser/erinnerung-test.py (22/22, Uhrzeit simuliert, FormSubmit abgefangen – es wurde keine echte Mail gesendet).

## Nachtrag 20 – Projektanfrage: Infotexte entfernt, Pflichtfelder neu
- Entfernt: Info-Text unter „Monatliches Paket“ (Paketbeschreibung) und der Hinweistext unter „Weitere Informationen“ (FormSubmit-Hinweis). Nach dem Absenden erscheint nur noch „Vielen Dank! Ihre Projektanfrage wurde gespeichert.“; der technische FormSubmit-Hinweis wird nur bei einem Fehler gezeigt.
- Pflichtfelder jetzt nur, was für die Umsetzung nötig ist: Vorname, Nachname, E-Mail, Leistung, Projekttitel, Projektbeschreibung, **Budgetrahmen**, **Gewünschter Zeitrahmen**, Zahlungsmodell, Hosting, Datenschutz (und das Monatspaket, wenn „Monatliche Zahlung“ gewählt ist). Die Telefonnummer wird nur Pflicht, wenn als Kontaktweg „Telefon“ oder „Rückruf-Termin“ gewählt ist (Stern erscheint dann).
- Freiwillig: Rechnungsadresse (Straße, Hausnummer, PLZ, Ort, Land), Firma, UID, Telefon (bei Kontaktweg E-Mail), Fertigstellungstermin, Hosting-Details, Weitere Informationen sowie alle Projektdetails je Leistung. Die Rechnungsadresse kann bei der Angebots-/Rechnungserstellung nachgeholt werden; sie wird bei „Projekt übernehmen“ weiterhin übernommen, wenn angegeben.
- Budget- und Zeitrahmen-Auswahl: „Keine Angabe“ ersetzt durch „Bitte wählen“; „Bitte beraten“ bleibt als Budget-Antwort wählbar.
- Tests: anfrage-formular-test.py (21/21) angepasst; weitere Abläufe (e2e, Admin-Ablauf 3) an die neuen Pflichtfelder angepasst, alle grün.

## Nachtrag 21 – Dokumente (Rechnung, Angebot, Mahnung) überarbeitet
- Neues, ruhiges Layout: Farbakzent oben, Kopfdaten als saubere Zeilen (Nr., Auftragsnummer, Datum, Leistungsdatum/Abrechnungszeitraum, Fälligkeit bzw. Gültigkeit), Titel bricht nicht mehr ab.
- Tabellen: Kopfzeile abgerundet, Zahlenspalten rechtsbündig, kein Schatten oder dunkle Zeilen mehr; Zwischensumme/Rabatt nur bei Rabatt, sonst „Nettobetrag“.
- Empfängerfeld je Dokumentart („RECHNUNG AN“, „ANGEBOT FÜR“, „RECHNUNGSEMPFÄNGER“).
- Fußbereich als drei Felder: Bankverbindung, Verwendungszweck (= Rechnungsnummer), Zahlbar bis; beim Angebot Gültigkeit und Hinweis zu Nettopreisen. Der Demo-Hinweis im Angebot entfällt.
- Rechnungen zeigen „Leistungsdatum: wie Rechnungsdatum“, wenn kein Abrechnungszeitraum gesetzt ist (bitte steuerlich prüfen).
- Handy: Tabellen passen ohne seitliches Scrollen; Mahnung blendet die Spalte „Datum“ aus. Druck: Farben bleiben erhalten, Zeilen und Fußbereich werden nicht zerschnitten.
- Geändert: core.js (docHTML), style.css (nur .doc-Block am Ende). Test local-feature-test an neue Zeilenstruktur angepasst.

## Nachtrag 22 – Auftragsarchiv + Titel „Vorauszahlung“
- Projekte/Aufträge erhalten beim Status „Abgeschlossen“ automatisch ein Abschlussdatum (`doneAt`); beim Wiederöffnen wird es entfernt. Bereits abgeschlossene Projekte erhalten das Datum „heute“ (das echte Datum ist nicht bekannt).
- 30 Tage nach Abschluss wird der Auftrag automatisch von `NX.db.projects` nach `NX.db.projectArchive` verschoben (Abgleich beim Start, bei jedem Speichern, alle 30 s und bei Fokus). Es wird nichts gelöscht; Rechnungen/Angebote bleiben unverändert.
- Archivierte Aufträge erscheinen nicht mehr in Projektliste, Auswahlfeldern, Kalender und Kennzahlen, sondern nur im Bereich „Archiv“ unter Projekte (Suche über das Projekt-Suchfeld und die globale Suche, Detailansicht, „Wiederherstellen“ → Status „Laufend“).
- Neue IDs/Auftragsnummern berücksichtigen das Archiv (keine Doppelvergabe).
- Dokumente: Die „Vorauszahlungsrechnung“ heißt im Dokument und im Fenstertitel nur „Vorauszahlung“.
- Neuer Test: tests/browser/auftrag-archiv-test.py.

## Nachtrag 23 – Status-Dropdown entfernt
- In Anfragen, Projekten, Angebote, Rechnungen und Userverwaltung ist das Status-Dropdown neben dem Suchfeld entfernt (ausgeblendet). Gefiltert wird nur noch über die Status-Buttons darunter. Änderung zentral in `NX.listView` (core.js).

## Nachtrag 24 – Skalierung auf allen Geräten
- Neuer Test `tests/browser/skalierung-test.py`: prüft 10 öffentliche Seiten, Portal-Login, Admin-Login und alle 18 Admin-Ansichten bei 15 Bildschirmgrößen (320 px bis 2560 px, Hoch- und Querformat, Handy, Tablet, PC) sowie Dokumente und Formulare/Fenster bei 5 Größen auf seitliches Scrollen und herausragende Elemente.
- Fund und Korrektur: Datumssuche im Kalender lief bei 320 px Breite 13 px über den Rand (Grid-Spalten mit `minmax(0,1fr)`).
- Sicherheitsnetz: `overflow-x: clip` auf html/body (öffentlich in public.css, Admin per admin-extras.js) und `max-width:100%` für Bilder/Videos. Der Viewport-Meta-Tag (`width=device-width, initial-scale=1`) ist auf allen Seiten gesetzt; Zoomen bleibt für Nutzer möglich (Barrierefreiheit).

## Nachtrag 25 – Datum läuft automatisch weiter
- `NX.today()` liest die Gerätezeit bei jedem Aufruf; neu überwacht `NX.dayWatch` (core.js) den Tageswechsel (Prüfung alle 20 s, exakter Timer auf Mitternacht, außerdem bei Fokus/Sichtbarkeit/Seitenwechsel) und sendet das Ereignis `nx:daychange`.
- Admin (admin-extras.js): Kalender springt auf den neuen Tag, wenn er auf „heute“ stand; die aktuelle Ansicht wird neu gezeichnet (Heute-Markierung, Fälligkeiten, Kennzahlen), automatische Archivierung und Erinnerungen werden sofort geprüft. Offene Fenster/Eingaben werden nicht gestört, das Neuzeichnen holt sich nach dem Schließen nach.
- Funktioniert rein lokal (ohne Server) mit der Uhr des Geräts. Beispieldaten aus der Erstinstallation behalten ihre festen Datumswerte.
- Neuer Test: tests/browser/tageswechsel-test.py (simulierte Uhr über Mitternacht).

## Nachtrag 26 – Menüleiste fix + Nach-oben-Button
- Menüleiste (Logo, Burger) ist auf allen Seiten und Geräten fest oben (`position: fixed`): öffentliche Seiten, Kundenportal und Admin. Geprüft nach dem Scrollen ans Seitenende.
- Neuer einheitlicher Nach-oben-Button rechts unten (core.js, `.nx-ax-top`): erscheint erst nach 300 px Scrollen, gilt für Handy, Tablet und PC, öffentliche Seiten, Portal und Admin. Er weicht der mobilen „Projekt anfragen“-Leiste der Startseite aus und berücksichtigt die Safe-Area (iPhone).
- Der alte Button (nur Desktop, nur drei Seiten, erst nach 900 px) wurde entfernt.
- Neuer Test: tests/browser/nach-oben-test.py (130 Prüfungen).

## Nachtrag 27 – Menüleiste bleibt am Handy sicher stehen
- Ursache (wahrscheinlich): Auf den öffentlichen Seiten hatte `body` ein `overflow-x: hidden`. In mobilen Browsern (v. a. iPhone/Safari) kann das dazu führen, dass fixierte Elemente wie die Menüleiste beim Scrollen mitwandern. Entfernt.
- Das Sicherheitsnetz gegen seitliches Scrollen sitzt jetzt nur noch auf `html` (`overflow-x: clip`), nicht mehr auf `body`; so bleibt der Seitenbereich selbst der Scroll-Bereich.
- Neuer Test: tests/browser/leiste-fix-test.py (mobile Emulation, Leiste vor/nach mehrmaligem Scrollen an gleicher Position; Body ohne eigenen Scroll-Container). Nicht auf echten iPhone-Geräten prüfbar – dort bitte gegenprüfen.

## Nachtrag 28 – Menüleiste scrollt mit der Seite weg (ersetzt Nachtrag 26/27 „fix oben“)
- Auf Wunsch (alle Geräte): Die Kopfleiste mit Logo und Burger ist nicht mehr fixiert. Sie ist nur ganz oben auf der Seite sichtbar und scrollt beim Runterscrollen mit nach oben weg (öffentliche Seiten, Portal: `.nx-hdr` jetzt `position: absolute`; Admin: Klasse `nx-ax-hdr-scroll` per admin-extras.js).
- Admin-Seitenmenü am PC rückt beim Scrollen bis ganz nach oben (`top: 0`); am Handy bleibt das Burger-Menü unverändert (öffnet sich unter der Leiste, schließt beim Scrollen).
- Der Nach-oben-Button (Nachtrag 26) bleibt und bringt zurück zur Leiste.
- Tests angepasst: leiste-fix-test.py, nach-oben-test.py.

## Nachtrag 29 – Dashboard im modernen Glas-Look
- Karten und Kennzahlen mit Glas-Effekt, Violett-Verlauf (Farben wie gewohnt), weichem Leuchten im Hintergrund und Farbverlauf-Schaltflächen (angelehnt an ein modernes „Vision“-Dashboard, eigenständig gestaltet).
- Runde Symbol-Plaketten an den Kennzahlen (nur Dekoration, Werte unverändert aus NX.db).
- Desktop mit genug Höhe: Kennzahlen 4 × 2; bei niedrigen Bildschirmen bleibt die kompakte Einzeilen-Ansicht ohne Symbole.
- Seitenleiste mit Verlaufshintergrund; keine Daten, Schlüssel oder Funktionen geändert.

## Nachtrag 30 – Backend und Datenbank (Ample)
- Neuer Ordner `server/`: Node-Server (nur Paket `pg`) mit Postgres-Datenbank (Tabellen `kv`, `sessions`), liefert zugleich die Webseite aus `public/`.
- Anmeldung für Admin und Kunden wird auf dem Server geprüft (Sitzungs-Cookie, 8 Stunden, Begrenzung gegen Passwort-Raten).
- Je nach Rolle bekommt der Browser nur erlaubte Daten: Admin alles, Kunde nur eigene Daten, Besucher nur öffentliche Inhalte (keine Passwort-Hashes).
- Schreiben: Admin ersetzt den Datenbestand; Kunden ändern nur eigene Datensätze; Besucher können Anfragen, Registrierungen und Passwort-Reset (nur bei vorgemerktem Reset) anlegen.
- Die Seite erkennt den Server automatisch (`/api/db`). Ohne Server (VS Code Live Server) läuft alles wie bisher im Browser-Speicher; localStorage-Schlüssel sind unverändert.
- Tests: `tests/server/backend-test.py` (22 Prüfungen, mit Postgres-Attrappe). Archiv zum Hochladen: `build_ample/make_ample.sh`.

## Nachtrag 31 – Datenbank ohne Test- und Kundendaten
- Beim ersten Start legt der Server nur Zugang, Version und Einstellungen an; Kunden, Anfragen, Projekte, Angebote, Rechnungen, Support, Aktivitäten usw. bleiben leer (`stripCustomerData`).
- Umgebungsvariable `NX_RESET_ID=<Kennung>` leert die Datenbank einmalig beim Start (je Kennung nur einmal).
- Browser-Reste einer leeren Server-Datenbank werden verworfen, damit keine alten Testdaten zurückgeschrieben werden.

## Nachtrag 32 – Ersteinrichtung, keine Zugangsdaten im Code, sichere Passwörter, Admin-Konten
- Kein Admin-Zugang und keine Demo-Daten mehr im Code: `seed()` liefert leere Startdaten (`auth: null`). Beispieldaten liegen nur noch in `tests/fixtures/demo-seed.js` und werden von `tests/serve.py` für Testläufe eingespielt.
- Ersteinrichtung beim ersten Aufruf von `/admin/` (Benutzername, Passwort mind. 12 Zeichen mit Buchstaben und Zahlen). Mit Server zusätzlich Einrichtungs-Code (`NX_SETUP_CODE`); der Server erlaubt die Einrichtung nur einmal.
- Passwörter: Browser sendet nur den Hash, der Server speichert ihn zusätzlich mit scrypt (`s1$…`). Admin-Konten liegen in der Tabelle `kv` (Schlüssel `nx_admins`), nicht mehr im Datenobjekt.
- Weitere Administratoren: Karte „Administratoren“ unter „Passwort ändern“ (anlegen, Passwort setzen, löschen).
- Entfernt: Demo-Kontohinweis im Kundenportal, „Demo“-Texte in admin.js/portal.js/Startseite, persönliche FormSubmit-Adresse aus den Standardeinstellungen (bitte unter Website-Einstellungen eintragen).
- Veraltete Admin-Seiten überschreiben keine neuen Registrierungen/Anfragen/Automatik-Ergebnisse (Revisionsmarke `_r`) und keine Kundenpasswörter.

## Nachtrag 33 – Server-Sicherungen, Dateien, Automatik
- Sicherungen: täglich automatisch (30 Tage), manuell, Download und Wiederherstellung im Menü „Backup“ (vor jeder Wiederherstellung wird der aktuelle Stand gesichert).
- Dateien: neuer Menüpunkt „Dateien“ (Upload bis 10 MB je Datei, Zuordnung zu Kunde/Projekt/Rechnung, Speicherung in Postgres, 400 MB gesamt); Kunden sehen im Portal den Reiter „Dateien“ nur mit ihren Dateien. Auslieferung immer als Download.
- Automatik (`server/automation.js`): Monatsrechnungen als Entwurf, sobald fällig; optional Zahlungserinnerung/1. und 2. Mahnung als Dokument. Es wird nichts versendet. Schalter in „Einstellungen“; Standard: Monatsrechnungen an, Mahnwesen aus.
- Tests: `tests/server/backend-test.py` (60 Prüfungen). Der Menüpunkt „Dateien“ (nach „Website-Einstellungen“) ist in admin.js ergänzt; Hashes in `tests/admin-unchanged-test.js` aktualisiert.

## Nachtrag 34 – Getrennte Admin-Seite (zwei Apps, eine Datenbank)
- Derselbe Code läuft als zwei Apps mit derselben Datenbank, gesteuert über `NX_MODE`: `public` (Webseite + Kundenportal; kein `/admin/`, keine Admin-Skripte, keine Admin-Schnittstellen, Admin-Login serverseitig verweigert) und `admin` (nur Admin; `/` leitet nach `/admin/`, öffentliche Seiten leiten zu `NX_PUBLIC_URL`, Kunden-Login und Schreibzugriffe ohne Admin-Sitzung werden verweigert). `all` (Standard) verhält sich wie bisher.
- Wartung (Sicherungen, Automatik) läuft mit Datenbank-Sperre, damit zwei Apps sie nicht doppelt ausführen.
- Test: `tests/server/modus-test.py` (17 Prüfungen), `tests/server/backend-test.py` weiterhin 60/60.

## Nachtrag 35 – Test- und Demo-Inhalte entfernt
- Entfernt: Ordner `tests/` (inkl. Beispieldaten), Testberichte, Screenshots, Demo-Bankbewegungen und Demo-Schaltflächen in der Buchhaltung, Schaltflächen „Demo-Daten zurücksetzen“, Seeding-Hook für Testdaten, Hinweis „Lokale Vorschau (Demo-Daten)“ in der Fußzeile. Frühere Nachträge nennen die Tests noch als Verlauf.

## Nachtrag 36 – Kontoauszug-Import (CSV, Excel, PDF)
- Buchhaltung → „Bank & Zahlungsabgleich“: Knopf „Kontoauszug importieren“. Unterstützt CSV (Trennzeichen und Zeichensatz automatisch), Excel `.xlsx` und PDF (mit Text). Die Datei wird nur im Browser gelesen.
- Spalten werden an den Überschriften erkannt (Datum, Betrag oder Soll/Haben, Text, Name); sonst Zuordnung per Auswahl. PDF: Zeilen mit Datum und Betrag; Option „letzte/vorletzte Zahl“ (Saldo). Vorschau mit Auswahl und Einnahme/Ausgabe je Zeile; doppelte Buchungen werden erkannt.
- Zahlungen mit Rechnungsnummer (R-JJJJ-NNNN) im Text werden automatisch der Rechnung zugeordnet, sofern der Betrag zum offenen Betrag passt.
- Mitgelieferte Bibliotheken (`assets/vendor/`): pdf.js (Apache-2.0) und JSZip (MIT). Entfernt: „Synchronisierung testen“.

## Nachtrag 37 – Layout, Live-Abgleich, Benachrichtigungen
- Admin: feste Arbeitsfläche (Kopf und Fuß immer sichtbar), Seitenwahl (‹ 1 2 3 ›) für Menü und Listen bei Platzmangel (`assets/js/admin-layout.js`). Öffentliche Seite: Kopfleiste bleibt oben. Nach-oben-Button entfernt.
- Live-Abgleich (`assets/js/live-sync.js`): die Administration prüft alle 4 s (im Hintergrund alle 15 s), ob sich die Datenbank geändert hat, und übernimmt Neues in die offene Seite, sobald gerade nichts bearbeitet wird. Neue Anfragen, Kundenregistrierungen, Support-Anfragen und Chat-Nachrichten lösen Hinweis, Ton, Tab-Titel-Zähler und (nach Erlaubnis über die Glocke in der Kopfleiste) eine Systembenachrichtigung am PC/Smartphone aus (`admin/sw.js`, nur über HTTPS).

## Nachtrag 38 – Export-Auswahl, Beleg-/Kontoauszug-Import, Mitarbeiter-Rechte

- **Export überall mit Auswahl CSV / Excel / PDF** (`assets/js/export.js`, Excel mit JSZip, PDF mit eigenem Schreiber).
- **Import von Kontoauszügen und vom Firmenkonto bezahlten Rechnungen** als PDF oder Foto. Handy: PDF oder Foto (Galerie oder Kamera). PC: nur PDF. Kein OCR: Fotos werden mit Vorschau manuell erfasst, PDFs über Textmuster gelesen und vor dem Übernehmen geprüft.
- **Buchhaltung:** der Stand wird bei jeder Ansicht neu aus den Daten geladen (verhindert veraltete Daten nach neuem Login).
- **Mitarbeiter-Konten (nur mit Server):** In der Userverwaltung über „+ Neuer Benutzer“ wählbar: Kunde, Mitarbeiter oder Administrator. Der separate Administratoren-Bereich unter „Passwort ändern“ entfällt.
  - Mitarbeiter haben Zugang zum Adminbereich, sehen aber nur freigegebene Bereiche: Anfragen, Kalender, Projekte & Support, Verrechnung, Buchhaltung, Finanzen, Zeiterfassung, Userverwaltung (Kunden), Einstellungen, Dateien.
  - Die Rechte werden **auf dem Server** bei jeder Anfrage aus dem Konto gelesen: nicht freigegebene Daten werden gar nicht ausgeliefert, Schreibzugriffe werden verworfen, Backups, Konten und Automatik bleiben Administratoren vorbehalten. Änderungen an Rechten oder Sperren wirken sofort.
  - Kunden können sich nie im Adminbereich anmelden. Eigenes Konto und letzter Administrator können nicht gelöscht, gesperrt oder herabgestuft werden.
  - Kunden-Datensätze können mit Server nicht mehr die Rolle „Mitarbeiter“ erhalten (diese Rolle sperrte das Kundenportal).

## Nachtrag 39 – Dateien direkt an Anfrage und Projekt, kleine Korrekturen
- Der Menüpunkt „Dateien“ im Adminbereich entfällt (auch das Mitarbeiter-Recht „Dateien“). Dateien werden dort hinzugefügt, wo sie gebraucht werden: im Dialog einer **Anfrage** („Dateien zur Anfrage“, intern – der Kunde sieht sie nie) und im Dialog eines **Projekts** (für den Kunden im Portal sichtbar; Dateien der ursprünglichen Anfrage bleiben intern und werden dort mit „aus der Anfrage“ angezeigt).
- Mitarbeiter dürfen Dateien nur in Bereichen sehen/hochladen/löschen, die ihnen freigegeben sind (Anfragen bzw. Projekte); Administratoren überall.
- Kundenportal: Knopf „Konto erstellen“ (statt „Konto lokal erstellen“). Selbst registrierte Kunden erhalten immer die Rolle „Kunde“ (Server erzwingt das).

## Nachtrag 40 – Kopfleiste und Profil
- Admin-Kopfleiste: Titel „Administration“ entfernt; Live-Anzeige und Glocke rechts, daneben der runde Profil-Knopf mit den Initialen des angemeldeten Kontos (aus Name, sonst Benutzername), dann „Abmelden“.
- Profil-Dialog (Knopf mit Initialen): jeder Administrator/Mitarbeiter ändert Name, Benutzername und Passwort (Passwort nur mit bisherigem Passwort). Der Menüpunkt „Passwort ändern“ entfällt. Server: `PUT /api/me`.
- Administratoren ändern in der Userverwaltung Name, Benutzername und Passwort jedes Kontos. Danach werden dessen andere Anmeldungen beendet. Das Passwort kann nur noch über diese Wege geändert werden (nicht mehr über die Datensynchronisierung).

## Nachtrag 41 – Handy-Menü, Kundenprofil
- Handy: das geöffnete Admin-Menü ist undurchsichtig (zuvor schien der Hintergrund durch).
- Kundenportal: Meldungen „Profil gespeichert.“ / „Anfrage gespeichert.“ (statt „lokal“).
- **Fehlerbehebung:** Nach Registrierung oder dem Festlegen eines neuen Passworts war der Kunde noch nicht serverseitig angemeldet, Profiländerungen wurden bis zur nächsten Anmeldung nicht in der Datenbank gespeichert. Jetzt meldet das Portal den Kunden dort sofort am Server an.

## Nachtrag 42 – Ablauf Anfrage → Projekt → Dokumente
- Anfrage: Knopf „Annehmen und Projekt anlegen“. Die angenommene Anfrage verschwindet aus „Anfragen“ (bleibt im Projekt verknüpft, ihre Dateien erscheinen dort) und der Projekt-Dialog öffnet sich sofort.
- Projekt-Dialog: Bereich „Dokumente zum Projekt“ mit „+ Kostenvoranschlag“, „+ Angebot“, „+ Rechnung“ (Kunde und Projekt vorbelegt) sowie Ansehen, Bearbeiten und „Per E-Mail senden“ je Dokument. Die Menüpunkte unter Verrechnung bleiben als Gesamtübersicht.

## Nachtrag 43 – Dokumente im Kundenportal je Projekt
- Kundenportal → Projekte: jede Projektkarte zeigt „Dokumente“ (Kostenvoranschlag, Angebot, Rechnungen, Zahlungserinnerungen, Mahnungen) mit Status und „Ansehen“. Das Menü „Dokumente“ bleibt als Gesamtliste.
- Server: Der Kunde erhält über die Schnittstelle nur noch versendete Angebote, nicht-Entwurf-Rechnungen und zugehörige Erinnerungen/Mahnungen – Entwürfe sind für Kunden nie abrufbar.
