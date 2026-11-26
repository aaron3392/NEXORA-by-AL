/* NEXORA by AL – Administration */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc;
    const sel = (arr, v) => arr.map(s => `<option${s === v ? ' selected' : ''}>${s}</option>`).join('');
    const nm = c => esc(c.first + ' ' + c.last);
    function dashboard(el) {
        const D = NX.db, inv = D.invoices.filter(i => !i.draft);
        const months = [];
        for (let k = 5; k >= 0; k--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - k);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        const sums = months.map(m => D.invoices.reduce((s, i) => s + (i.payments || []).filter(p => p.date.startsWith(m)).reduce((a, p) => a + p.amount, 0), 0)), mx = Math.max(...sums, 1);
        const act = [...D.inquiries.map(i => ({ t: i.date, x: 'Anfrage: ' + i.subject + ' (' + i.first + ' ' + i.last + ')' })), ...D.support.map(s => ({ t: s.date, x: 'Support: ' + s.subject }))].sort((a, b) => b.t.localeCompare(a.t)).slice(0, 6);
        el.innerHTML = `<h1>Dashboard</h1><div class="kp">
 ${NX.kpi(D.inquiries.filter(i => i.status === 'Neu').length, 'Neue Anfragen')}${NX.kpi(D.projects.filter(p => p.status === 'Laufend').length, 'Aktive Projekte')}${NX.kpi(D.projects.filter(p => p.status === 'Abgeschlossen').length, 'Abgeschlossene Projekte')}${NX.kpi(D.offers.filter(o => ['Entwurf', 'Versendet'].includes(NX.offStatus(o))).length, 'Offene Angebote')}
 ${NX.kpi(inv.filter(i => NX.open(i) > 0).length, 'Offene Rechnungen')}${NX.kpi(inv.filter(i => NX.open(i) <= 0).length, 'Bezahlte Rechnungen')}${NX.kpi(NX.eur(inv.reduce((s, i) => s + NX.open(i), 0)), 'Offene Beträge')}${NX.kpi(NX.eur(inv.reduce((s, i) => s + NX.paid(i), 0)), 'Umsatz (eingegangen)')}</div>
 <div class="grid g3"><div class="card"><h3>Umsatzübersicht (letzte 6 Monate)</h3><div class="bars">${sums.map(v => `<div style="height:${Math.round(v / mx * 100)}%"><i>${v ? NX.eur(v) : ''}</i></div>`).join('')}</div><div class="bl">${months.map(m => `<span>${m.slice(5)}/${m.slice(2, 4)}</span>`).join('')}</div></div>
 <div class="card"><h3>Aktuelle Aktivitäten</h3><ul class="list">${act.map(a => `<li>${NX.date(a.t)} – ${esc(a.x)}</li>`).join('') || '<li>Keine Aktivitäten.</li>'}</ul></div>
 <div class="card"><h3>Letzte Änderungen</h3><ul class="list">${D.activity.slice(0, 7).map(a => `<li>${NX.dt(a.t)} – ${esc(a.text)}</li>`).join('')}</ul></div></div>`;
    }
    /* ---- Anfragen ---- */
    const IST = ['Neu', 'In Bearbeitung', 'Angebot erstellt', 'Angenommen', 'Abgelehnt', 'Archiviert'];
    function inquiryModal(id, done) {
        const D = NX.db, i = D.inquiries.find(x => x.id === id);
        const detailRows = Object.entries(i.projectDetails || {}).map(([k,v]) => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(Array.isArray(v) ? v.join(', ') : v || '–')}</dd>`).join('');
        const m = NX.modal('Anfrage ' + i.id, `<h3>Kontaktdaten und Projekt</h3><dl class="dl"><dt>Datum</dt><dd>${NX.date(i.date)}</dd><dt>Name</dt><dd>${nm(i)}</dd><dt>E-Mail</dt><dd>${esc(i.email)}</dd><dt>Telefon</dt><dd>${esc(i.phone || '–')}</dd>${i.company ? `<dt>Firma</dt><dd>${esc(i.company)}${i.vatId ? ' · UID ' + esc(i.vatId) : ''}</dd>` : ''}${i.street ? `<dt>Rechnungsadresse</dt><dd>${esc(i.street)} ${esc(i.no || '')}, ${esc(i.zip || '')} ${esc(i.city || '')}, ${esc(i.country || '')}</dd>` : ''}${i.contactPref ? `<dt>Bevorzugter Kontakt</dt><dd>${esc(i.contactPref)}</dd>` : ''}<dt>Betreff</dt><dd>${esc(i.subject)}</dd><dt>Leistung</dt><dd>${esc(i.service || '–')}</dd><dt>Projektbeschreibung</dt><dd>${esc(i.message)}</dd>${detailRows}<dt>Budget / Zeitrahmen</dt><dd>${esc(i.budget || '–')} / ${esc(i.timeframe || '–')}</dd>${i.wishDate ? `<dt>Wunschtermin</dt><dd>${NX.date(i.wishDate)}</dd>` : ''}</dl><h3>Zahlung, Paket und Hosting</h3><dl class="dl"><dt>Zahlungsmodell</dt><dd>${esc(i.paymentModel || 'Nicht angegeben')}</dd><dt>Monatliches Paket</dt><dd>${esc(i.monthlyPackage || '–')}</dd><dt>Monatspreis</dt><dd>${esc(i.monthlyPrice || '–')}</dd><dt>Paketleistungen</dt><dd>${esc(i.packageDescription || '–')}</dd><dt>Enthaltener Support</dt><dd>${esc(i.packageSupport || '–')}</dd><dt>Hosting</dt><dd>${esc(i.hostingModel === 'eigen' ? 'Eigenes Hosting' : i.hostingModel === 'nexora' ? 'NEXORA Hosting' : '–')}</dd><dt>Hosting-Details</dt><dd>${esc(i.hostingNotes || '–')}</dd><dt>Zusatzinformationen</dt><dd>${esc(i.notes || '–')}</dd><dt>Quelle</dt><dd>${esc(i.source)}</dd></dl>
 <form novalidate><div class="field"><label for="is">Status</label><select id="is" name="status">${sel(IST, i.status)}</select></div><div class="field"><label for="in">Interne Notizen</label><textarea id="in" name="notes">${esc(i.notes)}</textarea></div>
 <div class="acts"><button class="btn" type="submit">Speichern</button><button type="button" class="btn ghost" data-ar>Archivieren</button><button type="button" class="btn ghost" data-pr${i.projectId ? ' disabled' : ''}>${i.projectId ? 'Bereits angenommen' : 'Annehmen und Projekt anlegen'}</button><button type="button" class="btn ghost" data-ml>Antwort vorbereiten</button></div></form>`);
        if (NX.attachments) NX.attachments(m.body, { owner: 'inquiry:' + i.id, title: 'Dateien zur Anfrage', note: 'Intern – der Kunde sieht diese Dateien nicht.' });
        const f = NX.$('form', m.body);
        f.onsubmit = e => { e.preventDefault(); Object.assign(i, NX.fd(f)); NX.log('Anfrage aktualisiert: ' + i.id); NX.toast('Anfrage gespeichert.'); m.close(); done(); };
        NX.$('[data-ar]', m.body).onclick = async () => {
            if (await NX.confirm('Anfrage archivieren?', 'Archivieren')) {
                i.status = 'Archiviert';
                NX.log('Anfrage archiviert: ' + i.id);
                m.close();
                done();
            }
        };
        NX.$('[data-ml]', m.body).onclick = () => NX.mailPreview({ kind: 'Anfrage-Antwort', to: i.email, subject: 'Ihre Anfrage: ' + i.subject, message: `Guten Tag ${i.first} ${i.last},\n\nvielen Dank für Ihre Anfrage „${i.subject}“.\n\n\n\nMit freundlichen Grüßen\n${NX.db.settings.company}` });
        NX.$('[data-pr]', m.body).onclick = NX.guard(async () => {
            if (i.projectId)
                return;
            let c = D.customers.find(x => x.email.toLowerCase() === i.email.toLowerCase());
            if (!c) {
                c = { id: NX.nextId('K', D.customers), first: i.first, last: i.last, email: i.email, phone: i.phone || '', company: i.company || '', vatId: i.vatId || '', street: i.street || '', no: i.no || '', zip: i.zip || '', city: i.city || '', country: i.country || '', status: 'aktiv', pwHash: null, created: NX.today(), resetPending: false };
                D.customers.push(c);
            }
            else ['company', 'vatId', 'street', 'no', 'zip', 'city', 'country'].forEach(k => { if (!c[k] && i[k]) c[k] = i[k]; });
            const p = { id: NX.nextId('P', D.projects), name: i.subject, customerId: c.id, desc: i.message, cat: i.service || '', status: 'Geplant', start: NX.today(), end: '', price: 0, notes: '', inquiryId: i.id, paymentModel: i.paymentModel || 'einmalig', monthlyPackage: i.monthlyPackage || '', monthlyPrice: i.monthlyPrice || '', packageDescription: i.packageDescription || '', packageSupport: i.packageSupport || '', hostingModel: i.hostingModel || '', hostingNotes: i.hostingNotes || '', projectDetails: i.projectDetails || {} };
            D.projects.push(p);
            i.customerId = c.id;
            i.projectId = p.id;
            i.status = 'Angenommen';
            NX.log('Anfrage ' + i.id + ' in Projekt ' + p.id + ' übernommen');
            NX.toast('Anfrage angenommen – Projekt ' + p.id + ' angelegt.');
            m.close();
            done();
            location.hash = 'projekte';   /* Weiter im Projekt: Kostenvoranschlag, Angebot, Rechnung */
            setTimeout(() => projectModal(p.id, () => NX.refresh && NX.refresh()), 350);
        });
    }
    function anfragen(el) {
        NX.listView(el, {
            title: 'Anfragen', ph: 'Name, E-Mail oder Betreff suchen', status: IST, items: () => NX.db.inquiries.filter(i => !i.projectId).sort((a, b) => b.date.localeCompare(a.date)), text: i => `${i.first} ${i.last} ${i.email} ${i.subject}`, stat: i => i.status,
            head: ['Datum', 'Name', 'E-Mail', 'Betreff', 'Quelle', 'Status'], row: i => [NX.date(i.date), nm(i), esc(i.email), esc(i.subject), esc(i.source), NX.badge(i.status)], onRow: (id, r) => inquiryModal(id, r)
        });
        const s = document.createElement('div');
        el.appendChild(s);
        const draw = () => { s.innerHTML = '<h2 class="sub">Support- & Wartungsanfragen</h2>' + (NX.db.support.length ? NX.table(['Datum', 'Kunde', 'Art', 'Website / Projekt', 'Betreff', 'Status'], NX.db.support.map(x => ({ id: x.id, cells: [NX.date(x.date), esc(NX.custName(x.customerId)), esc(x.type), esc(x.project === '__other' ? 'Andere Website / Allgemein' : ((NX.db.projects.find(q => q.id === x.project) || {}).name || '–')), esc(x.subject), `<select data-s="${x.id}" aria-label="Status">${sel(['Offen', 'In Bearbeitung', 'Erledigt'], x.status)}</select>`] }))) : '<div class="tw"><p class="empty">Keine Support-Anfragen.</p></div>'); };
        s.onchange = e => {
            const x = NX.db.support.find(y => y.id === e.target.dataset.s);
            if (x) {
                x.status = e.target.value;
                NX.log('Support-Status: ' + x.id + ' → ' + x.status);
                NX.toast('Status gespeichert.');
            }
        };
        draw();
    }
    /* ---- Projekte ---- */
    const PST = ['Geplant', 'Laufend', 'Pausiert', 'Abgeschlossen'];
    function projectModal(id, done) {
        const D = NX.db, isNew = !id, p = isNew ? { id: NX.nextId('P', D.projects), orderNumber: NX.nextOrderNumber(), name: '', customerId: '', desc: '', cat: '', status: 'Geplant', start: NX.today(), end: '', price: 0, notes: '' } : D.projects.find(x => x.id === id);
        if (!p.orderNumber) p.orderNumber = NX.orderNumberFor(p.id);
        const m = NX.modal(isNew ? 'Neues Projekt' : 'Projekt ' + p.id, `<form novalidate><div class="row"><div class="field"><label for="pord">Auftragsnummer</label><input id="pord" name="orderNumber" value="${esc(p.orderNumber)}" readonly><small class="mut">Diese Nummer wird auch auf den zugehörigen Rechnungen angezeigt.</small></div><div class="field"><label for="pn">Projektname <span class="req">*</span></label><input id="pn" name="name" value="${esc(p.name)}"></div></div>
 <div class="row"><div class="field"><label for="pc">Kunde <span class="req">*</span></label><select id="pc" name="customerId"><option value="">– wählen –</option>${D.customers.map(c => `<option value="${c.id}"${c.id === p.customerId ? ' selected' : ''}>${nm(c)}</option>`).join('')}</select></div><div class="field"><label for="pk">Kategorie</label><input id="pk" name="cat" value="${esc(p.cat)}"></div></div>
 <div class="field"><label for="pd">Beschreibung</label><textarea id="pd" name="desc">${esc(p.desc)}</textarea></div>
 <div class="row"><div class="field"><label for="ps">Status</label><select id="ps" name="status">${sel(PST, p.status)}</select></div><div class="field"><label for="pp">Vereinbarter Preis (€)</label><input id="pp" name="price" type="number" step="0.01" min="0" value="${(p.price / 100).toFixed(2)}"></div></div>
 <div class="row"><div class="field"><label for="p1">Startdatum</label><input id="p1" type="date" name="start" value="${p.start}"></div><div class="field"><label for="p2">Geplantes Ende</label><input id="p2" type="date" name="end" value="${p.end}"></div></div>
 <div class="field"><label for="pno">Interne Notizen</label><textarea id="pno" name="notes">${esc(p.notes)}</textarea></div>
 ${isNew ? '' : `<p class="mut">Angebote: ${D.offers.filter(o => o.projectId === p.id).map(o => esc(o.number)).join(', ') || '–'}<br>Rechnungen: ${D.invoices.filter(o => o.projectId === p.id).map(o => esc(o.number)).join(', ') || '–'}</p>`}
 <div class="acts"><button class="btn" type="submit">Speichern</button>${!isNew && p.paymentModel === 'monatlich' && !(D.subscriptions || []).some(x => x.projectId === p.id) ? '<button type="button" class="btn ghost" data-subscription>Monatsvertrag anlegen</button>' : ''}${!isNew && p.status !== 'Abgeschlossen' ? '<button type="button" class="btn ghost" data-fin>Projekt abschließen</button>' : ''}</div></form>`);
        if (!isNew && NX.bill) {   /* Dokumente zum Projekt: Kostenvoranschlag, Angebot, Rechnung erstellen, ansehen, bearbeiten, senden */
            const box = document.createElement('section'); box.className = 'nx-pdocs'; m.body.appendChild(box);
            const draw = () => {
                const rows = [...D.offers.filter(o => o.projectId === p.id).map(o => ({ t: 'offer', d: o, kind: o.type || 'Angebot', st: NX.offStatus(o) })), ...D.invoices.filter(r => r.projectId === p.id).map(r => ({ t: 'invoice', d: r, kind: r.kind || 'Rechnung', st: NX.invStatus(r) }))].sort((x, y) => String(y.d.date).localeCompare(String(x.d.date)));
                box.innerHTML = '<h3>Dokumente zum Projekt</h3><div class="acts"><button type="button" class="btn sm" data-new="kv">+ Kostenvoranschlag</button><button type="button" class="btn sm" data-new="offer">+ Angebot</button><button type="button" class="btn sm" data-new="invoice">+ Rechnung</button></div>'
                    + (rows.length ? '<ul class="nx-att-list">' + rows.map((r, k) => `<li><span><strong>${esc(r.kind)} ${esc(r.d.number)}</strong> <small class="mut">${NX.date(r.d.date)} · ${NX.eur(NX.total(r.d))}</small> ${NX.badge(r.st)}</span><span class="nx-att-act"><button type="button" class="btn ghost sm" data-a="view" data-k="${k}">Ansehen</button><button type="button" class="btn ghost sm" data-a="edit" data-k="${k}">Bearbeiten</button><button type="button" class="btn ghost sm" data-a="mail" data-k="${k}">Senden</button></span></li>`).join('') + '</ul>' : '<p class="mut">Noch keine Dokumente. Lege oben einen Kostenvoranschlag, ein Angebot oder eine Rechnung für dieses Projekt an.</p>');
                box._rows = rows;
            };
            draw();
            box.onclick = e => {
                const n = e.target.closest('[data-new]'), a = e.target.closest('[data-a]'), pre = { customerId: p.customerId, projectId: p.id };
                if (n) { if (n.dataset.new === 'invoice') NX.bill.invoiceModal(null, draw, pre); else NX.bill.offerModal(null, draw, Object.assign(pre, { type: n.dataset.new === 'kv' ? 'Kostenvoranschlag' : 'Angebot' })); }
                else if (a) { const r = box._rows[+a.dataset.k]; if (a.dataset.a === 'view') NX.viewDoc(r.t, r.d); else if (a.dataset.a === 'edit') (r.t === 'offer' ? NX.bill.offerModal(r.d, draw) : NX.bill.invoiceModal(r.d, draw)); else NX.bill.sendDoc(r.t, r.d, draw); }
            };
        }
        if (!isNew && NX.attachments) NX.attachments(m.body, { owner: 'project:' + p.id, also: p.inquiryId ? ['inquiry:' + p.inquiryId] : [], title: 'Dateien zum Projekt', note: 'Dateien dieses Projekts sieht auch der Kunde im Portal. Dateien der ursprünglichen Anfrage bleiben intern.' });
        const f = NX.$('form', m.body);
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            if (!NX.check(f, { name: ['req'], customerId: ['req'] }))
                return;
            const x = NX.fd(f);
            x.price = NX.cents(x.price);
            Object.assign(p, x);
            if (isNew)
                D.projects.push(p);
            NX.log((isNew ? 'Projekt erstellt: ' : 'Projekt geändert: ') + p.name);
            NX.toast('Projekt gespeichert.');
            m.close();
            done();
        });
        const subButton = NX.$('[data-subscription]', m.body);
        if (subButton) subButton.onclick = () => NX.bill.createSubscriptionFromProject(p, done);
        const fin = NX.$('[data-fin]', m.body);
        if (fin)
            fin.onclick = async () => {
                if (await NX.confirm('Projekt als abgeschlossen markieren? Der Kunde kann es dann bewerten.', 'Abschließen')) {
                    p.status = 'Abgeschlossen';
                    NX.log('Projekt abgeschlossen: ' + p.name);
                    m.close();
                    done();
                }
            };
    }
    function projekte(el) {
        NX.listView(el, {
            title: 'Projekte', ph: 'Projekt oder Kunde suchen', status: PST, add: '+ Neues Projekt', items: () => NX.db.projects, text: p => p.name + ' ' + NX.custName(p.customerId), stat: p => p.status,
            head: ['ID', 'Projekt', 'Kunde', 'Kategorie', 'Status', 'Start', 'Ende', 'Preis'], row: p => [esc(p.id), esc(p.name), esc(NX.custName(p.customerId)), esc(p.cat), NX.badge(p.status), NX.date(p.start), NX.date(p.end), NX.eur(p.price)], onRow: (id, r) => projectModal(id, r), onAdd: r => projectModal(null, r)
        });
    }
    /* ---- Userverwaltung ---- */
    function userModal(id, done) {
        const D = NX.db;
        const existing = id ? NX.cust(id) : null;
        const c = existing ? { ...existing } : {
            id: NX.nextId('K', D.customers),
            first: '',
            last: '',
            email: '',
            phone: '',
            street: '',
            no: '',
            zip: '',
            city: '',
            country: '',
            companyName: '',
            notes: '',
            role: 'Kunde',
            status: 'aktiv',
            pwHash: null,
            resetPending: true,
            created: NX.today(),
            lastActivity: ''
        };
        const isNew = !existing;
        const m = NX.modal(isNew ? 'Neuen Benutzer anlegen' : `Benutzer ${c.first} ${c.last}`, `
    <form novalidate>
      <div class="row">
        <div class="field"><label for="uf">Vorname <span class="req">*</span></label><input id="uf" name="first" value="${esc(c.first)}" autocomplete="given-name"><small class="err"></small></div>
        <div class="field"><label for="ul">Nachname <span class="req">*</span></label><input id="ul" name="last" value="${esc(c.last)}" autocomplete="family-name"><small class="err"></small></div>
      </div>
      <div class="row">
        <div class="field"><label for="ue">E-Mail-Adresse <span class="req">*</span></label><input id="ue" name="email" type="email" value="${esc(c.email)}" autocomplete="email"><small class="err"></small></div>
        <div class="field"><label for="up">Telefon</label><input id="up" name="phone" type="tel" value="${esc(c.phone)}" autocomplete="tel"><small class="err"></small></div>
      </div>
      <div class="row">
        <div class="field"><label for="ur">Benutzerrolle</label><select id="ur" name="role">${sel(NX.backend && NX.backend.on && c.role !== 'Mitarbeiter' ? ['Kunde'] : ['Kunde', 'Mitarbeiter'], c.role || 'Kunde')}</select></div>
        <div class="field"><label for="us">Kontostatus</label><select id="us" name="status">${sel(['aktiv', 'inaktiv', 'gesperrt'], c.status)}</select></div>
      </div>
      <div class="field"><label for="uc">Firma (optional)</label><input id="uc" name="companyName" value="${esc(c.companyName || '')}"></div>
      <div class="row">
        <div class="field"><label for="ust">Straße</label><input id="ust" name="street" value="${esc(c.street || '')}"></div>
        <div class="field"><label for="uno">Hausnummer</label><input id="uno" name="no" value="${esc(c.no || '')}"></div>
      </div>
      <div class="row">
        <div class="field"><label for="uz">PLZ</label><input id="uz" name="zip" value="${esc(c.zip || '')}"></div>
        <div class="field"><label for="uci">Ort</label><input id="uci" name="city" value="${esc(c.city || '')}"></div>
        <div class="field"><label for="uco">Land</label><input id="uco" name="country" value="${esc(c.country || '')}"></div>
      </div>
      <div class="field"><label for="un">Interne Notizen</label><textarea id="un" name="notes" rows="3">${esc(c.notes || '')}</textarea></div>
      <div class="acts"><button class="btn" type="submit">${isNew ? 'Benutzer anlegen' : 'Änderungen speichern'}</button><button type="button" class="btn ghost" data-cancel>Abbrechen</button></div>
    </form>
    ${isNew ? '' : `<div class="acts"><button type="button" class="btn ghost sm" data-reset>Passwort zurücksetzen</button><button type="button" class="btn ghost sm" data-delete>Benutzer archivieren (30 Tage)</button></div>`}
  `, { wide: true });
        const f = NX.$('form', m.body);
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            if (!NX.check(f, { first: ['req'], last: ['req'], email: ['req', 'email'] }))
                return;
            const x = NX.fd(f);
            x.email = x.email.trim().toLowerCase();
            if (D.customers.some(u => u.id !== c.id && u.email.toLowerCase() === x.email)) {
                const field = NX.$('[name=email]', f).closest('.field');
                field.querySelector('.err').textContent = 'Diese E-Mail-Adresse wird bereits verwendet.';
                return;
            }
            const previousRole = c.role || 'Kunde';
            const previousStatus = c.status;
            Object.assign(c, x);
            c.first = c.first.trim();
            c.last = c.last.trim();
            c.email = c.email.trim().toLowerCase();
            c.phone = (c.phone || '').trim();
            c.role = c.role === 'Mitarbeiter' ? 'Mitarbeiter' : 'Kunde';
            c.lastActivity = Date.now();
            if (isNew) {
                D.customers.push(c);
                NX.log(`Benutzer angelegt: ${c.id} (${c.role})`);
            }
            else {
                const at = D.customers.findIndex(u => u.id === c.id);
                if (at >= 0)
                    D.customers[at] = c;
                NX.log(`Benutzerdaten geändert: ${c.id}`);
                if (previousRole !== c.role) {
                    NX.log(`Benutzerrolle geändert: ${c.id} (${previousRole} → ${c.role})`);
                }
                if (previousStatus !== c.status) {
                    const action = c.status === 'gesperrt' ? 'gesperrt' : previousStatus === 'gesperrt' ? 'entsperrt' : c.status === 'inaktiv' ? 'deaktiviert' : 'Status geändert';
                    NX.log(`Benutzer ${action}: ${c.id} (${previousStatus} → ${c.status})`);
                }
            }
            NX.toast(isNew ? 'Benutzer angelegt.' : 'Benutzerdaten gespeichert.');
            m.close();
            done();
        });
        NX.$('[data-cancel]', m.body).onclick = m.close;
        const reset = NX.$('[data-reset]', m.body);
        if (reset)
            reset.onclick = async () => {
                if (await NX.confirm('Das Passwort des Kunden zurücksetzen? Beim nächsten Login muss ein neues Passwort gesetzt werden.', 'Zurücksetzen')) {
                    const target = NX.cust(c.id);
                    target.pwHash = null;
                    target.resetPending = true;
                    NX.log(`Passwort zurückgesetzt: ${target.id}`);
                    NX.toast('Passwort zurückgesetzt.');
                    m.close();
                    done();
                }
            };
        const del = NX.$('[data-delete]', m.body);
        if (del)
            del.onclick = async () => {
                if (!await NX.confirm(`Benutzer ${c.first} ${c.last} archivieren und deaktivieren? Das Konto bleibt 30 Tage im Archiv und kann in dieser Zeit wiederhergestellt werden. Danach wird es endgültig gelöscht. Zugeordnete Geschäftsdaten bleiben erhalten.`, 'Archivieren'))
                    return;
                NX.accounts.archive(existing, 'Administrator');
                NX.log(`Benutzer archiviert (30 Tage bis zur endgültigen Löschung): ${c.id}`);
                NX.toast('Benutzer archiviert – endgültige Löschung nach 30 Tagen.');
                m.close();
                done();
            };
    }
    function adminAccountModal() {
        const modal = NX.modal('Geschütztes Administratorkonto', `
    <p>Dieses Systemkonto steuert den Adminbereich, die Verrechnung und die Zeiterfassung.</p>
    <dl class="dl">
      <dt>Benutzername</dt><dd>${esc(NX.db.auth.user)}</dd>
      <dt>Rolle</dt><dd>Administrator</dd>
      <dt>Status</dt><dd>${NX.badge('aktiv')}</dd>
      <dt>Passwort</dt><dd>Aus Sicherheitsgründen nicht einsehbar</dd>
    </dl>
    
    <div class="acts"><button type="button" class="btn" data-go-password>Passwort ändern</button></div>
  `);
        const button = NX.$('[data-go-password]', modal.body);
        if (button)
            button.onclick = () => {
                modal.close();
                NX.profile();
            };
    }
    /* ---- Konten für den Adminbereich (nur mit Server): Administratoren und Mitarbeiter ---- */
    const AREAS = [['anfragen', 'Anfragen', 'sehen und bearbeiten'], ['kalender', 'Kalender', 'sehen'], ['projekte', 'Projekte & Support', 'sehen und bearbeiten'], ['verrechnung', 'Verrechnung', 'Angebote, Rechnungen, Mahnungen, Verträge'], ['buchhaltung', 'Buchhaltung', 'Ausgaben, Belege, Bankbuchungen'], ['finanzen', 'Finanzen', 'Übersicht ansehen'], ['zeiterfassung', 'Zeiterfassung', 'Zeiten erfassen'], ['kunden', 'Userverwaltung', 'Kunden und Chat'], ['einstellungen', 'Einstellungen', 'Firmendaten, Website']];
    const sapi = (m, url, body) => fetch(url, { method: m, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, j })), () => ({ ok: false, j: { error: 'Server nicht erreichbar.' } }));
    const strongPw = p => p.length >= 12 && /[A-Za-z]/.test(p) && /\d/.test(p);
    function staffModal(a, role0, done) {
        const isNew = !a, me = a && a.user.toLowerCase() === String(NX.db.auth.user).toLowerCase(), role = a ? a.role : role0;
        const m = NX.modal(isNew ? (role === 'admin' ? 'Neuen Administrator anlegen' : 'Neuen Mitarbeiter anlegen') : `Konto ${esc(a.name || a.user)}`, `
    <form novalidate>
      <div class="row">
        <div class="field"><label for="sn">Name</label><input id="sn" name="name" value="${esc(a ? a.name : '')}" autocomplete="off"></div>
        <div class="field"><label for="su2">Benutzername <span class="req">*</span></label><input id="su2" name="user" value="${esc(a ? a.user : '')}" autocomplete="off"></div>
      </div>
      <div class="row">
        <div class="field"><label for="sr">Rolle</label><select id="sr" name="role" ${me ? 'disabled' : ''}><option value="employee"${role === 'employee' ? ' selected' : ''}>Mitarbeiter (nur freigegebene Bereiche)</option><option value="admin"${role === 'admin' ? ' selected' : ''}>Administrator (alles)</option></select></div>
        <div class="field"><label for="ss">Kontostatus</label><select id="ss" name="status" ${me ? 'disabled' : ''}><option value="aktiv"${!a || a.status === 'aktiv' ? ' selected' : ''}>aktiv</option><option value="gesperrt"${a && a.status === 'gesperrt' ? ' selected' : ''}>gesperrt</option></select></div>
      </div>
      <fieldset class="nx-perms" ${role === 'admin' ? 'hidden' : ''}><legend>Was darf der Mitarbeiter sehen?</legend>${AREAS.map(x => `<label class="nx-ax-chk"><input type="checkbox" name="perm" value="${x[0]}"${a && (a.perms || []).includes(x[0]) ? ' checked' : ''}> <span><strong>${x[1]}</strong> <small class="mut">${x[2]}</small></span></label>`).join('')}</fieldset>
      <div class="field"><label for="sp">${isNew ? 'Passwort (mind. 12 Zeichen, Buchstaben und Zahlen)' : 'Neues Passwort (leer lassen = unverändert)'}</label><div class="nx-password-wrap"><input id="sp" name="pw" type="password" autocomplete="new-password"></div></div>
      <p class="err" role="alert"></p>
      <div class="acts"><button class="btn" type="submit">${isNew ? 'Konto anlegen' : 'Änderungen speichern'}</button><button type="button" class="btn ghost" data-cancel>Abbrechen</button>${isNew || me ? '' : '<button type="button" class="btn ghost sm" data-del>Konto löschen</button>'}</div>
    </form>`, { wide: true });
        const f = NX.$('form', m.body), err = NX.$('.err', f), roleSel = f.role;
        roleSel.onchange = () => { NX.$('.nx-perms', f).hidden = roleSel.value === 'admin'; };
        NX.$('[data-cancel]', f).onclick = () => m.close();
        const del = NX.$('[data-del]', f);
        if (del) del.onclick = async () => { if (!await NX.confirm(`Konto „${a.user}“ endgültig löschen? Die Person kann sich danach nicht mehr anmelden.`, 'Löschen')) return; const r = await sapi('DELETE', '/api/admins/' + encodeURIComponent(a.user)); if (!r.ok) { err.textContent = r.j.error || 'Nicht möglich.'; return; } NX.log('Konto gelöscht: ' + a.user); NX.toast('Konto gelöscht.'); m.close(); done(); };
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault(); err.textContent = '';
            const user = f.user.value.trim(), pw = f.pw.value, r = me ? 'admin' : roleSel.value;
            if (user.length < 3) return void (err.textContent = 'Benutzername: mindestens 3 Zeichen.');
            if ((isNew || pw) && !strongPw(pw)) return void (err.textContent = 'Passwort: mindestens 12 Zeichen mit Buchstaben und Zahlen.');
            const perms = r === 'employee' ? [...f.querySelectorAll('[name=perm]:checked')].map(x => x.value) : [];
            if (r === 'employee' && !perms.length && !await NX.confirm('Es ist kein Bereich ausgewählt. Der Mitarbeiter sieht dann nur das Dashboard. Trotzdem speichern?', 'Speichern')) return;
            const body = { name: f.name.value.trim(), role: r, perms, status: me ? 'aktiv' : f.status.value };
            if (pw) body.hash = await NX.hash(pw);
            if (isNew) body.user = user; else if (user !== a.user) body.newUser = user;
            const res = await sapi(isNew ? 'POST' : 'PUT', isNew ? '/api/admins' : '/api/admins/' + encodeURIComponent(a.user), body);
            if (!res.ok) { err.textContent = res.j.error || 'Nicht möglich.'; return; }
            NX.log((isNew ? 'Konto angelegt: ' : 'Konto geändert: ') + user); NX.toast(isNew ? 'Konto angelegt.' : 'Gespeichert.'); m.close(); done();
        });
    }
    function addChooser(onCustomer, onStaff) {
        const t = (k, a, b) => `<button type="button" class="nx-ex-opt nx-hub-btn" data-k="${k}"><span><b>${a}</b><small>${b}</small></span></button>`;
        const m = NX.modal('Neuer Benutzer', `<p>Was für ein Benutzer soll angelegt werden?</p><div class="nx-ex-opts">${t('customer', 'Kunde', 'Zugang nur zum Kundenportal')}${t('employee', 'Mitarbeiter', 'Adminbereich – nur die freigegebenen Bereiche')}${t('admin', 'Administrator', 'Adminbereich – voller Zugriff')}</div>`);
        m.body.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; m.close(); if (b.dataset.k === 'customer') onCustomer(); else onStaff(b.dataset.k); };
    }
    /* ---- Userverwaltung ---- */
    function user(el) {
        const BE = NX.backend, A = NX.db.auth || {}, srv = !!(BE && BE.on && BE.role === 'admin'), emp = A.role === 'employee';
        let staff = [];
        const draw = () => {
            const adminRow = { id: 'ADMIN-LOCAL', first: 'NEXORA', last: 'Administrator', email: A.user, phone: '–', role: 'Administrator', status: 'aktiv', created: '', lastActivity: '' };
            const staffRows = staff.map(a => ({ id: 'STAFF:' + a.user, first: a.name || a.user, last: '', email: a.user, phone: '–', role: a.role === 'employee' ? 'Mitarbeiter' : 'Administrator', status: a.status === 'gesperrt' ? 'gesperrt' : 'aktiv', created: a.created ? new Date(a.created).toISOString().slice(0, 10) : '', lastActivity: '' }));
            const reload = () => user(el);
            NX.listView(el, {
                title: 'Userverwaltung',
                ph: 'Name, E-Mail oder Telefon suchen',
                status: ['aktiv', 'inaktiv', 'gesperrt'],
                add: '+ Neuer Benutzer',
                items: () => [...(srv ? staffRows : emp ? [] : [adminRow]), ...NX.db.customers.filter(c => c.status !== 'loeschung_vorgemerkt')],
                text: c => `${c.first} ${c.last} ${c.email} ${c.phone} ${c.role || 'Kunde'}`,
                stat: c => c.status,
                kpis: all => {
                    return NX.kpi(all.length, 'Benutzer gesamt')
                        + NX.kpi(all.filter(c => c.status === 'aktiv').length, 'Aktiv')
                        + NX.kpi(all.filter(c => c.status === 'inaktiv').length, 'Inaktiv')
                        + NX.kpi(all.filter(c => c.status === 'gesperrt').length, 'Gesperrt');
                },
                head: ['Name', 'E-Mail / Benutzername', 'Telefon', 'Rolle', 'Status', 'Registriert', 'Letzte Aktivität'],
                row: c => [
                    nm(c), esc(c.email), esc(c.phone || '–'), esc(c.role || 'Kunde'),
                    NX.badge(c.status), c.created ? NX.date(c.created) : 'Systemkonto',
                    c.lastActivity ? NX.dt(c.lastActivity) : '–'
                ],
                onRow: (id, refresh) => id === 'ADMIN-LOCAL' ? adminAccountModal() : /^STAFF:/.test(id) ? staffModal(staff.find(a => 'STAFF:' + a.user === id), null, reload) : userModal(id, refresh),
                onAdd: refresh => srv ? addChooser(() => userModal(null, refresh), k => staffModal(null, k, reload)) : userModal(null, refresh)
            });
        };
        if (srv) sapi('GET', '/api/admins').then(r => { staff = r.ok ? r.j.admins || [] : []; draw(); }); else draw();
    }
    /* ---- Einstellungen ---- */
    const L2T = (a, k) => a.map(x => k.map(f => x[f]).join('|')).join('\n'), T2L = (t, k) => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const p = l.split('|'); const o = {}; k.forEach((f, i) => o[f] = (p[i] || '').trim()); return o; });
    function einstellungen(el) {
        const s = NX.db.settings;
        el.innerHTML = `<h1>Einstellungen</h1><form class="card formcard settings-form" novalidate>
 <h3>Unternehmensdaten</h3><div class="row"><div class="field"><label for="s1">Firmenname</label><input id="s1" name="company" value="${esc(s.company)}"></div><div class="field"><label for="s2">Inhaber</label><input id="s2" name="owner" value="${esc(s.owner)}"></div></div>
 <div class="row"><div class="field"><label for="s3">Straße & Nr.</label><input id="s3" name="street" value="${esc(s.street)}"></div><div class="field"><label for="s4">PLZ</label><input id="s4" name="zip" value="${esc(s.zip)}"></div><div class="field"><label for="s5">Ort</label><input id="s5" name="city" value="${esc(s.city)}"></div></div>
 <div class="row"><div class="field"><label for="s6">E-Mail</label><input id="s6" name="email" type="email" value="${esc(s.email)}"></div><div class="field"><label for="s7">Telefon</label><input id="s7" name="phone" value="${esc(s.phone)}"></div><div class="field"><label for="s8">USt-IdNr.</label><input id="s8" name="vatId" value="${esc(s.vatId)}"></div></div>
 <div class="row"><div class="field"><label for="s9">IBAN</label><input id="s9" name="iban" value="${esc(s.iban)}"></div><div class="field"><label for="s10">BIC</label><input id="s10" name="bic" value="${esc(s.bic)}"></div></div>
 <h3>Rechnungen & Angebote</h3><div class="row"><div class="field"><label for="t1">Standard-USt (%)</label><input id="t1" name="vatRate" type="number" step="0.1" min="0" value="${s.vatRate}"></div><div class="field"><label for="t2">Fälligkeit (Tage)</label><input id="t2" name="dueDays" type="number" min="0" value="${s.dueDays}"></div><div class="field"><label for="t3">Angebotsgültigkeit (Tage)</label><input id="t3" name="offerDays" type="number" min="0" value="${s.offerDays}"></div><div class="field"><label for="t4">Standard-Stundensatz (€)</label><input id="t4" name="hourlyRate" type="number" step="0.01" min="0" value="${(s.hourlyRate / 100).toFixed(2)}"></div></div>
 <h3>Erinnerungen & Mahnungen (frei konfigurierbar)</h3><div class="row"><div class="field"><label for="f1">Frist Erinnerung (Tage)</label><input id="f1" name="dr" type="number" min="0" value="${s.reminderDays.r}"></div><div class="field"><label for="f2">Frist 1. Mahnung (Tage)</label><input id="f2" name="d1" type="number" min="0" value="${s.reminderDays.m1}"></div><div class="field"><label for="f3">Frist 2. Mahnung (Tage)</label><input id="f3" name="d2" type="number" min="0" value="${s.reminderDays.m2}"></div></div>
 <div class="row"><div class="field"><label for="g1">Gebühr Erinnerung (€)</label><input id="g1" name="fr" type="number" step="0.01" min="0" value="${(s.fees.r / 100).toFixed(2)}"></div><div class="field"><label for="g2">Gebühr 1. Mahnung (€)</label><input id="g2" name="f1" type="number" step="0.01" min="0" value="${(s.fees.m1 / 100).toFixed(2)}"></div><div class="field"><label for="g3">Gebühr 2. Mahnung (€)</label><input id="g3" name="f2" type="number" step="0.01" min="0" value="${(s.fees.m2 / 100).toFixed(2)}"></div></div>
 <div class="acts settings-actions"><button class="btn" type="submit">Einstellungen speichern</button></div></form>`;
        const f = NX.$('form', el);
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            if (!NX.check(f, { email: ['email'] }))
                return;
            const x = NX.fd(f);
            ['company', 'owner', 'street', 'zip', 'city', 'email', 'phone', 'vatId', 'iban', 'bic'].forEach(k => s[k] = x[k].trim());
            s.vatRate = parseFloat(x.vatRate) || 0;
            s.dueDays = parseInt(x.dueDays) || 0;
            s.offerDays = parseInt(x.offerDays) || 0;
            s.hourlyRate = NX.cents(x.hourlyRate);
            s.reminderDays = { r: parseInt(x.dr) || 0, m1: parseInt(x.d1) || 0, m2: parseInt(x.d2) || 0 };
            s.fees = { r: NX.cents(x.fr), m1: NX.cents(x.f1), m2: NX.cents(x.f2) };
            NX.log('Einstellungen gespeichert');
            NX.toast('Einstellungen gespeichert.');
        });
    }
    /* ---- Backup: manueller Export / Import (automatisches Backup ergänzt admin-extras.js) ---- */
    function backup(el) {
        el.innerHTML = `<h1>Backup</h1><section class="card formcard nx-ax-manual"><h3>Manuelle Sicherung</h3><div class="acts"><button type="button" class="btn ghost" id="ex">Daten exportieren</button><button type="button" class="btn ghost" id="im">Backup importieren</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div></section>`;
        NX.$('#ex', el).onclick = () => {
            const payload = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'NEXORA by AL', version: NX.db.v || 1, data: NX.db }, null, 2);
            const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexora-backup-${NX.today()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            NX.toast('Backup wurde erstellt.');
        };
        const backupInput = NX.$('#backup-file', el);
        NX.$('#im', el).onclick = () => backupInput.click();
        backupInput.onchange = async () => {
            const file = backupInput.files && backupInput.files[0];
            if (!file)
                return;
            try {
                const parsed = JSON.parse(await file.text());
                const data = parsed && parsed.data ? parsed.data : parsed;
                const requiredArrays = ['customers', 'inquiries', 'support', 'projects', 'offers', 'invoices', 'reminders', 'time', 'activity'];
                if (!data || typeof data !== 'object' || requiredArrays.some(key => !Array.isArray(data[key])) || !data.settings || !Array.isArray(data.customers)) {
                    throw new Error('Das Backup enthält nicht die erwartete NEXORA-Datenstruktur.');
                }
                if (!data.auth || typeof data.auth.user !== 'string' || typeof data.auth.hash !== 'string') {
                    throw new Error('Das Backup enthält keine gültigen Admin-Anmeldedaten.');
                }
                if (!await NX.confirm('Das Backup ersetzt die aktuell gespeicherten Daten. Exportiere zuerst ein Backup, wenn du den jetzigen Stand behalten möchtest.', 'Backup importieren'))
                    return;
                NX.db = data;
                NX.save();
                NX.log('Backup importiert');
                NX.toast('Backup importiert. Die Seite wird neu geladen.');
                location.reload();
            }
            catch (error) {
                NX.toast(error.message || 'Die Backup-Datei konnte nicht gelesen werden.');
            }
            finally {
                backupInput.value = '';
            }
        };
    }
    /* ---- Website-Einstellungen: Pakete, Hosting und Referenzprojekte ---- */
    function webseiteneinstellungen(el) {
        const s = NX.db.settings;
        el.innerHTML = `<h1>Website-Einstellungen</h1>
          
          <div class="settings-catalog">
            <section class="catalog-group"><div class="catalog-group-head"><div><h2>Website-Pakete</h2></div><button type="button" class="btn" data-add-item="packages">＋ Paket hinzufügen</button></div><div class="catalog-list" data-collection="packages"></div></section>
            <section class="catalog-group"><div class="catalog-group-head"><div><h2>Hosting & Betreuung</h2></div><button type="button" class="btn" data-add-item="hosting">＋ Hosting-Angebot hinzufügen</button></div><div class="catalog-list" data-collection="hosting"></div></section>
            <section class="catalog-group"><div class="catalog-group-head"><div><div><h2>Beispielprojekte</h2></div></div><button type="button" class="btn" data-add-item="showcase">＋ Projekt hinzufügen</button></div><div class="catalog-list" data-collection="showcase"></div></section>
          <section class="catalog-group"><div class="catalog-group-head"><div><h2>Leistungen – Mindestpreis</h2></div></div><div class="catalog-list" id="svc-prices">${(NX.serviceNames || []).map(n => `<article class="catalog-item"><div class="catalog-fields"><div class="field field-wide"><label>${esc(n)}</label><input data-svc="${esc(n)}" value="${esc((s.servicePrices || {})[n] || '')}" placeholder="z. B. 990 oder ab 990 € netto" aria-label="Mindestpreis ${esc(n)}"></div></div></article>`).join('')}</div></section>
          </div>
          <div class="acts settings-actions"><button type="button" class="btn" id="save-website-settings">Website-Einstellungen speichern</button></div>`;
        const config = {
            packages: { title: 'Paket', fields: [{ key: 'name', label: 'Paketname', placeholder: 'z. B. Business-Website' }, { key: 'price', label: 'Preis', placeholder: 'z. B. ab 990 €' }, { key: 'desc', label: 'Beschreibung / enthaltene Leistungen', placeholder: 'Was ist im Paket enthalten?', wide: true }, { key: 'support', label: 'Supportumfang', placeholder: 'z. B. E-Mail-Support, Reaktionszeit 2 Werktage', wide: true }] },
            hosting: { title: 'Hosting-Angebot', fields: [{ key: 'name', label: 'Name', placeholder: 'z. B. Hosting Plus' }, { key: 'price', label: 'Preis', placeholder: 'z. B. 19 € / Monat' }, { key: 'desc', label: 'Beschreibung', placeholder: 'Leistungsumfang und Betreuung', wide: true }] },
            showcase: { title: 'Projektbeispiel', fields: [{ key: 'name', label: 'Projektname', placeholder: 'z. B. Unternehmenswebsite' }, { key: 'cat', label: 'Kategorie', placeholder: 'z. B. Webdesign' }, { key: 'status', label: 'Status', placeholder: 'z. B. Beispielprojekt' }, { key: 'desc', label: 'Beschreibung', placeholder: 'Kurze Projektbeschreibung', wide: true }] }
        };
        const collections = {
            packages: (Array.isArray(s.packages) ? s.packages : []).map(x => ({ name: x.name || '', price: x.price || '', desc: x.desc || '', support: x.support || '' })),
            hosting: (Array.isArray(s.hosting) ? s.hosting : []).map(x => ({ name: x.name || '', price: x.price || '', desc: x.desc || '' })),
            showcase: (Array.isArray(s.showcase) ? s.showcase : []).map(x => ({ name: x.name || '', cat: x.cat || '', status: x.status || 'Beispielprojekt', desc: x.desc || '' }))
        };
        const render = key => {
            const host = NX.$(`[data-collection="${key}"]`, el), cfg = config[key], items = collections[key];
            host.innerHTML = items.length ? items.map((item, index) => `<article class="catalog-item" data-item-index="${index}"><div class="catalog-item-top"><span class="catalog-item-number">${cfg.title} ${index + 1}</span><button type="button" class="catalog-remove" data-remove-item="${key}" aria-label="${cfg.title} ${index + 1} entfernen">Entfernen</button></div><div class="catalog-fields">${cfg.fields.map(field => `<div class="field ${field.wide ? 'field-wide' : ''}"><label>${field.label}</label>${field.key === 'desc' ? `<textarea data-field="${field.key}" rows="3" placeholder="${field.placeholder}">${esc(item[field.key] || '')}</textarea>` : `<input data-field="${field.key}" value="${esc(item[field.key] || '')}" placeholder="${field.placeholder}">`}</div>`).join('')}</div></article>`).join('') : `<div class="catalog-empty">Noch keine Einträge vorhanden. Über „Hinzufügen“ kannst du einen Eintrag anlegen.</div>`;
        };
        Object.keys(collections).forEach(render);
        el.addEventListener('click', event => {
            const add = event.target.closest('[data-add-item]');
            if (add) {
                const key = add.dataset.addItem;
                collections[key].push(key === 'showcase' ? { name: '', cat: '', status: 'Beispielprojekt', desc: '' } : key === 'packages' ? { name: '', price: '', desc: '', support: '' } : { name: '', price: '', desc: '' });
                render(key); return;
            }
            const remove = event.target.closest('[data-remove-item]');
            if (remove) {
                const key = remove.dataset.removeItem, card = remove.closest('[data-item-index]'), index = Number(card?.dataset.itemIndex);
                if (Number.isInteger(index) && index >= 0) { collections[key].splice(index, 1); render(key); }
            }
        });
        NX.$('#save-website-settings', el).onclick = () => {
            const read = key => Array.from(NX.$(`[data-collection="${key}"]`, el).querySelectorAll('.catalog-item')).map(card => {
                const item = {}; card.querySelectorAll('[data-field]').forEach(input => item[input.dataset.field] = input.value.trim()); return item;
            }).filter(item => Object.values(item).some(Boolean));
            s.packages = read('packages'); s.hosting = read('hosting'); s.showcase = read('showcase'); s.servicePrices = {}; el.querySelectorAll('[data-svc]').forEach(i => { const v = i.value.trim(); if (v) s.servicePrices[i.dataset.svc] = v; });
            NX.log('Website-Einstellungen gespeichert'); NX.toast('Website-Einstellungen gespeichert.');
        };
    }


    /* ---- Passwort ändern ---- */
    /* ---- Mein Profil (Knopf mit Initialen in der Kopfleiste): Name, Benutzername, Passwort ---- */
    NX.profile = function () {
        const A = NX.db.auth || {}, BE = NX.backend, srv = !!(BE && BE.on);
        const m = NX.modal('Mein Profil', `<form novalidate>
      <div class="nx-me-big" aria-hidden="true">${NX.initials()}</div>
      <p class="mut">${A.role === 'employee' ? 'Mitarbeiter' : 'Administrator'}</p>
      <div class="row"><div class="field"><label for="mn">Name</label><input id="mn" name="name" value="${esc(A.name || '')}" autocomplete="name"></div>
      <div class="field"><label for="mu">Benutzername</label><input id="mu" name="user" value="${esc(A.user || '')}" autocomplete="username"></div></div>
      <h3>Passwort ändern</h3><p class="mut">Nur ausfüllen, wenn das Passwort geändert werden soll (mind. 12 Zeichen, Buchstaben und Zahlen).</p>
      <div class="field"><label for="mo">Bisheriges Passwort</label><div class="nx-password-wrap"><input id="mo" name="old" type="password" autocomplete="current-password"></div></div>
      <div class="row"><div class="field"><label for="m1">Neues Passwort</label><div class="nx-password-wrap"><input id="m1" name="n1" type="password" autocomplete="new-password"></div></div>
      <div class="field"><label for="m2">Neues Passwort wiederholen</label><div class="nx-password-wrap"><input id="m2" name="n2" type="password" autocomplete="new-password"></div></div></div>
      <p class="err" role="alert"></p>
      <div class="acts"><button class="btn" type="submit">Speichern</button><button type="button" class="btn ghost" data-cancel>Abbrechen</button><button type="button" class="btn ghost" data-logout style="margin-left:auto">Abmelden</button></div></form>`);
        const f = NX.$('form', m.body), err = NX.$('.err', f);
        NX.$('[data-cancel]', f).onclick = () => m.close();
        NX.$('[data-logout]', f).onclick = () => { m.close(); const l = NX.$('#lo'); if (l) l.click(); };
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault(); err.textContent = '';
            const x = NX.fd(f), user = x.user.trim(), name = x.name.trim(), pwNew = !!(x.n1 || x.n2 || x.old);
            if (user.length < 3) return void (err.textContent = 'Benutzername: mindestens 3 Zeichen.');
            let hash = null, oldHash = null;
            if (pwNew) {
                if (!x.old) return void (err.textContent = 'Bitte das bisherige Passwort eingeben.');
                if (!strongPw(x.n1)) return void (err.textContent = 'Neues Passwort: mindestens 12 Zeichen mit Buchstaben und Zahlen.');
                if (x.n1 !== x.n2) return void (err.textContent = 'Die neuen Passwörter stimmen nicht überein.');
                oldHash = await NX.hash(x.old); hash = await NX.hash(x.n1);
                if (!srv && oldHash !== A.hash) return void (err.textContent = 'Das bisherige Passwort ist falsch.');
            }
            if (srv) {
                const r = await sapi('PUT', '/api/me', { name, user, hash, oldHash }); if (!r.ok) return void (err.textContent = r.j.error || 'Nicht möglich.');
            }
            A.name = name; A.user = user; if (hash) A.hash = hash;
            try { NX.sess.set('admin', user); } catch (e) { }
            if (!srv) NX.save();
            NX.log('Profil geändert: ' + user); NX.refreshMe(); NX.toast('Profil gespeichert.'); m.close();
        });
    };
    NX.shell({
        role: 'admin', title: 'Administration',
        allow: id => {
            const A = NX.db.auth; if (!A || A.role !== 'employee') return true;
            const area = id === 'dashboard' ? '' : id === 'backup' ? '-' : id === 'user' ? 'kunden' : id === 'webseiteneinstellungen' || id === 'einstellungen' ? 'einstellungen' : /^verrechnung/.test(id) ? 'verrechnung' : /^finanzen/.test(id) ? 'finanzen' : /^zeit/.test(id) ? 'zeiterfassung' : id;
            return !area || (area !== '-' && (A.perms || []).includes(area));
        },
        nav: [
            ['dashboard', 'Dashboard'], ['kalender', 'Kalender'], ['anfragen', 'Anfragen'], ['projekte', 'Projekte'],
            { id: 'verrechnung-menu', label: 'Verrechnung', children: [['verrechnung-angebote', 'Angebote'], ['verrechnung-rechnungen', 'Rechnungen'], ['verrechnung-mahnungen', 'Erinnerungen & Mahnungen'], ['verrechnung-vertraege', 'Monatliche Verträge']] },
            { id: 'buchhaltung-menu', label: 'Buchhaltung', children: [['buchhaltung', 'Buchhaltungs-Dashboard']] },
            { id: 'finanzen-menu', label: 'Finanzen', children: [['finanzen-uebersicht', 'Finanzübersicht'], ['finanzen-zeiten', 'Zeiten abrechnen']] },
            { id: 'zeiterfassung-menu', label: 'Zeiterfassung', children: [['zeit-eintraege', 'Zeiterfassung'], ['zeit-uebersicht', 'Übersicht']] }, ['user', 'Userverwaltung'], ['webseiteneinstellungen', 'Website-Einstellungen'], ['einstellungen', 'Einstellungen'], ['backup', 'Backup']
        ],
        views: {
            buchhaltung: NX.bookkeeping.render, dashboard, anfragen, projekte, user, angebote: NX.bill.offersView, rechnungen: NX.bill.invoicesView, mahnungen: NX.bill.remindersView,
            'verrechnung-angebote': NX.financeViews.angebote, 'verrechnung-rechnungen': NX.financeViews.rechnungen, 'verrechnung-mahnungen': NX.financeViews.mahnungen, 'verrechnung-vertraege': NX.financeViews.vertraege,
            'finanzen-uebersicht': NX.financeViews.uebersicht, 'finanzen-zeiten': NX.financeViews.zeiten,
            'zeit-eintraege': NX.timeViews.eintraege, 'zeit-uebersicht': NX.timeViews.uebersicht, webseiteneinstellungen, einstellungen, backup,
            kalender: el => { el.innerHTML = '<h1>Kalender</h1>'; }
        }
    });
})();
