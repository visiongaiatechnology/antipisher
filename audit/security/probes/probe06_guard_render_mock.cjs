#!/usr/bin/env node
/* Audit probe 06 — Guard-Page-Rendering mit DOM-Stub (nichtdestruktiv, offline, KEIN Browser).
 * Prüft: Query/Hash-Fallback, XSS-Sinks (textContent vs innerHTML), Auto-Navigation,
 * Offizielle-Seite-Ziel, Fehlerpfade/Fail-closed, Clickjacking-relevante tabId-Bindung.
 * Exit 0 = alle Sicherheits-Kontrollassertions halten.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'guard_render_mock.json');
const GUARD_JS = path.join(ROOT, 'shared', 'guard.js');
const failures = [], assertions = [], observations = [];
function assert(name, ok, detail) { assertions.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); if (!ok) failures.push(name + ' :: ' + detail); }
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GUARD_URL = 'chrome-extension://fakeid/guard.html';

function makeElement(id) {
  const writes = [];
  const el = {
    id, hidden: ['danger', 'confirm', 'error'].includes(id), textContent: '', style: {}, attrs: {}, handlers: {}, writes,
    addEventListener(ev, fn) { this.handlers[ev] = fn; },
    setAttribute(k, v) { this.attrs[k] = v; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set(v) { writes.push({ prop: 'innerHTML', value: String(v) }); }
  });
  const origText = Object.getOwnPropertyDescriptor(el, 'textContent');
  Object.defineProperty(el, 'textContent', {
    get() { return origText.value; },
    set(v) { writes.push({ prop: 'textContent', value: String(v) }); origText.value = String(v); }
  });
  return el;
}

function createGuardSandbox(opts) {
  opts = opts || {};
  const ids = ['symbol', 'badge', 'title', 'description', 'danger', 'host', 'reason', 'official', 'safe', 'back', 'reveal', 'confirm', 'proceed', 'error'];
  const elements = Object.fromEntries(ids.map(id => [id, makeElement(id)]));
  const state = { replaced: [], messages: [], historyBack: 0, sendResponse: opts.sendResponse || { ok: true } };
  const location = {
    href: GUARD_URL + (opts.suffix || ''),
    hash: opts.hash !== undefined ? opts.hash : '',
    search: '',
    replace(u) { state.replaced.push(u); }
  };
  const api = {
    tabs: {
      async getCurrent() { return opts.getCurrent === undefined ? { id: 7 } : opts.getCurrent; }
    },
    runtime: {
      async sendMessage(msg) { state.messages.push(JSON.parse(JSON.stringify(msg))); return state.sendResponse; }
    }
  };
  const document = { getElementById: id => elements[id] || null };
  const ctx = {
    browser: api, document, location, history: { back() { state.historyBack++; } },
    URL, Promise, String, Error, JSON, Object, Array, console: { log() { }, warn() { }, error() { } }, Map, Set
  };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  for (const f of ['shared/sites.js', 'shared/detector.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context);
  vm.runInContext(fs.readFileSync(GUARD_JS, 'utf8'), context);
  return { state, elements, ctx };
}
function click(sb, id) { const h = sb.elements[id].handlers.click; if (!h) throw new Error('kein click-Handler an ' + id); h({}); }

(async () => {
  /* A. Blockierte URL über Hash */
  let sb = createGuardSandbox({ hash: '#https://paypa1.com/' });
  await sleep(10);
  assert('blocked:title', sb.elements.title.textContent === 'Möglicher Domain-Betrug abgewehrt', sb.elements.title.textContent);
  assert('blocked:danger-visible', sb.elements.danger.hidden === false);
  assert('blocked:host-textContent', sb.elements.host.textContent === 'paypa1.com', sb.elements.host.textContent);
  assert('blocked:no-auto-navigation', sb.state.messages.length === 0 && sb.state.replaced.length === 0, JSON.stringify(sb.state.messages));
  assert('blocked:reason-mapped', /fremden Alphabeten|Markennamen|Tippfehler|Drittanbieter|Zeichen/.test(sb.elements.reason.textContent), sb.elements.reason.textContent);

  /* B. XSS-Payload im URL-Hash einer blockierten Domain */
  sb = createGuardSandbox({ hash: '#https://paypa1.com/<img src=x onerror=alert(1)>' });
  await sleep(10);
  const anyInnerHTML = Object.values(sb.elements).some(e => e.writes.some(w => w.prop === 'innerHTML'));
  assert('xss:no-innerHTML-writes', !anyInnerHTML, 'innerHTML-Writes gefunden');
  assert('xss:host-only-text', sb.elements.host.textContent === 'paypa1.com', sb.elements.host.textContent);
  assert('xss:navigation-blocked', sb.state.replaced.length === 0 && sb.state.messages.length === 0, JSON.stringify(sb.state));
  obs('xss:textContent-only', 'guard.js setzt alle untrusted Werte (host/reason/official/site/error) ausschließlich über textContent (guard.js:26-27,44-45,60-62,39); kein innerHTML/insertAdjacentHTML/eval im gesamten Repo (siehe probe09).');

  /* C. Sichere URL über Query -> Auto-Freigabe */
  const safeTarget = 'https://example.com/pfad?x=1&y=2#frag';
  sb = createGuardSandbox({ suffix: '?url=' + encodeURIComponent(safeTarget) });
  await sleep(30);
  assert('safe:message-sent', sb.state.messages.length === 1, JSON.stringify(sb.state.messages));
  const m = sb.state.messages[0] || {};
  assert('safe:message-type-tabid', m.type === 'allow-once' && m.tabId === 7, JSON.stringify(m));
  assert('safe:message-url-exact', m.url === safeTarget, JSON.stringify(m.url));
  assert('safe:recordBlock-false', m.recordBlock === false, String(m.recordBlock));
  assert('safe:navigates-to-target', sb.state.replaced.length === 1 && sb.state.replaced[0] === safeTarget, JSON.stringify(sb.state.replaced));

  /* D. XSS-Payload im Pfad einer als sicher klassifizierten URL */
  const payloadTarget = 'https://example.test/<img src=x onerror=alert(1)>';
  sb = createGuardSandbox({ hash: '#' + payloadTarget });
  await sleep(30);
  assert('xss-safe:no-innerHTML', !Object.values(sb.elements).some(e => e.writes.some(w => w.prop === 'innerHTML')));
  assert('xss-safe:message-url-raw-exact', sb.state.messages.length === 1 && sb.state.messages[0].url === payloadTarget, JSON.stringify(sb.state.messages));
  assert('xss-safe:navigation-raw-exact', sb.state.replaced.length === 1 && sb.state.replaced[0] === payloadTarget, JSON.stringify(sb.state.replaced));

  /* E. Proceed / Offizielle Seite / Back / Reveal */
  sb = createGuardSandbox({ hash: '#https://paypa1.com/' });
  await sleep(10);
  assert('ui:proceed-handler-exists', typeof sb.elements.proceed.handlers.click === 'function');
  assert('ui:safe-handler-exists', typeof sb.elements.safe.handlers.click === 'function');
  click(sb, 'reveal');
  assert('ui:reveal-toggles-confirm', sb.elements.confirm.hidden === false && sb.elements.reveal.attrs['aria-expanded'] === 'true', JSON.stringify(sb.elements.reveal.attrs));
  click(sb, 'proceed');
  await sleep(30);
  const pm = sb.state.messages[0] || {};
  assert('ui:proceed-sends-recordBlock', pm.recordBlock === true && pm.url === 'https://paypa1.com/', JSON.stringify(pm));
  assert('ui:proceed-navigates', sb.state.replaced[0] === 'https://paypa1.com/', JSON.stringify(sb.state.replaced));
  assert('ui:proceed-tabid-bound', pm.tabId === 7, JSON.stringify(pm));

  sb = createGuardSandbox({ hash: '#https://paypa1.com/' });
  await sleep(10);
  click(sb, 'safe');
  await sleep(30);
  const om = sb.state.messages[0] || {};
  assert('ui:official-button-target', om.url === 'https://paypal.com/', JSON.stringify(om));
  assert('ui:official-button-no-recordBlock', om.recordBlock === false, String(om.recordBlock));

  sb = createGuardSandbox({ hash: '#https://paypa1.com/' });
  await sleep(10);
  click(sb, 'back');
  assert('ui:back-history', sb.state.historyBack === 1);

  /* F. Ungültige / fehlende Ziele */
  for (const [name, opts] of [
    ['invalid-hash', { hash: '#not-a-url' }],
    ['empty', {}],
    ['non-http-scheme', { hash: '#javascript:alert(1)' }],
    ['ftp-scheme', { hash: '#ftp://example.com/' }]
  ]) {
    sb = createGuardSandbox(opts);
    await sleep(30);
    assert('invalid:' + name + ':no-message', sb.state.messages.length === 0, JSON.stringify(sb.state.messages));
    assert('invalid:' + name + ':no-navigation', sb.state.replaced.length === 0, JSON.stringify(sb.state.replaced));
  }

  /* G. Fail-closed-Pfade */
  sb = createGuardSandbox({ suffix: '?url=' + encodeURIComponent('https://example.com/'), getCurrent: null });
  await sleep(30);
  assert('failclosed:no-tab-no-navigation', sb.state.replaced.length === 0, JSON.stringify(sb.state.replaced));
  assert('failclosed:no-tab-error-visible', sb.elements.error.hidden === false && /Tab|Freigabe|Navigation/.test(sb.elements.error.textContent), sb.elements.error.textContent);

  sb = createGuardSandbox({ suffix: '?url=' + encodeURIComponent('https://example.com/'), sendResponse: { ok: false, error: 'simulierter Fehler' } });
  await sleep(30);
  assert('failclosed:rejected-message-no-navigation', sb.state.replaced.length === 0, JSON.stringify(sb.state.replaced));
  assert('failclosed:rejected-message-error-visible', sb.elements.error.hidden === false && /simulierter Fehler/.test(sb.elements.error.textContent), sb.elements.error.textContent);
  obs('guard:error-message-content', 'Fehlermeldungen der Schutzseite geben nur generische Texte/Fehlercodes aus, nicht die Ziel-URL (guard.js:21-24,39).');

  /* H. Query vs. Hash Priorität */
  sb = createGuardSandbox({ suffix: '?url=' + encodeURIComponent('https://example.com/query'), hash: '#https://paypa1.com/' });
  await sleep(30);
  const hm = sb.state.messages[0] || {};
  assert('parsing:query-wins-over-hash', hm.url === 'https://example.com/query', JSON.stringify(hm));

  /* I. Clickjacking-relevante Beobachtung */
  obs('clickjacking:tab-binding',
    'guard.html ist in Chrome web-accessible; ein Einbetten/Öffnen aus Web-Origins ist möglich. Die Freigabe-Message ist aber an sender.url=guard.html UND tab.url=guard.html gebunden (chrome/background.js:91-95; Mock-Test probe04). Ein iframe aus einer Webseite kann tabId nicht auf einen Guard-Tab umbiegen — der Angriff scheitert fail-closed. Kein Browser-E2E verfügbar.');

  /* Ergebnis */
  const result = {
    probe: 'probe06_guard_render_mock',
    timestamp_utc: new Date().toISOString(),
    environment: 'Node ' + process.version + ' vm-Sandbox mit DOM-Stub (kein echter Browser)',
    assertions_total: assertions.length,
    assertions_failed: failures.length,
    assertions,
    observations
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('[probe06] Assertions: ' + (assertions.length - failures.length) + '/' + assertions.length + ' PASS, ' + failures.length + ' FAIL');
  for (const f of failures) console.log('  FAIL: ' + f);
  for (const o of observations) console.log('  OBS : ' + o.name);
  console.log('[probe06] report: ' + path.relative(ROOT, OUT));
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('[probe06] FATAL', e); process.exit(2); });
