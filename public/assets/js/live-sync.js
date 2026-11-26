/* NEXORA by AL – Administration: Live-Abgleich und Benachrichtigungen.
   Fragt alle paar Sekunden ab, ob sich die Datenbank geändert hat (z. B. neue Kundenanfrage über die öffentliche Seite), übernimmt die Änderungen
   in die geöffnete Seite und meldet Neues per Hinweis, Ton, Tab-Titel und (nach Erlaubnis) Systembenachrichtigung am PC und Smartphone. */
(function () {
    'use strict';
    const NX = window.NX, BE = NX && NX.backend;
    if (!NX || !BE || !BE.on || !document.body.classList.contains('admin-app')) return;
    const PREF = 'nx_live_notify', base = document.title; let snap = null, status = 'ok', unseen = 0, lastWrite = 0, pending = null, reg = null, audio = null, lastRev = BE.rev;
    const rawSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (this === localStorage && k === 'nx_db_v1') lastWrite = Date.now(); return rawSet.apply(this, arguments); };
    const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { rawSet.call(localStorage, k, v); } catch (e) { } } };
    const supported = () => 'Notification' in window;
    const wanted = () => supported() && Notification.permission === 'granted' && ls.get(PREF) !== '0';
    /* ---------- Stand merken und vergleichen ---------- */
    const take = db => ({
        inq: new Set((db.inquiries || []).map(i => i.id)),
        cust: new Set((db.customers || []).filter(c => c.role !== 'Administrator' && c.role !== 'Mitarbeiter').map(c => c.id)),
        sup: new Set((db.support || []).map(s => s.id)),
        dec: new Set((db.offers || []).filter(o => o.decision).map(o => o.id + ':' + o.decision.at)),
        clm: new Set((db.invoices || []).filter(i => i.claim).map(i => i.id + ':' + i.claim.at)),
        chat: Object.fromEntries(Object.keys(db.chat || {}).map(id => [id, (db.chat[id] || []).filter(m => m.from === 'me').length]))
    });
    const name = o => [o && o.first, o && o.last].filter(Boolean).join(' ') || (o && o.email) || 'Unbekannt';
    function diff(db) {
        const n = [], s = snap || take({});
        (db.inquiries || []).filter(i => !s.inq.has(i.id)).forEach(i => n.push({ k: 'inq', t: 'Neue Anfrage', b: (i.subject || 'Ohne Betreff') + ' – ' + name(i), go: 'anfragen' }));
        (db.customers || []).filter(c => c.role !== 'Administrator' && c.role !== 'Mitarbeiter' && !s.cust.has(c.id)).forEach(c => n.push({ k: 'cust', t: 'Neue Kundenregistrierung', b: name(c) + (c.email ? ' (' + c.email + ')' : ''), go: 'user' }));
        (db.support || []).filter(x => !s.sup.has(x.id)).forEach(x => { const c = (db.customers || []).find(u => u.id === x.customerId); n.push({ k: 'sup', t: 'Neue Support-Anfrage', b: (x.subject || 'Ohne Betreff') + (c ? ' – ' + name(c) : ''), go: 'projekte' }); });
        (db.offers || []).filter(o => o.decision && !s.dec.has(o.id + ':' + o.decision.at)).forEach(o => n.push({ k: 'dec', t: (o.type || 'Angebot') + (o.decision.st === 'Angenommen' ? ' angenommen' : ' abgelehnt'), b: o.number + ' – ' + name((db.customers || []).find(u => u.id === o.customerId)) + (o.decision.reason ? ': ' + o.decision.reason : ''), go: 'verrechnung-angebote' }));
        (db.invoices || []).filter(i => i.claim && !s.clm.has(i.id + ':' + i.claim.at)).forEach(i => n.push({ k: 'clm', t: 'Zahlung gemeldet', b: 'Rechnung ' + i.number + ' – ' + name((db.customers || []).find(u => u.id === i.customerId)), go: 'verrechnung-rechnungen' }));
        Object.keys(db.chat || {}).forEach(id => { const cnt = (db.chat[id] || []).filter(m => m.from === 'me').length; if (cnt > (s.chat[id] || 0)) { const c = (db.customers || []).find(u => u.id === id); n.push({ k: 'chat', t: 'Neue Chat-Nachricht', b: c ? name(c) : 'Kunde', go: 'user' }); } });
        return n;
    }
    /* ---------- Hinweise ---------- */
    function beep() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const t = audio.currentTime; [[880, 0], [1175, .13]].forEach(([f, d]) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.12, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .3); o.connect(g); g.connect(audio.destination); o.start(t + d); o.stop(t + d + .32); }); } catch (e) { } }
    function system(n) {
        if (!wanted()) return; const away = document.hidden || !document.hasFocus(); if (!away) return;
        const opt = { body: n.b, tag: 'nx-' + n.k, renotify: true, icon: new URL('../assets/images/nexora-symbol.png', document.currentScript ? document.currentScript.src : location.href).href, data: { url: location.pathname + '#' + n.go } };
        if (reg && reg.showNotification) { reg.showNotification('NEXORA – ' + n.t, opt).catch(() => { try { new Notification('NEXORA – ' + n.t, opt); } catch (e) { } }); }
        else { try { const x = new Notification('NEXORA – ' + n.t, opt); x.onclick = () => { window.focus(); location.hash = n.go; x.close(); }; } catch (e) { } }
    }
    function announce(list) {
        if (!list.length) return;
        list.slice(0, 3).forEach(n => { NX.toast(n.t + ': ' + n.b); system(n); });
        if (list.length > 3) NX.toast('… und ' + (list.length - 3) + ' weitere Neuigkeiten.');
        beep();
        if (document.hidden || !document.hasFocus()) { unseen += list.length; title(); }
    }
    function title() { document.title = (unseen ? '(' + unseen + ') ' : '') + base; }
    const seen = () => { if (unseen) { unseen = 0; title(); } };
    window.addEventListener('focus', seen); document.addEventListener('visibilitychange', () => { if (!document.hidden) seen(); });
    /* ---------- Abgleich ---------- */
    const idle = () => !document.querySelector('.ov') && !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) && Date.now() - lastWrite > 1800;
    function apply(j) {
        Object.keys(NX.db).forEach(k => delete NX.db[k]); Object.assign(NX.db, j.db); BE.rev = j.rev; BE.empty = false; pending = null;
        if (typeof NX.refresh === 'function') { try { NX.refresh(); } catch (e) { } }
    }
    async function tick() {
        try {
            const r = await fetch('/api/rev', { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok) throw new Error('rev');
            const v = await r.json(); setStatus('ok');
            if (v.role !== 'admin') { setStatus('out'); return; }
            if (v.rev === BE.rev) { lastRev = v.rev; if (NX.db) snap = take(NX.db); }   /* eigene Änderung: nichts zu melden */
            else if (v.rev !== lastRev) {
                const d = await fetch('/api/db', { credentials: 'same-origin', cache: 'no-store' }); if (!d.ok) throw new Error('db');
                const j = await d.json(); if (!j || (j.role !== 'admin' && j.role !== 'employee') || !j.db) return;
                lastRev = j.rev; announce(diff(j.db)); snap = take(j.db);
                if (idle()) apply(j); else pending = j;
            } else if (pending && idle()) apply(pending);
        } catch (e) { setStatus('off'); }
    }
    let timer = 0; const loop = () => { clearTimeout(timer); timer = setTimeout(async () => { await tick(); loop(); }, document.hidden ? 15000 : 4000); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); loop(); } });
    /* ---------- Anzeige in der Kopfleiste ---------- */
    function setStatus(s) { status = s; const e = document.querySelector('.nx-live'); if (!e) return; e.dataset.s = s; e.title = s === 'ok' ? 'Live-Abgleich aktiv' : s === 'out' ? 'Sitzung abgelaufen – bitte neu anmelden' : 'Keine Verbindung – es wird weiter versucht'; }
    function bell() {
        const b = document.querySelector('.nx-live-bell'); if (!b) return;
        const p = supported() ? Notification.permission : 'unsupported', on = wanted();
        b.dataset.on = on ? '1' : '0'; b.title = p === 'unsupported' ? 'Dieser Browser unterstützt keine Benachrichtigungen' : p === 'denied' ? 'Benachrichtigungen sind im Browser blockiert (Website-Einstellungen)' : on ? 'Benachrichtigungen sind an – zum Ausschalten klicken' : 'Benachrichtigungen aktivieren';
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = p === 'unsupported';
    }
    async function toggle() {
        if (!supported()) return;
        if (Notification.permission === 'granted') { ls.set(PREF, wanted() ? '0' : '1'); bell(); NX.toast(wanted() ? 'Benachrichtigungen sind an.' : 'Benachrichtigungen sind aus.'); return; }
        if (Notification.permission === 'denied') { NX.toast('Benachrichtigungen sind im Browser blockiert. Bitte in den Website-Einstellungen erlauben.'); return; }
        const r = await Notification.requestPermission(); if (r === 'granted') { ls.set(PREF, '1'); register(); beep(); NX.toast('Benachrichtigungen sind an.'); } bell();
    }
    function mount() {
        const hdr = document.getElementById('hdr'); if (!hdr || hdr.querySelector('.nx-live-box') || !hdr.querySelector('.hb')) return;
        const box = document.createElement('div'); box.className = 'nx-live-box';
        box.innerHTML = '<span class="nx-live" data-s="' + status + '" role="status" aria-label="Live-Abgleich"><i></i>Live</span><button type="button" class="nx-live-bell" aria-label="Benachrichtigungen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 20a2 2 0 0 0 3.4 0"/></svg></button>';
        const out = [...hdr.querySelectorAll('button')].find(x => /Abmelden/i.test(x.textContent)); const hb = hdr.querySelector('.hb');
        const me = hdr.querySelector('#me'), ref = me || out; if (ref && ref.parentNode) ref.parentNode.insertBefore(box, ref); else hb.appendChild(box);
        box.querySelector('.nx-live-bell').onclick = toggle; bell(); setStatus(status);
    }
    async function register() { try { if ('serviceWorker' in navigator && window.isSecureContext) reg = await navigator.serviceWorker.register('sw.js', { scope: './' }); } catch (e) { reg = null; } }
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.nxGo) { const h = String(e.data.nxGo).split('#')[1]; if (h) location.hash = h; } });
    document.addEventListener('nx:view', () => { mount(); if (!snap && NX.db) snap = take(NX.db); });
    let mq = 0; const later = () => { if (mq) return; mq = requestAnimationFrame(() => { mq = 0; mount(); }); };
    new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', mount); window.addEventListener('load', mount); mount();
    if (wanted()) register();
    loop();
})();
