/* NEXORA by AL – Angebote, Rechnungen, Erinnerungen/Mahnungen (gemeinsam für Admin und Verrechnung) */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc, B = NX.bill = {};
    const clone = o => JSON.parse(JSON.stringify(o));
    // Merkt die zuletzt verwendeten Rechnungspositionen, damit Preisänderungen bei neuen Rechnungen erhalten bleiben.
    const invoiceItemDefaults = () => {
        const saved = NX.db.settings.lastInvoiceItems;
        if (Array.isArray(saved) && saved.length) return clone(saved).map(i => ({ desc: i.desc || '', qty: 1, price: Number(i.price) || 0 }));
        return [{ desc: '', qty: 1, price: Number(NX.db.settings.hourlyRate) || 0 }];
    };
    const rememberInvoiceItems = items => {
        NX.db.settings.lastInvoiceItems = items.filter(i => i.desc && i.desc.trim()).map(i => ({ desc: i.desc.trim(), price: Math.max(0, Math.round(Number(i.price) || 0)) }));
    };
    const opts = (list, sel, lab) => list.map(x => `<option value="${esc(x.id)}"${x.id === sel ? ' selected' : ''}>${esc(lab(x))}</option>`).join('');
    const selOpts = (arr, sel) => arr.map(s => `<option${s === sel ? ' selected' : ''}>${s}</option>`).join('');
    /* Positionen-Editor */
    function itemsEditor(host, items, onChange) {
        const draw = () => { host.innerHTML = `<div class="tw"><table><thead><tr><th>Leistung</th><th>Menge</th><th>Einzelpreis (€)</th><th></th></tr></thead><tbody>${items.map((i, k) => `<tr><td class="w"><input data-k="${k}" data-f="desc" value="${esc(i.desc)}" aria-label="Leistung"></td><td><input data-k="${k}" data-f="qty" type="number" step="0.01" min="0" value="${i.qty}" style="width:90px" aria-label="Menge"></td><td><input data-k="${k}" data-f="price" type="number" step="0.01" min="0" value="${(i.price / 100).toFixed(2)}" style="width:120px" aria-label="Einzelpreis"></td><td><button type="button" class="btn ghost sm" data-del="${k}" aria-label="Position entfernen">✕</button></td></tr>`).join('')}</tbody></table></div><button type="button" class="btn ghost sm" data-add style="margin-top:8px">+ Position</button>`; };
        draw();
        host.oninput = e => { const t = e.target, it = items[+t.dataset.k]; if (!it)
            return; if (t.dataset.f === 'desc')
            it.desc = t.value;
        else if (t.dataset.f === 'qty')
            it.qty = parseFloat(t.value) || 0;
        else
            it.price = NX.cents(t.value); onChange(); };
        host.onclick = e => { const d = e.target.closest('[data-del]'); if (d) {
            items.splice(+d.dataset.del, 1);
            draw();
            onChange();
        }
        else if (e.target.closest('[data-add]')) {
            items.push({ desc: '', qty: 1, price: 0 });
            draw();
            onChange();
        } };
    }
    const totalsHTML = (d) => { const c = NX.calc(d.items, d.vat, d.disc); return `<div class="tot"><div><span>Zwischensumme</span><span>${NX.eur(c.net)}</span></div>${c.disc ? `<div><span>Rabatt</span><span>−${NX.eur(c.disc)}</span></div>` : ''}<div><span>USt ${d.vat}%</span><span>${NX.eur(c.vat)}</span></div><div class="g"><span>Gesamtbetrag</span><span>${NX.eur(c.gross)}</span></div></div>`; };
    const itemsOk = (f, d) => { const it = d.items.filter(i => i.desc.trim()); if (!it.length || it.some(i => i.qty <= 0 || i.price < 0)) {
        const t = NX.$('#ie', f);
        t.textContent = 'Mindestens eine Position mit Bezeichnung und Menge > 0 erforderlich.';
        return false;
    } NX.$('#ie', f).textContent = ''; d.items = it; return true; };
    /* ---------- E-Mail-Vorbereitung ---------- */
    B.emailDoc = (type, d) => {
        const c = NX.cust(d.customerId) || {}, s = NX.db.settings;
        const kind = type === 'offer' ? (d.type || 'Angebot') : type === 'invoice' ? d.kind : d.type;
        const extra = type === 'reminder' ? `\nOffener Betrag: ${NX.eur(NX.open(NX.db.invoices.find(i => i.id === d.invoiceId)))}${d.fee ? ' zzgl. Gebühr ' + NX.eur(d.fee) : ''}\nZahlbar bis: ${NX.date(d.due)}` : type === 'invoice' ? `\nGesamtbetrag: ${NX.eur(NX.total(d))}\n${d.billingPeriod ? 'Abrechnungszeitraum: ' + d.billingPeriod + '\n' : ''}Fällig am: ${NX.date(d.due)}` : `\nGesamtbetrag: ${NX.eur(NX.total(d))}\nGültig bis: ${NX.date(d.valid)}`;
        NX.mailPreview({ kind, to: c.email || '', subject: `${kind} ${d.number} – ${s.company}`, message: `Guten Tag ${c.first || ''} ${c.last || ''},\n\nzu Ihrem Dokument „${kind} ${d.number}“ finden Sie nachfolgend die wichtigsten Angaben.${extra}\n\nBitte verwenden Sie das separat bereitgestellte Dokument für die vollständigen Rechnungs- bzw. Angebotsdetails.\n\nMit freundlichen Grüßen\n${s.company}` });
    };
    /* Senden: gibt das Dokument im Kundenportal frei und verschickt die E-Mail an den Kunden */
    B.sendDoc = async (type, d, done) => {
        const list = type === 'offer' ? NX.db.offers : type === 'invoice' ? NX.db.invoices : NX.db.reminders, doc = list.find(x => x.id === d.id) || d;
        const c = NX.cust(doc.customerId) || {}, s = NX.db.settings;
        if (!c.id) { NX.toast('Bitte zuerst einen Kunden wählen.'); return false; }
        if (type === 'offer' && doc.status === 'Entwurf') doc.status = 'Versendet';
        if (type === 'invoice') doc.draft = false;
        doc.sentAt = Date.now(); NX.save();
        const kind = type === 'offer' ? (doc.type || 'Angebot') : type === 'invoice' ? doc.kind : doc.type;
        const extra = type === 'reminder' ? `\nOffener Betrag: ${NX.eur(NX.open(NX.db.invoices.find(i => i.id === doc.invoiceId)))}${doc.fee ? ' zzgl. Gebühr ' + NX.eur(doc.fee) : ''}\nZahlbar bis: ${NX.date(doc.due)}` : type === 'invoice' ? `\nGesamtbetrag: ${NX.eur(NX.total(doc))}\n${doc.billingPeriod ? 'Abrechnungszeitraum: ' + doc.billingPeriod + '\n' : ''}Fällig am: ${NX.date(doc.due)}` : `\nGesamtbetrag: ${NX.eur(NX.total(doc))}\nGültig bis: ${NX.date(doc.valid)}`;
        const url = ((NX.db.auth && NX.db.auth.publicUrl) || '').replace(/\/$/, ''), link = url ? `${url}/kundenportal.html` : '';
        NX.log(kind + ' ' + doc.number + ' gesendet an ' + (c.email || 'Kundenportal'));
        let msg = 'Im Kundenportal bereitgestellt.';
        if (c.email) {
            const r = await NX.formsubmit({ _to: c.email, _subject: `${kind} ${doc.number} – ${s.company}`, Empfänger: c.email, Nachricht: `Guten Tag ${c.first || ''} ${c.last || ''},\n\nwir haben Ihnen „${kind} ${doc.number}“ bereitgestellt.${extra}\n\nSie finden das vollständige Dokument in Ihrem Kundenportal${link ? ': ' + link : ' auf unserer Website'}.\n\nMit freundlichen Grüßen\n${s.company}` });
            NX.mailLog(c.email, `${kind} ${doc.number}`, kind, r.ok ? 'an FormSubmit übergeben' : 'Fehler');
            msg = r.ok ? 'Gesendet: E-Mail an den Kunden und im Kundenportal bereitgestellt.' : 'Im Kundenportal bereitgestellt, aber die E-Mail ging nicht raus: ' + r.msg;
        } else msg = 'Im Kundenportal bereitgestellt. Beim Kunden ist keine E-Mail-Adresse hinterlegt.';
        NX.toast(msg); done && done(); return true;
    };
    /* ---------- Angebote ---------- */
    function offerModal(o, done, pre) {
        const s = NX.db.settings, isNew = !o, d = o ? clone(o) : Object.assign({ id: NX.uid('O'), number: NX.nextNumber('A', NX.db.offers), type: 'Angebot', customerId: '', projectId: '', date: NX.today(), valid: NX.addDays(NX.today(), s.offerDays), items: [{ desc: '', qty: 1, price: 0 }], disc: 0, vat: s.vatRate, status: 'Entwurf', invoiceId: null }, pre || {});
        const m = NX.modal(isNew ? 'Neues Angebot' : 'Angebot ' + d.number, `<form novalidate>
 <div class="row"><div class="field"><label for="on">Nummer</label><input id="on" name="number" value="${esc(d.number)}"></div><div class="field"><label for="ot">Art</label><select id="ot" name="type">${selOpts(['Angebot', 'Kostenvoranschlag'], d.type)}</select></div></div>
 <div class="row"><div class="field"><label for="oc">Kunde <span class="req">*</span></label><select id="oc" name="customerId"><option value="">– wählen –</option>${opts(NX.db.customers, d.customerId, c => c.first + ' ' + c.last)}</select></div><div class="field"><label for="op">Projekt</label><select id="op" name="projectId"><option value="">– keines –</option>${opts(NX.db.projects, d.projectId, p => p.name)}</select></div></div>
 <div class="row"><div class="field"><label for="od">Angebotsdatum</label><input id="od" type="date" name="date" value="${d.date}"></div><div class="field"><label for="ov">Gültig bis</label><input id="ov" type="date" name="valid" value="${d.valid}"></div><div class="field"><label for="os">Status</label><select id="os" name="status">${selOpts(['Entwurf', 'Versendet', 'Angenommen', 'Abgelehnt', 'Abgelaufen'], d.status)}</select></div></div>
 <div class="row"><div class="field"><label for="odi">Rabatt (%)</label><input id="odi" type="number" min="0" max="100" step="0.1" name="disc" value="${d.disc}"></div><div class="field"><label for="ovt">USt (%)</label><input id="ovt" type="number" min="0" step="0.1" name="vat" value="${d.vat}"></div></div>
 <div id="it"></div><p class="err" id="ie"></p><div id="tt"></div>
 <div class="acts"><button class="btn" type="submit">Speichern</button>${!isNew && d.status === 'Angenommen' && !d.invoiceId ? '<button type="button" class="btn ghost" data-inv>In Rechnung umwandeln</button>' : ''}<button type="button" class="btn ghost" data-send>Senden</button>${!isNew ? '<button type="button" class="btn ghost" data-view>Dokument ansehen</button>' : ''}</div></form>`, { wide: true });
        const f = NX.$('form', m.body), tt = NX.$('#tt', m.body), upd = () => { d.disc = parseFloat(f.disc.value) || 0; d.vat = parseFloat(f.vat.value) || 0; tt.innerHTML = totalsHTML(d); };
        itemsEditor(NX.$('#it', m.body), d.items, upd);
        f.oninput = e => { if (e.target.name === 'disc' || e.target.name === 'vat')
            upd(); };
        upd();
        const take = () => { Object.assign(d, NX.fd(f)); };
        let sendAfter = false; NX.$('[data-send]', m.body).onclick = () => { sendAfter = true; f.requestSubmit(); };
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault(); const sa = sendAfter; sendAfter = false;
            if (!NX.check(f, { customerId: ['req'], number: ['req'] }) || !itemsOk(f, d))
                return;
            take();
            d.disc = parseFloat(d.disc) || 0;
            d.vat = parseFloat(d.vat) || 0;
            if (NX.db.offers.some(x => x.number === d.number && x.id !== d.id)) {
                NX.$('[name=number]', f).closest('.field').querySelector('.err').textContent = 'Diese Nummer existiert bereits.';
                return;
            }
            const i = NX.db.offers.findIndex(x => x.id === d.id);
            if (i < 0)
                NX.db.offers.push(d);
            else
                NX.db.offers[i] = d;
            NX.log((isNew ? 'Angebot erstellt: ' : 'Angebot geändert: ') + d.number);
            NX.toast('Angebot gespeichert.');
            m.close();
            if (sa) await B.sendDoc('offer', d);
            done && done();
        });
        const inv = NX.$('[data-inv]', m.body);
        if (inv)
            inv.onclick = NX.guard(async () => { if (d.invoiceId)
                return; take(); const r = { id: NX.uid('R'), number: NX.nextNumber('R', NX.db.invoices), orderNumber: NX.orderNumberFor(d.projectId), customerId: d.customerId, projectId: d.projectId, offerId: d.id, date: NX.today(), due: NX.addDays(NX.today(), s.dueDays), kind: 'Vorauszahlungsrechnung', items: clone(d.items), disc: d.disc, vat: d.vat, draft: true, payments: [], timeIds: [] }; NX.db.invoices.push(r); d.invoiceId = r.id; const i = NX.db.offers.findIndex(x => x.id === d.id); if (i >= 0)
                NX.db.offers[i] = d; NX.log('Rechnungsentwurf aus Angebot ' + d.number + ': ' + r.number); NX.toast('Rechnungsentwurf ' + r.number + ' erstellt.'); m.close(); done && done(); });
        const ma = NX.$('[data-view]', m.body);
        if (ma) {
            ma.onclick = () => NX.viewDoc('offer', d);
        }
    }
    B.offerModal = offerModal;
    B.offersView = el => NX.listView(el, {
        title: 'Angebote & Kostenvoranschläge', ph: 'Nummer oder Kunde suchen', status: ['Entwurf', 'Versendet', 'Angenommen', 'Abgelehnt', 'Abgelaufen'], add: '+ Neues Angebot', dates: true,
        items: () => [...NX.db.offers].sort((a, b) => b.date.localeCompare(a.date)), text: o => o.number + ' ' + NX.custName(o.customerId), stat: o => NX.offStatus(o), dateOf: o => o.date,
        head: ['Nummer', 'Art', 'Kunde', 'Datum', 'Gültig bis', 'Betrag', 'Status', ''],
        row: o => [esc(o.number), esc(o.type), esc(NX.custName(o.customerId)), NX.date(o.date), NX.date(o.valid), NX.eur(NX.total(o)), NX.badge(NX.offStatus(o)), NX.btn('view', o.id, 'Ansehen') + NX.btn('edit', o.id, 'Bearbeiten') + NX.btn('mail', o.id, 'Senden')],
        onAdd: r => offerModal(null, r),
        act: (a, id, r) => { const o = NX.db.offers.find(x => x.id === id); if (a === 'view')
            NX.viewDoc('offer', o);
        else if (a === 'edit')
            offerModal(o, r);
        else
            B.sendDoc('offer', o, r); }
    });
    /* ---------- Rechnungen ---------- */
    function invoiceModal(inv, done, pre) {
        const s = NX.db.settings, isNew = !inv, d = inv ? clone(inv) : Object.assign({ id: NX.uid('R'), number: NX.nextNumber('R', NX.db.invoices), orderNumber: '', customerId: '', projectId: '', offerId: '', date: NX.today(), due: NX.addDays(NX.today(), s.dueDays), kind: 'Schlussrechnung', items: invoiceItemDefaults(), disc: 0, vat: s.vatRate, draft: true, payments: [], timeIds: [] }, pre || {});
        d.orderNumber = d.orderNumber || NX.orderNumberFor(d.projectId);
        const m = NX.modal(isNew ? 'Neue Rechnung' : 'Rechnung ' + d.number, `<form novalidate>
 <div class="row"><div class="field"><label for="rn">Rechnungsnummer <span class="req">*</span></label><input id="rn" name="number" value="${esc(d.number)}"></div><div class="field"><label for="ron">Auftragsnummer <span class="req">*</span></label><input id="ron" name="orderNumber" value="${esc(d.orderNumber)}"><small class="mut">Wird bei Rechnungen desselben Projekts gemeinsam verwendet.</small></div><div class="field"><label for="rk">Art</label><select id="rk" name="kind">${selOpts(['Vorauszahlungsrechnung', 'Schlussrechnung'], d.kind)}</select></div></div>
 <div class="row"><div class="field"><label for="rc">Kunde <span class="req">*</span></label><select id="rc" name="customerId"><option value="">– wählen –</option>${opts(NX.db.customers, d.customerId, c => c.first + ' ' + c.last)}</select></div><div class="field"><label for="rp">Projekt</label><select id="rp" name="projectId"><option value="">– keines –</option>${opts(NX.db.projects, d.projectId, p => p.name)}</select></div><div class="field"><label for="ro">Angebot</label><select id="ro" name="offerId"><option value="">– keines –</option>${opts(NX.db.offers, d.offerId, o => o.number)}</select></div></div>
 <div class="row"><div class="field"><label for="rd">Rechnungsdatum</label><input id="rd" type="date" name="date" value="${d.date}"></div><div class="field"><label for="rf">Fälligkeitsdatum</label><input id="rf" type="date" name="due" value="${d.due}"></div><div class="field"><label for="rdi">Rabatt (%)</label><input id="rdi" type="number" min="0" max="100" step="0.1" name="disc" value="${d.disc || 0}"></div><div class="field"><label for="rv">USt (%)</label><input id="rv" type="number" min="0" step="0.1" name="vat" value="${d.vat}"></div></div>
 <div class="field chk"><input id="rdr" type="checkbox" name="draft"${d.draft ? ' checked' : ''}><label for="rdr">Entwurf (für Kunden im Portal noch nicht sichtbar)</label></div>
 <div id="it"></div><p class="err" id="ie"></p><div id="tt"></div>
 ${isNew ? '' : `<h4 class="sub">Zahlungen</h4><div id="pl"></div><div class="row"><div class="field"><label for="pa">Zahlungseingang (€)</label><input id="pa" type="number" step="0.01" min="0"></div><div class="field"><label for="pd">Zahlungsdatum</label><input id="pd" type="date" value="${NX.today()}"></div></div><button type="button" class="btn ghost sm" data-pay>Zahlung hinzufügen</button><p class="err" id="pe"></p>`}
 <div class="acts"><button class="btn" type="submit">Speichern</button><button type="button" class="btn ghost" data-send>Senden</button>${isNew ? '' : '<button type="button" class="btn ghost" data-view>Dokument ansehen</button>'}${!isNew && inv.draft ? '<button type="button" class="btn ghost" data-del>Entwurf löschen</button>' : ''}</div></form>`, { wide: true });
        const f = NX.$('form', m.body), tt = NX.$('#tt', m.body);
        f.projectId.addEventListener('change', () => {
            const project = NX.db.projects.find(p => p.id === f.projectId.value);
            if (project) {
                d.orderNumber = NX.orderNumberFor(project.id, d.orderNumber);
                f.orderNumber.value = d.orderNumber;
                const meta = project.paymentModel === 'monatlich' ? `Monatliches Paket: ${project.monthlyPackage || '–'} | Monatspreis: ${project.monthlyPrice || 'Preis offen'} | Leistungen: ${project.packageDescription || 'laut Vereinbarung'} | Support: ${project.packageSupport || 'laut Vereinbarung'}` : 'Einmaliges Projekt – Abrechnung gemäß Angebot bzw. vereinbartem Zahlungsplan.';
                let info = NX.$('#project-billing-info', m.body);
                if (!info) { info = document.createElement('p'); info.id = 'project-billing-info'; info.className = 'note'; f.projectId.closest('.row').after(info); }
                info.textContent = meta + ` | Hosting: ${project.hostingModel === 'eigen' ? 'Kunde hostet selbst' : project.hostingModel === 'nexora' ? 'NEXORA Hosting' : 'nicht festgelegt'}`;
            } else { NX.$('#project-billing-info', m.body)?.remove(); }
        });
        if (d.projectId) f.projectId.dispatchEvent(new Event('change'));
        const upd = () => { d.disc = parseFloat(f.disc.value) || 0; d.vat = parseFloat(f.vat.value) || 0; const c = NX.calc(d.items, d.vat, d.disc); tt.innerHTML = totalsHTML(d) + (isNew ? '' : `<div class="tot"><div><span>Bereits bezahlt</span><span>${NX.eur(NX.paid(d))}</span></div><div><b>Offen</b><b>${NX.eur(Math.max(0, c.gross - NX.paid(d)))}</b></div></div>`); };
        const pl = () => { const e = NX.$('#pl', m.body); if (e)
            e.innerHTML = d.payments.length ? `<ul class="list">${d.payments.map(p => `<li>${NX.date(p.date)} – ${NX.eur(p.amount)}</li>`).join('')}</ul>` : '<p class="mut">Noch keine Zahlungen.</p>'; };
        itemsEditor(NX.$('#it', m.body), d.items, upd);
        f.oninput = e => { if (e.target.name === 'disc' || e.target.name === 'vat')
            upd(); };
        upd();
        pl();
        const pb = NX.$('[data-pay]', m.body);
        if (pb)
            pb.onclick = () => { const a = NX.cents(NX.$('#pa', m.body).value), pe = NX.$('#pe', m.body); const open = NX.calc(d.items, d.vat, d.disc).gross - NX.paid(d); if (a <= 0)
                pe.textContent = 'Bitte einen Betrag > 0 eingeben.';
            else if (a > open)
                pe.textContent = 'Der Betrag übersteigt den offenen Betrag (' + NX.eur(open) + ').';
            else {
                pe.textContent = '';
                d.payments.push({ date: NX.$('#pd', m.body).value || NX.today(), amount: a });
                NX.$('#pa', m.body).value = '';
                pl();
                upd();
            } };
        let sendAfter = false; NX.$('[data-send]', m.body).onclick = () => { sendAfter = true; f.requestSubmit(); };
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault(); const sa = sendAfter; sendAfter = false;
            if (!NX.check(f, { customerId: ['req'], number: ['req'] }) || !itemsOk(f, d))
                return;
            const x = NX.fd(f);
            Object.assign(d, { number: x.number, orderNumber: (x.orderNumber || '').trim(), kind: x.kind, customerId: x.customerId, projectId: x.projectId, offerId: x.offerId, date: x.date, due: x.due, draft: !!x.draft });
            if (!d.orderNumber) d.orderNumber = NX.orderNumberFor(d.projectId);
            if (d.projectId) {
                const project = NX.db.projects.find(p => p.id === d.projectId);
                if (project && !project.orderNumber) project.orderNumber = d.orderNumber;
                else if (project && project.orderNumber && project.orderNumber !== d.orderNumber) {
                    NX.$('[name=orderNumber]', f).closest('.field').querySelector('.err').textContent = 'Für dieses Projekt ist bereits eine andere Auftragsnummer vergeben.';
                    return;
                }
            }
            d.disc = parseFloat(x.disc) || 0;
            d.vat = parseFloat(x.vat) || 0;
            if (NX.db.invoices.some(i => i.number === d.number && i.id !== d.id)) {
                NX.$('[name=number]', f).closest('.field').querySelector('.err').textContent = 'Diese Rechnungsnummer existiert bereits.';
                return;
            }
            if (NX.paid(d) > NX.total(d)) {
                NX.$('#ie', f).textContent = 'Die Zahlungen übersteigen den Rechnungsbetrag.';
                return;
            }
            const i = NX.db.invoices.findIndex(r => r.id === d.id);
            if (i < 0)
                NX.db.invoices.push(d);
            else
                NX.db.invoices[i] = d;
            rememberInvoiceItems(d.items);
            NX.log((isNew ? 'Rechnung erstellt: ' : 'Rechnung geändert: ') + d.number);
            NX.toast('Rechnung gespeichert.');
            m.close();
            if (sa) await B.sendDoc('invoice', d);
            done && done();
        });
        if (!isNew) {
            NX.$('[data-view]', m.body).onclick = () => NX.viewDoc('invoice', d);
            const db = NX.$('[data-del]', m.body);
            if (db)
                db.onclick = async () => { if (await NX.confirm('Diesen Rechnungsentwurf endgültig löschen?', 'Löschen')) {
                    NX.db.time.forEach(t => { if (t.invoiceId === d.id)
                        t.invoiceId = null; });
                    NX.db.invoices = NX.db.invoices.filter(r => r.id !== d.id);
                    NX.log('Rechnungsentwurf gelöscht: ' + d.number);
                    m.close();
                    done && done();
                } };
        }
    }

    /* ---------- Monatliche Verträge (manuelle Rechnungserstellung) ---------- */
    const addMonth = value => { const d = new Date((value || NX.today()) + 'T12:00:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    B.createSubscriptionFromProject = (project, done) => {
        if (!project || project.paymentModel !== 'monatlich') return;
        const D=NX.db; D.subscriptions=Array.isArray(D.subscriptions)?D.subscriptions:[];
        if(D.subscriptions.some(x=>x.projectId===project.id)){NX.toast('Für dieses Projekt besteht bereits ein Monatsvertrag.');return;}
        const priceText=String(project.monthlyPrice||'').replace(/,/g,'.'); const match=priceText.match(/\d+(?:\.\d{1,2})?/); const suggested=match?match[0]:'';
        const m=NX.modal('Monatsvertrag aus Projekt anlegen',`<form><div class="field"><label>Projekt</label><input value="${esc(project.name)}" disabled></div><div class="field"><label>Kunde</label><input value="${esc(NX.custName(project.customerId))}" disabled></div><div class="field"><label>Paket</label><input name="packageName" value="${esc(project.monthlyPackage||'Monatliches Paket')}" required></div><div class="field"><label>Monatspreis netto (€) *</label><input name="amount" type="number" min="0.01" step="0.01" value="${esc(suggested)}" required></div><div class="field"><label>Leistungsbeschreibung</label><textarea name="description">${esc([project.packageDescription,project.packageSupport,project.hostingNotes].filter(Boolean).join('\n'))}</textarea></div><div class="row"><div class="field"><label>USt (%)</label><input name="vat" type="number" min="0" step="0.1" value="${D.settings.vatRate}"></div><div class="field"><label>Nächste Abrechnung</label><input name="nextDate" type="date" value="${NX.today()}" required></div></div><div class="acts"><button class="btn" type="submit">Monatsvertrag speichern</button></div></form>`,{wide:true});
        const f=NX.$('form',m.body); f.onsubmit=e=>{e.preventDefault();const x=NX.fd(f),amount=NX.cents(x.amount);if(!x.packageName.trim()||amount<=0||!x.nextDate)return;const sub={id:NX.uid('ABO'),customerId:project.customerId,projectId:project.id,projectName:project.name,packageName:x.packageName.trim(),amount,description:x.description.trim(),vat:Math.max(0,+x.vat||0),nextDate:x.nextDate,status:'Aktiv',created:NX.today(),generatedPeriods:[]};D.subscriptions.push(sub);NX.log('Monatsvertrag aus Projekt angelegt: '+project.name);NX.save();NX.toast('Monatsvertrag angelegt.');m.close();done&&done();};
    };
    B.subscriptionsView = el => {
        const D = NX.db; D.subscriptions = Array.isArray(D.subscriptions) ? D.subscriptions : [];
        const draw = () => {
            const active = D.subscriptions.filter(x => x.status === 'Aktiv');
            const due = active.filter(x => x.nextDate <= NX.today());
            el.innerHTML = `<h1>Monatliche Verträge</h1><div class="kp">${NX.kpi(active.length, 'Aktive Verträge')}${NX.kpi(due.length, 'Heute / überfällig fällig')}${NX.kpi(NX.eur(active.reduce((a,x)=>a+(+x.amount||0),0)), 'Monatliches Netto-Volumen')}</div><div class="acts"><button type="button" class="btn" data-new-abo>+ Vertrag anlegen</button><button type="button" class="btn ghost" data-generate-all${due.length ? '' : ' disabled'}>Alle fälligen Rechnungsentwürfe erstellen (${due.length})</button></div><div class="tw"><table><thead><tr><th>Kunde</th><th>Projekt / Paket</th><th>Monatspreis netto</th><th>Nächste Rechnung</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>${D.subscriptions.length ? D.subscriptions.map(x=>`<tr><td>${esc(NX.custName(x.customerId))}</td><td>${esc(x.projectName || x.packageName)}</td><td>${NX.eur(x.amount)}</td><td>${NX.date(x.nextDate)}</td><td>${NX.badge(x.status)}</td><td><button class="btn ghost sm" data-generate="${esc(x.id)}"${x.status !== 'Aktiv' ? ' disabled' : ''}>Rechnung erstellen</button> <button class="btn ghost sm" data-toggle="${esc(x.id)}">${x.status === 'Aktiv' ? 'Pausieren' : 'Aktivieren'}</button></td></tr>`).join('') : '<tr><td colspan="6">Noch keine monatlichen Verträge angelegt.</td></tr>'}</tbody></table></div>`;
        };
        const createInvoice = sub => {
            if (!sub || sub.status !== 'Aktiv') return;
            const period = sub.nextDate.slice(0,7);
            sub.generatedPeriods = Array.isArray(sub.generatedPeriods) ? sub.generatedPeriods : [];
            if (sub.generatedPeriods.includes(period)) { NX.toast('Für diesen Abrechnungsmonat existiert bereits eine Rechnung.'); return; }
            const project = NX.proj(sub.projectId);
            const inv = { id:NX.uid('R'), number:NX.nextNumber('R',D.invoices), orderNumber:project ? NX.orderNumberFor(project.id) : NX.nextOrderNumber(), customerId:sub.customerId, projectId:sub.projectId || '', offerId:'', subscriptionId:sub.id, billingPeriod:period, date:NX.today(), due:NX.addDays(NX.today(), D.settings.dueDays), kind:'Monatsrechnung', items:[{desc:sub.description || `${sub.packageName} – ${period}`, qty:1, price:sub.amount}], disc:0, vat:sub.vat, draft:true, payments:[], timeIds:[] };
            D.invoices.push(inv); sub.generatedPeriods.push(period); sub.lastInvoiceId=inv.id; sub.nextDate=addMonth(sub.nextDate); NX.log(`Monatsrechnung ${inv.number} für Vertrag ${sub.id} als Entwurf erstellt`); NX.save(); NX.toast(`Rechnungsentwurf ${inv.number} erstellt.`); draw();
        };
        el.onclick = NX.guard(async e => {
            const b=e.target.closest('button'); if(!b) return;
            if(b.hasAttribute('data-new-abo')) {
                const m=NX.modal('Monatlichen Vertrag anlegen', `<form><div class="field"><label>Kunde *</label><select name="customerId" required><option value="">Bitte wählen</option>${D.customers.filter(c=>c.status==='aktiv').map(c=>`<option value="${esc(c.id)}">${esc(c.first+' '+c.last)}</option>`).join('')}</select></div><div class="field"><label>Projekt (optional)</label><select name="projectId"><option value="">Kein Projekt</option>${D.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><div class="row"><div class="field"><label>Paket / Vertragsname *</label><input name="packageName" required placeholder="z. B. Business Betreuung"></div><div class="field"><label>Monatspreis netto (€) *</label><input name="amount" type="number" min="0.01" step="0.01" required></div></div><div class="field"><label>Leistungsbeschreibung</label><textarea name="description" rows="3" placeholder="Enthaltene Leistungen und Support"></textarea></div><div class="row"><div class="field"><label>USt (%)</label><input name="vat" type="number" min="0" step="0.1" value="${D.settings.vatRate}"></div><div class="field"><label>Erste / nächste Abrechnung</label><input name="nextDate" type="date" value="${NX.today()}" required></div></div><p class="note">Der Preis wird als Netto-Monatsbetrag gespeichert. Die Rechnung verwendet den USt-Satz aus diesem Vertrag.</p><div class="acts"><button class="btn" type="submit">Vertrag speichern</button></div></form>`,{wide:true});
                const f=NX.$('form',m.body); f.onsubmit=e=>{e.preventDefault(); const x=NX.fd(f); if(!x.customerId||!x.packageName.trim()||NX.cents(x.amount)<=0||!x.nextDate)return; const sub={id:NX.uid('ABO'),customerId:x.customerId,projectId:x.projectId,projectName:(NX.proj(x.projectId)||{}).name||'',packageName:x.packageName.trim(),amount:NX.cents(x.amount),description:x.description.trim(),vat:Math.max(0,+x.vat||0),nextDate:x.nextDate,status:'Aktiv',created:NX.today(),generatedPeriods:[]}; D.subscriptions.push(sub); NX.log('Monatlicher Vertrag angelegt: '+sub.packageName); NX.save(); m.close(); draw();}; return;
            }
            const id=b.dataset.generate; if(id){const sub=D.subscriptions.find(x=>x.id===id); createInvoice(sub); return;}
            if(b.hasAttribute('data-generate-all')){const list=D.subscriptions.filter(x=>x.status==='Aktiv'&&x.nextDate<=NX.today()); if(!list.length)return; if(!await NX.confirm(`${list.length} fällige Monatsrechnung(en) als Entwurf erstellen?`,'Erstellen'))return; list.forEach(createInvoice); draw(); return;}
            const toggle=b.dataset.toggle; if(toggle){const sub=D.subscriptions.find(x=>x.id===toggle); if(sub){sub.status=sub.status==='Aktiv'?'Pausiert':'Aktiv'; NX.log(`Vertrag ${sub.id}: ${sub.status}`); NX.save(); draw();}}
        });
        draw();
    };

    B.invoiceModal = invoiceModal;
    B.invoicesView = el => NX.listView(el, {
        title: 'Rechnungen', ph: 'Nummer oder Kunde suchen', status: ['Entwurf', 'Offen', 'Teilbezahlt', 'Bezahlt', 'Überfällig'], add: '+ Neue Rechnung', dates: true,
        items: () => [...NX.db.invoices].sort((a, b) => b.date.localeCompare(a.date)), text: i => i.number + ' ' + NX.custName(i.customerId), stat: i => NX.invStatus(i), dateOf: i => i.date,
        kpis: all => { const v = all.filter(i => !i.draft); return NX.kpi(v.filter(i => NX.open(i) > 0).length, 'Offene Rechnungen') + NX.kpi(v.filter(i => NX.open(i) <= 0).length, 'Bezahlt') + NX.kpi(NX.eur(v.reduce((s, i) => s + NX.open(i), 0)), 'Offener Betrag') + NX.kpi(NX.eur(v.reduce((s, i) => s + NX.paid(i), 0)), 'Eingegangen'); },
        head: ['Nummer', 'Kunde', 'Datum', 'Fällig', 'Brutto', 'Bezahlt', 'Offen', 'Status', ''],
        row: i => [esc(i.number), esc(NX.custName(i.customerId)), NX.date(i.date), NX.date(i.due), NX.eur(NX.total(i)), NX.eur(NX.paid(i)), NX.eur(NX.open(i)), NX.badge(NX.invStatus(i)), NX.btn('view', i.id, 'Ansehen') + NX.btn('edit', i.id, 'Bearbeiten') + NX.btn('mail', i.id, 'Senden')],
        onAdd: r => invoiceModal(null, r),
        act: (a, id, r) => { const i = NX.db.invoices.find(x => x.id === id); if (a === 'view')
            NX.viewDoc('invoice', i);
        else if (a === 'edit')
            invoiceModal(i, r);
        else
            B.sendDoc('invoice', i, r); }
    });
    /* ---------- Erinnerungen / Mahnungen ---------- */
    B.makeReminder = (invId, type, feeOverride) => {
        const s = NX.db.settings, inv = NX.db.invoices.find(i => i.id === invId);
        if (!inv || inv.draft || NX.open(inv) <= 0) {
            NX.toast('Für diese Rechnung ist keine Erinnerung nötig.');
            return null;
        }
        const ex = NX.db.reminders.find(r => r.invoiceId === invId && r.type === type);
        if (ex) {
            NX.toast(type + ' existiert bereits (' + ex.number + ').');
            return ex;
        }
        const k = { 'Zahlungserinnerung': ['r', 'r'], '1. Mahnung': ['m1', 'm1'], '2. Mahnung': ['m2', 'm2'] }[type];
        const r = { id: NX.uid('M'), invoiceId: invId, customerId: inv.customerId, type, number: NX.nextNumber('M', NX.db.reminders), date: NX.today(), due: NX.addDays(NX.today(), s.reminderDays[k[0]] || 0), fee: feeOverride === undefined ? (s.fees[k[1]] || 0) : Math.max(0, Math.round(Number(feeOverride) || 0)) };
        NX.db.reminders.push(r);
        NX.log(type + ' erstellt: ' + r.number + ' (Rechnung ' + inv.number + ')');
        return r;
    };
    B.remindersView = el => {
        el.innerHTML = '<div class="top"><h1>Erinnerungen & Mahnungen</h1></div><h2 class="sub">Rechnungen mit offenem Betrag</h2><div id="a"></div><h2 class="sub">Erstellte Dokumente</h2><div id="b"></div>';
        const draw = () => {
            const op = NX.db.invoices.filter(i => !i.draft && NX.open(i) > 0);
            NX.$('#a', el).innerHTML = op.length ? NX.table(['Rechnung', 'Kunde', 'Fällig', 'Status', 'Offen', 'Erstellen'], op.map(i => ({ id: i.id, cells: [esc(i.number), esc(NX.custName(i.customerId)), NX.date(i.due), NX.badge(NX.invStatus(i)), NX.eur(NX.open(i)), NX.btn('Zahlungserinnerung', i.id, 'Erinnerung') + NX.btn('1. Mahnung', i.id, '1. Mahnung') + NX.btn('2. Mahnung', i.id, '2. Mahnung')] }))) : '<div class="tw"><p class="empty">Keine offenen Rechnungen.</p></div>';
            const rs = [...NX.db.reminders].sort((a, b) => b.date.localeCompare(a.date));
            NX.$('#b', el).innerHTML = rs.length ? NX.table(['Nummer', 'Art', 'Rechnung', 'Kunde', 'Datum', 'Zahlbar bis', 'Gebühr', ''], rs.map(r => { const i = NX.db.invoices.find(x => x.id === r.invoiceId) || {}; return { id: r.id, cells: [esc(r.number), NX.badge(r.type), esc(i.number || '–'), esc(NX.custName(r.customerId)), NX.date(r.date), NX.date(r.due), NX.eur(r.fee), NX.btn('view', r.id, 'Ansehen') + NX.btn('mail', r.id, 'Senden')] }; })) : '<div class="tw"><p class="empty">Noch keine Dokumente erstellt.</p></div>';
        };
        el.onclick = e => {
            const b = e.target.closest('[data-act]');
            if (!b)
                return;
            const a = b.dataset.act, id = b.dataset.id;
            if (a === 'view' || a === 'mail') {
                const r = NX.db.reminders.find(x => x.id === id);
                if (a === 'view') NX.viewDoc('reminder', r); else B.sendDoc('reminder', r, () => NX.refresh && NX.refresh());
            }
            else {
                const invoice = NX.db.invoices.find(i => i.id === id);
                if (!invoice) return;
                const existing = NX.db.reminders.find(r => r.invoiceId === id && r.type === a);
                if (existing) {
                    NX.toast(a + ' existiert bereits (' + existing.number + ').');
                    NX.viewDoc('reminder', existing);
                    return;
                }
                const feeKey = { 'Zahlungserinnerung': 'r', '1. Mahnung': 'm1', '2. Mahnung': 'm2' }[a];
                const defaultFee = (NX.db.settings.fees && NX.db.settings.fees[feeKey]) || 0;
                const feeModal = NX.modal(a + ' erstellen', `<form id="reminder-fee-form" novalidate><p>Die voreingestellte Gebühr stammt aus den Einstellungen. Du kannst sie für dieses Dokument individuell ändern.</p><div class="field"><label for="reminder-fee">Gebühr (€)</label><input id="reminder-fee" name="fee" type="number" min="0" step="0.01" value="${(defaultFee / 100).toFixed(2)}" required></div><div class="acts"><button class="btn" type="submit">Dokument erstellen</button><button class="btn ghost" type="button" data-cancel>Abbrechen</button></div></form>`, { wide: false });
                const feeForm = NX.$('#reminder-fee-form', feeModal.body);
                NX.$('#reminder-fee', feeModal.body).addEventListener('input', ev => ev.target.setCustomValidity(''));
                feeForm.onsubmit = NX.guard(async ev => {
                    ev.preventDefault();
                    const field = NX.$('#reminder-fee', feeModal.body);
                    if (field.value === '' || !Number.isFinite(Number(field.value)) || Number(field.value) < 0) {
                        field.setCustomValidity('Bitte eine gültige Gebühr ab 0,00 € eingeben.');
                        field.reportValidity();
                        return;
                    }
                    const r = B.makeReminder(id, a, NX.cents(field.value));
                    feeModal.close();
                    draw();
                    if (r) NX.viewDoc('reminder', r);
                });
                NX.$('[data-cancel]', feeModal.body).onclick = () => feeModal.close();
            }
        };
        draw();
    };
})();
