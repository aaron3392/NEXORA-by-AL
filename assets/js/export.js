/* NEXORA by AL – Export von Tabellen als CSV, Excel (.xlsx) oder PDF. Alles passiert im Browser. */
(function () {
    'use strict';
    const NX = window.NX, base = (document.currentScript && document.currentScript.src) || location.href;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const text = v => v == null ? '' : String(v);
    function save(blob, file) { const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = file; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    /* ---------- CSV ---------- */
    function csv(rows) { return new Blob(['﻿' + rows.map(r => r.map(v => '"' + text(v).replace(/"/g, '""') + '"').join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); }
    /* ---------- Excel ---------- */
    const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
    const xmlText = v => text(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function loadJSZip() { return new Promise((ok, no) => { if (window.JSZip) return ok(); const s = document.createElement('script'); s.src = new URL('../vendor/jszip/jszip.min.js', base).href; s.onload = ok; s.onerror = () => no(new Error('Bibliothek konnte nicht geladen werden.')); document.head.appendChild(s); }); }
    async function xlsx(rows, sheet) {
        await loadJSZip();
        const widths = rows[0].map((_, c) => Math.min(60, Math.max(8, ...rows.map(r => text(r[c]).length + 2))));
        const sd = rows.map((r, i) => '<row r="' + (i + 1) + '">' + r.map((v, c) => {
            const ref = colName(c) + (i + 1), st = i === 0 ? ' s="1"' : '';
            if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
            return '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xmlText(v) + '</t></is></c>';
        }).join('') + '</row>').join('');
        const z = new window.JSZip();
        z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
        z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
        z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xmlText(String(sheet || 'Daten').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>');
        z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
        z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>');
        z.file('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols><sheetData>' + sd + '</sheetData></worksheet>');
        return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
    }
    /* ---------- PDF (eigener, kleiner Schreiber: A4 quer, Helvetica) ---------- */
    const HW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
    const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };
    const code = ch => { const c = ch.charCodeAt(0); if (WIN[ch]) return WIN[ch]; if (c >= 32 && c < 127) return c; if (c >= 160 && c < 256) return c; return 63; };
    const width = (s, size, bold) => { let w = 0; for (const ch of s) { const c = code(ch); w += (c >= 32 && c < 127 ? HW[c - 32] : 556) * (bold ? 1.05 : 1); } return w * size / 1000; };
    function wrap(s, max, size, bold) {
        const out = []; s = text(s).replace(/\s+/g, ' ').trim(); if (!s) return [''];
        let line = '';
        s.split(' ').forEach(word => {
            while (width(word, size, bold) > max) { let k = word.length; while (k > 1 && width(word.slice(0, k), size, bold) > max) k--; if (line) { out.push(line); line = ''; } out.push(word.slice(0, k)); word = word.slice(k); }
            const t = line ? line + ' ' + word : word; if (width(t, size, bold) <= max) line = t; else { out.push(line); line = word; }
        });
        if (line) out.push(line); return out.length ? out : [''];
    }
    function pdf(rows, title) {
        const W = 842, H = 595, M = 36, size = 8.5, lead = 11.5, pad = 3, usable = W - 2 * M, cols = rows[0].length;
        const want = rows[0].map((_, c) => Math.min(260, Math.max(36, ...rows.slice(0, 200).map((r, i) => Math.min(width(text(r[c]), size, i === 0) + 2 * pad, 260)))));
        const sum = want.reduce((a, b) => a + b, 0), cw = want.map(w => w * Math.min(1, usable / sum) * (sum < usable ? usable / sum : 1));
        const pages = []; let cur = null, y = 0;
        const newPage = () => { cur = []; pages.push(cur); y = H - M - 26; cur.push({ t: title, x: M, y: H - M - 6, s: 12, b: true }); };
        const stamp = new Date().toLocaleDateString('de-AT');
        const drawRow = (r, head) => {
            const cells = r.map((v, c) => wrap(v, cw[c] - 2 * pad, size, head)), n = Math.max(...cells.map(c => c.length)), h = n * lead + 2 * pad;
            if (y - h < M + 14) { newPage(); drawRow(rows[0], true); }
            if (head) cur.push({ rect: [M, y - h, usable, h], fill: .9 });
            let x = M; cells.forEach((lines, c) => { lines.forEach((l, k) => cur.push({ t: l, x: x + pad, y: y - pad - size - k * lead + 1.5, s: size, b: head })); x += cw[c]; });
            cur.push({ line: [M, y - h, M + usable, y - h] }); y -= h;
        };
        newPage(); drawRow(rows[0], true); rows.slice(1).forEach(r => drawRow(r.concat(Array(Math.max(0, cols - r.length)).fill('')), false));
        const objs = [], add = s => { objs.push(s); return objs.length; };
        const bytes = s => { let o = ''; for (const ch of s) o += String.fromCharCode(code(ch)); return o; };
        const esc2 = s => bytes(s).replace(/[\\()]/g, m => '\\' + m);
        add('<< /Type /Catalog /Pages 2 0 R >>'); add(''); add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const kids = [];
        pages.forEach((p, pi) => {
            let c = '0.82 G 0.4 w\n'; p.forEach(o => {
                if (o.rect) c += o.fill + ' g ' + o.rect.map(n => n.toFixed(2)).join(' ') + ' re f 0 g\n';
                else if (o.line) c += o.line.map(n => n.toFixed(2)).join(' ').replace(/^(\S+ \S+) (\S+ \S+)$/, '$1 m $2 l S') + '\n';
                else c += 'BT /' + (o.b ? 'F2' : 'F1') + ' ' + o.s + ' Tf ' + o.x.toFixed(2) + ' ' + o.y.toFixed(2) + ' Td (' + esc2(o.t) + ') Tj ET\n';
            });
            c += 'BT /F1 7.5 Tf ' + M + ' 22 Td (' + esc2('NEXORA by AL · ' + stamp) + ') Tj ET\nBT /F1 7.5 Tf ' + (W - M - 50) + ' 22 Td (' + esc2('Seite ' + (pi + 1) + ' / ' + pages.length) + ') Tj ET\n';
            const cid = add('<< /Length ' + c.length + ' >>\nstream\n' + c + 'endstream'), pid = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cid + ' 0 R >>'); kids.push(pid + ' 0 R');
        });
        objs[1] = '<< /Type /Pages /Count ' + kids.length + ' /Kids [' + kids.join(' ') + '] >>';
        let out = '%PDF-1.4\n', offs = []; objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
        const x = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
        const u = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
        return new Blob([u], { type: 'application/pdf' });
    }
    /* ---------- Auswahl ---------- */
    const FORMATS = [['csv', 'CSV', 'Tabelle, z. B. für Import in andere Programme'], ['xlsx', 'Excel', 'Arbeitsmappe (.xlsx)'], ['pdf', 'PDF', 'Zum Lesen, Drucken und Weitergeben']];
    async function build(fmt, rows, name, title) { if (fmt === 'xlsx') return xlsx(rows, title); if (fmt === 'pdf') return pdf(rows, title); return csv(rows); }
    function exportData(name, rows, o) {
        o = o || {}; name = String(name || 'export').replace(/\.(csv|xlsx|pdf)$/i, ''); const title = o.title || name;
        if (!rows || !rows.length) { NX.toast('Keine Daten zum Exportieren.'); return Promise.resolve(); }
        let last = 'csv'; try { last = localStorage.getItem('nx_export_fmt') || 'csv'; } catch (e) { }
        return new Promise(res => {
            const m = NX.modal('Exportieren', `<p class="mut">${esc(title)} · ${Math.max(0, rows.length - 1)} Zeilen</p><div class="nx-ex-opts" role="radiogroup" aria-label="Dateiformat">${FORMATS.map(f => `<label class="nx-ex-opt"><input type="radio" name="fmt" value="${f[0]}"${f[0] === last ? ' checked' : ''}><span><b>${f[1]}</b><small>${f[2]}</small></span></label>`).join('')}</div><p class="err" id="nx-ex-err" role="alert"></p><div class="acts"><button type="button" class="btn" id="nx-ex-go">Herunterladen</button><button type="button" class="btn ghost" data-c>Abbrechen</button></div>`, { onClose: res });
            m.querySelector('[data-c]').onclick = m.close;
            m.querySelector('#nx-ex-go').onclick = async () => {
                const fmt = m.querySelector('input[name=fmt]:checked').value; try { localStorage.setItem('nx_export_fmt', fmt); } catch (e) { }
                try { save(await build(fmt, rows, name, title), name + '.' + fmt); NX.toast('Datei wird heruntergeladen.'); m.close(); } catch (e) { m.querySelector('#nx-ex-err').textContent = 'Export nicht möglich: ' + (e.message || e); }
            };
        });
    }
    NX.exportData = exportData; NX.exportBuild = build;
})();
