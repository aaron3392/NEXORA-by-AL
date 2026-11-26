const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const index = read('index.html'), core = read('assets/js/core.js'), css = read('assets/css/public.css'), admin = read('admin/index.html');
const img = f => fs.existsSync(path.join(root, 'assets/images', f));
const checks = [
  ['Startseite nutzt das vollständige, freigestellte Hauptlogo', index.includes('nexora-logo-hero.png') && img('nexora-logo-hero.png')],
  ['Hero enthält keine Leistungskacheln', !index.includes('hero-services') && !index.includes('hero-service')],
  ['Scroll-Doppelpfeil ist aus dem Hero entfernt', !index.includes('hero-scroll')],
  ['Hero enthält die beiden CTAs Projekt anfragen und Leistungen entdecken', index.includes('Projekt anfragen') && index.includes('Leistungen entdecken')],
  ['Header nutzt ausschließlich das N-Monogramm', core.includes('nexora-symbol.png') && core.includes('nx-mark')],
  ['Header-Monogramm-Asset ist vorhanden', img('nexora-symbol.png')],
  ['Öffentliche Seiten besitzen das gemeinsame Designsystem', css.includes('NEXORA by AL – Öffentliches Designsystem') && css.includes('.nx-sec')],
  ['Administration lädt das öffentliche Stylesheet nicht und behält ihre Klasse', admin.includes('class="admin-app"') && !admin.includes('public.css')],
  ['Hero und Unterseiten sind responsive (Tablet und Smartphone)', css.includes('@media (max-width: 960px)') && css.includes('@media (max-width: 760px)') && css.includes('@media (max-width: 680px)')],
  ['Hero nutzt die eigens erstellte Hintergrundgrafik mit Planet, Bogen und Wellen', css.includes('nexora-hero-bg.jpg') && img('nexora-hero-bg.jpg') && fs.statSync(path.join(root, 'assets/images/nexora-hero-bg.jpg')).size > 100000],
  ['Footer enthält Logo, Beschreibung, Navigation, Leistungen, Kontakt und Rechtliches', ['nx-foot-brand', 'Navigation', 'Leistungen', 'Kontakt', 'impressum.html', 'datenschutz.html', 'agb.html', 'getFullYear'].every(k => core.includes(k))],
  ['Hero zeigt nur die zwei Handlungsbuttons', (index.split('</section>')[0].match(/class="btn /g) || []).length === 2]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Ergebnis: ${checks.length - failed}/${checks.length} bestanden.`);
if (failed) process.exit(1);
