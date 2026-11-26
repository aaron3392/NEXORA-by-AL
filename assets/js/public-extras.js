/* NEXORA by AL – öffentliche Zusatzfunktionen (nur Darstellung, keine Daten):
   • sanfte Einblend-Animation beim Scrollen (abschaltbar über "Bewegung reduzieren")
   • fester Handy-Button "Projekt anfragen"
   Ohne JavaScript bleibt die Seite vollständig sichtbar. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Startseiten-Aufrufe lokal zählen (nicht, solange der Administrator angemeldet ist) */
  try {
    var pgName = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (window.NX && NX.stats && pgName === 'index.html' && !(NX.sess && NX.sess.get('admin'))) NX.stats.bump('visits');
  } catch (e) { /* ignorieren */ }
  var main = document.getElementById('main') || document.querySelector('main');
  if (!main) return;

  /* ---------- Einblenden beim Scrollen ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('nx-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    var seen = new WeakSet();
    var scan = function () {
      main.querySelectorAll('.nx-head, .nx-card, .nx-step, .nx-trust li, .nx-faq details, .nx-cta-panel, .nx-split > *').forEach(function (el) {
        if (seen.has(el) || el.closest('.nx-hero')) return;
        seen.add(el);
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return; /* schon sichtbar: nicht verstecken */
        el.classList.add('nx-rv');
        io.observe(el);
      });
    };
    scan();
    var t;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 60); }).observe(main, { childList: true, subtree: true });
    window.addEventListener('load', scan);
  }

  /* ---------- Fester Handy-Button ---------- */
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var show = ['', 'index.html', 'leistungen.html', 'projekte.html', 'ueber-uns.html'].indexOf(page) > -1;
  if (show) {
    var bar = document.createElement('div');
    bar.className = 'nx-sticky';
    bar.innerHTML = '<a class="btn nx-btn-primary" href="' + (document.body.dataset.base || '') + 'anfrage.html">Projekt anfragen</a>';
    document.body.appendChild(bar);
    var hero = main.querySelector('.nx-hero');
    var cta = main.querySelector('.nx-sec-cta');
    var upd = function () {
      var y = window.scrollY, past = y > (hero ? hero.offsetHeight * 0.7 : 240);
      var atCta = false;
      if (cta) { var r = cta.getBoundingClientRect(); atCta = r.top < window.innerHeight * 0.9; }
      bar.classList.toggle('on', past && !atCta);
    };
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ---------- Leistungen: Kategorie-Filter ---------- */
  var CATS = {
    'Web': ['Individuelles Webdesign', 'Responsive Unternehmenswebsites', 'Webentwicklung und Webanwendungen'],
    'Software & Apps': ['Kundenportale', 'Admin-Dashboards und Verwaltungssysteme', 'Individuelle Softwarelösungen', 'Mobile Apps für iOS und Android', 'Automatisierungen und digitale Geschäftsprozesse', 'Individuelle Vertriebs- und Unternehmenssysteme'],
    'Betreuung': ['Hosting und technische Betreuung', 'Wartung, Updates und Support']
  };
  var svcPage = (location.pathname.split('/').pop() || '').toLowerCase() === 'leistungen.html';
  var svc = svcPage && document.getElementById('svc');
  if (svc) {
    var fbar = document.createElement('div');
    fbar.className = 'nx-filter'; fbar.setAttribute('role', 'group'); fbar.setAttribute('aria-label', 'Leistungen filtern');
    fbar.innerHTML = ['Alle'].concat(Object.keys(CATS)).map(function (c, i) {
      return '<button type="button" class="nx-chip' + (i ? '' : ' on') + '" data-c="' + (i ? c : '') + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + c + '</button>';
    }).join('');
    svc.parentNode.insertBefore(fbar, svc);
    var cur = '';
    var apply = function () {
      svc.querySelectorAll('.nx-card').forEach(function (card) {
        var h = card.querySelector('h3'), t = h ? h.textContent.trim() : '';
        card.hidden = !!cur && (CATS[cur] || []).indexOf(t) < 0;
      });
    };
    fbar.onclick = function (e) {
      var b = e.target.closest('.nx-chip'); if (!b) return;
      cur = b.dataset.c;
      fbar.querySelectorAll('.nx-chip').forEach(function (c) { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); });
      apply();
    };
    new MutationObserver(apply).observe(svc, { childList: true });
  }

  /* ---------- Ablauf-Zeitleiste füllt sich beim Scrollen ---------- */
  var steps = document.getElementById('steps');
  if (steps) {
    var setP = function () {
      var r = steps.getBoundingClientRect(), h = window.innerHeight;
      var p = reduce ? 1 : Math.max(0, Math.min(1, (h * 0.75 - r.top) / Math.max(1, r.height + h * 0.2)));
      steps.style.setProperty('--p', p.toFixed(3));
      var items = steps.querySelectorAll('.nx-step');
      items.forEach(function (it, i) { it.classList.toggle('nx-done', (i + 0.5) / items.length <= p + 0.04); });
    };
    window.addEventListener('scroll', setP, { passive: true }); window.addEventListener('resize', setP);
    new MutationObserver(setP).observe(steps, { childList: true }); setP();
  }
})();
