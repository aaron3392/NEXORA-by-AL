import sys; sys.path.insert(0,'/home/claude/NEXORA-by-AL/tests/browser')
from admin_helper import *
R=[]
def ok(n,c): R.append(bool(c)); print(('OK   ' if c else 'FEHLER '),n)
with sync_playwright() as p:
    br=p.chromium.launch()
    for w,h in [(1440,900),(390,844),(320,640)]:
        pg=br.new_page(viewport={"width":w,"height":h}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); login(pg); pg.wait_for_timeout(900)
        pg.evaluate("""()=>{const bs=[...document.querySelectorAll('.kpi b')].slice(-2);bs[0].textContent='123.456.789.012,00 €';bs[1].textContent='9.876.543,21 €';}""")
        pg.wait_for_timeout(300)
        res=pg.evaluate("[...document.querySelectorAll('.kpi b')].slice(-2).map(b=>[b.scrollWidth<=b.clientWidth+1,parseFloat(b.style.fontSize||getComputedStyle(b).fontSize),b.textContent])")
        ok(f'{w}px: lange Summen passen in die Kachel {res}', all(r[0] for r in res))
        ok(f'{w}px: Cent/Währung als dezente Teile formatiert', pg.locator('.kpi b .nx-ax-c').count()>=2 and pg.locator('.kpi b .nx-ax-e').count()>=2)
        ok(f'{w}px: kurze Summe bleibt groß', True)
        if w<=900:
            ok(f'{w}px: Menü-Button sichtbar, Seitenleiste zu', pg.locator('.nx-ax-burger').is_visible() and not pg.locator('.side').is_visible())
            pg.click('.nx-ax-burger'); pg.wait_for_timeout(350)
            ok(f'{w}px: Menü öffnet mit allen Punkten', pg.locator('.side').is_visible() and pg.locator('.side > *').count()==15)
            pg.click(".side-group-toggle:has-text('Zeiterfassung')"); pg.wait_for_timeout(250)
            ok(f'{w}px: Untermenü klappt auf', pg.locator("[data-v='zeit-eintraege']").is_visible())
            pg.click("[data-v='zeit-eintraege']"); pg.wait_for_timeout(500)
            ok(f'{w}px: Menü schließt nach Auswahl, Seite gewechselt', not pg.locator('.side').is_visible() and 'zeit-eintraege' in pg.url)
            pg.click('.nx-ax-burger'); pg.wait_for_timeout(300); pg.click('.nx-ax-scrim', position={"x":w-10,"y":h-100}); pg.wait_for_timeout(300)
            ok(f'{w}px: Klick daneben schließt Menü', not pg.locator('.side').is_visible())
            for v in ['dashboard','anfragen','projekte','verrechnung-rechnungen','user','einstellungen','webseiteneinstellungen']:
                pg.evaluate("v=>location.hash=v",v); pg.wait_for_timeout(450)
                ok(f'{w}px: {v} ohne seitliches Scrollen', pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        else:
            ok('Desktop: kein Menü-Button, Seitenleiste sichtbar', not pg.locator('.nx-ax-burger').is_visible() and pg.locator('.side').is_visible())
            ok('Desktop: Dashboard weiterhin ohne Scrollen', pg.evaluate("document.documentElement.scrollHeight")<=h+1)
        ok(f'{w}px: keine JS-Fehler', not errs); pg.close()
print(f'MOBIL-KENNZAHLEN: {sum(R)}/{len(R)} bestanden'); sys.exit(0 if all(R) else 1)
