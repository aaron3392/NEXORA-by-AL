/* NEXORA by AL – Regressionstests für lokale Funktionen. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const billing = read('assets/js/billing.js');
const admin = read('assets/js/admin.js');
const finance = read('assets/js/finance.js');
const core = read('assets/js/core.js');
const portal = read('assets/js/portal.js');
const pages = read('assets/js/pages.js');
const checks = [
  ['Monatliche Verträge sind als eigene Admin-Unterseite erreichbar', admin.includes("['verrechnung-vertraege', 'Monatliche Verträge']") && admin.includes("'verrechnung-vertraege': NX.financeViews.vertraege")],
  ['Vertragsverwaltung ist auch in der Finanzmodul-Registry vorhanden', finance.includes('vertraege: NX.bill.subscriptionsView')],
  ['Monatsvertrag kann direkt aus einem monatlich zahlenden Projekt angelegt werden', admin.includes('data-subscription') && admin.includes('NX.bill.createSubscriptionFromProject(p, done)') && billing.includes('B.createSubscriptionFromProject')],
  ['Verträge werden lokal in der Datenstruktur initialisiert', core.includes('subscriptions: []')],
  ['Vertrag speichert Kunde, Projekt, Paket, Netto-Monatspreis, USt und Fälligkeit', billing.includes('customerId:x.customerId') && billing.includes('amount:NX.cents(x.amount)') && billing.includes('nextDate:x.nextDate') && billing.includes('vat:Math.max(0,+x.vat||0)')],
  ['Monatsrechnung wird als Entwurf mit Abrechnungszeitraum erstellt', billing.includes("kind:'Monatsrechnung'") && billing.includes('billingPeriod:period') && billing.includes('draft:true')],
  ['Bereits erzeugte Abrechnungsmonate werden gegen Duplikate geschützt', billing.includes('sub.generatedPeriods.includes(period)')],
  ['Nächster Abrechnungstermin wird monatsweise fortgeschrieben', billing.includes('sub.nextDate=addMonth(sub.nextDate)')],
  ['Pausierte Verträge können keine Rechnung erzeugen', billing.includes("sub.status !== 'Aktiv'")],
  ['Monatlicher Abrechnungszeitraum erscheint auf dem Rechnungsdokument', core.includes("'Abrechnungszeitraum'") && core.includes('NX.esc(d.billingPeriod)')],
  ['Monatlicher Abrechnungszeitraum wird in der E-Mail-Vorbereitung erwähnt', billing.includes('Abrechnungszeitraum: ' + "' + d.billingPeriod")],
  ['Kundenanfragen speichern die gewählte Zahlungs- und Hostingvariante', pages.includes('paymentModel: x.paymentModel') && pages.includes('hostingModel: x.hostingModel')],
  ['Kontolöschablauf bleibt im Kundenportal enthalten', portal.includes('/account/deletion/request') && portal.includes('restoreUntil')]
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nErgebnis: ${checks.length - failed}/${checks.length} Tests bestanden.`);
if (failed) process.exitCode = 1;
