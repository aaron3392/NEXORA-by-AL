# Prüft die getrennten Betriebsarten (NX_MODE=public / admin). Startet beide Server selbst (Postgres-Attrappe, getrennter Speicher je Prozess).
import subprocess, os, time, shutil, tempfile, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); tmp=tempfile.mkdtemp()
os.makedirs(tmp+'/public'); shutil.copy(ROOT+'/server/server.js',tmp); shutil.copy(ROOT+'/server/automation.js',tmp); shutil.copy(ROOT+'/server/package.json',tmp)
for f in os.listdir(ROOT):
    if f.endswith('.html'): shutil.copy(ROOT+'/'+f,tmp+'/public/')
shutil.copytree(ROOT+'/admin',tmp+'/public/admin'); shutil.copytree(ROOT+'/assets',tmp+'/public/assets')
def start(port,mode,extra):
    env=dict(os.environ,DATABASE_URL='x',PORT=str(port),NX_MODE=mode,NODE_PATH=ROOT+'/tests/server/stub/node_modules',**extra)
    return subprocess.Popen(['node','server.js'],cwd=tmp,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
PUB,ADM='http://localhost:8771','http://localhost:8772'
ps=[start(8771,'public',{}), start(8772,'admin',{'NX_SETUP_CODE':'CODE-ABC-123','NX_PUBLIC_URL':PUB})]; time.sleep(1.8)
ok=bad=0
def chk(n,c):
    global ok,bad; print(('OK   ' if c else 'FAIL ')+n); ok+=bool(c); bad+=(not c)
def status(url):
    class NoRedir(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*a,**k): return None
    try: return urllib.request.build_opener(NoRedir).open(url).status
    except urllib.error.HTTPError as e: return e.code
try:
    chk('public: Startseite erreichbar', status(PUB+'/index.html')==200)
    chk('public: /admin/ nicht ausgeliefert', status(PUB+'/admin/index.html')==404)
    chk('public: Admin-Skripte nicht ausgeliefert', all(status(PUB+'/assets/js/'+f)==404 for f in ['admin.js','billing.js','finance.js','time.js','bookkeeping.js','admin-extras.js']))
    chk('public: Portal-Skripte vorhanden', status(PUB+'/assets/js/portal.js')==200 and status(PUB+'/assets/js/core.js')==200)
    chk('public: Admin-Schnittstellen gesperrt', all(status(PUB+u)==404 for u in ['/api/admins','/api/backups','/api/setup','/api/automation/run']))
    chk('admin: Startseite leitet zu /admin/', status(ADM+'/')==302)
    chk('admin: Admin erreichbar', status(ADM+'/admin/index.html')==200)
    chk('admin: öffentliche Seiten leiten zur Webseite', status(ADM+'/index.html')==302 and status(ADM+'/kundenportal.html')==302)
    with sync_playwright() as p:
        b=p.chromium.launch(); errs=[]
        # Besucher registriert sich über die öffentliche App
        v=b.new_context(); vp=v.new_page(); vp.on('pageerror',lambda e:errs.append(str(e))); vp.goto(PUB+'/kundenportal.html'); vp.wait_for_timeout(1500)
        vp.evaluate("""(async()=>{NX.db.customers.push({id:'K-1',first:'Test',last:'Kunde',email:'kunde@test.at',status:'aktiv',role:'Kunde',pwHash:await NX.hash('Kunde-Passwort-1')});NX.save();})()"""); vp.wait_for_timeout(1000)
        c=b.new_context(); cp=c.new_page(); cp.goto(PUB+'/kundenportal.html'); cp.wait_for_timeout(1500)
        cp.fill('#le','kunde@test.at'); cp.fill('#lp','Kunde-Passwort-1'); cp.click('#av form button[type=submit]'); cp.wait_for_timeout(1800)
        chk('public: Kundenlogin funktioniert', cp.evaluate("NX.backend.role")=='customer')
        chk('public: Admin-Login serverseitig verweigert', cp.evaluate("fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'admin',user:'a',hash:'b'})}).then(r=>r.status)")==403)
        chk('public: Registrierung gespeichert', cp.evaluate("fetch('/api/db').then(r=>r.json()).then(j=>j.db.customers.length)")==1)
        # Admin-App: Einrichtung
        a=b.new_context(); ap=a.new_page(); ap.on('pageerror',lambda e:errs.append(str(e))); ap.goto(ADM+'/admin/index.html'); ap.wait_for_timeout(1500)
        chk('admin: Ersteinrichtung angezeigt', ap.locator('#sf').count()==1)
        ap.fill('#sc','CODE-ABC-123'); ap.fill('#su','chef'); ap.fill('#sp1','Sicheres-Passwort-2026'); ap.fill('#sp2','Sicheres-Passwort-2026'); ap.click('#sf button[type=submit]'); ap.wait_for_timeout(1800)
        chk('admin: eingerichtet und angemeldet', ap.evaluate("NX.backend.role")=='admin' and ap.locator('.side').count()>0)
        chk('admin: Kundenlogin hier verweigert', ap.evaluate("fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'customer',user:'kunde@test.at',hash:'x'})}).then(r=>r.status)")==403)
        chk('admin: Besucher dürfen nicht schreiben', b.new_context().new_page().request.put(ADM+'/api/db',data='{"db":{"customers":[],"invoices":[]}}',headers={'Content-Type':'application/json'}).status==403)
        chk('admin: Sicherung möglich', ap.evaluate("fetch('/api/backups',{method:'POST'}).then(r=>r.status)") in (200,409))
        chk('keine JS-Fehler', errs==[]); print(errs[:3])
        b.close()
finally:
    for q in ps: q.terminate()
    shutil.rmtree(tmp,ignore_errors=True)
print(ok,'OK',bad,'FAIL')
