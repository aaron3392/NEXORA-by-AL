from playwright.sync_api import sync_playwright
B="http://localhost:8765/admin/index.html"
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={"width":1440,"height":900}); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B); pg.wait_for_timeout(700)
    pg.fill("input[type=text],input:not([type])","admin2026"); pg.fill("input[type=password]","N123456789")
    pg.click("form button[type=submit], form .btn"); pg.wait_for_timeout(1200)
    ids=pg.eval_on_selector_all("[data-v]","e=>[...new Set(e.map(x=>x.dataset.v))]")
    print("Admin-Ansichten:",len(ids))
    bad=[]
    for i in ids:
        pg.evaluate(f"location.hash='{i}'"); pg.wait_for_timeout(350)
        n=len(pg.inner_text("#cnt").strip())
        if n<15 or errs: bad.append((i,n,list(errs))); errs.clear()
    print("Auffällig:",bad)
    pg.evaluate(f"location.hash='{ids[0]}'"); pg.wait_for_timeout(400)
    pg.screenshot(path="/tmp/nexora-admin.png")
    # Rechnungs-Dokument
    inv=[i for i in ids if 'rechnung' in i]; print(inv)
    pg.evaluate(f"location.hash='{inv[0]}'"); pg.wait_for_timeout(500)
    row=pg.query_selector("tbody tr"); 
    if row: row.click(); pg.wait_for_timeout(600); pg.screenshot(path="/tmp/nexora-rechnung_dialog.png")
    print("Fehler gesamt:",errs)
    for i in ids:
        pg.evaluate(f"location.hash='{i}'"); pg.wait_for_timeout(200)
        bad=pg.evaluate("[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
        if bad: print("Defekte Bilder in",i,bad)
    print("Bildprüfung Admin fertig")
