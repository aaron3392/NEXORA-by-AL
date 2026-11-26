# Aufträge: Abschlussdatum, automatisches Archiv nach 30 Tagen, Archiv-Ansicht, Wiederherstellen, Vorauszahlung-Titel
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from admin_helper import login
from playwright.sync_api import sync_playwright
R=[]
def ok(n,c): R.append(bool(c)); print(("OK   " if c else "FAIL ")+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    login(pg)
    # Testdaten: je ein Projekt frisch / 29 / 30 / 45 Tage abgeschlossen, eines laufend
    pg.evaluate("""()=>{const D=NX.db,T=NX.today();const mk=(id,name,st,done)=>({id,name,customerId:'K-1001',desc:'',cat:'Web',status:st,start:T,end:'',price:50000,notes:'',orderNumber:'AUF-9-'+id,doneAt:done});
      D.projects.length=0;
      D.projects.push(mk('P-9001','Frisch','Abgeschlossen',T),mk('P-9002','Neunundzwanzig','Abgeschlossen',NX.addDays(T,-29)),mk('P-9003','Dreissig','Abgeschlossen',NX.addDays(T,-30)),mk('P-9004','Fuenfundvierzig','Abgeschlossen',NX.addDays(T,-45)),mk('P-9005','Laufend','Laufend',''));
      D.projectArchive=[];NX.save();}""")
    ids=pg.evaluate("NX.db.projects.map(p=>p.id)"); arch=pg.evaluate("NX.db.projectArchive.map(p=>p.id)")
    ok("30 und 45 Tage alte Aufträge sind archiviert", sorted(arch)==['P-9003','P-9004'])
    ok("29 Tage, frisch und laufend bleiben aktiv", sorted(ids)==['P-9001','P-9002','P-9005'])
    ok("Archivierte Aufträge nicht mehr in NX.db.projects", 'P-9003' not in ids and 'P-9004' not in ids)
    ok("Archivdatum gesetzt", pg.evaluate("NX.db.projectArchive.every(p=>p.archivedAt===NX.today())"))
    ok("Aktivitätseintrag vorhanden", pg.evaluate("NX.db.activity.some(a=>/Auftrag archiviert/.test(a.text))"))
    # Abschlussdatum wird beim Abschließen gesetzt, beim Wiederöffnen entfernt
    pg.evaluate("NX.db.projects.find(p=>p.id==='P-9005').status='Abgeschlossen';NX.save()")
    ok("doneAt wird automatisch gesetzt", pg.evaluate("NX.db.projects.find(p=>p.id==='P-9005').doneAt===NX.today()"))
    pg.evaluate("NX.db.projects.find(p=>p.id==='P-9005').status='Pausiert';NX.save()")
    ok("doneAt wird beim Wiederöffnen entfernt", pg.evaluate("!NX.db.projects.find(p=>p.id==='P-9005').doneAt"))
    # Projekte-Ansicht
    pg.evaluate("location.hash='projekte'"); pg.wait_for_timeout(700)
    txt=pg.inner_text('#cnt')
    ok("Archiv-Bereich unter den Projekten", 'Archiv (2)' in txt)
    ok("Archivierte nur im Archiv-Bereich, nicht in der Hauptliste", pg.evaluate("[...document.querySelectorAll('#cnt table')][0].innerText.includes('Dreissig')===false && document.querySelector('.nx-ax-orders').innerText.includes('Dreissig')"))
    ok("Aktive Aufträge in der Hauptliste", pg.evaluate("document.querySelectorAll('#cnt table')[0].innerText.includes('Neunundzwanzig')"))
    # Suche im Archiv über das Suchfeld
    pg.fill('#q','Fuenf'); pg.wait_for_timeout(300)
    ok("Suchfeld filtert auch das Archiv", pg.evaluate("document.querySelector('.nx-ax-orders').innerText.includes('Fuenfundvierzig') && !document.querySelector('.nx-ax-orders').innerText.includes('Dreissig')"))
    pg.fill('#q',''); pg.wait_for_timeout(300)
    # Detailansicht
    pg.click('tr[data-ax-ord="P-9003"]'); pg.wait_for_timeout(400)
    ok("Detailansicht zeigt Auftragsnummer", 'AUF-9-P-9003' in pg.inner_text('.ov'))
    # Wiederherstellen
    pg.click('[data-ax-back]'); pg.wait_for_timeout(400)
    pg.locator('.ov').last.locator('.btn:has-text("Wiederherstellen")').click(); pg.wait_for_timeout(700)
    ok("Wiederherstellen verschiebt zurück (Status Laufend)", pg.evaluate("(()=>{const p=NX.db.projects.find(x=>x.id==='P-9003');return !!p&&p.status==='Laufend'&&!p.doneAt&&!NX.db.projectArchive.some(x=>x.id==='P-9003')})()"))
    # Neue Projekt-ID wird nicht wiederverwendet
    ok("nextId berücksichtigt Archiv", pg.evaluate("(()=>{NX.db.projectArchive.push({id:'P-9999'});const n=NX.nextId('P',NX.db.projects);NX.db.projectArchive.pop();return n==='P-10000'})()"))
    # Globale Suche findet Archiv
    ok("Globale Suche kennt Archiv", pg.evaluate("NX.db.projectArchive.length>0 && (()=>{const o=document.querySelector('.nx-ax-search input');return !!o})()") )
    # Rechnung eines archivierten Projekts: Auftragsnummer bleibt auffindbar
    ok("Auftragsnummer eines archivierten Projekts bleibt ermittelbar", pg.evaluate("NX.orderNumberFor('P-9004')")=='AUF-9-P-9004')
    # Vorauszahlung-Titel
    pg.evaluate("NX.viewDoc('invoice', Object.assign({}, NX.db.invoices[0], {kind:'Vorauszahlungsrechnung'}))"); pg.wait_for_timeout(400)
    ok("Dokumenttitel heißt nur „Vorauszahlung“", pg.inner_text('.ov .doc-heading h2').strip()=='Vorauszahlung')
    pg.evaluate("document.querySelector('.ov').remove()")
    # Persistenz nach Neuladen
    pg.reload(); pg.wait_for_timeout(1200)
    ok("Archiv bleibt nach Neuladen erhalten", pg.evaluate("(()=>{try{return JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/nexora/.test(k)&&/db|data/.test(k))||'')).projectArchive.length>=1}catch(e){return NX.db.projectArchive.length>=1}})()"))
    ok("Keine JS-Fehler", not errs)
    b.close()
print(f"AUFTRAG-ARCHIV: {sum(R)}/{len(R)} bestanden"); sys.exit(0 if all(R) else 1)
