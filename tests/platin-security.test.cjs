const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'shared', 'sites.js'));
const detector = require(path.join(ROOT, 'shared', 'detector.js'));

const delay = (ms = 25) => new Promise(r => setTimeout(r, ms));
function fakeEvents() {
  const listeners = [];
  return { listeners, addListener(fn) { listeners.push(fn); } };
}

function createChromeSandbox(opts = {}) {
  const events = {
    installed: fakeEvents(), start: fakeEvents(), changed: fakeEvents(),
    removed: fakeEvents(), committed: fakeEvents(), before: fakeEvents(), message: fakeEvents()
  };
  const local = { ...(opts.local || {}) };
  const dynamic = [];
  const session = [];
  const updated = [];
  const timers = [];
  const tabs = { ...(opts.tabs || { 7: { url: 'chrome-extension://fakeid/guard.html#https://paypa1.com/' } }) };

  const chrome = {
    runtime: {
      id: 'fakeid',
      getURL: p => 'chrome-extension://fakeid/' + p,
      onInstalled: events.installed,
      onStartup: events.start,
      onMessage: events.message
    },
    storage: {
      local: {
        async get(keys) {
          const ks = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {});
          return Object.fromEntries(ks.filter(k => k in local).map(k => [k, local[k]]));
        },
        async set(values) { Object.assign(local, values); }
      },
      onChanged: events.changed
    },
    tabs: {
      onRemoved: events.removed,
      async get(tabId) {
        if (!(tabId in tabs)) throw new Error('No tab with id: ' + tabId);
        return { id: tabId, url: tabs[tabId].url };
      },
      async update(tabId, changes) { updated.push({ tabId, ...changes }); }
    },
    webNavigation: { onCommitted: events.committed, onBeforeNavigate: events.before },
    declarativeNetRequest: {
      async getDynamicRules() { return [...dynamic]; },
      async getSessionRules() { return [...session]; },
      async isRegexSupported() { return { isSupported: true }; },
      async updateDynamicRules({ removeRuleIds = [], addRules = [] }) {
        for (const id of removeRuleIds) {
          const idx = dynamic.findIndex(x => x.id === id);
          if (idx >= 0) dynamic.splice(idx, 1);
        }
        dynamic.push(...addRules);
      },
      async updateSessionRules({ removeRuleIds = [], addRules = [] }) {
        for (const id of removeRuleIds) {
          const idx = session.findIndex(x => x.id === id);
          if (idx >= 0) session.splice(idx, 1);
        }
        session.push(...addRules);
      }
    }
  };

  const ctx = {
    chrome, URL, console: { log() {}, warn() {}, error() {} }, Map, Set, Promise, Date, String, Number, Array, Error,
    setTimeout(fn, ms) {
      const handle = { id: timers.length + 1, fn, ms, cleared: false, unref() {} };
      timers.push(handle);
      return handle;
    },
    clearTimeout(handle) {
      if (handle) handle.cleared = true;
    }
  };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  ctx.importScripts = (...names) => {
    if (opts.missingEngine) return;
    for (const file of names) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, 'chrome', file), 'utf8'), context);
    }
  };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'chrome', 'background.js'), 'utf8'), context);
  return { chrome, local, dynamic, session, updated, events, timers, tabs, ctx };
}

function createFirefoxSandbox(opts = {}) {
  const events = { before: fakeEvents(), removed: fakeEvents(), message: fakeEvents(), updated: fakeEvents() };
  const local = { ...(opts.local || {}) };
  const timers = [];
  const tabs = { ...(opts.tabs || { 7: { url: 'moz-extension://fake/guard.html?url=https%3A%2F%2Fpaypa1.com%2F' } }) };

  const browser = {
    runtime: { getURL: p => 'moz-extension://fake/' + p, onMessage: events.message },
    webRequest: { onBeforeRequest: events.before },
    tabs: {
      onRemoved: events.removed,
      onUpdated: events.updated,
      async get(tabId) {
        if (!(tabId in tabs)) throw new Error('No tab with id: ' + tabId);
        return { id: tabId, url: tabs[tabId].url };
      }
    },
    storage: {
      local: {
        async get(key) {
          if (typeof key === 'string') return { [key]: local[key] };
          if (Array.isArray(key)) return Object.fromEntries(key.map(k => [k, local[k]]));
          return { ...local };
        },
        async set(values) { Object.assign(local, values); }
      }
    }
  };

  const ctx = {
    browser, URL, console: { log() {}, warn() {}, error() {} }, Map, Set, Promise, Date, String, Number, Array, Error,
    setTimeout(fn, ms) {
      const handle = { id: timers.length + 1, fn, ms, cleared: false, unref() {} };
      timers.push(handle);
      return handle;
    },
    clearTimeout(handle) {
      if (handle) handle.cleared = true;
    }
  };
  ctx.globalThis = ctx;
  const context = vm.createContext(ctx);
  if (!opts.missingEngine) {
    for (const f of ['shared/sites.js', 'shared/detector.js']) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, 'firefox', f), 'utf8'), context);
    }
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'firefox', 'background.js'), 'utf8'), context);
  return { browser, local, events, timers, tabs, ctx };
}

test('VGT-020: Detector enforces RFC 1035 host/label bounds and completes extreme inputs under 20 ms', () => {
  const extremeInputs = [
    ['100k host label', 'https://' + 'a'.repeat(100000) + '.com/', 'skip'],
    ['64 subdomain labels', 'https://' + Array.from({ length: 64 }, (_, i) => 'l' + i).join('.') + '.com/', 'skip'],
    ['1k IDN label', 'https://' + 'ü'.repeat(1000) + '.de/', 'skip'],
    ['300k oversize URL', 'https://example.com/?' + 'x'.repeat(300000), 'skip'],
    ['100k query on valid host', 'https://example.com/?' + 'a'.repeat(100000), 'safe']
  ];

  for (const [label, url, expected] of extremeInputs) {
    const t0 = process.hrtime.bigint();
    const res = detector.classify(url);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.equal(res.status, expected, `${label} must return ${expected}`);
    assert.ok(ms < 20, `${label} took ${ms.toFixed(2)} ms (exceeds 20 ms budget)`);
  }

  const popupHtml = fs.readFileSync(path.join(ROOT, 'shared', 'popup.html'), 'utf8');
  assert.match(popupHtml, /id="url"[^>]*maxlength="2048"/, 'popup.html #url input must enforce maxlength="2048"');
});

test('VGT-001/005/006: Chrome & Firefox reject unauthorized allow-once senders, tab mismatches, and bad schemes', async () => {
  const c = createChromeSandbox({ local: { strictMode: true } });
  await delay();
  const cMsg = c.events.message.listeners[0];
  const callChrome = (req, sender) => new Promise(resolve => cMsg(req, sender, resolve));

  // 1. Web origin sender rejected
  let r = await callChrome({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: 'https://evil.test/' });
  assert.equal(r.ok, false);
  assert.equal(c.session.length, 0);

  // 2. Missing sender rejected
  r = await callChrome({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, {});
  assert.equal(r.ok, false);

  // 3. Tab not on guard.html rejected
  c.tabs[9] = { url: 'https://evil.test/' };
  r = await callChrome({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 9 }, { url: 'chrome-extension://fakeid/guard.html' });
  assert.equal(r.ok, false);

  // 4. Non-HTTP(S) schemes rejected
  for (const bad of ['javascript:alert(1)', 'data:text/html,1', 'file:///C:/win.ini', 'chrome://extensions/']) {
    r = await callChrome({ type: 'allow-once', url: bad, tabId: 7 }, { url: 'chrome-extension://fakeid/guard.html' });
    assert.equal(r.ok, false, `Chrome must reject ${bad}`);
  }
  assert.equal(c.session.length, 0);

  // Firefox checks
  const f = createFirefoxSandbox();
  const fMsg = f.events.message.listeners[0];
  r = await fMsg({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: 'https://evil.test/' });
  assert.equal(r.ok, false);
  r = await fMsg({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, {});
  assert.equal(r.ok, false);
  f.tabs[9] = { url: 'https://evil.test/' };
  r = await fMsg({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 9 }, { url: 'moz-extension://fake/guard.html' });
  assert.equal(r.ok, false);
  for (const bad of ['javascript:alert(1)', 'data:text/html,1', 'file:///etc/passwd']) {
    r = await fMsg({ type: 'allow-once', url: bad, tabId: 7 }, { url: 'moz-extension://fake/guard.html' });
    assert.equal(r.ok, false, `Firefox must reject ${bad}`);
  }
});

test('VGT-006: Chrome & Firefox enforce 30-second TTL and invalidate stale one-shot bypasses', async () => {
  // Chrome strict session rule TTL expiration
  const c = createChromeSandbox({ local: { strictMode: true } });
  await delay();
  const cMsg = c.events.message.listeners[0];
  const r = await new Promise(resolve => cMsg(
    { type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 },
    { url: 'chrome-extension://fakeid/guard.html' },
    resolve
  ));
  assert.equal(r.ok, true);
  assert.equal(c.session.length, 1);
  assert.equal(c.timers.length, 1);
  assert.equal(c.timers[0].ms, 30000);

  // Trigger TTL expiration callback
  await c.timers[0].fn();
  assert.equal(c.session.length, 0, 'Session allow rule must be removed when 30s TTL expires');

  // Firefox TTL & stale-navigation invalidation
  const f = createFirefoxSandbox();
  const fMsg = f.events.message.listeners[0];
  const fBefore = f.events.before.listeners[0];
  await fMsg({ type: 'allow-once', url: 'https://paypa1.com/', tabId: 7 }, { url: 'moz-extension://fake/guard.html' });
  assert.equal(f.timers.length, 1);
  assert.equal(f.timers[0].ms, 30000);

  // Navigating to a different URL in tab 7 consumes/invalidates the pending bypass for paypa1.com
  fBefore({ url: 'https://example.com/', tabId: 7, type: 'main_frame', method: 'GET' });
  const retryAfterOtherNav = fBefore({ url: 'https://paypa1.com/', tabId: 7, type: 'main_frame', method: 'GET' });
  assert.ok(retryAfterOtherNav.redirectUrl, 'Stale bypass must be cleared when another navigation occurs first');
});

test('VGT-002/061/062: Firefox & Chrome fail closed if detector engine is unavailable or throws', async () => {
  const f = createFirefoxSandbox({ missingEngine: true });
  const fBefore = f.events.before.listeners[0];
  const res = fBefore({ url: 'https://paypa1.com/', tabId: 7, type: 'main_frame', method: 'GET' });
  assert.ok(res && /^moz-extension:\/\/fake\/guard\.html\?url=/.test(res.redirectUrl || ''),
    'Firefox must fail-closed to guard.html when detector engine is unavailable');
  await delay();
  assert.equal(f.local.protectionDegraded, true);

  const c = createChromeSandbox({ missingEngine: true });
  await delay();
  c.events.before.listeners[0]({ frameId: 0, tabId: 5, url: 'https://paypa1.com/' });
  await delay();
  assert.equal(c.updated.length, 1, 'Chrome observer must fail-closed to guard.html when detector engine is missing');
  assert.equal(c.local.protectionDegraded, true);
});

test('VGT-071/072: Security event ring-buffer logs events without storing URLs or PII', async () => {
  const f = createFirefoxSandbox();
  const fBefore = f.events.before.listeners[0];
  fBefore({ url: 'https://paypa1.com/secret-path?token=123', tabId: 7, type: 'main_frame', method: 'GET' });
  await delay();

  assert.ok(Array.isArray(f.local.securityEvents), 'securityEvents array must be created');
  assert.ok(f.local.securityEvents.length >= 1);
  const serialized = JSON.stringify(f.local.securityEvents);
  assert.ok(!serialized.includes('paypa1.com'), 'securityEvents must never store full URLs or hostnames');
  assert.ok(!serialized.includes('secret-path'), 'securityEvents must never store URL paths or tokens');
  assert.equal(f.local.securityEvents[0].type, 'block');
  assert.equal(f.local.securityEvents[0].detail, 'brand-variant');
});

test('VGT-051/055/059: CycloneDX SBOM exists, has zero external dependencies, and matches file hashes', () => {
  const sbomPath = path.join(ROOT, 'sbom.json');
  assert.ok(fs.existsSync(sbomPath), 'sbom.json must exist');
  const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
  assert.equal(sbom.bomFormat, 'CycloneDX');
  assert.equal(sbom.specVersion, '1.5');
  assert.equal(sbom.metadata.component.version, '0.2.3');
  assert.deepEqual(sbom.dependencies, [{ ref: 'antipisher@0.2.3', dependsOn: [] }]);

  for (const comp of sbom.components) {
    const rel = comp.name.startsWith('chrome/') || comp.name.startsWith('firefox/')
      ? comp.name
      : path.join('chrome', comp.name);
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `SBOM component missing on disk: ${rel}`);
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    assert.equal(comp.hashes[0].content, actualHash, `Hash mismatch in SBOM for ${comp.name}`);
  }
});
