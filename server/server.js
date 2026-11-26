'use strict';
/* NEXORA by AL – Server. Speichert die Daten in Postgres (Tabelle kv), prüft Anmeldungen serverseitig
   und liefert je nach Rolle (Admin / Kunde / Besucher) nur die erlaubten Daten. Die Webseite selbst liegt in ./public. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { Pool } = require('pg');
const automation = require('./automation');
const PORT = process.env.PORT || 3000, ROOT = path.join(__dirname, 'public'), DBKEY = 'nx_db_v1', SESSION_MS = 8 * 36e5;
/* Betriebsart: "public" (Webseite + Kundenportal, ohne Admin), "admin" (nur Administration) oder "all" (alles in einer App). Beide Apps teilen sich dieselbe Datenbank. */
const MODE = ['public', 'admin'].includes(process.env.NX_MODE) ? process.env.NX_MODE : 'all', PUBLIC_URL = String(process.env.NX_PUBLIC_URL || '').replace(/\/$/, '');
const ADMIN_KV = /^(nx_accounting_v1|nexora_cal_reminders)$/, STAT_KV = /^nexora_stat_(visits|logins)$/;

let pool;
function mkPool(ssl) { return new Pool({ connectionString: process.env.DATABASE_URL, ssl: ssl ? { rejectUnauthorized: false } : false, max: 5 }); }
async function initDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt');
  for (const ssl of [false, true]) {
    try { pool = mkPool(ssl); await pool.query('select 1'); break; }
    catch (e) { if (ssl) throw e; try { await pool.end(); } catch (x) { } }
  }
  await pool.query('create table if not exists kv (key text primary key, value jsonb not null, rev bigint not null default 1, updated_at timestamptz not null default now())');
  await pool.query('create table if not exists sessions (token text primary key, role text not null, uid text not null, exp bigint not null)');
  await pool.query('alter table sessions add column if not exists ph text');
  await pool.query('create table if not exists backups (id bigserial primary key, created_at timestamptz not null default now(), kind text not null, data jsonb not null)');
  await pool.query('create table if not exists files (id text primary key, owner text not null, name text not null, mime text not null, size integer not null, data bytea not null, created_at timestamptz not null default now(), uploaded_by text)');
}
async function kvGet(k) { const r = await pool.query('select value, rev from kv where key=$1', [k]); return r.rows[0] || null; }
async function kvPut(k, v) { const r = await pool.query('insert into kv(key,value,rev) values($1,$2,1) on conflict(key) do update set value=excluded.value, rev=kv.rev+1, updated_at=now() returning rev', [k, JSON.stringify(v)]); return Number(r.rows[0].rev); }


/* ---------- Passwörter: der Browser sendet nur einen Hash; auf dem Server wird dieser zusätzlich mit scrypt gesichert ("s1$salt$hash") ---------- */
const isSecured = h => typeof h === 'string' && h.startsWith('s1$');
function secure(clientHash) { const salt = crypto.randomBytes(16).toString('hex'); return 's1$' + salt + '$' + crypto.scryptSync(String(clientHash), salt, 32).toString('hex'); }
function verifyPw(stored, clientHash) {
  if (!stored || !clientHash) return false;
  if (!isSecured(stored)) return safeEq(stored, clientHash);
  const [, salt, hex] = stored.split('$'); return safeEq(crypto.scryptSync(String(clientHash), salt, 32).toString('hex'), hex);
}
const ADMINS = 'nx_admins';
/* Mitarbeiter-Rechte: je Bereich lesbare (r) und beschreibbare (w) Datenfelder sowie Zusatzdaten (kv). Administratoren dürfen alles. */
const AREAS = {
  anfragen: { r: ['inquiries'], w: ['inquiries'] },
  kalender: { r: ['inquiries', 'projects'], w: [], kv: ['nexora_cal_reminders'] },
  projekte: { r: ['projects', 'projectArchive', 'support', 'reviews'], w: ['projects', 'projectArchive', 'support', 'reviews'] },
  verrechnung: { r: ['offers', 'invoices', 'reminders', 'subscriptions', 'projects', 'projectArchive', 'time'], w: ['offers', 'invoices', 'reminders', 'subscriptions'] },
  buchhaltung: { r: ['invoices'], w: [], kv: ['nx_accounting_v1'] },
  finanzen: { r: ['offers', 'invoices', 'reminders', 'subscriptions', 'projects', 'projectArchive', 'time'], w: [] },
  zeiterfassung: { r: ['time', 'projects', 'projectArchive'], w: ['time'] },
  kunden: { r: ['customers', 'chat'], w: ['customers', 'chat'] },
  einstellungen: { r: ['settings'], w: ['settings'] }
};
const cleanPerms = p => (isArr(p) ? p : []).filter((x, i, a) => AREAS[x] && a.indexOf(x) === i);
const isStaff = s => s && (s.role === 'admin' || s.role === 'employee');
const canArea = (s, a) => s && (s.role === 'admin' || (s.role === 'employee' && (s.perms || []).includes(a)));
async function getAdmins() { const r = await kvGet(ADMINS); return r && isArr(r.value) ? r.value : []; }
const adminName = a => String(a.user).toLowerCase();

/* ---------- Hilfsfunktionen ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const isArr = Array.isArray, isObj = o => o && typeof o === 'object' && !isArr(o);
const safeEq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
function readBody(req, max = 12e6) {
  return new Promise((ok, no) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > max) { no(Object.assign(new Error('zu groß'), { code: 413 })); req.destroy(); } else ch.push(c); }); req.on('end', () => { try { ok(ch.length ? JSON.parse(Buffer.concat(ch).toString('utf8')) : {}); } catch (e) { no(Object.assign(new Error('JSON ungültig'), { code: 400 })); } }); req.on('error', no); });
}
function readRaw(req, max) {
  return new Promise((ok, no) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > max) { no(Object.assign(new Error('Datei zu groß'), { code: 413 })); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });
}
function send(res, code, obj, extra) { const b = JSON.stringify(obj); res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {})); res.end(b); }
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a[0]).map(a => [a[0], decodeURIComponent(a.slice(1).join('='))]));
const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const hits = new Map();
function limited(key, max, ms) { const n = Date.now(), a = (hits.get(key) || []).filter(t => n - t < ms); hits.set(key, a); return a.length >= max; }
function hit(key) { const a = hits.get(key) || []; a.push(Date.now()); hits.set(key, a); }
setInterval(() => { const n = Date.now(); hits.forEach((a, k) => { const f = a.filter(t => n - t < 36e5); f.length ? hits.set(k, f) : hits.delete(k); }); }, 6e5).unref();

async function session(req) {
  const t = cookies(req).nx_sid; if (!t) return { role: 'none' };
  const r = await pool.query('select role, uid, exp, ph from sessions where token=$1', [t]);
  const s = r.rows[0]; if (s && ((MODE === 'public' && (s.role === 'admin' || s.role === 'employee')) || (MODE === 'admin' && s.role !== 'admin' && s.role !== 'employee'))) return { role: 'none' };
  if (!s || Number(s.exp) < Date.now()) { if (s) pool.query('delete from sessions where token=$1', [t]).catch(() => { }); return { role: 'none' }; }
  if (s.role === 'admin' || s.role === 'employee') {   /* Konto muss noch existieren und darf nicht gesperrt sein; Rechte stammen immer aus dem aktuellen Konto */
    const a = (await getAdmins()).find(x => adminName(x) === String(s.uid).toLowerCase());
    if (!a || a.status === 'gesperrt') return { role: 'none' };
    const role = a.role === 'employee' ? 'employee' : 'admin';
    return { role, uid: a.user, name: a.name || '', token: t, ph: s.ph || '', perms: role === 'employee' ? cleanPerms(a.perms) : null };
  }
  return { role: s.role, uid: s.uid, token: t, ph: s.ph || '' };
}
const cookieStr = (req, v, ms) => 'nx_sid=' + v + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(ms / 1000) + (/https/.test(req.headers['x-forwarded-proto'] || '') ? '; Secure' : '');

/* Startdaten ohne Kundendaten: nur Zugang (auth), Version und Einstellungen bleiben */
function stripCustomerData(db) { const o = clone(db); delete o.auth; Object.keys(o).forEach(k => { if (k === 'v' || k === 'settings') return; o[k] = isArr(o[k]) ? [] : isObj(o[k]) ? {} : o[k]; }); return o; }

/* ---------- Ansichten je Rolle ---------- */
function emptyShape(db) { const o = {}; Object.keys(db).forEach(k => { o[k] = isArr(db[k]) ? [] : isObj(db[k]) ? {} : db[k]; }); return o; }
function publicView(db) {
  const v = emptyShape(db); delete v.auth;
  v.settings = db.settings || {}; v.reviews = db.reviews || [];
  v.customers = (db.customers || []).map(c => ({ id: c.id, email: c.email, status: c.status, role: c.role, resetPending: c.resetPending ? true : undefined }));
  v.inquiries = (db.inquiries || []).map(i => ({ id: i.id }));
  return v;
}
function customerView(db, id) {
  const v = publicView(db), mine = x => x && x.customerId === id;
  v.customers = (db.customers || []).filter(c => c.id === id);
  ['projects', 'projectArchive', 'offers', 'invoices', 'reminders', 'time', 'support', 'subscriptions'].forEach(k => { if (isArr(db[k])) v[k] = db[k].filter(mine); });
  v.offers = (v.offers || []).filter(o => o.status !== 'Entwurf');   /* Entwürfe sieht der Kunde nie (auch nicht über die Schnittstelle) */
  v.invoices = (v.invoices || []).filter(i => !i.draft).map(i => { const o = Object.assign({}, i); delete o.bankHints; return o; });
  const vis = new Set(v.invoices.map(i => i.id)); v.reminders = (v.reminders || []).filter(r => vis.has(r.invoiceId));
  v.inquiries = (db.inquiries || []).filter(i => mine(i) || (v.customers[0] && String(i.email || '').toLowerCase() === String(v.customers[0].email || '').toLowerCase()));
  if (isObj(db.chat)) v.chat = db.chat[id] ? { [id]: db.chat[id] } : {};
  return v;
}
function employeeView(db, s) {
  const v = emptyShape(db), ro = new Set(['settings']), perms = s.perms || [];
  perms.forEach(p => { (AREAS[p] ? AREAS[p].r : []).forEach(k => ro.add(k)); });
  if (perms.some(p => p !== 'einstellungen')) ro.add('customers');
  ro.forEach(k => { if (db[k] !== undefined) v[k] = clone(db[k]); });
  v.customers = (v.customers || []).map(c => { const x = Object.assign({}, c); delete x.pwHash; return x; });
  v.auth = { user: s.uid, name: s.name || '', hash: s.ph || '', role: 'employee', perms, publicUrl: PUBLIC_URL };
  return v;
}
async function viewFor(s, db) {
  if (s.role === 'admin') { const v = clone(db); v.auth = { user: s.uid, name: s.name || '', hash: s.ph || '', role: 'admin', publicUrl: PUBLIC_URL }; return v; }
  if (s.role === 'employee') return employeeView(db, s);
  if (s.role === 'customer') { const v = customerView(db, s.uid); if (v.customers[0]) v.customers[0].pwHash = s.ph || ''; return v; }
  return publicView(db);
}
async function kvFor(s) {
  if (!isStaff(s)) return {};
  const o = {}, r = await pool.query("select key, value from kv where key like 'nx_accounting_v1' or key like 'nexora_cal_reminders' or key like 'nexora_stat_%'");
  r.rows.forEach(x => { if (s.role === 'admin' || /^nexora_stat_/.test(x.key) || (x.key === 'nx_accounting_v1' && canArea(s, 'buchhaltung')) || (x.key === 'nexora_cal_reminders' && canArea(s, 'kalender'))) o[x.key] = x.value; }); return o;
}

/* ---------- Schreiben ---------- */
function appendNew(out, key, add, max) { const have = isArr(out[key]) ? out[key] : (out[key] = []); const mx = have.reduce((m, x) => Math.max(m, Number(x && x.t) || 0), 0); const fresh = (isArr(add) ? add : []).filter(x => x && Number(x.t) > mx).slice(0, 20); if (fresh.length) { out[key] = fresh.concat(have).slice(0, max || 100); } }
function nextFreeId(list, wanted, prefix) { const ids = new Set(list.map(x => x.id)); if (wanted && !ids.has(wanted)) return wanted; let n = list.length + 1, p = prefix || 'A'; while (ids.has(p + '-' + (1000 + n))) n++; return p + '-' + (1000 + n); }
function mergeCustomer(S, C, uid, ph) {
  const out = clone(S), sc = (out.customers || []).find(c => c.id === uid), cc = (C.customers || []).find(c => c.id === uid);
  if (sc && cc) { const keep = { id: sc.id, role: sc.role }, st = sc.status, oldPw = sc.pwHash; Object.assign(sc, cc, keep); sc.pwHash = (cc.pwHash && cc.pwHash !== ph) ? secure(cc.pwHash) : oldPw; if (cc.status !== 'aktiv' && cc.status !== 'loeschung_vorgemerkt') sc.status = st; if (st === 'gesperrt' || st === 'inaktiv') sc.status = st; }
  const mine = x => x && x.customerId === uid;
  ['support'].forEach(k => { if (isArr(C[k])) { const others = (out[k] || []).filter(x => !mine(x)); out[k] = others.concat(C[k].filter(mine).map(x => Object.assign({}, x, { customerId: uid }))); } });
  if (isArr(C.inquiries)) { const others = (out.inquiries || []).filter(x => !mine(x)); const own = C.inquiries.filter(mine); const add = []; own.forEach(i => { const all = others.concat(add); add.push(Object.assign({}, i, { id: all.some(x => x.id === i.id && !(S.inquiries || []).some(y => y.id === i.id && mine(y))) ? nextFreeId(all, '', 'A') : i.id, customerId: uid })); }); out.inquiries = others.concat(add); }
  /* Entscheidung des Kunden zu Angeboten/Kostenvoranschlägen (annehmen oder mit Begründung ablehnen) und Zahlungsmeldung zu Rechnungen */
  if (isArr(C.offers)) C.offers.filter(mine).forEach(co => {
    const so = (out.offers || []).find(x => x.id === co.id && mine(x)); if (!so || so.status !== 'Versendet' || !isObj(co.decision)) return;
    const st = co.decision.st === 'Angenommen' || co.decision.st === 'Abgelehnt' ? co.decision.st : null; if (!st) return;
    const reason = String(co.decision.reason || '').trim().slice(0, 1000); if (st === 'Abgelehnt' && reason.length < 3) return;
    so.status = st; so.decision = { st, at: Date.now(), reason: st === 'Abgelehnt' ? reason : '' }; delete so.decisionSeen; delete so.started;
  });
  if (isArr(C.invoices)) C.invoices.filter(mine).forEach(ci => {
    const si = (out.invoices || []).find(x => x.id === ci.id && mine(x)); if (!si || si.draft || !isObj(ci.claim)) return;
    if (si.claim && si.claim.at && si.claim.at !== si.claimDone) return;
    si.claim = { at: Date.now() }; delete si.claimResult;
  });
  const myProjects = new Set((out.projects || []).concat(out.projectArchive || []).filter(mine).map(p => p.id));
  if (isArr(C.reviews)) { const others = (out.reviews || []).filter(r => !myProjects.has(r.projectId)); out.reviews = others.concat(C.reviews.filter(r => myProjects.has(r.projectId))); }
  if (isObj(C.chat) && isArr(C.chat[uid])) { out.chat = out.chat || {}; out.chat[uid] = C.chat[uid].slice(-500); }
  appendNew(out, 'activity', C.activity, 60); appendNew(out, 'mails', C.mails, 100);
  return out;
}
function mergePublic(S, C, ip) {
  const out = clone(S);
  (C.customers || []).forEach(c => {
    if (!c || !c.id || !c.email) return;
    const ex = (out.customers || []).find(x => x.id === c.id);
    if (!ex) { if ((out.customers || []).some(x => String(x.email).toLowerCase() === String(c.email).toLowerCase())) return; if (limited('reg:' + ip, 5, 36e5)) return; hit('reg:' + ip); out.customers.push(Object.assign({}, c, { role: 'Kunde' }, c.pwHash ? { pwHash: secure(c.pwHash) } : {})); }
    else if (ex.resetPending && c.pwHash && !isSecured(c.pwHash) && !c.resetPending) { ex.pwHash = secure(c.pwHash); ex.resetPending = false; }
  });
  const known = new Set((out.inquiries || []).map(i => i.id));
  (C.inquiries || []).filter(i => i && i.subject && !known.has(i.id) && i.first && i.email).slice(0, 3).forEach(i => { if (limited('inq:' + ip, 20, 36e5)) return; hit('inq:' + ip); out.inquiries.push(Object.assign({}, i, { customerId: i.customerId && (out.customers || []).some(c => c.id === i.customerId) ? '' : (i.customerId || '') })); });
  appendNew(out, 'activity', C.activity, 60); appendNew(out, 'mails', C.mails, 100);
  return out;
}
/* Neue Datensätze (Kunden, Anfragen, Support, Rechnungen …) tragen die Revision, in der sie entstanden sind (_r). So kann ein veralteter Admin-Stand sie nicht versehentlich löschen. */
const STAMPED = ['customers', 'inquiries', 'support', 'invoices', 'reminders', 'reviews'];
function stampNew(S, out, nr) { STAMPED.forEach(k => { const ids = new Set((S[k] || []).map(x => x.id)); (out[k] || []).forEach(x => { if (x && !ids.has(x.id) && !x._r) x._r = nr; }); }); return out; }
function mergeAdmin(S, C, base) {
  const out = clone(C);
  /* Datensätze, die nach dem Laden dieses Admin-Stands entstanden sind (Registrierungen, Anfragen, Automatik …), bleiben erhalten */
  STAMPED.forEach(k => { const have = new Set((out[k] || []).map(x => x.id)); (S[k] || []).filter(x => Number(x._r) > Number(base) && !have.has(x.id)).forEach(x => { (out[k] = out[k] || []).push(x); }); });
  /* Entscheidungen und Zahlungsmeldungen der Kunden gehen nicht durch einen älteren Admin-Stand verloren */
  (S.offers || []).forEach(so => { if (!so.decision) return; const co = (out.offers || []).find(x => x.id === so.id); if (co && (!co.decision || Number(co.decision.at) < Number(so.decision.at))) { co.decision = so.decision; co.status = so.decision.st; delete co.decisionSeen; delete co.started; } });
  (S.invoices || []).forEach(si => { if (!si.claim) return; const ci = (out.invoices || []).find(x => x.id === si.id); if (ci && si.claim.at !== ci.claimDone && (!ci.claim || Number(ci.claim.at) < Number(si.claim.at))) { ci.claim = si.claim; delete ci.claimResult; } });
  /* Kundenpasswörter und letzte Aktivität stammen vom Server */
  (out.customers || []).forEach(c => { const sc = (S.customers || []).find(x => x.id === c.id); if (sc) { if (sc.pwHash && isSecured(c.pwHash || sc.pwHash)) c.pwHash = sc.pwHash; if ((sc.lastActivity || 0) > (c.lastActivity || 0)) c.lastActivity = sc.lastActivity; } });
  (S.subscriptions || []).forEach(ss => { const cs = (out.subscriptions || []).find(x => x.id === ss.id); if (cs && (ss.generatedPeriods || []).length > (cs.generatedPeriods || []).length) Object.assign(cs, { nextDate: ss.nextDate, generatedPeriods: ss.generatedPeriods, lastInvoiceId: ss.lastInvoiceId }); });
  if (isObj(S.chat) && isObj(out.chat)) Object.keys(S.chat).forEach(id => { const a = out.chat[id] || [], seen = new Set(a.map(m => m.t + '|' + m.text)); const extra = (S.chat[id] || []).filter(m => !seen.has(m.t + '|' + m.text) && Number(m.t) > Date.now() - 36e5 * 24); if (extra.length) out.chat[id] = a.concat(extra).sort((x, y) => x.t - y.t); });
  return out;
}

async function startSession(req, res, sess, ph, db) {
  const tok = crypto.randomBytes(32).toString('hex'); await pool.query('delete from sessions where exp < $1', [Date.now()]);
  await pool.query('insert into sessions(token, role, uid, exp, ph) values($1,$2,$3,$4,$5)', [tok, sess.role, sess.uid, Date.now() + SESSION_MS, ph]);
  const row = await kvGet(DBKEY), v = await viewFor(Object.assign({ ph }, sess), db);
  return send(res, 200, { ok: true, role: sess.role, rev: Number(row.rev), db: v, kv: await kvFor(sess) }, { 'Set-Cookie': cookieStr(req, tok, SESSION_MS) });
}


/* ---------- Sicherungen (täglich automatisch, außerdem manuell) ---------- */
const BACKUP_KEYS = ['nx_accounting_v1', 'nexora_cal_reminders'], KEEP = { auto: 30, manual: 20, 'vor-wiederherstellung': 5 };
async function makeBackup(kind) {
  const row = await kvGet(DBKEY); if (!row) return null;
  const data = { db: row.value, kv: {} };
  for (const k of BACKUP_KEYS) { const r = await kvGet(k); if (r) data.kv[k] = r.value; }
  const r = await pool.query('insert into backups(kind, data) values($1,$2) returning id, created_at', [kind, JSON.stringify(data)]);
  await pool.query('delete from backups where kind=$1 and id not in (select id from backups where kind=$1 order by id desc limit $2)', [kind, KEEP[kind] || 20]);
  return { id: Number(r.rows[0].id), created_at: r.rows[0].created_at };
}
async function autoBackupIfDue() {
  const r = await pool.query("select created_at from backups where kind=$1 order by id desc limit 1", ['auto']);
  const last = r.rows[0] ? new Date(r.rows[0].created_at).getTime() : 0;
  if (Date.now() - last > 23 * 36e5) return makeBackup('auto');
  return null;
}
async function restoreBackup(id) {
  const r = await pool.query('select data from backups where id=$1', [id]); if (!r.rows[0]) return false;
  const d = r.rows[0].data; if (!d || !isObj(d.db)) return false;
  await makeBackup('vor-wiederherstellung');
  delete d.db.auth; await kvPut(DBKEY, d.db);
  for (const k of BACKUP_KEYS) if (d.kv && d.kv[k] !== undefined) await kvPut(k, d.kv[k]);
  return true;
}

/* ---------- Automatik (Monatsrechnungen als Entwurf, optional Erinnerungen/Mahnungen) ---------- */
let autoBusy = false, lastHk = 0;
async function runAutomation() {
  if (autoBusy || !pool) return; autoBusy = true;
  try { const row = await kvGet(DBKEY); if (!row) return; const db = clone(row.value); const r = automation.run(db); if (r.changed) { stampNew(row.value, db, Number(row.rev) + 1); await kvPut(DBKEY, db); console.log('Automatik:', r.made.join(', ') || 'Verträge aktualisiert'); } }
  catch (e) { console.error('Automatik-Fehler:', e.message); } finally { autoBusy = false; }
}
function lazyHousekeeping() { if (Date.now() - lastHk > 10 * 60 * 1000) { lastHk = Date.now(); housekeeping(); } }
async function acquireLock(name, ms) {
  try { const r = await pool.query("insert into kv(key,value,rev) values($1,$2,1) on conflict(key) do update set value=excluded.value, rev=kv.rev+1, updated_at=now() where (kv.value->>'until')::bigint < $3 returning rev", ['lock_' + name, JSON.stringify({ until: Date.now() + ms }), Date.now()]); return r.rows.length > 0; } catch (e) { return false; }
}
async function housekeeping() { if (!(await acquireLock('housekeeping', 5 * 60 * 1000))) return; try { await autoBackupIfDue(); await runAutomation(); } catch (e) { console.error('Wartung:', e.message); } try { await pool.query("update kv set value=$2 where key=$1", ['lock_housekeeping', JSON.stringify({ until: 0 })]); } catch (e) {} }

/* ---------- Dateien (in der Datenbank, höchstens 10 MB je Datei, 400 MB gesamt) ---------- */
const FILE_MAX = 10 * 1024 * 1024, FILE_TOTAL = 400 * 1024 * 1024;
const FILE_MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip', odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet' };
const fileExt = n => (String(n).split('.').pop() || '').toLowerCase();
const FILE_AREA = { inquiry: 'anfragen', project: 'projekte', invoice: 'verrechnung', offer: 'verrechnung', customer: 'kunden' };
const staffFileOk = (s, owner) => { const m = String(owner).match(/^(\w+):/); return !!(m && FILE_AREA[m[1]] && canArea(s, FILE_AREA[m[1]])); };   /* Dateien gehören zu ihrem Bereich: Anfragen, Projekte, ... */
function ownerOk(db, owner, cid) { /* darf der Kunde cid Dateien dieser Zuordnung sehen? */
  const m = String(owner).match(/^(customer|project|invoice|offer):(.+)$/); if (!m) return false;   /* Anfrage-Dateien (inquiry:) sind intern und für Kunden nie sichtbar */
  if (m[1] === 'customer') return m[2] === cid;
  const list = m[1] === 'project' ? [].concat(db.projects || [], db.projectArchive || []) : m[1] === 'invoice' ? (db.invoices || []).filter(i => !i.draft) : (db.offers || []).filter(o => o.status !== 'Entwurf');
  const it = list.find(x => x.id === m[2]); return !!(it && it.customerId === cid);
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const p = url.pathname;
  if (req.method === 'GET' && p === '/api/health') return send(res, 200, { ok: true });
  if (!pool) return send(res, 503, { error: 'Datenbank startet noch' });
  if (MODE === 'public' && /^\/api\/(admins|backups|automation|setup)(\/|$)/.test(p)) return send(res, 404, { error: 'Unbekannt' });
  if (MODE === 'public' && /^\/api\/kv\/nx_accounting_v1|^\/api\/kv\/nexora_cal_reminders/.test(p)) return send(res, 404, { error: 'Unbekannt' });
  const ip = ipOf(req), s = await session(req);
  if (req.method === 'GET' && p === '/api/db') {
    const needsSetup = (await getAdmins()).length === 0, row = await kvGet(DBKEY); if (row) lazyHousekeeping(); if (!row) return send(res, 200, { api: 'nexora', role: s.role, empty: true, rev: 0, needsSetup });
    return send(res, 200, { api: 'nexora', role: s.role, rev: Number(row.rev), needsSetup, db: await viewFor(s, row.value), kv: await kvFor(s) });
  }
  if (req.method === 'GET' && p === '/api/rev') { const row = await kvGet(DBKEY); return send(res, 200, { rev: row ? Number(row.rev) : 0, role: s.role }); }
  if (req.method === 'PUT' && p === '/api/db') {
    const b = await readBody(req), C = b.db; if (!isObj(C)) return send(res, 400, { error: 'Daten fehlen' });
    const row = await kvGet(DBKEY);
    if (!row) { if (!isArr(C.customers)) return send(res, 400, { error: 'Ungültige Startdaten' }); return send(res, 200, { ok: true, rev: await kvPut(DBKEY, stripCustomerData(C)) }); }
    if (MODE === 'admin' && !isStaff(s)) return send(res, 403, { error: 'Nur Administratoren.' });
    const S = row.value; let out;
    if (s.role === 'admin') {
      if (!isArr(C.customers) || !isArr(C.invoices)) return send(res, 400, { error: 'Ungültige Daten' });
      out = Number(b.base) === Number(row.rev) ? C : mergeAdmin(S, C, Number(b.base) || 0); delete out.auth;
      (out.customers || []).forEach(c => { if (c.pwHash && !isSecured(c.pwHash)) c.pwHash = secure(c.pwHash); });
    }
    else if (s.role === 'employee') {
      if (!isArr(C.customers) || !isArr(C.invoices)) return send(res, 400, { error: 'Ungültige Daten' });
      const wk = new Set(); (s.perms || []).forEach(p => (AREAS[p] ? AREAS[p].w : []).forEach(k => wk.add(k)));
      const cand = clone(S); wk.forEach(k => { if (C[k] !== undefined) cand[k] = C[k]; });
      if (canArea(s, 'buchhaltung') && !wk.has('invoices')) (cand.invoices || []).forEach(i => { const ci = C.invoices.find(x => x.id === i.id); if (ci && isArr(ci.payments)) i.payments = ci.payments; });
      appendNew(cand, 'activity', C.activity, 60); appendNew(cand, 'mails', C.mails, 100);
      (cand.customers || []).forEach(c => { const sc = (S.customers || []).find(x => x.id === c.id); if (sc) { if (sc.pwHash) c.pwHash = sc.pwHash; if (!wk.has('customers')) Object.assign(c, sc); } else if (c.pwHash && !isSecured(c.pwHash)) c.pwHash = secure(c.pwHash); });
      out = Number(b.base) === Number(row.rev) ? cand : mergeAdmin(S, cand, Number(b.base) || 0); delete out.auth;
    }
    else if (s.role === 'customer') { out = stampNew(S, mergeCustomer(S, C, s.uid, s.ph), Number(row.rev) + 1); const me = (out.customers || []).find(c => c.id === s.uid), cc = (C.customers || []).find(c => c.id === s.uid); if (me && cc && cc.pwHash && cc.pwHash !== s.ph) await pool.query('update sessions set ph=$1 where token=$2', [cc.pwHash, s.token]); }
    else out = stampNew(S, mergePublic(S, C, ip), Number(row.rev) + 1);
    return send(res, 200, { ok: true, rev: await kvPut(DBKEY, out) });
  }
  let m = p.match(/^\/api\/kv\/([A-Za-z0-9_]+)$/);
  if (m && req.method === 'PUT') {
    const k = m[1], b = await readBody(req);
    if (ADMIN_KV.test(k)) { if (!(s.role === 'admin' || (k === 'nx_accounting_v1' && canArea(s, 'buchhaltung')) || (k === 'nexora_cal_reminders' && canArea(s, 'kalender')))) return send(res, 403, { error: 'Nicht erlaubt' }); return send(res, 200, { ok: true, rev: await kvPut(k, b.value) }); }
    if (STAT_KV.test(k) && MODE === 'admin' && !isStaff(s)) return send(res, 403, { error: 'Nur Administratoren.' });
    if (STAT_KV.test(k)) { const row = await kvGet(k), cur = row ? row.value : {}, nv = isObj(b.value) ? b.value : {}; Object.keys(nv).forEach(d => { if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Number(nv[d]))) cur[d] = Math.max(Number(cur[d]) || 0, Math.min(Number(nv[d]), 1e7)); }); return send(res, 200, { ok: true, rev: await kvPut(k, cur) }); }
    return send(res, 404, { error: 'Unbekannt' });
  }
  if (req.method === 'POST' && p === '/api/login') {
    if (limited('login:' + ip, 10, 9e5)) return send(res, 429, { error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    const b = await readBody(req, 1e5), row = await kvGet(DBKEY); if (!row) return send(res, 409, { empty: true });
    if ((MODE === 'public' && b.role === 'admin') || (MODE === 'admin' && b.role !== 'admin')) return send(res, 403, { error: 'Hier nicht möglich.' });
    const db = row.value; let sess = null;
    if (b.role === 'admin') { const a = (await getAdmins()).find(x => adminName(x) === String(b.user || '').toLowerCase()); if (a && a.status !== 'gesperrt' && verifyPw(a.pw, b.hash)) sess = { role: a.role === 'employee' ? 'employee' : 'admin', uid: a.user, name: a.name || '', perms: a.role === 'employee' ? cleanPerms(a.perms) : null }; }
    else if (b.role === 'customer') { const c = (db.customers || []).find(x => String(x.email).toLowerCase() === String(b.user || '').toLowerCase()); if (c && c.pwHash && verifyPw(c.pwHash, b.hash) && c.role !== 'Mitarbeiter') { sess = { role: 'customer', uid: c.id }; if (!isSecured(c.pwHash)) { c.pwHash = secure(b.hash); await kvPut(DBKEY, db); } } }
    if (!sess) { hit('login:' + ip); return send(res, 401, { ok: false }); }
    return startSession(req, res, sess, b.hash, db);
  }
  if (req.method === 'POST' && p === '/api/setup') {
    if (limited('setup:' + ip, 10, 9e5)) return send(res, 429, { error: 'Zu viele Versuche.' });
    const b = await readBody(req, 1e5); if ((await getAdmins()).length) return send(res, 409, { error: 'Die Einrichtung ist bereits abgeschlossen.' });
    const code = process.env.NX_SETUP_CODE || ''; if (!code || !safeEq(code, String(b.code || ''))) { hit('setup:' + ip); return send(res, 403, { error: 'Der Einrichtungs-Code ist falsch.' }); }
    const user = String(b.user || '').trim(); if (user.length < 3 || !b.hash) return send(res, 400, { error: 'Benutzername oder Passwort fehlt.' });
    await kvPut(ADMINS, [{ user, pw: secure(b.hash), created: Date.now() }]);
    let row = await kvGet(DBKEY); if (!row) { await kvPut(DBKEY, stripCustomerData(isObj(b.db) ? b.db : { v: 1, settings: {}, customers: [], invoices: [] })); row = await kvGet(DBKEY); }
    return startSession(req, res, { role: 'admin', uid: user }, b.hash, row.value);
  }
  if (p === '/api/me') {   /* eigenes Konto (Administrator oder Mitarbeiter): Name, Benutzername, Passwort */
    if (!isStaff(s)) return send(res, 403, { error: 'Nicht erlaubt' });
    const list = await getAdmins(), a = list.find(x => adminName(x) === String(s.uid).toLowerCase()); if (!a) return send(res, 404, { error: 'Unbekannt' });
    if (req.method === 'GET') return send(res, 200, { user: a.user, name: a.name || '', role: s.role });
    if (req.method === 'PUT') {
      const b = await readBody(req, 1e5), old = a.user;
      if (b.hash) { if (!b.oldHash || !verifyPw(a.pw, b.oldHash)) return send(res, 400, { error: 'Das bisherige Passwort ist falsch.' }); a.pw = secure(b.hash); }
      if (b.name !== undefined) a.name = String(b.name).trim().slice(0, 80);
      if (b.user !== undefined && String(b.user).trim() !== a.user) { const u = String(b.user).trim(); if (u.length < 3) return send(res, 400, { error: 'Benutzername: mindestens 3 Zeichen.' }); if (list.some(x => x !== a && adminName(x) === u.toLowerCase())) return send(res, 409, { error: 'Diesen Benutzernamen gibt es schon.' }); a.user = u; }
      await kvPut(ADMINS, list);
      for (const r of ['admin', 'employee']) await pool.query('delete from sessions where role=$1 and lower(uid)=$2 and token<>$3', [r, old.toLowerCase(), s.token || '']);   /* andere Geräte müssen sich neu anmelden */
      await pool.query('update sessions set uid=$1, ph=$2 where token=$3', [a.user, b.hash || s.ph || '', s.token || '']);
      return send(res, 200, { ok: true, user: a.user, name: a.name || '' });
    }
  }
  let am = p.match(/^\/api\/admins(?:\/([^/]+))?$/);
  if (am) {
    if (s.role !== 'admin') return send(res, 403, { error: 'Nicht erlaubt' });
    const list = await getAdmins();
    const pub = a => ({ user: a.user, name: a.name || '', role: a.role === 'employee' ? 'employee' : 'admin', perms: a.role === 'employee' ? cleanPerms(a.perms) : [], status: a.status === 'gesperrt' ? 'gesperrt' : 'aktiv', created: a.created });
    if (req.method === 'GET' && !am[1]) return send(res, 200, { admins: list.map(pub), me: s.uid, areas: Object.keys(AREAS) });
    if (req.method === 'POST' && !am[1]) { const b = await readBody(req, 1e5), user = String(b.user || '').trim(); if (user.length < 3 || !b.hash) return send(res, 400, { error: 'Benutzername oder Passwort fehlt.' }); if (list.some(a => adminName(a) === user.toLowerCase())) return send(res, 409, { error: 'Diesen Benutzernamen gibt es schon.' }); const emp = b.role === 'employee'; list.push({ user, name: String(b.name || '').trim().slice(0, 80), role: emp ? 'employee' : 'admin', perms: emp ? cleanPerms(b.perms) : [], status: 'aktiv', pw: secure(b.hash), created: Date.now() }); await kvPut(ADMINS, list); return send(res, 200, { ok: true }); }
    const isLastAdmin = u => { const a = list.find(x => adminName(x) === u); return a && a.role !== 'employee' && a.status !== 'gesperrt' && list.filter(x => x.role !== 'employee' && x.status !== 'gesperrt').length <= 1; };
    if (req.method === 'DELETE' && am[1]) { const u = decodeURIComponent(am[1]).toLowerCase(); if (u === String(s.uid).toLowerCase()) return send(res, 400, { error: 'Das eigene Konto kann nicht gelöscht werden.' }); if (isLastAdmin(u)) return send(res, 400, { error: 'Der letzte Administrator kann nicht gelöscht werden.' }); const n = list.filter(a => adminName(a) !== u); if (n.length === list.length) return send(res, 404, { error: 'Unbekannt' }); await kvPut(ADMINS, n); for (const r of ['admin', 'employee']) await pool.query('delete from sessions where role=$1 and lower(uid)=$2', [r, u]); return send(res, 200, { ok: true }); }
    if (req.method === 'PUT' && am[1]) {
      const u = decodeURIComponent(am[1]).toLowerCase(), b = await readBody(req, 1e5), a = list.find(x => adminName(x) === u); if (!a) return send(res, 404, { error: 'Unbekannt' });
      const self = u === String(s.uid).toLowerCase(), wantRole = b.role === 'employee' ? 'employee' : (b.role === 'admin' ? 'admin' : (a.role === 'employee' ? 'employee' : 'admin'));
      if (self && (wantRole !== 'admin' || b.status === 'gesperrt')) return send(res, 400, { error: 'Das eigene Konto kann nicht eingeschränkt oder gesperrt werden.' });
      if (isLastAdmin(u) && (wantRole !== 'admin' || b.status === 'gesperrt')) return send(res, 400, { error: 'Der letzte Administrator kann nicht eingeschränkt oder gesperrt werden.' });
      if (b.name !== undefined) a.name = String(b.name).trim().slice(0, 80);
      let renamed = false;
      if (b.newUser !== undefined && String(b.newUser).trim() !== a.user) { const nu = String(b.newUser).trim(); if (nu.length < 3) return send(res, 400, { error: 'Benutzername: mindestens 3 Zeichen.' }); if (list.some(x => x !== a && adminName(x) === nu.toLowerCase())) return send(res, 409, { error: 'Diesen Benutzernamen gibt es schon.' }); a.user = nu; renamed = true; }
      a.role = wantRole; a.perms = wantRole === 'employee' ? cleanPerms(b.perms !== undefined ? b.perms : a.perms) : []; if (b.status) a.status = b.status === 'gesperrt' ? 'gesperrt' : 'aktiv';
      if (b.hash) a.pw = secure(b.hash);
      await kvPut(ADMINS, list);
      if (b.hash || a.status === 'gesperrt' || renamed) for (const r of ['admin', 'employee']) await pool.query('delete from sessions where role=$1 and lower(uid)=$2 and token<>$3', [r, u, s.token || '']);
      if (renamed && self) await pool.query('update sessions set uid=$1 where token=$2', [a.user, s.token || '']);   /* Rechte und Rolle stammen bei jeder Anfrage aus dem Konto */
      return send(res, 200, { ok: true });
    }
  }
  if (p === '/api/backups' || /^\/api\/backups\/\d+(\/(download|restore))?$/.test(p)) {
    if (s.role !== 'admin') return send(res, 403, { error: 'Nicht erlaubt' });
    if (req.method === 'GET' && p === '/api/backups') { const r = await pool.query('select id, created_at, kind, octet_length(data::text) as size from backups order by id desc limit 100'); return send(res, 200, { backups: r.rows.map(x => ({ id: Number(x.id), created_at: x.created_at, kind: x.kind, size: Number(x.size) })) }); }
    if (req.method === 'POST' && p === '/api/backups') { const r = await makeBackup('manual'); return r ? send(res, 200, { ok: true, id: r.id }) : send(res, 409, { error: 'Keine Daten vorhanden.' }); }
    const id = Number(p.split('/')[3]);
    if (req.method === 'GET' && p.endsWith('/download')) { const r = await pool.query('select kind, created_at, data from backups where id=$1', [id]); if (!r.rows[0]) return send(res, 404, { error: 'Unbekannt' }); const body = JSON.stringify(r.rows[0].data); res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="nexora-sicherung-' + id + '.json"', 'Cache-Control': 'no-store' }); return res.end(body); }
    if (req.method === 'POST' && p.endsWith('/restore')) { const ok = await restoreBackup(id); return ok ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Sicherung nicht gefunden.' }); }
  }
  if (req.method === 'POST' && p === '/api/automation/run') { if (s.role !== 'admin') return send(res, 403, { error: 'Nicht erlaubt' }); await runAutomation(); return send(res, 200, { ok: true }); }
  if (p === '/api/files' || /^\/api\/files\/[A-Za-z0-9_-]+$/.test(p)) {
    if (s.role !== 'admin' && s.role !== 'customer' && s.role !== 'employee') return send(res, 403, { error: 'Bitte anmelden.' });
    const row = await kvGet(DBKEY), db = row ? row.value : {};
    if (req.method === 'GET' && p === '/api/files') {
      const r = await pool.query('select id, owner, name, mime, size, created_at, uploaded_by from files order by created_at desc');
      const list = r.rows.filter(f => s.role === 'admin' || (s.role === 'employee' ? staffFileOk(s, f.owner) : ownerOk(db, f.owner, s.uid)));
      return send(res, 200, { files: list.map(f => ({ id: f.id, owner: f.owner, name: f.name, size: Number(f.size), created_at: f.created_at, by: f.uploaded_by })) });
    }
    if (req.method === 'POST' && p === '/api/files') {
      const owner = String(url.searchParams.get('owner') || ''), name = String(url.searchParams.get('name') || '').replace(/[\\/\r\n"]/g, '_').slice(0, 160);
      if (!name || !/^(inquiry|customer|project|invoice|offer):.+$/.test(owner)) return send(res, 400, { error: 'Name oder Zuordnung fehlt.' });
      if (s.role === 'employee' && !staffFileOk(s, owner)) return send(res, 403, { error: 'Nicht erlaubt' });
      if (s.role === 'customer' && !ownerOk(db, owner, s.uid)) return send(res, 403, { error: 'Nicht erlaubt' });
      if (!FILE_MIME[fileExt(name)]) return send(res, 400, { error: 'Dieser Dateityp ist nicht erlaubt.' });
      const buf = await readRaw(req, FILE_MAX); if (!buf.length) return send(res, 400, { error: 'Datei ist leer.' });
      const t = await pool.query('select coalesce(sum(size),0) as total from files'); if (Number(t.rows[0].total) + buf.length > FILE_TOTAL) return send(res, 507, { error: 'Speicherplatz für Dateien ist voll.' });
      const id = crypto.randomBytes(12).toString('hex');
      await pool.query('insert into files(id, owner, name, mime, size, data, uploaded_by) values($1,$2,$3,$4,$5,$6,$7)', [id, owner, name, FILE_MIME[fileExt(name)], buf.length, buf, s.role === 'admin' ? s.uid : 'Kunde']);
      return send(res, 200, { ok: true, id });
    }
    const fid = p.split('/')[3];
    if (req.method === 'GET' && fid) {
      const r = await pool.query('select id, owner, name, mime, data from files where id=$1', [fid]), f = r.rows[0];
      if (!f || (s.role === 'employee' ? !staffFileOk(s, f.owner) : s.role !== 'admin' && !ownerOk(db, f.owner, s.uid))) return send(res, 404, { error: 'Nicht gefunden' });
      res.writeHead(200, { 'Content-Type': f.mime, 'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(f.name), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Length': f.data.length }); return res.end(f.data);
    }
    if (req.method === 'DELETE' && fid) { if (s.role !== 'admin') { const fr = s.role === 'employee' ? await pool.query('select owner from files where id=$1', [fid]) : null; if (!fr || !fr.rows[0] || !staffFileOk(s, fr.rows[0].owner)) return send(res, 403, { error: 'Nicht erlaubt' }); } await pool.query('delete from files where id=$1', [fid]); return send(res, 200, { ok: true }); }
  }
  if (req.method === 'POST' && p === '/api/logout') { if (s.token) await pool.query('delete from sessions where token=$1', [s.token]); return send(res, 200, { ok: true }, { 'Set-Cookie': cookieStr(req, '', 0) }); }
  return send(res, 404, { error: 'Unbekannt' });
}

/* ---------- Statische Dateien ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const ADMIN_ONLY_JS = /^\/assets\/js\/(admin|admin-extras|billing|finance|time|bookkeeping|bank-import|admin-layout|live-sync|export)\.js$/;
function serve(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (MODE === 'public' && (rel === '/admin' || rel.startsWith('/admin/') || ADMIN_ONLY_JS.test(rel))) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
  if (MODE === 'admin') {
    if (rel === '/' || rel === '/admin') { res.writeHead(302, { Location: '/admin/index.html' }); return res.end(); }
    if (!(rel.startsWith('/admin/') || rel.startsWith('/assets/'))) { if (PUBLIC_URL && /\.html$|\/$/.test(rel)) { res.writeHead(302, { Location: PUBLIC_URL + rel }); return res.end(); } res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
  }
  if (rel.endsWith('/')) rel += 'index.html';
  let f = path.normalize(path.join(ROOT, rel)); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (!e && st.isDirectory()) { f = path.join(f, 'index.html'); }
    fs.readFile(f, (e2, buf) => {
      if (e2) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<!doctype html><meta charset="utf-8"><title>Nicht gefunden</title><p>Seite nicht gefunden. <a href="/">Zur Startseite</a>'); }
      const ext = path.extname(f).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': /\.(png|jpe?g|svg|webp|ico|woff2)$/.test(ext) ? 'public, max-age=86400' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serve(req, res, url);
  } catch (e) { if (!res.headersSent) send(res, e.code === 413 || e.code === 400 ? e.code : 500, { error: e.code ? e.message : 'Serverfehler' }); console.error(e.message); }
}).listen(PORT, '0.0.0.0', () => console.log('NEXORA-Server läuft auf Port ' + PORT));
/* Einmaliges Leeren: mit der Umgebungsvariable NX_RESET_ID=<Kennung> werden beim Start alle Daten gelöscht (nur einmal je Kennung). */
async function resetOnce() {
  const id = process.env.NX_RESET_ID; if (!id) return;
  const m = await kvGet('reset_marker'); if (m && m.value && m.value.id === id) return;
  await pool.query('delete from kv'); await pool.query('delete from sessions'); await kvPut('reset_marker', { id });
  console.log('Datenbank geleert (' + id + ')');
}
initDb().then(resetOnce).then(() => { console.log('Datenbank bereit'); housekeeping(); setInterval(housekeeping, 30 * 60 * 1000).unref(); }).catch(e => { console.error('Datenbankfehler:', e.message); });
