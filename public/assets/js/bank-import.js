/* NEXORA by AL – Kontoauszug-Import (CSV, Excel .xlsx, PDF). Alles läuft im Browser; die Datei wird nicht hochgeladen. */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc, base = (document.currentScript && document.currentScript.src) || location.href;
    const vendor = p => new URL('../vendor/' + p, base).href;
    const money = c => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format((Number(c) || 0) / 100);
    const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
    /* ---------- Werte erkennen ---------- */
    function parseDate(v) {
        v = String(v == null ? '' : v).trim(); if (!v) return '';
        let m;
        if (/^\d{5}(\.\d+)?$/.test(v) && +v > 20000 && +v < 80000) { return new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 864e5).toISOString().slice(0, 10); }
        if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
        if ((m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?!\d)/))) { let y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
        return '';
    }
    function parseAmount(v) {
        if (typeof v === 'number') return Math.round(v * 100);
        let s = String(v == null ? '' : v).replace(/[\s €]|EUR/gi, ''); if (!s) return NaN;
        let neg = false;
        if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
        if (/[-−]$/.test(s)) { neg = true; s = s.slice(0, -1); } else if (/S$/i.test(s)) { neg = true; s = s.slice(0, -1); } else if (/H$/i.test(s)) { s = s.slice(0, -1); }
        if (/^[-−]/.test(s)) { neg = !neg; s = s.slice(1); } else if (s[0] === '+') s = s.slice(1);
        if (!/^\d[\d.,]*$/.test(s)) return NaN;
        const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
        if (lc >= 0 && ld >= 0) { s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); }
        else if (lc >= 0) { s = /,\d{1,2}$/.test(s) && s.indexOf(',') === lc ? s.replace(',', '.') : s.replace(/,/g, ''); }
        else if (ld >= 0) { if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); }
        const n = Number(s); if (!isFinite(n)) return NaN;
        const c = Math.round(n * 100); return neg ? -c : c;
    }
    /* ---------- Dateien lesen ---------- */
    function decode(buf) { let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { t = new TextDecoder('windows-1252').decode(buf); } return t.replace(/^﻿/, ''); }
    function parseCSV(text) {
        const first = text.split(/\r?\n/).slice(0, 5).join('\n'), cnt = c => (first.match(new RegExp(c === '\t' ? '\t' : '\\' + c, 'g')) || []).length;
        const d = [';', ',', '\t'].sort((a, b) => cnt(b) - cnt(a))[0], rows = []; let row = [], cur = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
            else if (ch === '"') q = true;
            else if (ch === d) { row.push(cur); cur = ''; }
            else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
            else cur += ch;
        }
        row.push(cur); if (row.some(x => x.trim() !== '')) rows.push(row);
        return rows;
    }
    function loadScript(src) { return new Promise((ok, no) => { if (window.JSZip) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Bibliothek konnte nicht geladen werden.')); document.head.appendChild(s); }); }
    async function parseXLSX(buf) {
        await loadScript(vendor('jszip/jszip.min.js'));
        const zip = await window.JSZip.loadAsync(buf), xml = async n => { const f = zip.file(n); return f ? new DOMParser().parseFromString(await f.async('string'), 'application/xml') : null; };
        const ss = [], sdoc = await xml('xl/sharedStrings.xml');
        if (sdoc) sdoc.querySelectorAll('si').forEach(si => ss.push([...si.querySelectorAll('t')].map(t => t.textContent).join('')));
        const names = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
        if (!names.length) throw new Error('Keine Tabelle in der Excel-Datei gefunden.');
        const doc = await xml(names[0]), rows = [], col = r => { let n = 0; r.replace(/[A-Z]/g, c => { n = n * 26 + c.charCodeAt(0) - 64; return ''; }); return n - 1; };
        doc.querySelectorAll('sheetData > row').forEach(r => {
            const arr = [];
            r.querySelectorAll('c').forEach(c => {
                const ref = c.getAttribute('r') || '', t = c.getAttribute('t'), v = c.querySelector('v'); let val = '';
                if (t === 'inlineStr') val = [...c.querySelectorAll('t')].map(x => x.textContent).join(''); else if (v) val = t === 's' ? (ss[+v.textContent] || '') : v.textContent;
                arr[ref ? col(ref) : arr.length] = val;
            });
            for (let i = 0; i < arr.length; i++) if (arr[i] == null) arr[i] = '';
            if (arr.some(x => String(x).trim() !== '')) rows.push(arr);
        });
        return rows;
    }
    /* ---------- Tabelle → Buchungen ---------- */
    const FIELDS = [['date', 'Datum'], ['amount', 'Betrag (mit Vorzeichen)'], ['debit', 'Soll / Belastung'], ['credit', 'Haben / Gutschrift'], ['text', 'Verwendungszweck / Text'], ['name', 'Name / Partner']];
    const HEAD = {
        date: [/^buchungs(datum|tag)/, /^datum/, /^buchungsdatum/, /^booking ?date/, /^transaction ?date/, /^date/, /^valuta/],
        amount: [/^betrag/, /^umsatz$/, /^amount/, /^summe/, /^wert$/],
        debit: [/^soll/, /^belastung/, /^abbuchung/, /^ausgang/, /^debit/],
        credit: [/^haben/, /^gutschrift/, /^eingang/, /^credit/],
        text: [/verwendungszweck/, /buchungstext/, /zahlungsreferenz/, /beschreibung/, /details/, /reference/, /purpose/, /description/, /memo/, /^text/, /umsatztext/],
        name: [/auftraggeber/, /empfaenger/, /beguenstigter/, /zahlungspflichtiger/, /partner/, /counterparty/, /^name/, /payee/]
    };
    function detect(grid) {
        for (let r = 0; r < Math.min(grid.length, 40); r++) {
            const h = grid[r].map(norm), map = {};
            Object.keys(HEAD).forEach(f => { for (const rx of HEAD[f]) { const i = h.findIndex((x, k) => x && rx.test(x) && !Object.values(map).includes(k)); if (i >= 0) { map[f] = i; break; } } });
            if (map.date != null && (map.amount != null || map.debit != null || map.credit != null)) return { header: r, map };
        }
        return null;
    }
    function rowsFromGrid(grid, header, map) {
        const out = [];
        grid.slice(header + 1).forEach(r => {
            const date = parseDate(r[map.date]); if (!date) return;
            let amt = NaN;
            if (map.amount != null && String(r[map.amount] == null ? '' : r[map.amount]).trim() !== '') amt = parseAmount(r[map.amount]);
            if (isNaN(amt) && (map.debit != null || map.credit != null)) { const d = map.debit != null ? parseAmount(r[map.debit]) : NaN, c = map.credit != null ? parseAmount(r[map.credit]) : NaN; if (!isNaN(c) && c !== 0) amt = Math.abs(c); else if (!isNaN(d) && d !== 0) amt = -Math.abs(d); }
            if (isNaN(amt) || amt === 0) return;
            const parts = [map.name != null ? r[map.name] : '', map.text != null ? r[map.text] : ''].map(x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim()).filter(Boolean);
            out.push({ date, description: parts.join(' – ') || 'Ohne Verwendungszweck', amount: amt });
        });
        return out;
    }
    /* ---------- PDF ---------- */
    async function pdfLines(buf) {
        const lib = await import(vendor('pdfjs/pdf.min.mjs')); lib.GlobalWorkerOptions.workerSrc = vendor('pdfjs/pdf.worker.min.mjs');
        const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise, lines = [];
        for (let p = 1; p <= pdf.numPages; p++) {
            const items = (await (await pdf.getPage(p)).getTextContent()).items.filter(i => i.str && i.str.trim()), rows = [];
            items.forEach(i => { const y = i.transform[5], x = i.transform[4]; let r = rows.find(z => Math.abs(z.y - y) < 3); if (!r) rows.push(r = { y, it: [] }); r.it.push({ x, s: i.str }); });
            rows.sort((a, b) => b.y - a.y).forEach(r => lines.push(r.it.sort((a, b) => a.x - b.x).map(i => i.s.trim()).join(' ').replace(/\s+/g, ' ')));
        }
        return lines;
    }
    const AMT = /(?:^|\s)([+\-−]?\s?\d{1,3}(?:\.\d{3})*,\d{2}\s?[-+]?\s?(?:[SH](?=\s|$))?)(?=\s|€|EUR|$)/g;
    function rowsFromPdf(lines, which) {
        const yr = (lines.join(' ').match(/\b(20\d{2})\b/) || [])[1] || String(new Date().getFullYear()), out = []; let last = null;
        if (which === 'auto') { let two = 0, all = 0; lines.forEach(l => { if (/^\d{1,2}\.\d{1,2}\./.test(l)) { const n = [...l.matchAll(AMT)].length; if (n) { all++; if (n >= 2) two++; } } }); which = all && two * 2 > all ? 'second' : 'last'; }
        lines.forEach(l => {
            const m = l.match(/^(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)(?!\d)\s*(.*)$/);
            if (m) {
                let d = m[1]; if (/\.$/.test(d)) d += yr; let rest = m[2].replace(/^(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)(?!\d)\s*/, '');
                const toks = [...rest.matchAll(AMT)]; if (!toks.length) { last = null; return; }
                const t = toks[which === 'second' && toks.length > 1 ? toks.length - 2 : toks.length - 1], amt = parseAmount(t[1].replace(/\s/g, ''));
                if (isNaN(amt) || amt === 0) { last = null; return; }
                last = { date: parseDate(d), description: rest.slice(0, t.index).replace(/\s+/g, ' ').trim() || 'Ohne Verwendungszweck', amount: amt }; if (last.date) out.push(last); else last = null;
            } else if (last && l.length < 140 && !/\d,\d{2}\s*$/.test(l) && !/^(seite|saldo|kontostand|übertrag)/i.test(l)) last.description = (last.description + ' ' + l).replace(/\s+/g, ' ').trim();
            else last = null;
        });
        out._w = which; return out;
    }
    /* ---------- Oberfläche ---------- */
    function open(done) {
        const bk = NX.bookkeeping, m = NX.modal('Kontoauszug importieren', `<p class="mut">CSV, Excel (.xlsx) oder PDF. Die Datei wird nur in deinem Browser gelesen. Du prüfst die erkannten Buchungen, bevor sie übernommen werden.</p>
<div class="field"><label for="bi-f">Datei</label><input id="bi-f" type="file" accept=".csv,.txt,.xlsx,.pdf"></div><div id="bi-o"></div>`, { wide: true });
        const out = m.querySelector('#bi-o'), file = m.querySelector('#bi-f'); let src = null;
        const err = t => { out.innerHTML = '<p class="err" role="alert">' + esc(t) + '</p>'; };
        function preview(rows, extra) {
            const have = new Set(bk.fingerprints()), fps = rows.map(r => bk.fingerprint(r)), seen = new Set();
            const dup = fps.map(f => { const d = have.has(f) || seen.has(f); seen.add(f); return d; });
            out.innerHTML = (extra || '') + (rows.length ? `<p><b>${rows.length}</b> Buchungen erkannt${dup.some(Boolean) ? ', ' + dup.filter(Boolean).length + ' davon bereits vorhanden (nicht ausgewählt)' : ''}. Bitte Datum, Betrag und Richtung prüfen.</p>
<div class="table-wrap" style="max-height:340px;overflow:auto"><table><tr><th></th><th>Datum</th><th>Beschreibung</th><th>Betrag</th><th>Art</th></tr>${rows.map((r, i) => `<tr><td><input type="checkbox" data-i="${i}" ${dup[i] ? '' : 'checked'} aria-label="Übernehmen"></td><td>${esc(r.date)}</td><td>${esc(r.description)}</td><td>${money(Math.abs(r.amount))}</td><td><select data-d="${i}"><option value="in"${r.amount > 0 ? ' selected' : ''}>Einnahme</option><option value="out"${r.amount < 0 ? ' selected' : ''}>Ausgabe</option></select></td></tr>`).join('')}</table></div>
<div class="acts"><button type="button" class="btn" id="bi-go">Ausgewählte importieren</button></div>` : '<p class="err">Keine Buchungen erkannt.</p>');
            const go = out.querySelector('#bi-go'); if (!go) return;
            go.onclick = () => {
                const sel = rows.map((r, i) => ({ r, i })).filter(x => out.querySelector(`[data-i="${x.i}"]`).checked).map(x => { const out2 = out.querySelector(`[data-d="${x.i}"]`).value === 'out' ? -Math.abs(x.r.amount) : Math.abs(x.r.amount); return { date: x.r.date, description: x.r.description, amount: out2 }; });
                if (!sel.length) return NX.toast('Nichts ausgewählt.');
                const res = bk.addBank(sel); m.close(); NX.toast(res.added + ' Buchungen importiert' + (res.matched ? ', ' + res.matched + ' automatisch einer Rechnung zugeordnet' : '') + '.'); done && done();
            };
        }
        function mapping(grid) {
            const cols = Math.max(...grid.slice(0, 20).map(r => r.length)), sample = grid.slice(0, 3);
            const opts = '<option value="">– nicht verwenden –</option>' + Array.from({ length: cols }, (_, i) => `<option value="${i}">Spalte ${i + 1}: ${esc(String(sample.map(r => r[i] || '').find(Boolean) || '').slice(0, 24))}</option>`).join('');
            out.innerHTML = `<p>Die Spalten wurden nicht automatisch erkannt. Bitte zuordnen (die erste Zeile gilt als Überschrift):</p><div class="grid g2">${FIELDS.map(([k, l]) => `<div class="field"><label for="bm-${k}">${l}</label><select id="bm-${k}">${opts}</select></div>`).join('')}</div><div class="acts"><button type="button" class="btn" id="bm-go">Weiter</button></div>`;
            out.querySelector('#bm-go').onclick = () => {
                const mp = {}; FIELDS.forEach(([k]) => { const v = out.querySelector('#bm-' + k).value; if (v !== '') mp[k] = +v; });
                if (mp.date == null || (mp.amount == null && mp.debit == null && mp.credit == null)) return NX.toast('Datum und Betrag (oder Soll/Haben) sind nötig.');
                preview(rowsFromGrid(grid, 0, mp));
            };
        }
        file.onchange = async () => {
            const f = file.files[0]; if (!f) return; out.innerHTML = '<p class="mut">Datei wird gelesen …</p>';
            try {
                const ext = (f.name.split('.').pop() || '').toLowerCase(), buf = await f.arrayBuffer();
                if (ext === 'xls') return err('Das alte Excel-Format (.xls) wird nicht unterstützt. Bitte als .xlsx oder CSV speichern.');
                if (ext === 'pdf') {
                    const lines = await pdfLines(buf); if (!lines.length) return err('In dieser PDF wurde kein Text gefunden (evtl. eingescannt). Bitte CSV oder Excel verwenden.');
                    const draw = which => { const rows = rowsFromPdf(lines, which); preview(rows, `<div class="field"><label for="bi-w">Betrag steht in der Zeile</label><select id="bi-w"><option value="last">als letzte Zahl in der Zeile</option><option value="second">als vorletzte Zahl (Saldo steht dahinter)</option></select></div>`); const sel = out.querySelector('#bi-w'); if (sel) sel.value = rows._w; };
                    draw('auto'); out.addEventListener('change', e => { if (e.target.id === 'bi-w') draw(e.target.value); }); return;
                }
                const grid = ext === 'xlsx' ? await parseXLSX(buf) : parseCSV(decode(buf)); src = grid;
                if (!grid.length) return err('Die Datei enthält keine Daten.');
                const d = detect(grid); if (d) preview(rowsFromGrid(grid, d.header, d.map)); else mapping(grid);
            } catch (e) { err('Die Datei konnte nicht gelesen werden: ' + (e.message || e)); }
        };
    }
    NX.bankImport = { open, parseDate, parseAmount, parseCSV, rowsFromGrid, detect, rowsFromPdf };
})();
