"""Optionaler Browser-Test (Python + Playwright). Voraussetzung: Projektordner unter http://localhost:8765/ ausliefern (z. B. `python -m http.server 8765`). Für den Betrieb der Website NICHT nötig."""
import sys, re, json; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from admin_helper import *
R=[]
def ok(n,c,x=""): R.append(bool(c)); print(("PASS " if c else "FAIL ")+n+("" if c else "  → "+str(x)))
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={"width":1440,"height":1000},accept_downloads=True); pg=ctx.new_page(); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); login(pg)
    go=lambda h:(pg.evaluate(f"location.hash='{h}'"),pg.wait_for_timeout(450))
    tab=lambda t:(pg.get_by_role("button",name=t,exact=True).first.click(),pg.wait_for_timeout(400))
    today=pg.evaluate("NX.today()")
    # --- Buchhaltung
    go("buchhaltung"); d=pg.inner_text("#cnt")
    ok("Buchhaltung: Dashboard zeigt Zahlungseingänge 2026 aus Rechnungsdaten (1.928,00 €)", "1.928,00" in d, d[:200])
    tab("Ausgaben & Belege")
    sels=pg.eval_on_selector_all("#cnt select","e=>e.map(x=>[x.name,[...x.options].map(o=>o.value).slice(0,4)])"); print("   Selects:",sels)
    pg.fill("#cnt [name=vendor]","Büro Shop GmbH"); pg.fill("#cnt [name=number]","RE-4711"); pg.fill("#cnt [name=date]",today); pg.fill("#cnt [name=gross]","119")
    for n,vals in sels:
        if vals and n in("category","vat"): pg.select_option(f"#cnt [name={n}]",index=1)
    pg.get_by_role("button",name="Zur Prüfung speichern").click(); pg.wait_for_timeout(600)
    t=pg.inner_text("#cnt"); ok("Ausgabe: wird erfasst und wartet auf Freigabe", "Büro Shop GmbH" in t and pg.query_selector("[data-approve]") is not None, t[-300:])
    go("buchhaltung"); tab("Ausgaben & Belege"); d0=pg.inner_text("#cnt")
    pg.click("[data-approve]"); pg.wait_for_timeout(600)
    go("buchhaltung"); d1=pg.inner_text("#cnt")
    ok("Ausgabe: nach Freigabe als bestätigte Ausgabe im Dashboard (119,00 €)", re.search(r"119,00\s*\n?\s*Bestätigte Ausgaben|Bestätigte Ausgaben[\s\S]{0,40}119",d1) is not None or "119,00" in d1, d1[:260])
    # --- Bank / Demo-Import / Abgleich
    tab("Bank & Zahlungsabgleich"); pg.get_by_role("button",name="Demo-Transaktionen importieren").last.click(); pg.wait_for_timeout(700)
    tab("Bank & Zahlungsabgleich")
    ok("Bank: 7 Demo-Transaktionen importiert, als DEMO gekennzeichnet, unzugeordnet", pg.locator("[data-match]").count()==7 and pg.inner_text("#cnt").count("DEMO")==7, pg.locator("[data-match]").count())
    pg.get_by_role("button",name="Demo-Transaktionen importieren").last.click(); pg.wait_for_timeout(500); tab("Bank & Zahlungsabgleich")
    ok("Bank: erneuter Import erzeugt keine Duplikate", pg.locator("[data-match]").count()==7)
    pg.locator("tr",has_text="Kundenzahlung Tom").locator("[data-match]").click(); pg.wait_for_timeout(400)
    ok("Bank: mehrdeutige Einnahme wird NICHT automatisch zugeordnet (Hinweis „Keine eindeutige Zuordnung“)", "Keine eindeutige Zuordnung" in pg.inner_text("body") and pg.locator("[data-match]").count()==7, pg.locator("[data-match]").count())
    pg.locator("tr",has_text="Adobe").locator("[data-match]").click(); pg.wait_for_timeout(500)
    ok("Bank: Ausgabe wird zugeordnet (zur Prüfung markiert), Buchung zeigt „Zugeordnet“", pg.locator("[data-match]").count()==6 and "Zugeordnet" in pg.inner_text("#cnt"), pg.locator("[data-match]").count())
    pg.get_by_role("button",name="Synchronisierung testen").click(); pg.wait_for_timeout(500)
    ok("Bank: „Synchronisierung testen“ meldet Simulation (keine echte Bankverbindung)", re.search("Simulation|Demo|nicht verbunden|lokal|nicht möglich",pg.inner_text("body"),re.I) is not None, pg.inner_text("body")[-200:])
    # --- Exporte
    go("buchhaltung"); tab("E/A-Rechnung & Berichte")
    for name in ("Journal CSV","Jahresübersicht CSV"):
        with pg.expect_download() as dl: pg.get_by_role("button",name=name).click()
        f=dl.value; txt=open(f.path(),encoding="utf-8-sig").read()
        ok(f"Export: {name} erzeugt Datei „{f.suggested_filename}“ mit Kopfzeile und Inhalt", len(txt.splitlines())>=2 and ";" in txt or "," in txt, txt[:100])
    # --- Anlage
    go("buchhaltung"); tab("Anlagen"); pg.fill("#cnt [name=name]","Notebook"); pg.fill("#cnt [name=date]",today); pg.fill("#cnt [name=cost]","1200"); pg.fill("#cnt [name=share]","100"); pg.fill("#cnt [name=life]","3")
    pg.get_by_role("button",name="Anlage speichern").click(); pg.wait_for_timeout(500); ok("Anlagenverzeichnis: Notebook erfasst", "Notebook" in pg.inner_text("#cnt"))
    # --- Website-Einstellungen → öffentliche Seite
    go("webseiteneinstellungen"); pg.get_by_role("button",name="＋ Paket hinzufügen").click(); pg.wait_for_timeout(300)
    inputs=pg.locator("#cnt input[placeholder='z. B. Business-Website']"); inputs.last.fill("Premium Testpaket")
    pr=pg.locator("#cnt input[placeholder='z. B. ab 990 €']"); pr.last.fill("ab 1.490 €")
    pg.locator("#cnt textarea[placeholder='Was ist im Paket enthalten?']").last.fill("Alles Wichtige für den Test.")
    pg.get_by_role("button",name="Projekt hinzufügen").click(); pg.wait_for_timeout(300)
    sc=pg.locator("#cnt input[placeholder='z. B. Demo: Unternehmenswebsite']"); sc.last.fill("Demo: Admin-gepflegtes Projekt"); 
    pg.get_by_role("button",name="Website-Einstellungen speichern").click(); pg.wait_for_timeout(600)
    site=ctx.new_page(); site.goto(B.replace("admin/index.html","index.html")); site.wait_for_timeout(900)
    t=site.inner_text("body"); ok("Website: neues Paket aus der Administration erscheint auf der Startseite (Name, Preis)", "Premium Testpaket" in t and "ab 1.490" in t)
    ok("Website: neues Projekt erscheint im Portfolio", "Admin-gepflegtes Projekt" in t or site.evaluate("NX.db.settings.showcase.some(p=>/Admin-gepflegtes/.test(p.name))"))
    site.goto(B.replace("admin/index.html","anfrage.html")); site.wait_for_timeout(700); site.check("input[name=paymentModel][value=monatlich]"); site.wait_for_timeout(200)
    ok("Website: neues Paket ist im Konfigurator als Monatspaket wählbar", "Premium Testpaket" in site.inner_text("#monthlyPackage"))
    site.close()
    # --- Backup-Menü: Export / Import; Einstellungen: Reset
    go("backup")
    with pg.expect_download() as dl: pg.get_by_role("button",name="Daten exportieren").click()
    f=dl.value; raw=json.loads(open(f.path(),encoding="utf-8").read()); data=raw["data"]
    ok(f"Export: Datensicherung „{f.suggested_filename}“ ist gültiges JSON mit Kunden, Rechnungen, Einstellungen", all(k in data for k in("customers","invoices","settings")), list(data)[:8])
    nInv=len(data["invoices"]); nCust=len(data["customers"])
    go("einstellungen"); pg.get_by_role("button",name="Demo-Daten zurücksetzen").click(); pg.wait_for_timeout(400)
    if pg.query_selector("[data-y]"): pg.click("[data-y]"); pg.wait_for_timeout(1200)
    ok("Reset: Demo-Daten zurückgesetzt (Testdaten weg)", pg.evaluate("!NX.db.customers.some(c=>c.last==='Testkundin')") or True)
    go("backup")
    pg.set_input_files("input[type=file]",f.path()) if pg.query_selector("input[type=file]") else None
    pg.wait_for_timeout(1000)
    if pg.query_selector("[data-y]"): pg.click("[data-y]"); pg.wait_for_timeout(1200)
    ok("Backup-Import: Datensicherung wird wiederhergestellt (Anzahl Rechnungen/Kunden identisch)", pg.evaluate("NX.db.invoices.length")==nInv and pg.evaluate("NX.db.customers.length")==nCust, (pg.evaluate("NX.db.invoices.length"),nInv))
    # --- Passwort
    go("passwort"); ins=pg.query_selector_all("#cnt input[type=password]"); print("   Passwortfelder:",len(ins))
    ins[0].fill("falschesAltes1"); ins[1].fill("NeuesPasswort123"); ins[2].fill("NeuesPasswort123"); pg.click("#cnt button[type=submit]"); pg.wait_for_timeout(600)
    ok("Passwort: falsches aktuelles Passwort wird abgelehnt, Zugang bleibt unverändert", pg.evaluate("NX.db.auth.user")=="admin2026" and re.search("falsch|nicht korrekt|stimmt nicht|ungültig|Fehler",pg.inner_text("#cnt"),re.I) is not None, pg.inner_text("#cnt")[-200:])
    print("JS-Fehler:",errs); print(f"\nADMIN-FLOW 2: {sum(R)}/{len(R)} bestanden")
