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
      this.classList = {
        contains: (c) => (this.className || '').split(/\s+/).includes(c),
        add: (c) => { if (!this.classList.contains(c)) this.className = (this.className + ' ' + c).trim(); },
        remove: (c) => { this.className = (this.className || '').split(/\s+/).filter(x => x !== c).join(' '); }
      };
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
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    }
    matches(sel) {
      if (!sel) return false;
      const parts = sel.split(',').map(s => s.trim().toLowerCase());
      const tag = this.nodeName.toLowerCase();
      const cls = (this.className || '').toLowerCase();
      const id = (this.attributes['id'] || '').toLowerCase();
      for (const p of parts) {
        if (p === tag) return true;
        if (p.startsWith('.') && cls.split(/\s+/).includes(p.slice(1))) return true;
        if (p.startsWith('#') && id === p.slice(1)) return true;
        if (p.includes('movie_player') && id === 'movie_player') return true;
        if (p.includes('html5-video-player') && cls.includes('html5-video-player')) return true;
        if (p.includes('ad-showing') && cls.includes('ad-showing')) return true;
        if (p.includes('ytp-ad-skip-button') && cls.includes('ytp-ad-skip-button')) return true;
        if (p.includes('ytd-enforcement-message-view-model') && tag === 'ytd-enforcement-message-view-model') return true;
        if (p.includes('adsbygoogle') && (cls.includes('adsbygoogle') || tag === 'ins')) return true;
        if (p.includes('ad-container') && cls.includes('ad-container')) return true;
        if (p.includes('ad-banner') && cls.includes('ad-banner')) return true;
      }
      return false;
    }
    querySelector(sel) {
      const all = this.querySelectorAll(sel);
      return all.length > 0 ? all[0] : null;
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

  const docListeners = new Map();

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
      return this.querySelector('#' + id);
    },
    querySelector(sel) {
      if (this.documentElement.matches && this.documentElement.matches(sel)) return this.documentElement;
      return this.documentElement.querySelector(sel);
    },
    querySelectorAll(sel) {
      return this.documentElement.querySelectorAll(sel);
    },
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded') setTimeout(fn, 1);
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    dispatchEvent(e) {
      eventsDispatched.push(e);
      const fns = docListeners.get(e.type) || [];
      for (const fn of fns) fn(e);
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

test('VGT Ad Shield: YouTube TrustedHTML resilience avoids Trusted Types errors', () => {
  // Create YouTube sandbox with TrustedTypes simulation
  const sandbox = createAdblockSandbox({
    hostname: 'www.youtube.com',
    href: 'https://www.youtube.com/watch?v=1vaCngYR7aU'
  });
  const { fakeWindow } = sandbox;

  // Verify __AEGIS_OMEGA__ loaded cleanly
  assert.ok(fakeWindow.__AEGIS_OMEGA__, 'Aegis engine must initialize on YouTube');
  const aegis = fakeWindow.__AEGIS_OMEGA__;

  // Verify sanitizeHTML handles non-string and trusted types safely
  assert.equal(aegis.sanitizeHTML(''), '');
  const dummyObj = { type: 'TrustedHTML' };
  assert.equal(aegis.sanitizeHTML(dummyObj), dummyObj);

  // Verify YouTube cosmetic selectors are present
  assert.ok(aegis.AD_SELECTORS.includes('ytd-ad-slot-renderer'), 'ytd-ad-slot-renderer must be in AD_SELECTORS');
  assert.ok(aegis.AD_SELECTORS.includes('#masthead-ad'), '#masthead-ad must be in AD_SELECTORS');
  assert.ok(aegis.AD_SELECTORS.includes('.ytp-ad-module'), '.ytp-ad-module must be in AD_SELECTORS');
});

test('VGT Ad Shield: YouTube ytInitialPlayerResponse strips adPlacements, playerAds, and adSlots', () => {
  const sandbox = createAdblockSandbox({
    hostname: 'www.youtube.com',
    href: 'https://www.youtube.com/watch?v=1vaCngYR7aU'
  });
  const { fakeWindow } = sandbox;

  // Set mock ytInitialPlayerResponse as YouTube inline script would
  fakeWindow.ytInitialPlayerResponse = {
    videoDetails: { title: 'Test Video', videoId: '1vaCngYR7aU' },
    adPlacements: [{ adPlacementRenderer: { cueRange: { startOffsetMs: 0 } } }],
    playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
    adSlots: [{ adSlotRenderer: {} }],
    playerResponse: {
      adPlacements: [{ cue: 1 }],
      adSlots: [{ slot: 1 }]
    }
  };

  const response = fakeWindow.ytInitialPlayerResponse;
  assert.ok(response, 'ytInitialPlayerResponse must exist');
  assert.equal(response.videoDetails.title, 'Test Video');
  assert.equal(response.adPlacements, undefined, 'adPlacements must be pruned');
  assert.equal(response.playerAds, undefined, 'playerAds must be pruned');
  assert.equal(response.adSlots, undefined, 'adSlots must be pruned');
  assert.equal(response.playerResponse.adPlacements, undefined, 'nested playerResponse adPlacements must be pruned');
});

test('VGT Ad Shield: YouTube fetch interception prunes /youtubei/v1/player JSON', async () => {
  const sandbox = createAdblockSandbox({
    hostname: 'www.youtube.com',
    href: 'https://www.youtube.com/watch?v=1vaCngYR7aU'
  });
  const { fakeWindow, ctx } = sandbox;

  // Inject a mock native fetch
  ctx.Response = class FakeResponse {
    constructor(bodyText, init = {}) {
      this._body = bodyText;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = init.headers || {};
    }
    clone() {
      return new FakeResponse(this._body, { status: this.status, headers: this.headers });
    }
    async json() {
      return JSON.parse(this._body);
    }
    async text() {
      return this._body;
    }
  };

  fakeWindow.fetch = async (url) => {
    return new ctx.Response(JSON.stringify({
      playabilityStatus: { status: 'OK' },
      adPlacements: [{ ad: 1 }],
      adSlots: [{ slot: 1 }]
    }));
  };

  // Re-run injectYouTubeShield to hook fetch
  fakeWindow.__AEGIS_OMEGA__.injectYouTubeShield();

  const res = await fakeWindow.fetch('https://www.youtube.com/youtubei/v1/player?key=123');
  const data = await res.json();

  assert.equal(data.playabilityStatus.status, 'OK');
  assert.equal(data.adPlacements, undefined, 'Fetch adPlacements must be pruned');
  assert.equal(data.adSlots, undefined, 'Fetch adSlots must be pruned');
});

test('VGT Ad Shield: YouTube Video Ad Accelerator fast-forwards and auto-skips video ads', () => {
  const sandbox = createAdblockSandbox({
    hostname: 'www.youtube.com',
    href: 'https://www.youtube.com/watch?v=1vaCngYR7aU'
  });
  const { fakeDoc, fakeWindow, ctx } = sandbox;

  // Construct YouTube player DOM structure
  const player = fakeDoc.createElement('div');
  player.id = 'movie_player';
  player.className = 'html5-video-player ad-showing';
  fakeDoc.body.appendChild(player);

  const video = fakeDoc.createElement('video');
  video.duration = 30;
  video.currentTime = 2;
  video.muted = false;
  video.playbackRate = 1.0;
  player.appendChild(video);

  let skipClicked = false;
  const skipBtn = fakeDoc.createElement('button');
  skipBtn.className = 'ytp-ad-skip-button ytp-button';
  skipBtn.click = () => { skipClicked = true; };
  player.appendChild(skipBtn);

  // Also simulate YouTube Anti-Adblock modal
  const antiAdblockModal = fakeDoc.createElement('ytd-enforcement-message-view-model');
  fakeDoc.body.appendChild(antiAdblockModal);

  // Trigger ad skipper
  fakeDoc.dispatchEvent(new ctx.CustomEvent('timeupdate'));

  // Video must be muted and fast-forwarded
  assert.equal(video.muted, true, 'Ad video must be muted');
  assert.equal(video.playbackRate, 16.0, 'Ad video playbackRate must be set to 16x');
  assert.equal(video.currentTime, 30, 'Ad video must be jumped to duration end');
  assert.equal(skipClicked, true, 'Skip button must be clicked automatically');

  // Anti-adblock modal must be removed
  assert.equal(antiAdblockModal.parentNode, null, 'Anti-adblock modal must be removed from DOM');
});

