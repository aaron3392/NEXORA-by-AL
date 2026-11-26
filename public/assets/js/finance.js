/* NEXORA by AL – Verrechnung (eigene Sitzung, gleiche lokale Daten) */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc, MN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    function overview(el) {
        const D = NX.db, inv = D.invoices.filter(i => !i.draft);
        let year = new Date().getFullYear();
        const years = [...new Set([year, ...inv.map(i => +i.date.slice(0, 4)), ...inv.flatMap(i => i.payments.map(p => +p.date.slice(0, 4)))])].sort((a, b) => b - a);
        el.innerHTML = `<h1>Übersicht</h1><div class="kp">${NX.kpi(NX.eur(inv.reduce((s, i) => s + NX.paid(i), 0)), 'Einnahmen gesamt')}${NX.kpi(inv.filter(i => NX.open(i) > 0).length, 'Offene Rechnungen')}${NX.kpi(inv.filter(i => NX.open(i) <= 0).length, 'Bezahlte Rechnungen')}${NX.kpi(inv.filter(i => NX.invStatus(i) === 'Überfällig').length, 'Überfällige Rechnungen')}${NX.kpi(NX.eur(inv.reduce((s, i) => s + NX.open(i), 0)), 'Offene Beträge')}</div>
 <div class="top"><h2 class="sub">Monatsübersicht</h2><select id="yr" aria-label="Jahr" style="width:auto">${years.map(y => `<option>${y}</option>`).join('')}</select></div><div id="mo"></div><h2 class="sub">Jahresübersicht</h2><div id="ya"></div>`;
        const fa = (y, m) => { const pre = m == null ? String(y) : y + '-' + String(m + 1).padStart(2, '0'); const iv = inv.filter(i => i.date.startsWith(pre)); return { n: iv.length, bill: iv.reduce((s, i) => s + NX.total(i), 0), paid: inv.reduce((s, i) => s + i.payments.filter(p => p.date.startsWith(pre)).reduce((a, p) => a + p.amount, 0), 0) }; };
        const mo = () => { const r = MN.map((n, m) => { const x = fa(year, m); return { id: n, cells: [n + ' ' + year, x.n, NX.eur(x.bill), NX.eur(x.paid)] }; }); NX.$('#mo', el).innerHTML = NX.table(['Monat', 'Rechnungen', 'Fakturiert (brutto)', 'Zahlungseingang'], r); };
        NX.$('#ya', el).innerHTML = NX.table(['Jahr', 'Rechnungen', 'Fakturiert (brutto)', 'Zahlungseingang'], years.map(y => { const x = fa(y); return { id: y, cells: [y, x.n, NX.eur(x.bill), NX.eur(x.paid)] }; }));
        NX.$('#yr', el).onchange = e => { year = +e.target.value; mo(); };
        mo();
    }
    function zeiten(el) {
        const D = NX.db;
        const draw = () => {
            const un = D.time.filter(t => t.billable && !t.invoiceId);
            const by = {};
            un.forEach(t => (by[t.customerId] = by[t.customerId] || []).push(t));
            el.innerHTML = '<h1>Zeiten abrechnen</h1>' + (Object.keys(by).length ? Object.keys(by).map(cid => {
                const l = by[cid], sum = l.reduce((s, t) => s + Math.round(NX.mins(t.start, t.end, t.brk) / 60 * 100) / 100 * t.rate, 0), bad = l.some(t => !t.rate);
                return `<div class="card" style="margin-bottom:16px"><h3>${esc(NX.custName(cid))}</h3>${NX.table(['Datum', 'Projekt', 'Tätigkeit', 'Dauer', 'Satz', 'Betrag (netto)'], l.map(t => { const h = Math.round(NX.mins(t.start, t.end, t.brk) / 60 * 100) / 100; return { id: t.id, cells: [NX.date(t.date), esc((NX.proj(t.projectId) || {}).name || '–'), esc(t.desc), NX.hm(NX.mins(t.start, t.end, t.brk)), NX.eur(t.rate), NX.eur(Math.round(h * t.rate))] }; }))}<p style="margin-top:10px"><b>Summe netto: ${NX.eur(Math.round(sum))}</b></p>${bad ? '<p class="err">Mindestens ein Eintrag hat keinen Stundensatz – bitte in der Zeiterfassung ergänzen.</p>' : `<button type="button" class="btn" data-c="${cid}">Rechnungsentwurf erstellen</button>`}</div>`;
            }).join('') : '<div class="tw"><p class="empty">Keine offenen abrechenbaren Zeiten.</p></div>');
        };
        el.onclick = NX.guard(async (e) => {
            const b = e.target.closest('[data-c]');
            if (!b)
                return;
            const cid = b.dataset.c;
            const l = D.time.filter(t => t.billable && !t.invoiceId && t.customerId === cid && t.rate > 0);
            if (!l.length)
                return;
            const r = { id: NX.uid('R'), number: NX.nextNumber('R', D.invoices), customerId: cid, projectId: l[0].projectId, offerId: '', date: NX.today(), due: NX.addDays(NX.today(), D.settings.dueDays), kind: 'Schlussrechnung', items: l.map(t => ({ desc: `${(NX.proj(t.projectId) || {}).name || 'Leistung'} – ${NX.date(t.date)}: ${t.desc} (${NX.hm(NX.mins(t.start, t.end, t.brk))})`, qty: Math.round(NX.mins(t.start, t.end, t.brk) / 60 * 100) / 100, price: t.rate })), disc: 0, vat: D.settings.vatRate, draft: true, payments: [], timeIds: l.map(t => t.id) };
            D.invoices.push(r);
            l.forEach(t => t.invoiceId = r.id);
            NX.log('Zeiten abgerechnet: Rechnungsentwurf ' + r.number);
            NX.toast('Rechnungsentwurf ' + r.number + ' erstellt. Stunden auf 2 Nachkommastellen gerundet.');
            draw();
        });
        draw();
    }
    // Ansichten werden auch innerhalb der Administration verwendet.
    // Die Verrechnung erhält dadurch keinen eigenen Seitenwechsel und keine zweite Anmeldung.
    NX.financeViews = { uebersicht: overview, angebote: NX.bill.offersView, rechnungen: NX.bill.invoicesView, mahnungen: NX.bill.remindersView, vertraege: NX.bill.subscriptionsView, zeiten };
})();
