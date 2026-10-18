#!/usr/bin/env node
/* Audit probe 05 — Firefox-Hintergrundlogik mit gemockter browser-API
 * (nichtdestruktiv, offline, KEIN echter Browser).
 * Prüft webRequest-Blocking, Einmal-Bypass-Semantik, Messaging-Authentisierung,
 * Bypass-Lebensdauer und Verhalten bei fehlender Detektor-Engine.
 * Exit 0 = alle Sicherheits-Kontrollassertions halten.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'firefox_background_mock.json');
const BG = path.join(ROOT, 'firefox', 'background.js');
const failures = [], assertions = [], observations = [];
function assert(name, ok, detail) { assertions.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); if (!ok) failures.push(name + ' :: ' + detail); }
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }
const GUARD = 'moz-extension://fake/guard.html';

function fEvents() { const listeners = []; return { listeners, addListener(fn) { listeners.push(fn); } }; }

/* opts: { tabs, withEngine (default true), local } */
function createSandbox(opts = {}) {
  const events = { before: fEvents(), removed: fEvents(), message: fEvents() };
  const state = { local: Object.assign({}, opts.local || {}), consoleErrors: [] };
  const tabs = Object.assign({}, opts.tabs || {});
  const browser = {
    runtime: { getURL: p => 'moz-extension://fake/' + p, onMessage: events.message },
    webRequest: { onBeforeRequest: events.before },
    tabs: {
      onRemoved: events.removed,
      async get(tabId) { if (!(tabId in tabs)) throw new Error('invalid tab id'); return { id: tabId, url: tabs[tabId].url }; }
    },
    storage: { local: { async get(key) { return { [key]: state.local[key] }; }, async set(values) { Object.assign(state.local, values); } } }
  };
  const consoleMock = { error: (...a) => state.consoleErrors.push(a.map(String).join(' ')), log: () => { }, warn: () => { }, info: () => { } };
  const ctx = { browser, URL, console: consoleMock, Map, Set, Promise, Error, String, Number, JSON, Object, Array, RegExp };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  if (opts.withEngine !== false) {
    for (const f of ['shared/sites.js', 'shared/detector.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'firefox', f), 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(BG, 'utf8'), context);
  return { state, events, tabs, browser };
}
function setTab(sb, id, url) { sb.tabs[id] = { url }; }
function beforeRequest(sb, details) { return sb.events.before.listeners[0]({ url: details.url, tabId: details.tabId, type: 'main_frame', method: details.method || 'GET' }); }
function sendMessage(sb, req, sender) { return sb.events.message.listeners[0](req, sender); }

(async () => {
  let sb = createSandbox();

  /* ---------- A. Blocking-Grundverhalten ---------- */
  let clean = beforeRequest(sb, { url: 'https://paypal.com/', tabId: 7 });
  assert('block:safe-returns-empty', JSON.stringify(clean) === '{}', JSON.stringify(clean));
  let blocked = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  assert('block:suspect-redirects-to-guard', blocked && /^moz-extension:\/\/fake\/guard\.html\?url=/.test(blocked.redirectUrl || ''), JSON.stringify(blocked));
  assert('block:guard-url-carries-encoded-target', blocked && decodeURIComponent(blocked.redirectUrl.split('url=')[1]) === 'https://paypa1.com/', blocked && blocked.redirectUrl);

  /* ---------- B. Freigabe nur über Schutzseite ---------- */
  setTab(sb, 7, GUARD + '?url=https%3A%2F%2Fpaypa1.com%2F');
  let r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: 'https://evil.test/' });
  assert('msg:web-origin-rejected', r && r.ok === false, JSON.stringify(r));
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, {});
  assert('msg:missing-sender-url-rejected', r && r.ok === false, JSON.stringify(r));
  // Tab nicht auf Schutzseite
  setTab(sb, 8, 'https://evil.test/');
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 8 }, { url: GUARD });
  assert('msg:tab-not-on-guard-rejected', r && r.ok === false, JSON.stringify(r));
  // Nicht-HTTP-Schema
  for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,x']) {
    r = await sendMessage(sb, { type: 'allow-once', url: bad, tabId: 8 }, { url: GUARD });
    assert('msg:scheme-rejected:' + bad.slice(0, 20), r && r.ok === false, JSON.stringify(r));
  }

  /* ---------- C. Einmal-Bypass-Semantik ---------- */
  sb = createSandbox(); setTab(sb, 7, GUARD + '?url=x');
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: GUARD });
  assert('once:allow-once-ok', r && r.ok === true, JSON.stringify(r));
  let once = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  assert('once:first-retry-allowed', JSON.stringify(once) === '{}', JSON.stringify(once));
  const second = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  assert('once:second-retry-blocked', !!second.redirectUrl, JSON.stringify(second));
  // Andere (ebenfalls verdächtige) URL im selben Tab wird nicht mitfreigegeben
  sb = createSandbox(); setTab(sb, 7, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: GUARD });
  const other = beforeRequest(sb, { url: 'https://amzaon.com/', tabId: 7 });
  assert('once:other-url-blocked', !!other.redirectUrl, JSON.stringify(other));
  // Tab-Schließen löscht Bypass
  sb = createSandbox(); setTab(sb, 7, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: GUARD });
  sb.events.removed.listeners[0](7);
  const afterClose = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  assert('once:tab-close-clears-bypass', !!afterClose.redirectUrl, JSON.stringify(afterClose));

  /* ---------- D. Bypass-Lebensdauer (Beobachtung) ---------- */
  sb = createSandbox(); setTab(sb, 7, GUARD);
  r = await sendMessage(sb, { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: GUARD });
  beforeRequest(sb, { url: 'https://evil.test/', tabId: 7 }); // andere geblockte Navigation
  const stale = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  obs('once:no-ttl-stale-bypass',
    'Ein gesetztes Einmal-Bypass bleibt unbegrenzt scharf, wenn die freigegebene Navigation nicht stattfindet (kein TTL/Alarm; firefox/background.js:6-9,29-34). Test: nach allow-once für A, einer anderen (geblockten) Navigation und erneutem A-Request wird A weiterhin erlaubt=' + (JSON.stringify(stale) === '{}') + '.');

  /* ---------- E. Fehlende Engine / Fehlerverhalten (Beobachtung) ---------- */
  sb = createSandbox({ withEngine: false });
  let threw = null;
  try { beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 }); } catch (e) { threw = e; }
  obs('engine:missing-engine-throws',
    'Ohne geladene Detektor-Engine wirft analyzeRequest beim Zugriff auf engine.classify (firefox/background.js:10-11). Beobachtet: ' + (threw ? String(threw.message || threw) : 'kein Throw') + '. Ob Firefox die Hauptnavigation bei einem werfenden blocking-Listener blockiert oder durchlässt, ist ohne Browser-E2E NICHT_TESTED (Fail-open-Hypothese).');

  /* ---------- F. strictMode wird ignoriert (Parität) ---------- */
  sb = createSandbox({ local: { strictMode: false } });
  const strictIgnored = beforeRequest(sb, { url: 'https://paypa1.com/', tabId: 7 });
  obs('strict:ignored-in-firefox',
    'storage.local.strictMode=false hat in Firefox keine Wirkung (kein Lesen des Werts, firefox/background.js gesamt); Chrome-Popup blendet die Option für Firefox aus. Verhalten ist insofern konsistent, aber der gespeicherte Modus ist browserübergreifend nicht semantisch gleich. Block trotz strictMode=false=' + !!strictIgnored.redirectUrl + '.');

  /* ---------- G. Persistenzmodell (Beobachtung) ---------- */
  obs('state:volatile-event-page',
    'Firefox MV3 background.scripts ist ohne persistent:true eine Event-Page; die bypass-Map (firefox/background.js:6) lebt nur im Hintergrundseiten-Speicher. Bei Suspend geht eine ausstehende Freigabe verloren (fail-closed für den Nutzer: erneute Blockade/Interstitial), ein Beweis im echten Browser ist NOT_TESTED.');

  /* ---------- Ergebnis ---------- */
  const result = {
    probe: 'probe05_firefox_background_mock',
    timestamp_utc: new Date().toISOString(),
    environment: 'Node ' + process.version + ' vm-Sandbox mit gemockter browser-API (kein echter Browser)',
    assertions_total: assertions.length,
    assertions_failed: failures.length,
    assertions,
    observations
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('[probe05] Assertions: ' + (assertions.length - failures.length) + '/' + assertions.length + ' PASS, ' + failures.length + ' FAIL');
  for (const f of failures) console.log('  FAIL: ' + f);
  for (const o of observations) console.log('  OBS : ' + o.name);
  console.log('[probe05] report: ' + path.relative(ROOT, OUT));
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('[probe05] FATAL', e); process.exit(2); });
