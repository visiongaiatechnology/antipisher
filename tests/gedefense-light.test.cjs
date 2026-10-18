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
    addEventListener: () => {},
    dispatchEvent: () => {}
  };

  const fakeWindow = {
    location: { hostname: 'example.com', href: 'https://example.com/', search: '' },
    navigator: { userAgent: 'Mozilla/5.0' },
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
    Math,
    Object,
    String,
    Uint8ClampedArray
  };
  ctx.globalThis = ctx;

  const context = vm.createContext(ctx);
  const engineSource = fs.readFileSync(path.join(__dirname, '../shared/aegis-engine.js'), 'utf-8');
  vm.runInContext(engineSource, context);

  return { context, logs, FakeElement };
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
