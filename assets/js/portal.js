/* NEXORA by AL – Kundenportal (lokale Demo, ohne Backend) */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc;
    NX.ready.then(() => {
        NX.layout();
        // Abgelaufene lokale Löschvormerkungen beim nächsten Start endgültig aus dem Demo-Loginbestand entfernen.
        const now = Date.now();
        NX.db.customers = NX.db.customers.filter(c => c.status !== 'loeschung_vorgemerkt' || !c.restoreUntil || now <= c.restoreUntil);
        NX.save();
        const session = NX.sess.get('customer');
        const customer = session ? NX.cust(session.user) : null;
        if (customer && customer.status === 'aktiv' && customer.role !== 'Mitarbeiter') {
            app();
        }
        else {
            NX.sess.clear('customer');
            auth();
        }
    });
    const me = () => NX.cust((NX.sess.get('customer') || {}).user);
    const setErr = (f, n, t) => { const e = NX.$('[name=' + n + ']', f).closest('.field').querySelector('.err') || 0; if (e)
        e.textContent = t; };
    function auth() {
        const D = NX.db, root = NX.$('#root');
        root.innerHTML = `<div class="center"><div class="card login" style="max-width:480px"><h2>Kundenportal</h2>
 <div class="tabs"><button type="button" class="btn" data-t="l">Anmelden</button><button type="button" class="btn ghost" data-t="r">Registrieren</button></div><div id="av"></div></div></div>`;
        const av = NX.$('#av'), tabs = NX.$$('.tabs button');
        const show = t => { tabs.forEach(b => b.className = 'btn' + (b.dataset.t === t ? '' : ' ghost')); t === 'l' ? loginForm() : regForm(); };
        tabs.forEach(b => b.onclick = () => show(b.dataset.t));
        function loginForm() {
            av.innerHTML = `<form novalidate><div class="field"><label for="le">E-Mail-Adresse</label><input id="le" name="email" type="email" autocomplete="username"></div><div class="field"><label for="lp">Passwort</label><div class="nx-password-wrap"><input id="lp" name="pw" type="password" autocomplete="current-password"></div></div><p class="err" id="lerr" role="alert"></p><button class="btn" type="submit">Anmelden</button></form>`;
            const f = NX.$('form', av);
            f.onsubmit = NX.guard(async (e) => {
                e.preventDefault();
                const er = NX.$('#lerr');
                if (!NX.check(f, { email: ['req', 'email'], pw: ['req'] })) {
                    er.textContent = '';
                    return;
                }
                const x = NX.fd(f), c = D.customers.find(u => u.email.toLowerCase() === x.email.trim().toLowerCase());
                if (c && c.resetPending && c.status === 'aktiv')
                    return resetForm(c);
                if (!c || !c.pwHash || await NX.hash(x.pw) !== c.pwHash) {
                    er.textContent = 'E-Mail-Adresse oder Passwort ist falsch.' + (c && !c.pwHash ? ' Dieses Konto hat noch kein Passwort – bitte registrieren.' : '');
                    return;
                }
                if (c.status === 'loeschung_vorgemerkt') {
                    if (c.archivedBy === 'Administrator' && c.restoreUntil && Date.now() <= c.restoreUntil) {
                        er.textContent = 'Dieses Konto wurde deaktiviert. Bitte kontaktieren Sie uns.';
                        return;
                    }
                    if (c.restoreUntil && Date.now() <= c.restoreUntil) {
                        const restore = await NX.confirm('Für dieses Konto wurde eine Löschung vorgemerkt. Möchtest du dein Konto innerhalb der 30-tägigen Frist wiederherstellen?', 'Konto wiederherstellen');
                        if (restore) {
                            NX.accounts.restore(c);
                            NX.log('Kundenkonto innerhalb der Frist wiederhergestellt: ' + c.id);
                            NX.sess.set('customer', c.id); app(); NX.toast('Dein Kundenkonto wurde wiederhergestellt.'); return;
                        }
                        er.textContent = 'Die Kontolöschung ist weiterhin vorgemerkt. Du kannst dich innerhalb der Frist anmelden und dein Konto wiederherstellen.';
                        return;
                    }
                    D.customers = D.customers.filter(u => u.id !== c.id);
                    NX.save();
                    er.textContent = 'Die Wiederherstellungsfrist ist abgelaufen. Das Konto wurde endgültig gelöscht.';
                    return;
                }
                if (c.status === 'gesperrt') {
                    er.textContent = 'Dieses Konto ist gesperrt. Bitte kontaktieren Sie uns.';
                    return;
                }
                if (c.status === 'inaktiv') {
                    er.textContent = 'Dieses Konto ist deaktiviert. Bitte kontaktieren Sie uns.';
                    return;
                }
                c.lastActivity = Date.now();
                NX.log('Kundenportal-Anmeldung: ' + c.id);
                NX.sess.set('customer', c.id);
                NX.toast('Anmeldung erfolgreich.');
                app();
            });
        }
        function resetForm(c) {
            const m = NX.modal('Neues Passwort festlegen', '<p class="mut">Ihr Passwort wurde zurückgesetzt. Bitte vergeben Sie ein neues.</p><form novalidate><div class="field"><label for="r1">Neues Passwort</label><input id="r1" name="n1" type="password" autocomplete="new-password"></div><div class="field"><label for="r2">Wiederholen</label><input id="r2" name="n2" type="password" autocomplete="new-password"></div><button class="btn" type="submit">Speichern</button></form>');
            const f = NX.$('form', m.body);
            f.onsubmit = NX.guard(async (e) => { e.preventDefault(); if (!NX.check(f, { n1: ['req', 'pw'], n2: ['req'] }))
                return; const x = NX.fd(f); if (x.n1 !== x.n2)
                return setErr(f, 'n2', 'Die Passwörter stimmen nicht überein.'); c.pwHash = await NX.hash(x.n1); c.resetPending = false; NX.log('Kunde setzt neues Passwort: ' + c.id); NX.sess.set('customer', c.id); m.close(); app(); });
        }
        function regForm() {
            av.innerHTML = `<form novalidate><div class="row"><div class="field"><label for="g1">Vorname <span class="req">*</span></label><input id="g1" name="first" autocomplete="given-name"></div><div class="field"><label for="g2">Nachname <span class="req">*</span></label><input id="g2" name="last" autocomplete="family-name"></div></div><div class="field"><label for="g3">E-Mail-Adresse <span class="req">*</span></label><input id="g3" name="email" type="email" autocomplete="email"></div><div class="field"><label for="g4">Telefonnummer <span class="req">*</span></label><input id="g4" name="phone" type="tel" autocomplete="tel"></div><div class="field"><label for="g5">Passwort <span class="req">*</span></label><input id="g5" name="pw" type="password" autocomplete="new-password"></div><div class="field"><label for="g6">Passwort bestätigen <span class="req">*</span></label><input id="g6" name="pw2" type="password" autocomplete="new-password"></div><button class="btn" type="submit">Konto lokal erstellen</button></form>`;
            const f = NX.$('form', av);
            f.onsubmit = NX.guard(async (e) => {
                e.preventDefault();
                if (!NX.check(f, { first: ['req'], last: ['req'], email: ['req', 'email'], phone: ['req', 'phone'], pw: ['req', 'pw'], pw2: ['req'] }))
                    return;
                const x = NX.fd(f);
                if (x.pw !== x.pw2)
                    return setErr(f, 'pw2', 'Die Passwörter stimmen nicht überein.');
                const ex = D.customers.find(u => u.email.toLowerCase() === x.email.trim().toLowerCase());
                if (ex && ex.pwHash)
                    return setErr(f, 'email', 'Diese E-Mail-Adresse ist bereits registriert.');
                const h = await NX.hash(x.pw);
                let c = ex;
                if (c) {
                    c.pwHash = h;
                    c.first = x.first.trim();
                    c.last = x.last.trim();
                    c.phone = x.phone.trim();
                }
                else {
                    c = { id: NX.nextId('K', D.customers), first: x.first.trim(), last: x.last.trim(), email: x.email.trim(), phone: x.phone.trim(), street: '', no: '', zip: '', city: '', country: '', status: 'aktiv', pwHash: h, created: NX.today(), resetPending: false };
                    D.customers.push(c);
                }
                NX.log('Kunde registriert (lokal): ' + c.id);
                NX.sess.set('customer', c.id);
                NX.toast('Konto erstellt.');
                app();
            });
        }
        show('l');
    }
    const docs = c => {
        const D = NX.db, L = [];
        D.offers.filter(o => o.customerId === c.id && o.status !== 'Entwurf').forEach(o => L.push({ k: 'offer:' + o.id, t: o.type, n: o.number, d: o.date, a: NX.total(o), s: NX.offStatus(o) }));
        D.invoices.filter(i => i.customerId === c.id && !i.draft).forEach(i => L.push({ k: 'invoice:' + i.id, t: i.kind, n: i.number, d: i.date, a: NX.total(i), s: NX.invStatus(i) }));
        D.reminders.filter(r => r.customerId === c.id).forEach(r => { const i = D.invoices.find(x => x.id === r.invoiceId) || {}; L.push({ k: 'reminder:' + r.id, t: r.type, n: r.number, d: r.date, a: (NX.open(i) || 0) + (r.fee || 0), s: r.type }); });
        return L.sort((a, b) => b.d.localeCompare(a.d));
    };
    const myInq = c => NX.db.inquiries.filter(i => i.customerId === c.id || i.email.toLowerCase() === c.email.toLowerCase());
    function app() {
        const D = NX.db, root = NX.$('#root'), NAV = [['dashboard', 'Dashboard'], ['anfragen', 'Anfragen'], ['dokumente', 'Dokumente'], ['projekte', 'Projekte'], ['support', 'Support & Wartung'], ['profil', 'Mein Profil']];
        root.innerHTML = `<div class="shell"><nav class="side" aria-label="Portalnavigation">${NAV.map(n => `<button type="button" data-v="${n[0]}">${n[1]}</button>`).join('')}<button type="button" id="out">Abmelden</button></nav><section class="cnt" id="pc"></section></div>`;
        const views = { dashboard, anfragen, dokumente, projekte, support, profil };
        const go = () => { const h = location.hash.slice(1), id = views[h] ? h : 'dashboard'; NX.$$('.side button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === id)); const c = me(); if (!c || c.status !== 'aktiv' || c.role === 'Mitarbeiter') {
            NX.sess.clear('customer');
            auth();
            return;
        } c.lastActivity = Date.now(); NX.save(); views[id](NX.$('#pc'), c); chatBadge(); };
        NX.$('.side').onclick = e => { const b = e.target.closest('button'); if (!b)
            return; if (b.id === 'out') {
            NX.sess.clear('customer');
            const cb = NX.$('.chat-btn'), bx = NX.$('.chat-box');
            cb && cb.remove();
            bx && bx.remove();
            location.hash = '';
            auth();
            return;
        } if (location.hash.slice(1) === b.dataset.v)
            go();
        else
            location.hash = b.dataset.v; };
        window.onhashchange = () => { if (me())
            go(); };
        NX.go = n => { location.hash = n; };
        mountChat();
        go();
    }
    function dashboard(el, c) {
        const D = NX.db, dc = docs(c), inq = myInq(c), pr = D.projects.filter(p => p.customerId === c.id), done = pr.filter(p => p.status === 'Abgeschlossen'), invs = D.invoices.filter(i => i.customerId === c.id && !i.draft), openSum = invs.reduce((s, i) => s + NX.open(i), 0), unread = (D.chat[c.id] || []).filter(m => m.from === 'team' && !m.r).length, norev = done.filter(p => !D.reviews.some(r => r.projectId === p.id)).length;
        el.innerHTML = `<h1>Willkommen, ${esc(c.first)}</h1><div class="grid" style="margin:20px 0"><button type="button" class="tile kpi" data-go="anfragen"><b>${inq.length}</b><span>Anfragen</span></button><button type="button" class="tile kpi" data-go="dokumente"><b>${dc.length}</b><span>Dokumente</span></button><button type="button" class="tile kpi" data-go="projekte"><b>${done.length}</b><span>Abgeschlossene Projekte</span></button></div>
 <div class="kp">${NX.kpi(invs.filter(i => NX.open(i) > 0).length + norev, 'Offene Aufgaben')}${NX.kpi(NX.eur(openSum), 'Offene Rechnungsbeträge')}${NX.kpi(unread, 'Ungelesene Nachrichten')}</div>
 <div class="card"><h3>Aktuelle Projektstatus</h3><ul class="list">${pr.map(p => `<li>${esc(p.name)} – ${NX.badge(p.status)}</li>`).join('') || '<li>Noch keine Projekte.</li>'}</ul></div>`;
        el.onclick = e => { const t = e.target.closest('[data-go]'); if (t)
            NX.go(t.dataset.go); };
    }
    function anfragen(el, c) { const l = myInq(c); el.innerHTML = `<div class="top"><h1>Meine Anfragen</h1><a class="btn" href="anfrage.html">Neue Projektanfrage</a></div>` + (l.length ? NX.table(['Datum', 'Betreff', 'Leistung', 'Status'], l.map(i => ({ id: i.id, cells: [NX.date(i.date), esc(i.subject), esc(i.service || '–'), NX.badge(i.status)] }))) : '<div class="tw"><p class="empty">Sie haben noch keine Anfragen gestellt.</p></div>'); }
    function dokumente(el, c) {
        const l = docs(c);
        el.innerHTML = '<h1>Meine Dokumente</h1>' + (l.length ? NX.table(['Art', 'Nummer', 'Datum', 'Betrag', 'Status', ''], l.map(d => ({ id: d.k, cells: [esc(d.t), esc(d.n), NX.date(d.d), NX.eur(d.a), NX.badge(d.s), NX.btn('view', d.k, 'Ansehen')] }))) : '<div class="tw"><p class="empty">Es sind noch keine Dokumente für Ihr Konto vorhanden.</p></div>');
        el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b)
            return; const [t, id] = b.dataset.id.split(':'), D = NX.db, o = t === 'offer' ? D.offers.find(x => x.id === id) : t === 'invoice' ? D.invoices.find(x => x.id === id) : D.reminders.find(x => x.id === id); if (o && o.customerId === c.id)
            NX.viewDoc(t, o); };
    }
    function projekte(el, c) {
        const D = NX.db, pr = D.projects.filter(p => p.customerId === c.id);
        const draw = () => { el.innerHTML = '<h1>Meine Projekte</h1>' + (pr.length ? `<div class="grid g3">${pr.map(p => { const rv = D.reviews.find(r => r.projectId === p.id); return `<div class="card"><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><p style="margin-top:8px">${NX.badge(p.status)} · ${NX.date(p.start)} – ${NX.date(p.end)}</p>${p.status === 'Abgeschlossen' ? (rv ? `<p style="margin-top:10px">Ihre Bewertung: ${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}<br>${esc(rv.text)}</p>` : `<button type="button" class="btn" data-rv="${p.id}">Projekt bewerten</button>`) : ''}</div>`; }).join('')}</div>` : '<div class="tw"><p class="empty">Noch keine Projekte.</p></div>'); };
        el.onclick = e => {
            const b = e.target.closest('[data-rv]');
            if (!b)
                return;
            const id = b.dataset.rv;
            let st = 5;
            const m = NX.modal('Projekt bewerten', '<form novalidate><div class="stars" role="group" aria-label="Sterne"></div><div class="field"><label for="rt">Ihr Feedback</label><textarea id="rt" name="text"></textarea></div><button class="btn" type="submit">Bewertung speichern</button></form>');
            const sb = NX.$('.stars', m.body), f = NX.$('form', m.body);
            const ds = () => { sb.innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${n <= st ? 'on' : ''}" data-n="${n}" aria-label="${n} Sterne">★</button>`).join(''); };
            ds();
            sb.onclick = ev => { const n = ev.target.closest('[data-n]'); if (n) {
                st = +n.dataset.n;
                ds();
            } };
            f.onsubmit = NX.guard(async (ev) => { ev.preventDefault(); if (D.reviews.some(r => r.projectId === id))
                return; D.reviews.push({ id: NX.uid('V'), projectId: id, customerId: c.id, stars: st, text: f.text.value.trim() || '(ohne Text)', date: NX.today() }); NX.log('Bewertung abgegeben: ' + id); NX.toast('Danke für Ihre Bewertung!'); m.close(); draw(); });
        };
        draw();
    }
    function support(el, c) {
        const D = NX.db;
        const draw = () => {
            const l = D.support.filter(s => s.customerId === c.id), myProj = D.projects.filter(p => p.customerId === c.id), pname = s => s.project === '__other' ? 'Andere Website / Allgemein' : ((D.projects.find(p => p.id === s.project) || {}).name || '–');
            el.innerHTML = `<h1>Support & Wartung</h1><form class="card formcard nx-supportform" novalidate><div class="row"><div class="field"><label for="sa">Art</label><select id="sa" name="type"><option>Support</option><option>Wartung</option></select></div><div class="field"><label for="sp">Für welche Website / welches Projekt? <span class="req">*</span></label><select id="sp" name="project"><option value="">Bitte auswählen …</option>${myProj.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}<option value="__other">Andere Website / Allgemein</option></select></div></div><div class="field"><label for="sb">Betreff <span class="req">*</span></label><input id="sb" name="subject"></div><div class="field"><label for="sm">Nachricht <span class="req">*</span></label><textarea id="sm" name="message"></textarea></div><button class="btn" type="submit">Anfrage senden</button></form><h2 class="sub">Meine Support-Anfragen</h2>` + (l.length ? NX.table(['Datum', 'Art', 'Website / Projekt', 'Betreff', 'Status'], l.map(s => ({ id: s.id, cells: [NX.date(s.date), esc(s.type), esc(pname(s)), esc(s.subject), NX.badge(s.status)] }))) : '<div class="tw"><p class="empty">Noch keine Support-Anfragen.</p></div>');
            const f = NX.$('form', el);
            f.onsubmit = NX.guard(async (e) => { e.preventDefault(); if (!NX.check(f, { project: ['req'], subject: ['req'], message: ['req'] }))
                return; const x = NX.fd(f); D.support.push({ project: x.project, id: NX.uid('S'), customerId: c.id, type: x.type, subject: x.subject.trim(), message: x.message.trim(), status: 'Offen', date: NX.today() }); NX.log('Support-Anfrage: ' + x.subject); NX.toast('Anfrage lokal gespeichert.'); draw(); });
        };
        draw();
    }
    function profil(el, c) {
        el.innerHTML = `<h1>Mein Profil</h1>
        <form class="card formcard" id="profile-data" novalidate><h2>Persönliche Daten</h2><div class="row"><div class="field"><label for="a1">Vorname <span class="req">*</span></label><input id="a1" name="first" value="${esc(c.first)}"></div><div class="field"><label for="a2">Nachname <span class="req">*</span></label><input id="a2" name="last" value="${esc(c.last)}"></div></div><div class="row"><div class="field"><label for="a3">E-Mail-Adresse <span class="req">*</span></label><input id="a3" name="email" type="email" value="${esc(c.email)}"></div><div class="field"><label for="a4">Telefonnummer <span class="req">*</span></label><input id="a4" name="phone" value="${esc(c.phone)}"></div></div><div class="row"><div class="field"><label for="a5">Straße</label><input id="a5" name="street" value="${esc(c.street)}"></div><div class="field"><label for="a6">Hausnummer</label><input id="a6" name="no" value="${esc(c.no)}"></div></div><div class="row"><div class="field"><label for="a7">Postleitzahl</label><input id="a7" name="zip" value="${esc(c.zip)}"></div><div class="field"><label for="a8">Ort</label><input id="a8" name="city" value="${esc(c.city)}"></div><div class="field"><label for="a9">Land</label><input id="a9" name="country" value="${esc(c.country)}"></div></div><button class="btn" type="submit">Profil speichern</button></form>
        <form class="card formcard" id="profile-password" novalidate><h2>Passwort ändern</h2><p class="mut">Bestätige zuerst dein bisheriges Passwort und vergib anschließend ein neues Passwort mit mindestens 8 Zeichen.</p><div class="field"><label for="cp-current">Aktuelles Passwort</label><input id="cp-current" name="current" type="password" autocomplete="current-password"></div><div class="field"><label for="cp-new">Neues Passwort</label><input id="cp-new" name="newpw" type="password" autocomplete="new-password"></div><div class="field"><label for="cp-confirm">Neues Passwort wiederholen</label><input id="cp-confirm" name="confirm" type="password" autocomplete="new-password"></div><p class="err" id="pw-error" role="alert"></p><button class="btn" type="submit">Passwort speichern</button></form>
        <section class="card formcard" aria-labelledby="delete-account-title"><h2 id="delete-account-title">Konto löschen</h2><p class="mut">Du kannst die Löschung deines Kundenkontos beantragen. Nach der Bestätigung wird dein Konto deaktiviert und 30 Tage im Archiv aufbewahrt; erst danach wird es endgültig gelöscht. Innerhalb dieser Frist kannst du dein Konto nach der Anmeldung wiederherstellen. Bereits erstellte Angebote, Rechnungen und Geschäftsunterlagen bleiben davon unberührt.</p><button class="btn danger" id="delete-account" type="button">Kundenkonto löschen</button></section>`;
        const f = NX.$('#profile-data', el);
        f.onsubmit = NX.guard(async (e) => { e.preventDefault(); if (!NX.check(f, { first: ['req'], last: ['req'], email: ['req', 'email'], phone: ['req', 'phone'] })) return; const x = NX.fd(f); if (NX.db.customers.some(u => u.id !== c.id && u.email.toLowerCase() === x.email.toLowerCase())) return setErr(f, 'email', 'Diese E-Mail-Adresse wird bereits verwendet.'); Object.keys(x).forEach(k => c[k] = x[k].trim()); NX.log('Profil aktualisiert: ' + c.id); NX.toast('Profil lokal gespeichert.'); });
        const pf = NX.$('#profile-password', el);
        pf.onsubmit = NX.guard(async e => { e.preventDefault(); const err = NX.$('#pw-error', pf); err.textContent = ''; if (!NX.check(pf, { current: ['req'], newpw: ['req', 'pw'], confirm: ['req'] })) return; const x = NX.fd(pf); if (await NX.hash(x.current) !== c.pwHash) { err.textContent = 'Das aktuelle Passwort ist nicht korrekt.'; return; } if (x.newpw !== x.confirm) { err.textContent = 'Die neuen Passwörter stimmen nicht überein.'; return; } if (x.current === x.newpw) { err.textContent = 'Bitte verwende ein anderes Passwort als bisher.'; return; } c.pwHash = await NX.hash(x.newpw); c.resetPending = false; NX.log('Kunde hat sein Passwort geändert: ' + c.id); pf.reset(); NX.toast('Dein Passwort wurde geändert.'); });
        NX.$('#delete-account', el).onclick = () => {
            const first = NX.modal('Konto löschen – Schritt 1 von 3', `<p>Zur Sicherheit bestätige zuerst dein aktuelles Passwort. Danach senden wir einen einmaligen Sicherheitscode an deine hinterlegte E-Mail-Adresse (<b>${esc(c.email)}</b>).</p><form id="delete-password-form" novalidate><div class="field"><label for="delete-current">Aktuelles Passwort</label><div class="nx-password-wrap"><input id="delete-current" name="current" type="password" autocomplete="current-password" required></div></div><p class="err" id="delete-password-error" role="alert"></p><div class="acts"><button type="button" class="btn ghost" data-cancel>Abbrechen</button><button type="submit" class="btn">Weiter</button></div></form>`);
            NX.$('[data-cancel]', first.body).onclick = first.close;
            const pf = NX.$('#delete-password-form', first.body);
            pf.onsubmit = NX.guard(async e => {
                e.preventDefault();
                const value = pf.elements.current.value;
                const err = NX.$('#delete-password-error', pf); err.textContent = '';
                if (!value || await NX.hash(value) !== c.pwHash) { err.textContent = 'Das aktuelle Passwort ist nicht korrekt.'; return; }
                first.close();
                await requestDeletionCode();
            });

            async function requestDeletionCode() {
                const apiBase = window.NEXORA_API_BASE || '';
                let demoCode = '', requestId = '', demoCodeExpiresAt = 0, demoAttempts = 0;
                const sendFormSubmit = (recipient, payload) => NX.formsubmit(Object.assign({ _to: recipient }, payload)).then(result => { if (!result.ok) throw new Error(result.msg); return result; });
                if (apiBase) {
                    try {
                        const response = await fetch(apiBase.replace(/\/$/, '') + '/account/deletion/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: c.id, email: c.email }) });
                        const result = await response.json();
                        if (!response.ok || !result.requestId) throw new Error(result.message || 'Der Sicherheitscode konnte nicht versendet werden.');
                        requestId = result.requestId;
                    } catch (error) { NX.toast(error.message || 'E-Mail-Versand fehlgeschlagen.'); return; }
                } else {
                    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); demoCode = String(bytes[0] % 1000000).padStart(6, '0'); demoCodeExpiresAt = Date.now() + 10 * 60 * 1000;
                    try {
                        await sendFormSubmit(c.email, { _subject: 'Ihr NEXORA Sicherheitscode zur Kontolöschung', Name: c.first + ' ' + c.last, Sicherheitscode: demoCode, Gültigkeit: '10 Minuten', Hinweis: 'Wenn Sie diese Löschung nicht angefordert haben, ignorieren Sie diese E-Mail.' });
                    } catch (error) { NX.toast('Sicherheitscode konnte nicht per FormSubmit versendet werden: ' + error.message); return; }
                }
                const codeModal = NX.modal('E-Mail-Code – Schritt 2 von 3', `<p>Gib den einmaligen sechsstelligen Sicherheitscode ein, der an <b>${esc(c.email)}</b> gesendet wurde. Der Code ist 10 Minuten gültig.</p><form id="delete-code-form" novalidate><div class="field"><label for="delete-code">Einmaliger Sicherheitscode</label><input id="delete-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6-stelliger Code" required></div><p class="err" id="delete-code-error" role="alert"></p><div class="acts"><button type="button" class="btn ghost" data-cancel>Abbrechen</button><button type="submit" class="btn">Code bestätigen</button></div></form>`);
                NX.$('[data-cancel]', codeModal.body).onclick = codeModal.close;
                const cf = NX.$('#delete-code-form', codeModal.body);
                cf.onsubmit = NX.guard(async e => {
                    e.preventDefault();
                    const entered = cf.elements.code.value.trim(), err = NX.$('#delete-code-error', cf); err.textContent = '';
                    if (!/^\d{6}$/.test(entered)) { err.textContent = 'Bitte gib den sechsstelligen Code ein.'; return; }
                    let verified = false;
                    if (apiBase) {
                        try {
                            const response = await fetch(apiBase.replace(/\/$/, '') + '/account/deletion/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, code: entered }) });
                            const result = await response.json(); verified = response.ok && result.verified === true;
                        } catch (_) { verified = false; }
                    } else {
                        demoAttempts += 1;
                        verified = demoAttempts <= 5 && Date.now() <= demoCodeExpiresAt && entered === demoCode;
                    }
                    if (!verified) { err.textContent = demoAttempts >= 5 && !apiBase ? 'Zu viele Fehlversuche. Bitte starte den Löschvorgang erneut.' : 'Der Code ist ungültig oder abgelaufen. Bitte überprüfe deine Eingabe.'; return; }
                    codeModal.close(); finalDeletionConfirmation(apiBase, requestId);
                });
            }

            async function finalDeletionConfirmation(apiBase, requestId) {
                const sendFormSubmit = (recipient, payload) => NX.formsubmit(Object.assign({ _to: recipient }, payload)).then(result => { if (!result.ok) throw new Error(result.msg); return result; });
                const final = NX.modal('Löschung bestätigen – Schritt 3 von 3', `<p><b>Möchtest du dein Kundenkonto jetzt wirklich löschen lassen?</b></p><p>Dein Zugang wird deaktiviert und dein Konto 30 Tage im Archiv aufbewahrt; erst danach wird es endgültig gelöscht. Du erhältst eine Bestätigungs-E-Mail mit dem letzten Tag zur Wiederherstellung. Innerhalb dieser Frist kannst du dich mit deinem bisherigen Zugang anmelden und die Löschung rückgängig machen.</p><p class="mut">Angebote, Rechnungen und andere Geschäftsunterlagen bleiben im Adminbereich erhalten.</p><div class="acts"><button type="button" class="btn ghost" data-cancel>Abbrechen</button><button type="button" class="btn danger" data-delete-now>Jetzt löschen</button></div><p class="err" id="delete-final-error" role="alert"></p>`);
                NX.$('[data-cancel]', final.body).onclick = final.close;
                NX.$('[data-delete-now]', final.body).onclick = NX.guard(async () => {
                    const now = Date.now(), restoreUntil = now + 30 * 24 * 60 * 60 * 1000;
                    if (apiBase) {
                        try {
                            const response = await fetch(apiBase.replace(/\/$/, '') + '/account/deletion/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) });
                            const result = await response.json();
                            if (!response.ok || result.scheduled !== true) throw new Error(result.message || 'Die Löschung oder Bestätigungs-E-Mail konnte nicht abgeschlossen werden.');
                        } catch (error) { NX.$('#delete-final-error', final.body).textContent = error.message || 'Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.'; return; }
                    }
                    try {
                        await sendFormSubmit(c.email, { _subject: 'Bestätigung: Ihr NEXORA-Konto wird in 30 Tagen gelöscht', Name: c.first + ' ' + c.last, Löschvormerkung: new Date(now).toLocaleString('de-AT'), Wiederherstellung_bis: new Date(restoreUntil).toLocaleDateString('de-AT'), Hinweis: 'Sie können Ihr Konto innerhalb von 30 Tagen durch erneute Anmeldung wiederherstellen.' });
                    } catch (error) { NX.$('#delete-final-error', final.body).textContent = 'Die Bestätigungs-E-Mail konnte nicht über FormSubmit versendet werden. Die Löschung wurde nicht vorgemerkt. ' + error.message; return; }
                    NX.accounts.archive(c, 'Kunde'); c.deletionRequestedAt = now; c.deletedAt = now; c.restoreUntil = restoreUntil;
                    c.deletionEmailStatus = 'von FormSubmit angenommen';
                    NX.log('Kundenkonto zur Löschung vorgemerkt (30 Tage): ' + c.id); NX.save();
                    NX.mailLog(c.email, 'Bestätigung Ihrer Kontolöschung', 'Kontolöschung', 'von FormSubmit angenommen');
                    NX.sess.clear('customer');
                    const cb = NX.$('.chat-btn'), bx = NX.$('.chat-box'); cb && cb.remove(); bx && bx.remove();
                    final.close(); location.hash = ''; auth();
                    NX.toast('Dein Konto wurde deaktiviert und 30 Tage im Archiv aufbewahrt.');
                });
            }
        };
    }
    /* ---- Chat (lokal simuliert) ---- */
    function chatBadge() { const c = me(), b = NX.$('.chat-btn i'); if (!c)
        return; const n = (NX.db.chat[c.id] || []).filter(m => m.from === 'team' && !m.r).length; if (b)
        b.textContent = n, b.hidden = !n; }
    function mountChat() {
        if (NX.$('.chat-btn'))
            return;
        const btn = document.createElement('button'), box = document.createElement('div');
        btn.type = 'button';
        btn.className = 'chat-btn';
        btn.setAttribute('aria-label', 'Chat öffnen');
        btn.innerHTML = '💬<i hidden></i>';
        box.className = 'chat-box';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-label', 'Chat');
        box.innerHTML = '<div class="ch"><span>Chat</span><button type="button" aria-label="Chat schließen">✕</button></div><div class="cm"></div><form class="cf"><input name="t" aria-label="Nachricht" placeholder="Nachricht schreiben…" autocomplete="off"><button class="btn sm" type="submit">Senden</button></form>';
        document.body.append(btn, box);
        const cm = NX.$('.cm', box), f = NX.$('form', box), draw = () => { const c = me(); if (!c)
            return; const l = NX.db.chat[c.id] = NX.db.chat[c.id] || []; cm.innerHTML = '' + l.map(m => `<div class="msg${m.from === 'me' ? ' me' : ''}">${esc(m.text)}<small>${NX.dt(m.t)}</small></div>`).join(''); cm.scrollTop = cm.scrollHeight; };
        const toggle = o => { const open = o === undefined ? !box.classList.contains('open') : o; box.classList.toggle('open', open); if (open) {
            const c = me();
            (NX.db.chat[c.id] || []).forEach(m => m.r = true);
            NX.save();
            draw();
            chatBadge();
        } };
        btn.onclick = () => toggle();
        NX.$('.ch button', box).onclick = () => toggle(false);
        f.onsubmit = e => { e.preventDefault(); const t = f.t.value.trim(), c = me(); if (!t || !c)
            return; (NX.db.chat[c.id] = NX.db.chat[c.id] || []).push({ from: 'me', text: t, t: Date.now(), r: true }); NX.save(); f.t.value = ''; draw(); };
    }
})();
