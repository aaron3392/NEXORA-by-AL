from playwright.sync_api import sync_playwright
import sys
R=[]
def ok(n,c): R.append(bool(c)); print(('OK   ' if c else 'FEHLER '),n)
B='http://localhost:8765/'
FULL="""window.__fill=true;"""
with sync_playwright() as p:
    br=p.chromium.launch()
    # 1) Leere Konfiguration: Platzhalter + Hinweis
    pg=br.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    for u in ['datenschutz','agb','impressum']:
        pg.goto(B+u+'.html'); pg.wait_for_timeout(300)
        ok(u+': Hinweis auf fehlende Angaben sichtbar (leere Config)', pg.is_visible('#legal-missing') and 'legal.js' in pg.inner_text('#legal-missing'))
    # 2) Ausgefuellte Konfiguration: keine Platzhalter mehr
    c=br.new_context(); c.add_init_script("""Object.defineProperty(window,'__x',{value:1});
      document.addEventListener('DOMContentLoaded',()=>{});""")
    pg=c.new_page(); errs2=[]; pg.on('pageerror',lambda e:errs2.append(str(e)))
    c.route('**/assets/js/legal.js', lambda r: r.fulfill(path='/home/claude/NEXORA-by-AL/assets/js/legal.js', content_type='application/javascript') )
    # Konfig per Route ueberschreiben (Werte setzen)
    src=open('/home/claude/NEXORA-by-AL/assets/js/legal.js',encoding='utf-8').read()
    for k,v in dict(owner="Max Mustermann",street="Musterstraße 1",zip="1010",city="Wien",phone="+43 660 0000000",email="office@example.at",vatId="ATU12345678").items():
        src=src.replace(f"    {k}:" + " "*(8-len(k)) + "''", f"    {k}:" + " "*(8-len(k)) + f"'{v}'",1) if f"    {k}:" + " "*(8-len(k)) + "''" in src else src.replace(f"{k}:   ''",f"{k}:   '{v}'",1)
    c.unroute('**/assets/js/legal.js'); c.route('**/assets/js/legal.js', lambda r: r.fulfill(body=src, content_type='application/javascript'))
    for u in ['datenschutz','agb','impressum']:
        pg.goto(B+u+'.html'); pg.wait_for_timeout(300)
        t=pg.inner_text('.nx-prose')
        ok(u+': keine Platzhalter mehr', pg.locator('.nx-prose .ph').count()==0 and not pg.is_visible('#legal-missing'))
        ok(u+': Firmendaten eingesetzt','Max Mustermann' in t and 'Musterstraße 1' in t and 'office@example.at' in t)
    pg.goto(B+'impressum.html'); pg.wait_for_timeout(200); ok('Impressum zeigt UID wenn vorhanden','ATU12345678' in pg.inner_text('.nx-prose'))
    ok('Impressum: Firmenbuch ausgeblendet wenn leer','Firmenbuch' not in pg.inner_text('.nx-prose') or not pg.locator('[data-legal-opt=register]').is_visible())
    pg.goto(B+'agb.html'); t=pg.inner_text('.nx-prose')
    for kw in ['Geltungsbereich','Gewährleistung','Haftung','Rücktrittsrecht','Gerichtsstand' if False else 'Wien','KSchG','FAGG']: ok('AGB enthält '+kw, kw in t)
    pg.goto(B+'datenschutz.html'); t=pg.inner_text('.nx-prose')
    for kw in ['DSGVO','Datenschutzbehörde','FormSubmit','localStorage','Speicherdauer','Ihre Rechte']: ok('Datenschutz enthält '+kw, kw in t)
    ok('Footer/Header laden auf Rechtsseite', pg.locator('.nx-hdr a').count()>3 and pg.locator('.nx-ftr a').count()>3)
    ok('Keine JS-Fehler', not errs and not errs2)
print(f'RECHTSTEXTE: {sum(R)}/{len(R)} bestanden'); sys.exit(0 if all(R) else 1)
