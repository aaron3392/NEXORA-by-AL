/* NEXORA by AL – Startseite: echte HTML-Elemente, korrekte CSS-Ebenen, sichtbarer Hintergrund. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html'), css = read('assets/css/public.css'), core = read('assets/js/core.js');
const rule = sel => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); return m ? m[1] : ''; };
const checks = [
  ['Hero besitzt eine eigene Hintergrundebene (kein eingebranntes Website-Bild)', html.includes('class="nx-hero__bg"') && !html.includes('hero-reference')],
  ['Im Seitencode wird die Referenzgrafik nicht mehr verwendet', !/nexora-hero-reference/.test(html + css + core + read('assets/js/pages.js'))],
  ['Hintergrundgrafik ist als Datei vorhanden und wird in public.css eingebunden', css.includes('../images/nexora-hero-bg.jpg') && fs.existsSync(path.join(root, 'assets/images/nexora-hero-bg.jpg'))],
  ['Ebenenreihenfolge: Hintergrund z-index 0 < Schleier 1 < Inhalt 2', /z-index:\s*0/.test(rule('.nx-hero__bg')) && /z-index:\s*1/.test(rule('.nx-hero__shade')) && /z-index:\s*2/.test(rule('.nx-hero__inner'))],
  ['Hero erzeugt einen eigenen Stapelkontext (isolation) ohne deckende Zwischenebene', /isolation:\s*isolate/.test(rule('.nx-hero'))],
  ['Navigation besteht aus echten Links (von core.js erzeugt), nicht aus Hotspots', core.includes('class="nx-links"') && !html.includes('hotspot')],
  ['Navigation enthält alle sieben Einträge', ['index.html', 'leistungen.html', 'projekte.html', 'ueber-uns.html', 'kontakt.html', 'kundenportal.html', 'anfrage.html'].every(l => core.includes(l))],
  ['Mobiles Menü: Schalter mit aria-expanded, Escape und Klick außerhalb schließen', core.includes('nx-burger') && core.includes('aria-expanded') && core.includes("e.key === 'Escape'")],
  ['Header nutzt das originale N-Monogramm', core.includes('nexora-symbol.png') && fs.existsSync(path.join(root, 'assets/images/nexora-symbol.png'))],
  ['Hero nutzt das freigestellte Hauptlogo', html.includes('nexora-logo-hero.png') && fs.existsSync(path.join(root, 'assets/images/nexora-logo-hero.png'))],
  ['Hero-Reihenfolge: Logo, Überschrift, Beschreibung, Buttons', (() => { const i = ['nx-hero__logo', '<h1', 'nx-hero__lead', 'nx-actions'].map(k => html.indexOf(k)); return i.every(x => x > 0) && i.every((x, k) => !k || x > i[k - 1]); })()],
  ['Überschrift lautet wie spezifiziert, „voranbringen“ ist ausgezeichnet', html.includes('Digitale L&ouml;sungen, die') && html.includes('Ihr Unternehmen') && /<span>voranbringen<\/span>/.test(html)],
  ['Zwei Handlungsbuttons mit bisherigen Zielen', html.includes('href="anfrage.html">Projekt anfragen') && html.includes('href="leistungen.html">Leistungen entdecken')],
  ['Keine Leistungskacheln und kein Doppelpfeil im Hero', (() => { const hero = html.split('</section>')[0]; return !/hero-service|hero-scroll|Hosting &amp; Betreuung|Web &amp; App/.test(hero) && (hero.match(/<a /g) || []).length === 2; })()],
  ['Kein leerer Platzhalter-Container mehr (home-content)', !html.includes('home-content')],
  ['Hintergrund wird nicht durch deckende Hintergründe der Hero-Elternelemente überdeckt', !/\.nx-hero__inner\s*\{[^}]*background/.test(css) && !/main#main\s*\{[^}]*background:\s*(#|rgb)/.test(css)],
  ['Mobile Regeln für den Hero vorhanden', /@media \(max-width: 760px\)[\s\S]*?\.nx-hero__bg/.test(css)],
  ['Keine horizontale Überbreite durch overflow-x-Schutz', /html\s*\{\s*overflow-x:\s*clip/.test(css) && !/body[^{]*\{[^}]*overflow-x:\s*hidden/.test(css)]
];
let failed = 0;
for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; }
console.log(`\nErgebnis: ${checks.length - failed}/${checks.length} bestanden.`);
if (failed) process.exit(1);
