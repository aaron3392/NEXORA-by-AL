# NEXORA Buchhaltung – vollständig lokal im Browser

## Start ohne Node.js und ohne Backend
1. ZIP-Datei entpacken.
2. Den Ordner `NEXORA-by-AL` in Visual Studio Code öffnen.
3. Die Erweiterung **Live Server** starten (Rechtsklick auf `index.html` → „Open with Live Server“).
4. `admin/` im lokalen Browser öffnen und wie bisher anmelden.

Es ist **keine Node.js-Installation, kein Backend und kein lokaler API-Server** erforderlich. Die Buchhaltungsdaten werden im Browser unter `localStorage` gespeichert und bleiben bei erneutem Öffnen derselben Browserinstallation und derselben Website-Adresse erhalten. Browserdaten nicht löschen; regelmäßig über die vorhandene Backup-Funktion sichern.

## Lokale Funktionen
- Buchhaltungs-Dashboard und Auswertung aus vorhandenen Rechnungsdaten.
- Ausgaben manuell erfassen und zur Freigabe vormerken.
- Belege lokal im Browser zuordnen (Speichergrenzen des Browsers beachten).
- CSV-Auswertungen, Anlagenliste und Rücklagenparameter.
- Änderungsprotokoll.

## Bewusste Grenzen des reinen Browserbetriebs
- N26 kann ohne zugelassenen Open-Banking-Dienst und geschützten Serverzugang nicht live verbunden werden. Zahlungen werden deshalb manuell zugeordnet.
- Keine Hintergrund-Synchronisierung, wenn die Seite geschlossen ist.
- Keine KI-/OCR-Belegerkennung ohne externen KI-Dienst. Lokale manuelle Erfassung bleibt möglich.
- Browser-`localStorage` ist keine professionelle Datenbank und bietet keine echte Mehrbenutzer- oder Zugriffssicherheit. Backups regelmäßig exportieren.
- Steuerwerte sind vereinfachte Prognosen und keine verbindliche österreichische Steuerberatung.

**Wichtig:** Dieser Stand ist eine lokale Testversion. Für produktive Bankanbindung, sichere Benutzerverwaltung, echte KI und geräteübergreifende Datenhaltung wäre später eine Serverkomponente erforderlich. Diese wird jetzt ausdrücklich nicht mitgeliefert.
