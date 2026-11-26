"""Test: Burger-Menü schließt beim Scrollen (jedes Gerät); es gibt immer genau EINE globale Suchleiste."""
import sys; sys.path.insert(0,'.')
from admin_helper import login
from playwright.sync_api import sync_playwright
res=[]
def ok(n,c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n)
with sync_playwright() as p:
    br=p.chromium.launch()
    for name,vp,touch in [('Handy 390x844',(390,844),True),('Tablet/schmal 800x700',(800,700),False),('Handy quer 844x390',(844,390),True)]:
        ctx=br.new_context(viewport={'width':vp[0],'height':vp[1]},has_touch=touch); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e:errs.append(str(e)))
        login(m); m.evaluate("location.hash='verrechnung-rechnungen'"); m.wait_for_timeout(600)
        isopen=lambda: m.evaluate("document.querySelector('.side').classList.contains('nx-ax-open')")
        n=lambda: m.evaluate("document.querySelectorAll('.nx-ax-search').length")
        ok(f'{name}: genau eine Suchleiste (geschlossen)', n()==1)
        m.click('.nx-ax-burger'); m.wait_for_timeout(450)
        ok(f'{name}: Burger öffnet das Menü, weiterhin genau eine Suchleiste', isopen() and n()==1 and m.evaluate("document.querySelectorAll('.side .nx-ax-search').length")==1 and m.evaluate("document.querySelectorAll('#hdr .nx-ax-search').length")==0)
        m.evaluate("document.querySelector('.side').scrollTop=50"); m.wait_for_timeout(300)
        ok(f'{name}: Scrollen im Menü selbst lässt es offen', isopen())
        m.mouse.move(vp[0]-15,vp[1]/2); m.mouse.wheel(0,300); m.wait_for_timeout(500)
        ok(f'{name}: Scrollen der Seite (Mausrad/Wischen) schließt das Menü', not isopen())
        m.evaluate("scrollTo(0,0)"); m.wait_for_timeout(300); m.click('.nx-ax-burger'); m.wait_for_timeout(450); m.evaluate("scrollTo(0,150)"); m.wait_for_timeout(400)
        ok(f'{name}: Scrollen per Tastatur/Skript schließt das Menü', not isopen())
        m.evaluate("scrollTo(0,0)"); m.wait_for_timeout(300); m.click('.nx-ax-burger'); m.wait_for_timeout(450)
        ok(f'{name}: nach erneutem Öffnen bleibt es offen, solange nicht gescrollt wird', isopen())
        m.keyboard.press('Escape'); m.wait_for_timeout(300)
        # Ansichten wechseln, Größe ändern, neu laden – nie eine zweite Suchleiste
        for v in ['kalender','anfragen','dashboard','einstellungen','backup']:
            m.evaluate(f"location.hash='{v}'"); m.wait_for_timeout(350)
        m.set_viewport_size({'width':1300,'height':800}); m.wait_for_timeout(300); a=n(); m.set_viewport_size({'width':vp[0],'height':vp[1]}); m.wait_for_timeout(300); b=n()
        ok(f'{name}: nach Ansichtswechsel und Größenänderung weiterhin genau eine Suchleiste', a==1 and b==1)
        m.reload(); m.wait_for_timeout(1200)
        if m.locator('input[type=password]').count(): login(m)
        ok(f'{name}: nach Neuladen genau eine Suchleiste', n()==1)
        ok(f'{name}: keine JS-Fehler', not errs)
        ctx.close()
    br.close()
print(f"\nErgebnis: {sum(res)}/{len(res)}"); sys.exit(0 if all(res) else 1)
