/* NUR FÜR TESTS: Beispieldaten (Demo-Kunden, Demo-Zugänge). Wird von den Testläufen vor core.js geladen (tests/serve.py) und ist NICHT Teil der Auslieferung.
   Ohne diese Datei startet die Anwendung mit leerer Datenbank und Ersteinrichtung. */
window.NX_SEED_FN = function (NX) {
    async function seed() {
            const T = NX.today(), d = n => NX.addDays(T, n), pw = await NX.hash('Demo12345'), ap = await NX.hash('N123456789');
            const cu = (id, f, l, e, ph, st, x) => Object.assign({ id, first: f, last: l, email: e, phone: ph, street: 'Beispielstraße', no: '1', zip: '00000', city: 'Beispielstadt', country: 'Deutschland', status: st, pwHash: pw, created: d(-60), resetPending: false, demo: true }, x || {});
            const it = (desc, qty, eur) => ({ desc, qty, price: eur * 100 });
            return {
                v: 1, auth: { user: 'admin2026', hash: ap },
                settings: {
                    company: 'NEXORA by AL', owner: '', street: '', zip: '', city: '', country: '', email: '', phone: '', vatId: '', iban: '', bic: '', formsubmit: 'lerchner.aaron@gmail.com', vatRate: 19, dueDays: 14, offerDays: 30, hourlyRate: 0, servicePrices: {},
                    fees: { r: 0, m1: 0, m2: 0 }, reminderDays: { r: 7, m1: 7, m2: 7 },
                    packages: [{ name: 'Starter-Website', price: '', desc: 'Moderne, responsive Präsenz für kleine Unternehmen.' }, { name: 'Business-Website', price: '', desc: 'Mehrseitiger Auftritt mit individuellem Design und Pflegebereich.' }, { name: 'Webanwendung / Portal', price: '', desc: 'Kundenportale, Dashboards und Verwaltungssysteme.' }, { name: 'Individuelle Software', price: '', desc: 'Maßgeschneiderte Lösungen und Automatisierungen.' }],
                    hosting: [{ name: 'Hosting Basis', price: '', desc: 'Hosting inklusive technischer Grundbetreuung.' }, { name: 'Hosting Plus', price: '', desc: 'Zusätzlich Updates und Monitoring.' }, { name: 'Wartung & Support', price: '', desc: 'Laufende Betreuung nach Vereinbarung.' }],
                    showcase: [{ name: 'Demo: Online-Terminbuchung', cat: 'Webanwendung', status: 'Beispielprojekt', desc: 'Beispielhafte Terminverwaltung mit Kundenkonto.' }, { name: 'Demo: Unternehmenswebsite', cat: 'Webdesign', status: 'Beispielprojekt', desc: 'Beispiel für einen responsiven Firmenauftritt.' }, { name: 'Demo: Lager-Dashboard', cat: 'Software', status: 'Beispielprojekt', desc: 'Beispielhafte Verwaltungsoberfläche mit Kennzahlen.' }]
                },
                customers: [cu('K-1001', 'Mia', 'Beispiel', 'mia.demo@example.com', '+49 000 1111111', 'aktiv'), cu('K-1002', 'Tom', 'Muster', 'tom.demo@example.com', '+49 000 2222222', 'aktiv'), cu('K-1003', 'Lea', 'Test', 'lea.demo@example.com', '+49 000 3333333', 'inaktiv'), cu('K-1004', 'Jan', 'Probe', 'jan.demo@example.com', '+49 000 4444444', 'gesperrt')],
                inquiries: [
                    { id: 'A-1001', date: d(-2), first: 'Anna', last: 'Interessent', email: 'anna.demo@example.com', phone: '', subject: 'Neue Firmenwebsite', service: 'Responsive Unternehmenswebsites', message: 'Demo-Anfrage: Wir benötigen eine neue Website.', features: 'Kontaktformular', budget: '', timeframe: '', status: 'Neu', notes: '', customerId: null, projectId: null, source: 'Anfrage', demo: true },
                    { id: 'A-1002', date: d(-9), first: 'Tom', last: 'Muster', email: 'tom.demo@example.com', phone: '+49 000 2222222', subject: 'Kundenportal', service: 'Kundenportale', message: 'Demo-Anfrage: Portal für Kundendokumente.', features: 'Login, Dokumente', budget: '', timeframe: '', status: 'In Bearbeitung', notes: 'Rückruf vereinbaren', customerId: 'K-1002', projectId: null, source: 'Anfrage', demo: true },
                    { id: 'A-1003', date: d(-30), first: 'Mia', last: 'Beispiel', email: 'mia.demo@example.com', phone: '+49 000 1111111', subject: 'Website-Relaunch', service: 'Individuelles Webdesign', message: 'Demo-Anfrage: Relaunch.', features: '', budget: '', timeframe: '', status: 'Angenommen', notes: '', customerId: 'K-1001', projectId: 'P-1001', source: 'Anfrage', demo: true }
                ],
                projects: [
                    { id: 'P-1001', name: 'Website-Relaunch (Demo)', customerId: 'K-1001', desc: 'Demo-Projekt: Neugestaltung der Unternehmenswebsite.', cat: 'Webdesign', status: 'Laufend', start: d(-30), end: d(30), price: 350000, notes: '' },
                    { id: 'P-1002', name: 'Kundenportal (Demo)', customerId: 'K-1002', desc: 'Demo-Projekt: Portal mit Dokumentenbereich.', cat: 'Webanwendung', status: 'Geplant', start: d(10), end: d(90), price: 900000, notes: '' },
                    { id: 'P-1003', name: 'Landingpage (Demo)', customerId: 'K-1001', desc: 'Demo-Projekt: abgeschlossene Landingpage.', cat: 'Webdesign', status: 'Abgeschlossen', start: d(-120), end: d(-70), price: 120000, notes: '' }
                ],
                offers: [
                    { id: 'O-1', number: 'A-' + new Date().getFullYear() + '-0001', type: 'Angebot', customerId: 'K-1001', projectId: 'P-1001', date: d(-35), valid: d(-5), items: [it('Webdesign Relaunch (Demo)', 1, 2500), it('Umsetzung responsive (Demo)', 1, 1000)], disc: 0, vat: 19, status: 'Angenommen', invoiceId: 'R-1' },
                    { id: 'O-2', number: 'A-' + new Date().getFullYear() + '-0002', type: 'Angebot', customerId: 'K-1002', projectId: 'P-1002', date: d(-5), valid: d(25), items: [it('Kundenportal Konzeption (Demo)', 1, 1800), it('Portal Entwicklung (Demo)', 1, 7200)], disc: 5, vat: 19, status: 'Versendet', invoiceId: null },
                    { id: 'O-3', number: 'A-' + new Date().getFullYear() + '-0003', type: 'Kostenvoranschlag', customerId: 'K-1001', projectId: '', date: d(-1), valid: d(29), items: [it('Wartung (Demo)', 12, 60)], disc: 0, vat: 19, status: 'Entwurf', invoiceId: null }
                ],
                invoices: [
                    { id: 'R-1', number: 'R-' + new Date().getFullYear() + '-0001', customerId: 'K-1001', projectId: 'P-1001', offerId: 'O-1', date: d(-40), due: d(-26), kind: 'Vorauszahlungsrechnung', items: [it('Anzahlung Website-Relaunch (Demo)', 1, 1200)], disc: 0, vat: 19, draft: false, payments: [{ date: d(-30), amount: 142800 }], timeIds: [] },
                    { id: 'R-2', number: 'R-' + new Date().getFullYear() + '-0002', customerId: 'K-1001', projectId: 'P-1001', offerId: '', date: d(-20), due: d(-6), kind: 'Schlussrechnung', items: [it('Restbetrag Website-Relaunch (Demo)', 1, 2300)], disc: 0, vat: 19, draft: false, payments: [{ date: d(-10), amount: 50000 }], timeIds: [] },
                    { id: 'R-3', number: 'R-' + new Date().getFullYear() + '-0003', customerId: 'K-1002', projectId: '', offerId: '', date: d(-3), due: d(11), kind: 'Vorauszahlungsrechnung', items: [it('Anzahlung Portal (Demo)', 1, 1500)], disc: 0, vat: 19, draft: false, payments: [], timeIds: [] },
                    { id: 'R-4', number: 'R-' + new Date().getFullYear() + '-0004', customerId: 'K-1001', projectId: 'P-1003', offerId: '', date: d(-1), due: d(13), kind: 'Schlussrechnung', items: [it('Landingpage (Demo)', 1, 1200)], disc: 0, vat: 19, draft: true, payments: [], timeIds: [] }
                ],
                reminders: [{ id: 'M-1', invoiceId: 'R-2', customerId: 'K-1001', type: 'Zahlungserinnerung', number: 'M-' + new Date().getFullYear() + '-0001', date: d(-2), due: d(5), fee: 0 }],
                time: [
                    { id: 'T-1', customerId: 'K-1001', projectId: 'P-1001', date: d(-3), start: '09:00', end: '12:30', brk: 15, billable: true, rate: 8000, desc: 'Demo: Design-Abstimmung', invoiceId: null },
                    { id: 'T-2', customerId: 'K-1001', projectId: 'P-1001', date: d(-2), start: '13:00', end: '17:00', brk: 30, billable: true, rate: 8000, desc: 'Demo: Umsetzung Startseite', invoiceId: null },
                    { id: 'T-3', customerId: 'K-1002', projectId: 'P-1002', date: d(-1), start: '10:00', end: '11:00', brk: 0, billable: false, rate: 0, desc: 'Demo: interne Planung', invoiceId: null }
                ],
                support: [{ id: 'S-1', customerId: 'K-1001', type: 'Wartung', subject: 'Demo: Update der Website', message: 'Bitte Inhalte aktualisieren.', status: 'In Bearbeitung', date: d(-4) }],
                reviews: [], subscriptions: [], chat: { 'K-1001': [{ from: 'team', text: 'Willkommen im Kundenportal (Demo-Chat, lokal gespeichert).', t: Date.now() - 864e5, r: false }] },
                activity: [{ t: Date.now() - 36e5, text: 'Demo-Daten geladen' }], mails: []
            };
        }

    return seed();
};
