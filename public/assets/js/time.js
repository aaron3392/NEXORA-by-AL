/* NEXORA by AL – Zeiterfassung (eigene Sitzung, lokale Daten) */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc;
    const pname = id => (NX.proj(id) || {}).name || '–';
    function entryModal(id, done) {
        const D = NX.db, isNew = !id, t = isNew ? { id: NX.uid('T'), customerId: '', projectId: '', date: NX.today(), start: '09:00', end: '17:00', brk: 30, billable: true, rate: D.settings.hourlyRate, desc: '', invoiceId: null } : D.time.find(x => x.id === id);
        const m = NX.modal(isNew ? 'Zeit erfassen' : 'Zeiteintrag bearbeiten', `<form novalidate><div class="row"><div class="field"><label for="tc">Kunde <span class="req">*</span></label><select id="tc" name="customerId"><option value="">– wählen –</option>${D.customers.map(c => `<option value="${c.id}"${c.id === t.customerId ? ' selected' : ''}>${esc(c.first + ' ' + c.last)}</option>`).join('')}</select></div><div class="field"><label for="tp">Projekt <span class="req">*</span></label><select id="tp" name="projectId"></select></div></div>
 <div class="row"><div class="field"><label for="td">Datum <span class="req">*</span></label><input id="td" type="date" name="date" value="${t.date}"></div><div class="field"><label for="ts">Start</label><input id="ts" type="time" name="start" value="${t.start}"></div><div class="field"><label for="te">Ende</label><input id="te" type="time" name="end" value="${t.end}"></div><div class="field"><label for="tb">Pause (Min.)</label><input id="tb" type="number" min="0" name="brk" value="${t.brk}"></div></div>
 <div class="row"><div class="field"><label for="tr">Stundensatz (€)</label><input id="tr" type="number" step="0.01" min="0" name="rate" value="${(t.rate / 100).toFixed(2)}"></div><div class="field chk"><input id="tbl" type="checkbox" name="billable"${t.billable ? ' checked' : ''}><label for="tbl">Abrechenbar</label></div></div>
 <div class="field"><label for="tt">Tätigkeit <span class="req">*</span></label><textarea id="tt" name="desc" rows="3">${esc(t.desc)}</textarea></div><p class="note" id="dur"></p><p class="err" id="te2" role="alert"></p>
 <div class="acts"><button class="btn" type="submit">Speichern</button>${isNew ? '' : '<button type="button" class="btn ghost" data-del>Löschen</button>'}</div></form>`);
        const f = NX.$('form', m.body), dur = NX.$('#dur', m.body), pp = f.projectId;
        const fill = () => { const c = f.customerId.value; pp.innerHTML = '<option value="">– wählen –</option>' + D.projects.filter(p => !c || p.customerId === c).map(p => `<option value="${p.id}"${p.id === t.projectId ? ' selected' : ''}>${esc(p.name)}</option>`).join(''); };
        const calc = () => { const x = NX.fd(f), mi = NX.mins(x.start, x.end, x.brk); dur.textContent = mi ? 'Berechnete Arbeitsdauer: ' + NX.hm(mi) + (x.billable ? ' · ' + NX.eur(Math.round(mi / 60 * 100) / 100 * NX.cents(x.rate)) : '') : 'Ungültige Zeit: Ende muss nach Start liegen und länger als die Pause sein.'; };
        fill();
        calc();
        f.customerId.onchange = fill;
        f.oninput = calc;
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            if (t.invoiceId)
                return;
            if (!NX.check(f, { customerId: ['req'], projectId: ['req'], date: ['req'], desc: ['req'] }))
                return;
            const x = NX.fd(f);
            const mi = NX.mins(x.start, x.end, x.brk);
            const er = NX.$('#te2', m.body);
            if (!mi) {
                er.textContent = 'Bitte gültige Zeiten eingeben (Dauer muss größer als 0 sein).';
                return;
            }
            x.rate = NX.cents(x.rate);
            x.billable = !!x.billable;
            x.brk = parseInt(x.brk) || 0;
            if (x.billable && x.rate <= 0) {
                er.textContent = 'Für abrechenbare Zeiten ist ein Stundensatz größer als 0 nötig.';
                return;
            }
            Object.assign(t, x);
            if (isNew)
                D.time.push(t);
            NX.log((isNew ? 'Zeit erfasst: ' : 'Zeit geändert: ') + t.date + ' ' + NX.hm(mi));
            NX.toast('Zeiteintrag gespeichert.');
            m.close();
            done();
        });
        const del = NX.$('[data-del]', m.body);
        if (del)
            del.onclick = async () => { if (await NX.confirm('Zeiteintrag löschen?', 'Löschen')) {
                D.time = D.time.filter(x => x.id !== t.id);
                NX.log('Zeiteintrag gelöscht');
                m.close();
                done();
            } };
    }
    function entries(el) {
        const D = NX.db;
        let cf = '', pf = '';
        const draw = NX.listView(el, {
            title: 'Zeiterfassung', add: '+ Zeit erfassen', ph: 'Tätigkeit suchen', dates: true, items: () => [...D.time].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).filter(t => (!cf || t.customerId === cf) && (!pf || t.projectId === pf)), text: t => t.desc + ' ' + NX.custName(t.customerId) + ' ' + pname(t.projectId), stat: () => '', dateOf: t => t.date,
            kpis: all => { const l = all.filter(t => (!cf || t.customerId === cf) && (!pf || t.projectId === pf)), m = l.reduce((s, t) => s + NX.mins(t.start, t.end, t.brk), 0), bm = l.filter(t => t.billable).reduce((s, t) => s + NX.mins(t.start, t.end, t.brk), 0); return NX.kpi(NX.hm(m), 'Erfasste Stunden') + NX.kpi(NX.hm(bm), 'Abrechenbare Stunden') + NX.kpi(NX.eur(l.filter(t => t.billable).reduce((s, t) => s + Math.round(NX.mins(t.start, t.end, t.brk) / 60 * 100) / 100 * t.rate, 0)), 'Abrechenbarer Wert (netto)'); },
            head: ['Datum', 'Kunde', 'Projekt', 'Zeit', 'Pause', 'Dauer', 'Abrechenbar', 'Satz', 'Tätigkeit', 'Abrechnung'],
            row: t => [NX.date(t.date), esc(NX.custName(t.customerId)), esc(pname(t.projectId)), t.start + '–' + t.end, t.brk + ' Min.', NX.hm(NX.mins(t.start, t.end, t.brk)), t.billable ? 'Ja' : 'Nein', t.billable ? NX.eur(t.rate) : '–', esc(t.desc), t.invoiceId ? NX.badge('Abgerechnet') : t.billable ? NX.badge('Offen') : '–'],
            onRow: (id, r) => { const t = D.time.find(x => x.id === id); if (t.invoiceId)
                NX.toast('Bereits abgerechnete Einträge können nicht geändert werden.');
            else
                entryModal(id, r); }, onAdd: r => entryModal(null, r)
        });
        const bar = NX.$('.bar', el), cs = document.createElement('select'), ps = document.createElement('select');
        cs.setAttribute('aria-label', 'Kunde filtern');
        ps.setAttribute('aria-label', 'Projekt filtern');
        cs.innerHTML = '<option value="">Alle Kunden</option>' + D.customers.map(c => `<option value="${c.id}">${esc(c.first + ' ' + c.last)}</option>`).join('');
        ps.innerHTML = '<option value="">Alle Projekte</option>' + D.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
        bar.append(cs, ps);
        cs.onchange = () => { cf = cs.value; draw(); };
        ps.onchange = () => { pf = ps.value; draw(); };
        const oc = el.onchange;
        el.onchange = e => { if (e.target === cs || e.target === ps)
            return; oc && oc(e); };
        draw();
    }
    function week(d) { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + 4 - (x.getDay() || 7)); const y = new Date(x.getFullYear(), 0, 1); return x.getFullYear() + '-KW' + String(Math.ceil(((x - y) / 864e5 + 1) / 7)).padStart(2, '0'); }
    function overview(el) {
        const D = NX.db;
        let mode = 'day';
        const F = { df: '', dt: '', wk: '', mf: '', mt: '' };
        el.innerHTML = '<h1>Übersicht</h1><div class="bar" style="align-items:center;gap:12px"><select id="md" aria-label="Zeitraum" style="flex:0 0 auto;width:auto;min-width:160px;max-width:210px;min-height:38px;padding:6px 34px 6px 12px;border-radius:10px;font-size:.92rem"><option value="day">Tagesübersicht</option><option value="week">Wochenübersicht</option><option value="month">Monatsübersicht</option></select><span id="ovf" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:0"></span></div><div id="ov"></div>';
        const fields = () => {
            const ci = 'style="width:auto;min-height:38px;padding:5px 10px;border-radius:10px;font-size:.9rem"';
            const h = mode === 'day' ? '<label style="display:flex;align-items:center;gap:8px;font-weight:500;white-space:nowrap">Von <input type="date" id="f-df" '+ci+' value="' + F.df + '"></label><label style="display:flex;align-items:center;gap:8px;font-weight:500;white-space:nowrap">Bis <input type="date" id="f-dt" '+ci+' value="' + F.dt + '"></label>'
                : mode === 'week' ? '<label style="display:flex;align-items:center;gap:8px;font-weight:500;white-space:nowrap">Kalenderwoche <input type="week" id="f-wk" '+ci+' value="' + F.wk + '"></label>'
                    : '<label style="display:flex;align-items:center;gap:8px;font-weight:500;white-space:nowrap">Von Monat <input type="month" id="f-mf" '+ci+' value="' + F.mf + '"></label><label style="display:flex;align-items:center;gap:8px;font-weight:500;white-space:nowrap">Bis Monat (optional) <input type="month" id="f-mt" '+ci+' value="' + F.mt + '"></label>';
            NX.$('#ovf', el).innerHTML = h + '<button type="button" class="btn sm" id="f-reset">Filter zurücksetzen</button>';
        };
        const draw = () => {
            const wkKey = F.wk ? F.wk.replace('-W', '-KW') : '';
            const mt = F.mt || F.mf;
            const g = {};
            D.time.forEach(t => {
                if (mode === 'day') { if (F.df && t.date < F.df) return; if ((F.dt || F.df) && t.date > (F.dt || F.df)) return; }
                if (mode === 'week' && wkKey && week(t.date) !== wkKey) return;
                if (mode === 'month') { const m = t.date.slice(0, 7); if (F.mf && m < F.mf) return; if (mt && m > mt) return; }
                const k = mode === 'day' ? t.date : mode === 'week' ? week(t.date) : t.date.slice(0, 7); const mi = NX.mins(t.start, t.end, t.brk) || 0; const o = g[k] = g[k] || { a: 0, b: 0, n: 0 }; o.a += mi; if (t.billable)
                    o.b += mi; o.n++;
            });
            const keys = Object.keys(g).sort().reverse();
            NX.$('#ov', el).innerHTML = keys.length ? NX.table(['Zeitraum', 'Einträge', 'Gesamt', 'Abrechenbar', 'Nicht abrechenbar'], keys.map(k => ({ id: k, cells: [mode === 'day' ? NX.date(k) : k, g[k].n, NX.hm(g[k].a), NX.hm(g[k].b), NX.hm(g[k].a - g[k].b)] }))) : '<div class="tw"><p class="empty">' + (D.time.length ? 'Keine Einträge im gewählten Zeitraum.' : 'Noch keine Einträge.') + '</p></div>';
        };
        NX.$('#md', el).onchange = e => { mode = e.target.value; fields(); draw(); };
        el.addEventListener('input', e => {
            const id = e.target.id; if (!id || id.indexOf('f-') !== 0) return;
            const v = e.target.value;
            if (id === 'f-df') { F.df = v; F.dt = v; const dt = NX.$('#f-dt', el); if (dt) dt.value = v; }
            else if (id === 'f-dt') F.dt = v;
            else if (id === 'f-wk') F.wk = v;
            else if (id === 'f-mf') F.mf = v;
            else if (id === 'f-mt') F.mt = v;
            draw();
        });
        el.addEventListener('click', e => { if (e.target.id === 'f-reset') { F.df = F.dt = F.wk = F.mf = F.mt = ''; fields(); draw(); } });
        fields();
        draw();
    }
    // Ansichten können direkt in der Administration eingebettet werden.
    NX.timeViews = { eintraege: entries, uebersicht: overview };
})();
