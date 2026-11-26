# Menüleiste scrollt mit weg; Nach-oben-Button erscheint erst nach dem Hinunterscrollen und bringt zurück nach oben
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from admin_helper import login
from playwright.sync_api import sync_playwright
R=[]
def ok(n,c): R.append(bool(c)); print(("OK   " if c else "FAIL ")+n)
B="http://localhost:8765/"
PAGES=["index.html","leistungen.html","projekte.html","ueber-uns.html","kontakt.html","anfrage.html","kundenportal.html","impressum.html","datenschutz.html","agb.html"]
def state(pg):
    return pg.evaluate("""()=>{const u=document.querySelector('.nx-ax-top'),h=document.querySelector('header'),r=u?u.getBoundingClientRect():null,hr=h?h.getBoundingClientRect():null;
      return {n:document.querySelectorAll('.nx-ax-top').length,on:!!u&&u.classList.contains('on'),op:u?+getComputedStyle(u).opacity:-1,y:Math.round(scrollY),
      right:r?Math.round(innerWidth-r.right):-1,bottom:r?Math.round(innerHeight-r.bottom):-1,hdrTop:hr?Math.round(hr.top):-99,hdrPos:h?getComputedStyle(h).position:''}}""")
def flow(pg,label):
    s0=state(pg)
    ok(f"{label}: genau ein Button, oben nicht sichtbar", s0['n']==1 and not s0['on'] and s0['op']==0)
    pg.evaluate("window.scrollTo(0,1200)"); pg.wait_for_timeout(500)
    s1=state(pg)
    ok(f"{label}: nach Scrollen sichtbar, rechts unten", s1['on'] and s1['op']>0.9 and s1['right']<=40 and s1['bottom']<=120)
    ok(f"{label}: Menüleiste scrollt mit der Seite weg (nicht fixiert)", s1['hdrPos']=='absolute' and s1['hdrTop']<0)
    pg.click('.nx-ax-top'); pg.wait_for_timeout(1500)
    s2=state(pg)
    ok(f"{label}: Klick bringt ganz nach oben, Button verschwindet", s2['y']==0 and not s2['on'])
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for (w,h,n) in [(390,700,'Handy'),(820,1000,'Tablet'),(1280,700,'PC')]:
        pg=b.new_page(viewport={'width':w,'height':h}); pg.on("pageerror",lambda e:errs.append(str(e)))
        for u in PAGES:
            pg.goto(B+u); pg.wait_for_timeout(500)
            if pg.evaluate("document.documentElement.scrollHeight")<1600: continue
            flow(pg,f"{n} {u}")
        # Admin
        login(pg); pg.evaluate("location.hash='dashboard'"); pg.wait_for_timeout(700)
        if pg.evaluate("document.documentElement.scrollHeight")<1600: pg.evaluate("document.querySelector('#cnt').style.minHeight='3000px'")
        flow(pg,f"{n} Admin")
        pg.close()
    # Mobil: Button verdeckt die CTA-Leiste der Startseite nicht
    pg=b.new_page(viewport={'width':390,'height':700}); pg.goto(B+"index.html"); pg.wait_for_timeout(600); pg.evaluate("window.scrollTo(0,1500)"); pg.wait_for_timeout(700)
    ok("Handy Start: Button über der CTA-Leiste", pg.evaluate("(()=>{const u=document.querySelector('.nx-ax-top').getBoundingClientRect(),s=document.querySelector('.nx-sticky.on');return !s||u.bottom<=s.getBoundingClientRect().top+1})()"))
    ok("Keine JS-Fehler", not errs)
    b.close()
print(f"NACH-OBEN: {sum(R)}/{len(R)} bestanden"); sys.exit(0 if all(R) else 1)
