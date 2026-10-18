const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createDOMSandbox(locationHref) {
  const listeners = {};
  const attachedElements = [];
  let formDefaultPrevented = false;
  let formStopped = false;

  class FakeHTMLFormElement {
    constructor(action) {
      this.action = action;
      this.attributes = { action };
    }
    getAttribute(name) {
      return this.attributes[name];
    }
  }

  const fakeDocument = {
    readyState: 'complete',
    getElementById(id) {
      return null;
    },
    querySelector(sel) {
      return null;
    },
    createElement(tag) {
      const el = {
        tag,
        style: {},
        id: '',
        innerHTML: '',
        attachShadow({ mode }) {
          const shadowRoot = {
            mode,
            innerHTML: '',
            elements: {},
            getElementById(id) {
              return this.elements[id] || { addEventListener: () => {} };
            }
          };
          el.shadowRoot = shadowRoot;
          return shadowRoot;
        },
        remove() {
          const idx = attachedElements.indexOf(el);
          if (idx >= 0) attachedElements.splice(idx, 1);
        }
      };
      return el;
    },
    documentElement: {
      appendChild(child) {
        attachedElements.push(child);
      }
    },
    addEventListener(evt, fn) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    }
  };

  const fakeWindow = {
    location: new URL(locationHref),
    addEventListener(evt, fn, capture) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push({ fn, capture });
    }
  };

  const ctx = {
    window: fakeWindow,
    document: fakeDocument,
    HTMLFormElement: FakeHTMLFormElement,
    URL,
    WeakSet,
    Set,
    Map,
    console
  };
  ctx.globalThis = ctx;

  const context = vm.createContext(ctx);
  // Load detector and sites
  const sitesCode = fs.readFileSync(path.join(__dirname, '..', 'shared', 'sites.js'), 'utf8');
  const detectorCode = fs.readFileSync(path.join(__dirname, '..', 'shared', 'detector.js'), 'utf8');
  const shieldCode = fs.readFileSync(path.join(__dirname, '..', 'shared', 'shield-content.js'), 'utf8');

  vm.runInContext(sitesCode, context);
  vm.runInContext(detectorCode, context);
  vm.runInContext(shieldCode, context);

  function triggerSubmit(form) {
    let prevented = false;
    let stopped = false;
    const evt = {
      target: form,
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; },
      stopImmediatePropagation() { stopped = true; }
    };
    const submitHandlers = listeners['submit'] || [];
    for (const h of submitHandlers) {
      h.fn(evt);
    }
    return { prevented, stopped };
  }

  return { ctx, FakeHTMLFormElement, attachedElements, triggerSubmit };
}

test('Content Shield intercepts form submissions targeting a phishing URL (closing POST gap)', () => {
  const { FakeHTMLFormElement, attachedElements, triggerSubmit } = createDOMSandbox('https://legit-blog.com/page');
  const form = new FakeHTMLFormElement('https://paypa1.com/login');

  const { prevented, stopped } = triggerSubmit(form);
  assert.equal(prevented, true, 'Form submission to paypa1.com must be prevented');
  assert.equal(stopped, true, 'Form event propagation must be stopped');
  assert.ok(attachedElements.length >= 1, 'Warning dialog root must be injected');
  assert.equal(attachedElements[0].id, 'antipisher-shield-root');
});

test('Content Shield intercepts any form submission on a phishing site (even with relative action)', () => {
  const { FakeHTMLFormElement, attachedElements, triggerSubmit } = createDOMSandbox('https://paypa1.com/login');
  const form = new FakeHTMLFormElement('/submit-credentials');

  const { prevented, stopped } = triggerSubmit(form);
  assert.equal(prevented, true, 'Form submission on paypa1.com must be prevented');
  assert.equal(stopped, true, 'Propagation must be stopped');
  assert.ok(attachedElements.length >= 1, 'Warning dialog must be rendered');
});

test('Content Shield allows legitimate form submissions without interference', () => {
  const { FakeHTMLFormElement, attachedElements, triggerSubmit } = createDOMSandbox('https://www.paypal.com/signin');
  const form = new FakeHTMLFormElement('https://www.paypal.com/auth');

  const { prevented } = triggerSubmit(form);
  assert.equal(prevented, false, 'Legitimate PayPal submission must not be prevented');
  assert.equal(attachedElements.length, 0, 'No warning dialog should be injected');
});

test('Content Shield does not hard-block forms on warning-level verdicts', () => {
  // action=warn (e.g. path impersonation) must not block regular forms; the
  // navigation interstitial is the user-facing signal for this risk level.
  const { FakeHTMLFormElement, attachedElements, triggerSubmit } = createDOMSandbox('https://evil.test/paypal/login');
  const form = new FakeHTMLFormElement('/search');
  const { prevented } = triggerSubmit(form);
  assert.equal(prevented, false, 'warning-level page must not block unrelated forms');
  assert.equal(attachedElements.length, 0);
});
