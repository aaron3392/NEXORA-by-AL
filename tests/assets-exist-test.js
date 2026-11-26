/* NEXORA by AL – alle im Code referenzierten Bilddateien müssen existieren. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['referenz', 'tests', 'node_modules'].includes(f.name)) walk(p); } else if (/\.(js|css|html)$/.test(f.name)) files.push(p); } })(root);
const missing = new Set(); let refs = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(?:assets\/images\/|\.\.\/images\/)([A-Za-z0-9_.-]+\.(?:png|jpe?g|svg|webp|gif))/g)) { refs++; if (!fs.existsSync(path.join(root, 'assets/images', m[1]))) missing.add(path.relative(root, f) + ' → ' + m[1]); }
}
missing.forEach(m => console.log('FAIL fehlt: ' + m));
console.log(`${missing.size ? 'FAIL' : 'PASS'} ${refs} Bildverweise geprüft, ${missing.size} fehlen`);
console.log(`\nErgebnis: ${missing.size ? 0 : 1}/1 Tests bestanden.`);
if (missing.size) process.exit(1);
