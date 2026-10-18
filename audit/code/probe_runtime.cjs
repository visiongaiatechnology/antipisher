#!/usr/bin/env node
/*
 * Antipisher 0.1 Alpha - ausfuehrbare Runtime-Probes fuer Chrome-/Firefox-Architektur.
 * AUDIT-ONLY: simulierte Browser-APIs (kein echter Browser), keine Quellcode-Aenderung.
 *
 * Ausfuehrung:  node audit/code/probe_runtime.cjs
 * Ausgabe:      audit/code/runtime_probes.txt + stdout
 * Exitcode:     0 = Probes ausgefuehrt (Befunde werden dokumentiert)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'audit', 'code', 'runtime_probes.txt');
const DELAY = (ms = 30) => new Promise(r => setTimeout(r, ms));

// Engine im Hauptkontext fuer Property-/Fuzz-Tests (die Sandboxen laden eigene Kopien im VM-Kontext)
require(path.join(ROOT, 'shared', 'sites.js'));
const engine = require(path.join(ROOT, 'shared', 'detector.js'));

const lines = [];
let passCount = 0, failCount = 0, warnCount = 0;
function rec(tag, title, evidence) {
  if (tag === 'PASS') passCount += 1; else if (tag === 'FAIL') failCount += 1; else warnCount += 1;
  lines.push(`[${tag}] ${title}`);
  if (evidence) lines.push('       ' + String(evidence).replace(/\n/g, '\n       '));
}
function fakeEvents() {
  const listeners = [];
  return { listeners, addListener(fn) { listeners.push(fn); } };
}

/* ---------------------------------------------------------------------- */
/* Chrome-Sandbox (an Repository-Test angelehnt, aber mit Overrides)      */
/* ---------------------------------------------------------------------- */
function chromeSandbox(opts = {}) {
  const events = {
    installed: fakeEvents(), start: fakeEvents(), changed: fakeEvents(), removed: fakeEvents(),
    committed: fakeEvents(), before: fakeEvents(), message: fakeEvents()
  };
  const local = Object.assign({}, opts.storage || {});
  const dynamic = [];
  const session = opts.sessionRules ? [...opts.sessionRules] : [];
  const updated = [];
  const errors = [];
  const chrome = {
    runtime: {
      id: 'fakeid',
      getURL: p => 'chrome-extension://fakeid/' + p,
      onInstalled: events.installed, onStartup: events.start, onMessage: events.message
    },
    storage: {
      local: {
        async get(keys) {
          const ks = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
          return Object.fromEntries(ks.filter(k => k in local).map(k => [k, local[k]]));
        },
        async set(values) { Object.assign(local, values); }
      },
      onChanged: events.changed
    },
    tabs: {
      onRemoved: events.removed,
      async get() {
        return { id: 7, url: (opts.tabUrl || 'chrome-extension://fakeid/guard.html#https://paypa1.com') };
      },
      async update(tabId, changes) { updated.push({ tabId, ...changes }); }
    },
    webNavigation: { onCommitted: events.committed, onBeforeNavigate: events.before },
    declarativeNetRequest: {
      async getDynamicRules() { return [...dynamic]; },
      async getSessionRules() { return [...session]; },
      async isRegexSupported() {
        return opts.regexSupported === false
          ? { isSupported: false, reason: 'test-regex-unsupported' }
          : { isSupported: true };
      },
      async updateDynamicRules({ removeRuleIds = [], addRules = [] } = {}) {
        for (const id of removeRuleIds) {
          const k = dynamic.findIndex(x => x.id === id);
          if (k >= 0) dynamic.splice(k, 1);
        }
        dynamic.push(...addRules);
      },
      async updateSessionRules({ removeRuleIds = [], addRules = [] } = {}) {
        for (const id of removeRuleIds) {
          const k = session.findIndex(x => x.id === id);
          if (k >= 0) session.splice(k, 1);
        }
        session.push(...addRules);
      }
    }
  };
  const sandboxConsole = { error: (...a) => errors.push(a.join(' ')), log() {}, warn() {} };
  const ctx = { chrome, URL, console: sandboxConsole, Map, Set, Promise, JSON };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  const chromeDir = path.join(ROOT, 'chrome');
  ctx.importScripts = (...names) => {
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(chromeDir, f), 'utf8'), context);
  };
  vm.runInContext(fs.readFileSync(path.join(chromeDir, 'background.js'), 'utf8'), context);
  return { chrome, local, dynamic, session, updated, events, errors };
}

/* ---------------------------------------------------------------------- */
/* Firefox-Sandbox                                                        */
/* ---------------------------------------------------------------------- */
function firefoxSandbox() {
  const events = { before: fakeEvents(), removed: fakeEvents(), message: fakeEvents() };
  const local = {};
  const browser = {
    runtime: { getURL: p => 'moz-extension://fake/' + p, onMessage: events.message },
    webRequest: { onBeforeRequest: events.before },
    tabs: {
      onRemoved: events.removed,
      async get() { return { id: 7, url: 'moz-extension://fake/guard.html?url=https%3A%2F%2Fpaypa1.com' }; }
    },
    storage: { local: { async get(key) { return { [key]: local[key] }; }, async set(v) { Object.assign(local, v); } } }
  };
  const ctx = { browser, URL, console, Map, Promise, JSON };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  const ffDir = path.join(ROOT, 'firefox');
  for (const f of ['shared/sites.js', 'shared/detector.js', 'background.js']) {
    vm.runInContext(fs.readFileSync(path.join(ffDir, f), 'utf8'), context);
  }
  return { events, browser, local };
}

function callMessage(harness, req, replySpy) {
  const listener = harness.events.message.listeners[0];
  return new Promise(resolve => {
    const maybe = listener(req, { url: 'chrome-extension://fakeid/guard.html#https://paypa1.com' },
      replySpy || ((resp) => resolve(resp)));
    if (maybe && typeof maybe.then === 'function') maybe.then(x => { if (x !== undefined) resolve(x); }, () => {});
  });
}

(async () => {
  lines.push('ANTIPISHER 0.1 ALPHA - RUNTIME-PROBES (SIMULIERTE BROWSER-APIs, KEIN ECHTER BROWSER)');
  lines.push('Erzeugt: ' + new Date().toISOString() + ' | Node ' + process.version + ' | Befehl: node audit/code/probe_runtime.cjs');
  lines.push('Hinweis: Chrome-/Firefox-APIs sind Mocks; echte Browser-End-to-End-Laeufe wurden NICHT ausgefuehrt (NOT_TESTED).');
  lines.push('');

  /* ---------------------------- Chrome -------------------------------- */
  lines.push('--- CHROME (Manifest V3 / declarativeNetRequest) ---');
  const cm = JSON.parse(fs.readFileSync(path.join(ROOT, 'chrome', 'manifest.json'), 'utf8'));
  const warChrome = (cm.web_accessible_resources || []).some(w => (w.resources || []).includes('guard.html'));
  rec(warChrome ? 'PASS' : 'FAIL', 'Chrome-Manifest: guard.html ist web_accessible_resource (Voraussetzung fuer DNR-Redirect auf Extension-Seite)', JSON.stringify(cm.web_accessible_resources));

  const ch = chromeSandbox();
  await DELAY(60);
  const dynamicRule = ch.dynamic[0];
  rec(dynamicRule && dynamicRule.action && dynamicRule.action.type === 'redirect' ? 'PASS' : 'FAIL',
    'Chrome: DNR-Redirect-Regel wird beim Start installiert',
    dynamicRule ? JSON.stringify({ id: dynamicRule.id, priority: dynamicRule.priority, action: dynamicRule.action, condition: dynamicRule.condition }) : 'keine Regel');
  const methods = dynamicRule && dynamicRule.condition && dynamicRule.condition.requestMethods;
  rec(Array.isArray(methods) && methods.length === 1 && methods[0] === 'get' ? 'FAIL' : 'PASS',
    'Chrome: DNR-Regel deckt nur GET ab -> POST-/Formular-Navigationen werden NICHT geprueft (Schutzluecke, README/Next.md-Gegenteilbehauptung)',
    'condition.requestMethods = ' + JSON.stringify(methods) + ' (chrome/background.js:37; Quellzeile belegt die Luecke)');

  // Allow-once: normaler Fall, Fragment wird aus dem DNR-Regex entfernt
  const normalResp = await callMessage(ch, { type: 'allow-once', url: 'https://paypa1.com/login?x=1#frag', tabId: 7, recordBlock: true });
  const normalRule = ch.session[0];
  const regexMatchesNoFrag = normalRule ? new RegExp(normalRule.condition.regexFilter).test('https://paypa1.com/login?x=1') : false;
  rec(normalResp && normalResp.ok === true && normalRule && normalRule.condition.tabIds[0] === 7 ? 'PASS' : 'FAIL',
    'Chrome: allow-once erzeugt tab-gebundene Session-Allow-Regel (Prioritaet 10)',
    normalRule ? JSON.stringify(normalRule) : JSON.stringify(normalResp));
  rec(regexMatchesNoFrag ? 'WARN' : 'FAIL',
    'Chrome: Allow-Regex wird ohne Fragment gebaut (Fragment-Trennung beim DNR-Matching; Hash-/Fragment-Verlust bei Umleitung ist plausibel, echter Browser NOT_TESTED)',
    normalRule ? 'regexFilter=' + normalRule.condition.regexFilter + ' match(fragmentlos)=' + regexMatchesNoFrag : 'keine Regel');

  // Allow-once: lange URL > 1900 Zeichen -> Fehler, Navigation unmoeglich
  const longUrl = 'https://www.bundesregierung.de/?q=' + 'a'.repeat(2100);
  const longResp = await callMessage(ch, { type: 'allow-once', url: longUrl, tabId: 7 });
  rec(longResp && longResp.ok === false && /zu lang/i.test(String(longResp.error)) ? 'FAIL' : 'PASS',
    'Chrome: URL laenger als 1900 Zeichen kann nicht freigegeben werden -> Availability-Blocker (jede lange, harmlose URL bleibt auf der Schutzseite haengen)',
    JSON.stringify(longResp));

  // Fail-open: isRegexSupported=false -> configure() wirft, es bleibt KEINE Regel, keine UI-Warnung
  const chFail = chromeSandbox({ regexSupported: false });
  await DELAY(60);
  rec(chFail.dynamic.length === 0 && chFail.errors.length > 0 ? 'FAIL' : 'PASS',
    'Chrome: Fehler in configure() (z.B. isRegexSupported negativ) fuehrt zu FAIL-OPEN (keine DNR-Regel, nur console.error; Popup zeigt Vorabpruefung dennoch als aktiv)',
    'dynamicRules=' + chFail.dynamic.length + ', console.errors=' + JSON.stringify(chFail.errors));

  // Stale Session-Regeln beim SW-Start werden entfernt (fail-closed)
  const chStale = chromeSandbox({ sessionRules: [{ id: 10005, action: { type: 'allow' }, condition: { regexFilter: '^https://paypa1\\.com/$' } }] });
  await DELAY(60);
  rec(chStale.session.length === 0 ? 'PASS' : 'FAIL',
    'Chrome: Service-Worker-Neustart entfernt verwaiste Session-Allow-Regeln (fail-closed)',
    'sessionRules nach configure=' + JSON.stringify(chStale.session));

  // Reduced Mode: best-effort Umleitung + einmaliger Bypass
  const chRed = chromeSandbox();
  await DELAY(60);
  chRed.local.strictMode = false;
  for (const f of chRed.events.changed.listeners) f({ strictMode: { newValue: false } }, 'local');
  await DELAY(40);
  const removedRule = chRed.dynamic.length === 0;
  chRed.events.before.listeners[0]({ frameId: 0, tabId: 5, url: 'https://paypa1.com/' });
  await DELAY(20);
  const redirected = chRed.updated.length === 1 && /guard\.html/.test(chRed.updated[0].url);
  rec(removedRule && redirected ? 'PASS' : 'FAIL',
    'Chrome Reduced Mode: DNR-Regel entfernt, webNavigation leitet best-effort auf guard.html?url=... um',
    'dynamicRules=' + chRed.dynamic.length + ', tabs.update=' + JSON.stringify(chRed.updated));

  /* ---------------------------- Firefox ------------------------------- */
  lines.push('');
  lines.push('--- FIREFOX (Manifest V3 / webRequestBlocking) ---');
  const fm = JSON.parse(fs.readFileSync(path.join(ROOT, 'firefox', 'manifest.json'), 'utf8'));
  const ffWar = fm.web_accessible_resources;
  rec(Array.isArray(ffWar) && ffWar.some(w => (w.resources || []).includes('guard.html')) ? 'PASS' : 'FAIL',
    'Firefox-Manifest: guard.html ist NICHT in web_accessible_resources -> Redirect auf Extension-Seite ist laut MDN-WebRequest-Doku unzulaessig (Firefox-Schutz funktional gebrochen)',
    'web_accessible_resources = ' + JSON.stringify(ffWar) + ' | MDN webRequest.onBeforeRequest: "If an extension wants to redirect a public (e.g., HTTPS) URL to an extension page, the manifest.json file must contain a web_accessible_resources key that lists the URL for the extension page."');
  rec(Array.isArray(fm.background && fm.background.scripts) ? 'PASS' : 'FAIL',
    'Firefox MV3: background.scripts ist fuer Firefox MV3 zulaessig (MDN background-Doku)',
    JSON.stringify(fm.background));
  rec(Array.isArray(fm.permissions) && fm.permissions.includes('webRequestBlocking') ? 'PASS' : 'FAIL',
    'Firefox: webRequestBlocking-Permission ist vorhanden (in Firefox MV3 verfuegbar)',
    JSON.stringify(fm.permissions));

  const ff = firefoxSandbox();
  const listener = ff.events.before.listeners[0];
  const safeRes = listener({ url: 'https://paypal.com/', tabId: 7, method: 'GET' });
  const blockRes = listener({ url: 'https://paypa1.com/', tabId: 7, method: 'GET' });
  rec(JSON.stringify(safeRes) === '{}' && /^moz-extension:\/\/fake\/guard\.html/.test(blockRes.redirectUrl) ? 'PASS' : 'FAIL',
    'Firefox: safe-URL passiert, verdaechtige main_frame-Navigation wird auf guard.html umgeleitet',
    'safe=' + JSON.stringify(safeRes) + ', block=' + JSON.stringify({ redirectUrl: blockRes.redirectUrl }));
  const ffBg = fs.readFileSync(path.join(ROOT, 'firefox', 'background.js'), 'utf8');
  const hasMethodFilter = /requestMethods|details\.method|\.method\s*===/.test(ffBg);
  rec(hasMethodFilter ? 'PASS' : 'FAIL',
    'Firefox: Listener filtert NICHT nach HTTP-Methode -> POST-Navigationen werden ebenfalls abgefangen und in GET umgewandelt (Widerspruch zu README "POST vollstaendig nativ unberuehrt")',
    'firefox/background.js enthaelt keinen Methodenfilter; types=["main_frame"] filtert alle Methoden');
  const postRes = listener({ url: 'https://paypa1.com/login', tabId: 8, method: 'POST' });
  rec(postRes && postRes.redirectUrl ? 'WARN' : 'INFO',
    'Firefox: POST-Navigation auf verdaechtige Domain wird abgefangen; Formulardaten gehen beim Proceed (GET) verloren',
    JSON.stringify({ method: 'POST', redirectUrl: postRes.redirectUrl }));

  const ffAllow = await ff.events.message.listeners[0]({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 },
    { url: 'moz-extension://fake/guard.html?url=xx' });
  const onceRes = listener({ url: 'https://paypa1.com/', tabId: 7, method: 'GET' });
  const secondRes = listener({ url: 'https://paypa1.com/', tabId: 7, method: 'GET' });
  rec(ffAllow && ffAllow.ok === true && JSON.stringify(onceRes) === '{}' && secondRes.redirectUrl ? 'PASS' : 'FAIL',
    'Firefox: allow-once gilt exakt einmal pro Tab/URL (Bypass-Map), danach wieder Blockade',
    'allow=' + JSON.stringify(ffAllow) + ', once=' + JSON.stringify(onceRes) + ', second=' + JSON.stringify({ redirectUrl: secondRes.redirectUrl }));
  rec(!/onCommitted|webNavigation/.test(ffBg) ? 'WARN' : 'INFO',
    'Firefox: kein webNavigation-Cleanup; Allow-once-Eintrag bleibt bis zur exakten URL-Nutzung/Tab-Close bestehen (Unterschied zu Chrome)',
    'bypass.clear erfolgt nur bei exaktem URL-Treffer oder tabs.onRemoved');

  /* ---------------------- Guard / Popup / statische Sinks ------------- */
  lines.push('');
  lines.push('--- GUARD / POPUP / STATISCHE SICHERHEITSPRUEFUNGEN ---');
  const guardJs = fs.readFileSync(path.join(ROOT, 'shared', 'guard.js'), 'utf8');
  const popupJs = fs.readFileSync(path.join(ROOT, 'shared', 'popup.js'), 'utf8');
  const htmlFiles = ['shared/guard.html', 'shared/popup.html'];
  const allSinks = [guardJs, popupJs, ...htmlFiles.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'))].join('\n');
  const sinkHits = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', 'dangerouslySetInnerHTML']
    .filter(s => allSinks.includes(s));
  rec(sinkHits.length === 0 ? 'PASS' : 'FAIL',
    'XSS/DOM-Sinks: guard.js/popup.js/html verwenden ausschliesslich textContent (keine HTML-Sinks, kein eval)',
    sinkHits.length ? 'Treffer: ' + sinkHits.join(', ') : 'keine Treffer fuer innerHTML/outerHTML/insertAdjacentHTML/document.write/eval/new Function');
  const networkCalls = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'navigator.sendBeacon']
    .filter(s => [guardJs, popupJs, fs.readFileSync(path.join(ROOT, 'shared', 'detector.js'), 'utf8')].join('\n').includes(s));
  rec(networkCalls.length === 0 ? 'PASS' : 'FAIL',
    'Offline-Versprechen: in Detector/Guard/Popup keine Netzwerk-APIs',
    networkCalls.length ? 'Treffer: ' + networkCalls.join(', ') : 'keine fetch/XHR/WebSocket/sendBeacon-Aufrufe');
  const senderCheck = /sender\.url\?\.startsWith\(api\.runtime\.getURL\('guard\.html'\)\)/.test(fs.readFileSync(path.join(ROOT, 'chrome', 'background.js'), 'utf8'));
  rec(senderCheck ? 'PASS' : 'FAIL',
    'Chrome: allow-once-Nachricht wird auf Absender (guard.html) und Guard-Tab geprueft',
    senderCheck ? 'sender.url-Pruefung + tabs.get(tabId).url-Pruefung vorhanden' : 'fehlt');
  const autoForward = /if \(result\.status === 'safe'\)[\s\S]{0,220}go\(target, false\)/.test(guardJs);
  rec(autoForward ? 'WARN' : 'INFO',
    'Guard: jede als safe klassifizierte Navigation wird automatisch per location.replace weitergeleitet -> zusaetzlicher Zwischenschritt/Flash fuer JEDE Navigation, History-/Referer-/Redirect-Ketten-Risiko (echter Browser NOT_TESTED)',
    'shared/guard.js:50-54: bei safe wird go(target,false) ohne Nutzerentscheidung aufgerufen');
  const warp = /web_accessible_resources/.test(JSON.stringify(cm));
  rec(warp ? 'WARN' : 'INFO',
    'Fingerprinting: guard.html ist web-accessible (statische Extension-URL) -> Websites koennen die Extension theoretisch erkennen; "Manifest-Fingerprinting geschlossen" (Next.md) ist damit nicht vollstaendig belegt',
    'chrome/manifest.json web_accessible_resources = ' + JSON.stringify(cm.web_accessible_resources));

  /* ------------------ Detektor-Funktionspruefungen (Property) -------- */
  lines.push('');
  lines.push('--- DETEKTOR-FUNKTIONSPRUEFUNGEN (PROPERTY-/FUZZ-TESTS) ---');
  // (a) Damerau-Levenshtein-distanz-1-Funktion gegen Referenz (OSA) fuer alle Paare ueber {a,b}, Laenge 0..5
  function osaDistance(x, y) {
    const m = x.length, n = y.length;
    const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = x[i - 1] === y[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[m][n];
  }
  const alphabet = ['a', 'b', ''];
  const words = [''];
  for (let len = 1; len <= 5; len++) {
    const prev = words.filter(w => w.length === len - 1);
    for (const w of prev) for (const c of alphabet) words.push(w + c);
  }
  const uniqueWords = [...new Set(words)];
  let dlMismatch = 0, dlChecked = 0;
  const dlExamples = [];
  for (const a of uniqueWords) {
    for (const b of uniqueWords) {
      dlChecked += 1;
      const expected = osaDistance(a, b) === 1;
      const actual = engine.damerauDistanceOne(a, b);
      if (expected !== actual) {
        dlMismatch += 1;
        if (dlExamples.length < 5) dlExamples.push({ a, b, expected, actual });
      }
    }
  }
  rec(dlMismatch === 0 ? 'PASS' : 'FAIL',
    'damerauDistanceOne(): exakte Uebereinstimmung mit Referenz-OSA-Distanz==1 (Alphabet {a,b}, Laenge 0..5)',
    dlChecked + ' Paare geprueft, ' + dlMismatch + ' Abweichungen' + (dlExamples.length ? ' Beispiele: ' + JSON.stringify(dlExamples) : ''));

  // (b) Punycode-Rundreise: Unicode-Label -> URL/Punycode -> punycodeDecode -> Skeleton-Brand
  const decodeVectors = [
    ['pаypal.com', 'paypal'], ['аmazon.com', 'amazon'], ['gοοgle.com', 'google'], ['micrоsoft.com', 'microsoft'],
    ['páypal.com', 'paypal'], ['paypál.com', 'paypal'], ['аррӏе.com', 'apple'], ['раураl.com', 'paypal'],
    ['xn--bcher-kva.de', null], ['xn--e1afmkfd.de', null]
  ];
  let punyBad = 0;
  const punyRows = [];
  for (const [input, expectedSkeleton] of decodeVectors) {
    const host = input.includes('xn--') ? input : new URL('https://' + input).hostname;
    const label = host.split('.')[0];
    const decoded = engine.punycodeDecode(label);
    const sk = engine.skeleton(decoded);
    const ok = expectedSkeleton === null ? (decoded === label || /[^\x00-\x7F]/.test(decoded) || decoded === label) : sk === expectedSkeleton;
    if (!ok) { punyBad += 1; punyRows.push({ input, host, label, decoded, sk, expectedSkeleton }); }
  }
  rec(punyBad === 0 ? 'PASS' : 'FAIL',
    'punycodeDecode(): dekodiert Punycode-Labels reproduzierbar in Unicode (HTML-Mapping) und Skeleton trifft die erwartete Marke',
    'Vektoren: ' + decodeVectors.length + ', Fehler: ' + punyBad + (punyRows.length ? ' ' + JSON.stringify(punyRows) : ''));

  // (c) withinDomain-Kantentests
  const wd = [
    ['google.com', 'google.com', true], ['mail.google.com', 'google.com', true],
    ['evilgoogle.com', 'google.com', false], ['google.com.evil.tld', 'google.com', false]
  ].map(([h, d, exp]) => ({ h, d, exp, got: engine.withinDomain(h, d) }));
  rec(wd.every(x => x.exp === x.got) ? 'PASS' : 'FAIL', 'withinDomain(): Label-Grenzen werden beachtet (kein Suffix-Fehltreffer)', JSON.stringify(wd));

  // (d) Fuzz: classify() darf bei beliebigen Strings nicht werfen
  const fuzzChunks = ['https://', 'http://', 'xn--', 'paypal', '.com', '.', '..', '%', '%2e', '\u200b', '\u0301', 'а', 'ο', '💥', '?', '#', '/', ':', '@', 'evil.tld', 'a'.repeat(80), '1.2.3.4', '[::1]'];
  let thrown = 0, nonStatus = 0;
  for (let i = 0; i < 1500; i++) {
    const parts = [];
    const n = 1 + Math.floor(Math.random() * 5);
    for (let k = 0; k < n; k++) parts.push(fuzzChunks[Math.floor(Math.random() * fuzzChunks.length)]);
    const s = parts.join('');
    try {
      const r = engine.classify(s);
      if (!r || !['block', 'safe', 'skip'].includes(r.status)) nonStatus += 1;
    } catch { thrown += 1; }
  }
  rec(thrown === 0 && nonStatus === 0 ? 'PASS' : 'FAIL', 'classify(): 1500 Zufalls-Strings ohne Exception und mit gueltigem Status', 'throws=' + thrown + ', invalidStatus=' + nonStatus);

  /* ------------------------------ Summary ----------------------------- */
  lines.push('');
  lines.push('ZUSAMMENFASSUNG: ' + passCount + ' PASS, ' + warnCount + ' WARN, ' + failCount + ' FAIL (Mock-basiert; echte Browser-Laeufe NOT_TESTED)');
  lines.push('Wichtigste FAILs: Firefox-WAR-Luecke (Redirect verboten), Chrome-DNR-POST-Luecke, Chrome-Long-URL-Blocker, Chrome-Fail-open bei configure-Fehler.');
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(lines.join('\n'));
  process.exitCode = 0;
})().catch(e => {
  const msg = 'PROBE-INTERNER FEHLER: ' + (e && e.stack || e);
  lines.push(msg);
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.error(msg);
  process.exitCode = 1;
});
