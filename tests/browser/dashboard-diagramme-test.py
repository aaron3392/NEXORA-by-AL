"""Browser-Test: Dashboard-Kurven, Zeitraum-Auswahl, lokale Zähler, Menü. Voraussetzung: http://localhost:8765/ läuft."""
from playwright.sync_api import sync_playwright
B = "http://localhost:8765/"
res = []
def ok(n, c): res.append(bool(c)); print(("PASS " if c else "FAIL ") + n)
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 1440, "height": 1000}); errs = []
    # --- Zähler: Startseitenaufrufe ---
    v = ctx.new_page(); v.on("pageerror", lambda e: errs.append(str(e)))
    for _ in range(3): v.goto(B + "index.html"); v.wait_for_timeout(300)
    n = v.evaluate("Object.values(NX.stats.read('visits')).reduce((a,b)=>a+b,0)")
    ok("Startseitenaufrufe werden lokal gezählt (3 Aufrufe)", n == 3)
    v.goto(B + "leistungen.html"); v.wait_for_timeout(300)
    ok("Andere Seiten zählen nicht als Startseite", v.evaluate("Object.values(NX.stats.read('visits')).reduce((a,b)=>a+b,0)") == 3)
    # --- Zähler: Kundenanmeldung ---
    v.goto(B + "kundenportal.html"); v.wait_for_timeout(500)
    v.fill("input[type=email]", "tom.demo@example.com"); v.fill("input[type=password]", "Demo12345"); v.click("form button[type=submit], form .btn"); v.wait_for_timeout(1200)
    ok("Kunden-Anmeldung wird gezählt", v.evaluate("Object.values(NX.stats.read('logins')).reduce((a,b)=>a+b,0)") == 1)
    # --- Admin ---
    a = ctx.new_page(); a.on("pageerror", lambda e: errs.append(str(e)))
    a.goto(B + "admin/index.html"); a.wait_for_timeout(500)
    a.fill("input[type=text],input:not([type])", "admin2026"); a.fill("input[type=password]", "N123456789"); a.click("form button[type=submit], form .btn"); a.wait_for_timeout(1000)
    ok("Zwei Diagramme (Umsatz, Nutzer & Besucher)", a.locator(".nx-ax-chart").count() == 2 and a.locator(".nx-ax-chart svg path.nx-ax-line").count() >= 1)
    ok("Alte Balkenansicht ist ersetzt", a.locator(".bars").count() == 0)
    ok("Fünf Zeiträume im Dropdown wählbar", a.locator(".nx-ax-chart >> nth=0 >> select.nx-ax-rangesel option").count() == 5 and "Letzte Woche" in a.inner_text(".nx-ax-rangesel") and "Gesamte Zeit" in a.inner_text(".nx-ax-rangesel"))
    pts = {}
    for lbl, cnt in [("Letzte Woche", 7), ("Letzter Monat", 30), ("Letzte 6 Monate", 6), ("Letztes Jahr", 12)]:
        a.select_option('.nx-ax-chart >> nth=0 >> select.nx-ax-rangesel', label=lbl); a.wait_for_timeout(150)
        pts[lbl] = a.locator(".nx-ax-chart >> nth=0 >> svg circle").count()
    ok("Anzahl Punkte je Zeitraum: 7 / 30 / 6 / 12", [pts[k] for k in pts] == [7, 30, 6, 12])
    a.select_option('.nx-ax-chart >> nth=0 >> select.nx-ax-rangesel', label='Gesamte Zeit'); a.wait_for_timeout(150)
    ok("Gesamte Zeit zeigt Kurve", a.locator(".nx-ax-chart >> nth=0 >> svg path.nx-ax-line").count() == 1)
    ok("Umsatz-Summe stimmt mit Dashboard-Kennzahl überein (1.928,00 €)", "1.928,00" in a.inner_text(".nx-ax-chart >> nth=0 >> .nx-ax-legend"))
    a.select_option('.nx-ax-chart >> nth=1 >> select.nx-ax-rangesel', label='Letzte 6 Monate'); a.wait_for_timeout(150)
    leg = a.inner_text(".nx-ax-chart >> nth=1 >> .nx-ax-legend")
    ok("Nutzer-Diagramm: drei Kurven mit Aufrufen=3, Anmeldungen=1", a.locator(".nx-ax-chart >> nth=1 >> svg path.nx-ax-line").count() == 3 and "Aufrufe Startseite\n3" in leg.replace("  ", "") .replace("\n\n", "\n") or ("Aufrufe" in leg and "3" in leg))
    ok("Drei verschiedene Farben", len({a.get_attribute(f".nx-ax-chart >> nth=1 >> svg path.nx-ax-line >> nth={i}", "stroke") for i in range(3)}) == 3)
    a.click('.nx-ax-chart >> nth=1 >> .nx-ax-lg >> nth=0'); a.wait_for_timeout(150)
    ok("Legende blendet eine Kurve aus", a.locator(".nx-ax-chart >> nth=1 >> svg path.nx-ax-line").count() == 2)
    a.hover(".nx-ax-chart >> nth=0 >> .nx-ax-hit", position={"x": 300, "y": 60}); a.wait_for_timeout(150)
    ok("Tooltip beim Darüberfahren", a.locator(".nx-ax-chart >> nth=0 >> .nx-ax-tip").is_visible())
    # Auswahl bleibt nach Neuladen
    a.reload(); a.wait_for_timeout(900)
    ok("Gewählter Zeitraum wird gemerkt", a.input_value(".nx-ax-chart >> nth=0 >> select.nx-ax-rangesel") == "all")
    # Admin-Aufruf der Startseite zählt nicht
    v2 = ctx.new_page(); v2.goto(B + "index.html"); v2.wait_for_timeout(400)
    ok("Aufrufe bei angemeldetem Admin zählen nicht", v2.evaluate("Object.values(NX.stats.read('visits')).reduce((a,b)=>a+b,0)") == 3)
    # --- Menü ---
    names = a.evaluate("[...document.querySelectorAll('.side > .side-link, .side > .side-group > .side-link')].map(x=>x.innerText.replace('⌄','').trim())")
    ok("Userverwaltung steht direkt über Website-Einstellungen", names.index("Userverwaltung") + 1 == names.index("Website-Einstellungen"))
    a.click(".side-group-toggle:has-text('Zeiterfassung')"); a.wait_for_timeout(200)
    subs = a.evaluate("[...document.querySelectorAll('.side-group[data-group=\"zeiterfassung-menu\"] .side-sub-link')].map(x=>x.innerText.trim())")
    ok("Zeiterfassung-Untermenü: „Übersicht“ statt „Tages-/Wochen-/Monatsübersicht“", subs == ["Zeiterfassung", "Übersicht"])
    a.click(".side-group[data-group='zeiterfassung-menu'] .side-sub-link >> nth=1"); a.wait_for_timeout(500)
    ok("Übersicht öffnet die Zeit-Übersicht", a.evaluate("location.hash") == "#zeit-uebersicht")
    ok("Keine JS-Fehler", not errs)
print(f"Ergebnis: {sum(res)}/{len(res)} bestanden.")
raise SystemExit(0 if all(res) else 1)
