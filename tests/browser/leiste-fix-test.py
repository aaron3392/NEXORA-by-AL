# Menüleiste (Logo, Burger) scrollt mit der Seite nach oben weg: ganz oben sichtbar, nach dem Runterscrollen nicht mehr im Bild
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from admin_helper import login
from playwright.sync_api import sync_playwright
R=[]
def ok(n,c): R.append(bool(c)); print(("OK   " if c else "FAIL ")+n)
B="http://localhost:8765/"
PAGES=["index.html","leistungen.html","kontakt.html","anfrage.html","kundenportal.html","impressum.html"]
def top(pg): return pg.evaluate("(()=>{const h=document.querySelector('header');const r=h.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom),Math.round(scrollY)]})()")
def swipe(pg,dist):
    pg.mouse.move(195,400); pg.mouse.wheel(0,dist)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    ctx=b.new_context(viewport={'width':390,'height':760},device_scale_factor=3,is_mobile=True,has_touch=True,user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    def run(label):
        t0=top(pg)
        pos=[]
        for d in (400,900,1500):
            swipe(pg,d); pg.wait_for_timeout(500); pos.append(top(pg))
        moved=pos[-1][2]>300
        ok(f"{label}: Seite wurde gescrollt", moved)
        ok(f"{label}: Leiste oben sichtbar ({t0[0]} px)", 0<=t0[0]<=20 and t0[1]>40)
        ok(f"{label}: Leiste scrollt weg (nicht mehr im Bild)", all(x[1]<=0 for x in pos[-1:]) and all(x[0]<t0[0] for x in pos))
    for u in PAGES:
        pg.goto(B+u); pg.wait_for_timeout(600); run(u)
    pg.goto(B+"admin/index.html"); login(pg); pg.evaluate("location.hash='dashboard'"); pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('#cnt').style.minHeight='4000px'"); run("Admin")
    ok("Admin: Kopfleiste ist nicht fixiert", pg.evaluate("getComputedStyle(document.querySelector('#hdr')).position")=='absolute')
    ok("Html/Body: Body ist kein eigener Scroll-Container", pg.evaluate("getComputedStyle(document.body).overflowY")=='visible')
    pg.goto(B+"index.html"); pg.wait_for_timeout(500)
    ok("Start: Body ohne overflow (Viewport scrollt)", pg.evaluate("getComputedStyle(document.body).overflowX")=='visible' and pg.evaluate("document.scrollingElement===document.documentElement"))
    ok("Keine JS-Fehler", not errs)
    b.close()
print(f"LEISTE: {sum(R)}/{len(R)} bestanden"); sys.exit(0 if all(R) else 1)
