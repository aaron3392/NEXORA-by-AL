'use strict';
/* Automatik auf dem Server (ohne Browser): Monatsrechnungen als Entwurf und – wenn eingeschaltet – Zahlungserinnerungen/Mahnungen als Dokumente.
   Es wird nichts versendet; der Administrator prüft und verschickt wie gewohnt. Arbeitet nur auf dem Datenobjekt (leicht testbar). */
const pad = n => String(n).padStart(2, '0');
const viennaToday = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const addMonth = v => { const [y, m, d] = String(v).split('-').map(Number); let ny = y, nm = m + 1; if (nm > 12) { nm = 1; ny++; } const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate(); return ny + '-' + pad(nm) + '-' + pad(Math.min(d, last)); };
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const nextNumber = (p, list, year) => { let n = list.reduce((m, x) => Math.max(m, parseInt(String(x.number || '').split('-').pop()) || 0), 0) + 1, s; const ex = new Set(list.map(x => x.number)); do { s = p + '-' + year + '-' + String(n++).padStart(4, '0'); } while (ex.has(s)); return s; };
const calc = (items, vat, disc) => { const net = (items || []).reduce((s, i) => s + Math.round((+i.qty || 0) * (+i.price || 0)), 0); const d = Math.round(net * (+disc || 0) / 100); const tax = net - d; return tax + Math.round(tax * (+vat || 0) / 100); };
const paid = i => (i.payments || []).reduce((s, p) => s + p.amount, 0);
const open = i => Math.max(0, calc(i.items, i.vat, i.disc) - paid(i));
function nextOrderNumber(db, year) {
  const all = [].concat(db.projects || [], db.projectArchive || [], db.invoices || []), nums = all.map(x => x.orderNumber).filter(Boolean);
  let n = nums.reduce((m, v) => Math.max(m, parseInt(String(v).split('-').pop()) || 0), 0) + 1, v; const used = new Set(nums);
  do { v = 'AUF-' + year + '-' + String(n++).padStart(4, '0'); } while (used.has(v)); return v;
}
function orderNumberFor(db, projectId, year) {
  const p = projectId && ((db.projects || []).find(x => x.id === projectId) || (db.projectArchive || []).find(x => x.id === projectId));
  if (p) { if (!p.orderNumber) { const old = (db.invoices || []).find(i => i.projectId === projectId && i.orderNumber); p.orderNumber = old ? old.orderNumber : nextOrderNumber(db, year); } return p.orderNumber; }
  return nextOrderNumber(db, year);
}
function log(db, text) { db.activity = db.activity || []; db.activity.unshift({ t: Date.now(), text }); db.activity.length = Math.min(db.activity.length, 60); }

function run(db, now = new Date()) {
  const today = viennaToday(now), year = Number(today.slice(0, 4)), s = db.settings || {}, auto = Object.assign({ subscriptions: true, reminders: false }, s.auto || {});
  let changed = false; const made = [];
  db.invoices = db.invoices || []; db.reminders = db.reminders || []; db.subscriptions = db.subscriptions || [];
  if (auto.subscriptions) {
    db.subscriptions.forEach(sub => {
      let guard = 0;
      while (sub && sub.status === 'Aktiv' && sub.nextDate && sub.nextDate <= today && guard++ < 3) {
        const period = sub.nextDate.slice(0, 7); sub.generatedPeriods = Array.isArray(sub.generatedPeriods) ? sub.generatedPeriods : [];
        if (sub.generatedPeriods.includes(period)) { sub.nextDate = addMonth(sub.nextDate); changed = true; continue; }
        const project = (db.projects || []).find(p => p.id === sub.projectId);
        const inv = { id: uid('R'), number: nextNumber('R', db.invoices, year), orderNumber: project ? orderNumberFor(db, project.id, year) : nextOrderNumber(db, year), customerId: sub.customerId, projectId: sub.projectId || '', offerId: '', subscriptionId: sub.id, billingPeriod: period, date: today, due: addDays(today, Number(s.dueDays) || 0), kind: 'Monatsrechnung', items: [{ desc: sub.description || (sub.packageName + ' – ' + period), qty: 1, price: sub.amount }], disc: 0, vat: sub.vat, draft: true, payments: [], timeIds: [], auto: true };
        db.invoices.push(inv); sub.generatedPeriods.push(period); sub.lastInvoiceId = inv.id; sub.nextDate = addMonth(sub.nextDate);
        log(db, 'Automatik: Monatsrechnung ' + inv.number + ' für Vertrag ' + sub.id + ' als Entwurf erstellt'); made.push(inv.number); changed = true;
      }
    });
  }
  if (auto.reminders) {
    const days = s.reminderDays || {}, fees = s.fees || {}, ladder = [['Zahlungserinnerung', 'r'], ['1. Mahnung', 'm1'], ['2. Mahnung', 'm2']];
    db.invoices.filter(i => !i.draft && open(i) > 0 && i.due && i.due < today).forEach(inv => {
      const mine = db.reminders.filter(r => r.invoiceId === inv.id);
      for (let k = 0; k < ladder.length; k++) {
        const [type, key] = ladder[k], have = mine.find(r => r.type === type);
        if (have) { if (!have.due || have.due >= today) return; continue; } /* nächste Stufe erst nach Ablauf der Frist der vorigen */
        const r = { id: uid('M'), invoiceId: inv.id, customerId: inv.customerId, type, number: nextNumber('M', db.reminders, year), date: today, due: addDays(today, Number(days[key]) || 0), fee: Number(fees[key]) || 0, auto: true };
        db.reminders.push(r); log(db, 'Automatik: ' + type + ' ' + r.number + ' für Rechnung ' + inv.number + ' erstellt (nicht versendet)'); made.push(r.number); changed = true; return;
      }
    });
  }
  return { changed, made };
}
module.exports = { run, viennaToday, addMonth, addDays };
