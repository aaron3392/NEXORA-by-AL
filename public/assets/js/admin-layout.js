/* NEXORA by AL – Administration: Menü und Listen werden bei Platzmangel in Seiten (‹ 1 2 3 ›) aufgeteilt, damit kein langes Scrollen nötig ist. */
(function () {
    'use strict';
    if (!document.body || !document.body.classList.contains('admin-app') || !window.MutationObserver) return;
    const root = document.getElementById('root'), hdr = document.getElementById('hdr'), wide = () => window.matchMedia('(min-width: 901px)').matches;
    const saved = {}; let sidePage = 0, tm = 0, obs;
    const E = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
    function pageNumbers(page, pages) { const o = []; for (let i = 0; i < pages; i++) { if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) o.push(i); else if (o[o.length - 1] !== '…') o.push('…'); } return o; }
    function pager(page, pages, info, go, cls) {
        const n = E('nav', 'nx-pg ' + (cls || '')); n.setAttribute('aria-label', 'Seiten');
        const b = (label, p, o) => { const x = E('button', o && o.on ? 'on' : '', label); x.type = 'button'; if (o && o.aria) x.setAttribute('aria-label', o.aria); if (o && o.off) x.disabled = true; if (o && o.on) x.setAttribute('aria-current', 'page'); x.onclick = () => go(p); return x; };
        n.appendChild(b('‹', page - 1, { off: page === 0, aria: 'Vorherige Seite' }));
        pageNumbers(page, pages).forEach(p => { if (p === '…') n.appendChild(E('span', 'nx-pg-gap', '…')); else n.appendChild(b(String(p + 1), p, { on: p === page, aria: 'Seite ' + (p + 1) })); });
        n.appendChild(b('›', page + 1, { off: page === pages - 1, aria: 'Nächste Seite' }));
        if (info) n.appendChild(E('span', 'nx-pg-info', info));
        return n;
    }
    /* ---------- Listen (Tabellen) ---------- */
    function tables(cnt) {
        const key0 = location.hash || '#';
        [...cnt.querySelectorAll('table')].forEach((t, idx) => {
            if (t.closest('.ov, .md, .doc, .nx-ax-cal, .nx-ax-calpage .nx-ax-cal-wbody') || t.dataset.pg === 'skip') return;
            const wrap = t.closest('.tw, .table-wrap') || t, old = wrap.nextElementSibling; if (old && old.classList.contains('nx-pg')) old.remove();
            const rows = t.tBodies.length ? [].concat(...[...t.tBodies].map(b => [...b.rows])) : [...t.rows].filter(r => !r.querySelector('th'));
            rows.forEach(r => r.classList.remove('nx-pg-h'));
            if (rows.length < 8) return;
            let size = 10;
            if (wide()) {
                const sample = rows.slice(0, 5), rh = sample.reduce((s, r) => s + r.offsetHeight, 0) / sample.length || 40,
                    top = t.getBoundingClientRect().top - cnt.getBoundingClientRect().top + cnt.scrollTop, head = t.tHead ? t.tHead.offsetHeight : 0,
                    avail = cnt.clientHeight - top - head - 80 - parseFloat(getComputedStyle(cnt).paddingBottom || 0);
                size = Math.max(4, Math.floor(avail / rh));
            }
            if (rows.length <= size) return;
            const pages = Math.ceil(rows.length / size), k = key0 + '#' + idx; let page = Math.min(saved[k] || 0, pages - 1);
            const draw = () => {
                rows.forEach((r, i) => r.classList.toggle('nx-pg-h', i < page * size || i >= (page + 1) * size));
                const cur = wrap.nextElementSibling; if (cur && cur.classList.contains('nx-pg')) cur.remove();
                obs.disconnect();
                wrap.insertAdjacentElement('afterend', pager(page, pages, 'Einträge ' + (page * size + 1) + '–' + Math.min(rows.length, (page + 1) * size) + ' von ' + rows.length, p => { page = p; saved[k] = p; draw(); }));
                obs.observe(root, { childList: true, subtree: true });
            };
            draw();
        });
    }
    /* ---------- Seitenmenü ---------- */
    function side() {
        const sd = root.querySelector('.side'); if (!sd) return;
        const old = sd.querySelector(':scope > .nx-pg-side'); if (old) old.remove();
        const items = [...sd.children]; items.forEach(i => i.classList.remove('nx-pg-h'));
        return; /* Seitenmenü scrollt jetzt, keine Seiten mehr */
        if (!wide()) return;
        const cs = getComputedStyle(sd), room = sd.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), h = i => i.offsetHeight + parseFloat(getComputedStyle(i).marginTop) + parseFloat(getComputedStyle(i).marginBottom);
        if (items.reduce((s, i) => s + h(i), 0) <= room) return;
        const avail = room - 52, pages = []; let cur = [], used = 0;
        items.forEach(i => { if (cur.length && used + h(i) > avail) { pages.push(cur); cur = []; used = 0; } cur.push(i); used += h(i); }); if (cur.length) pages.push(cur);
        if (pages.length < 2) return;
        const act = pages.findIndex(p => p.some(i => i.classList.contains('on') || i.querySelector('.on'))); if (act >= 0 && !sd._pgUser) sidePage = act;
        sidePage = Math.min(sidePage, pages.length - 1);
        const draw = () => {
            pages.forEach((p, n) => p.forEach(i => i.classList.toggle('nx-pg-h', n !== sidePage)));
            const c = sd.querySelector(':scope > .nx-pg-side'); if (c) c.remove();
            obs.disconnect(); sd.appendChild(pager(sidePage, pages.length, '', p => { sidePage = p; sd._pgUser = true; draw(); }, 'nx-pg-side')); obs.observe(root, { childList: true, subtree: true });
        };
        draw();
    }
    function run() {
        tm = 0; if (hdr) document.documentElement.style.setProperty('--nx-hh', hdr.offsetHeight + 'px');
        const cnt = document.getElementById('cnt'); obs.disconnect();
        try { if (cnt) tables(cnt); side(); } finally { obs.observe(root, { childList: true, subtree: true }); }
    }
    const later = ms => { clearTimeout(tm); tm = setTimeout(run, ms == null ? 60 : ms); };
    obs = new MutationObserver(() => later());
    obs.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', () => later(150));
    document.addEventListener('nx:view', () => { const sd = root.querySelector('.side'); if (sd) sd._pgUser = false; later(30); });
    root.addEventListener('click', e => { if (e.target.closest('.side')) later(60); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later(0));
    later(0);
})();
