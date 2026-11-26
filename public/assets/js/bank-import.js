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
    function statementFlow(done, startFile, wrapModal) {
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
        const handle = async f => {
            if (!f) return; out.innerHTML = '<p class="mut">Datei wird gelesen …</p>';
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
        file.onchange = () => handle(file.files[0]);
        if (startFile) { m.querySelector('.field').hidden = true; handle(startFile); }
    }

    /* ---------- Auswahl: Kontoauszug oder Beleg, PDF oder Foto ---------- */
    const isMobile = () => { const ua = navigator.userAgent || ''; return !!(navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPod|iPad|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); };
    function resizeImage(file, max) {
        return new Promise((ok, no) => {
            const img = new Image(), u = URL.createObjectURL(file);
            img.onload = () => { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .82)); };
            img.onerror = () => { URL.revokeObjectURL(u); no(new Error('Das Foto konnte nicht gelesen werden.')); }; img.src = u;
        });
    }
    function pick(accept, capture) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; if (capture) i.setAttribute('capture', capture); i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { const f = i.files[0]; i.remove(); res(f || null); }; i.addEventListener('cancel', () => { i.remove(); res(null); }); i.click(); }); }
    const CATS = [[/adobe|creative cloud/i, 'Adobe und Creative Tools'], [/hosting|hetzner|server|strato|ionos/i, 'Hosting'], [/domain/i, 'Domains'], [/telekom|a1 |magenta|drei|internet|mobilfunk|telefon/i, 'Telefon und Internet'], [/versicherung/i, 'Versicherungen'], [/steuerberat/i, 'Steuerberatung'], [/google ads|facebook|meta ads|werbung/i, 'Werbung und Marketing'], [/software|lizenz|subscription|abo/i, 'Software']];
    function guessInvoice(lines) {
        const all = lines.join('\n'), g = { vendor: '', number: '', date: '', gross: '', vat: 20, category: '' };
        g.vendor = (lines.find(l => l.length > 2 && !/^(rechnung|invoice|seite|datum|\d)/i.test(l)) || '').slice(0, 80);
        const num = all.match(/(?:rechnungs?-?\s?(?:nr|nummer)|invoice\s?(?:no|number|#)|beleg-?\s?nr|re-?nr)\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i); if (num) g.number = num[1].replace(/[.,]$/, '');
        const dl = lines.find(l => /(rechnungsdatum|datum|date)/i.test(l) && parseDate((l.match(/\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}/) || [])[0])); g.date = dl ? parseDate(dl.match(/\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}/)[0]) : parseDate((all.match(/\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}/) || [])[0]) || '';
        const amt = l => [...l.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})(?!\d)/g)].map(m => parseAmount(m[1])).filter(n => !isNaN(n));
        const keyed = lines.filter(l => /(gesamt|summe|total|brutto|zu zahlen|endbetrag|rechnungsbetrag|amount due|zahlbetrag)/i.test(l) && !/netto|net\b|ust|mwst/i.test(l.replace(/brutto/i, ''))).flatMap(amt);
        const best = keyed.length ? keyed[keyed.length - 1] : Math.max(0, ...lines.flatMap(amt)); if (best > 0) g.gross = (best / 100).toFixed(2);
        const v = all.match(/(\d{1,2}(?:,\d)?)\s?%\s?(?:ust|mwst|umsatzsteuer)|(?:ust|mwst|umsatzsteuer)[^\d]{0,12}(\d{1,2})\s?%/i); if (v) { const r = parseFloat((v[1] || v[2]).replace(',', '.')); if ([0, 10, 13, 20].includes(r)) g.vat = r; }
        const c = CATS.find(x => x[0].test(all)); if (c) g.category = c[1];
        return g;
    }
    function receiptForm(g, file, done) {
        const bk = NX.bookkeeping, cats = bk.categories(), isImg = /^data:image/.test(file.data || '');
        const m = NX.modal('Beleg prüfen und speichern', `<div class="nx-bi-rcpt">${isImg ? '<img alt="Beleg" src="' + file.data + '" style="max-width:100%;max-height:240px;border-radius:10px;border:1px solid rgba(180,120,255,.3)">' : '<p class="mut">📄 ' + esc(file.name) + '</p>'}</div>${g._auto ? '<p class="mut">Die Angaben wurden aus dem Beleg gelesen. Bitte prüfen.</p>' : '<p class="mut">Bitte die Angaben vom Beleg eintragen. Das Foto wird als Beleg gespeichert.</p>'}
<form novalidate><div class="row"><div class="field"><label for="rv">Lieferant</label><input id="rv" name="vendor" value="${esc(g.vendor)}"></div><div class="field"><label for="rn">Rechnungsnummer</label><input id="rn" name="number" value="${esc(g.number)}"></div></div>
<div class="row"><div class="field"><label for="rd">Datum</label><input id="rd" name="date" type="date" value="${esc(g.date || new Date().toISOString().slice(0, 10))}"></div><div class="field"><label for="rg">Bruttobetrag (€)</label><input id="rg" name="gross" inputmode="decimal" value="${esc(g.gross)}"></div></div>
<div class="row"><div class="field"><label for="rc">Kategorie</label><select id="rc" name="category">${cats.map(c => `<option${c === g.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div class="field"><label for="rt">USt-Satz</label><select id="rt" name="vat">${[20, 10, 13, 0].map(v => `<option value="${v}"${v === g.vat ? ' selected' : ''}>${v} %</option>`).join('')}</select></div></div>
<p class="err" id="re" role="alert"></p><div class="acts"><button class="btn" type="submit">Zur Prüfung speichern</button><button type="button" class="btn ghost" data-c>Abbrechen</button></div></form>`, { wide: true });
        m.querySelector('[data-c]').onclick = m.close;
        m.querySelector('form').onsubmit = e => {
            e.preventDefault(); const f = e.target, gross = parseAmount(f.gross.value), er = m.querySelector('#re');
            if (!f.vendor.value.trim()) return er.textContent = 'Bitte den Lieferanten eintragen.';
            if (!f.date.value) return er.textContent = 'Bitte das Datum eintragen.';
            if (isNaN(gross) || gross <= 0) return er.textContent = 'Bitte einen gültigen Bruttobetrag eintragen.';
            bk.addExpense({ vendor: f.vendor.value.trim(), number: f.number.value.trim(), date: f.date.value, gross, vat: Number(f.vat.value), category: f.category.value, receiptName: file.name, receiptType: file.type, receiptData: file.data });
            m.close(); NX.toast('Beleg gespeichert. Bitte prüfen und freigeben.'); done && done();
        };
    }
    function photoStatement(dataUrl, done) {
        const bk = NX.bookkeeping, row = () => `<tr><td><input type="date" data-k="date" aria-label="Datum"></td><td><input data-k="text" aria-label="Beschreibung" placeholder="Beschreibung"></td><td><input data-k="amt" inputmode="decimal" aria-label="Betrag" placeholder="0,00" size="8"></td><td><select data-k="dir" aria-label="Art"><option value="in">Einnahme</option><option value="out" selected>Ausgabe</option></select></td></tr>`;
        const m = NX.modal('Kontoauszug (Foto) übertragen', `<img alt="Kontoauszug" src="${dataUrl}" style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid rgba(180,120,255,.3)"><p class="mut">Fotos können nicht automatisch gelesen werden. Trage die Buchungen vom Foto hier ein; das Foto wird mitgespeichert.</p><div class="table-wrap"><table><tr><th>Datum</th><th>Beschreibung</th><th>Betrag</th><th>Art</th></tr><tbody id="ps">${row().repeat(4)}</tbody></table></div><div class="acts"><button type="button" class="btn ghost" id="pa">+ Zeile</button><button type="button" class="btn" id="pg">Buchungen importieren</button></div><p class="err" id="pe" role="alert"></p>`, { wide: true });
        m.querySelector('#pa').onclick = () => m.querySelector('#ps').insertAdjacentHTML('beforeend', row());
        m.querySelector('#pg').onclick = () => {
            const rows = [...m.querySelectorAll('#ps tr')].map(r => { const g = k => r.querySelector('[data-k=' + k + ']').value, a = parseAmount(g('amt')); return { date: g('date'), description: g('text').trim() || 'Ohne Verwendungszweck', amount: isNaN(a) ? 0 : (g('dir') === 'out' ? -Math.abs(a) : Math.abs(a)) }; }).filter(r => r.date && r.amount);
            if (!rows.length) return m.querySelector('#pe').textContent = 'Bitte mindestens eine Buchung mit Datum und Betrag eintragen.';
            const res = bk.addBank(rows); bk.addReceipt({ name: 'Kontoauszug-Foto.jpg', type: 'image/jpeg', data: dataUrl, note: 'Kontoauszug (Foto), ' + res.added + ' Buchungen' });
            m.close(); NX.toast(res.added + ' Buchungen importiert' + (res.matched ? ', ' + res.matched + ' automatisch zugeordnet' : '') + '.'); done && done();
        };
    }
    async function receiptFromFile(f, done) {
        if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)) { NX.toast('Foto wird vorbereitet …'); try { receiptForm({ _auto: false, vat: 20, category: '' }, { name: f.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', data: await resizeImage(f, 1600) }, done); } catch (e) { NX.toast(e.message); } return; }
        if (f.size > 4 * 1024 * 1024) return NX.toast('Die PDF ist größer als 4 MB. Bitte verkleinern.');
        try {
            const buf = await f.arrayBuffer(), lines = await pdfLines(buf), data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
            receiptForm(Object.assign(guessInvoice(lines), { _auto: lines.length > 0 }), { name: f.name, type: 'application/pdf', data }, done);
        } catch (e) { NX.toast('Die PDF konnte nicht gelesen werden.'); }
    }
    async function statementFromPhoto(f, done) { try { photoStatement(await resizeImage(f, 1600), done); } catch (e) { NX.toast(e.message); } }
    function hub(o) {
        o = o || {}; const done = o.done, mobile = isMobile();
        const m = NX.modal('Importieren', '<div id="hb"></div>');
        const box = m.querySelector('#hb'), tile = (id, t, s) => `<button type="button" class="nx-ex-opt nx-hub-btn" data-id="${id}"><span><b>${t}</b><small>${s}</small></span></button>`;
        const stepKind = () => { box.innerHTML = '<p>Was möchtest du importieren?</p><div class="nx-ex-opts">' + tile('statement', 'Kontoauszug', 'Buchungen vom Firmenkonto einlesen') + tile('receipt', 'Rechnung oder Beleg', 'Vom Firmenkonto bezahlte Rechnung als Ausgabe erfassen') + '</div>'; box.onclick = e => { const b = e.target.closest('.nx-hub-btn'); if (b) stepHow(b.dataset.id); }; };
        const stepHow = kind => {
            const st = kind === 'statement';
            box.innerHTML = '<p>' + (st ? 'Kontoauszug' : 'Rechnung oder Beleg') + ' – wie möchtest du ihn importieren?</p><div class="nx-ex-opts">' + tile('pdf', 'PDF', 'PDF-Datei auswählen') + (mobile ? tile('photo', 'Foto', 'Foto aus der Galerie oder mit der Kamera') : '') + (st ? tile('table', 'Tabelle (CSV oder Excel)', 'Export aus dem Online-Banking') : '') + '</div>' + (o.kind ? '' : '<div class="acts"><button type="button" class="btn ghost" data-back>Zurück</button></div>');
            box.onclick = async e => {
                if (e.target.closest('[data-back]')) return stepKind();
                const b = e.target.closest('.nx-hub-btn'); if (!b) return;
                if (b.dataset.id === 'photo') return stepPhoto(kind);
                const f = await pick(b.dataset.id === 'table' ? '.csv,.txt,.xlsx' : 'application/pdf,.pdf'); if (!f) return;
                m.close(); if (st) statementFlow(done, f); else receiptFromFile(f, done);
            };
        };
        const stepPhoto = kind => {
            box.innerHTML = '<p>Foto – woher?</p><div class="nx-ex-opts">' + tile('gallery', 'Aus der Galerie', 'Vorhandenes Foto auswählen') + tile('camera', 'Foto aufnehmen', 'Kamera öffnen') + '</div><div class="acts"><button type="button" class="btn ghost" data-back>Zurück</button></div>';
            box.onclick = async e => {
                if (e.target.closest('[data-back]')) return stepHow(kind);
                const b = e.target.closest('.nx-hub-btn'); if (!b) return;
                const f = await pick('image/*', b.dataset.id === 'camera' ? 'environment' : ''); if (!f) return;
                m.close(); if (kind === 'statement') statementFromPhoto(f, done); else receiptFromFile(f, done);
            };
        };
        if (o.kind) stepHow(o.kind); else stepKind();
    }
    NX.bankImport = { open: done => hub({ done }), hub, statementFlow, parseDate, parseAmount, parseCSV, rowsFromGrid, detect, rowsFromPdf };
})();
