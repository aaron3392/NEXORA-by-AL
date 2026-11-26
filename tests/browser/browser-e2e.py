"""Optionaler Browser-Test (Python + Playwright). Voraussetzung: Projektordner wird unter http://localhost:8765/ ausgeliefert
(z. B. Live Server auf Port 8765 oder `python -m http.server 8765`). Für den Betrieb der Website ist das NICHT nötig."""
import json, re
from playwright.sync_api import sync_playwright
B="http://localhost:8765/"
res=[]
def ok(n,c,extra=""): res.append((n,bool(c))); print(("PASS " if c else "FAIL ")+n+(" – "+str(extra) if extra and not c else ""))
with sync_playwright() as p:
    br=p.chromium.launch()
    def newpage(w=1440,h=900):
        ctx=br.new_context(viewport={"width":w,"height":h}); pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.on("requestfailed",lambda r:errs.append("REQFAIL "+r.url) if "formsubmit" not in r.url else None)
        pg.on("response",lambda r:errs.append(f"HTTP{r.status} {r.url}") if r.status>=400 and "/api/db" not in r.url else None)
        pg.route("**/formsubmit.co/**", lambda r: r.fulfill(status=200,content_type="application/json",body='{"success":"true"}'))
        return pg,errs
    # 1) Alle öffentlichen Seiten laden: Fehler, fehlende Bilder, horizontaler Scroll
    for w,h in ((1440,900),(390,844),(820,1100)):
        pg,errs=newpage(w,h)
        for u in ["index.html","leistungen.html","projekte.html","ueber-uns.html","kontakt.html","anfrage.html","kundenportal.html","impressum.html","datenschutz.html","agb.html"]:
            pg.goto(B+u); pg.wait_for_timeout(500)
            bad=pg.evaluate("[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
            hs=pg.evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
            ok(f"[{w}px] {u}: keine JS-/Ladefehler, Bilder ok, kein Quer-Scroll", not errs and not bad and not hs, (errs,bad,hs)); errs.clear()
    # 2) Navigation & mobiles Menü
    pg,errs=newpage(390,844); pg.goto(B+"index.html"); pg.wait_for_timeout(400)
    vis=lambda s: pg.evaluate(f"(()=>{{const e=document.querySelector('{s}');if(!e)return false;const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0}})()")
    ok("Mobil: Menü zunächst geschlossen", not vis(".nx-menu"))
    pg.click(".nx-burger"); pg.wait_for_timeout(300)
    ok("Mobil: Burger öffnet Menü", vis(".nx-menu") and pg.get_attribute(".nx-burger","aria-expanded")=="true")
    pg.screenshot(path="/tmp/nexora-e2e-mobile_menu.png")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    ok("Mobil: Escape schließt Menü", not vis(".nx-menu"))
    pg.click(".nx-burger"); pg.click(".nx-links a[href='leistungen.html']"); pg.wait_for_url("**/leistungen.html"); ok("Mobil: Menülink navigiert", True)
    pg,errs=newpage(1440,900); pg.goto(B+"index.html"); pg.wait_for_timeout(300)
    for href in ["leistungen.html","projekte.html","ueber-uns.html","kontakt.html","kundenportal.html","anfrage.html"]:
        ok(f"Desktop: Navigationslink {href} vorhanden", pg.query_selector(f".nx-bar a[href='{href}']") is not None)
    # 3) Projekte: Filter + Detail
    pg.goto(B+"projekte.html"); pg.wait_for_timeout(500)
    n0=len(pg.query_selector_all(".nx-proj")); chips=pg.query_selector_all(".nx-chip")
    ok("Projekte: Karten aus Admin-Daten + Filter", n0>=3 and len(chips)>=2, (n0,len(chips)))
    chips[1].click(); pg.wait_for_timeout(200); n1=len(pg.query_selector_all(".nx-proj")); ok("Projekte: Filter reduziert Karten", 0<n1<=n0, (n0,n1))
    pg.click("[data-proj]"); pg.wait_for_timeout(300); ok("Projekte: Detailansicht öffnet", pg.query_selector(".ov .md") is not None); pg.keyboard.press("Escape")
    pg.screenshot(path="/tmp/nexora-e2e-projekte.png")
    # 4) Konfigurator: alle 11 Leistungen
    pg.goto(B+"anfrage.html"); pg.wait_for_timeout(500)
    opts=pg.eval_on_selector_all("#svsel option","o=>o.map(x=>x.value).filter(Boolean)")
    ok("Konfigurator: 11 Leistungen wählbar", len(opts)==11, len(opts))
    allgood=True
    for o in opts:
        pg.select_option("#svsel",o); pg.wait_for_timeout(60)
        n=pg.eval_on_selector_all("#service-details [name^=detail_]","e=>e.length")
        if n<3: allgood=False; print("   zu wenige Detailfelder:",o,n)
    ok("Konfigurator: jede Leistung zeigt eigene Detailfragen", allgood)
    # Monatliches Paket
    pg.fill("#a1","Max"); pg.fill("#a2","Muster"); pg.fill("#a3","max@example.com"); pg.fill("#b1","Teststraße"); pg.fill("#b2","5"); pg.fill("#b3","1010"); pg.fill("#b4","Wien"); pg.select_option("#svsel",opts[3]); pg.fill("#a5","Portal Test"); pg.fill("#a6","Beschreibung"); pg.select_option("#a8",index=2); pg.select_option("#a9",index=2)
    pg.check("input[name=paymentModel][value=monatlich]"); pg.wait_for_timeout(150)
    ok("Konfigurator: Monatspaket-Auswahl wird eingeblendet", pg.is_visible("#monthly-options"))
    pg.click("button[type=submit]"); pg.wait_for_timeout(300)
    ok("Konfigurator: Pflicht-Datenschutz/Paket blockiert Absenden", "markierten" in pg.inner_text("#fs") or "Datenschutz" in pg.inner_text("#fs") or "Paket" in pg.inner_text("#fs"), pg.inner_text("#fs")[:80])
    pg.wait_for_timeout(800); pg.select_option("#monthlyPackage",index=1); pg.check("input[name=hostingModel][value=eigen]"); pg.check("#a11"); pg.click("button[type=submit]"); pg.wait_for_timeout(1000)
    inq=pg.evaluate("(()=>{for(const k of Object.keys(localStorage)){try{const d=JSON.parse(localStorage.getItem(k));if(d&&d.inquiries)return d.inquiries.slice(-1)[0]}catch(e){}}})()")
    ok("Konfigurator: Anfrage gespeichert (Leistung, Monatszahlung, Paket, Eigenhosting)", inq and inq["subject"]=="Portal Test" and inq["paymentModel"]=="monatlich" and inq["monthlyPackage"] and inq["hostingModel"]=="eigen", inq)
    ok("Konfigurator: Erfolgsmeldung", "Vielen Dank" in pg.inner_text("#fs"))
    # 5) Kundenportal Login
    pg.goto(B+"kundenportal.html"); pg.wait_for_timeout(500)
    pg.fill("input[type=email]","mia.demo@example.com"); pg.fill("input[type=password]","Demo12345"); pg.click("form button[type=submit], form .btn"); pg.wait_for_timeout(1500)
    txt=pg.inner_text("body")
    ok("Kundenportal: Demo-Anmeldung zeigt Portalbereich", "Anmelden" not in pg.inner_text("#root")[:60] or "Abmelden" in txt or "Rechnungen" in txt, txt[:100])
    pg.screenshot(path="/tmp/nexora-e2e-portal_eingeloggt.png")
    br.close()
bad=[n for n,c in res if not c]
print(f"\nE2E: {len(res)-len(bad)}/{len(res)} bestanden"); 
