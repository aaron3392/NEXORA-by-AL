# NEXORA by AL – technischer Testbericht

Prüfdatum: 28.10.2026

## Durchgeführte Prüfungen

| Prüfung | Ergebnis | Anmerkung |
|---|---|---|
| JavaScript-Syntax aller sieben Anwendungsdateien | Bestanden | Alle Dateien wurden mit `node --check` geprüft. |
| JavaScript-Syntax des Kernmodul-Testskripts | Bestanden | `tests/core-smoke-test.js` |
| Automatisierte Kernmodul-Basistests | Bestanden | 8 von 8 Tests bestanden. |
| HTML-Dateien auf lokale Script-, CSS- und Bildverweise geprüft | Bestanden | 13 HTML-Dateien geprüft, keine fehlenden lokalen Verweise gefunden. |
| Doppelte HTML-IDs in den statischen HTML-Dateien | Bestanden | Keine doppelten IDs gefunden. |
| Lokaler Admin-Zugang im Seed | Bestanden | Benutzername `<Admin-Benutzer>`; Passwort wird als Hash für `<Passwort>` initialisiert. |
| FormSubmit-Standardempfänger im Seed | Bestanden | `<FormSubmit-Adresse>` |
| Userverwaltung: geschütztes Administratorkonto | Codeprüfung bestanden | Das Systemkonto ist eine geschützte Anzeigezeile und wird nicht als Kundenkonto gelöscht. |
| Backup-Export und -Import | Implementierung und Syntax geprüft | Vollständiger Datei-Download/Import wurde im Browser nicht end-to-end ausgeführt. |
| Browser-End-to-End-Test | Nicht durchgeführt | Die Browser-Testumgebung blockierte Navigation zu lokalen `localhost`- und `file://`-Adressen. |
| Tatsächlicher FormSubmit-Versand | Nicht durchgeführt | Erfordert Internetzugriff und gegebenenfalls Freischaltung der Empfängeradresse bei FormSubmit. |
| Darstellung auf realen Mobilgeräten | Nicht durchgeführt | Responsive CSS-Regeln sind vorhanden; physische Geräte wurden nicht getestet. |
| Rechtliche/steuerliche Konformität | Nicht geprüft | Muss vor produktivem Einsatz fachkundig geprüft werden. |

## Änderungen in dieser Überarbeitung

- Rechnungs-/Angebots-/Mahnungsdokumente optisch näher an die NEXORA-Markenwelt angepasst: ruhigeres Layout, goldene Trennlinien, hervorgehobener Wortmarkenbereich, bessere mobile Tabellenansicht und gesonderte Druckregeln.
- Individuelle Mahngebühren können beim Erstellen jeder Zahlungserinnerung bzw. Mahnung eingegeben werden. Der eingegebene Betrag wird in der Dokumentvorschau, in der Dokumentliste und in der E-Mail-Vorbereitung verwendet; die voreingestellte Gebühr aus den Einstellungen bleibt der Vorschlag.
- Die Positionen und Einzelpreise der zuletzt gespeicherten Rechnung werden als Vorlage gespeichert und beim Erstellen einer neuen Rechnung vorausgefüllt. Preise bleiben dabei in Cent gespeichert.

- JavaScript-Module strukturiert neu formatiert, ohne sie in ein Framework umzubauen.
- CSS-Regeln formatiert und responsive Layout-, Fokus-, Tabellen- und Druckregeln ergänzt.
- HTML-Seiten lesbarer formatiert.
- Administratorkonto in der Userverwaltung als geschütztes Systemkonto sichtbar gemacht.
- Benutzerrolle und Statusänderungen werden im lokalen Aktivitätsprotokoll spezifischer erfasst.
- Kundenportal prüft den Status bei Einstieg und Navigation erneut; inaktive/gesperrte Konten gelangen nicht in die Portalansicht.
- Export und Import für lokale JSON-Backups in den Einstellungen ergänzt.
- Optionales Kernmodul-Testskript unter `tests/core-smoke-test.js` ergänzt.

## Zusätzliche Funktionsprüfungen dieser Änderung

- JavaScript-Syntax von `billing.js` und `core.js` erneut geprüft.
- Kernmodul-Basistests erneut ausgeführt (8/8 bestanden).
- Die neue Formularinteraktion zur individuellen Mahngebühr und das automatische Vorausfüllen neuer Rechnungen wurden per Codeprüfung kontrolliert; ein vollständiger Browser-End-to-End-Test ist weiterhin offen.

## Bekannte Einschränkungen

- Die Anwendung bleibt eine lokale Frontend-Demo. Admin-Login, Rollen, Sitzungen und Kundentrennung sind keine produktionssichere Sicherheitsgrenze.
- `localStorage` ist an Browser und Ursprung gebunden. Daten werden nicht zwischen Geräten synchronisiert und können durch Browserfunktionen gelöscht oder vom lokalen Nutzer verändert werden.
- FormSubmit ist ein externer Dienst; Versand und Zustellung wurden nicht verifiziert.
- Die vollständige Interaktion aller Schaltflächen, Formulare, Dokumente, Abrechnungsabläufe und der Kundentrennung muss in einem normalen Browser manuell abgenommen werden.
- Unternehmensdaten und rechtliche Platzhalter müssen vor einem echten Betrieb ergänzt und geprüft werden.

## Manuelle Abnahmeliste

1. Admin-Login mit korrekten und falschen Zugangsdaten.
2. Logout und erneute Anmeldung.
3. Benutzer anlegen, bearbeiten, filtern und nach Neuladen wiederfinden.
4. Kundenkonto deaktivieren bzw. sperren und Portal-Login erneut prüfen.
5. Rolle ändern und Zugriff auf vorgesehene Ansichten kontrollieren.
6. Angebot und Rechnung erstellen, Positionen/Rabatte/USt prüfen.
7. Teilzahlung erfassen und offenen Betrag prüfen.
8. Zahlungserinnerung/Mahnung erzeugen und Druckvorschau prüfen.
9. Zeiteintrag anlegen und Abrechnungsstatus prüfen.
10. Kundenportal mit mehreren Demo-Konten und unterschiedlichen Zuordnungen testen.
11. Einstellungen speichern, neu laden und Werte kontrollieren.
12. Backup exportieren, in einem Teststand importieren und Daten kontrollieren.
13. FormSubmit erst nach eigener Freischaltung mit einer unkritischen Testnachricht prüfen.
14. Layout bei Desktop-, Tablet- und Smartphone-Breite prüfen.


## Ergänzende Änderung: Auftragsnummern

- Projekte erhalten eine eindeutige Auftragsnummer im Format `AUF-JJJJ-0001`.
- Zugehörige Rechnungen zeigen zusätzlich zur Rechnungsnummer dieselbe Auftragsnummer.
- Beim Umwandeln eines Angebots in eine Rechnung wird die Auftragsnummer übernommen.
- Rechnungen ohne Projekt erhalten eine eigene Auftragsnummer.
- Die vorhandenen 8 Kernmodultests wurden erneut ausgeführt: 8/8 bestanden.
- Alle JavaScript-Dateien und der Testskript wurden mit `node --check` auf Syntax geprüft.
- Ein vollständiger visueller Browser-Test wurde in diesem Durchlauf nicht durchgeführt.

## Ergänzung: Einstellungen für Pakete, Hosting und Projektbeispiele

- Die bisherigen pipe-getrennten Textbereiche wurden durch strukturierte Eintragskarten ersetzt.
- Pakete, Hosting-Angebote und Projektbeispiele lassen sich einzeln hinzufügen und entfernen.
- Vorhandene Einträge werden aus der bisherigen lokalen Datenstruktur geladen und beim Speichern wieder in derselben Datenstruktur abgelegt.
- JavaScript-Syntaxprüfung für `assets/js/admin.js` bestanden.
- Kernmodultests: 8/8 bestanden.
- Einschränkung: Ein vollständiger interaktiver Browser-Test dieser Einstellungsoberfläche wurde in dieser Umgebung nicht durchgeführt.

## Ergänzende Prüfung – Admin-Navigation und Website-Einstellungen

- JavaScript-Syntaxprüfung von `assets/js/admin.js`: bestanden.
- Bestehende Kernmodultests: 8/8 bestanden.
- Admin-Navigation um „Verrechnung“, „Zeiterfassung“ und „Website-Einstellungen“ erweitert.
- Pakete, Hosting und Beispielprojekte aus den allgemeinen Einstellungen in eine eigene Ansicht verschoben; Speichern schreibt weiterhin in `NX.db.settings` und protokolliert die Änderung über `NX.log`.
- Vollständiger visueller Browser-Test der neuen Navigation wurde nicht durchgeführt.

## Ergänzende Änderungen (28.10.2026)
- Verrechnung und Zeiterfassung akzeptieren nun die bestehende, gültige Admin-Demo-Sitzung; beim Wechsel aus der Administration ist keine zweite Anmeldung nötig.
- In den Modulen wird bei einer übernommenen Admin-Sitzung statt „Abmelden“ die Aktion „Zur Administration“ angeboten, damit der Admin-Arbeitsablauf nicht versehentlich beendet wird.
- Die allgemeinen Einstellungen verwenden jetzt die volle verfügbare Inhaltsbreite und gliedern die Eingabefelder in responsive Spalten.
- Erneut ausgeführt: JavaScript-Syntaxprüfung für `core.js` und `admin.js`; 8/8 Kernmodultests bestanden.
- Nicht durchgeführt: vollständiger visueller Browser-Test und FormSubmit-Liveversand.

## Änderung 03.11.2026 – Einheitliche Passwort-Sichtbarkeit

- Die Textschaltfläche „Anzeigen“ wurde durch ein dezentes Augen-Symbol ersetzt.
- Das Symbol wechselt beim Anzeigen des Passworts zu einem durchgestrichenen Auge.
- Die Funktion wird zentral auf Admin-, Verrechnungs-, Zeiterfassungs- und Kundenportal-Seiten angewendet, einschließlich dynamisch erzeugter Formulare und Dialoge.
- Tastaturfokus und ARIA-Beschriftungen sind vorhanden; die native Edge-Passwort-Reveal-Schaltfläche wird ausgeblendet, um doppelte Symbole zu vermeiden.
- JavaScript-Syntaxprüfung für `core.js` und `portal.js` erfolgreich.
- Kernmodultests: 8/8 bestanden.
- Ein vollständiger visueller Browser-Test wurde in dieser Ausführung nicht durchgeführt.


## Änderung 04.11.2026 – Passwortänderung und Kontolöschung im Kundenportal

- Im Bereich „Mein Profil“ gibt es nun einen eigenen Bereich zum Ändern des Kundenpassworts. Das bisherige Passwort wird geprüft; das neue Passwort muss mindestens 8 Zeichen haben, zweimal identisch eingegeben werden und darf nicht dem bisherigen entsprechen.
- Passwortfelder verwenden die zentrale Augen-Schaltfläche.
- Kunden können die Löschung ihres lokalen Demo-Kontos selbst anfordern und ausführen. Dafür sind das aktuelle Passwort sowie die Texteingabe „LÖSCHEN“ und eine zusätzliche Bestätigung erforderlich.
- Bei der Kontolöschung werden der Kunden-Login-Datensatz und der lokale Portal-Chat entfernt; die Kundensitzung wird beendet. Bereits angelegte Geschäfts-/Buchhaltungsunterlagen bleiben im Adminbereich erhalten und werden nicht automatisch vernichtet.
- Die Anwendung bleibt eine lokale Frontend-Demo ohne Backend. Das ist keine produktionssichere Kontoverwaltung und keine vollständige datenschutzrechtliche Löschfunktion für einen echten Produktivbetrieb.
- `node --check` für `assets/js/portal.js`: bestanden.
- Kernmodul-Basistests: 8/8 bestanden.
- Visueller Browser-End-to-End-Test: nicht durchgeführt.


## Änderung 04.11.2026 – 14-tägiger, verifizierter Löschablauf im Kundenportal

- Der bisherige Sofort-Löschablauf wurde ersetzt. Kunden durchlaufen nun drei Dialogschritte: aktuelles Passwort prüfen, sechsstelligen Einmalcode bestätigen und anschließend ausdrücklich „Jetzt löschen“ auswählen.
- Im lokalen Demo-Modus wird der Code nur zur Demonstration im Dialog angezeigt; es wird ausdrücklich keine E-Mail versendet. Der Demo-Code läuft nach 10 Minuten ab und ist auf fünf Versuche begrenzt.
- Mit konfigurierter `window.NEXORA_API_BASE` werden die API-Endpunkte für Code-Anforderung, Code-Prüfung und Löschvormerkung angesprochen. Eine echte E-Mail-Zustellung setzt voraus, dass das Backend die Nachricht erfolgreich versendet und dies bestätigt.
- Nach der Bestätigung wird das Konto 14 Tage vorgemerkt und der Login beendet. Innerhalb der Frist kann der Kunde sich mit E-Mail und Passwort anmelden und die Löschung widerrufen. Abgelaufene lokale Vormerkungen werden beim nächsten Portalstart aus dem lokalen Kundenbestand entfernt.
- Angebote, Rechnungen und Geschäftsunterlagen bleiben erhalten.
- README enthält den API-Vertrag und die erforderlichen Backend-Sicherheitsmaßnahmen.
- `node --check assets/js/portal.js`: bestanden.
- Kernmodul- und zusätzliche statische Portaltests: 11/11 bestanden.
- Vollständiger Browser-End-to-End-Test sowie echter E-Mail-Versand: nicht durchgeführt; im lokalen Demo-Modus technisch nicht verfügbar.

## FormSubmit-Kontolöschung
- Der Löschcode wird per FormSubmit-AJAX an die im Kundenkonto hinterlegte E-Mail-Adresse gesendet.
- Nach erfolgreicher Codeprüfung wird die Bestätigungs-E-Mail mit dem 14-Tage-Wiederherstellungsfenster per FormSubmit versendet.
- Live-Zustellung und ggf. erforderliche Empfängerfreischaltung wurden nicht getestet.
- OTP-Prüfung ohne Backend ist nur Demo-Schutz, keine produktionssichere Sicherheitskontrolle.


## Einheitlicher E-Mail-Versand über FormSubmit
- Allgemeine E-Mail-Vorschau leitet ausgehende Nachrichten über `NX.formsubmit` direkt an die eingegebene Empfängeradresse.
- Kontakt- und Anfrageformulare verwenden weiterhin die konfigurierte FormSubmit-Zieladresse.
- Kontolöschcode und Löschbestätigung verwenden ebenfalls die zentrale `NX.formsubmit`-Funktion.
- Ein externes Backend muss dieselbe Vorgabe einhalten; Backend-Mailversand wurde in diesem Frontend-Projekt nicht implementiert oder live geprüft.
- `mailto:`-Ausweichversand wurde aus der E-Mail-Vorschau entfernt.

## Vollständige technische Prüfung und Fehlerkorrekturen (04.11.2026)

### Durchgeführte Prüfungen
- Alle JavaScript-Dateien und Testskripte mit `node --check` geprüft: erfolgreich.
- Kernmodul-Tests: 11/11 bestanden.
- Projektkonfigurator-Integrationstests: 10/10 bestanden.
- Alle 11 angebotenen Dienstleistungen besitzen eine eigene Gruppe mit Detailfragen.
- Alle lokalen `href`-/`src`-Verweise in HTML-Dateien geprüft: keine fehlenden lokalen Dateien gefunden.
- E-Mail-Versandpfade geprüft: zentrale FormSubmit-Funktion in `core.js`; die drei optionalen Kontolösch-API-Aufrufe werden nur bei konfigurierter Backend-Basis verwendet.

### Behobene Fehler
- Paket-Auswahl: Wenn in den Admin-Einstellungen leere Paketzeilen vorhanden waren, konnte die Auswahl auf ein falsches Paket zeigen. Die Dropdown-Werte verwenden jetzt den Originalindex der Paketliste.
- Zahlungsmodell: Beim Wechsel von monatlicher auf einmalige Zahlung wird die Paketauswahl jetzt zurückgesetzt und nicht mehr versehentlich mitgesendet.
- Projekt-/Rechnungsübergabe: Die Paketbeschreibung wird nun zusätzlich zu Preis, Support und Hosting in die Projektakte übernommen und im Rechnungsdialog angezeigt.

### Grenzen dieser Prüfung
- Ein interaktiver Browser-End-to-End-Test konnte in dieser Laufzeitumgebung nicht abgeschlossen werden, da Chromium beim Start hängen blieb. Die Formulare wurden daher nicht visuell durchgeklickt.
- FormSubmit-Liveversand, Empfängerfreischaltung und tatsächliche E-Mail-Zustellung wurden nicht getestet.
- Die monatliche Rechnungsstellung ist weiterhin keine automatische wiederkehrende Abrechnung. Die Projekt- und Paketdaten werden angezeigt/übernommen; für automatische Monatsrechnungen und Zahlungsläufe ist ein Backend mit Scheduler und geeigneter Zahlungs-/Abrechnungslogik erforderlich.
- Die Anwendung bleibt eine lokale Frontend-Demo und ist nicht produktionssicher.


## Ergänzung 04.11.2026 – lokale Vertragsverwaltung

- Neue Admin-Unterseite **Verrechnung → Monatliche Verträge** ergänzt.
- Verträge speichern Kunde, optionales Projekt, Paketname, Netto-Monatspreis, Beschreibung, USt-Satz, nächsten Abrechnungstermin und Status. Aus einem monatlich zahlenden Projekt lässt sich direkt ein Vertrag anlegen.
- Fällige Monatsrechnungen können manuell als Entwurf erzeugt werden. Die Abrechnungsperiode wird auf der Rechnung und in der E-Mail-Vorbereitung angezeigt.
- Duplikatschutz je Vertrag und Abrechnungsmonat; nächster Termin wird bei Rechnungserstellung monatsweise fortgeschrieben.
- Verträge können pausiert und wieder aktiviert werden.
- Alle JavaScript-Dateien: Syntaxprüfung erfolgreich.
- Kernmodultests: 11/11; Projektkonfigurator: 10/10; lokale Regressionstests: 13/13 bestanden.
- Ein interaktiver Chromium-Test wurde versucht, aber die Laufzeitumgebung blockierte den Browserzugriff (`ERR_BLOCKED_BY_ADMINISTRATOR`). Deshalb keine Behauptung eines vollständigen visuellen Browser-End-to-End-Tests.
- Keine automatische Hintergrundabrechnung, Zahlungseinziehung oder echte Synchronisierung ohne Backend.

## Ergänzung: NEXORA-Rechnungsdesign (04.11.2026)
- Dokumentkopf verwendet jetzt das offizielle helle NEXORA-Logo `assets/images/nexora-logo-web.png` statt einer reinen Text-Wortmarke.
- Rechnungen, Angebote und Mahnungen verwenden ein konsistentes Markenlayout in Violett, Schwarz und Weiß; goldene Akzente wurden entfernt.
- Tabellenkopf, Empfängerblock, Summenbereich und Trennlinien greifen die violette Markenfarbe auf.
- Druckregeln erhalten die violetten Flächen und den dunklen Tabellenkopf soweit die Druckeinstellungen des Browsers Hintergrundgrafiken/-farben zulassen.
- Logo-Pfad nutzt `data-base` und funktioniert damit sowohl in der Admin-/Finanz-Unterseite als auch auf Root-Seiten.
- `node --check assets/js/core.js`: bestanden.
- Kernmodultests: 11/11; Projektkonfigurator: 10/10; lokale Funktionen: 13/13 bestanden.
- Browser-Druckvorschau und tatsächlicher PDF-Ausdruck wurden nicht visuell end-to-end geprüft.

## Rechnungsdesign – Modernisierung (04.11.2026)
- Dokumentkopf mit Logo, klarer Typografie und kompakter Metadatenfläche überarbeitet.
- Empfängeradresse als eigener Abschnitt mit violetter Akzentlinie strukturiert.
- Positionstabelle, Zwischensummen und Gesamtbetrag visuell stärker gegliedert.
- Fußbereich mit Zahlungsinformationen und Abschlusszeile ergänzt.
- Mobile- und Druckdarstellung angepasst.
- Automatisierte Tests: 44/44 bestanden (11 Core, 10 Projektkonfigurator, 13 lokale Funktionen, 10 Rechnungsdesign).
- Hinweis: Druckfarben hängen zusätzlich von den Druckeinstellungen des Browsers ab; eine vollständige visuelle Prüfung in jedem Browser/PDF-Drucker ist nicht Bestandteil der automatisierten Tests.

## Rechnungsbeträge und offener Saldo – Vereinheitlichung (04.11.2026)
- Gemeinsame Dokumentausgabe aller Rechnungsarten überarbeitet; dadurch gilt die Änderung für Vorauszahlungs- und Schlussrechnungen sowie für Monatsrechnungen.
- Gesamter Rechnungsbetrag, bereits bezahlte/angerechnete Beträge und noch offener Rechnungsbetrag werden nun klar getrennt ausgewiesen.
- Der offene Rechnungsbetrag ist der violett hervorgehobene Hauptwert; bei vollständig bezahlten Rechnungen erscheint ein entsprechender Statushinweis.
- Angebote/Kostenvoranschläge behalten ihre normale Gesamtbetragdarstellung; Zahlungserinnerungen behalten ihren eigenen „Zu zahlen“-Bereich.
- Mobile- und Drucklayout für den neuen Saldenblock ergänzt.
- Neue Regressionstests für die Rechnungsdarstellung: 5/5 bestanden. Gesamte automatisierte Testsuite: 49/49 bestanden.
- Die Betragsberechnung nutzt weiterhin die bestehenden centgenauen Berechnungsfunktionen; diese Layoutänderung verändert keine gespeicherten Rechnungsdaten.


## Korrektur: vollständig lokaler Browserbetrieb
Backend-Verzeichnis und Node.js-Server wurden entfernt. Das Buchhaltungsmodul speichert ausschließlich im Browser-localStorage. N26 bleibt Mock-Simulation; Live-Banking, KI/OCR und Hintergrund-Synchronisierung sind nicht aktiv.

## NEXORA-Startseite und Administration – neues Neon-Layout (10.11.2026)
- Öffentlicher Header verwendet nun ausschließlich das originale N-Monogramm aus dem bereitgestellten Hauptlogo; Navigation und CTA bleiben erhalten.
- Das Original-Hauptlogo wird unverändert und groß im Hero-Bereich angezeigt.
- Startseiten-Hero mit violettem Orbit, Lichtwellen, digitalem Horizont, zwei CTAs und fünf verlinkten Leistungskacheln neu aufgebaut.
- Admin-Header nutzt dasselbe N-Monogramm; Admin-Navigation, Login, Seitenleiste, Karten und Formulare wurden auf eine dunkle violett-schwarze Markenoptik abgestimmt.
- Responsive Anpassungen für Tablet und Smartphone; `prefers-reduced-motion` bleibt berücksichtigt.
- Neues Monogramm wurde direkt aus dem vom Nutzer bereitgestellten Hauptlogo ausgeschnitten; keine KI-Neuzeichnung des Markenzeichens.
- Homepage-Redesign-Regressionstests: 8/8 bestanden.
- Vorhandene Tests: Buchhaltung 17/17, Core 11/11, Rechnungs-Saldo 5/5, Rechnungsbranding 10/10, lokale Funktionen 13/13, Projektkonfigurator 10/10.
- Gesamtergebnis: 74/74 automatisierte Tests bestanden; `node --check` für `core.js` erfolgreich.
- Hinweis: Keine produktiven Schnittstellen aktiviert; die Anwendung bleibt lokal über Live Server nutzbar.


## Nachbesserung Startseite und Gesamt-Layout (10.11.2026)

- Rote Markierung umgesetzt: fünf Hero-Leistungskacheln und Scroll-Doppelpfeil vollständig aus dem Startseiten-Hero entfernt.
- Vollständiges Hauptlogo im Hero mit transparent freigestelltem dunklem Hintergrund eingebunden; Originalgrafik bleibt inhaltlich unverändert.
- Header bleibt beim N-Monogramm; Navigation als abgerundete Neon-Glass-Leiste.
- Öffentliche Unterseiten und Administration erhalten ein gemeinsames responsives NEXORA-Neon-Designsystem für Navigation, Karten, Formulare, Tabellen und Login.
- Visuelle Browserprüfung muss lokal noch erfolgen; automatisierte Struktur- und Funktionsprüfungen wurden ausgeführt.


## Startseite – präzise Annäherung an die freigegebene Designgrafik
- Eigenständige SVG-Hintergrundgrafik mit violettem Horizont, digitalem Mesh, Lichtbogen und Partikelstruktur ergänzt.
- Hero-Logo und Header-Monogramm aus den Originaldateien eng auf den sichtbaren Alphabereich zugeschnitten, damit keine großen transparenten Bildränder wie ein schwarzer Kasten wirken.
- Hero neu ausgerichtet: vollständiges Hauptlogo, Überschrift, Beschreibung und zwei große CTAs; keine Leistungskacheln und kein Scrollpfeil.
- Administration bewusst unverändert gelassen, da sie laut Rückmeldung bereits passt.
- Browser-Rendering wurde nicht zuverlässig automatisiert; statische Prüfungen und vorhandene Tests wurden ausgeführt.


Gesamtergebnis nach der finalen Homepage-Korrektur: 79 automatisierte Prüfungen über alle vorhandenen Testsuiten. Die Admin-Oberfläche wurde in dieser Korrekturrunde nicht verändert.

## Öffentliches Website-Layout – vollständige Modernisierung
- Öffentliche Inhaltsbereiche, Leistungs-/Projektkarten, Seitenköpfe, Formulare und Footer wurden mit einem konsistenten dunklen Glass-/Neon-Designsystem überarbeitet.
- Responsive Regeln für öffentliche Unterseiten ergänzt.
- Alle neuen Regeln sind auf `body:not(.admin-app)` begrenzt; die Administration wird durch diese Ergänzung nicht verändert.
- Zusätzliche Layout-Prüfungen: 6/6 bestanden.

## Referenzgrafik – Feinschliff der Startseiten-Komposition (10.11.2026)
- Die digitale Planetenoberfläche wurde in der SVG-Hintergrundgrafik deutlicher ausgearbeitet: stilisierte Kontinentflächen, violette Konturen, Lichtpunkte sowie zusätzliche Längen-/Breitengradlinien.
- Der Horizont wurde in der Komposition angehoben und die seitlichen Mesh-Wellen wurden dichter gestaltet, damit die Startseite der freigegebenen Referenzgrafik näherkommt.
- Desktop-Komposition nach oben verschoben; Hauptlogo, Überschrift und Buttons erhielten fein abgestimmte Größen und Abstände.
- Mobile-Layout bleibt separat responsiv. Die Administration wurde nicht verändert; die neuen CSS-Regeln gelten ausschließlich für `body:not(.admin-app)`.
- Leistungskacheln und Doppelpfeil sind nicht im HTML-Hero enthalten.
- Neue Referenz-Kompositionsprüfungen: 8/8 bestanden. Alle vorhandenen Testsuiten zusammen: 93/93 bestanden.
- Hinweis: Ein vollständiger visueller Browser-Test war in der Build-Umgebung nicht zuverlässig ausführbar. Die neue ZIP-Datei sollte daher mit Live Server im Zielbrowser geprüft werden.

## Startseite – direkte Umsetzung der freigegebenen Referenzkomposition (10.11.2026)
- Die bisherige abstrakte SVG-Komposition wurde auf Desktop durch einen lokal eingebundenen, zugeschnittenen Bildausschnitt der vom Nutzer freigegebenen Referenzgrafik ersetzt.
- Der rote Markierungsbereich und die fünf darin markierten Leistungskacheln samt Doppelpfeil sind nicht enthalten; der Bildausschnitt endet vor diesem Bereich.
- Die sichtbare Desktop-Navigation sowie beide CTAs besitzen transparente, echte HTML-Linkflächen mit den vorhandenen lokalen Navigationszielen.
- Auf schmalen Displays bleibt die eigenständige responsive HTML-Navigation und Hero-Darstellung aktiv; die Desktop-Referenzgrafik wird dort ausgeblendet.
- Die öffentliche Website behält das dunkle violette Designsystem; Admin-Dateien und Admin-Styles wurden in dieser Runde nicht verändert.
- Neue Referenzbild-Prüfungen: 8/8 bestanden. Gesamte automatisierte Testsuite: 101/101 bestanden.
- Hinweis zur Umsetzung: Die Desktop-Hero-Komposition nutzt bewusst die freigegebene Referenzgrafik als Bildkomposition mit interaktiven Linkflächen darüber. Das ist eine visuelle Annäherung an die konkrete Grafik und keine pixelweise neu programmierte, einzeln gerenderte Illustration.
