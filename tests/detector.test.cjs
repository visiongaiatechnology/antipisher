const test = require('node:test');
const assert = require('node:assert/strict');
require('../shared/sites.js');
const d = require('../shared/detector.js');

const host = (u) => d.classify(u).status;

test('Curated brands each have official domains and valid official subdomains', () => {
  assert.ok(globalThis.VGT_SITES.length >= 100, `Expected >= 100, got ${globalThis.VGT_SITES.length}`);
  for (const entry of globalThis.VGT_SITES) {
    assert.ok(entry.domains.length > 0, entry.name);
    for (const domain of entry.domains) {
      assert.equal(host('https://' + domain + '/signin'), 'safe', domain);
      assert.equal(host('https://accounts.' + domain + '/'), 'safe', 'accounts.' + domain);
    }
  }
});

test('typographic & punycode spoofing is blocked', () => {
  for (const u of [
    'https://pаypal.com', // Cyrillic a
    'https://xn--pypal-4ve.com',
    'https://аmazon.com',
    'https://gοogle.com', // Greek omicron
    'https://g00gle.com',
    'https://micr0soft.com'
  ]) {
    assert.equal(host(u), 'block', u);
  }
});

test('Damerau-Levenshtein catches adjacent transpositions (amzaon, goolge, paypla)', () => {
  for (const u of [
    'https://amzaon.com',
    'https://goolge.com',
    'https://paypla.com',
    'https://yuotube.com',
    'https://netlfix.com'
  ]) {
    const res = d.classify(u);
    assert.equal(res.status, 'block', u);
    assert.equal(res.reason, 'typosquat', u);
  }
});

test('ASCII typo, brand deceptive subdomains, and bait terms are blocked', () => {
  for (const u of [
    'https://paypa1.com',
    'https://amaz0n.com',
    'https://google.com.login-billing.evil.test',
    'https://paypal.com.evil.test',
    'https://mail.ru.evil.test',
    'https://paypal-security.example.test',
    'https://secure-paypal.example.test',
    'https://microsft.com',
    'https://www.revoluт.com', // Cyrillic te
    'https://paypal.com@evil.test/'
  ]) {
    assert.equal(host(u), 'block', u);
  }
});

test('Subdomain spoofing on third-party domains is blocked for short/financial brands', () => {
  for (const u of [
    'https://apple.attacker.com',
    'https://chase.attacker.com',
    'https://steam.attacker.com',
    'https://paypal.attacker.com',
    'https://binance.attacker.com'
  ]) {
    const res = d.classify(u);
    assert.equal(res.status, 'block', u);
    assert.equal(res.reason, 'foreign-domain', u);
  }
});

test('Multi-tenant platform separation isolates tenant namespaces', () => {
  // Official documentation explicitly in brand domain list passes
  assert.equal(host('https://microsoft.github.io'), 'safe');
  assert.equal(host('https://google.github.io'), 'safe');

  // Deceptive unauthorized brand tenants on public suffixes are blocked
  const res1 = d.classify('https://paypal.github.io');
  assert.equal(res1.status, 'block');
  assert.equal(res1.site, 'PayPal');

  const res2 = d.classify('https://paypa1.github.io');
  assert.equal(res2.status, 'block');
  assert.equal(res2.site, 'PayPal');

  const res3 = d.classify('https://chase-login.pages.dev');
  assert.equal(res3.status, 'block');
  assert.equal(res3.site, 'Chase');
});

test('common benign and international domains stay unblocked', () => {
  for (const u of [
    'https://www.xn--bcher-kva.de',
    'https://www.über.de',
    'https://paypaⅼ.com', // IDNA maps this to the REAL paypal.com
    'https://docs.mozilla.org',
    'https://mail.google.com',
    'https://mail.proton.me',
    'https://office.example.com',
    'https://line.example.com',
    'https://example.com',
    'https://PAYPAL.COM',
    'https://www.paypal.com.',
    'https://google.de',
    'https://www.amazon.co.jp',
    'https://paypal-guides.example.test',
    'https://oldpaypalarchives.example.test',
    'https://visualstudio.com'
  ]) {
    assert.equal(host(u), 'safe', u);
  }
});

test('unsupported navigations are skipped', () => {
  for (const u of ['file:///tmp/foo.html', 'chrome://extensions/', 'not a url', 'about:blank']) {
    assert.equal(host(u), 'skip', u);
  }
});

test('confusable module is deterministic', () => {
  assert.equal(d.punycodeDecode('xn--pypal-4ve'), 'pаypal');
  assert.equal(d.skeleton('pаypal'), 'paypal');
  assert.ok(d.damerauDistanceOne('amzaon', 'amazon'));
  assert.ok(d.damerauDistanceOne('paypla', 'paypal'));
});

test('Antipisher engine export and backward compatibility alias are verified', () => {
  assert.ok(globalThis.Antipisher);
  assert.equal(typeof globalThis.Antipisher.classify, 'function');
  assert.equal(globalThis.Antipisher, globalThis.VGT_DomainGuard);
  assert.equal(globalThis.Antipisher.classify('https://paypa1.com').status, 'block');
});
