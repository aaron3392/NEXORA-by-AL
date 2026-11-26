# Tageswechsel: Datum läuft automatisch weiter, auch bei über Mitternacht geöffneter Seite (Gerätezeit, ohne Server)
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from admin_helper import login
from playwright.sync_api import sync_playwright
R=[]
def ok(n,c): R.append(bool(c)); print(("OK   " if c else "FAIL ")+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900}); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.clock.install(time='2026-11-11T23:59:30+01:00'); pg.clock.resume()
    login(pg)
    ok("Start: NX.today() ist der 11.11.", pg.evaluate("NX.today()")=='2026-11-11')
    # Kalender (Tagesansicht) steht auf heute
    pg.evaluate("location.hash='kalender'"); pg.wait_for_timeout(900)
    pg.select_option('.nx-ax-cal-sel','day'); pg.wait_for_timeout(400)
    ok("Kalender zeigt Mittwoch, 11. November", '11. November 2026' in pg.inner_text('.nx-ax-cal-title'))
    # Projekt, das morgen genau 30 Tage abgeschlossen ist
    pg.evaluate("""()=>{NX.db.projects.push({id:'P-9100',name:'Tageswechsel-Test',customerId:'K-1001',desc:'',cat:'Web',status:'Abgeschlossen',start:'2026-09-01',end:'',price:1000,notes:'',orderNumber:'AUF-T',doneAt:'2026-10-13'});NX.save();}""")
    ok("Vor Mitternacht: Auftrag (29 Tage) noch aktiv", pg.evaluate("NX.db.projects.some(p=>p.id==='P-9100')"))
    pg.evaluate("document.querySelector('#cnt').insertAdjacentHTML('beforeend','<i id=mk></i>')")
    # Mitternacht überschreiten
    pg.clock.fast_forward(60000); pg.wait_for_timeout(1500)
    ok("Nach Mitternacht: NX.today() ist der 12.11.", pg.evaluate("NX.today()")=='2026-11-12')
    ok("Kalender ist automatisch auf den 12. November gesprungen", '12. November 2026' in pg.inner_text('.nx-ax-cal-title'))
    ok("Ansicht wurde neu gezeichnet", pg.locator('#mk').count()==0)
    ok("Fälliger Auftrag wurde automatisch archiviert", pg.evaluate("NX.db.projectArchive.some(p=>p.id==='P-9100')") and not pg.evaluate("NX.db.projects.some(p=>p.id==='P-9100')"))
    # Offenes Fenster wird nicht gestört
    pg.evaluate("location.hash='dashboard'"); pg.wait_for_timeout(600)
    pg.evaluate("NX.modal('Test','<p>offen</p>')"); pg.evaluate("document.querySelector('#cnt').insertAdjacentHTML('beforeend','<i id=mk></i>')")
    pg.clock.set_system_time('2026-11-13T00:00:05+01:00'); pg.clock.fast_forward(25000); pg.wait_for_timeout(800)
    ok("Neuer Tag erkannt (13.11.)", pg.evaluate("NX.today()")=='2026-11-13')
    ok("Bei offenem Fenster keine Störung (kein Neuzeichnen)", pg.locator('#mk').count()==1 and pg.locator('.ov').count()>=1)
    pg.evaluate("document.querySelectorAll('.ov').forEach(o=>o.remove())")
    pg.clock.fast_forward(5000); pg.wait_for_timeout(1200)
    ok("Nach Schließen des Fensters wird nachgezogen", pg.locator('#mk').count()==0)
    ok("Keine JS-Fehler", not errs)
    b.close()
print(f"TAGESWECHSEL: {sum(R)}/{len(R)} bestanden"); sys.exit(0 if all(R) else 1)
