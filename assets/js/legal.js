/* ============================================================================
   RECHTLICHE ANGABEN – hier EINMAL ausfüllen, gilt automatisch für
   Impressum, Datenschutzerklärung und AGB. Die Texte selbst müssen nicht
   mehr geändert werden. Leere Pflichtfelder werden auf den Seiten als
   [Platzhalter] markiert, bis sie ausgefüllt sind.
   ============================================================================ */
window.NX_LEGAL = {
    // ---- PFLICHTANGABEN (bitte ausfüllen) ----
    owner:   '',   // Vollständiger Name des Inhabers, z. B. 'Max Mustermann'
    street:  '',   // Straße und Hausnummer, z. B. 'Musterstraße 1'
    zip:     '',   // Postleitzahl, z. B. '1010'
    city:    '',   // Ort, z. B. 'Wien'
    phone:   '',   // Telefonnummer, z. B. '+43 660 0000000'
    email:   '',   // Kontakt-E-Mail, z. B. 'office@nexora-by-al.at'
    // ---- OPTIONAL (leer lassen, wenn nicht vorhanden – Zeile entfällt dann) ----
    vatId:   '',   // UID-Nummer, z. B. 'ATU12345678'
    register:'',   // Firmenbuchnummer + Gericht, nur wenn im Firmenbuch eingetragen
    website: '',   // Adresse der Website, z. B. 'www.nexora-by-al.at'
    // ---- VORBELEGT (nur ändern, wenn es nicht passt) ----
    company: 'NEXORA by AL',
    country: 'Österreich',
    jurisdiction: 'Wien',   // Gerichtsstand für Unternehmerkunden
    trade: 'Webdesign, Webentwicklung und IT-Dienstleistungen (Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik)',
    chamber: 'Wirtschaftskammer Österreich (WKÖ), Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie (UBIT)',
    authority: 'Magistrat der Stadt Wien (Gewerbebehörde)',
    stand: 'November 2026'
};
(function () {
    var L = window.NX_LEGAL || {};
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var labels = { owner: 'Name des Inhabers', street: 'Straße und Hausnummer', zip: 'PLZ', city: 'Ort', phone: 'Telefonnummer', email: 'E-Mail-Adresse' };
    function run() {
        var missing = {};
        document.querySelectorAll('[data-legal]').forEach(function (el) {
            var k = el.getAttribute('data-legal'), v = (L[k] || '').trim();
            if (v) { el.textContent = v; el.classList.remove('ph'); if (k === 'email') { var a = document.createElement('a'); a.href = 'mailto:' + v; a.textContent = v; el.textContent = ''; el.appendChild(a); } }
            else if (!labels[k] && k !== 'country') { el.textContent = ''; }
            else { el.innerHTML = '<span class="ph">[' + esc(labels[k] || k) + ' ergänzen]</span>'; missing[k] = 1; }
        });
        document.querySelectorAll('[data-legal-opt]').forEach(function (el) {
            if (!(L[el.getAttribute('data-legal-opt')] || '').trim()) el.hidden = true;
        });
        var n = Object.keys(missing).filter(function (k) { return labels[k]; });
        var note = document.getElementById('legal-missing');
        if (note && n.length) { note.hidden = false; note.innerHTML = '<b>Hinweis für den Betreiber (verschwindet automatisch, sobald alles ausgefüllt ist):</b> Bitte in <code>assets/js/legal.js</code> noch ergänzen: ' + n.map(function (k) { return esc(labels[k]); }).join(', ') + '.'; }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
