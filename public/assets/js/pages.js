/* NEXORA by AL – öffentliche Seiten: Inhalte, Kontakt- und Anfrageformular */
(function () {
    'use strict';
    const NX = window.NX, esc = NX.esc;
    const SERVICES = [
        ['Individuelles Webdesign', 'Gestaltung, die Ihre Marke sichtbar macht – klar, modern und auf Ihre Zielgruppe zugeschnitten.'],
        ['Responsive Unternehmenswebsites', 'Websites, die auf Desktop, Tablet und Smartphone gleichermaßen überzeugen.'],
        ['Webentwicklung und Webanwendungen', 'Individuelle Anwendungen im Browser – von der Idee bis zum laufenden Betrieb.'],
        ['Kundenportale', 'Geschützte Bereiche, in denen Ihre Kunden Dokumente, Projekte und Anfragen einsehen.'],
        ['Admin-Dashboards und Verwaltungssysteme', 'Übersichtliche Oberflächen zur Verwaltung von Daten, Abläufen und Kennzahlen.'],
        ['Individuelle Softwarelösungen', 'Maßgeschneiderte Software für Prozesse, die Standardprodukte nicht abdecken.'],
        ['Mobile Apps für iOS und Android', 'Apps für beide Plattformen, abgestimmt auf Ihre Nutzer und Ziele.'],
        ['Automatisierungen und digitale Geschäftsprozesse', 'Wiederkehrende Aufgaben automatisieren und Abläufe digital abbilden.'],
        ['Individuelle Vertriebs- und Unternehmenssysteme', 'Systeme für Angebote, Rechnungen, Kunden und Zusammenarbeit.'],
        ['Hosting und technische Betreuung', 'Zuverlässiger Betrieb Ihrer Website oder Anwendung mit technischer Begleitung.'],
        ['Wartung, Updates und Support', 'Laufende Pflege, Aktualisierungen und ein Ansprechpartner bei Fragen.']
    ];
    const STEPS = [['Erstkontakt', 'Sie schildern Ihr Vorhaben über Anfrage oder Kontaktformular.'], ['Beratung & Angebot', 'Wir klären Umfang und Ziele und erstellen ein Angebot.'], ['Konzept & Design', 'Struktur und Gestaltung werden abgestimmt.'], ['Umsetzung', 'Entwicklung mit regelmäßigen Zwischenständen.'], ['Prüfung & Übergabe', 'Tests, Feinschliff und Fertigstellung.'], ['Betreuung', 'Wartung, Updates und Support nach dem Start.']];
    const WHY = [['Persönlich', 'Ein fester Ansprechpartner von der Anfrage bis zur Betreuung.'], ['Modern', 'Saubere Technik, klares Design, durchdachte Bedienung.'], ['Transparent', 'Nachvollziehbare Angebote, Rechnungen und Projektstände im Kundenportal.'], ['Langfristig', 'Wartung und Support, damit Ihre Lösung aktuell bleibt.']];
    /* Darstellung: Icons und Vorteile (rein visuell – die Schlüssel in SERVICES/groups bleiben unverändert) */
    const ic = p => `<svg class="nx-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const ICONS = [
        '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>',
        '<rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6M9 15v4"/><rect x="17" y="8" width="5" height="10" rx="1.5"/>',
        '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13.5 5l-3 14"/>',
        '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3M12 15v2"/>',
        '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 17v-5M12 17V8M16 17v-3"/>',
        '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
        '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
        '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
        '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
        '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
        '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
    ].map(ic);
    const WHYICON = ['<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>', '<path d="M12 3l2.4 5.6L20 9.5l-4.2 3.9L17 20l-5-3-5 3 1.2-6.6L4 9.5l5.6-.9z"/>', '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', '<path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/>'].map(ic);
    const FEATURES = [
        ['Individuelles Design statt Standardvorlage', 'Abgestimmt auf Marke und Zielgruppe', 'Klare Struktur und gute Lesbarkeit'],
        ['Darstellung auf Desktop, Tablet und Smartphone', 'Funktionen wie Kontaktformular oder Blog', 'Inhalte und Bilder nach Absprache'],
        ['Abläufe digital im Browser abbilden', 'Rollen, Rechte und Datenverwaltung', 'Schnittstellen zu anderer Software'],
        ['Geschützter Bereich für Ihre Kunden', 'Dokumente, Rechnungen und Projekte an einem Ort', 'Anfragen und Nachrichten nachvollziehbar'],
        ['Daten und Kennzahlen auf einen Blick', 'Benutzer und Rechte verwalten', 'Berichte und Exporte, z. B. PDF oder CSV'],
        ['Passt zu Ihren Prozessen', 'Klare Bedienung für Ihr Team', 'Anbindung an bestehende Systeme'],
        ['Für iOS und Android', 'Kernfunktionen nach Ihrem Konzept', 'Optional mit Web-Admin'],
        ['Wiederkehrende Aufgaben automatisieren', 'Auslöser und Abläufe definieren', 'Sonderfälle werden berücksichtigt'],
        ['Angebote, Rechnungen und Kunden an einem Ort', 'Abläufe und Freigaben abbilden', 'Auswertungen und Berichte'],
        ['Zuverlässiger Betrieb', 'Technische Begleitung', 'Umzug, Backups und Monitoring nach Bedarf'],
        ['Laufende Pflege und Updates', 'Ein Ansprechpartner bei Fragen', 'Support im vereinbarten Umfang']
    ];
    const EXAMPLES = ['Unternehmenswebsite, Landingpage, Portfolio', 'Seiten, Formulare, Mehrsprachigkeit', 'Dashboard, Verwaltung, Suche, Export', 'Upload, Download, Freigaben', 'Kunden, Aufträge, Mitarbeiter', 'Prozesse, die Standardsoftware nicht abdeckt', 'iOS, Android oder beide', 'Abläufe, Auslöser, Benachrichtigungen', 'CRM, Angebote, Rechnungen, Aufträge', 'Umzug, Backups, Monitoring, Updates', 'Updates, Pflege, Support'];
    const ARROW = '<svg class="nx-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const CHECK = '<svg class="nx-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
    const catIcon = c => { c = String(c || '').toLowerCase(); return ICONS[/app/.test(c) && /mobil|ios|android/.test(c) ? 6 : /portal/.test(c) ? 3 : /anwendung|web-?app|software/.test(c) ? 2 : /design|website|web/.test(c) ? 0 : /automat|prozess/.test(c) ? 7 : /host|betreu|wartung/.test(c) ? 9 : 5]; };
    NX.ready.then(() => {
        NX.layout();
        const S = NX.db.settings, put = (id, h) => { const e = NX.$('#' + id); if (e)
            e.innerHTML = h; };
        const svcBox = NX.$('#svc'), lim = svcBox ? +svcBox.dataset.limit || 99 : 0, detail = !!(svcBox && svcBox.dataset.btn);
        put('svc', SERVICES.slice(0, lim).map((s, i) => detail
            ? `<article class="nx-card nx-service"><div class="nx-ico-box">${ICONS[i]}</div><h3>${s[0]}</h3>${(S.servicePrices && NX.priceText(S.servicePrices[s[0]])) ? `<p class="nx-from">${esc(NX.priceText(S.servicePrices[s[0]]))}</p>` : ''}<p>${s[1]}</p><ul class="nx-list">${FEATURES[i].map(f => `<li>${CHECK}<span>${f}</span></li>`).join('')}</ul><p class="nx-ex"><b>Beispiele:</b> ${EXAMPLES[i]}</p><a class="btn sm nx-btn-line" href="anfrage.html?service=${encodeURIComponent(s[0])}">Anfragen ${ARROW}</a></article>`
            : `<a class="nx-card nx-service nx-service-link" href="leistungen.html"><div class="nx-ico-box">${ICONS[i]}</div><h3>${s[0]}</h3><p>${s[1]}</p><span class="nx-more">Mehr erfahren ${ARROW}</span></a>`).join(''));
        put('why', WHY.map((s, i) => `<div class="nx-card nx-why"><div class="nx-ico-box">${WHYICON[i]}</div><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join(''));
        put('steps', STEPS.map((s, i) => `<div class="nx-step"><span class="nx-step-no">${i + 1}</span><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join(''));
        const pk = x => `<div class="nx-card nx-pack"><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p><p class="nx-price">${x.price ? esc(x.price) : 'Preis auf Anfrage'}</p><a class="btn sm nx-btn-line" href="anfrage.html">Anfragen ${ARROW}</a></div>`;
        put('pk', S.packages.map(pk).join(''));
        put('hs', S.hosting.map(pk).join(''));
        const scBox = NX.$('#sc');
        if (scBox) {
            const list = Array.isArray(S.showcase) ? S.showcase : [], max = +scBox.dataset.limit || 999;
            const card = (p, i) => `<article class="nx-card nx-proj" data-cat="${esc(p.cat)}"><div class="nx-proj-cover"><span class="nx-proj-ico">${catIcon(p.cat)}</span><span class="nx-proj-cat">${esc(p.cat)}</span></div><div class="nx-proj-body"><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="nx-proj-foot"><span class="b">${esc(p.status)}</span><button type="button" class="nx-link" data-proj="${i}">Details ${ARROW}</button></div></div></article>`;
            const draw = cat => { scBox.innerHTML = list.map((p, i) => [p, i]).filter(x => !cat || x[0].cat === cat).slice(0, max).map(x => card(x[0], x[1])).join('') || '<p class="mut">Noch keine Projekte hinterlegt.</p>'; };
            const bar = NX.$('#scf');
            if (bar) {
                const cats = [...new Set(list.map(p => p.cat).filter(Boolean))];
                bar.innerHTML = cats.length > 1 ? ['Alle'].concat(cats).map((c, i) => `<button type="button" class="nx-chip${i ? '' : ' on'}" data-cat="${i ? esc(c) : ''}" aria-pressed="${i ? 'false' : 'true'}">${esc(c)}</button>`).join('') : '';
                bar.onclick = e => { const x = e.target.closest('[data-cat]'); if (!x)
                    return; bar.querySelectorAll('.nx-chip').forEach(c => { c.classList.toggle('on', c === x); c.setAttribute('aria-pressed', c === x); }); draw(x.dataset.cat); };
            }
            draw('');
            scBox.onclick = e => { const x = e.target.closest('[data-proj]'); if (!x)
                return; const p = list[+x.dataset.proj]; if (!p)
                return; NX.modal(p.name, `<p><span class="b">${esc(p.cat)}</span> <span class="b">${esc(p.status)}</span></p><p>${esc(p.desc)}</p><div class="acts"><a class="btn" href="anfrage.html">Ähnliches Projekt anfragen</a></div>`); };
        }
        const sel = NX.$('#svsel');
        if (sel) {
            sel.innerHTML = '<option value="">– bitte wählen –</option>' + SERVICES.map(s => `<option>${s[0]}</option>`).join('');
            const q = new URLSearchParams(location.search).get('service');
            if (q)
                sel.value = q;
        }
        const f = NX.$('#pf');
        if (f)
            form(f);
    });
    function form(f) {
        const kind = f.dataset.kind, box = NX.$('#fs');
        const c = NX.cust((NX.sess.get('customer') || {}).user);
        if (c) {
            ['first', 'last', 'email', 'phone', 'company', 'street', 'no', 'zip', 'city', 'country', 'vatId'].forEach(k => { if (f.elements[k] && (c[k] || !f.elements[k].defaultValue)) f.elements[k].value = c[k] || ''; });
            box.textContent = 'Ihre Kundendaten wurden aus dem Kundenportal übernommen.';
        }
        /* Reparatur: Das Kontaktformular besitzt keine Konfigurator-Felder (service, Zahlungsmodell, Pakete). */
        if (kind === 'kontakt' || !f.elements.service) { contactForm(f, c, box); return; }
        const detailBox = NX.$('#service-details', f), monthly = NX.$('#monthly-options', f), packageSelect = NX.$('#monthlyPackage', f), packageInfo = NX.$('#package-info', f) || document.createElement('div');
        const field = (name, label, type='text', placeholder='') => `<div class="field"><label>${label}</label>${type === 'textarea' ? `<textarea name="detail_${name}" rows="2" placeholder="${esc(placeholder)}"></textarea>` : `<input name="detail_${name}" type="${type}" placeholder="${esc(placeholder)}">`}</div>`;
        const check = (name, label) => `<label class="card" style="display:block;margin:6px 0"><input type="checkbox" name="detail_${name}" value="Ja"> ${label}</label>`;
        const groups = {
            'Individuelles Webdesign': `<p>Design, Markenauftritt und Inhalte</p>${field('website_type','Website-Typ','text','Unternehmenswebsite, Landingpage, Portfolio …')}${field('pages','Gewünschte Seiten / Unterseiten','text','z. B. Startseite, Über uns, Leistungen, Kontakt')}${field('audience','Zielgruppe','textarea','Wen möchten Sie erreichen?')}${field('style','Designvorstellungen / Referenzseiten','textarea','Links, Farben, Stilrichtung …')}${check('logo','Logo vorhanden')}${check('texts','Texte vorhanden')}${check('images','Bilder vorhanden')}`,
            'Responsive Unternehmenswebsites': `<p>Umfang und Funktionen der Website</p>${field('pages','Seiten und Unterseiten','textarea','Bitte alle gewünschten Seiten nennen')}${field('features','Benötigte Funktionen','textarea','Kontaktformular, Blog, Mehrsprachigkeit, Newsletter …')}${field('domain','Domain vorhanden?','text','Domain oder gewünschter Name')}${field('existing_site','Bestehende Website','text','URL, falls vorhanden')}${field('content','Wer liefert Texte und Bilder?','text','Ich / NEXORA / gemeinsam')}${field('integrations','Externe Einbindungen','textarea','Karten, Social Media, Analytics, Buchung …')}`,
            'Webentwicklung und Webanwendungen': `<p>Funktionen und technische Anforderungen</p>${field('workflow','Welcher Ablauf soll digitalisiert werden?','textarea')}${field('users','Benutzergruppen und Rollen','textarea','z. B. Admin, Mitarbeiter, Kunden')}${field('modules','Benötigte Module','textarea','Dashboard, Verwaltung, Suche, Export …')}${field('data','Daten und Dateien','textarea','Welche Daten werden gespeichert oder hochgeladen?')}${field('integrations','Schnittstellen','textarea','Andere Software, APIs, Zahlungsanbieter …')}${field('security','Zugriff und Sicherheit','textarea','Login, Rechte, Protokollierung …')}`,
            'Kundenportale': `<p>Kundenkonto und Portalbereiche</p>${field('roles','Benutzerrollen','textarea','Kunden, Mitarbeiter, Administratoren …')}${field('portal_sections','Portalbereiche','textarea','Dokumente, Rechnungen, Projekte, Nachrichten …')}${field('registration','Registrierung und Anmeldung','text','Einladung, Selbstregistrierung …')}${field('uploads','Datei- und Dokumentfunktionen','textarea','Upload, Download, Freigaben …')}${field('notifications','Benachrichtigungen','textarea','E-Mail, Statusmeldungen …')}`,
            'Admin-Dashboards und Verwaltungssysteme': `<p>Interne Verwaltung und Arbeitsabläufe</p>${field('areas','Zu verwaltende Bereiche','textarea','Kunden, Aufträge, Lager, Mitarbeiter …')}${field('metrics','Kennzahlen und Auswertungen','textarea')}${field('roles','Benutzer und Rechte','textarea')}${field('automation','Automatisierungen','textarea')}${field('exports','Berichte und Exporte','textarea','PDF, Excel, CSV …')}`,
            'Individuelle Softwarelösungen': `<p>Problemstellung und gewünschte Lösung</p>${field('problem','Welches Problem soll gelöst werden?','textarea')}${field('process','Aktueller Ablauf','textarea')}${field('target','Gewünschter Ablauf','textarea')}${field('users','Nutzergruppen','textarea')}${field('systems','Bestehende Systeme / Schnittstellen','textarea')}`,
            'Mobile Apps für iOS und Android': `<p>App-Konzept</p>${field('platforms','Plattformen','text','iOS, Android oder beide')}${field('audience','Zielgruppe und Nutzerzahl','textarea')}${field('screens','Gewünschte App-Bereiche / Screens','textarea')}${field('features','Kernfunktionen','textarea')}${field('accounts','Benutzerkonten / Anmeldung','text')}${field('backend','Benötigtes Backend oder Web-Admin','textarea')}`,
            'Automatisierungen und digitale Geschäftsprozesse': `<p>Automatisierung</p>${field('process','Welcher Prozess soll automatisiert werden?','textarea')}${field('trigger','Auslöser und Ablauf','textarea')}${field('systems','Beteiligte Programme / Dienste','textarea')}${field('volume','Häufigkeit und Umfang','text')}${field('exceptions','Ausnahmen und Sonderfälle','textarea')}`,
            'Individuelle Vertriebs- und Unternehmenssysteme': `<p>Unternehmenssystem</p>${field('modules','Benötigte Bereiche','textarea','CRM, Angebote, Rechnungen, Aufträge …')}${field('workflow','Abläufe und Freigaben','textarea')}${field('roles','Mitarbeiter und Berechtigungen','textarea')}${field('reports','Auswertungen und Berichte','textarea')}${field('migration','Bestehende Daten übernehmen?','text')}`,
            'Hosting und technische Betreuung': `<p>Bestehende Infrastruktur</p>${field('domain','Domain / Website','text')}${field('provider','Aktueller Hostinganbieter','text')}${field('stack','Technik / CMS / Software','text')}${field('needs','Benötigte Leistungen','textarea','Umzug, Backups, Monitoring, Updates …')}`,
            'Wartung, Updates und Support': `<p>Betreuungsbedarf</p>${field('system','Zu betreuende Website / Anwendung','text')}${field('stack','Technik / CMS','text')}${field('tasks','Gewünschte Wartungsarbeiten','textarea')}${field('support','Gewünschter Supportumfang','textarea','Erreichbarkeit, Reaktionszeit …')}`
        };
        const renderDetails = () => { const service = f.elements.service.value; detailBox.innerHTML = `<h3>Details: ${esc(service || 'Projektdetails')}</h3>` + (groups[service] || '<p class="mut">Bitte wählen Sie eine Dienstleistung, um die passenden Detailfragen zu sehen.</p>'); };
        f.elements.service.addEventListener('change', renderDetails); renderDetails();
        const renderPackages = () => {
            // Originalindex beibehalten: leere/entfernte Einträge dürfen die Auswahl
            // nicht auf ein anderes Paket verschieben.
            const packages = NX.db.settings.packages || [];
            packageSelect.innerHTML = '<option value="">Bitte Paket wählen</option>' + packages.map((p, index) => p && p.name
                ? `<option value="${index}">${esc(p.name)}${p.price ? ' – ' + esc(p.price) : ''}</option>`
                : '').join('');
        };
        renderPackages();
        const updatePaymentOptions = () => {
            const isMonthly = f.elements.paymentModel.value === 'monatlich';
            monthly.hidden = !isMonthly;
            packageSelect.required = isMonthly;
            if (!isMonthly) {
                packageSelect.value = '';
                packageInfo.textContent = '';
            }
        };
        f.querySelectorAll('[name="paymentModel"]').forEach(r => r.addEventListener('change', updatePaymentOptions));
        const phoneStar = () => { const st = NX.$('#phone-req', f); if (st && f.elements.contactPref) st.hidden = f.elements.contactPref.value === 'E-Mail'; };
        if (f.elements.contactPref) { f.elements.contactPref.addEventListener('change', phoneStar); phoneStar(); }
        updatePaymentOptions();
        packageSelect.addEventListener('change', () => {
            const p = (NX.db.settings.packages || [])[Number(packageSelect.value)];
            packageInfo.textContent = p ? [p.desc, p.support ? 'Support: ' + p.support : '', p.price ? 'Preis: ' + p.price : ''].filter(Boolean).join(' | ') : '';
        });
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            const needPhone = f.elements.contactPref && f.elements.contactPref.value !== 'E-Mail';
            /* Pflicht nur, was für die Umsetzung nötig ist: Name, E-Mail, Leistung, Titel, Beschreibung, Budget, Zeitrahmen, Datenschutz (Telefon nur bei Wunsch nach Rückruf/Telefon) */
            const rules = { first: ['req'], last: ['req'], email: ['req', 'email'], phone: needPhone ? ['req'] : [], message: ['req'], privacy: ['req'], service: ['req'], subject: ['req'], budget: ['req'], timeframe: ['req'] };
            if (!NX.check(f, rules)) { box.textContent = 'Bitte prüfen Sie die markierten Felder.'; return; }
            const x = NX.fd(f), D = NX.db, selectedPackage = x.paymentModel === 'monatlich' ? (D.settings.packages || [])[Number(x.monthlyPackage)] : null;
            if (x.paymentModel === 'monatlich' && !selectedPackage) { box.textContent = 'Bitte wählen Sie ein monatliches Paket.'; return; }
            const details = Object.fromEntries(Object.entries(x).filter(([k]) => k.startsWith('detail_')).map(([k,v]) => [k.replace('detail_',''), v]));
            const i = { id: NX.nextId('A', D.inquiries), date: NX.today(), first: x.first.trim(), last: x.last.trim(), email: x.email.trim(), phone: (x.phone || '').trim(), company: (x.company || '').trim(), street: (x.street || '').trim(), no: (x.no || '').trim(), zip: (x.zip || '').trim(), city: (x.city || '').trim(), country: (x.country || '').trim(), vatId: (x.vatId || '').trim(), contactPref: x.contactPref || '', wishDate: x.wishDate || '', subject: x.subject.trim(), service: x.service || '', message: x.message.trim(), features: '', budget: x.budget || '', timeframe: x.timeframe || '', projectDetails: details, paymentModel: x.paymentModel || 'einmalig', monthlyPackage: selectedPackage ? selectedPackage.name : '', monthlyPrice: selectedPackage ? selectedPackage.price : '', packageDescription: selectedPackage ? selectedPackage.desc : '', packageSupport: selectedPackage ? (selectedPackage.support || '') : '', hostingModel: x.hostingModel || 'nexora', hostingNotes: x.hostingNotes || '', status: 'Neu', notes: x.extra ? 'Zusatz: ' + x.extra : '', customerId: c ? c.id : null, projectId: null, source: 'Anfrage' };
            D.inquiries.push(i); NX.save(); NX.log('Neue Projektanfrage: ' + i.subject);
            const detailText = Object.entries(details).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
            const r = await NX.formsubmit({ _subject: '[Projektanfrage] ' + i.subject, Name: i.first + ' ' + i.last, Firma: i.company, Adresse: i.street + ' ' + i.no + ', ' + i.zip + ' ' + i.city + ', ' + i.country, UID: i.vatId, Kontaktweg: i.contactPref, Wunschtermin: i.wishDate, email: i.email, Telefon: i.phone, Leistung: i.service, Projektdetails: detailText, Beschreibung: i.message, Zahlungsmodell: i.paymentModel, Monatspaket: i.monthlyPackage, Monatspreis: i.monthlyPrice, Support: i.packageSupport, Hosting: i.hostingModel, Hostingdetails: i.hostingNotes, Budget: i.budget, Zeitrahmen: i.timeframe, Zusatz: x.extra || '' });
            NX.mailLog(NX.db.settings.formsubmit || '(nicht konfiguriert)', i.subject, 'Projektanfrage', r.ok ? 'an FormSubmit übergeben' : 'nur lokal gespeichert');
            box.innerHTML = '<b>Vielen Dank! Ihre Projektanfrage wurde gespeichert.</b> ' + (r.ok ? '' : esc(r.msg)); f.reset(); monthly.hidden = true; packageInfo.textContent = ''; renderDetails();
            if (c) ['first','last','email','phone','company','street','no','zip','city','country','vatId'].forEach(k => { if (f.elements[k] && (c[k] || !f.elements[k].defaultValue)) f.elements[k].value = c[k] || ''; });
        });
    }
    /* Kontaktformular: speichert die Nachricht lokal als Anfrage (Quelle „Kontakt“) und übergibt sie an FormSubmit. */
    function contactForm(f, c, box) {
        const prefill = () => { if (c)
            ['first', 'last', 'email', 'phone'].forEach(k => { if (f.elements[k])
                f.elements[k].value = c[k] || ''; }); };
        f.onsubmit = NX.guard(async (e) => {
            e.preventDefault();
            if (!NX.check(f, { first: ['req'], last: ['req'], email: ['req', 'email'], subject: ['req'], message: ['req'], privacy: ['req'] })) {
                box.textContent = 'Bitte prüfen Sie die markierten Felder.';
                return;
            }
            const x = NX.fd(f), D = NX.db;
            const i = { id: NX.nextId('A', D.inquiries), date: NX.today(), first: x.first.trim(), last: x.last.trim(), email: x.email.trim(), phone: (x.phone || '').trim(), subject: x.subject.trim(), service: '', message: x.message.trim(), features: '', budget: '', timeframe: '', projectDetails: {}, paymentModel: '', monthlyPackage: '', monthlyPrice: '', packageDescription: '', packageSupport: '', hostingModel: '', hostingNotes: '', status: 'Neu', notes: '', customerId: c ? c.id : null, projectId: null, source: 'Kontakt' };
            D.inquiries.push(i);
            NX.save();
            NX.log('Neue Kontaktnachricht: ' + i.subject);
            const r = await NX.formsubmit({ _subject: '[Kontakt] ' + i.subject, Name: i.first + ' ' + i.last, email: i.email, Telefon: i.phone, Nachricht: i.message });
            NX.mailLog(NX.db.settings.formsubmit || '(nicht konfiguriert)', i.subject, 'Kontaktnachricht', r.ok ? 'an FormSubmit übergeben' : 'nur lokal gespeichert');
            box.innerHTML = '<b>Vielen Dank! Ihre Nachricht wurde gespeichert.</b> ' + esc(r.msg);
            f.reset();
            prefill();
        });
    }
})();
