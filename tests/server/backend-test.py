# Start des Servers: cd ample-app; DATABASE_URL=x PORT=8770 NX_SETUP_CODE=TESTCODE-123 NODE_PATH=../tests/server/stub/node_modules node server.js
from playwright.sync_api import sync_playwright
B='http://localhost:8770'; PW='Sicheres-Passwort-2026'
ok=bad=0
def chk(n,c):
    global ok,bad
    print(('OK   ' if c else 'FAIL ')+n); ok+=bool(c); bad+=(not c)
def js(pg,code): return pg.evaluate(code)
def get(pg): return js(pg,"fetch('/api/db').then(r=>r.json())")
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    A=b.new_context(); pg=A.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(B+'/admin/index.html'); pg.wait_for_timeout(1500)
    chk('Ersteinrichtung wird angezeigt', pg.locator('#sf').count()==1)
    chk('keine Zugangsdaten im Code', 'admin2026' not in js(pg,"fetch('/assets/js/core.js').then(r=>r.text())"))
    pg.fill('#sc','FALSCH'); pg.fill('#su','chef'); pg.fill('#sp1',PW); pg.fill('#sp2',PW); pg.click('#sf button[type=submit]'); pg.wait_for_timeout(700)
    chk('falscher Einrichtungs-Code abgelehnt', 'Code' in pg.inner_text('#se'))
    pg.fill('#sc','TESTCODE-123'); pg.fill('#sp1','kurz1'); pg.fill('#sp2','kurz1'); pg.click('#sf button[type=submit]'); pg.wait_for_timeout(900)
    chk('schwaches Passwort abgelehnt', '12 Zeichen' in pg.inner_text('#se'))
    pg.fill('#sp1',PW); pg.fill('#sp2',PW); pg.click('#sf button[type=submit]'); pg.wait_for_timeout(1800)
    chk('Admin eingerichtet und angemeldet', pg.locator('.side').count()>0 and js(pg,"NX.backend.role")=='admin')
    j=get(pg)
    chk('Datenbank leer (keine Kunden/Projekte/Rechnungen)', all(len(j['db'][k])==0 for k in ['customers','inquiries','projects','invoices','offers','support']))
    chk('Admin sieht eigenen Benutzernamen', j['db']['auth']['user']=='chef')
    chk('Einstellungen vorhanden, FormSubmit-Adresse leer', j['db']['settings']['company']=='NEXORA by AL' and j['db']['settings']['formsubmit']=='')
    chk('Einrichtung nur einmal möglich', js(pg,"fetch('/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'TESTCODE-123',user:'x2',hash:'h'})}).then(r=>r.status)")==409)
    # Abmelden / Anmelden
    js(pg,"NX.sess.clear('admin')"); pg.wait_for_timeout(1500)
    chk('nach Abmeldung Login-Formular', pg.locator('#lf').count()==1)
    pg.fill('#lu','chef'); pg.fill('#lp','falsch'); pg.click('#lf button[type=submit]'); pg.wait_for_timeout(600)
    chk('falsches Passwort abgelehnt', 'falsch' in pg.inner_text('#le'))
    pg.fill('#lp',PW); pg.click('#lf button[type=submit]'); pg.wait_for_timeout(1500)
    chk('Login mit richtigem Passwort', js(pg,"NX.backend.role")=='admin')
    # Kunde anlegen (Passwort im Klartext-Hash vom Browser)
    js(pg,"""(async()=>{NX.db.customers.push({id:'K-1',first:'Test',last:'Kunde',email:'kunde@test.at',status:'aktiv',role:'Kunde',pwHash:await NX.hash('Kunde-Passwort-1')});
      NX.db.invoices.push({id:'R-1',customerId:'K-1',number:'R-1',draft:false,items:[],payments:[],date:NX.today(),due:NX.today(),kind:'Schlussrechnung'});
      NX.db.invoices.push({id:'R-2',customerId:'K-9',number:'R-2',draft:false,items:[],payments:[],date:NX.today(),due:NX.today(),kind:'Schlussrechnung'});NX.save();})()"""); pg.wait_for_timeout(900)
    j=get(pg); cu=j['db']['customers'][0]
    chk('Kunden-Passwort auf dem Server stark gesichert (scrypt)', cu['pwHash'].startswith('s1$'))
    # Besucher
    V=b.new_context(); vp=V.new_page(); vp.goto(B+'/index.html'); vp.wait_for_timeout(1200)
    jv=get(vp)
    chk('Besucher: keine Kunden-/Passwortdaten', 'pwHash' not in str(jv['db']['customers']) and jv['db']['invoices']==[] and 'auth' not in jv['db'])
    chk('Besucher: kein kv-Zugriff', vp.evaluate("fetch('/api/kv/nx_accounting_v1',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{\"value\":{}}'}).then(r=>r.status)")==403)
    chk('Besucher: keine Admin-Liste', vp.evaluate("fetch('/api/admins').then(r=>r.status)")==403)
    vp.evaluate("fetch('/api/db',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({db:{customers:[],invoices:[]}})})"); vp.wait_for_timeout(300)
    chk('Admin-Daten nach Besucher-PUT intakt', len(get(pg)['db']['customers'])==1)
    # Registrierung als Besucher -> Passwort gesichert
    vp.evaluate("""(async()=>{NX.db.customers.push({id:'K-2',first:'Neu',last:'Reg',email:'neu@test.at',status:'aktiv',role:'Kunde',pwHash:await NX.hash('Neu-Passwort-12')});NX.save();})()"""); vp.wait_for_timeout(900)
    reg=[c for c in get(pg)['db']['customers'] if c['id']=='K-2']
    chk('Registrierung gespeichert, Passwort gesichert', len(reg)==1 and reg[0]['pwHash'].startswith('s1$'))
    # Kundenlogin
    C=b.new_context(); cp=C.new_page(); cp.goto(B+'/kundenportal.html'); cp.wait_for_timeout(1500)
    cp.fill('#le','kunde@test.at'); cp.fill('#lp','Falsch12345678'); cp.click('#av form button[type=submit]'); cp.wait_for_timeout(700)
    chk('Kunde: falsches Passwort abgelehnt', 'falsch' in cp.inner_text('#lerr'))
    cp.fill('#lp','Kunde-Passwort-1'); cp.click('#av form button[type=submit]'); cp.wait_for_timeout(1800)
    jc=get(cp)
    chk('Kunde angemeldet, sieht nur sich selbst', js(cp,"NX.backend.role")=='customer' and len(jc['db']['customers'])==1 and 'auth' not in jc['db'])
    chk('Kunde: nur eigene Rechnungen', len(jc['db']['invoices'])==1 and jc['db']['invoices'][0]['customerId']=='K-1')
    # Kundenpasswort ändern
    cp.evaluate("""(async()=>{const c=NX.db.customers[0]; c.pwHash=await NX.hash('Kunde-Neu-Passwort-2'); NX.save();})()"""); cp.wait_for_timeout(900)
    C2=b.new_context(); c2=C2.new_page(); c2.goto(B+'/kundenportal.html'); c2.wait_for_timeout(1500)
    c2.fill('#le','kunde@test.at'); c2.fill('#lp','Kunde-Passwort-1'); c2.click('#av form button[type=submit]'); c2.wait_for_timeout(700)
    chk('altes Kundenpasswort nach Änderung ungültig', 'falsch' in c2.inner_text('#lerr'))
    c2.fill('#lp','Kunde-Neu-Passwort-2'); c2.click('#av form button[type=submit]'); c2.wait_for_timeout(1500)
    chk('neues Kundenpasswort funktioniert', js(c2,"NX.backend.role")=='customer')
    # Admin-Passwort ändern
    pg.evaluate("""(async()=>{NX.db.auth.hash=await NX.hash('Neues-Admin-Passwort-9'); NX.save();})()"""); pg.wait_for_timeout(900)
    D=b.new_context(); dp=D.new_page(); dp.goto(B+'/admin/index.html'); dp.wait_for_timeout(1500)
    dp.fill('#lu','chef'); dp.fill('#lp',PW); dp.click('#lf button[type=submit]'); dp.wait_for_timeout(600)
    chk('altes Admin-Passwort ungültig', 'falsch' in dp.inner_text('#le'))
    dp.fill('#lp','Neues-Admin-Passwort-9'); dp.click('#lf button[type=submit]'); dp.wait_for_timeout(1500)
    chk('neues Admin-Passwort funktioniert', js(dp,"NX.backend.role")=='admin')
    # weitere Administratoren
    h2=pg.evaluate("NX.hash('Zweiter-Admin-2026')")
    r=pg.evaluate("h=>fetch('/api/admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:'zweiter',hash:h})}).then(r=>r.status)",h2)
    chk('zweiten Administrator anlegen', r==200)
    E=b.new_context(); ep=E.new_page(); ep.goto(B+'/admin/index.html'); ep.wait_for_timeout(1500)
    ep.fill('#lu','zweiter'); ep.fill('#lp','Zweiter-Admin-2026'); ep.click('#lf button[type=submit]'); ep.wait_for_timeout(1800)
    chk('zweiter Administrator angemeldet', js(ep,"NX.backend.role")=='admin' and js(ep,"NX.db.auth.user")=='zweiter' and ep.locator('.side').count()>0)
    chk('eigenes Konto nicht löschbar', js(ep,"fetch('/api/admins/zweiter',{method:'DELETE'}).then(r=>r.status)")==400)
    chk('Administratoren-Karte im Menü „Passwort ändern“', (ep.evaluate("location.hash='passwort'") or True) and (ep.wait_for_timeout(900) or True) and ep.locator('.nx-ax-adm').count()==1)
    chk('zweiten Administrator löschen', js(pg,"fetch('/api/admins/zweiter',{method:'DELETE'}).then(r=>r.status)")==200)
    chk('gelöschter Administrator ist abgemeldet', js(ep,"fetch('/api/db').then(r=>r.json()).then(j=>j.role)")=='none')
    # ---- Stufe 2: Sicherungen, Dateien, Automatik ----
    chk('automatische Tagessicherung wurde angelegt', len(pg.evaluate("fetch('/api/backups').then(r=>r.json()).then(j=>j.backups.filter(b=>b.kind==='auto'))"))>=1)
    chk('manuelle Sicherung', pg.evaluate("fetch('/api/backups',{method:'POST'}).then(r=>r.status)")==200)
    bk=pg.evaluate("fetch('/api/backups').then(r=>r.json()).then(j=>j.backups)")
    chk('Sicherungsliste', len(bk)>=2 and any(x['kind']=='manual' for x in bk))
    dl=pg.evaluate("id=>fetch('/api/backups/'+id+'/download').then(r=>r.json())",bk[0]['id'])
    chk('Sicherung enthält Datenbank', 'db' in dl and len(dl['db']['customers'])>=1)
    manual=[x for x in bk if x['kind']=='manual'][0]['id']
    pg.evaluate("NX.db.settings.company='GEAENDERT'; NX.save()"); pg.wait_for_timeout(800)
    chk('Besucher darf keine Sicherungen sehen', vp.evaluate("fetch('/api/backups').then(r=>r.status)")==403)
    chk('Wiederherstellen', pg.evaluate("id=>fetch('/api/backups/'+id+'/restore',{method:'POST'}).then(r=>r.status)",manual)==200)
    chk('Firmenname nach Wiederherstellung zurück', get(pg)['db']['settings']['company']=='NEXORA by AL')
    pg.goto(B+'/admin/index.html'); pg.wait_for_timeout(1500)
    # Dateien
    up="(async()=>{const r=await fetch('/api/files?owner=customer:K-1&name=Vertrag.pdf',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array([37,80,68,70,45,49]) });return [r.status,(await r.json()).id]})()"
    st,fid=pg.evaluate(up)
    chk('Admin lädt Datei hoch', st==200 and fid)
    chk('unerlaubter Dateityp abgelehnt', pg.evaluate("fetch('/api/files?owner=customer:K-1&name=virus.exe',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array([1,2,3])}).then(r=>r.status)")==400)
    jc=get(cp); cp.goto(B+'/kundenportal.html'); cp.wait_for_timeout(1500)
    chk('Kunde sieht eigene Datei', len(cp.evaluate("fetch('/api/files').then(r=>r.json()).then(j=>j.files)"))==1)
    chk('Kunde kann eigene Datei laden', cp.evaluate("id=>fetch('/api/files/'+id).then(r=>r.status)",fid)==200)
    chk('Datei wird als Download ausgeliefert', 'attachment' in cp.evaluate("id=>fetch('/api/files/'+id).then(r=>r.headers.get('content-disposition'))",fid))
    F=b.new_context(); fp=F.new_page(); fp.goto(B+'/kundenportal.html'); fp.wait_for_timeout(1500)
    fp.fill('#le','neu@test.at'); fp.fill('#lp','Neu-Passwort-12'); fp.click('#av form button[type=submit]'); fp.wait_for_timeout(1800)
    chk('Fremder Kunde: angemeldet, sieht Datei nicht', js(fp,"NX.backend.role")=='customer' and len(fp.evaluate("fetch('/api/files').then(r=>r.json()).then(j=>j.files)"))==0 and fp.evaluate("id=>fetch('/api/files/'+id).then(r=>r.status)",fid)==404)
    chk('Besucher: keine Dateien', vp.evaluate("id=>fetch('/api/files/'+id).then(r=>r.status)",fid)==403)
    chk('Portal: Reiter „Dateien“', cp.locator('.side [data-nxf]').count()==1)
    cp.click('.side [data-nxf]'); cp.wait_for_timeout(900)
    chk('Portal: Datei wird aufgelistet', 'Vertrag.pdf' in cp.inner_text('#pc'))
    pg.evaluate("location.hash='dateien'"); pg.wait_for_timeout(1200)
    chk('Admin: Dateien-Ansicht', pg.locator('.nx-ax-files form').count()==1 and 'Vertrag.pdf' in pg.inner_text('.nx-ax-files'))
    chk('Admin löscht Datei', pg.evaluate("id=>fetch('/api/files/'+id,{method:'DELETE'}).then(r=>r.status)",fid)==200)
    pg.evaluate("location.hash='backup'"); pg.wait_for_timeout(1200)
    chk('Admin: Server-Sicherungen-Karte', pg.locator('.nx-ax-sbk').count()==1)
    pg.evaluate("location.hash='einstellungen'"); pg.wait_for_timeout(1200)
    chk('Admin: Automatik-Karte', pg.locator('.nx-ax-auto input').count()==2)
    # Automatik
    today=pg.evaluate("new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Vienna'})")
    pg.evaluate("""t=>{NX.db.subscriptions=[{id:'ABO-1',customerId:'K-1',projectId:'',packageName:'Hosting',description:'',amount:5000,vat:20,status:'Aktiv',nextDate:t,generatedPeriods:[]}];
      NX.db.invoices.push({id:'R-OLD',customerId:'K-1',number:'R-2026-9000',draft:false,items:[{desc:'x',qty:1,price:10000}],vat:20,disc:0,payments:[],date:'2026-01-01',due:'2026-01-15',kind:'Schlussrechnung'}); NX.save();}""",today); pg.wait_for_timeout(900)
    pg.evaluate("fetch('/api/automation/run',{method:'POST'})"); pg.wait_for_timeout(600)
    j=get(pg)['db']
    chk('Automatik: Monatsrechnung als Entwurf', any(i.get('auto') and i['draft'] and i['kind']=='Monatsrechnung' for i in j['invoices']))
    chk('Automatik: Vertrag auf nächsten Monat gesetzt', j['subscriptions'][0]['nextDate']>today and len(j['subscriptions'][0]['generatedPeriods'])==1)
    chk('Automatik: Mahnwesen standardmäßig aus', j['reminders']==[])
    pg.evaluate("NX.db.settings.auto.reminders=true; NX.save()"); pg.wait_for_timeout(700)
    pg.evaluate("fetch('/api/automation/run',{method:'POST'})"); pg.wait_for_timeout(600)
    j=get(pg)['db']
    chk('Automatik: Zahlungserinnerung angelegt', len(j['reminders'])==1 and j['reminders'][0]['type']=='Zahlungserinnerung')
    pg.evaluate("fetch('/api/automation/run',{method:'POST'})"); pg.wait_for_timeout(600)
    chk('Automatik: kein doppeltes Anlegen', len(get(pg)['db']['reminders'])==1 and len([i for i in get(pg)['db']['invoices'] if i.get('auto')])==1)
    # veralteter Admin-Stand überschreibt Automatik nicht
    stale=pg.evaluate("""()=>{const d=JSON.parse(JSON.stringify(NX.db)); d.invoices=d.invoices.filter(i=>!i.auto); d.reminders=[]; return d}""")
    pg.evaluate("d=>fetch('/api/db',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({db:d,base:1})})",stale); pg.wait_for_timeout(500)
    j=get(pg)['db']
    chk('Automatik-Ergebnisse bleiben bei veraltetem Admin-Stand erhalten', len([i for i in j['invoices'] if i.get('auto')])==1 and len(j['reminders'])==1)
    j=get(pg)['db']; names=[c['email'] for c in j['customers']]
    chk('Registrierung überlebt veralteten Admin-Stand', 'neu@test.at' in names)
    chk('Kundenpasswort überlebt veralteten Admin-Stand', all(c['pwHash'].startswith('s1$') for c in j['customers']))
    chk('keine JS-Fehler', errs==[]); print(errs[:3])
    b.close()
print(ok,'OK',bad,'FAIL')
