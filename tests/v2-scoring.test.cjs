const test = require('node:test');
const assert = require('node:assert/strict');
require('../shared/sites.js');
const d = require('../shared/detector.js');

test('V2 Bitsquatting catches 1-bit ASCII memory/transmission flips', () => {
  // 'z' (122 = 0b01111010) vs 'x' (120 = 0b01111000) -> diff 2 (1 bit flip)
  const resAmazon = d.classify('https://amaxon.com');
  assert.equal(resAmazon.status, 'block');
  assert.equal(resAmazon.reason, 'bitsquat');
  assert.equal(resAmazon.site, 'Amazon');
  assert.ok(resAmazon.score >= 80);

  // 'o' (111 = 0b01101111) vs 'm' (109 = 0b01101101) -> diff 2 (1 bit flip)
  const resMs = d.classify('https://microsmft.com');
  assert.equal(resMs.status, 'block');
  assert.equal(resMs.reason, 'bitsquat');
  assert.equal(resMs.site, 'Microsoft');

  // 'o' (111 = 0b01101111) vs 'n' (110 = 0b01101110) -> diff 1 (1 bit flip)
  const resGoogle = d.classify('https://gongle.com');
  assert.equal(resGoogle.status, 'block');
  assert.equal(resGoogle.reason, 'bitsquat');
  assert.equal(resGoogle.site, 'Google');
});

test('V2 Layer 3 Path Phishing detects brand directory & bait on foreign hosts', () => {
  // Brand directory + sensitive action on arbitrary foreign domain
  const res1 = d.classify('https://unrelated-domain.com/paypal/login');
  assert.equal(res1.status, 'block');
  assert.equal(res1.action, 'warn');
  assert.equal(res1.reason, 'path-impersonation');
  assert.equal(res1.site, 'PayPal');
  assert.ok(res1.reasons[0].explanation_de.includes('imitiert'));

  const res2 = d.classify('https://compromised-server.net/chase/signin');
  assert.equal(res2.status, 'block');
  assert.equal(res2.action, 'warn');
  assert.equal(res2.reason, 'path-impersonation');
  assert.equal(res2.site, 'Chase');

  const res3 = d.classify('https://phish-host.org/paypal.com/verify');
  assert.equal(res3.status, 'block');
  assert.equal(res3.action, 'warn');
  assert.equal(res3.reason, 'path-impersonation');

  // Legitimate developer / documentation / blog articles are NOT falsely flagged
  assert.equal(d.classify('https://techblog.com/docs/paypal-integration-guide').status, 'safe');
  assert.equal(d.classify('https://devnews.org/articles/apple-announces-m4').status, 'safe');
  assert.equal(d.classify('https://example.com/guide/amazon-aws-tutorial').status, 'safe');
});

test('V2 Bidi Control Character override spoofing is blocked', () => {
  // Right-to-Left Override (\u202E)
  const bidiUrl = 'https://example.com/\u202Egpj.exe';
  const res = d.classify(bidiUrl);
  assert.equal(res.status, 'block');
  assert.equal(res.reason, 'bidi-override');
  assert.equal(res.score, 100);
  assert.equal(res.confidence, 'high');
});

test('V2 Verdict object returns rich, structured, explainable scoring', () => {
  // 1. Blocked host
  const blockRes = d.classify('https://paypa1.com');
  assert.equal(blockRes.status, 'block');
  assert.equal(blockRes.action, 'block');
  assert.equal(typeof blockRes.score, 'number');
  assert.ok(blockRes.score >= 80 && blockRes.score <= 100);
  assert.equal(blockRes.confidence, 'high');
  assert.equal(blockRes.host, 'paypa1.com');
  assert.equal(blockRes.site, 'PayPal');
  assert.equal(blockRes.official, 'paypal.com');
  assert.ok(Array.isArray(blockRes.reasons));
  assert.equal(blockRes.reasons.length, 1);
  assert.equal(blockRes.reasons[0].code, 'brand-variant'); // paypa1 (1 -> l) is a leetspeak brand variant
  assert.ok(blockRes.reasons[0].detail);
  assert.ok(blockRes.reasons[0].explanation_de);

  // Bait domain has credential-bait reason
  const baitRes = d.classify('https://paypal-login.com');
  assert.equal(baitRes.status, 'block');
  assert.equal(baitRes.reasons[0].code, 'credential-bait');

  // 2. Safe host
  const safeRes = d.classify('https://google.com');
  assert.equal(safeRes.status, 'safe');
  assert.equal(safeRes.action, 'allow');
  assert.equal(safeRes.score, 0);
  assert.equal(safeRes.confidence, 'high');
  assert.deepEqual(safeRes.reasons, []);

  // 3. Skip URL
  const skipRes = d.classify('chrome://settings');
  assert.equal(skipRes.status, 'skip');
  assert.equal(skipRes.action, 'skip');
  assert.equal(skipRes.score, 0);
  assert.deepEqual(skipRes.reasons, []);
});
