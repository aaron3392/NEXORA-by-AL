/*
 * NEXORA by AL – statische Integrationstests für Projektanfragen.
 * Ausführen mit: node tests/project-configurator-test.js
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = read('assets/js/pages.js');
const admin = read('assets/js/admin.js');
const billing = read('assets/js/billing.js');
const html = read('anfrage.html');
const core = read('assets/js/core.js');
const services = [
    'Individuelles Webdesign', 'Responsive Unternehmenswebsites', 'Webentwicklung und Webanwendungen',
    'Kundenportale', 'Admin-Dashboards und Verwaltungssysteme', 'Individuelle Softwarelösungen',
    'Mobile Apps für iOS und Android', 'Automatisierungen und digitale Geschäftsprozesse',
    'Individuelle Vertriebs- und Unternehmenssysteme', 'Hosting und technische Betreuung',
    'Wartung, Updates und Support'
];
const groups = pages.split('const groups = {', 2)[1].split('\n        };', 1)[0];
const tests = [
    ['Alle 11 angebotenen Leistungen besitzen eigene Detailfragen', services.every(s => groups.includes(`'${s}':`))],
    ['Monatliche Zahlung blendet die Paketauswahl ein und macht sie verpflichtend', pages.includes("f.elements.paymentModel.value === 'monatlich'") && pages.includes('packageSelect.required = isMonthly')],
    ['Paketoptionen behalten den Originalindex aus den Einstellungen', pages.includes('packages.map((p, index) => p && p.name') && pages.includes('value="${index}"')],
    ['Ausgewähltes Paket wird mit Beschreibung, Preis und Support gespeichert', pages.includes('packageDescription: selectedPackage ? selectedPackage.desc') && pages.includes('packageSupport: selectedPackage ?')],
    ['Anfrage wird inklusive Hosting- und Zahlungsmodell gespeichert', pages.includes('paymentModel: x.paymentModel') && pages.includes('hostingModel: x.hostingModel')],
    ['Projektübernahme übernimmt Paketbeschreibung, Support und Hosting', admin.includes('packageDescription: i.packageDescription') && admin.includes('packageSupport: i.packageSupport') && admin.includes('hostingModel: i.hostingModel')],
    ['Admin-Anfragedetail zeigt Paketleistungen und Support', admin.includes('Paketleistungen') && admin.includes('Enthaltener Support')],
    ['Rechnungsdialog zeigt monatliches Paket, Preis, Leistungen, Support und Hosting', billing.includes('project.packageDescription') && billing.includes('project.packageSupport') && billing.includes('project.hostingModel')],
    ['Anfrageformular enthält Datenschutz- und Pflichtfelder', html.includes('name="privacy" type="checkbox" required') && html.includes('name="email" type="email" required')],
    ['Zentraler E-Mail-Versand erfolgt über FormSubmit', core.includes("fetch('https://formsubmit.co/ajax/'")]
];
let failed = 0;
for (const [name, ok] of tests) {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    if (!ok) failed++;
}
console.log(`\nErgebnis: ${tests.length - failed}/${tests.length} Tests bestanden.`);
if (failed) process.exitCode = 1;
