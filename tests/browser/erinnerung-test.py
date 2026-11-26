"""Test: Anfrage mit Wunschtermin im Kalender, Erinnerungs-Mail 1 Stunde vorher (FormSubmit abgefangen, Uhrzeit simuliert), .ics-Export."""
import sys, json, datetime as dt
sys.path.insert(0,'.')
from admin_helper import login
from playwright.sync_api import sync_playwright
res=[]
def ok(n,c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n)
def at(h,m=0,d=11): return dt.datetime(2026,11,d,h,m,0)
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]; calls=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    def handler(route):
        try: calls.append(json.loads(route.request.post_data or '{}'))
        except Exception: calls.append({})
        route.fulfill(status=200,content_type='application/json',body='{"success":"true"}')
    ctx.route("https://formsubmit.co/**",handler)
    pg.clock.install(time=at(8,0)); login(pg); pg.clock.run_for(3000); pg.wait_for_timeout(300)
    # --- Anfrage mit Wunschtermin -> Kalender
    pg.evaluate("""(()=>{NX.db.inquiries.push({id:'A-9001',date:NX.today(),first:'Eva',last:'Wunsch',email:'eva@example.com',phone:'',subject:'Neue Firmenwebsite',service:'',message:'x',status:'Neu',wishDate:'2026-11-18',notes:''});
      NX.db.inquiries.push({id:'A-9002',date:NX.today(),first:'Ohne',last:'Termin',email:'o@example.com',phone:'',subject:'Ohne Wunschtermin',service:'',message:'x',status:'Neu',wishDate:'',notes:''});
      NX.db.inquiries.push({id:'A-9003',date:NX.today(),first:'Abg',last:'Lehnt',email:'a@example.com',phone:'',subject:'Abgelehnte',service:'',message:'x',status:'Abgelehnt',wishDate:'2026-11-19',notes:''}); NX.save()})()""")
    pg.evaluate("location.hash='kalender';NX.refresh()"); pg.clock.run_for(1200); pg.wait_for_timeout(600)
    cell=pg.inner_text('.nx-ax-cal-d[data-d="2026-11-18"]')
    ok('Anfrage mit Wunschtermin: Eintrag „Fertig bis: …“ am Wunschdatum', 'Fertig bis: Neue Firmenwebsite' in cell)
    ok('Anfrage ohne Wunschtermin / abgelehnte Anfrage: kein Eintrag', 'Ohne Wunschtermin' not in pg.inner_text('.nx-ax-cal-mg') and 'Abgelehnte' not in pg.inner_text('#cnt'))
    pg.click('.nx-ax-cal-d[data-d="2026-11-18"] .nx-ax-cal-ev:has-text("Fertig bis")'); pg.wait_for_timeout(300)
    ok('Eintrag zeigt Kunde/Anfrage und „Öffnen“ zu Anfragen', 'Eva Wunsch' in pg.inner_text('.md') and pg.locator('.md [data-open]').count()==1); pg.click('.md [data-open]'); pg.wait_for_timeout(500)
    ok('„Öffnen“ führt zu Anfragen', pg.evaluate("location.hash")=='#anfragen')
    pg.evaluate("location.hash='kalender';NX.refresh()"); pg.clock.run_for(1200); pg.wait_for_timeout(500)
    pg.click('[data-f=anfrage]'); pg.wait_for_timeout(300)
    ok('Filter „Anfragen“ blendet Fertigstellungstermine aus', 'Fertig bis' not in pg.inner_text('.nx-ax-cal-mg')); pg.click('[data-f=anfrage]'); pg.wait_for_timeout(200)
    # --- Erinnerungen
    # ohne Adresse: keine Mail, Hinweis
    pg.evaluate("NX.db.settings.formsubmit='';NX.db.events=[{id:'E-T1',title:'Kundentermin',date:'2026-11-11',allDay:false,start:'14:00',end:'15:00',color:'blue',note:'Mia'}];NX.save()")
    pg.clock.run_for(5*3600*1000+60*1000)  # 13:01
    pg.wait_for_timeout(500)
    ok('Ohne FormSubmit-Adresse wird nichts gesendet', len(calls)==0)
    pg.evaluate("NX.db.settings.formsubmit='ich@example.com';NX.save()"); pg.clock.run_for(11*60*1000); pg.wait_for_timeout(700)  # 13:12 > Fehlversuchs-Pause egal (nichts markiert)
    ok('Mit Adresse: genau 1 Erinnerungs-Mail ab 13:00 (1 Stunde vor 14:00)', len(calls)==1 and 'Kundentermin' in calls[0].get('_subject','') and '14:00' in calls[0].get('_subject',''))
    ok('Mail enthält Datum, Zeit und Details', 'Mittwoch, 11. November 2026' in calls[0].get('Datum','') and '14:00' in calls[0].get('Zeit','') and calls[0].get('Details')=='Mia')
    pg.clock.run_for(20*60*1000); pg.wait_for_timeout(500)
    ok('Keine doppelte Mail für denselben Termin', len(calls)==1)
    # Termin später (16:00): vor 15:00 keine Mail, ab 15:00 eine
    pg.evaluate("NX.db.events.push({id:'E-T2',title:'Abendtermin',date:'2026-11-11',allDay:false,start:'16:00',end:'',color:'green',note:''});NX.save()")
    pg.clock.run_for(40*60*1000); pg.wait_for_timeout(400)   # 14:13 -> noch nicht
    ok('Vor dem Zeitpunkt (1 Std. vorher) keine Mail', len(calls)==1)
    pg.clock.run_for(50*60*1000); pg.wait_for_timeout(700)   # 15:03
    ok('Zweiter Termin: Mail um 15:00 (1 Std. vor 16:00)', len(calls)==2 and 'Abendtermin' in calls[1].get('_subject',''))
    # Termin ist schon vorbei -> keine nachträgliche Mail
    pg.evaluate("NX.db.events.push({id:'E-T3',title:'Vorbei',date:'2026-11-11',allDay:false,start:'09:00',end:'10:00',color:'red',note:''});NX.save()")
    pg.clock.run_for(2*60*1000); pg.wait_for_timeout(400)
    ok('Vergangene Termine lösen keine Mail aus', len(calls)==2)
    # Wunschtermin (ganztägig) -> Mail um 08:00 des Tages
    pg.clock.set_system_time(at(7,30,18)); pg.clock.run_for(60*1000); pg.wait_for_timeout(300)
    ok('Wunschtermin: vor 08:00 noch keine Mail', len(calls)==2)
    pg.clock.run_for(35*60*1000); pg.wait_for_timeout(800)
    ok('Wunschtermin: Mail am Morgen des Fertigstellungstermins', len(calls)==3 and 'Fertig bis: Neue Firmenwebsite' in calls[2].get('_subject','') )
    # Nach Neuladen keine Wiederholung
    sent=pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('nexora_cal_reminders')).sent).length")
    ok('Versandte Erinnerungen werden gemerkt (3 Einträge)', sent==3)
    # Mail-Protokoll
    ok('Versand im Mail-Protokoll vermerkt', pg.evaluate("NX.db.mails.filter(m=>m.kind==='Termin-Erinnerung').length")==3)
    # .ics
    pg.evaluate("location.hash='kalender';NX.refresh()"); pg.clock.run_for(1200); pg.wait_for_timeout(500)
    with pg.expect_download() as d: pg.click('[data-ics]')
    ics=open(d.value.path(),encoding='utf8').read()
    print('   VEVENT:',ics.count('BEGIN:VEVENT'),'VALARM:',ics.count('BEGIN:VALARM'))
    ok('.ics: gültiger Aufbau (VCALENDAR, Termine mit VALARM)', ics.startswith('BEGIN:VCALENDAR') and ics.count('BEGIN:VEVENT')==ics.count('END:VEVENT')==ics.count('BEGIN:VALARM')>=4 and ics.rstrip().endswith('END:VCALENDAR'))
    ok('.ics: Terminerinnerung 1 Stunde vorher, Zeiten korrekt', 'TRIGGER:-PT1H' in ics and 'DTSTART:20261111T140000' in ics and 'DTEND:20261111T150000' in ics and 'SUMMARY:Kundentermin' in ics)
    ok('.ics: Wunschtermin ganztägig mit Erinnerung um 08:00', 'DTSTART;VALUE=DATE:20261118' in ics and 'TRIGGER:PT8H' in ics and 'Fertig bis: Neue Firmenwebsite' in ics)
    ok('.ics: Dateiname nexora-kalender-….ics', d.value.suggested_filename.startswith('nexora-kalender-') and d.value.suggested_filename.endswith('.ics'))
    ok('Keine JS-Fehler', not errs); print(errs)
    # Mobil: Export-Knopf sichtbar, kein Quer-Scroll
    m=br.new_page(viewport={'width':390,'height':844}); login(m); m.evaluate("location.hash='kalender'"); m.wait_for_timeout(900)
    ok('Mobil: Export-Knopf sichtbar, kein seitliches Scrollen', m.locator('[data-ics]').is_visible() and m.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    br.close()
print(f"\nErgebnis: {sum(res)}/{len(res)}"); sys.exit(0 if all(res) else 1)
