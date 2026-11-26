const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/css/public.css'), 'utf8');
const pages = ['index.html', 'leistungen.html', 'projekte.html', 'ueber-uns.html', 'kontakt.html', 'anfrage.html', 'kundenportal.html', 'impressum.html', 'datenschutz.html', 'agb.html'];
const txt = p => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, total = 0;
function test(name, fn) { total++; let ok = false; try { ok = fn(); } catch (e) { } console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) pass++; }
test('Alle öffentlichen Seiten laden style.css und danach public.css', () => pages.every(p => { const s = txt(p); return s.includes('assets/css/style.css') && s.indexOf('assets/css/public.css') > s.indexOf('assets/css/style.css'); }));
test('Alle öffentlichen Seiten tragen die Klasse nx-public und den nx-Header', () => pages.every(p => txt(p).includes('class="nx-public') && txt(p).includes('class="nx-hdr"')));
test('Öffentliche Karten erhalten Glass-/Neon-Styling', () => css.includes('.nx-card') && css.includes('backdrop-filter') && css.includes('box-shadow'));
test('Kontakt- und Anfrageformulare erhalten einheitliche dunkle Eingabefelder mit Fokus-Effekt', () => css.includes('body.nx-public form.card') && css.includes('textarea:focus') && css.includes('--nx-neon'));
test('Administrationsseiten laden public.css nicht', () => ['admin/index.html', 'admin/verrechnung/index.html', 'admin/zeiterfassung/index.html'].every(p => !txt(p).includes('public.css')));
test('Alle Regeln sind auf öffentliche Klassen begrenzt (kein .admin-app, kein globales .hdr/.nav)', () => !css.includes('.admin-app') && !/(^|\n)\.hdr\b/.test(css) && !/(^|\n)\.nav\b/.test(css));
test('Responsive Darstellung ist enthalten', () => css.includes('@media (max-width: 680px)') && css.includes('@media (max-width: 1040px)'));
test('Jede öffentliche Seite hat Header- und Footer-Container', () => pages.every(p => txt(p).includes('id="hdr"') && txt(p).includes('id="ftr"')));
console.log(`Ergebnis: ${pass}/${total} Tests bestanden.`);
if (pass !== total) process.exit(1);
