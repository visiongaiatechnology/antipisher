const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createAdblockSandbox(opts = {}) {
  const hostname = opts.hostname || 'news.example.com';
  const href = opts.href || 'https://news.example.com/article/123';
  const sessionData = { ...opts.sessionStorage };
  const eventsDispatched = [];
  const adoptedStyleSheets = [];

  class FakeCSSStyleSheet {
    constructor() {
      this.cssRules = [];
      this.cssText = '';
    }
    replaceSync(css) {
      this.cssText = css;
    }
  }

  const createdElements = [];

  class FakeNode {
    constructor(tagName) {
      this.nodeName = (tagName || 'div').toUpperCase();
      this.tagName = this.nodeName;
      this.nodeType = 1;
      this.style = {
        _props: {},
        setProperty(k, v, imp) { this._props[k] = { val: v, imp }; },
        getPropertyValue(k) { return this._props[k]?.val || ''; },
        removeProperty(k) { delete this._props[k]; }
      };
      this.attributes = {};
      this.className = '';
      this.children = [];
      this.parentNode = null;
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] || null; }
    hasAttribute(k) { return k in this.attributes; }
    removeAttribute(k) { delete this.attributes[k]; }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    insertBefore(newChild, refChild) {
      newChild.parentNode = this;
      const idx = this.children.indexOf(refChild);
      if (idx !== -1) this.children.splice(idx, 0, newChild);
      else this.children.push(newChild);
      return newChild;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    matches(sel) {
      if (!sel) return false;
      const parts = sel.split(',').map(s => s.trim().toLowerCase());
      const tag = this.nodeName.toLowerCase();
      const cls = (this.className || '').toLowerCase();
      const id = (this.attributes['id'] || '').toLowerCase();
      for (const p of parts) {
        if (p === tag) return true;
        if (p.startsWith('.') && cls.includes(p.slice(1))) return true;
        if (p.startsWith('#') && id === p.slice(1)) return true;
        if (p.includes('adsbygoogle') && (cls.includes('adsbygoogle') || tag === 'ins')) return true;
        if (p.includes('ad-container') && cls.includes('ad-container')) return true;
        if (p.includes('ad-banner') && cls.includes('ad-banner')) return true;
      }
      return false;
    }
    querySelectorAll(sel) {
      const results = [];
      const traverse = (node) => {
        for (const c of node.children) {
          if (c.matches && c.matches(sel)) results.push(c);
          traverse(c);
        }
      };
      traverse(this);
      return results;
    }
  }

  const fakeDoc = {
    readyState: 'complete',
    adoptedStyleSheets,
    documentElement: new FakeNode('html'),
    head: new FakeNode('head'),
    body: new FakeNode('body'),
    createElement(tag) {
      const el = new FakeNode(tag);
      createdElements.push(el);
      return el;
    },
    getElementById(id) {
      if (id === 'vgt-ad-shield-style') {
        return createdElements.find(e => e.id === 'vgt-ad-shield-style') || null;
      }
      return null;
    },
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded') setTimeout(fn, 1);
    },
    dispatchEvent(e) {
      eventsDispatched.push(e);
      return true;
    }
  };
  fakeDoc.documentElement.appendChild(fakeDoc.head);
  fakeDoc.documentElement.appendChild(fakeDoc.body);

  let openedUrl = null;
  const fakeWindow = {
    location: {
      hostname,
      href,
      pathname: '/article/123',
      search: '',
      hash: ''
    },
    document: fakeDoc,
    open(url) {
      openedUrl = url;
      return { closed: false };
    },
    sessionStorage: {
      getItem(k) { return sessionData[k] || null; },
      setItem(k, v) { sessionData[k] = String(v); },
      removeItem(k) { delete sessionData[k]; }
    },
    MutationObserver: class FakeMutationObserver {
      constructor(callback) {
        this.callback = callback;
        FakeMutationObserver.latestInstance = this;
      }
      observe(root, opts) {
        this.observedRoot = root;
      }
      disconnect() {}
      trigger(mutations) {
        this.callback(mutations);
      }
    },
    HTMLElement: FakeNode,
    CSSStyleSheet: FakeCSSStyleSheet,
    setTimeout: (fn, ms) => {
      if (typeof fn === 'function') fn();
      return 1;
    },
    clearTimeout: () => {}
  };

  const ctx = {
    window: fakeWindow,
    document: fakeDoc,
    HTMLElement: FakeNode,
    CSSStyleSheet: FakeCSSStyleSheet,
    setTimeout: (fn, ms) => {
      if (typeof fn === 'function') fn();
      return 1;
    },
    clearTimeout: () => {},
    console,
    Math,
    Object,
    String,
    URL,
    Uint8ClampedArray,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    }
  };
  ctx.globalThis = ctx;

  const context = vm.createContext(ctx);
  const aegisCode = fs.readFileSync(path.join(__dirname, '..', 'shared', 'aegis-engine.js'), 'utf8');
  vm.runInContext(aegisCode, context);

  return { ctx, fakeWindow, fakeDoc, eventsDispatched, adoptedStyleSheets: fakeDoc.adoptedStyleSheets, createdElements, getOpenedUrl: () => openedUrl };
}

test('VGT Ad Shield: rulesets/trackers.json includes top ad networks and exchanges', () => {
  const filePath = path.join(__dirname, '..', 'rulesets', 'trackers.json');
  assert.ok(fs.existsSync(filePath), 'trackers.json must exist');
  const rules = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const blockRule = rules.find(r => r.action && r.action.type === 'block');
  assert.ok(blockRule, 'DNR block rule must exist');

  const domains = blockRule.condition.requestDomains;
  const expectedAdDomains = [
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
    'criteo.com', 'taboola.com', 'widgets.outbrain.com', 'adnxs.com',
    'rubiconproject.com', 'pubmatic.com', 'popads.net', 'popcash.net',
    'propellerads.com', 'adsterra.com', 'media.net', 'buysellads.com',
    'exoclick.com', 'adcolony.com', 'applovin.com', 'sharethrough.com'
  ];

  for (const d of expectedAdDomains) {
    assert.ok(domains.includes(d), `Domain "${d}" must be included in DNR ad blocking rule`);
  }
});

test('VGT Ad Shield: Cosmetic CSS engine injects zero-flicker stylesheet', () => {
  const sandbox = createAdblockSandbox();
  const { adoptedStyleSheets } = sandbox;

  assert.ok(adoptedStyleSheets.length > 0, 'adoptedStyleSheets must contain injected cosmetic sheet');
  const sheet = adoptedStyleSheets[0];
  assert.ok(sheet.cssText.includes('ins.adsbygoogle'), 'Sheet must hide ins.adsbygoogle');
  assert.ok(sheet.cssText.includes('.ad-container'), 'Sheet must hide .ad-container');
  assert.ok(sheet.cssText.includes('[id^="google_ads_"]'), 'Sheet must hide Google ad slots');
  assert.ok(sheet.cssText.includes('display: none !important'), 'Sheet must set display: none !important');
  assert.ok(sheet.cssText.includes('visibility: hidden !important'), 'Sheet must set visibility: hidden !important');
});

test('VGT Ad Shield: adsbygoogle stub inoculates push() calls without crashing', () => {
  const sandbox = createAdblockSandbox();
  const { fakeWindow, eventsDispatched } = sandbox;

  assert.ok(fakeWindow.adsbygoogle, 'window.adsbygoogle must be defined');
  assert.equal(fakeWindow.adsbygoogle.loaded, true, 'adsbygoogle.loaded must be true');

  // Push an ad slot configuration (standard AdSense invocation)
  const pushResult = fakeWindow.adsbygoogle.push({ params: { slot: 12345 } });
  assert.equal(pushResult, 0, 'adsbygoogle.push must return 0 without error');

  const hasEvent = eventsDispatched.some(e => e.type === 'aegis:tracker-blocked' && String(e.detail?.target || e.detail).includes('adsbygoogle'));
  assert.ok(hasEvent, 'adsbygoogle.push must dispatch tracker-blocked event');
});

test('VGT Ad Shield: Anti-Adblock flags are set to neutral (uBlock set-constant style)', () => {
  const sandbox = createAdblockSandbox();
  const { fakeWindow } = sandbox;

  assert.equal(fakeWindow.canRunAds, true, 'canRunAds must be true');
  assert.equal(fakeWindow.isAdBlockActive, false, 'isAdBlockActive must be false');
  assert.equal(fakeWindow.adblock, false, 'adblock must be false');
  assert.equal(fakeWindow.google_ad_status, 1, 'google_ad_status must be 1');
});

test('VGT Ad Shield: Bait element offsetHeight spoofing bypasses detection traps', () => {
  const sandbox = createAdblockSandbox();
  const { fakeDoc, eventsDispatched } = sandbox;

  // Create a honeypot/bait element that anti-adblock scripts inject
  const baitEl = fakeDoc.createElement('div');
  baitEl.className = 'adsbox pub_300x250 ad-test';

  // Read offsetHeight
  const height = baitEl.offsetHeight;
  assert.equal(height, 250, 'Bait element offsetHeight must return 250 instead of 0');

  const width = baitEl.offsetWidth;
  assert.equal(width, 300, 'Bait element offsetWidth must return 300');

  const hasBaitEv = eventsDispatched.some(e => e.type === 'aegis:tracker-blocked' && String(e.detail?.target || e.detail).includes('anti-adblock-bait'));
  assert.ok(hasBaitEv, 'Bait element probe must be logged in tracker-blocked event');
});

test('VGT Ad Shield: Popunder window.open is intercepted and neutralized', () => {
  const sandbox = createAdblockSandbox();
  const { fakeWindow, eventsDispatched, getOpenedUrl } = sandbox;

  // Attempt to trigger a popunder to a known advertising network
  const res = fakeWindow.open('https://serve.popads.net/popunder.php');
  assert.equal(res, null, 'Popunder window.open must return null and cancel opening');
  assert.equal(getOpenedUrl(), null, 'Underlying window.open must not be invoked for popunder');

  const hasPopEv = eventsDispatched.some(e => e.type === 'aegis:tracker-blocked' && String(e.detail?.target || e.detail).includes('popunder'));
  assert.ok(hasPopEv, 'Popunder deflection must dispatch tracker-blocked event');
});

test('VGT Ad Shield: MutationObserver detects and collapses dynamically added ad elements', () => {
  const sandbox = createAdblockSandbox();
  const { fakeDoc, fakeWindow } = sandbox;

  const moInstance = fakeWindow.MutationObserver.latestInstance;
  assert.ok(moInstance, 'MutationObserver must have been registered');

  // Simulate late-injected ad element (e.g. infinite scroll banner)
  const adBanner = fakeDoc.createElement('div');
  adBanner.className = 'ad-container banner-ad';
  fakeDoc.body.appendChild(adBanner);

  // Trigger mutation
  moInstance.trigger([{ addedNodes: [adBanner] }]);

  assert.equal(adBanner.style.getPropertyValue('display'), 'none', 'Ad banner must be hidden');
  assert.equal(adBanner.getAttribute('data-vgt-ad-blocked'), 'true', 'Ad banner must be stamped');
});
