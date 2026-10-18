#!/usr/bin/env node
/* Audit probe 04 — Chrome-Service-Worker-Logik mit gemockter chrome-API
 * (nichtdestruktiv, offline, KEIN echter Browser).
 * Prüft DNR-Regelaufbau, Allow-once-Messaging-Authentisierung, Einmal-Freigabe-Lifecycle,
 * Startup-Bereinigung, Reduced-Mode und Fail-open-Verhalten bei Konfigurationsfehlern.
 * Exit 0 = alle Sicherheits-Kontrollassertions halten (Beobachtungen separat im Report).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'chrome_background_mock.json');
const BG = path.join(ROOT, 'chrome', 'background.js');
const failures = [], assertions = [], observations = [];
function assert(name, ok, detail) { assertions.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); if (!ok) failures.push(name + ' :: ' + detail); }
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fakeEvents() { const listeners = []; return { listeners, addListener(fn) { listeners.push(fn); } }; }

/* opts: { local, storageGetFails, tabs, seedSession, seedDynamic, slowRemoveOnce, consoleSink } */
function createSandbox(opts = {}) {
  const events = {
    installed: fakeEvents(), start: fakeEvents(), changed: fakeEvents(),
    removed: fakeEvents(), committed: fakeEvents(), before: fakeEvents(), message: fakeEvents()
  };
  const state = {
    local: Object.assign({}, opts.local || {}),
    dynamic: (opts.seedDynamic || []).map(r => JSON.parse(JSON.stringify(r))),
    session: (opts.seedSession || []).map(r => JSON.parse(JSON.stringify(r))),
    updated: [], consoleErrors: [], allowCalls: [], slowRemoveUsed: false
  };
  const tabs = Object.assign({}, opts.tabs || {}); // tabId -> {url}
  let slowRemovePending = !!opts.slowRemoveOnce;
  state.delayNextRemoveMs = 0;

  const chrome = {
    runtime: {
      id: 'fakeid', getURL: p => 'chrome-extension://fakeid/' + p,
      onInstalled: events.installed, onStartup: events.start, onMessage: events.message
    },
    storage: {
      local: {
        async get(keys) {
          if (opts.storageGetFails) throw new Error('simulierter storage.local.get-Fehler');
          const ks = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {});
          return Object.fromEntries(ks.filter(k => k in state.local).map(k => [k, state.local[k]]));
        },
        async set(values) { Object.assign(state.local, values); }
      },
      onChanged: events.changed
    },
    tabs: {
      onRemoved: events.removed,
      async get(tabId) {
        if (!(tabId in tabs)) throw new Error('No tab with id: ' + tabId);
        return { id: tabId, url: tabs[tabId].url };
      },
      async update(tabId, changes) { state.updated.push({ tabId, ...changes }); }
    },
    webNavigation: { onCommitted: events.committed, onBeforeNavigate: events.before },
    declarativeNetRequest: {
      async getDynamicRules() { return state.dynamic.map(r => JSON.parse(JSON.stringify(r))); },
      async getSessionRules() { return state.session.map(r => JSON.parse(JSON.stringify(r))); },
      async isRegexSupported({ regex, requireCapturing }) {
        try { void new RegExp(regex); } catch (e) { return { isSupported: false, reason: 'regex parse error' }; }
        if (regex.length > 2000) return { isSupported: false, reason: 'regex too long' };
        return { isSupported: true, isCaseSensitive: false };
      },
      async updateDynamicRules({ removeRuleIds = [], addRules = [] }) {
        if (state.delayNextRemoveMs > 0 && removeRuleIds.length) {
          const ms = state.delayNextRemoveMs; state.delayNextRemoveMs = 0;
          await sleep(ms); // simulierte API-Latenz für den Remove, damit ein paralleler configure()-Lauf dazwischen abschließt
        } else if (slowRemovePending && removeRuleIds.length) {
          slowRemovePending = false; state.slowRemoveUsed = true;
          await sleep(60);
        }
        for (const id of removeRuleIds) { const i = state.dynamic.findIndex(x => x.id === id); if (i >= 0) state.dynamic.splice(i, 1); }
        state.dynamic.push(...JSON.parse(JSON.stringify(addRules)));
      },
      async updateSessionRules({ removeRuleIds = [], addRules = [] }) {
        for (const id of removeRuleIds) { const i = state.session.findIndex(x => x.id === id); if (i >= 0) state.session.splice(i, 1); }
        state.session.push(...JSON.parse(JSON.stringify(addRules)));
      }
    }
  };
  const consoleMock = {
    error: (...a) => state.consoleErrors.push(a.map(String).join(' ')),
    log: () => { }, warn: () => { }, info: () => { }
  };
  const ctx = { chrome, URL, console: consoleMock, Map, Set, Promise, Error, String, Number, JSON, Object, Array, RegExp };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  ctx.importScripts = (...names) => {
    for (const file of names) vm.runInContext(fs.readFileSync(path.join(ROOT, 'chrome', file), 'utf8'), context);
  };
  vm.runInContext(fs.readFileSync(BG, 'utf8'), context);
  return { state, events, tabs, ctx };
}
function setTab(sandbox, tabId, url) { sandbox.tabs[tabId] = { url }; }
function sendMessage(sandbox, request, sender) {
  const listener = sandbox.events.message.listeners[0];
  if (!listener) return Promise.resolve({ ok: false, error: 'no message listener' });
  return new Promise(resolve => {
    const ret = listener(request, sender, response => resolve(response));
    if (ret !== true) resolve({ ok: false, error: 'listener did not keep channel open' });
  });
}
const GUARD = 'chrome-extension://fakeid/guard.html';

(async () => {
  /* ---------- A. Installation / DNR-Regelaufbau ---------- */
  let sb = createSandbox({ local: {} });
  await sleep(60);
  const redirect = sb.state.dynamic.find(r => r.action && r.action.type === 'redirect');
  assert('install:redirect-rule-exists', !!redirect, JSON.stringify(sb.state.dynamic));
  assert('install:redirect-rule-id', redirect && redirect.id === 1000, redirect && redirect.id);
  assert('install:priority-1', redirect && redirect.priority === 1, redirect && redirect.priority);
  assert('install:resourceTypes-main_frame', redirect && JSON.stringify(redirect.condition.resourceTypes) === '["main_frame"]', redirect && JSON.stringify(redirect.condition.resourceTypes));
  assert('install:requestMethods-only-get', redirect && JSON.stringify(redirect.condition.requestMethods) === '["get"]', redirect && JSON.stringify(redirect.condition.requestMethods));
  assert('install:regex-all-http', redirect && redirect.condition.regexFilter === '^(https?://.+)$', redirect && redirect.condition.regexFilter);
  assert('install:redirect-target-guard-with-capture', redirect && redirect.action.redirect.regexSubstitution === 'chrome-extension://fakeid/guard.html#\\1', redirect && redirect.action.redirect.regexSubstitution);

  /* ---------- B. Messaging-Authentisierung ---------- */
  setTab(sb, 7, GUARD);
  let r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: 'https://evil.test/' });
  assert('msg:web-origin-rejected', r && r.ok === false, JSON.stringify(r));
  assert('msg:web-origin-created-no-rule', sb.state.session.length === 0, JSON.stringify(sb.state.session));
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, {});
  assert('msg:missing-sender-url-rejected', r && r.ok === false, JSON.stringify(r));
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: GUARD + '#https://paypa1.com/' });
  assert('msg:guard-sender-accepted', r && r.ok === true, JSON.stringify(r));

  // Tab nicht mehr auf Schutzseite
  sb = createSandbox({ local: {} }); await sleep(60);
  setTab(sb, 9, 'https://evil.test/');
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 9 }, { url: GUARD });
  assert('msg:tab-not-on-guard-rejected', r && r.ok === false, JSON.stringify(r));
  assert('msg:tab-not-on-guard-no-rule', sb.state.session.length === 0, JSON.stringify(sb.state.session));

  // Nicht-HTTP-Schemata / ungültige URL
  sb = createSandbox({ local: {} }); await sleep(60); setTab(sb, 7, GUARD);
  for (const bad of ['javascript:alert(1)', 'file:///C:/Windows/win.ini', 'data:text/html,<script>1</script>', 'chrome://extensions/', '//evil.test/']) {
    r = await sendMessage(sb, { type: 'allow-once', url: bad, tabId: 7 }, { url: GUARD });
    assert('msg:scheme-rejected:' + bad.slice(0, 24), r && r.ok === false, JSON.stringify(r));
  }
  assert('msg:no-rule-after-scheme-rejects', sb.state.session.length === 0, JSON.stringify(sb.state.session));

  /* ---------- C. Freigabe-Regel exakt & tab-gebunden ---------- */
  sb = createSandbox({ local: {} }); await sleep(60); setTab(sb, 7, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/#fragment', tabId: 7 }, { url: GUARD });
  assert('allow:ok', r && r.ok === true, JSON.stringify(r));
  assert('allow:one-session-rule', sb.state.session.length === 1, JSON.stringify(sb.state.session));
  const rule = sb.state.session[0];
  assert('allow:action-allow', rule && rule.action.type === 'allow', rule && JSON.stringify(rule.action));
  assert('allow:priority-above-redirect', rule && rule.priority > 1, rule && rule.priority);
  assert('allow:tab-scoped', rule && JSON.stringify(rule.condition.tabIds) === '[7]', rule && JSON.stringify(rule.condition.tabIds));
  assert('allow:main-frame-only', rule && JSON.stringify(rule.condition.resourceTypes) === '["main_frame"]', rule && JSON.stringify(rule.condition.resourceTypes));
  assert('allow:id-in-alloc-range', rule && rule.id >= 10001, rule && rule.id);
  let re = null; try { re = new RegExp(rule.condition.regexFilter); } catch { re = null; }
  assert('allow:regex-matches-exact-url', re && re.test('https://paypa1.com/'), re && rule.condition.regexFilter);
  assert('allow:regex-not-other-path', re && !re.test('https://paypa1.com/other'), rule && rule.condition.regexFilter);
  assert('allow:regex-not-other-host', re && !re.test('https://evil.test/'), rule && rule.condition.regexFilter);

  // Regex-Metazeichen werden escaped
  sb = createSandbox({ local: {} }); await sleep(60); setTab(sb, 11, GUARD);
  const meta = 'https://evil.test/a+b?c=d&e=(f)[g]';
  r = await sendMessage(sb, { type: 'allow-once', url: meta, tabId: 11 }, { url: GUARD });
  const metaRule = sb.state.session[0];
  let metaRe = null; try { metaRe = new RegExp(metaRule.condition.regexFilter); } catch { metaRe = null; }
  assert('allow:metachar-escaped-exact', !!(r && r.ok && metaRe && metaRe.test(meta) && !metaRe.test('https://evil.test/aab?c=d&e=(f)[g]')), metaRule && metaRule.condition.regexFilter);
  // Einmaligkeit: zweite Freigabe ersetzt die erste
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 11 }, { url: GUARD });
  assert('allow:second-replaces-first', sb.state.session.length === 1 && sb.state.session[0].condition.tabIds[0] === 11, JSON.stringify(sb.state.session));
  // Commit löscht
  sb.events.committed.listeners[0]({ tabId: 11, frameId: 0, url: 'https://paypa1.com/' });
  await sleep(30);
  assert('allow:cleared-on-commit', sb.state.session.length === 0, JSON.stringify(sb.state.session));
  // Tab-Schließen löscht
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 11 }, { url: GUARD });
  await sleep(10);
  sb.events.removed.listeners[0](11);
  await sleep(30);
  assert('allow:cleared-on-tab-close', sb.state.session.length === 0, JSON.stringify(sb.state.session));
  // Kein Timeout im Code (Lifecycle-Beobachtung)
  const bgSrc = fs.readFileSync(BG, 'utf8');
  obs('allow:no-timeout-implementation',
    'Kommentar background.js:42-43 verspricht "Remove at first commit, timeout/next navigation, and on tab close", im Code existieren jedoch weder setTimeout noch Alarm/TTL (background.js:44-65). Session-Regeln können bis zum nächsten Service-Worker-Start (configure purge) bestehen bleiben, wenn kein Commit erfolgt.');

  /* ---------- D. Überlange URL ---------- */
  sb = createSandbox({ local: {} }); await sleep(60); setTab(sb, 7, GUARD);
  const longUrl = 'https://evil.test/' + 'a'.repeat(2000);
  r = await sendMessage(sb, { type: 'allow-once', url: longUrl, tabId: 7 }, { url: GUARD });
  assert('allow:overlong-url-rejected', r && r.ok === false && /zu lang/i.test(String(r.error)), JSON.stringify(r));

  /* ---------- E. Reduced Mode (strictMode=false) ---------- */
  sb = createSandbox({ local: { strictMode: true } }); await sleep(60);
  assert('reduced:initial-rule-present', sb.state.dynamic.length === 1, JSON.stringify(sb.state.dynamic));
  sb.state.local.strictMode = false;
  for (const f of sb.events.changed.listeners) f({ strictMode: { newValue: false } }, 'local');
  await sleep(80);
  assert('reduced:rule-removed', sb.state.dynamic.length === 0, JSON.stringify(sb.state.dynamic));
  sb.events.before.listeners[0]({ frameId: 0, tabId: 5, url: 'https://paypa1.com/' });
  await sleep(30);
  assert('reduced:observer-redirects-best-effort', sb.state.updated.length === 1 && /guard\.html\?url=/.test(sb.state.updated[0].url), JSON.stringify(sb.state.updated));
  setTab(sb, 5, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 5 }, { url: GUARD });
  assert('reduced:allow-once-ok-best-effort', r && r.ok === true, JSON.stringify(r));
  assert('reduced:no-dnr-rule-created', sb.state.session.length === 0, JSON.stringify(sb.state.session));
  sb.events.before.listeners[0]({ frameId: 0, tabId: 5, url: 'https://paypa1.com/' });
  await sleep(20);
  assert('reduced:observer-bypass-skips-once', sb.state.updated.length === 1, JSON.stringify(sb.state.updated));
  sb.events.before.listeners[0]({ frameId: 0, tabId: 5, url: 'https://paypa1.com/' });
  await sleep(20);
  assert('reduced:next-navigation-redirected-again', sb.state.updated.length === 2, JSON.stringify(sb.state.updated));
  obs('reduced:fail-open-by-design',
    'strictMode=false entfernt die präventive DNR-Regel vollständig; Schutz nur noch best-effort über webNavigation/tabs.update (background.js:23,79-87). Popup weist darauf hin, dennoch ist dies ein bewusster Fail-open-Betriebsmodus ohne sicherheitsseitige Bestätigung/Trust-Indikator.');

  /* ---------- F. Startup-Bereinigung stale Session-Regeln ---------- */
  sb = createSandbox({ seedSession: [{ id: 10001, priority: 10, action: { type: 'allow' }, condition: { regexFilter: '^https://x$' } }, { id: 500, priority: 1, action: { type: 'block' }, condition: {} }] });
  await sleep(80);
  assert('startup:purges-allow-rules', !sb.state.session.some(x => x.id >= 10001), JSON.stringify(sb.state.session));
  assert('startup:keeps-foreign-rules', sb.state.session.some(x => x.id === 500), JSON.stringify(sb.state.session));
  assert('startup:restores-redirect-rule', sb.state.dynamic.some(x => x.id === 1000), JSON.stringify(sb.state.dynamic));

  /* ---------- G. Fail-open bei Konfigurationsfehler ---------- */
  sb = createSandbox({ storageGetFails: true });
  await sleep(80);
  const ruleAfterFail = sb.state.dynamic.find(r => r.id === 1000);
  obs('failopen:config-error-no-rule',
    'storage.local.get-Fehler in configure(): configure() rejected (console.error), KEINE DNR-Regel registriert, KEINE Nutzeranzeige. Da strict weiterhin true ist, greift auch der Beobachter-Pfad nicht — Navigationen laufen ungeprüft (Fail-open, background.js:15,23,69-73,104).');
  assert('failopen:observed-as-design-defect', ruleAfterFail === undefined && sb.state.consoleErrors.length > 0,
    'rule=' + JSON.stringify(ruleAfterFail) + ' consoleErrors=' + JSON.stringify(sb.state.consoleErrors));

  /* ---------- H. Race: parallele configure()-Läufe ---------- */
  sb = createSandbox({ local: { strictMode: true } });
  await sleep(60);
  sb.state.delayNextRemoveMs = 80; // Lauf A (strict=false) verzögert sein remove
  sb.state.local.strictMode = false;
  for (const f of sb.events.changed.listeners) f({ strictMode: { newValue: false } }, 'local'); // Lauf A startet
  await sleep(10);
  sb.state.local.strictMode = true;
  for (const f of sb.events.changed.listeners) f({ strictMode: { newValue: true } }, 'local'); // Lauf B (strict=true) parallel
  await sleep(250);
  const finalRule = sb.state.dynamic.find(r => r.id === 1000);
  obs('race:configure-interleaving',
    'Synthetisches Interleaving zweier configure()-Läufe (strict false -> true, Remove aus Lauf A um 80 ms verzögert): Lauf B fügt die Redirect-Regel hinzu, der verzögerte Remove aus Lauf A löscht sie danach wieder. Ergebnis: DNR-Regel vorhanden=' + !!finalRule + ' bei gespeichertem strictMode=true. configure() ist nicht serialisiert (background.js:14-41,71-73); ein reales Auftreten im Browser ist NICHT_TESTED — das Scheduling ist plausibel, aber nicht beobachtet.');

  /* ---------- I. Zähler ---------- */
  sb = createSandbox({ local: {} }); await sleep(60); setTab(sb, 7, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7, recordBlock: true }, { url: GUARD });
  await sleep(20);
  assert('counter:recordBlock-increments', sb.state.local.blocked === 1, JSON.stringify(sb.state.local));

  /* ---------- Ergebnis ---------- */
  const result = {
    probe: 'probe04_chrome_background_mock',
    timestamp_utc: new Date().toISOString(),
    environment: 'Node ' + process.version + ' vm-Sandbox mit gemockter chrome-API (kein echter Browser)',
    assertions_total: assertions.length,
    assertions_failed: failures.length,
    assertions,
    observations
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('[probe04] Assertions: ' + (assertions.length - failures.length) + '/' + assertions.length + ' PASS, ' + failures.length + ' FAIL');
  for (const f of failures) console.log('  FAIL: ' + f);
  for (const o of observations) console.log('  OBS : ' + o.name);
  console.log('[probe04] report: ' + path.relative(ROOT, OUT));
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('[probe04] FATAL', e); process.exit(2); });
