# Skalierung: kein seitliches Scrollen, nichts abgeschnitten – öffentliche Seiten, Portal, alle Admin-Ansichten, viele Bildschirmgrößen
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from admin_helper import login
from playwright.sync_api import sync_playwright
BASE="http://localhost:8765/"
PUBLIC=["index.html","leistungen.html","projekte.html","ueber-uns.html","kontakt.html","anfrage.html","kundenportal.html","impressum.html","datenschutz.html","agb.html"]
SIZES=[(320,568),(360,640),(390,844),(412,915),(568,320),(844,390),(600,960),(768,1024),(820,1180),(1024,768),(1180,820),(1280,800),(1440,900),(1920,1080),(2560,1300)]
JS="""()=>{const w=document.documentElement.clientWidth, de=document.documentElement, b=document.body;
 const over=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>w+1&&getComputedStyle(e).position!=='fixed'){let p=e.parentElement,clipped=false;while(p&&p!==document.body){const s=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(s.overflowX)&&p.getBoundingClientRect().right<=w+1){clipped=true;break}p=p.parentElement}if(!clipped)over.push((e.tagName+'.'+String(e.className).split(' ')[0]+'#'+e.id).slice(0,60)+' r='+Math.round(r.right))}});
 return {sw:Math.max(de.scrollWidth,b.scrollWidth),w:w,over:over.slice(0,4)}}"""
MODAL_SIZES=[(320,568),(390,844),(568,320),(768,1024),(1280,800)]
bad=[]; n=0
def check(pg,label,w,h):
    global n; n+=1
    r=pg.evaluate(JS)
    if r['sw']>r['w']+1 or r['over']:
        bad.append(f"{label} {w}x{h}: scrollWidth {r['sw']} > {r['w']} {r['over']}")
with sync_playwright() as p:
    b=p.chromium.launch()
    errs=[]
    for (w,h) in SIZES:
        ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
        for u in PUBLIC:
            pg.goto(BASE+u); pg.wait_for_timeout(350); check(pg,u,w,h)
        pg.goto(BASE+"admin/index.html"); pg.wait_for_timeout(300); check(pg,"admin-login",w,h)
        login(pg)
        views=['dashboard','kalender','anfragen','projekte','verrechnung-angebote','verrechnung-rechnungen','verrechnung-mahnungen','verrechnung-vertraege','buchhaltung','finanzen-uebersicht','finanzen-zeiten','zeit-eintraege','zeit-uebersicht','user','webseiteneinstellungen','einstellungen','passwort','backup']
        for v in views:
            pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(450)
            if pg.evaluate("document.querySelector('.nx-ax-burger')&&getComputedStyle(document.querySelector('.nx-ax-burger')).display!=='none'&&document.querySelector('.side.nx-ax-open')"):
                pass
            check(pg,"admin#"+v,w,h)
        if (w,h) in MODAL_SIZES:
            # Fenster/Formulare/Dokumente
            for t,c in [('invoice','invoices'),('offer','offers'),('reminder','reminders')]:
                pg.evaluate(f"NX.viewDoc('{t}', NX.db.{c}[0])"); pg.wait_for_timeout(300); check(pg,'dokument-'+t,w,h)
                pg.evaluate("document.querySelectorAll('.ov').forEach(o=>o.remove())")
            for v,btn in [('projekte','#add'),('verrechnung-rechnungen','#add'),('verrechnung-angebote','#add'),('user','#add'),('zeit-eintraege','#add'),('anfragen','#tb tr[data-id]'),('projekte','#tb tr[data-id]')]:
                pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(350)
                el=pg.query_selector('#cnt '+btn)
                if not el: continue
                try: el.click(timeout=2000)
                except Exception: continue
                pg.wait_for_timeout(350); check(pg,f'fenster-{v}-{btn}',w,h)
                pg.evaluate("document.querySelectorAll('.ov').forEach(o=>o.remove())")
        ctx.close()
    b.close()
print("Geprüfte Ansichten:",n)
for x in bad: print("FAIL",x)
print("Seiten-Fehler:",errs[:3])
print(f"SKALIERUNG: {n-len(bad)}/{n} bestanden"); sys.exit(0 if not bad and not errs else 1)
