const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createTrackerSandbox(opts = {}) {
  const hostname = opts.hostname || 'store.example.com';
  const href = opts.href || 'https://store.example.com/checkout?item=123&utm_source=newsletter&fbclid=abc123xyz';
  const urlObj = new URL(href);
  const sessionData = { ...opts.sessionStorage };
  const eventsDispatched = [];

  const fakeHistory = {
    state: null,
    replaceState(state, title, url) {
      this.state = state;
      this.lastReplacedUrl = url;
    }
  };

  const fakeNavigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    sendBeacon(url, data) {
      this.lastSentBeacon = { url, data };
      return true;
    }
  };

  const fakeDoc = {
    documentElement: {
      getAttribute(attr) { return null; }
    },
    addEventListener() {},
    dispatchEvent(e) {
      eventsDispatched.push(e);
      return true;
    }
  };

  const fakeWindow = {
    location: {
      hostname,
      href,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash
    },
    history: fakeHistory,
    navigator: fakeNavigator,
    sessionStorage: {
      getItem(k) { return sessionData[k] || null; },
      setItem(k, v) { sessionData[k] = String(v); },
      removeItem(k) { delete sessionData[k]; }
    },
    devicePixelRatio: 1.0,
    setTimeout: (fn, ms) => {
      if (typeof fn === 'function') fn();
      return 1;
    }
  };

  const ctx = {
    window: fakeWindow,
    document: fakeDoc,
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

  return { ctx, fakeWindow, fakeHistory, fakeNavigator, fakeDoc, eventsDispatched };
}

test('Tracker Shield: rulesets/trackers.json is valid DNR ruleset with blocking and query stripping', () => {
  const filePath = path.join(__dirname, '..', 'rulesets', 'trackers.json');
  assert.ok(fs.existsSync(filePath), 'rulesets/trackers.json must exist');
  const rules = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.ok(Array.isArray(rules), 'rules must be an array');
  assert.ok(rules.length >= 2, 'rules must have at least 2 rules');

  const blockRule = rules.find(r => r.action && r.action.type === 'block');
  assert.ok(blockRule, 'block rule must exist');
  assert.ok(blockRule.condition.requestDomains.includes('google-analytics.com'));
  assert.ok(blockRule.condition.requestDomains.includes('connect.facebook.net'));
  assert.ok(blockRule.condition.requestDomains.includes('clarity.ms'));

  const redirectRule = rules.find(r => r.action && r.action.type === 'redirect');
  assert.ok(redirectRule, 'redirect/strip rule must exist');
  const removeParams = redirectRule.action.redirect.transform.queryTransform.removeParams;
  assert.ok(removeParams.includes('utm_source'));
  assert.ok(removeParams.includes('fbclid'));
  assert.ok(removeParams.includes('gclid'));
});

test('Tracker Shield: Surrogate ga fulfills hitCallback so checkouts/logins do not hang', () => {
  const { fakeWindow } = createTrackerSandbox();
  assert.ok(fakeWindow.ga, 'window.ga must be defined as surrogate');
  assert.equal(fakeWindow.ga.loaded, true);

  let callbackCalled = false;
  fakeWindow.ga('send', 'event', 'checkout', 'submit', {
    hitCallback: () => {
      callbackCalled = true;
    }
  });
  assert.equal(callbackCalled, true, 'ga hitCallback must be invoked asynchronously without network transfer');
});

test('Tracker Shield: Surrogate dataLayer.push fulfills eventCallback', () => {
  const { fakeWindow } = createTrackerSandbox();
  assert.ok(Array.isArray(fakeWindow.dataLayer), 'window.dataLayer must be defined array');

  let eventCallbackCalled = false;
  fakeWindow.dataLayer.push({
    event: 'purchase',
    value: 99.95,
    eventCallback: () => {
      eventCallbackCalled = true;
    }
  });
  assert.equal(eventCallbackCalled, true, 'dataLayer.push eventCallback must be fulfilled');
});

test('Tracker Shield: Surrogate Meta Pixel (fbq) and TikTok (ttq) are safely defused', () => {
  const { fakeWindow } = createTrackerSandbox();
  assert.ok(fakeWindow.fbq, 'window.fbq must be surrogate');
  assert.equal(fakeWindow.fbq.loaded, true);

  // Calling fbq should not throw
  assert.doesNotThrow(() => {
    fakeWindow.fbq('track', 'PageView');
    fakeWindow.fbq('trackCustom', 'CustomLead', { id: 123 });
  });

  assert.ok(fakeWindow.ttq, 'window.ttq must be surrogate');
  assert.doesNotThrow(() => {
    fakeWindow.ttq.load('ABC12345');
    fakeWindow.ttq.track('CompletePayment');
  });
});

test('Tracker Shield: Surrogate Clarity and Hotjar exist and cloak as native code', () => {
  const { fakeWindow } = createTrackerSandbox();
  assert.ok(typeof fakeWindow.clarity === 'function');
  assert.match(fakeWindow.clarity.toString(), /function\s+clarity\(\)\s*\{\s*\[native code\]\s*\}/);

  assert.ok(typeof fakeWindow.hj === 'function');
  assert.match(fakeWindow.hj.toString(), /function\s+hj\(\)\s*\{\s*\[native code\]\s*\}/);
});

test('Tracker Shield: navigator.sendBeacon drops telemetry payloads and returns true', () => {
  const { fakeWindow, eventsDispatched } = createTrackerSandbox();

  const success = fakeWindow.navigator.sendBeacon('https://www.google-analytics.com/collect', 'v=1&tid=UA-1234');
  assert.equal(success, true, 'sendBeacon to tracker must return true');
  assert.equal(fakeWindow.navigator.lastSentBeacon, undefined, 'Payload must not be passed to underlying network beacon');

  const trackerEvent = eventsDispatched.find(e => e.type === 'aegis:tracker-blocked');
  assert.ok(trackerEvent, 'aegis:tracker-blocked event must be dispatched');
});

test('Tracker Shield: URL tracking parameters (utm_*, fbclid) are sanitized via replaceState', () => {
  const { fakeHistory, eventsDispatched } = createTrackerSandbox({
    href: 'https://store.example.com/checkout?item=123&utm_source=newsletter&fbclid=abc123xyz'
  });

  assert.ok(fakeHistory.lastReplacedUrl, 'replaceState must have been called to strip tracking tokens');
  assert.equal(fakeHistory.lastReplacedUrl, '/checkout?item=123');
  assert.ok(!fakeHistory.lastReplacedUrl.includes('utm_source'));
  assert.ok(!fakeHistory.lastReplacedUrl.includes('fbclid'));

  const urlEvent = eventsDispatched.find(e => e.type === 'aegis:tracker-blocked');
  assert.ok(urlEvent, 'aegis:tracker-blocked event must be dispatched for stripped URL params');
});
