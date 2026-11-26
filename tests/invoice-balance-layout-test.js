const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'assets/js/core.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
const checks = [
  ['Alle Rechnungsarten verwenden einen gemeinsamen Rechnungs-Summenbereich', /const invoiceTotals = type === 'invoice'[\s\S]*?body = `/.test(core)],
  ['Gesamter Rechnungsbetrag wird separat ausgewiesen', /class="invoice-balance-head"[\s\S]*?NX\.eur\(cc\.gross\)/.test(core)],
  ['Bereits bezahlte oder angerechnete Beträge werden abgezogen dargestellt', /Bereits bezahlt \/ angerechnet[\s\S]*?NX\.paid\(d\)/.test(core)],
  ['Offener Rechnungsbetrag ist die optisch hervorgehobene Hauptsumme', /class="invoice-balance-open"[\s\S]*?NX\.open\(d\)/.test(core) && /\.doc \.invoice-balance-open\s*\{[^}]*background:\s*#7028e8/is.test(css)],
  ['Zahlungsstatus und offener Betrag bleiben im Drucklayout lesbar', /@media print[\s\S]*?\.invoice-balance-open[\s\S]*?print-color-adjust:\s*exact/i.test(css)]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(x => !x[1]).length;
console.log(`\nErgebnis: ${checks.length - failed}/${checks.length} Tests bestanden.`);
if (failed) process.exit(1);
