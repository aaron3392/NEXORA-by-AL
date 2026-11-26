/* NEXORA by AL – Admin-Zusatzfunktionen (nur Anzeige und Navigation, keine Datenänderung):
   • Dashboard: "Handlungsbedarf", Schnellaktionen
   • Automatisches Backup täglich 05:00 und 19:00 (Menü „Backup“), ohne Server
   • Kalender (Woche/Monat) im Stil von Outlook/Teams
   • Listen: Status-Chips über der Tabelle (bedienen den vorhandenen Status-Filter)
   Neue Speicherung nur für das Auto-Backup: IndexedDB "nexora-backup" und localStorage "nexora_auto_backup_meta". */
(function () {
  'use strict';
  var NX = window.NX; if (!NX || NX.extrasLoaded) return;
  NX.extrasLoaded = true;
  var pending = null;
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorieren */ } }
  };
  var esc = function (s) { return NX.esc ? NX.esc(String(s)) : String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var go = function (view, sel, q) { pending = (sel || q) ? { view: view, sel: sel, q: q } : null; if (location.hash.slice(1) === view) { if (NX.refresh) NX.refresh(); } else location.hash = view; };

  function todo() {
    var D = NX.db, items = [], today = NX.today();
    var n = (D.inquiries || []).filter(function (i) { return i.status === 'Neu'; }).length;
    if (n) items.push({ k: 'info', t: n + (n === 1 ? ' neue Anfrage' : ' neue Anfragen'), v: 'anfragen' });
    var over = (D.invoices || []).filter(function (i) { return NX.invStatus(i) === 'Überfällig'; });
    if (over.length) items.push({ k: 'warn', t: over.length + (over.length === 1 ? ' überfällige Rechnung' : ' überfällige Rechnungen') + ' (' + NX.eur(over.reduce(function (s, i) { return s + NX.open(i); }, 0)) + ' offen)', v: 'verrechnung-rechnungen' });
    var drafts = (D.invoices || []).filter(function (i) { return i.draft; }).length;
    if (drafts) items.push({ k: 'info', t: drafts + (drafts === 1 ? ' Rechnungsentwurf wartet' : ' Rechnungsentwürfe warten') + ' auf Fertigstellung', v: 'verrechnung-rechnungen' });
    var soon = (D.offers || []).filter(function (o) { var s = NX.offStatus(o); return s === 'Abgelaufen' || (s === 'Versendet' && o.valid && o.valid <= NX.addDays(today, 7)); }).length;
    if (soon) items.push({ k: 'warn', t: soon + (soon === 1 ? ' Angebot läuft ab oder ist abgelaufen' : ' Angebote laufen ab oder sind abgelaufen'), v: 'verrechnung-angebote' });
    var due = (D.subscriptions || []).filter(function (s) { return s.status === 'Aktiv' && s.nextDate && s.nextDate <= today; }).length;
    if (due) items.push({ k: 'info', t: due + (due === 1 ? ' Monatsrechnung ist fällig' : ' Monatsrechnungen sind fällig'), v: 'verrechnung-vertraege' });
    var exp = NX.accounts ? NX.accounts.archived().filter(function (u) { return NX.accounts.daysLeft(u) <= 7; }).length : 0;
    if (exp) items.push({ k: 'warn', t: exp + (exp === 1 ? ' archiviertes Konto wird' : ' archivierte Konten werden') + ' in höchstens 7 Tagen endgültig gelöscht', v: 'user' });
    return items;
  }

  function dashboard(c) {
    var h1 = c.querySelector('h1'); if (!h1 || c.querySelector('.nx-ax')) return;
    var list = todo();
    var html = '<div class="nx-ax">' +
      '<div class="nx-ax-row"><section class="card nx-ax-todo"><h3>Handlungsbedarf</h3>' +
      (list.length ? '<ul>' + list.map(function (i) { return '<li class="' + i.k + '"><button type="button" data-ax-go="' + i.v + '"><i aria-hidden="true"></i><span>' + esc(i.t) + '</span><b aria-hidden="true">›</b></button></li>'; }).join('') + '</ul>' : '<p class="nx-ax-ok">Alles erledigt – aktuell gibt es nichts, das Ihre Aufmerksamkeit braucht.</p>') +
      '</section><section class="card nx-ax-quick"><h3>Schnellaktionen</h3><div>' +
      '<button type="button" class="btn" data-ax-go="verrechnung-rechnungen" data-ax-add>+ Neue Rechnung</button>' +
      '<button type="button" class="btn ghost" data-ax-go="verrechnung-angebote" data-ax-add>+ Neues Angebot</button>' +
      '<button type="button" class="btn ghost" data-ax-go="projekte" data-ax-add>+ Neues Projekt</button>' +
      '<button type="button" class="btn ghost" data-ax-go="zeit-eintraege" data-ax-add>+ Zeit erfassen</button>' +
      '</div></section></div></div>';
    var anchor = c.querySelector('p.mut') || h1;
    anchor.insertAdjacentHTML('afterend', html);
    c.querySelector('.nx-ax').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ax-go]');
      if (b) { go(b.dataset.axGo, b.hasAttribute('data-ax-add') ? '#add' : null); return; }
    });
  }

  function chips(c) {
    var sel = c.querySelector('.bar #f'); if (!sel || c.querySelector('.nx-ax-chips')) return;
    var wrap = document.createElement('div'); wrap.className = 'nx-ax-chips'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Schnellfilter nach Status');
    var opts = Array.prototype.map.call(sel.options, function (o) { return { v: o.value, t: o.value ? o.textContent : 'Alle' }; });
    wrap.innerHTML = opts.map(function (o) { return '<button type="button" class="nx-ax-chip" data-v="' + esc(o.v) + '" data-s="' + esc(o.t) + '">' + esc(o.t) + '</button>'; }).join('');
    var mark = function () { Array.prototype.forEach.call(wrap.children, function (b) { var on = b.dataset.v === sel.value; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); };
    wrap.onclick = function (e) {
      var b = e.target.closest('.nx-ax-chip'); if (!b) return;
      sel.value = b.dataset.v; sel.dispatchEvent(new Event('change', { bubbles: true })); mark();
    };
    sel.addEventListener('change', mark);
    c.querySelector('.bar').insertAdjacentElement('afterend', wrap); mark();
  }


  /* ---------- Globale Suche im Kopf + Tastaturkürzel ---------- */
  var SEARCH_VIEWS = { anfragen: 1, projekte: 1, 'verrechnung-rechnungen': 1, 'verrechnung-angebote': 1, user: 1 };
  function searchIndex() {
    var D = NX.db, out = [];
    (D.inquiries || []).forEach(function (i) { out.push({ g: 'Anfragen', t: i.subject + ' – ' + i.first + ' ' + i.last, s: [i.subject, i.first, i.last, i.email, i.id].join(' '), v: 'anfragen', q: i.subject }); });
    (D.projects || []).forEach(function (p) { out.push({ g: 'Projekte', t: p.name, s: [p.name, p.id, NX.custName(p.customerId)].join(' '), v: 'projekte', q: p.name }); });
    (D.projectArchive || []).forEach(function (p) { out.push({ g: 'Archiv', t: p.name + ' (archiviert)', s: [p.name, p.id, p.orderNumber, NX.custName(p.customerId)].join(' '), v: 'projekte', q: p.name }); });
    (D.invoices || []).forEach(function (i) { out.push({ g: 'Rechnungen', t: (i.number || 'Entwurf') + ' – ' + NX.custName(i.customerId), s: [i.number, NX.custName(i.customerId)].join(' '), v: 'verrechnung-rechnungen', q: i.number || '' }); });
    (D.offers || []).forEach(function (o) { out.push({ g: 'Angebote', t: o.number + ' – ' + NX.custName(o.customerId), s: [o.number, NX.custName(o.customerId)].join(' '), v: 'verrechnung-angebote', q: o.number }); });
    (D.customers || []).forEach(function (c) { out.push({ g: 'Kunden', t: c.first + ' ' + c.last + ' (' + c.email + ')', s: [c.first, c.last, c.email, c.id].join(' '), v: 'user', q: c.first + ' ' + c.last }); });
    return out;
  }
  /* Bei kleinen Bildschirmen steht die Suche oben im ausklappbaren Menü (über „Dashboard“), sonst im Header neben dem Titel */
  function placeSearch() {
    var box = document.querySelector('.nx-ax-search'); if (!box) return;
    var side = document.querySelector('.side'), hb = document.querySelector('#hdr .hb'), small = window.innerWidth <= 900;
    if (small && side) { if (box.parentNode !== side || side.firstChild !== box) side.insertBefore(box, side.firstChild); box.classList.add('in-side'); }
    else if (!small && hb) { if (box.parentNode !== hb) { var t = hb.querySelector('.htitle'); if (t) t.insertAdjacentElement('afterend', box); else hb.insertBefore(box, hb.children[1] || null); } box.classList.remove('in-side'); }
  }
  window.addEventListener('resize', placeSearch);
  function mountSearch() {
    var hb = document.querySelector('#hdr .hb'); if (!hb || document.querySelector('.nx-ax-search') || !NX.db) return;
    var box = document.createElement('div'); box.className = 'nx-ax-search';
    box.innerHTML = '<input type="search" placeholder="Suchen …" title="Taste / springt ins Suchfeld" aria-label="Kunden, Rechnungen, Projekte durchsuchen" autocomplete="off"><div class="nx-ax-res" role="listbox" hidden></div>';
    var title = hb.querySelector('.htitle'); if (title) title.insertAdjacentElement('afterend', box); else hb.insertBefore(box, hb.children[1] || null);
    var inp = box.querySelector('input'), res = box.querySelector('.nx-ax-res'), items = [];
    var close = function () { res.hidden = true; };
    var draw = function () {
      var q = inp.value.trim().toLowerCase(); if (q.length < 2) { close(); return; }
      var hits = searchIndex().filter(function (x) { return x.s.toLowerCase().indexOf(q) > -1; }).slice(0, 12);
      if (!hits.length) { res.innerHTML = '<p class="nx-ax-none">Keine Treffer.</p>'; res.hidden = false; items = []; return; }
      var g = '', html = '';
      hits.forEach(function (h, i) { if (h.g !== g) { g = h.g; html += '<h4>' + esc(g) + '</h4>'; } html += '<button type="button" role="option" data-i="' + i + '">' + esc(h.t) + '</button>'; });
      items = hits; res.innerHTML = html; res.hidden = false;
    };
    inp.addEventListener('input', draw);
    inp.addEventListener('focus', draw);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); inp.blur(); }
      if (e.key === 'Enter' && items[0]) { e.preventDefault(); pick(0); }
      if (e.key === 'ArrowDown') { var b = res.querySelector('button'); if (b) { e.preventDefault(); b.focus(); } }
    });
    res.addEventListener('keydown', function (e) {
      var b = document.activeElement; if (!b || b.tagName !== 'BUTTON') return;
      if (e.key === 'ArrowDown' && b.nextElementSibling) { e.preventDefault(); var n = b.nextElementSibling; if (n.tagName !== 'BUTTON') n = n.nextElementSibling; if (n) n.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); var p = b.previousElementSibling; if (p && p.tagName !== 'BUTTON') p = p.previousElementSibling; (p || inp).focus(); }
      if (e.key === 'Escape') { close(); inp.focus(); }
    });
    var pick = function (i) { var h = items[i]; if (!h) return; close(); inp.value = ''; go(h.v, null, h.q); };
    res.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
  }
  var origMount = mountSearch; mountSearch = function () { origMount(); placeSearch(); };
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (typing || document.querySelector('.ov')) return;
    if (e.key === '/') { var i = document.querySelector('.nx-ax-search input'); if (i) { e.preventDefault(); i.focus(); } }
    else if (e.key === 'n' || e.key === 'N') { var a = document.querySelector('#cnt #add'); if (a) { e.preventDefault(); a.click(); } }
    else if (e.key === '?') { if (NX.toast) NX.toast('Tasten: / Suche · N Neu anlegen · Esc schließt'); }
  });


  /* ---------- Userverwaltung: Archiv (30 Tage bis zur endgültigen Löschung) ---------- */
  function archivePanel(c) {
    if (!NX.accounts) return;
    var old = c.querySelector('.nx-ax-arch'); if (old) old.remove();
    var list = NX.accounts.archived(); if (!list.length) return;
    var box = document.createElement('section'); box.className = 'card nx-ax-arch';
    box.innerHTML = '<h3>Archiv (' + list.length + ')</h3><p class="mut">Archivierte Konten sind deaktiviert. Nach 30 Tagen werden sie automatisch endgültig gelöscht; bis dahin lassen sie sich wiederherstellen. Geschäftsdaten bleiben erhalten.</p><ul>' +
      list.map(function (u) {
        var d = NX.accounts.daysLeft(u), by = u.archivedBy || 'Kunde';
        return '<li><div><strong>' + esc(u.first + ' ' + u.last) + '</strong> <span class="mut">' + esc(u.email) + '</span><br><small class="mut">Archiviert von: ' + esc(by) + (u.archivedAt || u.deletedAt ? ' am ' + esc(NX.date(new Date(u.archivedAt || u.deletedAt).toISOString().slice(0, 10))) : '') + ' · endgültige Löschung ' + (u.restoreUntil ? 'am ' + esc(NX.date(new Date(u.restoreUntil).toISOString().slice(0, 10))) + ' (in ' + d + (d === 1 ? ' Tag' : ' Tagen') + ')' : 'offen') + '</small></div><button type="button" class="btn ghost sm" data-ax-restore="' + esc(u.id) + '">Wiederherstellen</button></li>';
      }).join('') + '</ul>';
    c.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ax-restore]'); if (!b) return;
      var u = NX.db.customers.find(function (x) { return x.id === b.dataset.axRestore; }); if (!u) return;
      NX.confirm('Konto von ' + u.first + ' ' + u.last + ' wiederherstellen?', 'Wiederherstellen').then(function (yes) {
        if (!yes) return;
        NX.accounts.restore(u); NX.log('Benutzer aus dem Archiv wiederhergestellt: ' + u.id); NX.save();
        NX.toast('Konto wiederhergestellt.'); if (NX.refresh) NX.refresh();
      });
    });
  }


  /* ---------- Projekte: Archiv (30 Tage nach Abschluss automatisch) ---------- */
  function orderArchivePanel(c) {
    if (!NX.orders) return;
    var old = c.querySelector('.nx-ax-orders'); if (old) old.remove();
    var list = NX.orders.archived(); if (!list.length) return;
    var box = document.createElement('section'); box.className = 'card nx-ax-orders';
    var qi = c.querySelector('#q');
    function rows() {
      var q = qi ? qi.value.trim().toLowerCase() : '';
      var f = list.filter(function (p) { return !q || [p.name, p.id, p.orderNumber, NX.custName(p.customerId), p.cat].join(' ').toLowerCase().indexOf(q) > -1; });
      return f.length ? '<div class="tw"><table><thead><tr><th scope="col">Auftrag</th><th scope="col">Projekt</th><th scope="col">Kunde</th><th scope="col">Abgeschlossen</th><th scope="col">Archiviert</th><th scope="col">Preis</th></tr></thead><tbody>' + f.map(function (p) {
        return '<tr class="click" data-ax-ord="' + esc(p.id) + '" tabindex="0"><td>' + esc(p.orderNumber || p.id) + '</td><td>' + esc(p.name) + '</td><td>' + esc(NX.custName(p.customerId)) + '</td><td>' + NX.date(p.doneAt) + '</td><td>' + NX.date(p.archivedAt) + '</td><td>' + NX.eur(p.price) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="mut">Kein archivierter Auftrag gefunden.</p>';
    }
    function draw() { box.innerHTML = '<h3>Archiv (' + list.length + ')</h3>' + rows(); }
    draw(); c.appendChild(box);
    if (qi) qi.addEventListener('input', draw);
    function open(id) {
      var p = list.find(function (x) { return x.id === id; }); if (!p) return;
      var D = NX.db, offers = (D.offers || []).filter(function (o) { return o.projectId === p.id; }).map(function (o) { return esc(o.number); }).join(', ') || '–';
      var invs = (D.invoices || []).filter(function (o) { return o.projectId === p.id; }).map(function (o) { return esc(o.number || 'Entwurf'); }).join(', ') || '–';
      var m = NX.modal('Archivierter Auftrag ' + (p.orderNumber || p.id), '<dl class="nx-ax-dl"><dt>Projekt</dt><dd>' + esc(p.name) + '</dd><dt>Kunde</dt><dd>' + esc(NX.custName(p.customerId)) + '</dd><dt>Kategorie</dt><dd>' + esc(p.cat || '–') + '</dd><dt>Beschreibung</dt><dd>' + esc(p.desc || '–') + '</dd><dt>Zeitraum</dt><dd>' + (p.end ? NX.date(p.start) + ' – ' + NX.date(p.end) : 'ab ' + NX.date(p.start)) + '</dd><dt>Abgeschlossen am</dt><dd>' + NX.date(p.doneAt) + '</dd><dt>Archiviert am</dt><dd>' + NX.date(p.archivedAt) + '</dd><dt>Preis</dt><dd>' + NX.eur(p.price) + '</dd><dt>Angebote</dt><dd>' + offers + '</dd><dt>Rechnungen</dt><dd>' + invs + '</dd><dt>Notizen</dt><dd>' + esc(p.notes || '–') + '</dd></dl><div class="acts"><button type="button" class="btn ghost" data-ax-back>Wiederherstellen</button></div>');
      var b = m.body.querySelector('[data-ax-back]');
      if (b) b.onclick = function () {
        NX.confirm('Auftrag „' + p.name + '“ wiederherstellen? Er erscheint wieder unter Projekten (Status „Laufend“).', 'Wiederherstellen').then(function (yes) {
          if (!yes) return;
          NX.orders.restore(p.id); NX.log('Auftrag aus dem Archiv wiederhergestellt: ' + p.name); NX.toast('Auftrag wiederhergestellt.'); m.close(); if (NX.refresh) NX.refresh();
        });
      };
    }
    box.addEventListener('click', function (e) { var r = e.target.closest('[data-ax-ord]'); if (r) open(r.dataset.axOrd); });
    box.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; var r = e.target.closest('[data-ax-ord]'); if (r) open(r.dataset.axOrd); });
  }
  /* Abschlussdatum setzen und fällige Aufträge automatisch archivieren (alle 30 s, bei Fokus, beim Start) */
  function syncOrders() {
    try {
      if (NX.db && NX.orders && NX.orders.sync()) {
        NX.save();
        var c = document.getElementById('cnt');
        if (c && c.querySelector('.nx-ax-orders, #q') && /projekte/.test(location.hash) && NX.refresh) NX.refresh();
      }
    } catch (e) { }
  }
  /* Tageswechsel (Seite über Mitternacht offen): Kalender springt auf den neuen Tag, Ansicht wird neu gezeichnet,
     Archiv/Erinnerungen werden sofort geprüft. Offene Fenster oder Eingaben werden nicht gestört. */
  var dayPending = false;
  function dayRefresh() {
    var a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== 'q';
    if (document.querySelector('.ov') || typing) return false;
    if (NX.refresh) { try { NX.refresh(); } catch (e) { } }
    return true;
  }
  document.addEventListener('nx:daychange', function (e) {
    var d = e.detail || {};
    if (cal.day === d.from) cal.day = d.to;
    syncOrders();
    try { if (typeof runReminders === 'function') runReminders(); } catch (x) { }
    dayPending = !dayRefresh();
  });
  setInterval(function () { if (dayPending && dayRefresh()) dayPending = false; }, 4000);
  /* Sicherheitsnetz: nie seitlich scrollen */
  try { document.documentElement.style.overflowX = 'clip'; } catch (e) { }
  setTimeout(syncOrders, 1200); setInterval(syncOrders, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) syncOrders(); });
  window.addEventListener('focus', syncOrders);

  /* ---------- Dashboard: Kurvendiagramme mit Zeitraum-Auswahl ---------- */
  var RANGES = [['week', 'Letzte Woche'], ['month', 'Letzter Monat'], ['half', 'Letzte 6 Monate'], ['year', 'Letztes Jahr'], ['all', 'Gesamte Zeit']];
  var MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var MONL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var rangeKey = 'nexora_chart_range';
  function getRange(id) { try { var m = JSON.parse(ls.get(rangeKey) || '{}'); return m[id] || 'half'; } catch (e) { return 'half'; } }
  function setRange(id, v) { try { var m = JSON.parse(ls.get(rangeKey) || '{}'); m[id] = v; ls.set(rangeKey, JSON.stringify(m)); } catch (e) { /* ignorieren */ } }

  /* Zeitraum in Klassen ("Buckets") einteilen; day-Maps haben Schlüssel JJJJ-MM-TT */
  function buckets(range, earliest) {
    var today = NX.today(), out = [], i, d;
    if (range === 'week' || range === 'month') {
      var n = range === 'week' ? 7 : 30;
      for (i = n - 1; i >= 0; i--) { d = NX.addDays(today, -i); var dt = new Date(d + 'T12:00:00'); out.push({ test: (function (k) { return function (x) { return x === k; }; })(d), label: p2(dt.getDate()) + '.' + p2(dt.getMonth() + 1) + '.', tip: WD[dt.getDay()] + ', ' + p2(dt.getDate()) + '.' + p2(dt.getMonth() + 1) + '.' + dt.getFullYear() }); }
      return out;
    }
    var now = new Date(today + 'T12:00:00'), y = now.getFullYear(), m = now.getMonth(), count;
    if (range === 'half') count = 6; else if (range === 'year') count = 12;
    else { var e = earliest ? new Date(earliest + 'T12:00:00') : now; count = Math.max(6, (y - e.getFullYear()) * 12 + (m - e.getMonth()) + 1); }
    for (i = count - 1; i >= 0; i--) {
      var mm = m - i, yy = y + Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12;
      var key = yy + '-' + p2(mm + 1);
      out.push({ test: (function (k) { return function (x) { return x.slice(0, 7) === k; }; })(key), label: MON[mm] + (count > 12 || range === 'year' ? ' ' + String(yy).slice(2) : ''), tip: MONL[mm] + ' ' + yy });
    }
    return out;
  }
  function sumMap(map, bs) { return bs.map(function (b) { var t = 0; Object.keys(map).forEach(function (k) { if (b.test(k)) t += map[k]; }); return t; }); }
  function minKey(maps) { var min = null; maps.forEach(function (m) { Object.keys(m).forEach(function (k) { if (!min || k < min) min = k; }); }); return min; }
  function niceMax(v, isMoney) { /* oberer Achsenwert; bei Zählwerten immer ganze Schritte (4 Teilstriche) */
    if (isMoney) {
      if (v <= 0) return 100000;
      var x = v / 100, pow = Math.pow(10, Math.floor(Math.log10(x))), f = x / pow;
      return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow * 100;
    }
    var q = Math.max(1, Math.ceil(v / 4)), pw = Math.pow(10, Math.floor(Math.log10(q))), ff = q / pw;
    return (ff <= 1 ? 1 : ff <= 2 ? 2 : ff <= 5 ? 5 : 10) * pw * 4;
  }
  function curve(pts) { /* monotone kubische Interpolation: glatte Kurve ohne Überschwingen */
    var n = pts.length; if (n < 2) return pts.length ? 'M' + pts[0][0] + ',' + pts[0][1] : '';
    var dx = [], dy = [], m = [], i;
    for (i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / dx[i]; }
    var t = [m[0]]; for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2; t[n - 1] = m[n - 2];
    for (i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; } var a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b; if (h > 9) { var k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) { var x1 = pts[i][0] + dx[i] / 3, x2 = pts[i + 1][0] - dx[i] / 3; d += ' C' + x1.toFixed(1) + ',' + (pts[i][1] + t[i] * dx[i] / 3).toFixed(1) + ' ' + x2.toFixed(1) + ',' + (pts[i + 1][1] - t[i + 1] * dx[i] / 3).toFixed(1) + ' ' + pts[i + 1][0].toFixed(1) + ',' + pts[i + 1][1].toFixed(1); }
    return d;
  }
  /* cfg: { id, title, money, series:[{key,name,color,map}], note, area } */
  function buildChart(host, cfg) {
    var card = document.createElement('section'); card.className = 'card nx-ax-chart';
    var rng = getRange(cfg.id), hidden = {}, uid = 'nxg' + cfg.id;
    card.innerHTML = '<div class="nx-ax-chead"><h3>' + esc(cfg.title) + '</h3><select class="nx-ax-rangesel" aria-label="Zeitraum wählen – ' + esc(cfg.title) + '">' +
      RANGES.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="nx-ax-legend"></div><div class="nx-ax-plot"></div>' + (cfg.note ? '<p class="nx-ax-note">' + esc(cfg.note) + '</p>' : '');
    host.appendChild(card);
    var sel = card.querySelector('.nx-ax-rangesel'), plot = card.querySelector('.nx-ax-plot'), legend = card.querySelector('.nx-ax-legend');
    var fmt = function (v) { return cfg.money ? NX.eur(v) : String(v); };
    function draw() {
      sel.value = rng;
      var bs = buckets(rng, minKey(cfg.series.map(function (x) { return x.map(); })));
      var data = cfg.series.map(function (sr) { var vals = sumMap(sr.map(), bs); return { sr: sr, vals: vals, total: vals.reduce(function (a, b) { return a + b; }, 0) }; });
      legend.innerHTML = data.map(function (d) { return '<button type="button" class="nx-ax-lg' + (hidden[d.sr.key] ? ' off' : '') + '" data-k="' + d.sr.key + '" aria-pressed="' + (!hidden[d.sr.key]) + '"><i style="background:' + d.sr.color + '"></i><span>' + esc(d.sr.name) + '</span><b>' + esc(fmt(d.total)) + '</b></button>'; }).join('');
      var vis = data.filter(function (d) { return !hidden[d.sr.key]; });
      var mx = Math.max.apply(null, [0].concat(vis.map(function (d) { return Math.max.apply(null, d.vals); })));
      var fit = card.closest('.nx-ax-dash') && window.innerWidth > 900 && plot.clientWidth > 200 && plot.clientHeight > 90; /* Desktop-Dashboard: Diagramm füllt den freien Platz */
      var top = niceMax(mx, cfg.money), W = fit ? Math.round(plot.clientWidth) : 560, H = fit ? Math.round(plot.clientHeight) : 250, L = cfg.money ? 64 : 34, R = 14, T = 14, B = 30, iw = W - L - R, ih = H - T - B, n = bs.length;
      var X = function (i) { return L + (n === 1 ? iw / 2 : i * iw / (n - 1)); }, Y = function (v) { return T + ih - (v / top) * ih; };
      var g = '', ticks = 4, i;
      for (i = 0; i <= ticks; i++) { var tv = top * i / ticks; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(tv).toFixed(1) + '" y2="' + Y(tv).toFixed(1) + '" class="nx-ax-grid"/><text x="' + (L - 8) + '" y="' + (Y(tv) + 4).toFixed(1) + '" text-anchor="end" class="nx-ax-tx">' + esc(cfg.money ? NX.eur(tv).replace(',00', '') : (Math.round(tv * 10) / 10)) + '</text>'; }
      var step = Math.max(1, Math.ceil(n / 7));
      for (i = 0; i < n; i++) { if (i % step === 0 || i === n - 1) { if (i === n - 1 || (n - 1 - i) >= step * 0.6) g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="nx-ax-tx">' + esc(bs[i].label) + '</text>'; } }
      var defs = '', paths = '';
      vis.forEach(function (d, si) {
        var pts = d.vals.map(function (v, k) { return [X(k), Y(v)]; }), path = curve(pts), gid = uid + si;
        if (cfg.area && vis.length === 1 && pts.length > 1) { defs += '<linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + d.sr.color + '" stop-opacity=".38"/><stop offset="1" stop-color="' + d.sr.color + '" stop-opacity="0"/></linearGradient>'; paths += '<path d="' + path + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + Y(0) + ' L' + pts[0][0].toFixed(1) + ',' + Y(0) + ' Z" fill="url(#' + gid + ')"/>'; }
        paths += '<path d="' + path + '" fill="none" stroke="' + d.sr.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="nx-ax-line"/>';
        if (n <= 31) pts.forEach(function (pt) { paths += '<circle cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="' + (n <= 12 ? 3.6 : 2.4) + '" fill="#0e0916" stroke="' + d.sr.color + '" stroke-width="2"/>'; });
      });
      var all0 = vis.every(function (d) { return d.total === 0; });
      plot.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.title + ': ' + data.map(function (d) { return d.sr.name + ' ' + fmt(d.total); }).join(', ') + ' – ' + (RANGES.filter(function (r) { return r[0] === rng; })[0][1])) + '"><defs>' + defs + '</defs>' + g + paths + '<line class="nx-ax-guide" y1="' + T + '" y2="' + (T + ih) + '" x1="0" x2="0" style="display:none"/><rect class="nx-ax-hit" x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="transparent"/></svg>' +
        (all0 ? '<p class="nx-ax-empty">Im gewählten Zeitraum gibt es noch keine Werte.</p>' : '') + '<div class="nx-ax-tip" hidden></div>';
      var svg = plot.querySelector('svg'), tip = plot.querySelector('.nx-ax-tip'), guide = plot.querySelector('.nx-ax-guide'), hit = plot.querySelector('.nx-ax-hit');
      var move = function (e) {
        var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, idx = Math.max(0, Math.min(n - 1, Math.round((px - L) / iw * (n - 1))));
        if (n === 1) idx = 0;
        guide.setAttribute('x1', X(idx)); guide.setAttribute('x2', X(idx)); guide.style.display = '';
        tip.innerHTML = '<strong>' + esc(bs[idx].tip) + '</strong>' + vis.map(function (d) { return '<div><i style="background:' + d.sr.color + '"></i>' + esc(d.sr.name) + ': <b>' + esc(fmt(d.vals[idx])) + '</b></div>'; }).join('');
        tip.hidden = false;
        var left = X(idx) / W * r.width; tip.style.left = Math.min(Math.max(left, 70), r.width - 70) + 'px';
      };
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', function () { tip.hidden = true; guide.style.display = 'none'; });
    }
    sel.addEventListener('change', function () { rng = sel.value; setRange(cfg.id, rng); draw(); });
    var lw = 0, lh = 0, tm = null; /* bei Größenänderung neu zeichnen */
    var resized = function () { if (!card.isConnected) return; clearTimeout(tm); tm = setTimeout(function () { if (Math.abs(plot.clientWidth - lw) > 2 || Math.abs(plot.clientHeight - lh) > 2) { lw = plot.clientWidth; lh = plot.clientHeight; draw(); } }, 80); };
    if (window.ResizeObserver) new ResizeObserver(resized).observe(plot); else window.addEventListener('resize', resized);
    legend.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var vis = cfg.series.filter(function (x) { return !hidden[x.key]; }).length; if (!hidden[b.dataset.k] && vis <= 1) return; hidden[b.dataset.k] = !hidden[b.dataset.k]; draw(); });
    draw();
  }
  function charts(c) {
    if (c.querySelector('.nx-ax-charts')) return;
    var D = NX.db, anchor = c.querySelector('.kp'); if (!anchor) return;
    var old = c.querySelector('.bars'); if (old && old.closest('.card')) old.closest('.card').remove(); /* alte Balkenansicht ersetzen */
    var host = document.createElement('div'); host.className = 'nx-ax-charts';
    anchor.insertAdjacentElement('afterend', host);
    buildChart(host, { id: 'umsatz', title: 'Umsatzübersicht', money: true, area: true, series: [{ key: 'umsatz', name: 'Umsatz (eingegangen)', color: '#b66bff', map: function () { var m = {}; (D.invoices || []).forEach(function (i) { (i.payments || []).forEach(function (pm) { if (pm.date) m[pm.date] = (m[pm.date] || 0) + pm.amount; }); }); return m; } }] });
    buildChart(host, { id: 'nutzer', title: 'Nutzer & Besucher', money: false, note: '',
      series: [
        { key: 'aufrufe', name: 'Aufrufe Startseite', color: '#38bdf8', map: function () { return NX.stats.read('visits'); } },
        { key: 'anmeldungen', name: 'Anmeldungen', color: '#fbbf24', map: function () { return NX.stats.read('logins'); } },
        { key: 'registrierungen', name: 'Neue Registrierungen', color: '#34d399', map: function () { var m = {}; (D.customers || []).forEach(function (u) { if (u.created) m[u.created] = (m[u.created] || 0) + 1; }); return m; } }
      ] });
  }

  /* Aktivitäten / Änderungen: nur 3 Einträge, der Rest im Popup */
  function actLists(c) {
    var D = NX.db, cards = c.querySelectorAll('.grid.g3 > .card');
    Array.prototype.forEach.call(cards, function (card) {
      var h = card.querySelector('h3'), t = h ? h.textContent.trim() : '', items = null;
      if (t === 'Aktuelle Aktivitäten') {
        card.classList.add('nx-ax-a1');
        items = [].concat((D.inquiries || []).map(function (i) { return { t: i.date, x: 'Anfrage: ' + i.subject + ' (' + i.first + ' ' + i.last + ')' }; }),
          (D.support || []).map(function (s) { return { t: s.date, x: 'Support: ' + s.subject }; }))
          .sort(function (a, b) { return String(b.t).localeCompare(String(a.t)); })
          .map(function (a) { return NX.date(a.t) + ' – ' + a.x; });
      } else if (t === 'Letzte Änderungen') {
        card.classList.add('nx-ax-a2');
        items = (D.activity || []).map(function (a) { return NX.dt(a.t) + ' – ' + a.text; });
      }
      if (!items || card.dataset.axAct) return;
      card.dataset.axAct = '1';
      var ul = card.querySelector('ul.list'); if (!ul) return;
      var li = function (x) { return '<li>' + esc(x) + '</li>'; };
      ul.innerHTML = items.length ? items.slice(0, 3).map(li).join('') : '<li>Keine Einträge.</li>';
      if (items.length > 3) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'nx-ax-more';
        more.textContent = '+ ' + (items.length - 3) + ' weitere';
        more.setAttribute('aria-label', (items.length - 3) + ' weitere Einträge anzeigen – ' + t);
        more.onclick = function () { NX.modal(t, '<ul class="list nx-ax-all">' + items.map(li).join('') + '</ul>'); };
        card.appendChild(more);
      }
    });
  }

  /* Handy: Menü als ausklappbare Seitenleiste (gleiche Struktur wie am Desktop) */
  function setMenu(open) { open = !!open; var sd = document.querySelector('.side'), sc = document.querySelector('.nx-ax-scrim'), b = document.querySelector('.nx-ax-burger'); if (sd) sd.classList.toggle('nx-ax-open', open); if (sc) sc.classList.toggle('on', open); if (b) b.setAttribute('aria-expanded', String(open)); document.body.style.overflow = ''; if (open) menuOpenedAt = Date.now(); }
  /* Menü (Burger) schließt sich, sobald die Seite gescrollt wird – auf jedem Gerät */
  var menuOpenedAt = 0;
  var menuIsOpen = function () { var sd = document.querySelector('.side'); return !!(sd && sd.classList.contains('nx-ax-open')); };
  window.addEventListener('scroll', function () { if (menuIsOpen() && Date.now() - menuOpenedAt > 350) setMenu(false); }, { passive: true });
  function mountBurger() {
    var hb = document.querySelector('#hdr .hb'); if (!hb || hb.querySelector('.nx-ax-burger') || !document.querySelector('.side')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'nx-ax-burger'; b.setAttribute('aria-label', 'Menü öffnen oder schließen'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span></span><span></span><span></span>';
    b.onclick = function () { setMenu(!(document.querySelector('.side') || document.body).classList.contains('nx-ax-open')); };
    hb.insertBefore(b, hb.firstChild);
    if (!document.querySelector('.nx-ax-scrim')) { var sc = document.createElement('div'); sc.className = 'nx-ax-scrim'; sc.onclick = function () { setMenu(false); }; ['wheel', 'touchmove'].forEach(function (ev) { sc.addEventListener(ev, function () { setMenu(false); }, { passive: true }); }); document.body.appendChild(sc); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) setMenu(false); });

  /* Kennzahlen: Beträge formatieren und automatisch auf die Kachelbreite skalieren */
  function fmtKpis(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.kpi b'), function (b) {
      if (!b.children.length) { var m = /^(-?[\d.]+)(,\d+)(\s|\u00a0)?€$/.exec(b.textContent.trim()); if (m) b.innerHTML = m[1] + '<em class="nx-ax-c">' + m[2] + '</em>' + (m[3] || ' ') + '<em class="nx-ax-e">€</em>'; }
      b.style.fontSize = ''; b.style.fontVariantNumeric = 'tabular-nums'; b.style.whiteSpace = 'nowrap'; b.style.overflow = 'hidden';
      var size = parseFloat(getComputedStyle(b).fontSize), avail = b.clientWidth;
      var cents = b.querySelector('.nx-ax-c'); if (cents) cents.style.display = '';
      while (avail > 0 && b.scrollWidth > avail && size > 11) { size -= 1; b.style.fontSize = size + 'px'; }
      if (avail > 0 && b.scrollWidth > avail && cents) { cents.style.display = 'none'; /* extrem lange Summen: Cent ausblenden */
        while (b.scrollWidth > avail && size > 9) { size -= 1; b.style.fontSize = size + 'px'; } }
    });
  }
  var fitTm = null;
  function scheduleFit() { clearTimeout(fitTm); fitTm = setTimeout(function () { var c = document.getElementById('cnt'); if (c) fmtKpis(c); }, 30); }
  (function () { var c = document.getElementById('cnt'); if (c && window.MutationObserver) new MutationObserver(scheduleFit).observe(c, { childList: true, subtree: true }); window.addEventListener('resize', scheduleFit); })();

  /* ===== Automatisches Backup (ohne Server) =====
     Termine: täglich 05:00 und 19:00 Uhr. Läuft, solange eine NEXORA-Admin-Seite im Browser geöffnet ist;
     ein verpasster Termin wird beim nächsten Öffnen nachgeholt. Das neue Backup wird zuerst gespeichert und geprüft,
     erst danach wird das vorherige gelöscht. Ablage: IndexedDB im Browser; optional zusätzlich als Datei in einem
     gewählten Ordner (nur Chrome/Edge, Ordner-Zugriff muss pro Browser-Sitzung bestätigt werden). */
  var AB_META = 'nexora_auto_backup_meta', AB_HOURS = [5, 19], abBusy = false, memDir = null;
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  function slotAt(base, dayOff, h) { return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOff, h, 0, 0, 0).getTime(); }
  function lastSlot(now) { var best = 0, b = new Date(now); for (var d = -1; d <= 0; d++) AB_HOURS.forEach(function (h) { var t = slotAt(b, d, h); if (t <= now && t > best) best = t; }); return best; }
  function nextSlot(now) { var best = Infinity, b = new Date(now); for (var d = 0; d <= 1; d++) AB_HOURS.forEach(function (h) { var t = slotAt(b, d, h); if (t > now && t < best) best = t; }); return best; }
  function abMeta() { try { return JSON.parse(ls.get(AB_META)) || null; } catch (e) { return null; } }
  function stamp(t) { var d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '_' + pad2(d.getHours()) + '-' + pad2(d.getMinutes()); }
  function fmtDT(t) { var d = new Date(t); return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' Uhr'; }

  function idb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB nicht verfügbar'));
      var r = indexedDB.open('nexora-backup', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('snap'); r.result.createObjectStore('cfg'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(db, store, mode, fn) {
    return new Promise(function (res, rej) {
      var t = db.transaction(store, mode), out = fn(t.objectStore(store));
      t.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
      t.onerror = t.onabort = function () { rej(t.error); };
    });
  }
  function payload(t) { return JSON.stringify({ exportedAt: new Date(t).toISOString(), app: 'NEXORA by AL', version: NX.db.v || 1, auto: true, data: NX.db }, null, 2); }

  async function dirState(db) {
    var h = memDir || await tx(db, 'cfg', 'readonly', function (s) { return s.get('dir'); });
    if (!h) return { handle: null, ok: false };
    var ok = false; try { ok = (await h.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { /* ignorieren */ }
    return { handle: h, ok: ok };
  }

  async function createBackup() {
    var now = Date.now(), text = payload(now), key = 'snap-' + now, db = await idb();
    /* 1) neues Backup speichern und prüfen */
    await tx(db, 'snap', 'readwrite', function (s) { return s.put({ t: now, text: text }, key); });
    var back = await tx(db, 'snap', 'readonly', function (s) { return s.get(key); });
    if (!back || back.text !== text) throw new Error('Backup konnte nicht geprüft werden');
    /* 2) optional Datei im gewählten Ordner */
    var meta = abMeta() || {}, file = null, folderNote = '', ds = await dirState(db);
    if (ds.handle && ds.ok) {
      try {
        var name = 'nexora-auto-backup-' + stamp(now) + '.json', fh = await ds.handle.getFileHandle(name, { create: true }), w = await fh.createWritable();
        await w.write(text); await w.close();
        var chk = await (await fh.getFile()).text();
        if (chk !== text) throw new Error('Datei-Prüfung fehlgeschlagen');
        file = name;
        if (meta.file && meta.file !== name) { try { await ds.handle.removeEntry(meta.file); } catch (e) { /* alte Datei fehlt bereits */ } }
      } catch (e) { folderNote = 'Datei im Ordner konnte nicht geschrieben werden.'; }
    } else if (ds.handle) folderNote = 'Ordner-Zugriff muss erneuert werden.';
    /* 3) erst jetzt das vorherige Backup löschen */
    var keys = await tx(db, 'snap', 'readonly', function (s) { return s.getAllKeys(); });
    await tx(db, 'snap', 'readwrite', function (s) { keys.forEach(function (k) { if (k !== key) s.delete(k); }); });
    db.close();
    ls.set(AB_META, JSON.stringify({ t: now, size: text.length, file: file || (ds.handle && !ds.ok ? meta.file || null : null), folder: !!ds.handle, folderNote: folderNote }));
    return { t: now, size: text.length, file: file };
  }

  function dueNow() { var m = abMeta(); return !m || m.t < lastSlot(Date.now()); }
  async function runIfDue() {
    if (abBusy || !NX.db || !dueNow()) return false;
    abBusy = true;
    try {
      var job = async function () { if (!dueNow()) return false; await createBackup(); return true; };
      var done = (navigator.locks && navigator.locks.request) ? await navigator.locks.request('nexora-auto-backup', { ifAvailable: true }, function (lock) { return lock ? job() : false; }) : await job();
      if (done) { document.dispatchEvent(new CustomEvent('nx:autobackup')); }
      return !!done;
    } catch (e) { return false; } finally { abBusy = false; }
  }
  NX.autoBackup = { run: runIfDue, force: createBackup, meta: abMeta, lastSlot: lastSlot, nextSlot: nextSlot };
  setTimeout(runIfDue, 1500);
  setInterval(runIfDue, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) runIfDue(); });
  window.addEventListener('focus', runIfDue);

  /* ---- Anzeige in Einstellungen ---- */
  async function backupPanel(c) {
    if (c.querySelector('.nx-ax-abk')) return;
    var form = c.querySelector('.nx-ax-manual'); if (!form) return;
    var sec = document.createElement('section'); sec.className = 'card formcard nx-ax-abk';
    form.insertAdjacentElement('afterend', sec);
    async function paint() {
      var m = abMeta(), canDir = typeof window.showDirectoryPicker === 'function', st = { handle: null, ok: false };
      try { var db = await idb(); st = await dirState(db); db.close(); } catch (e) { /* ignorieren */ }
      var folder = '';
      if (canDir) {
        folder = '<p>Backup-Ordner: ' +
          (st.handle ? '<b>' + esc(st.handle.name) + '</b> – ' + (st.ok ? 'Zugriff aktiv.' : '<b>Zugriff muss neu bestätigt werden.</b>') : 'keiner gewählt.') + '</p>' +
          '<div class="acts"><button type="button" class="btn ghost sm" data-abk="dir">' + (st.handle ? 'Ordner ändern' : 'Backup-Ordner wählen') + '</button>' +
          (st.handle && !st.ok ? '<button type="button" class="btn ghost sm" data-abk="perm">Zugriff erneuern</button>' : '') +
          (st.handle ? '<button type="button" class="btn ghost sm" data-abk="nodir">Ordner entfernen</button>' : '') + '</div>';
      } else folder = '';
      sec.innerHTML = '<h3>Automatisches Backup</h3>' +
        '<p class="nx-ax-abk-st">' + (m ? 'Letztes Backup: <b>' + fmtDT(m.t) + '</b> (' + Math.max(1, Math.round(m.size / 1024)) + ' KB' + (m.file ? ', Datei ' + esc(m.file) : '') + ')' : 'Noch kein Backup vorhanden – das erste wird gleich angelegt.') +
        '<br>Nächster Termin: <b>' + fmtDT(nextSlot(Date.now())) + '</b>' + (m && m.folderNote ? '<br><span class="nx-ax-abk-warn">' + esc(m.folderNote) + '</span>' : '') + '</p>' +
        '<div class="acts"><button type="button" class="btn ghost sm" data-abk="dl"' + (m ? '' : ' disabled') + '>Letztes Backup herunterladen</button>' +
        '<button type="button" class="btn ghost sm" data-abk="restore"' + (m ? '' : ' disabled') + '>Aus letztem Backup wiederherstellen</button></div>' + folder;
    }
    async function snap() { var db = await idb(), keys = await tx(db, 'snap', 'readonly', function (s) { return s.getAllKeys(); }), r = keys.length ? await tx(db, 'snap', 'readonly', function (s) { return s.get(keys[keys.length - 1]); }) : null; db.close(); return r; }
    sec.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-abk]'); if (!b) return; var a = b.dataset.abk;
      try {
        if (a === 'dl') {
          var r = await snap(); if (!r) return;
          var url = URL.createObjectURL(new Blob([r.text], { type: 'application/json;charset=utf-8' })), l = document.createElement('a');
          l.href = url; l.download = 'nexora-auto-backup-' + stamp(r.t) + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } else if (a === 'restore') {
          var s = await snap(); if (!s) return;
          if (!await NX.confirm('Alle aktuellen Daten werden durch das Backup vom ' + fmtDT(s.t) + ' ersetzt. Änderungen danach gehen verloren. Fortfahren?', 'Wiederherstellen')) return;
          var data = JSON.parse(s.text).data;
          if (!data || !Array.isArray(data.customers) || !data.settings || !data.auth) throw new Error('Das Backup ist unvollständig.');
          NX.db = data; NX.save(); NX.toast('Backup wiederhergestellt. Die Seite wird neu geladen.'); setTimeout(function () { location.reload(); }, 600);
        } else if (a === 'dir') {
          var h = await window.showDirectoryPicker({ mode: 'readwrite' }), db = await idb();
          memDir = h; try { await tx(db, 'cfg', 'readwrite', function (st) { return st.put(h, 'dir'); }); } catch (e5) { /* nur für diese Sitzung merken */ } db.close();
          var mm = abMeta() || {}; mm.folder = true; mm.file = null; mm.folderNote = ''; ls.set(AB_META, JSON.stringify(mm));
          await createBackup(); NX.toast('Backup-Ordner gespeichert, Backup angelegt.');
        } else if (a === 'perm') {
          var db2 = await idb(), d2 = await dirState(db2); db2.close();
          if (d2.handle && (await d2.handle.requestPermission({ mode: 'readwrite' })) === 'granted') { await createBackup(); NX.toast('Zugriff erneuert, Backup angelegt.'); }
        } else if (a === 'nodir') {
          memDir = null; var db3 = await idb(); await tx(db3, 'cfg', 'readwrite', function (st) { return st.delete('dir'); }); db3.close();
          var m3 = abMeta() || {}; m3.folder = false; m3.file = null; m3.folderNote = ''; ls.set(AB_META, JSON.stringify(m3)); NX.toast('Ordner entfernt. Bereits geschriebene Dateien bleiben bestehen.');
        }
      } catch (err) { if (!err || err.name !== 'AbortError') NX.toast((err && err.message) || 'Aktion fehlgeschlagen.'); }
      paint();
    });
    document.addEventListener('nx:autobackup', function () { if (document.body.contains(sec)) paint(); });
    runIfDue().then(paint); paint();
  }

  /* ===== Kalender (Woche / Monat, im Stil von Outlook / Teams) =====
     Zeigt eigene Termine (NX.db.events, neu angelegt über „Neuer Termin“) sowie vorhandene Daten aus dem System:
     Zeiteinträge, Fristen (Rechnungen, Angebote, Monatsrechnungen), Projektstart/-ende und österreichische Feiertage.
     Es werden keine Termine erfunden. */
  var CAL_PREF = 'nexora_cal_pref';
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], WDL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  var COLORS = [['blue', 'Blau'], ['green', 'Grün'], ['orange', 'Orange'], ['purple', 'Violett'], ['red', 'Rot']];
  var KINDS = [['own', 'Termine', 'blue'], ['zeit', 'Zeiten', 'teal'], ['frist', 'Fristen', 'orange'], ['projekt', 'Projekte', 'purple'], ['anfrage', 'Anfragen', 'rose'], ['feiertag', 'Feiertage', 'gray']];
  var cal = { view: 'month', day: null, sFrom: '', sTo: '', filt: { own: 1, zeit: 1, frist: 1, projekt: 1, anfrage: 1, feiertag: 1 } };
  (function () { try { var p = JSON.parse(ls.get(CAL_PREF)); if (p) { if (p.view === 'day' || p.view === 'week' || p.view === 'month') cal.view = p.view; if (p.filt) Object.keys(cal.filt).forEach(function (k) { if (k in p.filt) cal.filt[k] = p.filt[k] ? 1 : 0; }); } } catch (e) { /* Standard */ } })();
  function calSave() { ls.set(CAL_PREF, JSON.stringify({ view: cal.view, filt: cal.filt })); }
  var cParse = function (iso) { return new Date(iso + 'T12:00:00'); };
  var cIso = function (d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  var cDow = function (iso) { return (cParse(iso).getDay() + 6) % 7; };
  var cWeekStart = function (iso) { return NX.addDays(iso, -cDow(iso)); };
  var cMin = function (t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  var cTime = function (mn) { mn = Math.max(0, Math.min(1439, mn)); return pad2(Math.floor(mn / 60)) + ':' + pad2(mn % 60); };
  function cKW(iso) { var d = cParse(iso), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7); }
  function cLong(iso) { var d = cParse(iso); return WDL[cDow(iso)] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  var holCache = {};
  function holidays(y) {
    if (holCache[y]) return holCache[y];
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1, easter = y + '-' + pad2(mo) + '-' + pad2(da), o = {};
    var fx = function (md, n) { o[y + '-' + md] = n; }, rel = function (days, n) { o[NX.addDays(easter, days)] = n; };
    fx('01-01', 'Neujahr'); fx('01-06', 'Heilige Drei Könige'); rel(0, 'Ostersonntag'); rel(1, 'Ostermontag'); fx('05-01', 'Staatsfeiertag'); rel(39, 'Christi Himmelfahrt');
    rel(49, 'Pfingstsonntag'); rel(50, 'Pfingstmontag'); rel(60, 'Fronleichnam'); fx('08-15', 'Mariä Himmelfahrt'); fx('10-26', 'Nationalfeiertag'); fx('11-01', 'Allerheiligen');
    fx('12-08', 'Mariä Empfängnis'); fx('12-25', 'Christtag'); fx('12-26', 'Stefanitag');
    return (holCache[y] = o);
  }
  var custName = function (id) { var c = (NX.db.customers || []).filter(function (x) { return x.id === id; })[0]; return c ? (c.first + ' ' + c.last).trim() : ''; };

  /* alle Einträge im Zeitraum [from, to] (ISO-Daten) */
  function calItems(from, to) {
    var D = NX.db, out = [], inR = function (d) { return d && d >= from && d <= to; }, F = cal.filt;
    if (F.own) (D.events || []).forEach(function (e) { if (inR(e.date)) out.push({ k: 'own', id: e.id, title: e.title, sub: e.note || '', date: e.date, allDay: !!e.allDay, start: e.start, end: e.end, col: e.color || 'blue', ref: e }); });
    if (F.zeit) (D.time || []).forEach(function (t) { if (inR(t.date) && cMin(t.start) !== null) out.push({ k: 'zeit', id: 'z' + t.id, title: t.desc || 'Zeiterfassung', sub: custName(t.customerId), date: t.date, allDay: false, start: t.start, end: t.end, col: 'teal', go: 'zeit-eintraege' }); });
    if (F.frist) {
      (D.invoices || []).forEach(function (i) { if (!i.draft && inR(i.due) && NX.open(i) > 0) { var ov = NX.invStatus(i) === 'Überfällig'; out.push({ k: 'frist', id: 'r' + i.id, title: 'Fällig: ' + i.number, sub: custName(i.customerId) + ' · offen ' + NX.eur(NX.open(i)), date: i.due, allDay: true, col: ov ? 'red' : 'orange', go: 'verrechnung-rechnungen' }); } });
      (D.offers || []).forEach(function (o) { if (inR(o.valid) && NX.offStatus(o) === 'Versendet') out.push({ k: 'frist', id: 'o' + o.id, title: 'Angebot gültig bis: ' + o.number, sub: custName(o.customerId), date: o.valid, allDay: true, col: 'orange', go: 'verrechnung-angebote' }); });
      (D.subscriptions || []).forEach(function (s) { if (s.status === 'Aktiv' && inR(s.nextDate)) out.push({ k: 'frist', id: 's' + s.id, title: 'Monatsrechnung: ' + (s.packageName || s.projectName || ''), sub: custName(s.customerId), date: s.nextDate, allDay: true, col: 'orange', go: 'verrechnung-vertraege' }); });
    }
    if (F.projekt) (D.projects || []).forEach(function (p) {
      if (inR(p.start)) out.push({ k: 'projekt', id: 'ps' + p.id, title: 'Projektstart: ' + p.name, sub: custName(p.customerId), date: p.start, allDay: true, col: 'purple', go: 'projekte' });
      if (inR(p.end)) out.push({ k: 'projekt', id: 'pe' + p.id, title: 'Projektende: ' + p.name, sub: custName(p.customerId), date: p.end, allDay: true, col: 'purple', go: 'projekte' });
    });
    if (F.anfrage) inquiryDeadlines().forEach(function (q) { if (inR(q.date)) out.push(q); });
    if (F.feiertag) { var y0 = +from.slice(0, 4), y1 = +to.slice(0, 4); for (var y = y0; y <= y1; y++) { var H = holidays(y); Object.keys(H).forEach(function (d) { if (inR(d)) out.push({ k: 'feiertag', id: 'h' + d, title: H[d], sub: 'Feiertag (Österreich)', date: d, allDay: true, col: 'gray' }); }); } }
    return out;
  }
  var calOrder = function (a, b) { var ra = a.k === 'feiertag' ? 0 : a.allDay ? 1 : 2, rb = b.k === 'feiertag' ? 0 : b.allDay ? 1 : 2; return ra - rb || (cMin(a.start) || 0) - (cMin(b.start) || 0) || String(a.title).localeCompare(String(b.title)); };

  /* ===== Anfragen im Kalender, Erinnerungs-E-Mails und .ics-Export ===== */
  var RM_KEY = 'nexora_cal_reminders', RM_LEAD = 60 * 60 * 1000, RM_ALLDAY_HOUR = 8, rmBusy = false, rmWarned = false;
  function inquiryDeadlines() {
    return (NX.db.inquiries || []).filter(function (i) { return i.wishDate && /^\d{4}-\d{2}-\d{2}$/.test(i.wishDate) && i.status !== 'Abgelehnt' && i.status !== 'Archiviert'; }).map(function (i) {
      return { k: 'anfrage', id: 'q' + i.id, title: 'Fertig bis: ' + (i.subject || 'Anfrage ' + i.id), sub: (i.first + ' ' + i.last).trim() + ' · Anfrage ' + i.id, date: i.wishDate, allDay: true, col: 'rose', go: 'anfragen' };
    });
  }
  /* Termine, für die es Erinnerungen gibt: eigene Termine und Fertigstellungstermine aus Anfragen */
  function reminderSources() {
    var own = (NX.db.events || []).map(function (e) { return { k: 'own', id: e.id, title: e.title, sub: e.note || '', date: e.date, allDay: !!e.allDay || cMin(e.start) === null, start: e.start, end: e.end }; });
    return own.concat(inquiryDeadlines());
  }
  function atLocal(iso, mins) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], Math.floor(mins / 60), mins % 60, 0, 0).getTime(); }
  /* Zeitfenster der Erinnerung: 1 Stunde vor Beginn; ganztägige Einträge um 08:00 des Tages */
  function reminderWindow(it) {
    if (it.allDay) return { from: atLocal(it.date, RM_ALLDAY_HOUR * 60), until: atLocal(it.date, 24 * 60 - 1), at: RM_ALLDAY_HOUR * 60 };
    var st = atLocal(it.date, cMin(it.start)); return { from: st - RM_LEAD, until: st, at: cMin(it.start) };
  }
  function rmLoad() { try { var s = JSON.parse(ls.get(RM_KEY)); return { sent: (s && s.sent) || {}, fail: (s && s.fail) || {} }; } catch (e) { return { sent: {}, fail: {} }; } }
  function rmSave(s) { var lim = Date.now() - 20 * 864e5; Object.keys(s.sent).forEach(function (k) { if (s.sent[k] < lim) delete s.sent[k]; }); Object.keys(s.fail).forEach(function (k) { if (s.fail[k] < lim) delete s.fail[k]; }); ls.set(RM_KEY, JSON.stringify(s)); }
  function reminderDue(now) {
    var st = rmLoad(), out = [];
    reminderSources().forEach(function (it) {
      var w = reminderWindow(it), key = it.id + '@' + it.date + ' ' + (it.allDay ? 'ganztägig' : it.start);
      if (now >= w.from && now <= w.until && !st.sent[key] && !(st.fail[key] && now - st.fail[key] < 10 * 60 * 1000)) out.push({ it: it, key: key, w: w });
    });
    return out;
  }
  async function runReminders() {
    if (rmBusy || !NX.db || !NX.formsubmit) return 0;
    var due = reminderDue(Date.now()); if (!due.length) return 0;
    rmBusy = true; var n = 0;
    try {
      var job = async function () {
        var st = rmLoad(), to = (NX.db.settings && NX.db.settings.formsubmit) || '';
        for (var i = 0; i < due.length; i++) {
          var d = due[i], it = d.it; if (st.sent[d.key]) continue;
          if (!to) { if (!rmWarned) { rmWarned = true; NX.toast('Termin-Erinnerung nicht gesendet: Bitte unter Einstellungen die E-Mail-Adresse für FormSubmit eintragen.'); } continue; }
          var when = it.allDay ? 'ganztägig' : it.start + (it.end ? '–' + it.end : '') + ' Uhr';
          var r = await NX.formsubmit({ _subject: 'Erinnerung: ' + it.title + (it.allDay ? ' (heute)' : ' um ' + it.start + ' Uhr'), Termin: it.title, Datum: cLong(it.date), Zeit: when, Details: it.sub || '–', Hinweis: it.allDay ? 'Ganztägiger Eintrag – Erinnerung am Morgen.' : 'Erinnerung 1 Stunde vor Beginn.' });
          if (NX.mailLog) NX.mailLog(to, 'Erinnerung: ' + it.title, 'Termin-Erinnerung', r.ok ? 'an FormSubmit übergeben' : 'nicht versendet');
          if (r.ok) { st.sent[d.key] = Date.now(); delete st.fail[d.key]; n++; } else st.fail[d.key] = Date.now();
          rmSave(st);
        }
      };
      if (navigator.locks && navigator.locks.request) await navigator.locks.request('nexora-cal-reminders', { ifAvailable: true }, function (lock) { return lock ? job() : null; }); else await job();
    } catch (e) { /* beim nächsten Durchlauf erneut */ } finally { rmBusy = false; }
    return n;
  }
  NX.calReminders = { run: runReminders, due: function () { return reminderDue(Date.now()); } };
  setTimeout(runReminders, 2500); setInterval(runReminders, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) runReminders(); });

  /* .ics-Export (Erinnerung 1 Stunde vorher im Kalenderprogramm bzw. am Handy) */
  function icsEsc(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,'); }
  function icsFold(l) { var o = [], b = l; while (b.length > 73) { o.push(b.slice(0, 73)); b = ' ' + b.slice(73); } o.push(b); return o.join('\r\n'); }
  function buildIcs() {
    var now = new Date(), stamp = now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) + 'T' + pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';
    var compact = function (iso) { return iso.replace(/-/g, ''); }, tm = function (iso, mn) { return compact(iso) + 'T' + pad2(Math.floor(mn / 60)) + pad2(mn % 60) + '00'; };
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEXORA by AL//Kalender//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:NEXORA by AL'];
    reminderSources().forEach(function (it) {
      L.push('BEGIN:VEVENT', 'UID:' + icsEsc(it.id) + '@nexora-by-al', 'DTSTAMP:' + stamp, 'SUMMARY:' + icsEsc(it.title));
      if (it.sub) L.push('DESCRIPTION:' + icsEsc(it.sub));
      if (it.allDay) { L.push('DTSTART;VALUE=DATE:' + compact(it.date), 'DTEND;VALUE=DATE:' + compact(NX.addDays(it.date, 1))); }
      else { var s = cMin(it.start), e = cMin(it.end); if (e === null || e <= s) e = Math.min(s + 60, 1439); L.push('DTSTART:' + tm(it.date, s), 'DTEND:' + tm(it.date, e)); }
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc('Erinnerung: ' + it.title), 'TRIGGER:' + (it.allDay ? 'PT' + RM_ALLDAY_HOUR + 'H' : '-PT1H'), 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(icsFold).join('\r\n') + '\r\n';
  }
  NX.calIcs = buildIcs;
  function downloadIcs() {
    var url = URL.createObjectURL(new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = 'nexora-kalender-' + NX.today() + '.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function calendarView(c) {
    if (c.querySelector('.nx-ax-cal')) return;
    if (!cal.day) cal.day = NX.today();
    var h1 = c.querySelector('h1'); if (h1) h1.className = 'nx-ax-cal-h1';
    var wrap = document.createElement('div'); wrap.className = 'nx-ax-cal'; c.appendChild(wrap);
    var reg = {}, narrow = function () { return window.innerWidth <= 640; }, tick = null;

    function range() { if (cal.view === 'day') return [cal.day, cal.day]; if (cal.view === 'week') { var s = cWeekStart(cal.day); return [s, NX.addDays(s, 6)]; } var f = cParse(cal.day.slice(0, 8) + '01'), s2 = cWeekStart(cIso(f)), last = cIso(new Date(f.getFullYear(), f.getMonth() + 1, 0, 12)); return [s2, NX.addDays(cWeekStart(last), 6)]; }
    function title() {
      var d = cParse(cal.day);
      if (cal.view === 'day') return cLong(cal.day);
      if (cal.view === 'month') return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      var s = cParse(cWeekStart(cal.day)), e = cParse(NX.addDays(cWeekStart(cal.day), 6));
      return s.getMonth() === e.getMonth() ? s.getDate() + '.–' + e.getDate() + '. ' + MONTHS[e.getMonth()] + ' ' + e.getFullYear() : s.getDate() + '. ' + MONTHS[s.getMonth()].slice(0, 3) + ' – ' + e.getDate() + '. ' + MONTHS[e.getMonth()].slice(0, 3) + ' ' + e.getFullYear();
    }
    function pill(it, compact) {
      reg[it.id] = it;
      var tm = !it.allDay && it.start ? '<i>' + esc(it.start) + '</i> ' : '';
      return '<button type="button" class="nx-ax-cal-ev nx-ax-cal-c-' + it.col + (it.allDay ? ' is-all' : '') + '" data-ev="' + esc(it.id) + '" title="' + esc(it.title + (it.sub ? ' – ' + it.sub : '')) + '">' + tm + '<span>' + esc(it.title) + '</span></button>';
    }

    function monthHtml() {
      var r = range(), items = calItems(r[0], r[1]).sort(calOrder), by = {}, today = NX.today(), cm = cal.day.slice(0, 7);
      items.forEach(function (it) { (by[it.date] = by[it.date] || []).push(it); });
      var h = '<div class="nx-ax-cal-mg" style="--rows:' + (Math.floor((cParse(r[1]) - cParse(r[0])) / 864e5) + 1) / 7 + '"><div class="nx-ax-cal-kw">KW</div>' + WD.map(function (w) { return '<div class="nx-ax-cal-wd">' + w + '</div>'; }).join('');
      for (var d = r[0]; d <= r[1]; d = NX.addDays(d, 1)) {
        if (cDow(d) === 0) h += '<div class="nx-ax-cal-kw">' + cKW(d) + '</div>';
        var dd = cParse(d), cls = 'nx-ax-cal-d' + (d.slice(0, 7) !== cm ? ' out' : '') + (d === today ? ' today' : '') + (cDow(d) > 4 ? ' we' : '') + ((holidays(+d.slice(0, 4))[d] && cal.filt.feiertag) ? ' hol' : '');
        h += '<div class="' + cls + '" data-d="' + d + '"><span class="nx-ax-cal-n">' + (dd.getDate() === 1 ? dd.getDate() + '. ' + MONTHS[dd.getMonth()].slice(0, 3) : dd.getDate()) + '</span><div class="nx-ax-cal-evs">' + (by[d] || []).map(function (it) { return pill(it); }).join('') + '</div></div>';
      }
      return h + '</div>';
    }

    function weekHtml() {
      var isDay = cal.view === 'day', s = isDay ? cal.day : cWeekStart(cal.day), e = isDay ? s : NX.addDays(s, 6), items = calItems(s, e).sort(calOrder), today = NX.today(), HH = 48, days = [], i;
      for (i = 0; i < (isDay ? 1 : 7); i++) days.push(NX.addDays(s, i));
      var head = '<div class="nx-ax-cal-wcorner">KW ' + cKW(s) + '</div>' + days.map(function (d) { var hol = cal.filt.feiertag && holidays(+d.slice(0, 4))[d]; return '<div class="nx-ax-cal-wh' + (d === today ? ' today' : '') + (cDow(d) > 4 ? ' we' : '') + '" data-d="' + d + '"><span>' + WD[cDow(d)] + '</span><b>' + cParse(d).getDate() + '</b></div>'; }).join('');
      var allday = '<div class="nx-ax-cal-wlabel">ganztägig</div>' + days.map(function (d) { return '<div class="nx-ax-cal-wa' + (cDow(d) > 4 ? ' we' : '') + '" data-d="' + d + '">' + items.filter(function (it) { return it.date === d && (it.allDay || cMin(it.start) === null); }).map(function (it) { return pill(it); }).join('') + '</div>'; }).join('');
      var hours = ''; for (i = 0; i < 24; i++) hours += '<div class="nx-ax-cal-hr" style="top:' + (i * HH) + 'px"><span>' + (i ? pad2(i) + ':00' : '') + '</span></div>';
      var cols = days.map(function (d) {
        var tl = items.filter(function (it) { return it.date === d && !it.allDay && cMin(it.start) !== null; }), cl = [], html = '';
        tl.forEach(function (it) { it._s = cMin(it.start); it._e = Math.max(it._s + 20, cMin(it.end) !== null && cMin(it.end) > it._s ? cMin(it.end) : it._s + 60); });
        tl.sort(function (a, b) { return a._s - b._s || b._e - a._e; });
        var cluster = [], cEnd = -1; var flush = function () { var cols2 = []; cluster.forEach(function (it) { var k = 0; while (cols2[k] !== undefined && cols2[k] > it._s) k++; cols2[k] = it._e; it._c = k; }); cluster.forEach(function (it) { it._n = cols2.length; }); cluster = []; };
        tl.forEach(function (it) { if (it._s >= cEnd && cluster.length) { flush(); cEnd = -1; } cluster.push(it); cEnd = Math.max(cEnd, it._e); }); if (cluster.length) flush();
        tl.forEach(function (it) {
          reg[it.id] = it;
          html += '<button type="button" class="nx-ax-cal-ev nx-ax-cal-te nx-ax-cal-c-' + it.col + '" data-ev="' + esc(it.id) + '" style="top:' + (it._s / 60 * HH) + 'px;height:' + Math.max(20, (it._e - it._s) / 60 * HH - 2) + 'px;left:calc(' + (it._c / it._n * 100) + '% + 1px);width:calc(' + (100 / it._n) + '% - 3px)" title="' + esc(it.title + (it.sub ? ' – ' + it.sub : '')) + '"><b>' + esc(it.title) + '</b><i>' + esc(it.start + (it.end ? '–' + it.end : '')) + (it.sub ? ' · ' + esc(it.sub) : '') + '</i></button>';
        });
        return '<div class="nx-ax-cal-col' + (d === today ? ' today' : '') + (cDow(d) > 4 ? ' we' : '') + '" data-d="' + d + '">' + html + (d === today ? '<div class="nx-ax-cal-now"></div>' : '') + '</div>';
      }).join('');
      return '<div class="nx-ax-cal-wx' + (isDay ? ' is-day' : '') + '" style="--cols:' + days.length + '"><div class="nx-ax-cal-wrow nx-ax-cal-whead">' + head + '</div><div class="nx-ax-cal-wrow nx-ax-cal-wallday">' + allday + '</div><div class="nx-ax-cal-wbody"><div class="nx-ax-cal-wgrid" style="--hh:' + HH + 'px"><div class="nx-ax-cal-hours">' + hours + '</div>' + cols + '</div></div></div>';
    }

    function sizeWrap() {
      if (window.innerWidth <= 900) { wrap.style.height = ''; return; }
      var ft = document.getElementById('ftr'), top = wrap.getBoundingClientRect().top + window.scrollY;
      var cs = wrap.parentNode ? parseFloat(getComputedStyle(wrap.parentNode).paddingBottom) || 0 : 0;
      wrap.style.height = Math.max(420, window.innerHeight - top - (ft ? ft.offsetHeight : 0) - cs - 2) + 'px';
    }
    function searchRange() {
      var f = cal.sFrom, t = cal.sTo, okd = function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); };
      if (!okd(f) && !okd(t)) return null;
      if (!okd(f)) return { err: 'Bitte „Von“ wählen.' };
      if (!okd(t)) t = f;
      if (t < f) return { err: '„Bis“ liegt vor „Von“.' };
      if ((cParse(t) - cParse(f)) / 864e5 > 731) return { err: 'Bitte höchstens 2 Jahre auswählen.' };
      return { from: f, to: t };
    }
    function searchHtml(sr) {
      if (sr.err) return '<div class="nx-ax-cal-res"><p class="nx-ax-cal-empty">' + esc(sr.err) + '</p></div>';
      var items = calItems(sr.from, sr.to).sort(function (a, b) { return a.date.localeCompare(b.date) || calOrder(a, b); }), by = {}, days = [];
      items.forEach(function (it) { if (!by[it.date]) { by[it.date] = []; days.push(it.date); } by[it.date].push(it); });
      if (!days.length) return '<div class="nx-ax-cal-res"><p class="nx-ax-cal-empty">Keine Einträge im gewählten Zeitraum.</p></div>';
      return '<div class="nx-ax-cal-res">' + days.map(function (d) {
        return '<section class="nx-ax-cal-resday"><h4>' + esc(cLong(d)) + '</h4>' + by[d].map(function (it) { reg[it.id] = it; return '<button type="button" class="nx-ax-cal-ev nx-ax-cal-c-' + it.col + ' is-all" data-ev="' + esc(it.id) + '"><span>' + (it.allDay || !it.start ? 'ganztägig' : esc(it.start + (it.end ? '–' + it.end : ''))) + ' · ' + esc(it.title) + '</span>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</button>'; }).join('') + '</section>';
      }).join('') + '</div>';
    }
    function placeNow() {
      var n = wrap.querySelector('.nx-ax-cal-now'); if (!n) return;
      var d = new Date(); n.style.top = ((d.getHours() * 60 + d.getMinutes()) / 60 * 48) + 'px';
    }
    function fitMonth() {
      var cells = wrap.querySelectorAll('.nx-ax-cal-d'); if (!cells.length) return;
      Array.prototype.forEach.call(cells, function (cell) {
        var box = cell.querySelector('.nx-ax-cal-evs'), old = box.querySelector('.nx-ax-cal-more'); if (old) old.remove();
        var evs = box.querySelectorAll('.nx-ax-cal-ev'); Array.prototype.forEach.call(evs, function (e) { e.hidden = false; });
        if (narrow()) return;
        var cap = Math.max(1, Math.floor((cell.clientHeight - 30) / 22));
        if (evs.length > cap) {
          var keep = Math.max(0, cap - 1), more = document.createElement('button'); more.type = 'button'; more.className = 'nx-ax-cal-more'; more.dataset.more = cell.dataset.d; more.textContent = '+ ' + (evs.length - keep) + ' weitere';
          Array.prototype.forEach.call(evs, function (e, i) { e.hidden = i >= keep; }); box.appendChild(more);
        }
      });
    }

    function paintBody(keepScroll) {
      reg = {};
      var body = wrap.querySelector('.nx-ax-cal-body'), sr = searchRange(), grid = cal.view !== 'month';
      var ob = wrap.querySelector('.nx-ax-cal-wbody'), sc = ob ? ob.scrollTop : null;
      var tt = wrap.querySelector('.nx-ax-cal-title'), kp = wrap.querySelector('.nx-ax-cal-kwp');
      if (tt) tt.textContent = sr && !sr.err ? 'Suchergebnis: ' + NX.date(sr.from) + (sr.to !== sr.from ? ' – ' + NX.date(sr.to) : '') : title();
      if (kp) { kp.hidden = !!sr || cal.view === 'month'; kp.textContent = 'KW ' + cKW(cal.view === 'day' ? cal.day : cWeekStart(cal.day)); }
      var clr = wrap.querySelector('[data-sclear]'); if (clr) clr.hidden = !(cal.sFrom || cal.sTo);
      if (sr) { body.innerHTML = searchHtml(sr); return; }
      body.innerHTML = grid ? weekHtml() : monthHtml();
      if (grid) {
        var b = body.querySelector('.nx-ax-cal-wbody'), d = new Date(), isNow = cal.view === 'day' ? cal.day === NX.today() : cWeekStart(cal.day) === cWeekStart(NX.today());
        if (b) { b.scrollTop = keepScroll && sc !== null ? sc : Math.max(0, (isNow ? Math.max(0, d.getHours() - 2) : 7) * 48 - 8); var wx = body.querySelector('.nx-ax-cal-wx'); if (wx) wx.style.setProperty('--sbw', (b.offsetWidth - b.clientWidth) + 'px'); }
        placeNow();
      } else fitMonth();
    }
    function paint(keepScroll) {
      var opt = function (v, l) { return '<option value="' + v + '"' + (cal.view === v ? ' selected' : '') + '>' + l + '</option>'; };
      var sel = '<select class="nx-ax-cal-sel" aria-label="Ansicht">' + opt('day', 'Tag') + opt('week', 'Woche') + opt('month', 'Monat') + '</select>';
      var chips = KINDS.map(function (k) { return '<button type="button" class="nx-ax-cal-chip nx-ax-cal-c-' + k[2] + (cal.filt[k[0]] ? ' on' : '') + '" data-f="' + k[0] + '" aria-pressed="' + (cal.filt[k[0]] ? 'true' : 'false') + '"><i></i>' + k[1] + '</button>'; }).join('');
      wrap.innerHTML = '<div class="nx-ax-cal-bar"><div class="nx-ax-cal-nav"><button type="button" class="nx-ax-cal-arrow" data-nav="-1" aria-label="Zurück">‹</button><h2 class="nx-ax-cal-title"></h2><span class="nx-ax-cal-kwp"></span><button type="button" class="nx-ax-cal-arrow" data-nav="1" aria-label="Weiter">›</button><button type="button" class="btn ghost sm nx-ax-cal-today" data-nav="0">Heute</button></div><div class="nx-ax-cal-tools">' + sel + '<button type="button" class="btn sm" data-new>+ Neuer Termin</button><button type="button" class="btn ghost sm nx-ax-cal-ics" data-ics title="Termine als .ics-Datei exportieren (Erinnerung 1 Stunde vorher)">Kalender exportieren</button></div></div>' +
        '<div class="nx-ax-cal-sbar"><span class="nx-ax-cal-slabel">Datum suchen</span><label>Von <input type="date" class="nx-ax-cal-sf" aria-label="Datum von" value="' + esc(cal.sFrom) + '"></label><label>Bis <input type="date" class="nx-ax-cal-st" aria-label="Datum bis" value="' + esc(cal.sTo) + '"></label><button type="button" class="btn ghost sm" data-sclear hidden>Zurücksetzen</button></div>' +
        '<div class="nx-ax-cal-chips">' + chips + '</div><div class="nx-ax-cal-body"></div>';
      paintBody(keepScroll);
    }

    /* ---- Dialoge ---- */
    function openEvent(it) {
      if (!it) return;
      if (it.k === 'own') return editEvent(it.ref);
      var m = NX.modal(it.title, '<dl class="dl"><dt>Datum</dt><dd>' + esc(cLong(it.date)) + '</dd>' + (it.start ? '<dt>Zeit</dt><dd>' + esc(it.start + (it.end ? ' – ' + it.end + ' Uhr' : ' Uhr')) + '</dd>' : '') + (it.sub ? '<dt>Details</dt><dd>' + esc(it.sub) + '</dd>' : '') + '</dl>' + (it.go ? '<div class="acts"><button type="button" class="btn" data-open>Öffnen</button></div>' : ''));
      var o = m.body.querySelector('[data-open]'); if (o) o.onclick = function () { m.close(); go(it.go); };
    }
    function editEvent(ev, pre) {
      var isNew = !ev, e = ev || { title: '', date: (pre && pre.date) || cal.day, allDay: !!(pre && pre.allDay), start: (pre && pre.start) || '09:00', end: (pre && pre.end) || '10:00', color: 'blue', note: '' };
      var m = NX.modal(isNew ? 'Neuer Termin' : 'Termin bearbeiten', '<form novalidate>' +
        '<div class="field"><label for="ce-t">Titel <span class="req">*</span></label><input id="ce-t" name="title" maxlength="120" value="' + esc(e.title) + '"></div>' +
        '<div class="row"><div class="field"><label for="ce-d">Datum <span class="req">*</span></label><input id="ce-d" name="date" type="date" value="' + esc(e.date) + '"></div>' +
        '<div class="field"><label for="ce-c">Farbe</label><select id="ce-c" name="color">' + COLORS.map(function (c) { return '<option value="' + c[0] + '"' + (e.color === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="field"><label class="nx-ax-cal-check"><input id="ce-a" type="checkbox"' + (e.allDay ? ' checked' : '') + '> Ganztägig</label></div>' +
        '<div class="row nx-ax-cal-times"><div class="field"><label for="ce-s">Von</label><input id="ce-s" name="start" type="time" value="' + esc(e.start || '09:00') + '"></div><div class="field"><label for="ce-e">Bis</label><input id="ce-e" name="end" type="time" value="' + esc(e.end || '10:00') + '"></div></div>' +
        '<div class="field"><label for="ce-n">Notiz</label><textarea id="ce-n" name="note" rows="3" maxlength="600">' + esc(e.note || '') + '</textarea></div><p class="err" id="ce-err" role="alert"></p>' +
        '<div class="acts"><button type="submit" class="btn">Speichern</button>' + (isNew ? '' : '<button type="button" class="btn ghost" data-del>Löschen</button>') + '<button type="button" class="btn ghost" data-cancel>Abbrechen</button></div></form>');
      var f = m.body.querySelector('form'), q = function (id) { return f.querySelector('#' + id); }, times = f.querySelector('.nx-ax-cal-times');
      var sync = function () { times.hidden = q('ce-a').checked; }; q('ce-a').onchange = sync; sync();
      f.querySelector('[data-cancel]').onclick = m.close;
      f.onsubmit = function (ev2) {
        ev2.preventDefault(); var err = q('ce-err'), t = q('ce-t').value.trim(), d = q('ce-d').value, all = q('ce-a').checked, s = q('ce-s').value, en = q('ce-e').value;
        if (!t) { err.textContent = 'Bitte einen Titel eingeben.'; q('ce-t').focus(); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { err.textContent = 'Bitte ein Datum wählen.'; q('ce-d').focus(); return; }
        if (!all) { if (cMin(s) === null) { err.textContent = 'Bitte eine Startzeit angeben.'; q('ce-s').focus(); return; } if (en && cMin(en) !== null && cMin(en) <= cMin(s)) { err.textContent = 'Das Ende muss nach dem Beginn liegen.'; q('ce-e').focus(); return; } }
        var rec = isNew ? { id: NX.uid('E') } : e;
        rec.title = t; rec.date = d; rec.allDay = all; rec.start = all ? '' : s; rec.end = all ? '' : en; rec.color = q('ce-c').value; rec.note = q('ce-n').value.trim();
        if (isNew) { NX.db.events = NX.db.events || []; NX.db.events.push(rec); }
        NX.log((isNew ? 'Termin angelegt: ' : 'Termin geändert: ') + t); NX.save(); m.close(); cal.day = d; paint(true);
        NX.toast(isNew ? 'Termin gespeichert.' : 'Termin aktualisiert.');
      };
      var del = f.querySelector('[data-del]');
      if (del) del.onclick = async function () {
        if (!await NX.confirm('Diesen Termin löschen?', 'Löschen')) return;
        NX.db.events = (NX.db.events || []).filter(function (x) { return x.id !== e.id; }); NX.log('Termin gelöscht: ' + e.title); NX.save(); m.close(); paint(true); NX.toast('Termin gelöscht.');
      };
      setTimeout(function () { q('ce-t').focus(); }, 30);
    }
    function dayModal(d) {
      var list = calItems(d, d).sort(calOrder);
      var m = NX.modal(cLong(d), (list.length ? '<ul class="list nx-ax-cal-daylist">' + list.map(function (it) { reg[it.id] = it; return '<li><button type="button" class="nx-ax-cal-ev nx-ax-cal-c-' + it.col + ' is-all" data-ev="' + esc(it.id) + '"><span>' + (it.allDay || !it.start ? '' : '<i>' + esc(it.start + (it.end ? '–' + it.end : '')) + '</i> ') + esc(it.title) + '</span>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</button></li>'; }).join('') + '</ul>' : '<p class="mut">Keine Einträge an diesem Tag.</p>') + '<div class="acts"><button type="button" class="btn" data-add>+ Neuer Termin</button></div>');
      m.body.addEventListener('click', function (e) { var b = e.target.closest('[data-ev]'); if (b) { var it = reg[b.dataset.ev]; m.close(); openEvent(it); return; } if (e.target.closest('[data-add]')) { m.close(); editEvent(null, { date: d, allDay: true }); } });
    }

    /* ---- Bedienung ---- */
    wrap.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-nav]'))) { cal.sFrom = ''; cal.sTo = ''; var n = +b.dataset.nav; if (!n) cal.day = NX.today(); else if (cal.view === 'day') cal.day = NX.addDays(cal.day, n); else if (cal.view === 'week') cal.day = NX.addDays(cal.day, 7 * n); else { var d = cParse(cal.day.slice(0, 8) + '01'); d.setMonth(d.getMonth() + n); cal.day = cIso(d); } paint(); return; }
      if ((b = t.closest('[data-f]'))) { cal.filt[b.dataset.f] = cal.filt[b.dataset.f] ? 0 : 1; calSave(); paint(true); return; }
      if (t.closest('[data-ics]')) { downloadIcs(); return; }
      if (t.closest('[data-new]')) { editEvent(null, { date: cal.day }); return; }
      if ((b = t.closest('[data-ev]'))) { openEvent(reg[b.dataset.ev]); return; }
      if ((b = t.closest('[data-more]'))) { dayModal(b.dataset.more); return; }
      var col = t.closest('.nx-ax-cal-col');
      if (col) { var r = col.getBoundingClientRect(), mn = Math.floor((e.clientY - r.top) / 48 * 2) * 30; editEvent(null, { date: col.dataset.d, start: cTime(mn), end: cTime(mn + 60) }); return; }
      var wa = t.closest('.nx-ax-cal-wa'); if (wa) { editEvent(null, { date: wa.dataset.d, allDay: true }); return; }
      var wh = t.closest('.nx-ax-cal-wh'); if (wh) { if (cal.view !== 'day') { cal.day = wh.dataset.d; cal.view = 'day'; calSave(); paint(); } return; }
      var cell = t.closest('.nx-ax-cal-d');
      if (cell) { if (narrow()) dayModal(cell.dataset.d); else editEvent(null, { date: cell.dataset.d, allDay: true }); }
    });
    wrap.addEventListener('change', function (e) { if (e.target.classList.contains('nx-ax-cal-sel')) { cal.view = e.target.value === 'day' ? 'day' : e.target.value === 'week' ? 'week' : 'month'; cal.sFrom = ''; cal.sTo = ''; calSave(); paint(); return; }
      onSearch(e);
    });
    wrap.addEventListener('input', onSearch);
    /* Datum suchen: „Von“ setzt „Bis“ automatisch auf dasselbe Datum; eine Änderung bei „Bis“ lässt „Von“ unverändert */
    function onSearch(e) {
      var el = e.target; if (!el.classList) return;
      if (el.classList.contains('nx-ax-cal-sf')) {
        cal.sFrom = el.value; if (el.value) { cal.sTo = el.value; var t = wrap.querySelector('.nx-ax-cal-st'); if (t) t.value = el.value; }
        paintBody();
      } else if (el.classList.contains('nx-ax-cal-st')) { cal.sTo = el.value; paintBody(); }
    }
    wrap.addEventListener('click', function (e) {
      if (!e.target.closest('[data-sclear]')) return;
      cal.sFrom = ''; cal.sTo = ''; paint();
    });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('nx-ax-cal-d')) { var d = e.target.dataset.d; if (d) dayModal(d); } });
    sizeWrap(); paint();
    window.addEventListener('resize', function () { if (document.body.contains(wrap)) { sizeWrap(); if (cal.view === 'month') fitMonth(); } });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (!document.body.contains(wrap)) { ro.disconnect(); return; } if (cal.view === 'month') fitMonth(); }); ro.observe(wrap); }
    tick = setInterval(function () { if (!document.body.contains(wrap)) { clearInterval(tick); return; } placeNow(); }, 60000);
  }

  /* Dashboard: runde Symbol-Plaketten an den Kennzahlen (rein dekorativ, Werte bleiben unverändert) */
  var KPI_ICONS = {
    'Neue Anfragen': '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
    'Aktive Projekte': '<path d="M3 7h6l2 2h10v9H3z"/>',
    'Abgeschlossene Projekte': '<path d="m5 12 5 5 9-10"/>',
    'Offene Angebote': '<path d="M7 3h8l4 4v14H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    'Offene Rechnungen': '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    'Bezahlte Rechnungen': '<circle cx="12" cy="12" r="8"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    'Offene Beträge': '<path d="M4 7h15a1 1 0 0 1 1 1v10H5a1 1 0 0 1-1-1z"/><path d="M4 7l12-3v3M15 13h3"/>',
    'Umsatz (eingegangen)': '<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>'
  };
  function kpiIcons(c) {
    Array.prototype.forEach.call(c.querySelectorAll('.kp .kpi'), function (k) {
      if (k.querySelector('.nx-ax-ic')) return;
      var sp = k.querySelector('span'), d = sp && KPI_ICONS[sp.textContent.trim()]; if (!d) return;
      k.insertAdjacentHTML('beforeend', '<em class="nx-ax-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></em>');
    });
  }

  /* ---------- Nur mit Server: Server-Sicherungen, Automatik ---------- */
  var beOn = function () { return NX.backend && NX.backend.on && NX.backend.role === 'admin'; };
  var rq = function (m, url, body, raw) { return fetch(url, { method: m, credentials: 'same-origin', headers: raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }, body: raw || (body ? JSON.stringify(body) : undefined) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); }); };
  var fsize = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  /* Dateien direkt an Anfrage bzw. Projekt (kein eigener Menüpunkt): NX.attachments(host, { owner, also, title, note }) */
  NX.attachments = function (host, o) {
    var BE = NX.backend; if (!BE || !BE.on || (BE.role !== 'admin' && BE.role !== 'employee')) return;
    var box = document.createElement('section'); box.className = 'nx-ax-files'; host.appendChild(box);
    var owners = [o.owner].concat(o.also || []);
    box.innerHTML = '<h3>' + esc(o.title || 'Dateien') + '</h3>' + (o.note ? '<p class="mut">' + esc(o.note) + '</p>' : '') + '<ul class="nx-att-list" aria-live="polite"></ul><p class="err" role="alert"></p>' +
      '<div class="acts"><label class="btn ghost sm nx-att-add">+ Datei hinzufügen<input type="file" multiple hidden></label><small class="mut">je höchstens 10 MB: PDF, Bilder, Office, ZIP, TXT, CSV</small></div>';
    var ul = box.querySelector('ul'), err = box.querySelector('.err'), inp = box.querySelector('input'), all = [];
    function draw() {
      ul.innerHTML = all.length ? all.map(function (x) { return '<li><span>' + esc(x.name) + ' <small class="mut">' + fsize(x.size) + ' · ' + esc(NX.date(String(x.created_at).slice(0, 10))) + (x.owner !== o.owner ? ' · aus der Anfrage' : '') + '</small></span><span class="nx-att-act"><a class="btn ghost sm" href="/api/files/' + esc(x.id) + '">Herunterladen</a> <button type="button" class="btn ghost sm" data-fdel="' + esc(x.id) + '">Löschen</button></span></li>'; }).join('') : '<li class="mut">Noch keine Dateien.</li>';
    }
    function load() { rq('GET', '/api/files').then(function (r) { all = r.ok ? r.j.files.filter(function (x) { return owners.indexOf(x.owner) > -1; }) : []; draw(); }); }
    load();
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-fdel]'); if (!b) return; NX.confirm('Datei endgültig löschen?', 'Löschen').then(function (y) { if (!y) return; rq('DELETE', '/api/files/' + b.dataset.fdel).then(function (r) { NX.toast(r.ok ? 'Datei gelöscht.' : 'Nicht möglich.'); load(); }); }); });
    inp.onchange = function () {
      var files = Array.prototype.slice.call(inp.files || []); err.textContent = ''; if (!files.length) return;
      var big = files.filter(function (x) { return x.size > 10 * 1048576; }); if (big.length) { err.textContent = '„' + big[0].name + '“ ist größer als 10 MB.'; inp.value = ''; return; }
      var n = 0, bad = '';
      files.reduce(function (p, file) { return p.then(function () { return file.arrayBuffer().then(function (buf) { return rq('POST', '/api/files?owner=' + encodeURIComponent(o.owner) + '&name=' + encodeURIComponent(file.name), null, buf); }).then(function (r) { if (r.ok) n++; else bad = r.j.error || 'Fehler'; }); }); }, Promise.resolve()).then(function () {
        inp.value = ''; err.textContent = bad; if (n) NX.toast(n + (n === 1 ? ' Datei hinzugefügt.' : ' Dateien hinzugefügt.')); load();
      });
    };
  };
  function serverBackups(c) {
    if (!beOn() || c.querySelector('.nx-ax-sbk')) return;
    var sec = document.createElement('section'); sec.className = 'card nx-ax-sbk'; c.appendChild(sec);
    var kind = { auto: 'automatisch', manual: 'manuell', 'vor-wiederherstellung': 'vor Wiederherstellung' };
    function draw() {
      rq('GET', '/api/backups').then(function (r) {
        var l = r.ok ? r.j.backups : [];
        sec.innerHTML = '<h3>Server-Sicherungen</h3><p class="mut">Der Server sichert die Datenbank täglich automatisch (die letzten 30 Tage bleiben erhalten). Dateianhänge sind nicht enthalten.</p><div class="acts"><button type="button" class="btn" data-sbk="new">Jetzt sichern</button></div>' +
          (l.length ? '<div class="tw"><table><thead><tr><th scope="col">Zeitpunkt</th><th scope="col">Art</th><th scope="col">Größe</th><th scope="col"></th></tr></thead><tbody>' + l.map(function (b) { return '<tr><td>' + esc(NX.dt(b.created_at)) + '</td><td>' + esc(kind[b.kind] || b.kind) + '</td><td>' + fsize(b.size) + '</td><td class="nx-ax-fact"><a class="btn ghost sm" href="/api/backups/' + b.id + '/download">Herunterladen</a> <button type="button" class="btn ghost sm" data-sbk="restore" data-id="' + b.id + '">Wiederherstellen</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="mut">Noch keine Sicherung vorhanden.</p>');
      });
    }
    draw();
    sec.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sbk]'); if (!b) return;
      if (b.dataset.sbk === 'new') rq('POST', '/api/backups').then(function (r) { NX.toast(r.ok ? 'Sicherung erstellt.' : (r.j.error || 'Nicht möglich.')); draw(); });
      if (b.dataset.sbk === 'restore') NX.confirm('Diese Sicherung wiederherstellen? Der aktuelle Stand wird vorher automatisch gesichert. Danach wird die Seite neu geladen.', 'Wiederherstellen').then(function (y) { if (!y) return; rq('POST', '/api/backups/' + b.dataset.id + '/restore').then(function (r) { if (r.ok) { NX.toast('Wiederhergestellt – lade neu …'); setTimeout(function () { location.reload(); }, 900); } else NX.toast(r.j.error || 'Nicht möglich.'); }); });
    });
  }
  function automationCard(c) {
    if (!beOn() || c.querySelector('.nx-ax-auto')) return;
    var S = NX.db.settings; S.auto = Object.assign({ subscriptions: true, reminders: false }, S.auto || {});
    var sec = document.createElement('section'); sec.className = 'card nx-ax-auto';
    sec.innerHTML = '<h3>Automatik auf dem Server</h3><p class="mut">Läuft auch, wenn niemand angemeldet ist. Es wird nichts versendet; du prüfst und verschickst wie gewohnt.</p>' +
      '<label class="nx-ax-chk"><input type="checkbox" data-auto="subscriptions"' + (S.auto.subscriptions ? ' checked' : '') + '> Monatsrechnungen automatisch als Entwurf erstellen, sobald sie fällig sind</label>' +
      '<label class="nx-ax-chk"><input type="checkbox" data-auto="reminders"' + (S.auto.reminders ? ' checked' : '') + '> Zahlungserinnerung und Mahnungen automatisch als Dokument anlegen (Fristen und Gebühren aus den Einstellungen)</label>';
    c.appendChild(sec);
    sec.addEventListener('change', function (e) { var i = e.target.closest('[data-auto]'); if (!i) return; NX.db.settings.auto[i.dataset.auto] = i.checked; NX.log('Automatik ' + (i.dataset.auto === 'subscriptions' ? 'Monatsrechnungen' : 'Mahnwesen') + (i.checked ? ' eingeschaltet' : ' ausgeschaltet')); NX.save(); NX.toast('Gespeichert.'); });
  }

  function onView(id, c) {
    if (!c) return;
    mountSearch(); mountBurger(); setMenu(false); scheduleFit(); c.classList.add('nx-ax-cnt');
    c.classList.toggle('nx-ax-dash', id === 'dashboard'); c.classList.toggle('nx-ax-calpage', id === 'kalender');
    var full = id === 'dashboard' || id === 'kalender';
    if (id === 'dashboard') { dashboard(c); actLists(c); charts(c); kpiIcons(c); }
    if (id === 'user') { archivePanel(c); var tb = c.querySelector('#tb'); if (tb) new MutationObserver(function () { archivePanel(c); }).observe(tb, { childList: true }); }
    if (id === 'projekte') orderArchivePanel(c);
    if (id === 'backup') { backupPanel(c); serverBackups(c); }
    if (id === 'einstellungen') automationCard(c);
    if (id === 'kalender') calendarView(c);
    chips(c);
    if (pending && pending.view === id) {
      var p = pending; pending = null;
      setTimeout(function () {
        if (p.q) { var qi = c.querySelector('#q'); if (qi) { qi.value = p.q; qi.dispatchEvent(new Event('input', { bubbles: true })); } }
        if (p.sel) { var el = c.querySelector(p.sel); if (el) el.click(); }
      }, 0);
    }
  }
  /* Logo im Header: immer zurück zum Dashboard – ohne Seitenwechsel, damit es auch im Einzeldatei-Vorschau-Modus funktioniert */
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('.admin-symbol'); if (!l || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!document.querySelector('.side [data-v="dashboard"]')) return;
    e.preventDefault(); setMenu(false);
    if (location.hash.slice(1) === 'dashboard') { if (NX.refresh) NX.refresh(); } else location.hash = 'dashboard';
    window.scrollTo(0, 0);
  });
  document.addEventListener('nx:view', function (e) { onView(e.detail.id, document.getElementById('cnt')); });
  /* Skript kann nach dem ersten Rendern geladen werden: aktuelle Ansicht nachholen */
  var cur = document.querySelector('.side .on[data-v]');
  if (cur) onView(cur.dataset.v, document.getElementById('cnt'));
})();
