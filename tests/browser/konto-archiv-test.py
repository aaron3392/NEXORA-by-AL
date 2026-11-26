"""Browser-Test: Konto-Archiv mit 30 Tagen Frist (Admin und Kunde). Voraussetzung: http://localhost:8765/ läuft."""
import re, json
from playwright.sync_api import sync_playwright
B = "http://localhost:8765/"
res = []
def ok(n, c): res.append(bool(c)); print(("PASS " if c else "FAIL ") + n)
DAY = 864e5
def admin_login(pg):
    pg.goto(B + "admin/index.html"); pg.wait_for_timeout(500)
    pg.fill("input[type=text],input:not([type])", "admin2026"); pg.fill("input[type=password]", "N123456789")
    pg.click("form button[type=submit], form .btn"); pg.wait_for_timeout(900)
def portal_login(pg, email="mia.demo@example.com", pw="Demo12345"):
    pg.goto(B + "kundenportal.html"); pg.wait_for_timeout(600)
    pg.fill("input[type=email]", email); pg.fill("input[type=password]", pw)
    pg.click("form button[type=submit], form .btn"); pg.wait_for_timeout(1200)
def confirm_modal(pg):
    pg.locator(".ov .btn:not(.ghost)").last.click(); pg.wait_for_timeout(500)
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 1440, "height": 1000}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    sent = []
    def fs_route(r):
        sent.append(r.request.post_data or ""); r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True}))
    ctx.route("**/formsubmit.co/**", fs_route)
    # --- 1) Admin archiviert Benutzer ---
    admin_login(pg); pg.evaluate("location.hash='user'"); pg.wait_for_timeout(700)
    pg.locator("#tb tr[data-id='K-1001']").click(); pg.wait_for_timeout(500)
    ok("Button heißt „Benutzer archivieren (30 Tage)“", "archivieren (30 Tage)" in pg.inner_text(".ov"))
    pg.click("[data-delete]"); pg.wait_for_timeout(500); confirm_modal(pg); pg.wait_for_timeout(500)
    ok("Archivierter Benutzer verschwindet aus der Hauptliste", pg.locator("#tb tr[data-id='K-1001']").count() == 0)
    ok("Archiv-Bereich zeigt Konto mit Frist (30 Tage)", "Archiv (1)" in pg.inner_text(".nx-ax-arch") and "in 30 Tagen" in pg.inner_text(".nx-ax-arch"))
    d = pg.evaluate("(()=>{const c=NX.db.customers.find(x=>x.id==='K-1001');return {s:c.status,by:c.archivedBy,left:Math.round((c.restoreUntil-Date.now())/864e5),exists:NX.db.invoices.some(i=>i.customerId==='K-1001')}})()")
    ok("Status archiviert, von Administrator, 30 Tage Frist, Rechnungen bleiben", d["s"] == "loeschung_vorgemerkt" and d["by"] == "Administrator" and d["left"] == 30 and d["exists"])
    # --- 2) Kunde kann sich nicht anmelden / nicht selbst wiederherstellen ---
    c = ctx.new_page(); c.on("pageerror", lambda e: errs.append(str(e)))
    portal_login(c)
    ok("Administrator-archiviertes Konto: Anmeldung gesperrt, kein Wiederherstellen-Angebot", "deaktiviert" in c.inner_text("body") and c.locator(".ov").count() == 0)
    # --- 3) Admin stellt wieder her ---
    pg.bring_to_front(); pg.click("[data-ax-restore='K-1001']"); pg.wait_for_timeout(400); confirm_modal(pg); pg.wait_for_timeout(600)
    ok("Wiederherstellung: Konto wieder in der Liste, Archiv leer", pg.locator("#tb tr[data-id='K-1001']").count() == 1 and pg.locator(".nx-ax-arch").count() == 0)
    portal_login(c); ok("Wiederhergestelltes Konto kann sich anmelden", c.locator(".side [data-v]").count() > 0)
    # --- 4) Kunde löscht selbst (Passwort, Code, Bestätigung) ---
    c.click(".side [data-v='profil']"); c.wait_for_timeout(500); c.click("#delete-account"); c.wait_for_timeout(400)
    c.fill("#delete-current", "Demo12345"); c.click("#delete-password-form button[type=submit]"); c.wait_for_timeout(1200)
    code = None
    for body in sent:
        m = re.search(r"Sicherheitscode[^0-9]{1,12}(\d{6})", body)
        if m: code = m
    ok("Sicherheitscode wird per E-Mail (FormSubmit) versendet", bool(code))
    c.fill("#delete-code", code.group(1)); c.click("#delete-code-form button[type=submit]"); c.wait_for_timeout(1000)
    ok("Schritt 3 nennt 30 Tage", "30 Tage" in c.inner_text(".ov"))
    c.click("[data-delete-now]"); c.wait_for_timeout(1800)
    d = c.evaluate("(()=>{const x=NX.db.customers.find(x=>x.id==='K-1001');return {s:x.status,by:x.archivedBy,left:Math.round((x.restoreUntil-Date.now())/864e5)}})()")
    ok("Kunden-Löschung: archiviert, von Kunde, 30 Tage", d["s"] == "loeschung_vorgemerkt" and d["by"] == "Kunde" and d["left"] == 30)
    # Kunde kann sich selbst wiederherstellen
    portal_login(c); ok("Kunde bekommt Wiederherstellen-Angebot (30-tägige Frist)", "30-tägigen" in c.inner_text(".ov"))
    confirm_modal(c); c.wait_for_timeout(800); ok("Kunde stellt Konto selbst wieder her", c.locator(".side [data-v]").count() > 0)
    # --- 5) Ablauf der Frist: erst dann endgültig gelöscht ---
    pg.bring_to_front(); pg.evaluate("location.hash='user'"); pg.wait_for_timeout(500)
    pg.evaluate("(()=>{const x=NX.db.customers.find(x=>x.id==='K-1002');NX.accounts.archive(x,'Administrator');NX.db.customers.find(x=>x.id==='K-1003');NX.save();})()")
    pg.reload(); pg.wait_for_timeout(900)
    ok("Innerhalb der 30 Tage bleibt das Konto erhalten", pg.evaluate("NX.db.customers.some(c=>c.id==='K-1002')"))
    pg.evaluate("(()=>{const x=NX.db.customers.find(x=>x.id==='K-1002');x.restoreUntil=Date.now()-1000;NX.save();})()")
    pg.reload(); pg.wait_for_timeout(900)
    ok("Nach Ablauf der Frist wird das Konto endgültig gelöscht", not pg.evaluate("NX.db.customers.some(c=>c.id==='K-1002')"))
    ok("Geschäftsdaten (Projekte/Rechnungen) bleiben erhalten", pg.evaluate("NX.db.projects.some(p=>p.customerId==='K-1002')||NX.db.invoices.length>0"))
    ok("Keine JS-Fehler", not errs)
print(f"Ergebnis: {sum(res)}/{len(res)} bestanden.")
raise SystemExit(0 if all(res) else 1)
