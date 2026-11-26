/* NEXORA by AL – Kundenportal: Bereich „Dateien“ (nur mit Server). Zeigt Dateien, die für den angemeldeten Kunden bereitgestellt wurden. */
(function () {
  'use strict';
  function esc(s) { return window.NX && NX.esc ? NX.esc(s) : String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  var fsize = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  function label(o) {
    var m = String(o).match(/^(\w+):(.+)$/); if (!m) return ''; var D = NX.db;
    if (m[1] === 'project') { var p = (D.projects || []).concat(D.projectArchive || []).find(function (x) { return x.id === m[2]; }); return 'Projekt: ' + (p ? p.name : ''); }
    if (m[1] === 'invoice') { var i = (D.invoices || []).find(function (x) { return x.id === m[2]; }); return 'Rechnung ' + (i ? i.number : ''); }
    if (m[1] === 'offer') { var a = (D.offers || []).find(function (x) { return x.id === m[2]; }); return 'Angebot ' + (a ? a.number : ''); }
    return 'Meine Unterlagen';
  }
  function render() {
    var pc = document.getElementById('pc'); if (!pc) return;
    pc.innerHTML = '<h1>Dateien</h1><section class="card"><p class="mut">Hier findest du Unterlagen, die wir für dich bereitgestellt haben.</p><div class="tw"><table><thead><tr><th scope="col">Datei</th><th scope="col">Zu</th><th scope="col">Größe</th><th scope="col">Datum</th><th scope="col"></th></tr></thead><tbody></tbody></table></div><p class="mut nx-pf-none" hidden>Noch keine Dateien vorhanden.</p></section>';
    fetch('/api/files', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : { files: [] }; }).then(function (j) {
      var l = j.files || [], tb = pc.querySelector('tbody');
      tb.innerHTML = l.map(function (f) { return '<tr><td>' + esc(f.name) + '</td><td>' + esc(label(f.owner)) + '</td><td>' + fsize(f.size) + '</td><td>' + esc(NX.date(String(f.created_at).slice(0, 10))) + '</td><td><a class="btn ghost sm" href="/api/files/' + esc(f.id) + '">Herunterladen</a></td></tr>'; }).join('');
      pc.querySelector('.tw').hidden = !l.length; pc.querySelector('.nx-pf-none').hidden = !!l.length;
    });
  }
  function mount() {
    var side = document.querySelector('.side'); if (!side || side.querySelector('[data-nxf]')) return;
    if (!window.NX || !NX.backend || !NX.backend.on || NX.backend.role !== 'customer') return;
    var out = side.querySelector('#out'), b = document.createElement('button'); b.type = 'button'; b.dataset.nxf = '1'; b.textContent = 'Dateien';
    side.insertBefore(b, out);
    side.addEventListener('click', function (e) { var o = e.target.closest('button'); if (o && o !== b) b.classList.remove('on'); }, true);
    b.addEventListener('click', function (e) { e.stopPropagation(); side.querySelectorAll('button[data-v]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); render(); });
  }
  function start() { mount(); new MutationObserver(mount).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
