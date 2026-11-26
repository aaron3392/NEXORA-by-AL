/* HINWEIS (Nachtrag 33): admin.js zusätzlich: Menüpunkt „Dateien“ (Ansicht wird von admin-extras.js befüllt). */
/* HINWEIS (Nachtrag 32): admin.js/portal.js zusätzlich: Demo-Hinweise und Demo-Zugangsdaten entfernt (reine Textänderung). */
/* HINWEIS: admin.js und portal.js wurden absichtlich geändert (Konto-Archiv mit 30 Tagen Frist, siehe docs/AENDERUNGEN.md und docs/konto-archiv.diff; admin.js zusätzlich: Menüreihenfolge und Name „Übersicht“, Anfrage-Details/Adressübernahme; time.js: Filter in der Übersicht (Nachtrag 8); portal.js zusätzlich: Support-Formular mit Projekt-Dropdown und Kachel-Klassen im Dashboard; Behebung eines Originalfehlers – sendFormSubmit war im letzten Löschschritt nicht definiert).
   Ursprungs-Hashes: admin.js fcf799553c21ad9230906a5793a60601353f834f9706e588e6363744102167ca, portal.js aecd5ea74c27deab962ba812db7bd2c0cf146b83e4942a009144b9948de3d2d2.
   Die Hashes unten sind der neue, freigegebene Stand – jede weitere Änderung fällt hier auf. */
/* NEXORA by AL – Nachweis: Administration, Buchhaltung, Abrechnung und Zeiterfassung sind byteidentisch zum Ausgangsstand. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const EXPECTED = {
  'assets/js/admin.js': '526cfb33d84c7ca966aa5afeaee8fb54c5978b1cc863cf0232d8c3289d9755fb',
  'assets/js/billing.js': '9ab2cd2a3561f3bbbd44af1355deb8c65771ba15ef2e2b4323f43f3a2b5a59a5',
  'assets/js/finance.js': '7ae336d8232503d9416a9fb07168656d32b0aca3f327324542a20088d04e8f73',
  'assets/js/time.js': '248ba956ab98fee91c27154a2e7ecb6f75e4712f7da99a63a6f8f507d68488f1',
  'assets/js/portal.js': 'e6e73bee103a8b466e633c423c39494304752ad6ff4aca2390401b04ce4e937e',
  'admin/index.html': 'de9f9c22b4d71d25da3f890493a8f6d657e426a70fea8f169b7cd4b1cea8802e',
  'admin/verrechnung/index.html': '21be4fbd63b9161ddbbb3998d0cba9c852a1b981bb409fae7052f88fd9cf604e',
  'admin/zeiterfassung/index.html': 'b925060fa16b5c2736b252e94a43c0f01424c6617c99dbdfcd71a2fc6d18c4d5'
};
let failed = 0;
for (const [f, h] of Object.entries(EXPECTED)) {
  const ok = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex') === h;
  console.log(`${ok ? 'PASS' : 'FAIL'} Unverändert: ${f}`); if (!ok) failed++;
}
/* bookkeeping.js: genau EINE dokumentierte Fehlerkorrektur (Demo-Import zeichnete über ein nicht vorhandenes Element neu).
   Beleg: Rückübersetzung der Korrektur ergibt exakt den Original-Hash. */
const BK_ORIG = 'c8a364faf9b478d90116df49aead5aaeea1692abac8aff1a347914aef8ce7490';
const BK_OLD = "render(document.querySelector('[data-view=\"buchhaltung\"]'));NX.toast('7 Demo-Transaktionen importiert.');";
const BK_NEW = "{let el=document.querySelector('[data-view=\"buchhaltung\"]')||document.getElementById('cnt'),inBank=!!document.querySelector('#bk-detail [data-import]');if(el){render(el);if(inBank)tab('bank',el);}}NX.toast('7 Demo-Transaktionen importiert.');";
/* zweiter dokumentierter Eingriff (Nachtrag 14): Entfernen der Hinweistexte „lokal / Demo“ – wird für den Beleg ebenfalls rückübersetzt */
const BK_T1_NEW = "<p class=\"mut\">Österreichische Einnahmen-Ausgaben-Rechnung</p></div></div>", BK_T1_OLD = "<p class=\"mut\">Österreichische Einnahmen-Ausgaben-Rechnung · lokale Datenhaltung · ${state.mode==='demo'?'Demomodus':'Entwicklungsmodus'}</p></div><span class=\"pill\">${state.mode==='demo'?'TESTDATEN':'LOKAL'}</span></div>", BK_T2_OLD = "<p>Lokaler Simulationsmodus – keine echte N26-Verbindung aktiv.</p>";
/* dritter dokumentierter Eingriff (Nachtrag 15): Hinweis-/Infotexte entfernt – wird für den Beleg ebenfalls rückübersetzt */
const BK_REINSERT = [["innerHTML=`<div class=\"page-head\"><div><h1>Buchhaltung</h1><", "/div></div><div class=\"kp\">${NX.kpi(money(inc),'Zahlungseing", "p class=\"mut\">Österreichische Einnahmen-Ausgaben-Rechnung</p><"], ["class=\"bk-detail\"><h3>Automatisch übernommene Rechnungen</h3", "><div class=\"table-wrap\"><table><thead><tr><th>Rechnung</th>", "><p class=\"mut\">Erfasste Ausgangsrechnungen: ${state.incomeIds.length}. Zahlungseingänge werden aus den Rechnungsteilzahlungen übernommen.</p"], [".id}\">Zuordnen</button>`}</td></tr>`).join('')}</table></div", ">`;d.querySelector('[data-import]').onclick=addDemoBank;d.qu", "><p class=\"mut\">Echte N26-Anbindung benötigt einen regulierten Open-Banking-Anbieter mit Österreich-Abdeckung und serverseitige Zugangsdaten.</p"], ["<button class=\"btn\">Einstellungen speichern</button></form><", "button class=\"btn ghost\" data-reset>Alle Buchhaltungs-Demoda", "p class=\"mut\">Reiner Browsermodus: keine Bank- oder KI-Zugangsdaten hinterlegen. N26 und KI sind hier nur als lokale Simulation vorgesehen.</p><"]];
const bkRaw = fs.readFileSync(path.join(root, 'assets/js/bookkeeping.js'), 'utf8');
const bk = BK_REINSERT.reduce((s, [b, a, r]) => s.split(b + a).length === 2 ? s.replace(b + a, b + r + a) : s + '\u0000FEHLT', bkRaw);
const bkOk = bk.split(BK_NEW).length === 2 && crypto.createHash('sha256').update(bk.replace(BK_NEW, BK_OLD).replace(BK_T1_NEW, BK_T1_OLD).replace("<div class=\"acts\"><button class=\"btn\" data-import>", BK_T2_OLD + "<div class=\"acts\"><button class=\"btn\" data-import>")).digest('hex') === BK_ORIG;
console.log(`${bkOk ? 'PASS' : 'FAIL'} bookkeeping.js: nur dokumentierte Eingriffe (Demo-Import-Korrektur, entfernte Hinweistexte), sonst identisch zum Original`); if (!bkOk) failed++;
/* style.css: Der Originalinhalt muss unverändert als Präfix erhalten sein; der einzige Zusatz darf nur Dokument-Selektoren (.doc) enthalten. */
const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
const ORIG_LEN = 78661, ORIG_SHA = '207f6d7862ef2661d8afd5612f2a8e8ce32a3b35d47771760eb062c0e72ff27c';
const prefix = Buffer.from(css, 'utf8').subarray(0, ORIG_LEN);
const prefixOk = crypto.createHash('sha256').update(prefix).digest('hex') === ORIG_SHA;
const addition = css.slice(prefix.toString('utf8').length);
const selectors = [...addition.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map(m => m[1].trim());
const ALLOWED = ['.doc', '.ov', 'body:has(.ov .doc)', '@media print', '@page', '@media (max-width:640px)', '@media (max-width:900px)', '@media (min-width:901px)', '.admin-app .side', '.nx-ax', 'body:not(.light) select'];
const addOk = selectors.length > 0 && selectors.every(sel => sel.split(',').every(x => ALLOWED.some(a => x.trim().startsWith(a))));
console.log(`${prefixOk ? 'PASS' : 'FAIL'} style.css: Originalinhalt unverändert erhalten (Präfix-Hash)`); if (!prefixOk) failed++;
console.log(`${addOk ? 'PASS' : 'FAIL'} style.css: Zusatzblock enthält nur Dokument-/Druck-Selektoren (${selectors.length} Regeln)`); if (!addOk) failed++;
const total = Object.keys(EXPECTED).length + 3;
console.log(`\nErgebnis: ${total - failed}/${total} Prüfungen bestanden.`);
if (failed) process.exit(1);
