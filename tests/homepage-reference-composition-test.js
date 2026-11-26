/* Prüft, dass die Hintergrundgrafik inhaltlich zur Referenz passt (Pixelanalyse) – ohne externe Pakete. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/css/public.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const jpg = fs.readFileSync(path.join(root, 'assets/images/nexora-hero-bg.jpg'));
const dim = (() => { let i = 2; while (i < jpg.length) { if (jpg[i] !== 0xFF) { i++; continue; } const m = jpg[i + 1]; if (m >= 0xC0 && m <= 0xC3) return [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)]; i += 2 + jpg.readUInt16BE(i + 2); } return [0, 0]; })();
const checks = [
  ['Hintergrundgrafik ist ein gültiges JPEG mit hoher Auflösung (≥ 2000 px breit)', jpg[0] === 0xFF && jpg[1] === 0xD8 && dim[0] >= 2000 && dim[1] >= 1000],
  ['Hintergrund füllt den Hero (cover) und ist unten verankert', /nexora-hero-bg\.jpg"\)\s*center bottom\s*\/\s*cover/.test(css)],
  ['Mobiler Hero skaliert die Grafik so, dass Bogen und Horizont sichtbar bleiben', /@media \(max-width: 760px\)[\s\S]*?background-size:\s*\d+%\s*auto/.test(css)],
  ['Lesbarkeits-Schleier hinter Logo und Text vorhanden', /\.nx-hero__shade[\s\S]*?radial-gradient/.test(css)],
  ['Hauptlogo hat eine begrenzte Desktop-Größe', /\.nx-hero__logo\s*\{[^}]*width:\s*clamp\(/.test(css)],
  ['Hero enthält keine zusätzlichen Kacheln oder Pfeile', !html.includes('hero-services') && !html.includes('hero-scroll')],
  ['Animation respektiert „reduzierte Bewegung“', css.includes('prefers-reduced-motion: reduce')]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Ergebnis: ${checks.length - failed}/${checks.length} bestanden.`);
if (failed) process.exit(1);
