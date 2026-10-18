#!/usr/bin/env node
/*
 * Antipisher 0.1 – unabhängiger Security-Verifikations-Harness für das In-Page Content Shield
 * und die Browser-/Manifest-Integration (Shared Task task-6).
 *
 * MODUS: VERIFY_ONLY. Dieses Skript schreibt ausschließlich in audit/verify/shield/.
 * Quellcode des Produkts wird nur gelesen. Ergebnisse: results.json + Konsolenledger.
 *
 * Evidenzklassen:
 *   STATIC  – Quelltext-/Manifest-/Doku-Analyse mit Datei:Zeile
 *   HASH    – SHA-256-Vergleich gegen eingefrorene Audit-Snapshots (Unverändert-Nachweis)
 *   MOCK    – Node-vm-Harness mit DOM-Stub (kein Browser; Semantik-Abweichungen möglich)
 *   BROWSER – echter Headless-Chrome-155-Lauf für CSS/DOM-Semantik (kein Extension-E2E)
 *   DOC     – externe Hersteller-/Standard-Doku (URL im Ergebnis)
 *   NOT_TESTED – nicht ausführbar in dieser Session
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..', '..');
const RESULTS_PATH = path.join(HERE, 'results.json');
const readRel = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readAbs = p => fs.readFileSync(p, 'utf8');
const readJSONRel = p => JSON.parse(readRel(p));
const sha256Rel = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
const bytesRel = p => fs.statSync(path.join(ROOT, p)).size;
const gzipBytesRel = p => zlib.gzipSync(fs.readFileSync(path.join(ROOT, p))).length;

const now = new Date().toISOString();
const results = {
  probe: 'probe_shield_content_browser_integration',
  generated_utc: now,
  auditor: 'shield-verifier (teammate)',
  mode: 'VERIFY_ONLY – keine Produktänderung; Schreiben ausschließlich audit/verify/shield/',
  browser_e2e_available: false,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    python: (() => { try { return require('node:child_process').execSync('python --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } })(),
    chrome: '155.0.8059.85 (C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe) – Headless nur für DOM/CSS-Semantik, kein Extension-E2E'
  },
  evidence_legend: {
    STATIC: 'Quelltext-/Manifest-/Doku-Analyse mit Datei:Zeile',
    HASH: 'SHA-256-Vergleich gegen eingefrorene Audit-Snapshots (Unverändert-Nachweis)',
    MOCK: 'Node-vm-DOM-Stub (präzise für Interzeptionslogik, kein Browser-E2E)',
    BROWSER: 'Headless Chrome 155 – reale DOM/CSS-Semantik, aber kein geladenes Extension-E2E',
    DOC: 'externe Doku/Standard (URL im Datensatz)',
    NOT_TESTED: 'in dieser Session nicht ausführbar'
  },
  shield_behavior: [],
  post_bypass_cases: [],
  documents_read: [
    'shared/shield-content.js', 'tests/shield-content.test.cjs', 'shared/detector.js',
    'shared/sites.js', 'shared/guard.js', 'shared/guard.html', 'chrome/manifest.json',
    'firefox/manifest.json', 'chrome/background.js', 'firefox/background.js',
    'build.py', 'README.md', 'Next.md', 'tests/v2-scoring.test.cjs',
    'audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md',
    'audit/security/probes/results/static_scan.json', 'audit/code/results.json',
    'audit/security/probes/results/manifest_integrity.json'
  ],
  external_docs: [
    {
      topic: 'Chrome DNR: Redirect auf Extension-Ressource benötigt web_accessible_resources',
      url: 'https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest',
      quote: 'A declarativeNetRequest rule cannot redirect from a public resource request to a resource that is not web accessible. … To declare resources for declarativeNetRequest, use the manifest\'s "web_accessible_resources" array.',
      consequence: 'guard.html MUSS in WAR stehen (ist erfüllt); guard.js/guard.css/shared/*.js werden von der Extension-Seite selbst geladen und benötigen KEIN WAR.'
    },
    {
      topic: 'MDN WAR: Content Scripts benötigen kein WAR; WAR-Skripte sind CORS/CSP-frei und werden ausdrücklich als Risiko benannt',
      url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources',
      quote: 'Note that content scripts don\'t need to be listed as web accessible resources. … Web-accessible extension resources are not blocked by CORS or CSP. … A web-accessible extension script can unexpectedly be misused by malicious websites to weaken the security of other websites.',
      consequence: 'shared/sites.js, shared/detector.js, shared/shield-content.js, guard.js und guard.css zusätzlich als WAR zu listen, ist unnötig und erhöht Exposition/Fingerprinting.'
    },
    {
      topic: 'MDN onBeforeRequest: Firefox-Redirect auf Extension-Seite benötigt WAR',
      url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest',
      quote: 'If an extension wants to redirect a public (e.g., HTTPS) URL to an extension page, the extension\'s manifest.json file must contain a web_accessible_resources key that lists the URL for the extension page.',
      consequence: 'Der Firefox-Blocker B1 (fehlendes WAR) ist statisch behoben, sofern der Redirect zur guard.html tatsächlich greift (Runtime: NOT_TESTED).'
    },
    {
      topic: 'MDN HTMLFormElement submit event: form.submit() löst KEIN submit-Event aus',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event',
      quote: 'However, the event is not sent to the form when a script calls the form.submit() method directly.',
      consequence: 'Jede Seite kann per form.submit()/HTMLFormElement.prototype.submit an der Capture-Interzeption des Shields vorbeisubmittieren.'
    },
    {
      topic: 'MDN browser_specific_settings: data_collection_permissions-Pflicht für neue AMO-Einreichungen ab 03.11.2025; ID-Format frei wählbar',
      url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings',
      quote: 'Must be provided with details specified for browser_specific_settings.gecko.data_collection_permissions for new extension submitted to addons.mozilla.org from November 3, 2025. … any correctly formatted string can be used. For example, great_app@developers.company.',
      consequence: 'Schema {"required":["none"]} ist formal korrekt. Die gecko-ID belegt KEINE Domain-Inhaberschaft; AMO prüft nur Eindeutigkeit/Format.'
    },
    {
      topic: 'Mozilla Add-ons Blog: data_collection_permissions wird ab Firefox 140 (Desktop) ausgewertet; bei Unterstützung älterer Versionen muss der Entwickler eigene Kontrolle liefern',
      url: 'https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/',
      quote: 'If an extension supports versions of Firefox prior to 140 for Desktop, or 142 for Android, then the developer will need to continue to provide the user with a clear way to control the add-on\'s data collection and transmission immediately after installation of the add-on.',
      consequence: 'strict_min_version "128.0" bedeutet: auf Firefox 128–139 wird das Feld ignoriert. Da deklariert "none" und keine Transmission stattfindet, ist das voraussichtlich zulässig – AMO-Review bleibt NOT_TESTED.'
    }
  ]
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function lineOf(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return null;
  return src.slice(0, i).split('\n').length;
}
function linesOf(src, needle) {
  const out = [];
  src.split('\n').forEach((l, idx) => { if (l.includes(needle)) out.push(idx + 1); });
  return out;
}
function caseStatus(expectation, observedId) {
  if (expectation === 'INFO' || expectation === 'NOT_TESTED') return 'INFO';
  if (expectation === 'SHOULD_BLOCK') return observedId === 'BLOCKED' ? 'PASS' : 'SECURITY_VIOLATION';
  if (expectation === 'SHOULD_ALLOW') return observedId === 'ALLOWED' ? 'PASS' : 'FALSE_POSITIVE';
  throw new Error('unknown expectation ' + expectation);
}
function push(bucket, c) {
  c.status = caseStatus(c.expectation, c.observed);
  bucket.push(c);
  return c;
}
function summarize(cases) {
  const s = { total: cases.length, PASS: 0, SECURITY_VIOLATION: 0, FALSE_POSITIVE: 0, INFO: 0 };
  for (const c of cases) s[c.status] = (s[c.status] || 0) + 1;
  return s;
}

// ---------------------------------------------------------------------------
// Node-vm-DOM-Stub (MOCK) – bewusst präzise für die Interzeptionslogik
// ---------------------------------------------------------------------------
function createSandbox(opts) {
  const cfg = Object.assign({
    url: 'https://legit.example/page',
    engine: 'real',          // 'real' | fake engine object | 'none'
    injectShield: true,
    readyState: 'complete',
    passwordField: false
  }, opts || {});

  const st = {
    url: cfg.url,
    pwReads: 0,
    nativeSubmits: [],
    winListeners: {},
    docListeners: {},
    classifications: [],
    pageNavigateCalls: []
  };

  function makeShadow(mode) {
    const sr = { mode, _html: '', elements: {}, listeners: {} };
    Object.defineProperty(sr, 'innerHTML', {
      get() { return this._html; },
      set(v) {
        this._html = String(v);
        this.elements = {};
        for (const m of String(v).matchAll(/\bid="([^"]+)"/g)) {
          const el = makeElement('button', false);
          el._id = m[1];
          this.elements[m[1]] = el;
        }
      },
      configurable: true
    });
    sr.getElementById = function (id) { return this.elements[id] || null; };
    return sr;
  }

  function makeElement(tag, register) {
    const listeners = {};
    const el = {
      tagName: String(tag).toUpperCase(), tag, attributes: {}, children: [], parentNode: null,
      style: {}, removed: false, shadowRoot: null, _listeners: listeners, _register: !!register,
      setAttribute(n, v) { this.attributes[n] = String(v); if (n === 'id') this._id = String(v); },
      getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; },
      hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n); },
      removeAttribute(n) { delete this.attributes[n]; },
      remove() {
        this.removed = true;
        if (this.parentNode) {
          const i = this.parentNode.children.indexOf(this);
          if (i >= 0) this.parentNode.children.splice(i, 1);
        }
      },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      addEventListener(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
      attachShadow(o) { const sr = makeShadow(o && o.mode); this.shadowRoot = sr; this.shadowMode = o && o.mode; return sr; },
      click() {
        let prevented = false;
        const evt = { type: 'click', target: this, preventDefault() { prevented = true; } };
        for (const fn of (listeners.click || [])) fn(evt);
        return { prevented };
      }
    };
    Object.defineProperty(el, 'id', {
      get() { return this._id || ''; },
      set(v) { this._id = String(v); },
      configurable: true
    });
    return el;
  }

  function findInTree(node, id) {
    for (const c of (node.children || [])) {
      if (c.id === id) return c;
      const found = findInTree(c, id);
      if (found) return found;
    }
    return null;
  }

  const documentElement = makeElement('html', true);
  const pwInput = makeElement('input', true);
  pwInput.setAttribute('type', 'password');
  Object.defineProperty(pwInput, 'value', {
    get() { st.pwReads++; return 'GEHEIM-TESTWERT'; },
    set() {},
    configurable: true
  });

  const document = {
    readyState: cfg.readyState,
    documentElement,
    createElement(tag) { return makeElement(tag, true); },
    getElementById(id) { return findInTree(documentElement, id); },
    querySelector(sel) {
      if (/input\[type=["']?password/i.test(String(sel))) return cfg.passwordField ? pwInput : null;
      return null;
    },
    addEventListener(evt, fn) { (st.docListeners[evt] = st.docListeners[evt] || []).push(fn); }
  };

  function resolveSubmitTarget(form, submitter) {
    let raw = null;
    if (submitter && typeof submitter.getAttribute === 'function') {
      raw = submitter.getAttribute('formaction');
    }
    if (!raw) raw = form.getAttribute('action');
    if (!raw) return st.url;
    try { return new URL(raw, st.url).href; } catch { return st.url; }
  }

  class FakeHTMLFormElement {
    constructor() {
      this.tag = 'form'; this.attributes = {}; this.listeners = {}; this._listeners = this.listeners;
      this.children = []; this.parentNode = null;
      this._sandbox = api;
    }
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; }
    setAttribute(n, v) { this.attributes[n] = String(v); }
    addEventListener(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
    get action() { return this.getAttribute('action') || ''; }
    set action(v) { this.setAttribute('action', v); }
    submit() {
      // Browser-Semantik: form.submit() feuert KEIN submit-Event (MDN/HTML-Spec)
      st.nativeSubmits.push({ via: 'HTMLFormElement.submit()', target: resolveSubmitTarget(this, null), eventFired: false });
    }
    requestSubmit(submitter) {
      return api._dispatchSubmit(this, submitter || null, 'requestSubmit()');
    }
  }

  const winListeners = st.winListeners;
  const windowObj = {
    get location() { return { href: st.url }; },
    addEventListener(evt, fn, capture) { (winListeners[evt] = winListeners[evt] || []).push({ fn, capture: !!capture }); },
    removeEventListener(evt, fn) {
      const arr = winListeners[evt] || [];
      const i = arr.findIndex(x => x.fn === fn);
      if (i >= 0) arr.splice(i, 1);
    },
    fetch(url, init) { return { __mock: 'fetch', url, init, then() {}, catch() {} }; },
    XMLHttpRequest: function FakeXHR() { this.open = () => {}; this.send = () => {}; },
    navigator: { sendBeacon(url) { return true; } },
    open(url) { st.pageNavigateCalls.push({ via: 'window.open', url }); return null; }
  };

  const ctx = {
    window: windowObj,
    document,
    HTMLFormElement: FakeHTMLFormElement,
    URL, WeakSet, Set, Map, console,
    JSON, Math, Object, String, Number, Boolean, RegExp, Array, Promise, Error, TypeError,
    Uint8Array, Date, Symbol, Reflect, Proxy
  };
  ctx.globalThis = ctx;

  function loadEngine() {
    if (cfg.engine === 'real') {
      vm.runInContext(readRel('shared/sites.js'), context, { filename: 'shared/sites.js' });
      vm.runInContext(readRel('shared/detector.js'), context, { filename: 'shared/detector.js' });
      st.realEngine = ctx.Antipisher;
    } else if (cfg.engine && cfg.engine !== 'none') {
      ctx.Antipisher = cfg.engine;
    }
  }
  function loadShield() {
    if (cfg.injectShield) vm.runInContext(readRel('shared/shield-content.js'), context, { filename: 'shared/shield-content.js' });
  }

  const context = vm.createContext(ctx);
  loadEngine();
  loadShield();

  // Browser-näherer Submit-Dispatch: window-Capture-Listener (Shield) zuerst, dann Default-Aktion.
  function dispatchSubmit(form, submitter, via) {
    let prevented = false, stopped = false, stoppedImmediate = false;
    const evt = {
      type: 'submit', target: form, submitter: submitter || null,
      defaultPrevented: false,
      preventDefault() { prevented = true; this.defaultPrevented = true; },
      stopPropagation() { stopped = true; },
      stopImmediatePropagation() { stopped = true; stoppedImmediate = true; }
    };
    for (const h of (st.winListeners.submit || [])) {
      h.fn(evt);
      if (stoppedImmediate) break;
    }
    const effectiveTarget = resolveSubmitTarget(form, submitter);
    if (!prevented) {
      st.nativeSubmits.push({ via: via || 'event', target: effectiveTarget, eventFired: true });
    }
    const host = document.getElementById('antipisher-shield-root');
    return {
      prevented, stopped, preventedDefault: prevented,
      effectiveTarget,
      modalPresent: !!host,
      modalHtml: host && host.shadowRoot ? host.shadowRoot.innerHTML : null,
      shadowMode: host ? host.shadowMode : null
    };
  }

  const api = {
    cfg, ctx, document, window: windowObj, FakeHTMLFormElement,
    _dispatchSubmit: dispatchSubmit,
    fireSubmit(form, submitter) { return dispatchSubmit(form, submitter || null, 'submit-event'); },
    setUrl(url) { st.url = url; },
    state: st,
    getPwReads: () => st.pwReads,
    getNativeSubmits: () => st.nativeSubmits,
    getModalHost() { return document.getElementById('antipisher-shield-root'); },
    clickShadowButton(buttonId) {
      const host = document.getElementById('antipisher-shield-root');
      if (!host || !host.shadowRoot) return { clicked: false };
      const btn = host.shadowRoot.getElementById(buttonId);
      if (!btn) return { clicked: false };
      return { clicked: true, result: btn.click() };
    },
    fireDomContentLoaded() {
      for (const fn of (st.docListeners.DOMContentLoaded || [])) fn({ type: 'DOMContentLoaded' });
    }
  };
  return api;
}

function shieldCase(sb, id, desc, expectation, observed, detail) {
  return push(results.shield_behavior, { id, desc, expectation, observed, detail: detail || null });
}
function bypassCase(sb, id, desc, vector, expectation, observed, detail) {
  return push(results.post_bypass_cases, { id, desc, vector, expectation, observed, detail: detail || null,
    evidence_class: detail && detail.evidence_class ? detail.evidence_class : 'MOCK' });
}

// ---------------------------------------------------------------------------
// 1. Statische Tiefenanalyse shared/shield-content.js
// ---------------------------------------------------------------------------
const shieldSrc = readRel('shared/shield-content.js');
const detectorSrc = readRel('shared/detector.js');
const guardSrc = readRel('shared/guard.js');
const chromeManifestSrc = readRel('chrome/manifest.json');
const firefoxManifestSrc = readRel('firefox/manifest.json');
const chromeBg = readRel('chrome/background.js');
const firefoxBg = readRel('firefox/background.js');
const readme = readRel('README.md');
const nextmd = readRel('Next.md');
const testShield = readRel('tests/shield-content.test.cjs');
const buildPy = readRel('build.py');

const staticReview = results.static_review = {
  shield: {
    sha256: sha256Rel('shared/shield-content.js'),
    lines: shieldSrc.split('\n').length,
    bytes: bytesRel('shared/shield-content.js'),
    guard_global: { line: lineOf(shieldSrc, '__ANTIPISHER_SHIELD_ACTIVE__'), code: 'Doppel-Injektions-Guard im Isolated World (pro Frame)' },
    engine_handoff: { line: lineOf(shieldSrc, 'const engine = globalThis.Antipisher'), fail_open: true },
    current_verdict: { line_start: lineOf(shieldSrc, 'function getCurrentVerdict'), input: 'window.location.href (volle URL inkl. Pfad/Query)' },
    target_verdict: { line_start: lineOf(shieldSrc, 'function getTargetVerdict'), input: "form.getAttribute('action') – NICHT event.submitter.formAction und NICHT Formular-Methode" },
    intercept: {
      line_onFormSubmit: lineOf(shieldSrc, 'function onFormSubmit'),
      listener_line: lineOf(shieldSrc, "window.addEventListener('submit'"),
      capture: true,
      prevent_default_line: lineOf(shieldSrc, 'e.preventDefault()'),
      stop_immediate_line: lineOf(shieldSrc, 'e.stopImmediatePropagation()'),
      suspicious_condition_line: lineOf(shieldSrc, 'const isSuspicious'),
      only_status_block: shieldSrc.includes("currentVerdict.status === 'block'") && shieldSrc.includes("targetVerdict.status === 'block'"),
      action_warn_ignored: !shieldSrc.includes("action === 'warn'") && !shieldSrc.includes('action !=='),
      allowed_forms_weakset_line: lineOf(shieldSrc, 'const allowedForms = new WeakSet()'),
      early_return_allowed_line: lineOf(shieldSrc, 'if (allowedForms.has(form)) return;')
    },
    modal: {
      line_show_warning: lineOf(shieldSrc, 'function showWarningModal'),
      host_created_line: lineOf(shieldSrc, "document.createElement('div')"),
      host_appended_line: lineOf(shieldSrc, 'document.documentElement.appendChild(rootHost)'),
      shadow_mode_line: lineOf(shieldSrc, "attachShadow({ mode: 'closed' })"),
      zindex_line: lineOf(shieldSrc, "style.zIndex = '2147483647'"),
      inline_style_keys: ['position', 'zIndex', 'top', 'left', 'width', 'height', 'pointerEvents'],
      inline_display_set: /style\.display\s*=/.test(shieldSrc),
      uses_important: /setProperty\([^)]*important/.test(shieldSrc),
      mutationobserver: /MutationObserver/.test(shieldSrc),
      reappend_on_tamper: /appendChild\(rootHost\)\s*;\s*(\/\/[^\n]*\n)?\s*\}\)?/.test(shieldSrc) && /MutationObserver/.test(shieldSrc),
      tag_javascript_sink: /innerHTML\s*=/.test(shieldSrc),
      innerHTML_sinks: linesOf(shieldSrc, 'innerHTML'),
      explanation_unescaped_line: lineOf(shieldSrc, '${explanation}'),
      escaped_fields: ['targetUrl', 'brandName', 'officialDomain'],
      escapeHtml_function_line: lineOf(shieldSrc, 'function escapeHtml'),
      banner_root_line: lineOf(shieldSrc, "id = 'antipisher-badge-root'") || lineOf(shieldSrc, "bannerHost.id = 'antipisher-badge-root'"),
      banner_listener_missing: !/bannerHost.*addEventListener|pill.*addEventListener|badge-root.*addEventListener/.test(shieldSrc),
      banner_only_domcontentloaded: linesOf(shieldSrc, 'DOMContentLoaded'),
      password_query_line: lineOf(shieldSrc, "input[type=\"password\"]"),
      password_value_read: /input.*\.value|pwInput.*\.value/.test(shieldSrc.replace(/input\[type="password"\]/g, ''))
    },
    proceed_path: {
      line_mark_allowed: lineOf(shieldSrc, 'allowedForms.add(form)'),
      line_request_submit: lineOf(shieldSrc, 'form.requestSubmit()'),
      line_proto_submit_fallback: lineOf(shieldSrc, 'HTMLFormElement.prototype.submit.call(form)'),
      revalidates_target_on_proceed: false,
      event_submitter_used: /event\.submitter|e\.submitter/.test(shieldSrc),
      formaction_used: /formaction|formAction/.test(shieldSrc),
      method_used: /\.method\b/.test(shieldSrc),
      iframe_aware: /iframe|all_frames|frameElement/.test(shieldSrc)
    },
    error_paths: {
      engine_missing_returns_silently: lineOf(shieldSrc, 'if (!engine || typeof engine.classify'),
      current_verdict_catch: lineOf(shieldSrc, "return { status: 'safe' };"),
      target_verdict_catch: null,
      fail_open_on_engine_error: true
    },
    network_sinks: {
      fetch: (shieldSrc.match(/\bfetch\s*\(/g) || []).length,
      xhr: (shieldSrc.match(/XMLHttpRequest/g) || []).length,
      sendBeacon: (shieldSrc.match(/sendBeacon/g) || []).length,
      websocket: (shieldSrc.match(/WebSocket/g) || []).length,
      runtimeSendMessage: (shieldSrc.match(/runtime\.sendMessage/g) || []).length,
      postMessage: (shieldSrc.match(/postMessage/g) || []).length,
      localStorage: (shieldSrc.match(/localStorage/g) || []).length,
      eval: (shieldSrc.match(/\beval\s*\(/g) || []).length,
      newFunction: (shieldSrc.match(/new Function/g) || []).length
    }
  },
  detector_path_rule: {
    start_line: lineOf(detectorSrc, 'Layer 3: Path and Query Phishing Inspection'),
    sensitive_action_line: lineOf(detectorSrc, 'const sensitiveActions'),
    doc_blog_exemption_line: lineOf(detectorSrc, 'const isDocOrBlog'),
    official_domain_in_path_line: lineOf(detectorSrc, 'const officialDomainInPath'),
    brand_path_regex_line: lineOf(detectorSrc, 'const brandPathRegex'),
    returns_action_warn_line: lineOf(detectorSrc, "action: 'warn'"),
    official_domain_precheck_line: lineOf(detectorSrc, 'if (sites.some(s => s.domains.some(d => withinDomain(host, d))))'),
    action_warn_never_used_by_shield: true,
    doc_blog_exemption_is_attack_friendly: true
  },
  guard: {
    guard_js_classifies_target_line: lineOf(guardSrc, 'const result = engine.classify(target)'),
    guard_js_treats_all_non_safe_as_block_line: lineOf(guardSrc, '// Suspicious domain blocked'),
    guard_js_ignores_action_warn: !/result\.action/.test(guardSrc),
    guard_js_allows_official_link: lineOf(guardSrc, "go('https://' + result.official")
  },
  source_scan_quotes: {
    innerHTML_at: linesOf(shieldSrc, 'innerHTML'),
    explanation_interpolation: '${explanation} (unmasked)',
    zindex: "2147483647",
    host_append: 'document.documentElement.appendChild(rootHost)',
    listener: "window.addEventListener('submit', onFormSubmit, true)"
  }
};

// ---------------------------------------------------------------------------
// 2. HASH-Evidenz: Unverändert-Nachweis gegen pre-remediation Snapshot
// ---------------------------------------------------------------------------
const staticScan = readJSONRel('audit/security/probes/results/static_scan.json');
const preHashes = {};
for (const it of staticScan.inventory) preHashes[it.path] = { sha256: it.sha256, size: it.size };
const hashTargets = ['chrome/background.js', 'firefox/background.js', 'shared/guard.js', 'shared/guard.html', 'chrome/manifest.json', 'firefox/manifest.json', 'shared/detector.js', 'shared/sites.js', 'shared/shield-content.js'];
results.hash_evidence = {
  reference_snapshot: {
    file: 'audit/security/probes/results/static_scan.json',
    probe: staticScan.probe,
    timestamp_utc: staticScan.timestamp_utc,
    note: 'Pre-Remediation-Security-Scan (15:35 UTC) – Hashes vor der Gemini-Remediation'
  },
  comparisons: [],
  build_copies_in_sync: [],
  zip_artifacts: {}
};
for (const t of hashTargets) {
  const cur = { sha256: sha256Rel(t), size: bytesRel(t) };
  const pre = preHashes[t] || null;
  results.hash_evidence.comparisons.push({
    path: t, current: cur, pre_remediation: pre,
    unchanged: pre ? pre.sha256 === cur.sha256 : null,
    evidence_class: 'HASH'
  });
}
for (const f of ['shared/shield-content.js', 'shared/detector.js', 'shared/sites.js']) {
  const base = sha256Rel(f);
  const rel = 'shared/' + path.basename(f);
  results.hash_evidence.build_copies_in_sync.push({
    file: rel,
    shared: base,
    chrome: sha256Rel('chrome/' + rel),
    firefox: sha256Rel('firefox/' + rel),
    in_sync: base === sha256Rel('chrome/' + rel) && base === sha256Rel('firefox/' + rel)
  });
}
(() => {
  const parent = path.resolve(ROOT, '..');
  for (const z of ['Antipisher-Source-v0.1.0-alpha.zip', 'Antipisher-Chrome-v0.1.0-alpha.zip', 'Antipisher-Firefox-v0.1.0-alpha.zip']) {
    try {
      const p = path.join(parent, z);
      results.hash_evidence.zip_artifacts[z] = { sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'), size: fs.statSync(p).size };
    } catch (e) { results.hash_evidence.zip_artifacts[z] = { error: String(e.message) }; }
  }
})();

// ---------------------------------------------------------------------------
// 3. Manifest-Review + Browser-Integration
// ---------------------------------------------------------------------------
const chromeManifest = JSON.parse(chromeManifestSrc);
const firefoxManifest = JSON.parse(firefoxManifestSrc);
// WICHTIG: audit/code/results.json wurde um 18:15:35 durch einen Parallel-Agenten NEU erzeugt
// (enthält inzwischen den Post-Remediation-Zustand) und ist als "Vorher"-Snapshot unbrauchbar.
// Verwendet werden daher ausschließlich die eingefrorenen Security-Probe-Snapshots von 15:35 UTC.
const preIntegrity = readJSONRel('audit/security/probes/results/manifest_integrity.json');

function csSummary(m) {
  const cs = (m.content_scripts || [])[0] || null;
  return cs ? { matches: cs.matches, js: cs.js, run_at: cs.run_at, all_frames: cs.all_frames } : null;
}
function warSummary(m) {
  const entries = m.web_accessible_resources || [];
  const resources = entries.flatMap(e => e.resources || []);
  const matches = entries.flatMap(e => e.matches || []);
  return { entries: entries.length, resources, matches };
}
const chromeCs = csSummary(chromeManifest);
const firefoxCs = csSummary(firefoxManifest);
const chromeWar = warSummary(chromeManifest);
const firefoxWar = warSummary(firefoxManifest);
const neededWar = ['guard.html'];
const unnecessaryWar = chromeWar.resources.filter(r => !neededWar.includes(r));

results.manifests = {
  chrome: {
    manifest_version: chromeManifest.manifest_version,
    minimum_chrome_version: chromeManifest.minimum_chrome_version,
    permissions: chromeManifest.permissions,
    host_permissions: chromeManifest.host_permissions,
    content_scripts: chromeCs,
    content_script_matches_all_http_https: JSON.stringify(chromeCs.matches) === JSON.stringify(['http://*/*', 'https://*/*']),
    content_script_injects_engine_order_correct: chromeCs.js.indexOf('shared/sites.js') < chromeCs.js.indexOf('shared/detector.js') && chromeCs.js.indexOf('shared/detector.js') < chromeCs.js.indexOf('shared/shield-content.js'),
    content_script_all_frames_false: chromeCs.all_frames === false,
    content_script_run_at_document_start: chromeCs.run_at === 'document_start',
    war: chromeWar,
    war_guard_html_present: chromeWar.resources.includes('guard.html'),
    war_unnecessary_resources: unnecessaryWar,
    war_matches_all_http_https: JSON.stringify(chromeWar.matches) === JSON.stringify(['http://*/*', 'https://*/*']),
    var_dynamic_url_used: (chromeManifest.web_accessible_resources || []).some(e => e.use_dynamic_url === true),
    dnr_redirect_needs_war_guard_html: true
  },
  firefox: {
    manifest_version: firefoxManifest.manifest_version,
    permissions: firefoxManifest.permissions,
    host_permissions: firefoxManifest.host_permissions,
    background: firefoxManifest.background,
    content_scripts: firefoxCs,
    content_script_matches_all_http_https: JSON.stringify(firefoxCs.matches) === JSON.stringify(['http://*/*', 'https://*/*']),
    content_script_all_frames_false: firefoxCs.all_frames === false,
    content_script_run_at_document_start: firefoxCs.run_at === 'document_start',
    war: firefoxWar,
    war_guard_html_present: firefoxWar.resources.includes('guard.html'),
    war_unnecessary_resources: firefoxWar.resources.filter(r => !neededWar.includes(r)),
    war_matches_all_http_https: JSON.stringify(firefoxWar.matches) === JSON.stringify(['http://*/*', 'https://*/*']),
    browser_specific_settings: firefoxManifest.browser_specific_settings,
    gecko_id: firefoxManifest.browser_specific_settings?.gecko?.id || null,
    gecko_id_format_valid: /^[A-Za-z0-9._-]*@[A-Za-z0-9._-]+$/.test(firefoxManifest.browser_specific_settings?.gecko?.id || ''),
    gecko_id_uses_reserved_example_tld: /\.example$/.test(firefoxManifest.browser_specific_settings?.gecko?.id || ''),
    strict_min_version: firefoxManifest.browser_specific_settings?.gecko?.strict_min_version || null,
    data_collection_permissions: firefoxManifest.browser_specific_settings?.gecko?.data_collection_permissions || null,
    data_collection_schema_valid: (() => {
      const d = firefoxManifest.browser_specific_settings?.gecko?.data_collection_permissions;
      return !!d && Array.isArray(d.required) && d.required.length === 1 && d.required[0] === 'none';
    })(),
    data_collection_supported_from_firefox: '140 Desktop / 142 Android (Mozilla Add-ons Blog 2025-10-23)',
    impl_note: 'Deklaration "none" ist plausibel, da kein Netzwerk-/Telemetrie-Sink im Content-Script/Detector nachgewiesen; AMO-Review und Verhalten <Firefox 140 = NOT_TESTED'
  },
  comparison_pre_remediation: {
    source: 'audit/security/probes/results/manifest_integrity.json (15:35:29Z) + static_scan.json (15:35:38Z) – Pre-Remediation-Snapshots',
    chrome_war_before: preIntegrity.manifests.chrome.war,
    chrome_war_after: chromeWar.resources,
    chrome_war_regression_exposure: preIntegrity.manifests.chrome.war.length < chromeWar.resources.length,
    chrome_manifest_sha256_before: preHashes['chrome/manifest.json'] ? preHashes['chrome/manifest.json'].sha256 : null,
    chrome_manifest_sha256_after: sha256Rel('chrome/manifest.json'),
    chrome_manifest_size_before: preHashes['chrome/manifest.json'] ? preHashes['chrome/manifest.json'].size : null,
    chrome_manifest_size_after: bytesRel('chrome/manifest.json'),
    firefox_war_before: preIntegrity.manifests.firefox.war,
    firefox_war_after: firefoxWar.resources,
    firefox_war_gap_before: !(preIntegrity.manifests.firefox.war || []).includes('guard.html'),
    firefox_war_gap_after_static: firefoxWar.resources.includes('guard.html') ? 'closed_static' : 'OPEN',
    firefox_manifest_sha256_before: preHashes['firefox/manifest.json'] ? preHashes['firefox/manifest.json'].sha256 : null,
    firefox_manifest_sha256_after: sha256Rel('firefox/manifest.json'),
    firefox_manifest_size_before: preHashes['firefox/manifest.json'] ? preHashes['firefox/manifest.json'].size : null,
    firefox_manifest_size_after: bytesRel('firefox/manifest.json'),
    gecko_id_before: preIntegrity.manifests.firefox.gecko.id,
    gecko_id_after: firefoxManifest.browser_specific_settings?.gecko?.id,
    gecko_id_domain_ownership_proven: false,
    background_sha256_unchanged_vs_pre: {
      chrome: preHashes['chrome/background.js'] ? preHashes['chrome/background.js'].sha256 === sha256Rel('chrome/background.js') : null,
      firefox: preHashes['firefox/background.js'] ? preHashes['firefox/background.js'].sha256 === sha256Rel('firefox/background.js') : null
    }
  },
  build_sync: {
    shield_in_build_py_files_list: /shield-content\.js/.test(buildPy),
    shield_copied_to_browser_dirs: fs.existsSync(path.join(ROOT, 'chrome/shared/shield-content.js')) && fs.existsSync(path.join(ROOT, 'firefox/shared/shield-content.js')),
    build_assert_lists_shield: /shared\/shield-content\.js/.test(buildPy),
    content_script_files_exist: [].concat(chromeCs.js, firefoxCs.js).every(rel => fs.existsSync(path.join(ROOT, 'chrome', rel.replace(/^shared\//, 'shared/'))))
      && [].concat(chromeCs.js).every(rel => fs.existsSync(path.join(ROOT, 'chrome', rel)))
      && [].concat(firefoxCs.js).every(rel => fs.existsSync(path.join(ROOT, 'firefox', rel)))
  }
};

// ---------------------------------------------------------------------------
// 4. Alte Blocker: backgrounds unverändert / offen?
// ---------------------------------------------------------------------------
const chromeBgHash = sha256Rel('chrome/background.js');
const firefoxBgHash = sha256Rel('firefox/background.js');
results.old_blockers = {
  chrome: {
    sha256: chromeBgHash,
    hash_equals_pre_remediation_snapshot: preHashes['chrome/background.js'] ? preHashes['chrome/background.js'].sha256 === chromeBgHash : null,
    unchanged_since_audit: preHashes['chrome/background.js'] ? preHashes['chrome/background.js'].sha256 === chromeBgHash : null,
    get_only: {
      line: lineOf(chromeBg, "requestMethods: ['get']"),
      code: "requestMethods: ['get']",
      dnr_rule_matches_only_get: true
    },
    redirect_all_rule: {
      line: lineOf(chromeBg, "const regex='^(https?://.+)$'"),
      regex: '^(https?://.+)$',
      resource_types: ['main_frame'],
      redirect_all_get_navigations: true
    },
    fail_open: {
      catch_console_error_lines: linesOf(chromeBg, '.catch(console.error)'),
      silent_fail_open: true,
      status_ui_contract: 'Popup behauptet weiter "aktiv" (nicht in diesem Scope erneut getestet)'
    },
    long_url_limit: { line: lineOf(chromeBg, 'regexp.length>1900'), limit: 1900 },
    regex_substitution_pattern: {
      line: lineOf(chromeBg, 'regexSubstitution'),
      value: "api.runtime.getURL('guard.html') + '#\\\\1'",
      chrome_documented: false,
      runtime_verified: false
    },
    fragment_stripped_in_allowone: { line: lineOf(chromeBg, "url.split('#')[0]") },
    design_note: 'DNR-Regel ist unverändert: kein Preflight für POST/Nicht-GET-Navigationen; Shield ändert daran nichts (läuft erst nach dem Laden der Zielseite).'
  },
  firefox: {
    sha256: firefoxBgHash,
    hash_equals_pre_remediation_snapshot: preHashes['firefox/background.js'] ? preHashes['firefox/background.js'].sha256 === firefoxBgHash : null,
    unchanged_since_audit: preHashes['firefox/background.js'] ? preHashes['firefox/background.js'].sha256 === firefoxBgHash : null,
    intercepts_all_methods: { line: lineOf(firefoxBg, "types:['main_frame']"), method_filter: false, evidence: 'Listener-Filter enthält nur urls/types, keinen methods-Filter – fängt damit auch POST-Hauptnavigationen ab (unverändert).' },
    redirect_target: { line: lineOf(firefoxBg, 'const gate=api.runtime.getURL'), value: "moz-extension://…/guard.html?url=…" },
    post_becomes_get_on_proceed: {
      mechanism: 'blockierte POST-Navigation wird auf guard.html umgeleitet; nach Freigabe navigiert guard.js per location.replace(url) als GET → POST-Body/Formulardaten gehen verloren',
      evidence: 'firefox/background.js:14-16 + shared/guard.js:37 + MDN webRequest.BlockingResponse redirectUrl Semantik'
    },
    bypass_lifecycle: { line: lineOf(firefoxBg, "api.tabs.onRemoved.addListener"), clears_on_navigation: false, clear_on_tab_close_only: true },
    strict_mode_ignored: !/strictMode/.test(firefoxBg),
    war_requirement_now_satisfied_static: true,
    runtime_redirect_verified: false
  }
};

// ---------------------------------------------------------------------------
// 5. Baseline-Interzeption (MOCK, reales Detector-Modul)
// ---------------------------------------------------------------------------
const baseline = [];
{
  // B1: legit page, POST action → phishing domain
  const sb = createSandbox({ url: 'https://legit-blog.example/page' });
  const form = new sb.FakeHTMLFormElement();
  form.setAttribute('action', 'https://paypa1.com/login');
  form.setAttribute('method', 'post');
  const r = sb.fireSubmit(form);
  shieldCase(sb, 'baseline_action_phish', 'Legitime Seite, Formular-Action auf Phishing-Domain (POST)', 'SHOULD_BLOCK',
    r.prevented && r.modalPresent ? 'BLOCKED' : 'ALLOWED', { prevented: r.prevented, modal: r.modalPresent, shadowMode: r.shadowMode });
  baseline.push(results.shield_behavior[results.shield_behavior.length - 1]);

  // B2: phishing page, relative action
  const sb2 = createSandbox({ url: 'https://paypa1.com/login' });
  const f2 = new sb2.FakeHTMLFormElement();
  f2.setAttribute('action', '/submit-credentials');
  const r2 = sb2.fireSubmit(f2);
  shieldCase(sb2, 'baseline_page_phish_relative_action', 'Phishing-Seite, relatives Formularziel', 'SHOULD_BLOCK',
    r2.prevented && r2.modalPresent ? 'BLOCKED' : 'ALLOWED', { prevented: r2.prevented, modal: r2.modalPresent });
  baseline.push(results.shield_behavior[results.shield_behavior.length - 1]);

  // B3: legit page, official action
  const sb3 = createSandbox({ url: 'https://www.paypal.com/signin' });
  const f3 = new sb3.FakeHTMLFormElement();
  f3.setAttribute('action', 'https://www.paypal.com/auth');
  const r3 = sb3.fireSubmit(f3);
  shieldCase(sb3, 'baseline_legit_official', 'Offizielle PayPal-Seite, offizielles Formularziel', 'SHOULD_ALLOW',
    !r3.prevented && !r3.modalPresent ? 'ALLOWED' : 'BLOCKED', { prevented: r3.prevented, modal: r3.modalPresent });
  baseline.push(results.shield_behavior[results.shield_behavior.length - 1]);

  // B4: requestSubmit wird interzeptionsfähig
  const sb4 = createSandbox({ url: 'https://legit-blog.example/page' });
  const f4 = new sb4.FakeHTMLFormElement();
  f4.setAttribute('action', 'https://paypa1.com/login');
  const r4 = f4.requestSubmit();
  shieldCase(sb4, 'baseline_requestSubmit_intercepted', 'requestSubmit() feuert submit-Event → wird interzeptiert', 'SHOULD_BLOCK',
    r4.prevented ? 'BLOCKED' : 'ALLOWED', { prevented: r4.prevented, modal: r4.modalPresent });

  // B5: dynamisch nach Load erzeugtes Formular
  const sb5 = createSandbox({ url: 'https://legit-blog.example/page' });
  const f5 = new sb5.FakeHTMLFormElement();
  f5.setAttribute('action', 'https://paypa1.com/login');
  sb5.document.body = undefined;
  const r5 = sb5.fireSubmit(f5);
  shieldCase(sb5, 'baseline_dynamic_form', 'Dynamisch/nachträglich erzeugtes Formular (Listener sitzt auf window)', 'SHOULD_BLOCK',
    r5.prevented ? 'BLOCKED' : 'ALLOWED', { prevented: r5.prevented });

  // B6: GET-Formular auf Phishing-Ziel
  const sb6 = createSandbox({ url: 'https://legit-blog.example/page' });
  const f6 = new sb6.FakeHTMLFormElement();
  f6.setAttribute('action', 'https://paypa1.com/login');
  f6.setAttribute('method', 'get');
  const r6 = sb6.fireSubmit(f6);
  shieldCase(sb6, 'baseline_get_form_intercepted', 'GET-Formular auf Phishing-Ziel (submit-Event existiert auch bei GET)', 'SHOULD_BLOCK',
    r6.prevented ? 'BLOCKED' : 'ALLOWED', { prevented: r6.prevented });

  // B7: Formular ohne action auf Phishing-Seite
  const sb7 = createSandbox({ url: 'https://paypa1.com/login' });
  const f7 = new sb7.FakeHTMLFormElement();
  const r7 = sb7.fireSubmit(f7);
  shieldCase(sb7, 'baseline_phish_page_no_action', 'Phishing-Seite, Formular ohne action (Ziel = Seiten-URL)', 'SHOULD_BLOCK',
    r7.prevented ? 'BLOCKED' : 'ALLOWED', { prevented: r7.prevented });
}

// ---------------------------------------------------------------------------
// 6. POST-/Bypass-Tests – Wirksamkeit der behaupteten Schließung
// ---------------------------------------------------------------------------
{
  // BYP-01: form.submit() – kein submit-Event (MDN-belegt)
  const sb = createSandbox({ url: 'https://legit-blog.example/page' });
  const form = new sb.FakeHTMLFormElement();
  form.setAttribute('action', 'https://paypa1.com/login');
  form.setAttribute('method', 'post');
  form.submit(); // nativer Pfad: kein Event
  const ns = sb.getNativeSubmits();
  const intercepted = ns.length === 0;
  bypassCase(sb, 'BYP-01', 'HTMLFormElement.submit() / form.submit(): browser-nativer Submit OHNE submit-Event', 'form.submit()',
    'SHOULD_BLOCK', intercepted ? 'BLOCKED' : 'ALLOWED',
    { evidence_class: 'MOCK+DOC', nativeSubmits: ns, doc_url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event', doc_quote: 'the event is not sent to the form when a script calls the form.submit() method directly' });

  // BYP-02: HTMLFormElement.prototype.submit.call
  const sb2 = createSandbox({ url: 'https://legit-blog.example/page' });
  const f2 = new sb2.FakeHTMLFormElement();
  f2.setAttribute('action', 'https://paypa1.com/login');
  sb2.ctx.HTMLFormElement.prototype.submit.call(f2);
  bypassCase(sb2, 'BYP-02', 'HTMLFormElement.prototype.submit.call(form) (Profil-/Fremdcode-Muster)', 'prototype.submit.call',
    'SHOULD_BLOCK', sb2.getNativeSubmits().length === 0 ? 'BLOCKED' : 'ALLOWED', { nativeSubmits: sb2.getNativeSubmits() });

  // BYP-03..05: fetch / XHR / sendBeacon (kein Hook im Shield – belegt, dass "POST geschützt" nicht gilt)
  for (const [id, label] of [['BYP-03', 'fetch()/XHR-POST an Sammel-Endpoint'], ['BYP-04', 'navigator.sendBeacon()'], ['BYP-05', 'fetch Keepalive/Blob-POST']]) {
    const sb3 = createSandbox({ url: 'https://paypa1.com/login' });
    let exfil = false;
    if (id === 'BYP-03') { const xhr = new sb3.window.XMLHttpRequest(); xhr.open('POST', '/collect'); xhr.send('pw=…'); exfil = true; }
    if (id === 'BYP-04') { exfil = sb3.window.navigator.sendBeacon('/collect', 'pw=…') === true; }
    if (id === 'BYP-05') { sb3.window.fetch('/collect', { method: 'POST', body: 'pw=…' }); exfil = true; }
    bypassCase(sb3, id, label + ' – Shield hat keinen Netzwerk-/Exfil-Hook', 'network-post',
      'INFO', exfil ? 'ALLOWED' : 'UNKNOWN',
      { evidence_class: 'STATIC+MOCK', classification: 'BYPASS_AUSSERHALB_DER_SCHUTZGRENZE',
        note: 'Ein DOM-Content-Script kann fetch/XHR/beacon nicht verhindern; das widerlegt die pauschale POST-Schutz-Behauptung, ist aber kein neuer Defekt des Shields (kein Netzwerk-Sink vorhanden).' });
  }

  // BYP-06: iframe (all_frames:false) – Formular im Subframe wird nicht geschützt
  {
    const manifestAllowsFrames = firefoxManifest.content_scripts[0].all_frames !== false;
    const sbChild = createSandbox({ url: 'https://paypa1.com/login', injectShield: false }); // Subframe: Content-Script wird nicht injiziert
    const cf = new sbChild.FakeHTMLFormElement();
    cf.setAttribute('action', '/collect');
    const r = sbChild.fireSubmit(cf);
    bypassCase(sbChild, 'BYP-06', 'Formular in iframe/Subframe (content_scripts all_frames:false) – Shield läuft nur im Top-Frame', 'iframe(all_frames:false)',
      'SHOULD_BLOCK', (r.prevented || r.modalPresent) ? 'BLOCKED' : 'ALLOWED',
      { evidence_class: 'MOCK+STATIC', all_frames: chromeManifest.content_scripts[0].all_frames, topFrameProtected: true, subFrameProtected: false,
        note: 'Subframe-Simulation: Shield nicht injiziert; reale Subframe-Injektion hängt an all_frames:false' });
  }

  // BYP-07: formaction des Submit-Buttons überschreibt action – Shield klassifiziert nur action
  {
    const sb = createSandbox({ url: 'https://legit-blog.example/page' });
    const form = new sb.FakeHTMLFormElement();
    form.setAttribute('action', '/search'); // harmlos, auf legitimer Seite
    const submitter = sb.document.createElement('button');
    submitter.setAttribute('formaction', 'https://paypa1.com/login');
    submitter.setAttribute('formmethod', 'post');
    const r = sb.fireSubmit(form, submitter);
    bypassCase(sb, 'BYP-07', 'Submit-Button mit formaction="https://paypa1.com/login" überschreibt das harmlose form action', 'submitter.formAction',
      'SHOULD_BLOCK', r.prevented ? 'BLOCKED' : 'ALLOWED',
      { evidence_class: 'MOCK+STATIC', intercepted: r.prevented, shieldClassifiedTarget: 'nur form.getAttribute("action") = "/search"', actualNavigationTarget: r.effectiveTarget });
  }

  // BYP-08: Zieländerung nach Anzeige des Modals (TOCTOU) + allowedForms-Persistenz
  {
    const sb = createSandbox({ url: 'https://legit-blog.example/page' });
    const form = new sb.FakeHTMLFormElement();
    form.setAttribute('action', 'https://paypa1.com/login');
    const r1 = sb.fireSubmit(form);
    const modalShown = r1.prevented && r1.modalPresent;
    // Seite ändert nach Modal das action-Attribut; Nutzer klickt "Trotzdem senden"
    form.setAttribute('action', 'https://attacker-collector.example/steal');
    const click = sb.clickShadowButton('btn-proceed');
    // erneuter Submit auf demselben Formular (allowedForms-Pfad)
    const r2 = sb.fireSubmit(form);
    const ns = sb.getNativeSubmits();
    bypassCase(sb, 'BYP-08', 'Ziel wird nach Modal-Anzeige geändert; "Trotzdem senden" + WeakSet-Freigabe verhindert Reklassifikation', 'proceed/TOCTOU',
      'SHOULD_BLOCK', (r2.prevented || r2.modalPresent) ? 'BLOCKED' : 'ALLOWED',
      { evidence_class: 'MOCK+STATIC', modalShownBeforeChange: modalShown, proceedClicked: click.clicked, nativeSubmits: ns,
        note: 'allowedForms wird vor der Klassifikation geprüft (shield-content.js:240) und beim Fortfahren persistent gesetzt (:271).' });
  }

  // BYP-09: Chrome-DNR-POST-Navigation – statische Regelprüfung
  bypassCase(null, 'BYP-09', 'Chrome-DNR: POST-/Nicht-GET-Hauptnavigation erreicht die Phishing-Seite ohne Preflight (Regel unverändert GET-only)', 'chrome-dnr-requestMethods',
    'SHOULD_BLOCK', 'ALLOWED', {
      evidence_class: 'STATIC+HASH',
      dnr_rule_line: lineOf(chromeBg, "requestMethods: ['get']"),
      dnr_rule_sha256_unchanged: preHashes['chrome/background.js'] ? preHashes['chrome/background.js'].sha256 === chromeBgHash : null,
      explanation: 'DNR-Regel matcht nur requestMethods:["get"]; Content-Script läuft erst im Ziel-Dokument NACH der POST-Navigation und kann die Navigation nicht verhindern.',
      doc_test_catalog: 'audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md §8.3 Punkt 4 (POST-Formular) – Browser-E2E NOT_TESTED'
    });

  // BYP-10: Navigation per location.href / window.open / meta refresh (kein submit-Event)
  {
    const sb = createSandbox({ url: 'https://legit-blog.example/page' });
    sb.window.open('https://paypa1.com/login');
    bypassCase(sb, 'BYP-10', 'Programmatische Navigation (window.open/location.href/meta refresh) – kein submit-Event', 'navigation',
      'INFO', 'ALLOWED', { evidence_class: 'STATIC+MOCK', classification: 'BYPASS_AUSSERHALB_DER_SCHUTZGRENZE', pageNavigateCalls: sb.state.pageNavigateCalls,
        note: 'Shield besitzt keinerlei Navigations-Hook (kein webNavigation, kein beforeunload, keine DNR-Regel im Content-Script).' });
  }

  // BYP-11: POST an same-origin Endpoint der Phishing-Seite (typische Kits)
  bypassCase(null, 'BYP-11', 'Phishing-Kit exfiltriert per same-origin fetch/XHR (kein Formular) – Shield sieht nichts', 'fetch-same-origin',
    'INFO', 'ALLOWED', { evidence_class: 'STATIC', classification: 'BYPASS_AUSSERHALB_DER_SCHUTZGRENZE', note: 'Kein einziger Netzwerk-Sink im Shield; Schutzversprechen "POST geschützt" ist damit nicht haltbar.' });

  // BYP-12: Vertrauensmodell – bösartige Seite kontrolliert ihren eigenen DOM/JS
  bypassCase(null, 'BYP-12', 'Bedrohungsmodell: die zu schützende Seite ist selbst der Angreifer – Content-Script ist keine Sicherheitsgrenze gegen Seiten-JS', 'threat-model',
    'INFO', 'ALLOWED', { evidence_class: 'STATIC', classification: 'THREAT_MODEL',
      note: 'Seiten-JS kann form.submit(), fetch, Overlay entfernen, CSS überschreiben; Capture-Listener ist nur eine UX-Barriere. Die Behauptung "geschlossen" ist damit falsch.' });
}

// ---------------------------------------------------------------------------
// 7. FP-Praxis: Seiten-URL-Klassifikation bei jedem Submit
// ---------------------------------------------------------------------------
const fpPageCases = [
  // Kernaussage: offizielle kuratierte Domains werden durch den Official-Domain-Precheck geschützt
  { cat: 'official-curated', url: 'https://github.com/login', formAction: '/session', human: 'SAFE', note: 'GitHub Login-Formular' },
  { cat: 'official-curated', url: 'https://github.com/paypal/paypal-js/issues/123', formAction: '/comment', human: 'SAFE', note: 'GitHub Marken-Repo (Lead-Hypothese: Warnung) – Official-Precheck greift' },
  { cat: 'official-curated', url: 'https://www.reddit.com/login/', formAction: '/login', human: 'SAFE', note: 'Reddit Login' },
  { cat: 'official-curated', url: 'https://www.reddit.com/r/paypal/comments/abc123/login_problem/', formAction: '/comment', human: 'SAFE', note: 'Reddit r/paypal Post' },
  { cat: 'official-curated', url: 'https://stackoverflow.com/users/login', formAction: '/users/login', human: 'SAFE', note: 'StackOverflow Login' },
  { cat: 'official-curated', url: 'https://stackoverflow.com/questions/47507937/paypal-login-api', formAction: '/questions/47507937/answer/submit', human: 'SAFE', note: 'SO-Frage mit Marke+login im Pfad' },
  { cat: 'official-curated', url: 'https://en.wikipedia.org/w/index.php?search=paypal.com+login', formAction: '/w/index.php', human: 'SAFE', note: 'Wikipedia-Suche' },
  { cat: 'official-curated', url: 'https://www.chase.com/paypal/login', formAction: '/login', human: 'SAFE', note: 'Chase (Task-Beispiel)' },
  { cat: 'official-curated', url: 'https://www.sparkasse.de/redirect?url=https://paypal.com/login', formAction: '/service', human: 'SAFE', note: 'Sparkasse Redirect-URL' },
  { cat: 'official-curated', url: 'https://www.amazon.de/s?k=paypal.com+login', formAction: '/s', human: 'SAFE', note: 'Amazon-Suche' },
  { cat: 'official-curated', url: 'https://www.zalando.de/login/', formAction: '/login', human: 'SAFE', note: 'Shop-Login' },
  // Nicht-kuratierte Drittseiten: Path-/Query-Regel des neuen V2-Detektors greift
  { cat: 'third-party-path-fp', url: 'https://duckduckgo.com/?q=paypal.com+login', formAction: '/', human: 'SAFE', note: 'Suche auf DuckDuckGo' },
  { cat: 'third-party-path-fp', url: 'https://lite.duckduckgo.com/lite/?q=paypal.com+login', formAction: '/lite/', human: 'SAFE', note: 'DuckDuckGo Lite' },
  { cat: 'third-party-path-fp', url: 'https://search.brave.com/search?q=paypal.com+login', formAction: '/search', human: 'SAFE', note: 'Brave Search' },
  { cat: 'third-party-path-fp', url: 'https://www.ecosia.org/search?q=paypal.com+login', formAction: '/search', human: 'SAFE', note: 'Ecosia' },
  { cat: 'third-party-path-fp', url: 'https://www.startpage.com/sp/search?query=paypal.com+login', formAction: '/sp/search', human: 'SAFE', note: 'Startpage' },
  { cat: 'third-party-path-fp', url: 'https://www.heise.de/ratgeber/PayPal-Login-so-funktioniert-es-1234567.html', formAction: '/suche', human: 'SAFE', note: 'Heise-Ratgeberartikel' },
  { cat: 'third-party-path-fp', url: 'https://www.chip.de/ratgeber/paypal-login-so-gehts_123456.html', formAction: '/suche', human: 'SAFE', note: 'Chip-Ratgeber' },
  { cat: 'third-party-path-fp', url: 'https://forum.beispiel.de/threads/paypal-login-funktioniert-nicht.123/', formAction: '/threads/123/reply', human: 'SAFE', note: 'Forum-Thread (XenForo-Muster)' },
  { cat: 'third-party-path-fp', url: 'https://www.verbraucherzentrale.de/wissen/paypal-login-12345', formAction: '/suche', human: 'SAFE', note: 'Verbraucherzentrale-Ratgeber' },
  // Target-seitige FPs: harmlose Seite, aber Formularziel enthält Marken-Domain + Login im Query
  { cat: 'target-query-fp', url: 'https://www.mediamarkt.de/checkout', formAction: 'https://www.mediamarkt.de/checkout/login?returnUrl=https%3A%2F%2Fpaypal.com%2Fcheckout', human: 'SAFE', note: 'Shop-Checkout mit PayPal-Return-URL (konstruiert, realistisches OAuth-Muster)' },
  // FN-Evasion des neuen Pfad-Filters, für Shield-Abdeckung relevant
  { cat: 'fn-doc-bypass', url: 'https://evil-phish.example/docs/paypal/login', formAction: '/collect', human: 'BLOCK', note: 'Angreifer nutzt isDocOrBlog-Ausnahme (/docs/)' },
  { cat: 'fn-doc-bypass', url: 'https://evil-phish.example/news/paypal/signin', formAction: '/collect', human: 'BLOCK', note: 'Angreifer nutzt /news/-Ausnahme' },
  { cat: 'fn-doc-bypass', url: 'https://evil-phish.example/blog/chase/verify', formAction: '/collect', human: 'BLOCK', note: 'Angreifer nutzt /blog/-Ausnahme' }
];

results.fp = { page_verdict_and_shield: [], summary: {} };
for (const c of fpPageCases) {
  const sb = createSandbox({ url: c.url });
  const verdictPage = sb.state.realEngine.classify(c.url);
  const verdictTarget = sb.state.realEngine.classify(new URL(c.formAction, c.url).href);
  const form = new sb.FakeHTMLFormElement();
  form.setAttribute('action', c.formAction);
  const r = sb.fireSubmit(form);
  const observed = r.prevented || r.modalPresent ? 'BLOCKED' : 'ALLOWED';
  const expectation = c.human === 'SAFE' ? 'SHOULD_ALLOW' : 'SHOULD_BLOCK';
  const status = caseStatus(expectation, observed);
  results.fp.page_verdict_and_shield.push({
    cat: c.cat, url: c.url, formAction: c.formAction, humanExpected: c.human, note: c.note,
    pageVerdict: { status: verdictPage.status, action: verdictPage.action, reason: verdictPage.reason || null, site: verdictPage.site || null },
    targetVerdict: { status: verdictTarget.status, action: verdictTarget.action, reason: verdictTarget.reason || null },
    shieldObserved: observed, status
  });
}
results.fp.summary = summarize(results.fp.page_verdict_and_shield.map(x => ({ status: x.status })));

// Offizielle Domain-Sweep: alle 169 Marken × ihre offiziellen Domains → Shield darf nicht blocken
{
  const sites = JSON.parse(readRel('sites-100.json'));
  const failures = [];
  let checked = 0;
  for (const site of sites) {
    for (const d of site.domains.slice(0, 4)) {
      const url = 'https://' + d + '/login';
      const sb = createSandbox({ url, injectShield: true });
      const form = new sb.FakeHTMLFormElement();
      form.setAttribute('action', '/session');
      const r = sb.fireSubmit(form);
      checked++;
      if (r.prevented || r.modalPresent) failures.push({ site: site.brand, url, verdict: sb.state.realEngine.classify(url) });
    }
  }
  results.fp.official_domain_sweep = {
    sites: sites.length,
    urls_checked: checked,
    shield_blocked_count: failures.length,
    failures: failures.slice(0, 20),
    note: 'Official-Domain-Precheck (detector.js:' + lineOf(detectorSrc, 'Direct match against official curated brand domains') + ') verhindert Path-/Query-FPs auf kuratierten Marken-Domains – die im Auftrag vermutete Warnung auf github.com/paypal/... bzw. reddit.com/r/paypal/... tritt NICHT auf.'
  };
}

// ---------------------------------------------------------------------------
// 8. Overlay-Manipulierbarkeit (MOCK + BROWSER)
// ---------------------------------------------------------------------------
results.overlay = [];
{
  const sb = createSandbox({ url: 'https://legit-blog.example/page' });
  const form = new sb.FakeHTMLFormElement();
  form.setAttribute('action', 'https://paypa1.com/login');
  const r = sb.fireSubmit(form);
  const host = sb.getModalHost();
  results.overlay.push({
    id: 'OVL-01', evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    title: 'Host-Element im Seiten-DOM vorhanden und identifizierbar',
    observed: { hostPresent: !!host, hostId: host && host.id, appendedToDocumentElement: host && host.parentNode === sb.document.documentElement,
      shadowMode: r.shadowMode, shadowModeClosed: r.shadowMode === 'closed',
      inlineStyleKeys: host ? Object.keys(host.style) : [] },
    note: 'Closed Shadow DOM schützt nur den Inhalt des Roots, nicht das Host-Element. Next.md:99 behauptet "gegen Seiten-CSS und Script-Zugriffe vollständig immun" – das ist falsch.'
  });
  // Seite entfernt den Host
  host.remove();
  results.overlay.push({
    id: 'OVL-02', evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    title: 'Seiten-JS kann den Overlay-Host jederzeit entfernen (kein MutationObserver, keine Re-Append-Logik)',
    observed: { hostPresentAfterPageRemove: !!sb.getModalHost(), mutationObserverInShield: /MutationObserver/.test(shieldSrc),
      reappendLogicInShield: false },
    note: 'getElementById/remove() sind Seiten-APIs; closed Shadow DOM verhindert das nicht. Ein MutationObserver der Seite kann den Host sofort nach Einfügen entfernen.'
  });
  // Styles: display fehlt inline
  results.overlay.push({
    id: 'OVL-03', evidence_class: 'STATIC+BROWSER', expectation: 'INFO', status: 'INFO',
    title: 'Overlay-Host setzt kein display und kein !important → simple Seiten-CSS-Regel blendet ihn aus',
    observed: {
      inline_display_set: /style\.display\s*=/.test(shieldSrc),
      uses_setProperty_important: /setProperty\([^)]*important/.test(shieldSrc),
      css_snippet: '#antipisher-shield-root { display: none; }',
      chrome_155_computed_display: (() => {
        try {
          const d = readAbs(path.join(HERE, 'chrome_css_dump.html'));
          const m = d.match(/RESULT_JSON:(\{.*?\})<\/pre>/);
          const parsed = m ? JSON.parse(m[1]) : null;
          const c = parsed && parsed.cases.find(x => x.id === 'page_css_display_none_wins_without_inline_display');
          return c ? c.observed : null;
        } catch { return null; }
      })(),
      chrome_155_evidence_file: 'audit/verify/shield/chrome_css_dump.html'
    },
    note: 'Real in Headless-Chrome 155 gemessen: display-Wert ist "none", sobald die Seite #antipisher-shield-root{display:none} setzt.'
  });
  results.overlay.push({
    id: 'OVL-04', evidence_class: 'STATIC+BROWSER', expectation: 'INFO', status: 'INFO',
    title: 'Gegenmaßnahme-Kandidat: inline display:block via setProperty(...,"important") widersteht Seiten-CSS ohne !important',
    observed: (() => {
      try {
        const d = readAbs(path.join(HERE, 'chrome_css_dump.html'));
        const m = d.match(/RESULT_JSON:(\{.*?\})<\/pre>/);
        const parsed = m ? JSON.parse(m[1]) : null;
        return parsed ? parsed.cases : null;
      } catch { return null; }
    })(),
    note: 'Chrome-155-Befund: inline-!important gewinnt hier auch gegen Seiten-!important (getComputedStyle display = "block"), d. h. ein Fix via setProperty("display","block","important") wäre wirksam; zusätzlich Re-Append per MutationObserver gegen Host-Removal nötig.'
  });
  results.overlay.push({
    id: 'OVL-05', evidence_class: 'STATIC', expectation: 'INFO', status: 'INFO',
    title: 'z-index 2147483647 ist kein Schutz: später eingefügte/positionierte Seiten-Overlays zeichnen darüber; transform/filter auf html/body verschiebt fixed-Containing-Block',
    observed: { zindex_line: lineOf(shieldSrc, "style.zIndex = '2147483647'"), host_parent: 'document.documentElement' },
    note: 'Seiten-CSS kann html/body transformieren (fixed wird relativ zum transformierten Vorfahren) oder gleichwertige Overlays später einhängen.'
  });
  results.overlay.push({
    id: 'OVL-06', evidence_class: 'STATIC', expectation: 'INFO', status: 'INFO',
    title: 'Spoofing: Struktur/IDs/Design des Overlays sind öffentlich (AGPL-Quelle + WAR-exponiert) und durch die Seite nachbaubar',
    observed: { predictableIds: ['antipisher-shield-root', 'antipisher-badge-root', 'btn-cancel', 'btn-proceed'], wart_exposed_source: true },
    note: 'Nach Entfernen des echten Overlays kann die Seite ein täuschend ähnliches "Antipisher"-Overlay zeigen (Marken-Spoofing gegen das Schutzprodukt selbst) – Design-Risiko, nicht durch closed Shadow DOM adressiert.'
  });
}

// ---------------------------------------------------------------------------
// 8b. BROWSER-Semantik (Headless Chrome 155, kein Extension-E2E)
// ---------------------------------------------------------------------------
results.browser_semantics = (() => {
  const out = {
    engine: 'HeadlessChrome/155.0.0.0 (C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe)',
    evidence_file: 'audit/verify/shield/chrome_css_dump.html',
    probe_file: 'audit/verify/shield/browser_probe_css.html',
    load_extension_e2e: 'NOT_TESTED – Chrome 155 hat --load-extension entfernt; CDP-Ansatz in der Session instabil (Lead-Befund). Der BROWSER-Teil prüft nur reale DOM/CSS-Semantik ohne Extension-Injektion.',
    css_and_dom_cases: null,
    submit_event_composed_probe: {
      status: 'NOT_TESTED',
      probe_file: 'audit/verify/shield/browser_probe_submit.html',
      reason: 'Headless --dump-dom beendet sich in dieser Umgebung nicht zuverlässig, sobald eine Seite requestSubmit()/Formular-Submit ausführt (beobachteter Hang, Prozess manuell beendet). Keine belastbare Aussage zum composed-Flag des submit-Events aus Shadow-Roots; als Restrisiko dokumentiert.'
    }
  };
  try {
    const d = readAbs(path.join(HERE, 'chrome_css_dump.html'));
    const m = d.match(/RESULT_JSON:(\{.*?\})<\/pre>/);
    if (m) {
      const parsed = JSON.parse(m[1]);
      out.css_and_dom_cases = parsed.cases;
      out.ua = parsed.ua;
    }
  } catch (e) { out.error = String(e.message); }
  return out;
})();

// ---------------------------------------------------------------------------
// 9. Sichere Darstellung untrusted Daten / DOM-Sinks
// ---------------------------------------------------------------------------
results.injection = [];
{
  // 9.1 targetUrl-Escaping mit realem Detector (payload im action-Attribut)
  const sb = createSandbox({ url: 'https://legit-blog.example/page' });
  const payload = 'https://paypa1.com/login?x="><img src=x onerror=globalThis.__pwned=1>&y=1';
  const form = new sb.FakeHTMLFormElement();
  form.setAttribute('action', payload);
  const r = sb.fireSubmit(form);
  const html = r.modalHtml || '';
  results.injection.push({
    id: 'INJ-01', evidence_class: 'MOCK', expectation: 'SHOULD_BLOCK', status: r.prevented ? 'PASS' : 'SECURITY_VIOLATION',
    title: 'targetUrl wird HTML-escaped gerendert (Angriffspayload im Formular-action)',
    observed: {
      intercepted: r.prevented, modalPresent: r.modalPresent,
      rawImgTagInModal: /<img\s+src=x/i.test(html),
      escapedAmp: html.includes('&amp;') || html.includes('&quot;'),
      uses_escapeHtml_function: /function escapeHtml/.test(shieldSrc),
      escapeHtml_usage_lines: linesOf(shieldSrc, 'escapeHtml(')
    },
    note: 'Payload landet escaped im Shadow-HTML; kein <img>-Tag. Escape-Funktion deckt & < > " \' ab (Zeilen 227-234).'
  });
  // 9.2 explanation ist NICHT escaped (latenter Sink)
  {
    const fakeEngine = {
      classify(url) {
        return {
          status: 'block', site: '<b>PayPal</b>', official: 'paypal.com',
          reasons: [{ code: 'x', explanation_de: '<img src=x onerror=globalThis.__pwned=1>', detail: 'd' }]
        };
      }
    };
    const sb2 = createSandbox({ url: 'https://evil-phish.example/login', engine: fakeEngine });
    const f2 = new sb2.FakeHTMLFormElement();
    f2.setAttribute('action', 'https://evil-phish.example/collect');
    const r2 = sb2.fireSubmit(f2);
    const html2 = r2.modalHtml || '';
    results.injection.push({
      id: 'INJ-02', evidence_class: 'MOCK+STATIC', expectation: 'SHOULD_BLOCK', status: /<img\s+src=x/i.test(html2) ? 'SECURITY_VIOLATION' : 'PASS',
      title: 'explanation_de wird UNESCAPED in shadow.innerHTML interpoliert (Zeile ' + lineOf(shieldSrc, '${explanation}') + ')',
      observed: {
        explanation_unescaped_in_template: /\$\{explanation\}/.test(shieldSrc),
        rawImgTagInModal: /<img\s+src=x/i.test(html2),
        escapedFields: { targetUrl: html2.includes('&lt;') || html2.includes('&quot;'), site: html2.includes('&lt;b&gt;PayPal&lt;/b&gt;') },
        note: 'Mit fake engine (dynamische Strings) führt unescaped explanation zu DOM-Injection im Shadow-Root. Mit dem gebündelten Detector sind explanation-Strings statisch bzw. host-abgeleitet; Browser-URL-Parser verbietet HTML-Zeichen im Host → derzeit nicht ausnutzbar, aber latenter CWE-79-Sink.'
      }
    });
  }
  // 9.3 Kann der reale Detector Markup in explanation einschleusen?
  {
    const evil = [
      'https://paypal.com%3Cimg%3E@evil.example/',
      'https://xn--pypal-4ve%3Cimg%3E.example/',
      'https://paypal%3Cscript%3E.example/',
      'https://<img>.paypal.com.evil.example/',
      'https://evil.example/%3Cimg%20src=x%3E'
    ];
    const sb3 = createSandbox({ url: 'https://legit-blog.example/page' });
    const probes = evil.map(u => {
      let v = null;
      try { v = sb3.state.realEngine.classify(u); } catch (e) { return { url: u, error: String(e.message) }; }
      const ex = v && v.reasons && v.reasons[0] ? v.reasons[0].explanation_de : '';
      return { url: u, verdict: v && v.status, reason: v && v.reason, explanationContainsMarkup: /[<>"']/.test(String(ex || '')) };
    });
    results.injection.push({
      id: 'INJ-03', evidence_class: 'STATIC+MOCK', expectation: 'INFO', status: 'INFO',
      title: 'Realer Detector: explanation_de enthält bei den geprüften URL-Angriffen kein HTML-Markup (URL-Parser begrenzt Host)',
      observed: probes,
      note: 'Entlastet den Ist-Zustand, ersetzt aber kein Escaping: DetectorVerdicts sollten generell als untrusted behandelt werden.'
    });
  }
}

// ---------------------------------------------------------------------------
// 10. Fail-open / Fehlerpfade / Doppel-Injektion / Klassifikationsaufrufe
// ---------------------------------------------------------------------------
results.fail_open = [];
{
  const throwing = { classify() { throw new Error('engine-boom'); } };
  const sb = createSandbox({ url: 'https://evil-phish.example/login', engine: throwing });
  const f = new sb.FakeHTMLFormElement();
  f.setAttribute('action', 'https://paypa1.com/login');
  const r = sb.fireSubmit(f);
  push(results.fail_open, {
    id: 'FO-01', evidence_class: 'MOCK', expectation: 'SHOULD_BLOCK',
    observed: (r.prevented || r.modalPresent) ? 'BLOCKED' : 'ALLOWED',
    title: 'classify() wirft (Engine-Fehler) → Shield lässt Submit durch (fail-open, Zeilen 26-32/34-42)',
    detail: { prevented: r.prevented, modal: r.modalPresent, catch_returns_safe_line: linesOf(shieldSrc, "return { status: 'safe' }") }
  });
  const sb2 = createSandbox({ url: 'https://evil-phish.example/login', engine: 'none' });
  const f2 = new sb2.FakeHTMLFormElement();
  f2.setAttribute('action', 'https://paypa1.com/login');
  const r2 = sb2.fireSubmit(f2);
  push(results.fail_open, {
    id: 'FO-02', evidence_class: 'MOCK', expectation: 'SHOULD_BLOCK',
    observed: (r2.prevented || r2.modalPresent) ? 'BLOCKED' : 'ALLOWED',
    title: 'Engine fehlt (Ladereihenfolge/Fehler) → Shield kehrt still zurück, kein Listener aktiv (Zeile 18-21)',
    detail: { prevented: r2.prevented, modal: r2.modalPresent, submitListenerCount: (sb2.state.winListeners.submit || []).length }
  });
  const sb3 = createSandbox({ url: 'https://legit-blog.example/page' });
  const before = (sb3.state.winListeners.submit || []).length;
  vm.runInContext(shieldSrc, sb3.ctx, { filename: 'shared/shield-content.js#second-injection' });
  const after = (sb3.state.winListeners.submit || []).length;
  results.duplicate_injection = {
    evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    submit_listener_before: before, submit_listener_after: after,
    duplicate_guard_effective: before === 1 && after === 1,
    note: 'Doppel-Injektion ist im Isolated World per globalThis-Flag abgewehrt (Zeile 15-16). Ein erneutes Laden nach Extension-Update/Reload erzeugt keinen zweiten Listener pro Frame.'
  };
  // Klassifikationsaufrufe pro Submit
  {
    const calls = [];
    const counting = { classify(u) { calls.push(u); return { status: 'safe', reasons: [] }; } };
    const sb4 = createSandbox({ url: 'https://legit-blog.example/page', engine: counting });
    calls.length = 0; // checkPasswordFields-Load-Aufruf ausblenden
    const f4 = new sb4.FakeHTMLFormElement();
    f4.setAttribute('action', '/search');
    sb4.fireSubmit(f4);
    results.classification_calls = {
      evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
      calls_per_submit: calls.length,
      urls: calls.slice(),
      note: 'Pro Submit werden aktuelle Seiten-URL UND Formular-action klassifiziert (2 classify-Aufrufe), zusätzlich ein Aufruf bei DOMContentLoaded für den Passwort-Banner.'
    };
  }
}

// ---------------------------------------------------------------------------
// 11. Passwortfeld-Banner / Datenschutz
// ---------------------------------------------------------------------------
results.password_banner = [];
{
  const sb = createSandbox({ url: 'https://paypa1.com/login', passwordField: true });
  const banner = sb.document.getElementById('antipisher-badge-root');
  results.password_banner.push({
    id: 'PW-01', evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    title: 'Banner wird bei block-Verdict + Passwortfeld beim Load eingehängt',
    observed: { bannerPresentAtLoad: !!banner, bannerId: banner && banner.id, bannerHasClickListener: false },
    note: 'Nur bei readyState === complete nach DOMContentLoaded; kein MutationObserver für nachgeladene Passwortfelder (SPA).'
  });
  const sb2 = createSandbox({ url: 'https://www.paypal.com/login', passwordField: true });
  results.password_banner.push({
    id: 'PW-02', evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    title: 'Kein Banner auf legitimen Seiten',
    observed: { bannerPresent: !!sb2.document.getElementById('antipisher-badge-root') }
  });
  const sb3 = createSandbox({ url: 'https://paypa1.com/login', passwordField: true });
  results.password_banner.push({
    id: 'PW-03', evidence_class: 'MOCK', expectation: 'INFO', status: 'INFO',
    title: 'Passwortwert wird NICHT gelesen (nur Existenz via querySelector); kein Wert-Zugriff im Code',
    observed: {
      pwValueReadsByShield: sb3.getPwReads(),
      password_value_sink_in_source: /\.value\b/.test(shieldSrc.replace(/input\[type="password"\]/g, '')),
      query_selector_line: lineOf(shieldSrc, "input[type=\"password\"]")
    }
  });
  const sb4 = createSandbox({ url: 'https://paypa1.com/login', passwordField: false });
  // nachträgliches Passwortfeld: kein Trigger/Beobachter
  sb4.cfg.passwordField = true;
  results.password_banner.push({
    id: 'PW-04', evidence_class: 'STATIC', expectation: 'INFO', status: 'INFO',
    title: 'Nachgeladene Passwortfelder (SPA/JS-Formulare) erhalten keinen Banner (kein MutationObserver)',
    observed: { bannerAfterLateField: !!sb4.document.getElementById('antipisher-badge-root'), mutationObserverInShield: /MutationObserver/.test(shieldSrc) }
  });
  results.privacy = {
    content_script_scope: {
      matches: ['http://*/*', 'https://*/*'],
      all_frames: false,
      run_at: 'document_start',
      reads_page_url: 'bei jedem Submit (window.location.href) + beim Load für Passwort-Banner-Check',
      reads_dom: 'nur Existenz von input[type=password] auf block-Seiten',
      reads_password_value: false,
      network_sinks_in_shield: (shieldSrc.match(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|postMessage|runtime\.sendMessage|localStorage/g) || []).length,
      telemetry: false,
      persisted_urls: false
    },
    store_disclosure: {
      issue: 'Content-Script auf ALLEN http/https-Seiten + Host-Permissions; CWS/AMO-Disclosure-Pflichten (Browsing-Activity/Website-Content) und Limited-Use müssen außerhalb des Codes erfüllt werden.',
      privacy_policy_file_in_repo: fs.existsSync(path.join(ROOT, 'PRIVACY.md')) || fs.existsSync(path.join(ROOT, 'privacy.html')),
      readme_privacy_section_line: lineOf(readme, '## Datenschutz'),
      firefox_data_collection_declaration: firefoxManifest.browser_specific_settings?.gecko?.data_collection_permissions || null,
      cws_submission_verified: 'NOT_TESTED',
      password_manager_conflict: 'MÖGLICH (z-index-max Overlay, DOM-Mutation); kein Test mit realen Passwort-Managern möglich → NOT_TESTED'
    }
  };
}

// ---------------------------------------------------------------------------
// 12. Performance / Payload (60 KB pro Seitenaufruf)
// ---------------------------------------------------------------------------
results.performance = {};
{
  const files = ['shared/sites.js', 'shared/detector.js', 'shared/shield-content.js'];
  const per = files.map(f => ({ file: f, bytes: bytesRel(f), gzip_bytes: gzipBytesRel(f) }));
  const totalBytes = per.reduce((a, x) => a + x.bytes, 0);
  const totalGzip = per.reduce((a, x) => a + x.gzip_bytes, 0);

  // Minimaler DOM-Stub nur für Parse/Execute-Messung (Shield braucht window/document)
  function bareCtx() {
    const noop = () => {};
    const el = () => ({ style: {}, id: '', appendChild: noop, remove: noop, attachShadow: () => ({ innerHTML: '', getElementById: () => ({ addEventListener: noop }) }), addEventListener: noop });
    const ctx = {
      URL, console,
      window: { addEventListener: noop, location: { href: 'https://example.com/' } },
      document: { readyState: 'loading', addEventListener: noop, getElementById: () => null, querySelector: () => null, createElement: el, documentElement: el() }
    };
    ctx.globalThis = ctx;
    return ctx;
  }

  // Ladezeit der drei Skripte in frischen vm-Kontexten (ohne DOM-Stub, reine Parse/Execute-Kosten)
  function loadTime() {
    const t0 = process.hrtime.bigint();
    const ctx = bareCtx();
    vm.createContext(ctx);
    for (const f of files) vm.runInContext(readRel(f), ctx, { filename: f });
    return Number(process.hrtime.bigint() - t0) / 1e6;
  }
  const loadTimes = [];
  for (let i = 0; i < 5; i++) loadTimes.push(loadTime());

  // classify-Latenz (realer Detector) auf typischen URLs
  const dctx = { URL, console }; dctx.globalThis = dctx; vm.createContext(dctx);
  vm.runInContext(readRel('shared/sites.js'), dctx); vm.runInContext(readRel('shared/detector.js'), dctx);
  const engine = dctx.Antipisher;
  const urls = ['https://www.paypal.com/signin', 'https://github.com/paypal/paypal-js', 'https://www.google.com/search?q=test', 'https://unknown-service.example.com/path/page?x=1'];
  const samples = [];
  for (let i = 0; i < 3000; i++) {
    const u = urls[i % urls.length];
    const t0 = process.hrtime.bigint();
    engine.classify(u);
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const pct = p => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];

  // Speicher-Approximation: 50 Kontexte laden
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 50; i++) {
    const ctx = bareCtx(); vm.createContext(ctx);
    for (const f of files) vm.runInContext(readRel(f), ctx, { filename: f });
  }
  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed;

  results.performance = {
    evidence_class: 'STATIC+MOCK (Node, keine Browser-E2E)',
    content_scripts_per_page_load: per,
    total_raw_bytes: totalBytes,
    total_gzip_bytes: totalGzip,
    claim_about_60kb: { raw: totalBytes, claim: '~60 KB', matches: totalBytes > 55000 && totalBytes < 65000 },
    script_load_ms_samples: loadTimes,
    script_load_ms_median: loadTimes.slice().sort((a, b) => a - b)[2],
    classify_ms: { samples: samples.length, median: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: samples[samples.length - 1] },
    classify_calls_per_submit: 2,
    injected_overhead_note: 'Zusätzlich pro Submit: 2× classify (Median oben) + DOM-Abfragen + Shadow-DOM-Aufbau nur im Warnfall.',
    memory_delta_heap_bytes_50_contexts: after - before,
    browser_runtime_NOT_TESTED: true
  };
}

// ---------------------------------------------------------------------------
// 13. Test-Qualität: prüfen die 21/21-Tests echte Sicherheit?
// ---------------------------------------------------------------------------
results.test_quality = {};
{
  const testNames = [...testShield.matchAll(/^test\('([^']+)'/gm)].map(m => m[1]);
  const probes = {
    'form.submit()/native Submit-Bypass': /\.submit\s*\(/.test(testShield) && !/requestSubmit/.test(testShield),
    'requestSubmit()': /requestSubmit/.test(testShield),
    'Submitter/formaction': /formaction|formAction|submitter/.test(testShield),
    'iframe/all_frames': /iframe|all_frames|frame/i.test(testShield),
    'fetch/XHR/sendBeacon': /fetch|XMLHttpRequest|sendBeacon/.test(testShield),
    'Overlay-Manipulation/Entfernen': /\.remove\(\)|display\s*=|MutationObserver|z-index|zIndex/.test(testShield),
    'Fehlerpfad/Fail-open': /throw|fail.?open|classify.*throw/.test(testShield),
    'XSS/HTML-Escaping': /escape|innerHTML|<img|onerror/.test(testShield),
    'False-Positive-Korpus': /heise|duckduckgo|wikipedia|path-impersonation/i.test(testShield),
    'Passwort-Banner/DOMContentLoaded': /password|badge|DOMContentLoaded/.test(testShield),
    'Doppel-Injektion': /__ANTIPISHER_SHIELD_ACTIVE__|twice|second/.test(testShield)
  };
  results.test_quality = {
    file: 'tests/shield-content.test.cjs',
    sha256: sha256Rel('tests/shield-content.test.cjs'),
    test_count_in_file: testNames.length,
    test_names: testNames,
    probes_covered: Object.entries(probes).filter(([, v]) => v).map(([k]) => k),
    probes_missing: Object.entries(probes).filter(([, v]) => !v).map(([k]) => k),
    fixture_character: {
      fake_dom: /createDOMSandbox/.test(testShield),
      fake_event_loop: 'triggerSubmit ruft registrierte Listener direkt auf; kein Browser-Default-Verhalten, kein form.submit()-Pfad',
      asserts_only: ['prevented', 'stopped', 'attachedElements'],
      loads_shared_sources: /readFileSync\(path\.join\(__dirname, '\.\.', 'shared'/.test(testShield),
      browser_e2e: false
    },
    executed_by_auditor: {
      command: 'node --test tests/*.test.cjs',
      cwd: ROOT,
      exit_code: 0,
      result: 'tests 21, pass 21, fail 0 (Node v24.13.0)',
      observed_utc: now,
      note: 'Die 21/21-Aussage ist reproduzierbar – sie belegt aber nur Fixture-Verhalten, nicht die Wirksamkeit der POST-Behauptung.'
    },
    verdict: 'Die Shield-Tests prüfen ausschließlich den Fixture-Pfad (synthetisches submit-Event mit Fake-Formular). Sie können die im Audit dokumentierten Bypässe (form.submit(), iframe, formaction, Overlay-Manipulation, fetch-Exfiltration, FP) prinzipiell nicht erkennen. "POST-Lücke geschlossen" ist durch diese Tests NICHT belegt.'
  };
}

// ---------------------------------------------------------------------------
// 14. Doku-Claims: Was behaupten README/Next.md?
// ---------------------------------------------------------------------------
results.docs_claims = [
  { file: 'README.md', line: linesOf(readme, 'HTTP POST / Formulare')[0] || null, claim_text: 'Tabelle: HTTP POST / Formulare = "Geschützt: In-Page Content Shield fängt submit-Events ab"', verdict: 'CONFLICT – kein Schutz gegen form.submit()/fetch/iframe; keine Navigations-/Preflight-Wirkung', status: 'CONFLICT' },
  { file: 'README.md', line: linesOf(readme, 'schützt Formular-Übertragungen (POST/GET)')[0] || null, claim_text: 'schützt Formular-Übertragungen (POST/GET) direkt im DOM', verdict: 'CONFLICT – nur submit-Event-Pfad, umgehbar', status: 'CONFLICT' },
  { file: 'README.md', line: linesOf(readme, '21/21 PASS')[0] || null, claim_text: 'node --test tests/*.test.cjs (21/21 PASS)', verdict: 'CONFIRMED – reproduziert Exit 0 / 21 pass; Aussagekraft der Shield-Tests aber auf Fixtures begrenzt', status: 'CONFIRMED_WITH_CAVEAT' },
  { file: 'Next.md', line: linesOf(nextmd, 'Schließt die fundamentale Lücke')[0] || null, claim_text: 'Schließt die fundamentale Lücke von Chrome DNR bezüglich Formular-POST-Navigationen', verdict: 'CONFLICT – Navigationslücke bleibt offen (Hash: background.js unverändert GET-only); der Shield läuft erst nach der POST-Navigation', status: 'CONFLICT' },
  { file: 'Next.md', line: linesOf(nextmd, 'manipulationssicheres Sicherheits-Interstitial')[0] || null, claim_text: 'manipulationssicheres Sicherheits-Interstitial in Closed-Mode Shadow DOM', verdict: 'CONFLICT – Host per Seiten-JS entfernbar, per Seiten-CSS (real Chrome 155: display:none) ausblendbar, kein Re-Append', status: 'CONFLICT' },
  { file: 'Next.md', line: linesOf(nextmd, 'vollständig immun')[0] || null, claim_text: 'gegen Seiten-CSS und Script-Zugriffe vollständig immun', verdict: 'CONFLICT – closed Shadow DOM schützt nur den Root-Inhalt, nicht das Host-Element', status: 'CONFLICT' },
  { file: 'Next.md', line: linesOf(nextmd, '21/21 Unit-Tests erfolgreich')[0] || null, claim_text: '21/21 Unit-Tests erfolgreich', verdict: 'CONFIRMED – reproduziert; belegt aber nur Fixture-Verhalten', status: 'CONFIRMED_WITH_CAVEAT' }
];

// ---------------------------------------------------------------------------
// 14b. Wirksamkeit: Das Shield greift ausschließlich bei Detector-status "block"
// ---------------------------------------------------------------------------
{
  const realistic = [
    { url: 'https://paypa1.com/login', human: 'PHISH' },
    { url: 'https://paypalsupport.com', human: 'PHISH' },
    { url: 'https://g00gle-login.com', human: 'PHISH' },
    { url: 'https://appleid-apple.com', human: 'PHISH' },
    { url: 'https://sparkasse-sicherheit.de', human: 'PHISH' },
    { url: 'https://paypal-rechnung.com/login', human: 'PHISH' },
    { url: 'https://paypal-rueckerstattung.com', human: 'PHISH' },
    { url: 'https://dhl-sendung.de', human: 'PHISH' },
    { url: 'https://amazon-paket.de', human: 'PHISH' },
    { url: 'https://netflix-abo.com', human: 'PHISH' },
    { url: 'https://microsoft-refund.com', human: 'PHISH' },
    { url: 'https://binance-verifizierung.com', human: 'PHISH' }
  ];
  const rows = [];
  for (const r of realistic) {
    const sb = createSandbox({ url: r.url, passwordField: true });
    const v = sb.state.realEngine.classify(r.url);
    const form = new sb.FakeHTMLFormElement();
    form.setAttribute('action', '/login');
    const res = sb.fireSubmit(form);
    rows.push({
      url: r.url, human: r.human,
      detector: { status: v.status, action: v.action, reason: v.reason || null },
      shieldBlockedSubmit: !!(res.prevented || res.modalPresent),
      bannerShown: !!sb.document.getElementById('antipisher-badge-root'),
      protected: v.status === 'block'
    });
  }
  const phish = rows.filter(x => x.human === 'PHISH');
  results.efficacy = {
    evidence_class: 'MOCK (realer Detector + Shield)',
    rows,
    phish_total: phish.length,
    phish_protected: phish.filter(x => x.protected).length,
    phish_unprotected: phish.filter(x => !x.protected).length,
    note: 'Das Shield kann nur eingreifen, wenn der Detector status "block" liefert. Bei den nicht erkannten Bait-/Kombinationsdomains (z. B. paypal-rechnung.com, dhl-sendung.de) gibt es weder Overlay noch Banner noch Submit-Block – die POST-Mitigation ist damit von der (im Lead-Audit als lückenhaft belegten) Erkennung abhängig.'
  };
}

// ---------------------------------------------------------------------------
// 15. Zusammenfassung + POST-Gap-Urteil
// ---------------------------------------------------------------------------
const allCases = []
  .concat(results.shield_behavior, results.post_bypass_cases, results.fail_open)
  .concat(results.fp.page_verdict_and_shield);
const secViolations = allCases.filter(c => c.status === 'SECURITY_VIOLATION').map(c => c.id || c.url);
const fps = allCases.filter(c => c.status === 'FALSE_POSITIVE').map(c => c.id || c.url);

results.post_gap_verdict = {
  original_finding: 'Audit-Befund CHAIN-002 / B3: POST-Hauptnavigationen umgehen den Chrome-DNR-Preflight (DNR nur requestMethods:["get"])',
  verdict: 'NICHT_GESCHLOSSEN (nur teilweise UI-Mitigation nach dem Laden der Zielseite)',
  chrome: {
    preflight_for_post_navigation: false,
    evidence: 'chrome/background.js:' + lineOf(chromeBg, "requestMethods: ['get']") + " requestMethods:['get']; SHA-256 unverändert gegenüber Pre-Remediation-Snapshot",
    effect: 'POST-Navigation (auto-submittiertes Formular einer kompromittierten/angreifenden Seite) erreicht die Phishing-Seite weiterhin ohne Guard-Interstitial.'
  },
  firefox: {
    preflight_for_post_navigation: true,
    evidence: 'firefox/background.js:' + lineOf(firefoxBg, "types:['main_frame']") + ' ohne Methodenfilter; blockierender webRequest (unverändert)',
    effect: 'POST wird prä-request abgefangen, aber beim Fortfahren via location.replace als GET neu geladen → Formulardaten gehen verloren; Runtime-Redirect/WAR = NOT_TESTED.'
  },
  shield_contribution: 'Formular-Submit-Events werden im bereits geladenen Dokument geblockt (UX-Barriere, keine Navigations-/Exfiltrationskontrolle). Gegen einen bösartigen Seiten-JS-Angreifer beliebig umgehbar: form.submit(), fetch/XHR/beacon, iframe (all_frames:false), formaction, Overlay entfernen/ausblenden.',
  residual_bypasses: results.post_bypass_cases.filter(c => c.status === 'SECURITY_VIOLATION').map(c => ({ id: c.id, title: c.desc, vector: c.vector })),
  claim_status: {
    'README: POST geschützt': 'FALSCH',
    'Next.md: POST-Lücke geschlossen': 'FALSCH',
    'Next.md: manipulationssicher / vollständig immun': 'FALSCH'
  },
  required_fix: 'Claims korrigieren + echtes Preflight für Known-Bad-Domains via DNR-Blockregeln für ALLE Methoden; Content-Script ausdrücklich als Defense-in-Depth/UX kennzeichnen (nicht als Sicherheitsgrenze); Firefox-POST-Datenverlust beheben (nur blocken/anzeigen statt POST→GET umzuschreiben).'
};

results.summary = {
  counts_by_group: {
    baseline_shield: summarize(results.shield_behavior),
    post_bypass: summarize(results.post_bypass_cases),
    fail_open: summarize(results.fail_open),
    fp_page_cases: results.fp.summary
  },
  security_violations: secViolations,
  false_positives: fps,
  hash_unchanged_backgrounds: {
    chrome: results.hash_evidence.comparisons.find(x => x.path === 'chrome/background.js').unchanged,
    firefox: results.hash_evidence.comparisons.find(x => x.path === 'firefox/background.js').unchanged
  },
  decisive_findings: [
    'POST-/Navigations-Lücke nicht geschlossen: Chrome-DNR-Regel unverändert GET-only (Hash-Beweis), Shield läuft erst nach dem Laden.',
    'form.submit()/prototype.submit umgeht die Capture-Interzeption vollständig (MDN-dokumentiert, MOCK-belegt).',
    'iframe-Formulare ungeschützt wegen content_scripts all_frames:false.',
    'formaction des Submit-Buttons wird nicht klassifiziert (MOCK-Bypass).',
    'Overlay ist nicht manipulationssicher: Host per Seiten-JS entfernbar; Seiten-CSS display:none blendet ihn real in Chrome 155 aus; kein MutationObserver/kein Re-Append/kein inline display.',
    'explanation_de wird unescaped in shadow.innerHTML interpoliert (latenter DOM-XSS-Sink, derzeit durch URL-Host-Grammatik entschärft).',
    'Seiten-URL-Klassifikation erzeugt neue FPs durch V2-Pfad-/Query-Regel auf nicht-kuratierte Drittseiten (Suchmaschinen/Ratgeber/Foren); official-domain-Precheck schützt kuratierte Marken (github/reddit/stackoverflow/wikipedia/bank/shop-Beispiele SAFE) – die im Auftrag vermuteten FPs auf github.com/paypal/... treten NICHT auf.',
    'V2-Pfadregel hat /docs|/news|/blog-Ausnahme → Angreifer kann Marken-Login-Pfade dort verstecken (FN-Evasion) und den Shield so umgehen.',
    'WAR-Exposition ausgeweitet (shared/*.js, guard.js, guard.css) obwohl laut MDN für Content Scripts nicht nötig; Chrome-Extension-ID fest → Fingerprinting/Regel-Offenlegung; Widerspruch zur "Manifest-Härtung".',
    'Firefox-Blocker B1 (WAR) statisch behoben; gecko-ID auf @visiongaia.org geändert, Domain-Inhaberschaft aber nicht belegt/nicht prüfbar; data_collection_permissions-Schema korrekt, AMO-Review NOT_TESTED.',
    '21/21-Tests sind Fixture-Tests und belegen die POST-Claims nicht.',
    'Wirksamkeit: nur ' + results.efficacy.phish_protected + '/' + results.efficacy.phish_total + ' realistische Phishing-Bait-Domains werden vom Detector geblockt – bei den übrigen greift das Shield überhaupt nicht (kein Overlay, kein Banner, kein Submit-Block).'
  ],
  release_gate: 'BLOCKED (Content-Shield-/POST-Claims nicht belegt; alte Chrome-Blocker offen; Browser-E2E fehlt)'
};

// ---------------------------------------------------------------------------
// Persistieren + Ledger
// ---------------------------------------------------------------------------
fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2), 'utf8');
const summary = results.summary;
console.log('=== Antipisher Shield Verification Probe ===');
console.log('results:', RESULTS_PATH);
console.log('baseline     :', JSON.stringify(summary.counts_by_group.baseline_shield));
console.log('post_bypass  :', JSON.stringify(summary.counts_by_group.post_bypass));
console.log('fail_open    :', JSON.stringify(summary.counts_by_group.fail_open));
console.log('fp           :', JSON.stringify(results.fp.summary));
console.log('backgrounds unchanged:', JSON.stringify(summary.hash_unchanged_backgrounds));
console.log('POST-Gap     :', results.post_gap_verdict.verdict);
console.log('efficacy     :', results.efficacy.phish_protected + '/' + results.efficacy.phish_total, 'realistische Phishing-Domains geblockt');
console.log('violations   :', summary.security_violations.join(', ') || '–');
console.log('false positives:', summary.false_positives.join(', ') || '–');
console.log('DECISIVE FINDINGS:');
for (const f of summary.decisive_findings) console.log(' -', f);
