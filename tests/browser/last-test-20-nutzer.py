"""Simuliert 20 gleichzeitig aktive Nutzer (je ein eigener Browser-Kontext, wirklich parallel via asyncio).
Hinweis: Die Seite speichert alles im localStorage des jeweiligen Browsers - es gibt keinen gemeinsamen Server-Zustand.
Geprueft wird daher: 20 parallele Sitzungen, keine JS-Fehler, korrekte Ergebnisse, Antwortzeiten."""
import asyncio, time, sys
from playwright.async_api import async_playwright
B='http://localhost:8765/'; res=[]
async def newpg(br):
    c=await br.new_context(); pg=await c.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); return c,pg,errs
async def visitor(br,i):
    c,pg,errs=await newpg(br); t=time.time()
    for u in ['index.html','leistungen.html','projekte.html','ueber-uns.html','kontakt.html']:
        await pg.goto(B+u); await pg.wait_for_selector('main')
    res.append((f'Besucher {i}: 5 Seiten',not errs,f'{time.time()-t:.1f}s {errs[:1]}')); await c.close()
async def customer(br,i):
    c,pg,errs=await newpg(br); t=time.time()
    await pg.goto(B+'kundenportal.html'); await pg.fill("input[type=email]","mia.demo@example.com"); await pg.fill("input[type=password]","Demo12345"); await pg.click("form button[type=submit], form .btn"); await pg.wait_for_selector("text=Willkommen, Mia")
    for v in ['anfragen','dokumente','projekte']: await pg.click(f".side [data-v='{v}']"); await pg.wait_for_timeout(150)
    await pg.click(".side [data-v='support']"); await pg.select_option('#sp',index=2); await pg.fill('#sb',f'Last {i}'); await pg.fill('#sm','Test'); await pg.click("form.nx-supportform button[type=submit]"); await pg.wait_for_timeout(500)
    ok=await pg.evaluate(f"NX.db.support.some(s=>s.subject==='Last {i}'&&s.project)")
    res.append((f'Kunde {i}: Login + Support mit Projekt',ok and not errs,f'{time.time()-t:.1f}s {errs[:1]}')); await c.close()
async def inquirer(br,i):
    c,pg,errs=await newpg(br); t=time.time(); await pg.goto(B+'anfrage.html'); await pg.wait_for_selector('form')
    res.append((f'Anfrage {i}: Formular laedt',not errs and await pg.locator('form input').count()>5,f'{time.time()-t:.1f}s')); await c.close()
async def admin(br,i):
    c,pg,errs=await newpg(br); t=time.time(); await pg.goto(B+'admin/index.html'); await pg.wait_for_timeout(500)
    res.append((f'Admin {i}: Login-Seite',not errs,f'{time.time()-t:.1f}s {errs[:1]}')); await c.close()
async def main():
    jobs=[(visitor,i) for i in range(1,9)]+[(customer,i) for i in range(1,8)]+[(inquirer,i) for i in range(1,4)]+[(admin,i) for i in range(1,3)]
    async with async_playwright() as p:
        br=await p.chromium.launch(); T=time.time()
        async def run(f,i):
            try: await f(br,i)
            except Exception as e: res.append((f'{f.__name__} {i}',False,repr(e)[:150]))
        await asyncio.gather(*[run(f,i) for f,i in jobs])
        print(f'{len(jobs)} parallele Nutzer in {time.time()-T:.1f}s'); await br.close()
asyncio.run(main())
bad=[r for r in res if not r[1]]
for r in sorted(res): print(('OK     ' if r[1] else 'FEHLER '),r[0],r[2])
print(f'{len(res)-len(bad)}/{len(res)} bestanden'); sys.exit(1 if bad else 0)
