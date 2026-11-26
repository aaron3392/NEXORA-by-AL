/* NEXORA by AL – Kernmodul: Daten, Hilfsfunktionen, UI, Login, E-Mail-Vorschau. Kein Backend. */
(function () {
    'use strict';
    const NX = window.NX = {};
    const KEY = 'nx_db_v1', mem = {};
    const ls = NX.ls = { get(k) { try {
            return localStorage.getItem(k);
        }
        catch (e) {
            return k in mem ? mem[k] : null;
        } }, set(k, v) { try {
            localStorage.setItem(k, v);
        }
        catch (e) {
            mem[k] = v;
        } }, del(k) { try {
            localStorage.removeItem(k);
        }
        catch (e) {
            delete mem[k];
        } } };
    /* ---------- Optionaler Server (Backend) ----------
       Läuft die Seite auf dem NEXORA-Server (/api vorhanden), liegen die Daten in der Datenbank und die Anmeldung wird serverseitig geprüft.
       Ohne Server (z. B. VS Code Live Server) arbeitet alles wie bisher nur mit dem Browser-Speicher. Schlüssel im localStorage bleiben unverändert. */
    const BE = NX.backend = { on: false, role: 'none', rev: 0, empty: false };
    const SYNC_KEY = k => k === KEY || k === 'nx_accounting_v1' || k === 'nexora_cal_reminders' || /^nexora_stat_(visits|logins)$/.test(k);
    const rawSet = (() => { try { return Storage.prototype.setItem; } catch (e) { return null; } })();
    (function () {
        try {
            if (!/^https?:$/.test(location.protocol) || !rawSet) return;
            const x = new XMLHttpRequest(); x.open('GET', '/api/db', false); x.send();
            if (x.status !== 200) return;
            const r = JSON.parse(x.responseText); if (!r || r.api !== 'nexora') return;
            BE.on = true; BE.role = r.role; BE.rev = r.rev || 0; BE.empty = !!r.empty; BE.needsSetup = !!r.needsSetup;
            if (r.empty) { try { localStorage.removeItem(KEY); } catch (e) { } } else { rawSet.call(localStorage, KEY, JSON.stringify(r.db)); Object.keys(r.kv || {}).forEach(k => rawSet.call(localStorage, k, JSON.stringify(r.kv[k]))); }
            try { if (r.role !== 'admin') ['admin', 'finance', 'time'].forEach(s => localStorage.removeItem('nx_sess_' + s)); if (r.role !== 'customer') localStorage.removeItem('nx_sess_customer'); } catch (e) { }
        } catch (e) { BE.on = false; }
    })();
    if (BE.on) {
        let timer = null; const dirty = new Set();
        const put = (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : null).catch(() => null);
        const flush = () => {
            timer = null; const keys = [...dirty]; dirty.clear();
            keys.forEach(k => { let v; try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { return; } if (v == null) return;
                if (k === KEY) put('/api/db', { db: v, base: BE.rev }).then(r => { if (r && r.rev) { BE.rev = r.rev; BE.empty = false; } });
                else put('/api/kv/' + k, { value: v }); });
        };
        Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage && SYNC_KEY(k)) { dirty.add(k); if (timer) clearTimeout(timer); timer = setTimeout(flush, 250); } };
        const post = (url, body, sync) => { if (sync) { const x = new XMLHttpRequest(); x.open('POST', url, false); x.setRequestHeader('Content-Type', 'application/json'); try { x.send(JSON.stringify(body || {})); } catch (e) { } return x; } return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body || {}) }); };
        /* Serverseitige Anmeldung: bei Erfolg wird die Datenansicht dieser Rolle in NX.db geladen (gleiches Objekt, bleibt für Seitenlogik gültig). */
        BE.login = async (role, user, hash) => {
            try {
                const r = await post('/api/login', { role, user, hash }); if (!r.ok) return false; const j = await r.json();
                BE.role = j.role; BE.rev = j.rev || BE.rev; BE.empty = false;
                if (NX.db) { Object.keys(NX.db).forEach(k => delete NX.db[k]); Object.assign(NX.db, j.db); }
                rawSet.call(localStorage, KEY, JSON.stringify(j.db)); Object.keys(j.kv || {}).forEach(k => rawSet.call(localStorage, k, JSON.stringify(j.kv[k])));
                return true;
            } catch (e) { return false; }
        };
        BE.setup = async (code, user, hash) => {
            try {
                const r = await post('/api/setup', { code, user, hash, db: NX.db }); const j = await r.json().catch(() => ({}));
                if (!r.ok) return { ok: false, error: j.error || 'Einrichtung nicht möglich.' };
                BE.role = j.role; BE.rev = j.rev || BE.rev; BE.empty = false; BE.needsSetup = false;
                if (NX.db) { Object.keys(NX.db).forEach(k => delete NX.db[k]); Object.assign(NX.db, j.db); }
                rawSet.call(localStorage, KEY, JSON.stringify(j.db));
                return { ok: true };
            } catch (e) { return { ok: false, error: 'Server nicht erreichbar.' }; }
        };
        BE.logout = () => { post('/api/logout', {}, true); try { localStorage.removeItem(KEY); } catch (e) { } BE.role = 'none'; setTimeout(() => location.reload(), 0); };
        /* Kundenportal: Anmeldung vor dem Formular-Handler (Portal-Skript bleibt unverändert) serverseitig prüfen */
        document.addEventListener('submit', async ev => {
            const f = ev.target; if (!f || !f.elements || !f.elements.email || !f.elements.pw || !f.querySelector('#lerr') || !f.closest('#av')) return;
            const email = f.elements.email.value.trim(), pw = f.elements.pw.value; if (!email || !pw || !NX.db) return;
            const c = (NX.db.customers || []).find(u => String(u.email).toLowerCase() === email.toLowerCase());
            if (c && c.resetPending && c.status === 'aktiv') return;
            ev.preventDefault(); ev.stopImmediatePropagation();
            const ok = await BE.login('customer', email, await NX.hash(pw));
            if (!ok) { const er = f.querySelector('#lerr'); if (er) er.textContent = 'E-Mail-Adresse oder Passwort ist falsch.'; return; }
            if (typeof f.onsubmit === 'function') f.onsubmit(new Event('submit', { cancelable: true }));
        }, true);
        /* Zurück im Tab: neue Daten vom Server übernehmen (nur wenn gerade nichts bearbeitet wird) */
        const check = () => { if (document.hidden || timer || document.querySelector('.ov') || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) return;
            fetch('/api/rev', { credentials: 'same-origin' }).then(r => r.json()).then(r => { if (r && r.rev && r.rev !== BE.rev && !timer && r.role === BE.role) location.reload(); }).catch(() => { }); };
        document.addEventListener('visibilitychange', check); window.addEventListener('focus', check);
    }
    const p2 = n => String(n).padStart(2, '0');
    const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    NX.serviceNames = ['Individuelles Webdesign', 'Responsive Unternehmenswebsites', 'Webentwicklung und Webanwendungen', 'Kundenportale', 'Admin-Dashboards und Verwaltungssysteme', 'Individuelle Softwarelösungen', 'Mobile Apps für iOS und Android', 'Automatisierungen und digitale Geschäftsprozesse', 'Individuelle Vertriebs- und Unternehmenssysteme', 'Hosting und technische Betreuung', 'Wartung, Updates und Support'];
    NX.priceText = v => { v = String(v == null ? '' : v).trim(); if (!v) return ''; return /^\d+([.,]\d+)?$/.test(v) ? 'ab ' + v + ' €' : v; };
    NX.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    NX.$ = (s, r) => (r || document).querySelector(s);
    NX.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
    /* Einheitliche Passwort-Augen-Schaltfläche auf allen Seiten und auch in dynamischen Dialogen. */
    (() => {
        const eye = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        const eyeOff = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8"/></svg>';
        function enhance(scope) {
            (scope.matches?.('input[type="password"]') ? [scope] : [...(scope.querySelectorAll?.('input[type="password"]') || [])]).forEach(input => {
                if (input.dataset.eyeReady === '1') return;
                let wrap = input.closest('.pwrow, .nx-password-wrap');
                if (!wrap) {
                    wrap = document.createElement('div');
                    wrap.className = 'nx-password-wrap';
                    input.parentNode.insertBefore(wrap, input);
                    wrap.appendChild(input);
                } else {
                    wrap.classList.remove('pwrow');
                    wrap.classList.add('nx-password-wrap');
                    wrap.querySelectorAll('button#sp, button').forEach(btn => { if (!btn.matches('[data-password-eye]')) btn.remove(); });
                }
                input.dataset.eyeReady = '1';
                const btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'nx-password-eye'; btn.dataset.passwordEye = '1';
                btn.setAttribute('aria-label', 'Passwort anzeigen'); btn.setAttribute('aria-pressed', 'false'); btn.innerHTML = eye;
                btn.addEventListener('click', () => {
                    const show = input.type === 'password';
                    input.type = show ? 'text' : 'password';
                    btn.innerHTML = show ? eyeOff : eye;
                    btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
                    btn.setAttribute('aria-pressed', String(show));
                });
                wrap.appendChild(btn);
            });
        }
        const start = () => {
            enhance(document);
            if (typeof MutationObserver !== 'undefined' && document.documentElement) new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) enhance(n); }))).observe(document.documentElement, { childList: true, subtree: true });
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
    })();
    NX.today = () => iso(new Date());
    /* ---------- Tageswechsel: das Datum läuft automatisch weiter (Gerätezeit, ohne Server) ----------
       Bleibt eine Seite über Mitternacht offen, meldet NX.dayWatch den neuen Tag per Ereignis 'nx:daychange'. */
    NX.dayWatch = (() => {
        let last = NX.today();
        const check = () => { const t = NX.today(); if (t === last) return; const prev = last; last = t; document.dispatchEvent(new CustomEvent('nx:daychange', { detail: { from: prev, to: t } })); };
        const midnight = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1); setTimeout(() => { check(); midnight(); }, Math.max(1000, m - n)); };
        try {
            if (typeof setInterval === 'function' && typeof setTimeout === 'function') { setInterval(check, 20000); midnight(); }
            if (document.addEventListener) document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
            if (window.addEventListener) { window.addEventListener('focus', check); window.addEventListener('pageshow', check); }
        } catch (e) { /* ohne Browser-Umgebung nicht nötig */ }
        return check;
    })();
    /* ---------- Nach-oben-Button (alle Seiten, alle Geräte): erscheint erst nach dem Hinunterscrollen ---------- */
    (() => {
        if (typeof document === 'undefined' || !document.createElement || typeof window === 'undefined' || !window.addEventListener) return;
        const init = () => {
            if (document.querySelector('.nx-ax-top')) return;
            const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const up = document.createElement('button');
            up.type = 'button'; up.className = 'nx-ax-top'; up.setAttribute('aria-label', 'Nach oben'); up.title = 'Nach oben'; up.tabIndex = -1;
            up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
            up.onclick = () => { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };
            document.body.appendChild(up);
            const upd = () => {
                const y = window.pageYOffset || document.documentElement.scrollTop || 0, on = y > 300;
                up.classList.toggle('on', on); up.tabIndex = on ? 0 : -1;
                const bar = document.querySelector('.nx-sticky.on');   /* mobile CTA-Leiste der Startseite nicht verdecken */
                up.style.bottom = bar ? (bar.offsetHeight + 24) + 'px' : '';
            };
            window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
        };
        if (document.body) init(); else document.addEventListener('DOMContentLoaded', init, { once: true });
    })();
    NX.addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return iso(x); };
    NX.eur = c => ((c || 0) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    NX.date = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('de-DE') : '–';
    NX.dt = t => new Date(t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    NX.cents = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 100); };
    NX.uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    NX.nextId = (p, list0) => { const list = (p === 'P' && NX.db && NX.db.projectArchive) ? list0.concat(NX.db.projectArchive) : list0; return p + '-' + (list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split('-').pop()) || 0), 1000) + 1); };
    NX.nextNumber = (p, list) => { const y = new Date().getFullYear(); let n = list.reduce((m, x) => Math.max(m, parseInt(String(x.number || '').split('-').pop()) || 0), 0) + 1, s; const ex = new Set(list.map(x => x.number)); do {
        s = p + '-' + y + '-' + String(n++).padStart(4, '0');
    } while (ex.has(s)); return s; };
    // Auftragsnummern bleiben über alle Rechnungen desselben Projekts identisch.
    NX.nextOrderNumber = () => {
        const y = new Date().getFullYear();
        const all = [...(NX.db.projects || []), ...(NX.db.projectArchive || []), ...(NX.db.invoices || [])];
        const nums = all.map(x => x.orderNumber).filter(Boolean);
        let n = nums.reduce((m, value) => Math.max(m, parseInt(String(value).split('-').pop()) || 0), 0) + 1;
        let value;
        const used = new Set(nums);
        do { value = `AUF-${y}-${String(n++).padStart(4, '0')}`; } while (used.has(value));
        return value;
    };
    NX.orderNumberFor = (projectId, fallback) => {
        if (projectId) {
            const project = (NX.db.projects || []).find(p => p.id === projectId) || (NX.db.projectArchive || []).find(p => p.id === projectId);
            if (project) {
                if (!project.orderNumber) {
                    const oldInvoice = (NX.db.invoices || []).find(i => i.projectId === projectId && i.orderNumber);
                    project.orderNumber = oldInvoice ? oldInvoice.orderNumber : NX.nextOrderNumber();
                }
                return project.orderNumber;
            }
        }
        return fallback || NX.nextOrderNumber();
    };
    NX.hash = async (s) => { const t = 'nx:' + s; try {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    catch (e) {
        let h = 5381;
        for (const c of t)
            h = ((h << 5) + h + c.charCodeAt(0)) | 0;
        return 'f' + h;
    } };
    NX.guard = fn => { let b = false; return async (...a) => { if (b) {
        /* Doppelklick-Schutz: Das native Absenden muss trotzdem verhindert werden, sonst lädt die Seite neu und die Eingaben landen in der URL. */
        if (a[0] && typeof a[0].preventDefault === 'function')
            a[0].preventDefault();
        return;
    } b = true; try {
        return await fn(...a);
    }
    finally {
        setTimeout(() => { b = false; }, 600);
    } }; };
    NX.fd = f => Object.fromEntries(new FormData(f));
    /* ---------- Berechnungen (alle Beträge in Cent) ---------- */
    NX.calc = (items, vat, disc) => { const net = (items || []).reduce((s, i) => s + Math.round((+i.qty || 0) * (+i.price || 0)), 0); const d = Math.round(net * (+disc || 0) / 100); const tax = net - d; const v = Math.round(tax * (+vat || 0) / 100); return { net, disc: d, tax, vat: v, gross: tax + v }; };
    NX.total = x => NX.calc(x.items, x.vat, x.disc).gross;
    NX.paid = i => (i.payments || []).reduce((s, p) => s + p.amount, 0);
    NX.open = i => Math.max(0, NX.total(i) - NX.paid(i));
    NX.invStatus = i => { if (i.draft)
        return 'Entwurf'; const o = NX.open(i); if (o <= 0)
        return 'Bezahlt'; if (i.due < NX.today())
        return 'Überfällig'; return NX.paid(i) > 0 ? 'Teilbezahlt' : 'Offen'; };
    NX.offStatus = o => (o.status === 'Versendet' && o.valid && o.valid < NX.today()) ? 'Abgelaufen' : o.status;
    NX.mins = (s, e, b) => { const m = t => { const a = String(t || '').split(':'); return a.length < 2 ? NaN : (+a[0]) * 60 + (+a[1]); }; const r = m(e) - m(s) - (+b || 0); return isNaN(r) || r <= 0 ? null : r; };
    NX.hm = m => Math.floor(m / 60) + ':' + p2(m % 60) + ' h';
    NX.cust = id => NX.db.customers.find(c => c.id === id);
    NX.custName = id => { const c = NX.cust(id); return c ? c.first + ' ' + c.last : '–'; };
    NX.proj = id => NX.db.projects.find(p => p.id === id) || (NX.db.projectArchive || []).find(p => p.id === id);
    NX.log = t => { NX.db.activity.unshift({ t: Date.now(), text: t }); NX.db.activity.length = Math.min(NX.db.activity.length, 60); NX.save(); };
    NX.save = () => { try { NX.orders.sync(); } catch (e) { } ls.set(KEY, JSON.stringify(NX.db)); };
    /* ---------- Aufträge: Abschlussdatum + automatisches Archiv nach 30 Tagen ----------
       Abgeschlossene Projekte erhalten ein Abschlussdatum (doneAt). 30 Tage danach werden sie
       automatisch von NX.db.projects nach NX.db.projectArchive verschoben (nichts wird gelöscht).
       Dadurch tauchen sie in Listen, Suche, Auswahlfeldern und Kennzahlen nicht mehr auf. */
    NX.orders = {
        DAYS: 30,
        archived: () => NX.db.projectArchive || (NX.db.projectArchive = []),
        sync: () => {
            const D = NX.db; if (!D || !D.projects) return false;
            const T = NX.today(), cut = NX.addDays(T, -NX.orders.DAYS); let ch = false;
            D.projects.forEach(p => { if (p.status === 'Abgeschlossen') { if (!p.doneAt) { p.doneAt = T; ch = true; } } else if (p.doneAt) { delete p.doneAt; ch = true; } });
            const due = D.projects.filter(p => p.status === 'Abgeschlossen' && p.doneAt && p.doneAt <= cut);
            if (due.length) {
                const A = NX.orders.archived();
                due.forEach(p => { D.projects.splice(D.projects.indexOf(p), 1); p.archivedAt = T; A.push(p); if (D.activity) D.activity.unshift({ t: Date.now(), text: 'Auftrag archiviert: ' + p.name }); });
                if (D.activity) D.activity.length = Math.min(D.activity.length, 60);
                ch = true;
            }
            return ch;
        },
        restore: id => {
            const A = NX.orders.archived(), i = A.findIndex(p => p.id === id); if (i < 0) return null;
            const p = A.splice(i, 1)[0]; delete p.archivedAt; delete p.doneAt; p.status = 'Laufend'; NX.db.projects.push(p); return p;
        }
    };
    NX.badge = s => { const k = { Bezahlt: 'v', Angenommen: 'v', Abgeschlossen: 'v', aktiv: 'v', Erledigt: 'v', Versendet: 'v', Laufend: 'v', 'Überfällig': 'k', Abgelehnt: 'k', gesperrt: 'k', '1. Mahnung': 'k', '2. Mahnung': 'k', Abgelaufen: 'k', Entwurf: 'm', Archiviert: 'm', inaktiv: 'm', Geplant: 'm', Pausiert: 'm' }[s] || ''; return `<span class="b ${k}">${NX.esc(s)}</span>`; };
    /* ---------- Sitzungen (getrennt je Bereich) ---------- */
    NX.sess = { get(r) { try {
            const s = JSON.parse(ls.get('nx_sess_' + r));
            if (s && s.exp > Date.now())
                return s;
        }
        catch (e) { } return null; }, set(r, u) { ls.set('nx_sess_' + r, JSON.stringify({ user: u, exp: Date.now() + 8 * 36e5 })); if (r === 'customer') NX.stats.bump('logins'); }, clear(r) { ls.del('nx_sess_' + r); if (BE.on && BE.role === r && (r === 'admin' || r === 'customer')) BE.logout(); } };
    /* ---------- Lokale Zähler (nur in diesem Browser, kein Server-Tracking) ----------
       nexora_stat_visits = Aufrufe der Startseite, nexora_stat_logins = Kunden-Anmeldungen; jeweils { "JJJJ-MM-TT": Anzahl }. */
    NX.stats = {
        read: k => { try { return JSON.parse(ls.get('nexora_stat_' + k)) || {}; } catch (e) { return {}; } },
        bump: function (k) { try { const m = this.read(k), t = NX.today(), cut = NX.addDays(t, -800); m[t] = (m[t] || 0) + 1; Object.keys(m).forEach(d => { if (d < cut) delete m[d]; }); ls.set('nexora_stat_' + k, JSON.stringify(m)); } catch (e) { } }
    };
    /* ---------- Demo-Daten ---------- */
    /* Leere Startdaten: keine Kunden, keine Zugangsdaten. Der Administrator wird bei der Ersteinrichtung angelegt. */
    async function seed() {
        if (typeof window.NX_SEED_FN === 'function') return window.NX_SEED_FN(NX);
        return {
            v: 1, auth: null,
            settings: {
                company: 'NEXORA by AL', owner: '', street: '', zip: '', city: '', country: '', email: '', phone: '', vatId: '', iban: '', bic: '', formsubmit: '', vatRate: 19, dueDays: 14, offerDays: 30, hourlyRate: 0, servicePrices: {},
                auto: { subscriptions: true, reminders: false }, fees: { r: 0, m1: 0, m2: 0 }, reminderDays: { r: 7, m1: 7, m2: 7 },
                packages: [{ name: 'Starter-Website', price: '', desc: 'Moderne, responsive Präsenz für kleine Unternehmen.' }, { name: 'Business-Website', price: '', desc: 'Mehrseitiger Auftritt mit individuellem Design und Pflegebereich.' }, { name: 'Webanwendung / Portal', price: '', desc: 'Kundenportale, Dashboards und Verwaltungssysteme.' }, { name: 'Individuelle Software', price: '', desc: 'Maßgeschneiderte Lösungen und Automatisierungen.' }],
                hosting: [{ name: 'Hosting Basis', price: '', desc: 'Hosting inklusive technischer Grundbetreuung.' }, { name: 'Hosting Plus', price: '', desc: 'Zusätzlich Updates und Monitoring.' }, { name: 'Wartung & Support', price: '', desc: 'Laufende Betreuung nach Vereinbarung.' }],
                showcase: []
            },
            customers: [], inquiries: [], projects: [], offers: [], invoices: [], reminders: [], time: [], support: [], reviews: [], subscriptions: [], chat: {}, activity: [], mails: []
        };
    }
    /* ---------- Konten: Archiv mit 30 Tagen Frist ----------
       Gelöschte Konten (Kunde oder Administrator) werden deaktiviert und 30 Tage im Archiv aufbewahrt
       (Status "loeschung_vorgemerkt"). Erst nach Ablauf der Frist werden sie endgültig entfernt. Geschäftsdaten bleiben erhalten. */
    NX.accounts = {
        days: 30,
        archive: (c, by) => { const now = Date.now(); if (c.status !== 'loeschung_vorgemerkt') c.statusBefore = c.status; c.status = 'loeschung_vorgemerkt'; c.archivedBy = by; c.archivedAt = now; c.deletionRequestedAt = now; c.deletedAt = now; c.restoreUntil = now + 30 * 24 * 60 * 60 * 1000; },
        restore: c => { c.status = (c.archivedBy === 'Administrator' && c.statusBefore && c.statusBefore !== 'loeschung_vorgemerkt') ? c.statusBefore : 'aktiv'; ['archivedBy', 'archivedAt', 'statusBefore', 'deletedAt', 'restoreUntil', 'deletionRequestedAt'].forEach(k => delete c[k]); },
        daysLeft: c => Math.max(0, Math.ceil(((c.restoreUntil || 0) - Date.now()) / 864e5)),
        archived: () => (NX.db.customers || []).filter(c => c.status === 'loeschung_vorgemerkt'),
        purgeExpired: () => { const now = Date.now(), before = NX.db.customers.length; NX.db.customers = NX.db.customers.filter(c => c.status !== 'loeschung_vorgemerkt' || !c.restoreUntil || now <= c.restoreUntil); if (NX.db.customers.length !== before) NX.save(); return before - NX.db.customers.length; }
    };
    NX.reset = async () => { ls.del(KEY); NX.db = await seed(); NX.save(); };
    NX.ready = (async () => { const r = ls.get(KEY); if (r) {
        try {
            NX.db = JSON.parse(r);
        }
        catch (e) { }
    } if (!NX.db || !NX.db.settings) {
        NX.db = await seed();
        NX.save();
    } NX.accounts.purgeExpired(); try { if (NX.orders.sync()) NX.save(); } catch (e) { } })();
    /* ---------- UI ---------- */
    NX.toast = (m) => { let t = NX.$('.toasts'); if (!t) {
        t = document.createElement('div');
        t.className = 'toasts';
        t.setAttribute('role', 'status');
        document.body.appendChild(t);
    } const e = document.createElement('div'); e.className = 'toast'; e.textContent = m; t.appendChild(e); setTimeout(() => e.remove(), 4500); };
    NX.modal = (title, html, o) => { o = o || {}; const ov = document.createElement('div'); ov.className = 'ov'; ov.innerHTML = `<div class="md${o.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${NX.esc(title)}"><button type="button" class="x" aria-label="Schließen">✕</button><h3>${NX.esc(title)}</h3><div class="mb">${html}</div></div>`; const kd = e => { if (e.key === 'Escape')
        ov.close(); }; ov.close = () => { if (!ov.isConnected)
        return; ov.remove(); document.removeEventListener('keydown', kd); o.onClose && o.onClose(); }; document.addEventListener('keydown', kd); ov.querySelector('.x').onclick = ov.close; document.body.appendChild(ov); ov.body = ov.querySelector('.mb'); return ov; };
    NX.confirm = (msg, ok) => new Promise(res => { let r = false; const m = NX.modal('Bitte bestätigen', `<p>${NX.esc(msg)}</p><div class="acts"><button type="button" class="btn ghost" data-n>Abbrechen</button><button type="button" class="btn" data-y>${NX.esc(ok || 'Bestätigen')}</button></div>`, { onClose: () => res(r) }); m.querySelector('[data-n]').onclick = m.close; m.querySelector('[data-y]').onclick = () => { r = true; m.close(); }; });
    NX.check = (f, rules) => {
        let ok = true;
        for (const n in rules) {
            const el = f.elements[n];
            if (!el)
                continue;
            const r = rules[n], v = el.type === 'checkbox' ? el.checked : el.value.trim();
            let m = '';
            if (r.includes('req') && !v)
                m = el.type === 'checkbox' ? 'Bitte bestätigen.' : 'Pflichtfeld.';
            else if (r.includes('email') && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
                m = 'Bitte eine gültige E-Mail-Adresse eingeben.';
            else if (r.includes('pw') && v && v.length < 8)
                m = 'Mindestens 8 Zeichen.';
            else if (r.includes('phone') && v && !/^[+\d][\d\s()\/-]{5,}$/.test(v))
                m = 'Bitte eine gültige Telefonnummer eingeben.';
            const box = el.closest('.field');
            let e = box.querySelector('.err');
            if (!e) {
                e = document.createElement('small');
                e.className = 'err';
                e.setAttribute('role', 'alert');
                box.appendChild(e);
            }
            e.textContent = m;
            if (m)
                ok = false;
        }
        return ok;
    };
    NX.btn = (a, id, l, g) => `<button type="button" class="btn sm${g === false ? '' : ' ghost'}" data-act="${a}" data-id="${NX.esc(id)}">${l}</button>`;
    NX.table = (head, rows, click) => `<div class="tw"><table><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr${click ? ' class="click" tabindex="0"' : ''} data-id="${NX.esc(r.id)}">${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    NX.kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
    /* Generische Listenansicht mit Suche/Filter */
    NX.listView = (el, o) => {
        const st = { q: '', f: '', a: '', b: '' };
        el.innerHTML = `<div class="top"><h1>${o.title}</h1>${o.add ? `<button type="button" class="btn" id="add">${o.add}</button>` : ''}</div>${o.intro ? `<p class="mut">${o.intro}</p>` : ''}<div class="kp" id="kp"></div><div class="bar"><input type="search" id="q" placeholder="${o.ph || 'Suchen…'}" aria-label="Suche">${o.status ? `<select id="f" hidden style="display:none" aria-hidden="true" tabindex="-1" aria-label="Status filtern"><option value="">Alle Status</option>${o.status.map(s => `<option>${s}</option>`).join('')}</select>` : ''}${o.dates ? '<input type="date" id="a" aria-label="Datum von"><input type="date" id="b" aria-label="Datum bis">' : ''}</div><div id="tb"></div>`;
        const tb = NX.$('#tb', el);
        const draw = () => {
            const all = o.items();
            const items = all.filter(x => (!st.q || o.text(x).toLowerCase().includes(st.q)) && (!st.f || o.stat(x) === st.f) && (!st.a || o.dateOf(x) >= st.a) && (!st.b || o.dateOf(x) <= st.b));
            NX.$('#kp', el).innerHTML = o.kpis ? o.kpis(all) : '';
            tb.innerHTML = items.length ? NX.table(o.head, items.map(x => ({ id: x.id, cells: o.row(x) })), !!o.onRow) : '<div class="tw"><p class="empty">Keine Einträge gefunden.</p></div>';
        };
        el.oninput = e => { const k = e.target.id; if (k in st) {
            st[k] = k === 'q' ? e.target.value.trim().toLowerCase() : e.target.value;
            draw();
        } };
        el.onchange = el.oninput;
        tb.onclick = e => { const b = e.target.closest('[data-act]'); if (b) {
            o.act && o.act(b.dataset.act, b.dataset.id, draw);
            return;
        } const tr = e.target.closest('tr[data-id]'); if (tr && o.onRow)
            o.onRow(tr.dataset.id, draw); };
        tb.onkeydown = e => { if (e.key === 'Enter' && e.target.matches('tr[data-id]'))
            e.target.click(); };
        const add = NX.$('#add', el);
        if (add)
            add.onclick = () => o.onAdd(draw);
        draw();
        return draw;
    };
    /* ---------- Layout (öffentlich) ---------- */
    NX.layout = () => {
        const b = document.body.dataset.base || '', cur = location.pathname.split('/').pop() || 'index.html';
        const L = [['index.html', 'Start'], ['leistungen.html', 'Leistungen'], ['projekte.html', 'Projekte'], ['ueber-uns.html', 'Über uns'], ['kontakt.html', 'Kontakt'], ['kundenportal.html', 'Kundenportal']];
        const arrow = '<svg class="nx-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
        const h = NX.$('#hdr');
        if (h) {
            h.innerHTML = `<div class="nx-bar"><a class="nx-mark" href="${b}index.html" aria-label="NEXORA by AL – Startseite"><img src="${b}assets/images/nexora-symbol.png" alt="NEXORA"></a><span class="nx-sep" aria-hidden="true"></span><button type="button" class="nx-burger" aria-label="Menü öffnen" aria-expanded="false" aria-controls="nx-menu"><span></span><span></span><span></span></button><nav class="nx-menu" id="nx-menu" aria-label="Hauptnavigation"><div class="nx-links">${L.map(l => `<a href="${b}${l[0]}"${cur === l[0] ? ' class="on" aria-current="page"' : ''}>${l[1]}</a>`).join('')}</div><a class="nx-cta" href="${b}anfrage.html">Projekt anfragen ${arrow}</a></nav></div>`;
            const bg = NX.$('.nx-burger', h), nv = NX.$('.nx-menu', h);
            const setOpen = o => { h.classList.toggle('nx-open', o); bg.setAttribute('aria-expanded', o); bg.setAttribute('aria-label', o ? 'Menü schließen' : 'Menü öffnen'); };
            bg.onclick = () => setOpen(!h.classList.contains('nx-open'));
            nv.addEventListener('click', e => { if (e.target.closest('a'))
                setOpen(false); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape')
                setOpen(false); });
            document.addEventListener('click', e => { if (h.classList.contains('nx-open') && !h.contains(e.target))
                setOpen(false); });
            const sc = () => h.classList.toggle('nx-scrolled', window.scrollY > 12);
            window.addEventListener('scroll', sc, { passive: true });
            sc();
        }
        const f = NX.$('#ftr');
        if (f) {
            const q = s => `${b}anfrage.html?service=${encodeURIComponent(s)}`;
            f.innerHTML = `<div class="nx-foot"><div class="nx-foot-grid"><div class="nx-foot-brand"><a href="${b}index.html" aria-label="NEXORA by AL – Startseite"><img src="${b}assets/images/nexora-logo-hero.png" alt="NEXORA by AL – Digital Solutions"></a><p>Webdesign, Webanwendungen, Kundenportale, mobile Apps und individuelle Software – modern, verständlich und zuverlässig umgesetzt.</p></div><nav aria-label="Seiten"><h4>Navigation</h4>${L.map(l => `<a href="${b}${l[0]}">${l[1]}</a>`).join('')}</nav><nav aria-label="Leistungen"><h4>Leistungen</h4><a href="${q('Individuelles Webdesign')}">Webdesign</a><a href="${q('Webentwicklung und Webanwendungen')}">Webanwendungen</a><a href="${q('Kundenportale')}">Kundenportale</a><a href="${q('Mobile Apps für iOS und Android')}">Mobile Apps</a><a href="${q('Hosting und technische Betreuung')}">Hosting &amp; Betreuung</a></nav><nav aria-label="Kontakt"><h4>Kontakt</h4><a href="${b}kontakt.html">Kontaktformular</a><a href="${b}anfrage.html">Projekt anfragen</a><a href="${b}kundenportal.html">Kundenportal</a></nav></div><div class="nx-foot-bottom"><div class="nx-legal"><a href="${b}impressum.html">Impressum</a><a href="${b}datenschutz.html">Datenschutz</a><a href="${b}agb.html">AGB</a></div><div>© ${new Date().getFullYear()} NEXORA by AL · Lokale Vorschau (Demo-Daten im Browser)</div></div></div>`;
        }
    };
    /* ---------- Dokumente (Rechnungsdesign Weiß / Dunkelgrau / Gold) ---------- */
    NX.docHTML = (type, d) => {
        const s = NX.db.settings, c = NX.cust(d.customerId) || {}, ph = (v, l) => v ? NX.esc(v) : `<span class="ph">[${l} ergänzen]</span>`;
        const inv = type === 'reminder' ? NX.db.invoices.find(i => i.id === d.invoiceId) : d;
        const cc = NX.calc(inv.items, inv.vat, inv.disc);
        const title = type === 'offer' ? (d.type || 'Angebot') : type === 'invoice' ? (d.kind === 'Vorauszahlungsrechnung' ? 'Vorauszahlung' : (d.kind || 'Rechnung')) : d.type;
        const orderNo = type === 'invoice' ? (d.orderNumber || NX.orderNumberFor(d.projectId)) : (type === 'offer' && d.projectId ? NX.orderNumberFor(d.projectId) : '');
        const mr = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
        const meta = type === 'reminder'
            ? mr('Nr.', NX.esc(d.number)) + mr('Datum', NX.date(d.date)) + mr('Zahlbar bis', NX.date(d.due))
            : mr('Nr.', NX.esc(d.number)) + (orderNo ? mr('Auftragsnummer', NX.esc(orderNo)) : '') + mr('Datum', NX.date(d.date))
              + (type === 'invoice' ? mr(d.billingPeriod ? 'Abrechnungszeitraum' : 'Leistungsdatum', d.billingPeriod ? NX.esc(d.billingPeriod) : 'wie Rechnungsdatum') : '')
              + (type === 'offer' ? mr('Gültig bis', NX.date(d.valid)) : mr('Fällig am', NX.date(d.due)));
        let body = '';
        if (type === 'reminder') {
            const o = NX.open(inv), tot = o + (d.fee || 0);
            const txt = { 'Zahlungserinnerung': 'wir erlauben uns, Sie freundlich an die noch offene Rechnung zu erinnern.', '1. Mahnung': 'trotz unserer Zahlungserinnerung konnten wir bisher keinen vollständigen Zahlungseingang feststellen. Wir bitten um Begleichung.', '2. Mahnung': 'leider ist die oben genannte Rechnung weiterhin nicht beglichen. Wir bitten dringend um umgehende Zahlung.' }[d.type];
            body = `<p>Sehr geehrte/r ${NX.esc(c.first || '')} ${NX.esc(c.last || '')},</p><p>${txt}</p><div class="tw" style="border:0"><table><thead><tr><th>Rechnung</th><th class="c-hide-m">Datum</th><th>Fällig</th><th class="c-num">Brutto</th><th class="c-num">Bezahlt</th><th class="c-num">Offen</th></tr></thead><tbody><tr><td>${NX.esc(inv.number)}</td><td class="c-hide-m">${NX.date(inv.date)}</td><td>${NX.date(inv.due)}</td><td class="c-num">${NX.eur(cc.gross)}</td><td class="c-num">${NX.eur(NX.paid(inv))}</td><td class="c-num">${NX.eur(o)}</td></tr></tbody></table></div><div class="tot"><div><span>Offener Betrag</span><span>${NX.eur(o)}</span></div><div><span>Gebühr</span><span>${NX.eur(d.fee || 0)}</span></div><div class="g"><span>Zu zahlen</span><span>${NX.eur(tot)}</span></div></div><p>Bitte zahlen Sie bis zum ${NX.date(d.due)}.</p>`;
        }
        else {
            const invoiceTotals = type === 'invoice'
                ? `<div class="invoice-balance"><div class="invoice-balance-head"><span>Rechnungsbetrag</span><strong>${NX.eur(cc.gross)}</strong></div><div class="invoice-balance-row"><span>Bereits bezahlt / angerechnet</span><span>− ${NX.eur(NX.paid(d))}</span></div><div class="invoice-balance-open"><div><span>Noch offener Rechnungsbetrag</span><small>${NX.open(d) <= 0 ? 'Diese Rechnung ist vollständig bezahlt.' : 'Bitte begleichen Sie den noch offenen Betrag bis zum Fälligkeitsdatum.'}</small></div><strong>${NX.eur(NX.open(d))}</strong></div></div>`
                : `<div class="g"><span>Gesamtbetrag</span><span>${NX.eur(cc.gross)}</span></div>`;
            body = `<div class="tw" style="border:0"><table><thead><tr><th class="c-pos">Pos.</th><th>Leistung</th><th class="c-num">Menge</th><th class="c-num">Einzelpreis</th><th class="c-num">Gesamt</th></tr></thead><tbody>${d.items.map((i, k) => `<tr><td class="c-pos">${k + 1}</td><td>${NX.esc(i.desc)}</td><td class="c-num">${i.qty}</td><td class="c-num">${NX.eur(i.price)}</td><td class="c-num">${NX.eur(Math.round(i.qty * i.price))}</td></tr>`).join('')}</tbody></table></div><div class="tot">${cc.disc ? `<div><span>Zwischensumme</span><span>${NX.eur(cc.net)}</span></div><div><span>Rabatt ${d.disc}%</span><span>−${NX.eur(cc.disc)}</span></div>` : ''}<div><span>Nettobetrag</span><span>${NX.eur(cc.tax)}</span></div><div><span>USt ${d.vat}%</span><span>${NX.eur(cc.vat)}</span></div>${invoiceTotals}</div>`;
        }
        const pb = (k, v) => `<div class="doc-pay-item"><span>${k}</span><b>${v}</b></div>`;
        const refNo = type === 'reminder' ? inv.number : d.number;
        const pay = type !== 'offer'
            ? `<div class="doc-pay">${pb('Bankverbindung', 'IBAN ' + ph(s.iban, 'IBAN') + '<br>BIC ' + ph(s.bic, 'BIC'))}${pb('Verwendungszweck', NX.esc(refNo))}${pb('Zahlbar bis', NX.date(d.due))}</div>`
            : `<div class="doc-pay">${pb('Gültigkeit', 'Dieses Angebot ist gültig bis ' + NX.date(d.valid) + '.')}${pb('Hinweis', 'Die Einzelpreise sind Nettopreise, die Umsatzsteuer wird gesondert ausgewiesen.')}</div>`;
        return `<article class="doc doc-${type}">
          <header class="doc-topline"><div class="doc-brand"><img class="doc-logo" src="${(document.body.dataset.base || '')}assets/images/nexora-logo-web.png" alt="NEXORA by AL – Digital Solutions"><div class="doc-company-details">${ph(s.owner, 'Inhaber')}<br>${ph(s.street, 'Straße')}, ${ph(s.zip, 'PLZ')} ${ph(s.city, 'Ort')}<br>${ph(s.email, 'E-Mail')} · ${ph(s.phone, 'Telefon')}<br>USt-IdNr.: ${ph(s.vatId, 'USt-IdNr.')}</div></div>
          <div class="doc-heading"><div class="doc-kicker">NEXORA BY AL · DIGITAL SOLUTIONS</div><h2>${NX.esc(title)}</h2><div class="doc-meta">${meta}</div></div></header>
          <section class="doc-recipient"><div class="doc-section-label">${type === 'reminder' ? 'RECHNUNGSEMPFÄNGER' : type === 'offer' ? 'ANGEBOT FÜR' : 'RECHNUNG AN'}</div><address>${c.company ? NX.esc(c.company) + '<br>' : ''}${NX.esc(c.first || '')} ${NX.esc(c.last || '')}<br>${NX.esc(c.street || '')} ${NX.esc(c.no || '')}<br>${NX.esc(c.zip || '')} ${NX.esc(c.city || '')}<br>${NX.esc(c.country || '')}${c.vatId ? '<br>UID: ' + NX.esc(c.vatId) : ''}</address></section>
          <section class="doc-content">${body}</section><footer class="doc-footer">${pay}<div class="doc-footer-note"><span>Vielen Dank für Ihr Vertrauen und die gute Zusammenarbeit.</span><span>${NX.esc(s.company || 'NEXORA by AL')}${s.vatId ? ' · USt-IdNr. ' + NX.esc(s.vatId) : ''}</span></div></footer>
        </article>`;
    };
    NX.viewDoc = (type, d) => NX.modal((type === 'offer' ? (d.type || 'Angebot') : type === 'invoice' ? (d.kind === 'Vorauszahlungsrechnung' ? 'Vorauszahlung' : d.kind) : d.type) + ' ' + d.number, NX.docHTML(type, d), { wide: true });
    /* ---------- E-Mail (FormSubmit) ---------- */
    NX.formsubmit = async (p) => {
        const e = (p && p._to) || NX.db.settings.formsubmit;
        const payload = Object.assign({}, p || {}); delete payload._to;
        if (!e)
            return { ok: false, msg: 'FormSubmit ist nicht konfiguriert (Admin → Einstellungen). Die Nachricht wurde nicht versendet.' };
        try {
            const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(e), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ _captcha: 'false', _template: 'table' }, payload)) });
            const j = await r.json().catch(() => ({}));
            if (r.ok && (j.success === true || j.success === 'true'))
                return { ok: true, msg: 'FormSubmit hat die Nachricht angenommen. Eine Zustellung ist damit nicht bestätigt (ggf. muss die Adresse bei FormSubmit erst aktiviert werden).' };
            return { ok: false, msg: 'Versand fehlgeschlagen: ' + (j.message || ('Status ' + r.status)) + '. Ihre Eingaben bleiben erhalten.' };
        }
        catch (err) {
            return { ok: false, msg: 'Versand nicht möglich (keine Verbindung oder Dienst nicht erreichbar). Ihre Eingaben bleiben erhalten.' };
        }
    };
    NX.mailLog = (to, subject, kind, status) => { NX.db.mails.unshift({ t: Date.now(), to, subject, kind, status }); NX.db.mails.length = Math.min(NX.db.mails.length, 100); NX.save(); };
    NX.mailPreview = o => {
        const cfg = !!NX.db.settings.formsubmit;
        const m = NX.modal('E-Mail-Vorschau', `<form novalidate><div class="field"><label for="mt">Empfänger</label><input id="mt" name="to" type="email" value="${NX.esc(o.to || '')}"></div><div class="field"><label for="ms">Betreff</label><input id="ms" name="subject" value="${NX.esc(o.subject)}"></div><div class="field"><label for="mm">Nachricht</label><textarea id="mm" name="message" rows="9">${NX.esc(o.message)}</textarea></div>
 <p class="note">${cfg ? 'FormSubmit ist konfiguriert. Der Versand erfolgt über FormSubmit direkt an die oben eingetragene Empfängeradresse. FormSubmit muss diese Empfängeradresse ggf. zuerst freischalten.' : 'FormSubmit ist <b>nicht konfiguriert</b> (Admin → Einstellungen). Es wird nichts versendet; Sie können die Nachricht lokal vormerken oder im eigenen E-Mail-Programm öffnen.'} Passwörter werden nie in E-Mails aufgenommen.</p><p id="ms-st" class="err" role="status"></p>
 <div class="acts"><button type="button" class="btn" data-s${cfg ? '' : ' disabled'}>Über FormSubmit senden</button><button type="button" class="btn ghost" data-l>Lokal vormerken</button></div></form>`, { wide: true });
        const f = NX.$('form', m.body), st = NX.$('#ms-st', m.body), v = () => NX.fd(f);
        NX.$('[data-l]', m.body).onclick = () => { const x = v(); NX.mailLog(x.to, x.subject, o.kind || 'E-Mail', 'lokal vorgemerkt'); st.textContent = 'Lokal vorgemerkt (nicht versendet).'; NX.toast('E-Mail lokal vorgemerkt.'); };
        NX.$('[data-s]', m.body).onclick = NX.guard(async () => { const x = v(); st.textContent = 'Wird gesendet…'; const r = await NX.formsubmit({ _to: x.to, _subject: x.subject, Empfänger: x.to, Nachricht: x.message }); st.textContent = r.msg; NX.mailLog(x.to, x.subject, o.kind || 'E-Mail', r.ok ? 'an FormSubmit übergeben' : 'Fehler'); if (r.ok)
            NX.toast('An FormSubmit übergeben.'); });
        return m;
    };
    /* ---------- App-Rahmen mit eigener Anmeldung (Admin / Finance / Time) ---------- */
    NX.shell = o => {
        const root = NX.$('#root'), hdr = NX.$('#hdr'), b = document.body.dataset.base || '../';
        let adminBridge = false;
        const head = out => { hdr.innerHTML = `<div class="wrap hb"><a class="logo logo-image logo-symbol admin-symbol" href="${b}admin/index.html#dashboard" aria-label="NEXORA by AL – zum Dashboard" title="Zum Dashboard"><img src="${b}assets/images/nexora-symbol.png" alt="NEXORA"></a><span class="htitle">${o.title}</span>${out ? `<button type="button" class="btn ghost sm" id="lo">${adminBridge ? 'Zur Administration' : 'Abmelden'}</button>` : '<span></span>'}</div>`; const l = NX.$('#lo'); if (l)
            l.onclick = () => { if (adminBridge) { location.href = '../admin/index.html'; return; } NX.sess.clear(o.role); location.hash = ''; login(); }; };
        const foot = () => { NX.$('#ftr').innerHTML = `<div class="wrap"><div><a href="${b}index.html">Website</a><a href="${b}impressum.html">Impressum</a><a href="${b}datenschutz.html">Datenschutz</a></div><div></div></div>`; };
        function setup() {
            head(false);
            root.innerHTML = `<div class="center"><form class="card login" id="sf" novalidate><h2>Ersteinrichtung</h2><p class="mut">Lege den Zugang für den Administrator an. Diese Zugangsdaten werden nirgends im Code gespeichert.</p>${BE.on ? '<div class="field"><label for="sc">Einrichtungs-Code</label><input id="sc" name="code" autocomplete="off"></div>' : ''}<div class="field"><label for="su">Benutzername</label><input id="su" name="u" autocomplete="username"></div><div class="field"><label for="sp1">Passwort (mind. 12 Zeichen, Buchstaben und Zahlen)</label><div class="nx-password-wrap"><input id="sp1" name="p1" type="password" autocomplete="new-password"></div></div><div class="field"><label for="sp2">Passwort wiederholen</label><div class="nx-password-wrap"><input id="sp2" name="p2" type="password" autocomplete="new-password"></div></div><p class="err" id="se" role="alert"></p><button class="btn" type="submit">Administrator anlegen</button></form></div>`;
            const f = NX.$('#sf'), err = t => { NX.$('#se').textContent = t; };
            f.onsubmit = NX.guard(async (e) => {
                e.preventDefault(); const u = f.u.value.trim(), p = f.p1.value;
                if (u.length < 3) return err('Bitte einen Benutzernamen mit mindestens 3 Zeichen wählen.');
                if (p.length < 12 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) return err('Das Passwort braucht mindestens 12 Zeichen mit Buchstaben und Zahlen.');
                if (p !== f.p2.value) return err('Die Passwörter stimmen nicht überein.');
                const h = await NX.hash(p);
                if (BE.on) { const r = await BE.setup(BE.on ? f.code.value.trim() : '', u, h); if (!r.ok) return err(r.error); }
                else { NX.db.auth = { user: u, hash: h }; NX.save(); }
                NX.sess.set(o.role, u); app();
            });
        }
        function login() {
            if (BE.on ? BE.needsSetup : !NX.db.auth) return setup();
            head(false);
            root.innerHTML = `<div class="center"><form class="card login" id="lf" novalidate><h2>${o.title}</h2><div class="field"><label for="lu">Benutzername</label><input id="lu" name="u" autocomplete="username"></div><div class="field"><label for="lp">Passwort</label><div class="nx-password-wrap"><input id="lp" name="p" type="password" autocomplete="current-password"></div></div><p class="err" id="le" role="alert"></p><button class="btn" type="submit">Anmelden</button></form></div>`;
            const f = NX.$('#lf');
            f.onsubmit = async (e) => { e.preventDefault(); const u = f.u.value.trim(), h = await NX.hash(f.p.value); if (BE.on && !(await BE.login('admin', u, h))) { NX.$('#le').textContent = 'Benutzername oder Passwort ist falsch.'; return; } if (NX.db.auth && u === NX.db.auth.user && h === NX.db.auth.hash) {
                NX.sess.set(o.role, u);
                app();
            }
            else
                NX.$('#le').textContent = 'Benutzername oder Passwort ist falsch.'; };
        }
        function app() {
            head(true);
            if (!NX.extrasLoaded && !NX.extrasRequested) { NX.extrasRequested = true; const sc = document.createElement('script'); sc.src = b + 'assets/js/admin-extras.js'; document.head.appendChild(sc); }
            const navHtml = o.nav.map(n => Array.isArray(n)
                ? `<button type="button" class="side-link" data-v="${n[0]}">${n[1]}</button>`
                : `<div class="side-group" data-group="${n.id}"><button type="button" class="side-link side-group-toggle" data-toggle="${n.id}" aria-expanded="false"><span>${n.label}</span><span class="side-chevron" aria-hidden="true">⌄</span></button><div class="side-submenu" hidden>${n.children.map(c => `<button type="button" class="side-link side-sub-link" data-v="${c[0]}">${c[1]}</button>`).join('')}</div></div>`).join('');
            root.innerHTML = `<div class="shell"><nav class="side" aria-label="Bereichsnavigation">${navHtml}</nav><section class="cnt" id="cnt"></section></div>`;
            const go = () => {
                const h = location.hash.slice(1), fallback = o.nav.find(n => Array.isArray(n))?.[0] || o.nav[0].children?.[0]?.[0], id = o.views[h] ? h : fallback;
                NX.$$('.side [data-v]').forEach(x => x.classList.toggle('on', x.dataset.v === id));
                NX.$$('.side-group').forEach(group => {
                    const active = !!group.querySelector(`[data-v="${id}"]`), sub = group.querySelector('.side-submenu'), toggle = group.querySelector('[data-toggle]');
                    if (active) { sub.hidden = false; toggle.setAttribute('aria-expanded', 'true'); group.classList.add('expanded'); }
                    else if (!group.classList.contains('manually-open')) { sub.hidden = true; toggle.setAttribute('aria-expanded', 'false'); group.classList.remove('expanded'); }
                });
                const c = NX.$('#cnt'); c.innerHTML = ''; o.views[id](c); NX.refresh = go; document.dispatchEvent(new CustomEvent('nx:view', { detail: { id, role: o.role } }));
            };
            NX.$('.side').onclick = e => {
                const toggle = e.target.closest('[data-toggle]');
                if (toggle) {
                    const group = toggle.closest('.side-group'), sub = group.querySelector('.side-submenu'), opening = sub.hidden;
                    sub.hidden = !opening; toggle.setAttribute('aria-expanded', String(opening)); group.classList.toggle('expanded', opening); group.classList.toggle('manually-open', opening); return;
                }
                const x = e.target.closest('[data-v]'); if (x) {
                    if (location.hash.slice(1) === x.dataset.v) go(); else location.hash = x.dataset.v;
                }
            };
            window.onhashchange = () => { if (NX.sess.get(o.role)) {
                go();
                window.scrollTo(0, 0);
            } };
            go();
        }
        foot();
        NX.ready.then(() => {
            const ownSession = NX.sess.get(o.role);
            const adminSession = (o.role === 'finance' || o.role === 'time') ? NX.sess.get('admin') : null;
            if (ownSession) { app(); return; }
            if (adminSession && NX.db.auth && adminSession.user === NX.db.auth.user) {
                adminBridge = true;
                NX.sess.set(o.role, adminSession.user);
                app();
                return;
            }
            login();
        });
    };
})();
