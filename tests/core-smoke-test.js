/*
 * NEXORA by AL – automatisierte Basistests für das Kernmodul.
 * Ausführen mit: node tests/core-smoke-test.js
 * Der eigentliche Websitebetrieb benötigt Node.js weiterhin nicht.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const projectRoot = path.resolve(__dirname, '..');
const localStorageData = new Map();
const context = {
    console,
    crypto,
    TextEncoder,
    Date,
    Math,
    String,
    Number,
    Object,
    Array,
    Set,
    Map,
    JSON,
    Promise,
    Intl,
    localStorage: {
        getItem: key => localStorageData.has(key) ? localStorageData.get(key) : null,
        setItem: (key, value) => localStorageData.set(key, value),
        removeItem: key => localStorageData.delete(key)
    },
    document: {
        querySelector: () => null,
        querySelectorAll: () => []
    },
    window: null
};
context.window = context;
vm.createContext(context);
const corePath = path.join(projectRoot, 'assets', 'js', 'core.js');
vm.runInContext(fs.readFileSync(path.join(projectRoot, 'tests', 'fixtures', 'demo-seed.js'), 'utf8'), context, { filename: 'demo-seed.js' });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: corePath });
(async () => {
    await context.NX.ready;
    const NX = context.NX;
    const portalSource = fs.readFileSync(path.join(projectRoot, 'assets', 'js', 'portal.js'), 'utf8');
    const tests = [
        ['Admin-Benutzername wird initialisiert', NX.db.auth.user === 'admin2026'],
        ['Admin-Demo-Passwort stimmt mit dem gespeicherten Hash überein', await NX.hash('N123456789') === NX.db.auth.hash],
        ['Vier Demo-Kunden werden initialisiert', NX.db.customers.length === 4],
        ['FormSubmit-Empfänger ist konfiguriert', NX.db.settings.formsubmit === 'lerchner.aaron@gmail.com'],
        ['Umsatzsteuerberechnung bleibt centgenau', NX.calc([{ qty: 2, price: 1000 }], 19, 0).gross === 2380],
        ['Offener Betrag berücksichtigt Teilzahlungen', NX.open({
                items: [{ qty: 1, price: 10000 }],
                vat: 0,
                disc: 0,
                payments: [{ amount: 2500 }]
            }) === 7500],
        ['Ungültige Zeiträume werden abgelehnt', NX.mins('12:00', '11:00', 0) === null],
        ['Kundenportal enthält dreistufige Kontolöschung mit Passwort-, Code- und Finalbestätigung', portalSource.includes('delete-password-form') && portalSource.includes('delete-code-form') && portalSource.includes('delete-now')],
        ['Kontolöschung ist für 30 Tage im Archiv vorgemerkt und wiederherstellbar', portalSource.includes('30 * 24 * 60 * 60 * 1000') && portalSource.includes('Konto wiederherstellen')],
        ['FormSubmit versendet Löschcode und Löschbestätigung an die Kundenadresse', portalSource.includes('NX.formsubmit(Object.assign({ _to: recipient }, payload))') && portalSource.includes('Ihr NEXORA Sicherheitscode zur Kontolöschung') && portalSource.includes('Bestätigung: Ihr NEXORA-Konto wird in 30 Tagen gelöscht')],
        ['Doppelte Dokumentnummern werden vermieden', (() => {
                const first = NX.nextNumber('R', [{ number: 'R-' + new Date().getFullYear() + '-0001' }]);
                return first !== 'R-' + new Date().getFullYear() + '-0001';
            })()]
    ];
    let failed = 0;
    for (const [name, passed] of tests) {
        console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
        if (!passed)
            failed += 1;
    }
    console.log(`\nErgebnis: ${tests.length - failed}/${tests.length} Tests bestanden.`);
    if (failed)
        process.exitCode = 1;
})();
