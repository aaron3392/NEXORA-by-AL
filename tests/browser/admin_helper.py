from playwright.sync_api import sync_playwright
B="http://localhost:8765/admin/index.html"
def login(pg):
    pg.goto(B); pg.wait_for_timeout(600)
    pg.fill("input[type=text],input:not([type])","admin2026"); pg.fill("input[type=password]","N123456789")
    pg.click("form button[type=submit], form .btn"); pg.wait_for_timeout(1000)
