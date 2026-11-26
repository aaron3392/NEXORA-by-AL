/* NEXORA by AL – Regressionstests für zwei behobene Altfehler (Kontaktformular, Doppelklick-Schutz). */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const pages = fs.readFileSync(path.join(root, 'assets/js/pages.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'assets/js/core.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'kontakt.html'), 'utf8');
const checks = [
  ['Kontaktformular besitzt einen eigenen Absende-Handler (contactForm)', pages.includes('function contactForm(') && pages.includes("kind === 'kontakt' || !f.elements.service")],
  ['Kontaktnachricht wird lokal gespeichert (Quelle „Kontakt“) und über FormSubmit übergeben', pages.includes("source: 'Kontakt'") && /contactForm[\s\S]*NX\.formsubmit/.test(pages) && pages.includes("'Kontaktnachricht'")],
  ['Kontaktformular prüft Pflichtfelder und Datenschutz', /contactForm[\s\S]*first: \['req'\][\s\S]*privacy: \['req'\]/.test(pages)],
  ['Kontaktformular behält Felder und IDs unverändert', ['id="k1"', 'id="k3"', 'id="k6"', 'id="k7"', 'data-kind="kontakt"', 'id="pf"'].every(x => html.includes(x))],
  ['Doppelklick-Schutz verhindert das native Absenden (preventDefault im Sperrfall)', /NX\.guard = fn => \{[\s\S]*?if \(b\) \{[\s\S]*?preventDefault\(\)/.test(core)],
  ['Doppelklick-Sperre von 600 ms bleibt erhalten', core.includes('b = false; }, 600')]
];
let failed = 0;
for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; }
console.log(`\nErgebnis: ${checks.length - failed}/${checks.length} Tests bestanden.`);
if (failed) process.exit(1);
