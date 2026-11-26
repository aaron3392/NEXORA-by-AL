const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'assets/js/core.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
const logo = path.join(root, 'assets/images/nexora-logo-web.png');
const checks = [
  ['Offizielles Firmenlogo wird im Dokumentkopf verwendet', /class="doc-logo" src=.*assets\/images\/nexora-logo-web\.png/.test(core)],
  ['Logo-Alternative ist barrierearm beschriftet', /alt="NEXORA by AL – Digital Solutions"/.test(core)],
  ['Dokumentdesign nutzt violette Markenfarbe', /--doc-purple:\s*#7028e8/i.test(css)],
  ['Tabellenkopf ist dunkel mit weißer Schrift', /\.doc th\s*\{[^}]*background:\s*#241936[^}]*color:\s*#fff/is.test(css)],
  ['Drucklayout erhält Markenfarben', /@media print\s*\{[\s\S]*?print-color-adjust:\s*exact/i.test(css)],
  ['Logo-Datei ist vorhanden', fs.existsSync(logo)],
  ['Moderner Dokumentkopf mit klarer Typografie vorhanden', /class=\"doc-topline\"[\s\S]*?class=\"doc-heading\"/.test(core)],
  ['Rechnungsempfänger ist als eigener Abschnitt strukturiert', /class=\"doc-recipient\"/.test(core)],
  ['Summenbereich ist visuell hervorgehoben', /\.doc \.tot \.g\s*\{[^}]*background:\s*#f0e9fc/is.test(css)],
  ['Layout besitzt eine mobile Darstellung', /@media \(max-width:\s*640px\)[\s\S]*?\.doc \.doc-topline/.test(css)]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(x => !x[1]).length;
console.log(`\nErgebnis: ${checks.length - failed}/${checks.length} Tests bestanden.`);
if (failed) process.exit(1);
