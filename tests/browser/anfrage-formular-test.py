"""Browser-Test: Anfrageformular (Pflichtangaben, Kacheln, Adressübernahme) und weiße Dropdown-Schrift. Voraussetzung: http://localhost:8765/ läuft."""
import re
from playwright.sync_api import sync_playwright
B = "http://localhost:8765/"
res = []
def ok(n, c): res.append(bool(c)); print(("PASS " if c else "FAIL ") + n)
WHITE = "rgb(255, 255, 255)"
SEL = "()=>[...document.querySelectorAll('select')].map(s=>[getComputedStyle(s).color,...[...s.options].map(o=>getComputedStyle(o).color)])"
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 1440, "height": 1000}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B + "anfrage.html"); pg.wait_for_timeout(600)
    # Dropdown-Schrift
    cols = [c for row in pg.evaluate(SEL) for c in row]
    ok("Anfrage: alle Dropdowns und Optionen weiß", len(cols) > 10 and all(c == WHITE for c in cols))
    # Kacheln
    ok("Zahlungsmodell/Hosting: je zwei Kacheln, Radio-Kreis unsichtbar", pg.locator(".nx-tile").count() == 4 and all(float(pg.evaluate("e=>getComputedStyle(e).opacity", pg.locator('.nx-tile input').nth(i).element_handle())) == 0 for i in range(4)))
    ok("Monatliches Paket ist bei „Einmalig“ ausgeblendet", not pg.locator("#monthly-options").is_visible())
    pg.locator(".nx-tile:has-text('Monatliche Zahlung')").click(); pg.wait_for_timeout(200)
    ok("Klick auf die Kachel wählt aus und zeigt Paketauswahl", pg.is_checked("input[name=paymentModel][value=monatlich]") and pg.locator("#monthly-options").is_visible())
    sh = pg.evaluate("e=>getComputedStyle(e).boxShadow", pg.locator(".nx-tile input:checked + .nx-tile-body >> nth=0").element_handle())
    ok("Gewählte Kachel ist hervorgehoben", sh and sh != "none")
    pg.locator(".nx-tile:has-text('Eigenes Hosting')").click(); ok("Hosting-Kachel anklickbar", pg.is_checked("input[name=hostingModel][value=eigen]"))
    # Pflichtangaben
    pg.fill("#a1", "Eva"); pg.fill("#a2", "Test"); pg.fill("#a3", "eva@example.com")
    pg.select_option("#svsel", "Kundenportale"); pg.fill("#a5", "Portal"); pg.fill("#a6", "Beschreibung"); pg.select_option("#monthlyPackage", index=1)
    ok("Kein Info-Text unter „Monatliches Paket“ und unter „Weitere Informationen“", pg.locator("#package-info").count() == 0 and pg.inner_text("#fs").strip() == "")
    pg.check("#a11"); pg.click("button[type=submit]"); pg.wait_for_timeout(900)
    ok("Ohne Budgetrahmen und Zeitrahmen wird nicht abgesendet (Pflicht)", "Vielen Dank" not in pg.inner_text("#fs") and pg.evaluate("NX.db.inquiries.length") == 3 and pg.locator("#a8 ~ .err, .field:has(#a8) .err").first.inner_text() == "Pflichtfeld.")
    pg.select_option("#a8", "2.500–5.000 €"); pg.click("button[type=submit]"); pg.wait_for_timeout(900)
    ok("Ohne Zeitrahmen weiterhin nicht abgesendet", pg.evaluate("NX.db.inquiries.length") == 3)
    pg.select_option("#a9", "Innerhalb 1–3 Monate"); pg.select_option("#a13", "Telefon"); pg.click("button[type=submit]"); pg.wait_for_timeout(900)
    ok("Kontaktweg Telefon: Telefonnummer wird Pflicht (Stern sichtbar)", pg.evaluate("NX.db.inquiries.length") == 3 and pg.is_visible("#phone-req"))
    pg.select_option("#a13", "E-Mail"); pg.click("button[type=submit]"); pg.wait_for_timeout(3500)
    ok("Nur mit Pflichtangaben (ohne Adresse, Telefon, Firma, Termin) wird gespeichert", "Vielen Dank" in pg.inner_text("#fs") and pg.evaluate("NX.db.inquiries.length") == 4)
    ok("Erfolgsmeldung ohne technischen FormSubmit-Hinweis", "FormSubmit" not in pg.inner_text("#fs"))
    j = pg.evaluate("NX.db.inquiries[NX.db.inquiries.length-1]")
    ok("Gespeichert: Budget und Zeitrahmen, Adresse leer", j["budget"] == "2.500–5.000 €" and j["timeframe"] == "Innerhalb 1–3 Monate" and j["street"] == "")
    # zweite Anfrage mit allen freiwilligen Angaben
    pg.fill("#a1", "Eva"); pg.fill("#a2", "Test"); pg.fill("#a3", "eva@example.com")
    pg.select_option("#svsel", "Kundenportale"); pg.fill("#a5", "Portal"); pg.fill("#a6", "Beschreibung"); pg.locator(".nx-tile:has-text('Monatliche Zahlung')").click(); pg.select_option("#monthlyPackage", index=1)
    pg.select_option("#a8", "2.500–5.000 €"); pg.select_option("#a9", "Flexibel"); pg.check("#a11")
    pg.fill("#a12", "Test GmbH"); pg.fill("#b1", "Ringstraße"); pg.fill("#b2", "12"); pg.fill("#b3", "1010"); pg.fill("#b4", "Wien"); pg.fill("#b6", "ATU99999999"); pg.fill("#c1", "2027-03-01")
    pg.click("button[type=submit]"); pg.wait_for_timeout(3500)
    ok("Mit allen (auch freiwilligen) Angaben wird die Anfrage gespeichert", "Vielen Dank" in pg.inner_text("#fs") and pg.evaluate("NX.db.inquiries.length") == 5)
    i = pg.evaluate("NX.db.inquiries[NX.db.inquiries.length-1]")
    ok("Gespeichert: Firma, Adresse, UID, Land, Wunschtermin", i["company"] == "Test GmbH" and i["street"] == "Ringstraße" and i["no"] == "12" and i["zip"] == "1010" and i["city"] == "Wien" and i["country"] == "Österreich" and i["vatId"] == "ATU99999999" and i["wishDate"] == "2027-03-01")
    # Admin: Detailansicht und Übernahme
    a = ctx.new_page(); a.on("pageerror", lambda e: errs.append(str(e)))
    a.goto(B + "admin/index.html"); a.wait_for_timeout(500)
    a.fill("input[type=text],input:not([type])", "admin2026"); a.fill("input[type=password]", "N123456789"); a.click("form button[type=submit], form .btn"); a.wait_for_timeout(900)
    a.evaluate("location.hash='anfragen'"); a.wait_for_timeout(600); a.locator(f"#tb tr[data-id='{i['id']}']").click(); a.wait_for_timeout(500)
    t = a.inner_text(".ov")
    ok("Admin-Detail zeigt Firma, Rechnungsadresse und Wunschtermin", "Test GmbH" in t and "Ringstraße 12, 1010 Wien, Österreich" in t and "Wunschtermin" in t)
    a.click("[data-pr]"); a.wait_for_timeout(900)
    cu = a.evaluate("(()=>{const c=NX.db.customers.find(x=>x.email==='eva@example.com');return c&&{co:c.company,v:c.vatId,s:c.street,z:c.zip,ci:c.city,l:c.country}})()")
    ok("Projekt-Übernahme legt Kunde mit vollständiger Rechnungsadresse an", cu and cu["co"] == "Test GmbH" and cu["s"] == "Ringstraße" and cu["z"] == "1010" and cu["ci"] == "Wien" and cu["v"] == "ATU99999999")
    # Dropdowns im Admin
    bad = 0
    for v in ["anfragen", "projekte", "verrechnung-rechnungen", "verrechnung-angebote", "user", "zeit-eintraege", "einstellungen", "webseiteneinstellungen"]:
        a.evaluate(f"location.hash='{v}'"); a.wait_for_timeout(350)
        bad += sum(1 for row in a.evaluate(SEL) for c in row if c not in (WHITE, "rgb(248, 243, 255)"))
    ok("Admin: alle Dropdowns und Optionen hell", bad == 0)
    for u in ["kontakt.html", "kundenportal.html"]:
        pg.goto(B + u); pg.wait_for_timeout(400)
        ok(f"{u}: Dropdowns weiß", all(c == WHITE for row in pg.evaluate(SEL) for c in row))
    ok("Keine JS-Fehler", not errs)
print(f"Ergebnis: {sum(res)}/{len(res)} bestanden.")
raise SystemExit(0 if all(res) else 1)
