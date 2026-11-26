"""Test: Button entfernt, automatisches Backup 05:00/19:00 (Uhrzeit simuliert), altes Backup wird nach dem neuen gelöscht, Ordner-Datei, Wiederherstellen."""
import sys, json, datetime as dt
sys.path.insert(0,'.')
from admin_helper import login
from playwright.sync_api import sync_playwright
res=[]
def ok(n,c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n)
SNAP="(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('nexora-backup',1);q.onupgradeneeded=()=>{q.result.createObjectStore('snap');q.result.createObjectStore('cfg')};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});const ks=await new Promise(r=>{const q=db.transaction('snap').objectStore('snap').getAllKeys();q.onsuccess=()=>r(q.result)});db.close();return ks})()"
def at(h,m=0,day=11): return dt.datetime(2026,11,day,h,m,0)
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time=at(4,0)); login(pg); pg.wait_for_timeout(300)
    pg.clock.run_for(3000); pg.wait_for_timeout(500)
    ok('Dashboard ohne Button „Jetzt sichern“', pg.locator('[data-ax-backup]').count()==0 and 'Jetzt sichern' not in pg.inner_text('#cnt'))
    k1=pg.evaluate(SNAP); m1=pg.evaluate("NX.autoBackup.meta()")
    ok('Erstes Backup beim ersten Öffnen angelegt (genau 1 Stand)', len(k1)==1 and m1 and m1['size']>1000)
    # 04:00 -> 04:59: kein neues
    pg.clock.run_for(59*60*1000); pg.wait_for_timeout(400)
    ok('Vor 05:00 kein weiteres Backup', pg.evaluate(SNAP)==k1)
    # 05:01 -> neues, altes gelöscht
    pg.clock.run_for(2*60*1000); pg.wait_for_timeout(600)
    k2=pg.evaluate(SNAP)
    ok('Um 05:00 neues Backup, altes gelöscht (immer genau 1)', len(k2)==1 and k2!=k1)
    # 12:00 kein neues
    pg.clock.run_for(7*3600*1000); pg.wait_for_timeout(400)
    ok('Zwischen 05:00 und 19:00 kein Backup', pg.evaluate(SNAP)==k2)
    # 19:01
    pg.clock.run_for(7*3600*1000+60*1000); pg.wait_for_timeout(600)
    k3=pg.evaluate(SNAP)
    ok('Um 19:00 neues Backup, altes gelöscht', len(k3)==1 and k3!=k2)
    # Nacht -> nächster Tag 05:00
    pg.clock.run_for(10*3600*1000); pg.wait_for_timeout(600)
    k4=pg.evaluate(SNAP); ok('Nächster Tag 05:00: wieder genau 1 Backup', len(k4)==1 and k4!=k3)
    # Inhalt prüfen
    same=pg.evaluate("""(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('nexora-backup',1);q.onsuccess=()=>r(q.result)});const rec=await new Promise(r=>{const o=db.transaction('snap').objectStore('snap');const q=o.getAllKeys();q.onsuccess=()=>{const g=o.get(q.result[0]);g.onsuccess=()=>r(g.result)}});const d=JSON.parse(rec.text);return d.app==='NEXORA by AL'&&d.data.customers.length===NX.db.customers.length&&d.data.invoices.length===NX.db.invoices.length&&!!d.data.settings})()""")
    ok('Backup enthält Kunden, Rechnungen, Einstellungen', same)
    # Einstellungen-Panel (Sitzung kann nach 1 simuliertem Tag abgelaufen sein)
    pg.clock.resume() if hasattr(pg.clock,'resume') else None
    if pg.locator('input[type=password]').count(): login(pg)
    pg.evaluate("location.hash='backup';NX.refresh()"); pg.clock.run_for(1500); pg.wait_for_timeout(900)
    ok('Panel „Automatisches Backup“ in Einstellungen', pg.locator('.nx-ax-abk').count()==1 and '05:00' in pg.inner_text('.nx-ax-abk') and '19:00' in pg.inner_text('.nx-ax-abk'))
    ok('Panel zeigt letztes Backup und nächsten Termin', 'Letztes Backup' in pg.inner_text('.nx-ax-abk') and 'Nächster Termin' in pg.inner_text('.nx-ax-abk'))
    with pg.expect_download() as d: pg.click('[data-abk=dl]')
    ok('Letztes Backup herunterladbar (gültiges JSON)', d.value.suggested_filename.startswith('nexora-auto-backup-') and 'customers' in json.load(open(d.value.path())).get('data',{}))
    # Wiederherstellen
    n0=pg.evaluate("NX.db.customers.length"); pg.evaluate("NX.db.customers.pop();NX.save()")
    pg.click('[data-abk=restore]'); pg.wait_for_timeout(300); pg.click('[data-y]'); pg.wait_for_timeout(1800)
    n1=pg.evaluate("NX.db.customers.length")
    ok(f'Wiederherstellen bringt gelöschten Kunden zurück ({n0-1} → {n1})', n1==n0)
    ok('Keine JS-Fehler', not errs); print(errs)
    # ---- Ordner-Test mit simuliertem Ordner (OPFS) ----
    ctx2=br.new_context(viewport={'width':1440,'height':900}); q=ctx2.new_page(); e2=[]
    q.on('pageerror',lambda e:e2.append(str(e)))
    q.add_init_script("""(()=>{const store=new Map();window.__bk=store;
const dir={name:'TestOrdner',queryPermission:async()=>'granted',requestPermission:async()=>'granted',
 getFileHandle:async(n,o)=>{if(!store.has(n)){if(!(o&&o.create))throw new Error('nf');store.set(n,'')}return{createWritable:async()=>{let b='';return{write:async x=>{b+=x},close:async()=>{store.set(n,b)}}},getFile:async()=>({text:async()=>store.get(n)})}},
 removeEntry:async n=>{store.delete(n)}};
window.showDirectoryPicker=async()=>dir})();""")
    q.clock.install(time=at(6,0)); login(q); q.clock.run_for(3000); q.wait_for_timeout(500)
    q.evaluate("location.hash='backup';NX.refresh()"); q.clock.run_for(1500); q.wait_for_timeout(900)
    ok('Ordner-Auswahl wird angeboten', q.locator('[data-abk=dir]').count()==1)
    q.click('[data-abk=dir]'); q.wait_for_timeout(1200)
    files=lambda: q.evaluate("[...window.__bk.keys()]")
    f1=files(); ok('Datei im Ordner angelegt', len(f1)==1 and f1[0].startswith('nexora-auto-backup-') and f1[0].endswith('.json'))
    q.clock.run_for(14*3600*1000); q.wait_for_timeout(1000)   # 20:00 -> 19:00-Termin
    f2=files(); ok('19:00: neue Datei, alte Datei gelöscht (genau 1)', len(f2)==1 and f2!=f1)
    ok('Keine JS-Fehler (Ordner)', not e2); print(e2)
    # ---- Mobil ----
    m=br.new_page(viewport={'width':390,'height':844}); login(m); m.evaluate("location.hash='backup'"); m.wait_for_timeout(900)
    ok('Mobil: Panel ohne Quer-Scroll', m.evaluate("document.documentElement.scrollWidth<=innerWidth") and m.locator('.nx-ax-abk').is_visible())
    br.close()
print(f"\nErgebnis: {sum(res)}/{len(res)}"); sys.exit(0 if all(res) else 1)
