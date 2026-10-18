const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../shared/sites.js');
const d = require('../shared/detector.js');
const root = path.join(__dirname, '..');
const status = (u) => d.classify(u).status;
const verdict = (u) => d.classify(u);

test('P0: force.com / shared-hosting whitelist gap is closed', () => {
  for (const u of [
    'https://paypal.force.com/',
    'https://paypal.force.com/login',
    'https://evil.force.com/paypal/login'
  ]) {
    assert.equal(status(u), 'block', u);
  }
  // Platform roots stay safe; tenant URLs are the risk.
  for (const u of ['https://force.com/', 'https://github.io/', 'https://vercel.app/', 'https://netlify.app/', 'https://wordpress.com/']) {
    assert.equal(status(u), 'safe', u);
  }
});

test('P0: public-suffix roots are not listed as exclusive official domains', () => {
  const shared = new Set([
    'github.io', 'gitlab.io', 'pages.dev', 'vercel.app', 'webflow.io', 'netlify.app',
    'firebaseapp.com', 'blogspot.com', 'wordpress.com', 'myshopify.com',
    'azurewebsites.net', 'cloudfront.net', 's3.amazonaws.com', 'force.com',
    'my.salesforce.com', 'my.site.com', 'notion.site'
  ]);
  for (const site of globalThis.VGT_SITES) {
    for (const domain of site.domains) {
      assert.ok(!shared.has(domain), `${site.name} must not list shared-host root ${domain}`);
    }
  }
});

test('P0: unknown official ccTLD handling (global brands trusted, others warn, gTLD block)', () => {
  // Global brands with >=3 documented ccTLDs are treated as official (google.com.pe).
  assert.equal(status('https://google.com.pe/'), 'safe');
  // Brand with few ccTLDs stays a warning (user may continue).
  const cc = verdict('https://paypal.de/');
  assert.equal(cc.status, 'block');
  assert.equal(cc.action, 'warn');
  // Generic TLD phishing stays a hard block.
  const g = verdict('https://paypal.xyz/');
  assert.equal(g.status, 'block');
  assert.equal(g.action, 'block');
});

test('P0: path rule stops article/search false positives and /blog evasion', () => {
  for (const u of [
    'https://www.heise.de/ratgeber/paypal-login-problem-123.html',
    'https://www.verbraucherzentrale.de/wissen/paypal-login-12345',
    'https://duckduckgo.com/?q=paypal.com+login',
    'https://github.com/paypal/paypal-js/issues/123'
  ]) {
    assert.equal(status(u), 'safe', u);
  }
  for (const u of [
    'https://evil.test/paypal/login',
    'https://evil.test/blog/paypal/login',
    'https://evil.test/docs/paypal/verify',
    'https://phish-host.org/paypal.com/verify'
  ]) {
    const r = verdict(u);
    assert.equal(r.status, 'block', u);
    assert.equal(r.action, 'warn', u);
    assert.equal(r.reason, 'path-impersonation', u);
  }
});

test('P0: diacritic homographs are detected generically without blocking "über"', () => {
  for (const u of ['https://paypäl.com/', 'https://päypal.com/', 'https://mïcrosoft.com/', 'https://amazön.com/']) {
    assert.equal(status(u), 'block', u);
  }
  assert.equal(status('https://www.über.de/'), 'safe');
});

test('P0: German/EU bait and multiword-brand concatenations are covered', () => {
  for (const u of [
    'https://paypal-rechnung.com/',
    'https://dhl-sendung.de/',
    'https://sparkasse-kontoauszug.de/',
    'https://paypal-kundenservice.de/',
    'https://microsoft365-login.com/',
    'https://amazonprime-login.com/',
    'https://appleid-login.com/'
  ]) {
    assert.equal(status(u), 'block', u);
  }
  // Minimal pair: no bait word => no block.
  assert.equal(status('https://paypal-gmbh.de/'), 'safe');
});

test('P0: manifests keep WAR minimal and register the content shield', () => {
  for (const browser of ['chrome', 'firefox']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, browser, 'manifest.json'), 'utf8'));
    assert.equal(manifest.version, '0.2.0', browser);
    const warResources = manifest.web_accessible_resources.flatMap(entry => entry.resources);
    assert.deepEqual(warResources, ['guard.html'], `${browser}: WAR must only expose guard.html`);
    const js = manifest.content_scripts[0].js.join(',');
    assert.match(js, /shared\/shield-content\.js/, browser);
    assert.equal(manifest.content_scripts[0].all_frames, false, browser);
  }
});

test('P0: UI/a11y fixes are present in shipped files', () => {
  const tokens = fs.readFileSync(path.join(root, 'shared', 'design-tokens.css'), 'utf8');
  const popupCss = fs.readFileSync(path.join(root, 'shared', 'popup.css'), 'utf8');
  const guardCss = fs.readFileSync(path.join(root, 'shared', 'guard.css'), 'utf8');
  const popup = fs.readFileSync(path.join(root, 'shared', 'popup.html'), 'utf8');
  const guardJs = fs.readFileSync(path.join(root, 'shared', 'guard.js'), 'utf8');
  assert.match(tokens, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(tokens, /--vgt-accent:/);
  assert.match(tokens, /forced-colors/);
  assert.match(popupCss, /input\[type="text"\]:focus-visible/);
  assert.match(popup, /design-tokens\.css/);
  assert.match(popup, /VisionGaiaTechnology/);
  assert.match(guardJs, /action === 'warn'/);
  assert.match(guardJs, /PRÜFUNG EINGESCHRÄNKT/);
});

test('P0: shield escapes explanations and does not hard-block warnings', () => {
  const shield = fs.readFileSync(path.join(root, 'shared', 'shield-content.js'), 'utf8');
  assert.match(shield, /escapeHtml\(explanation\)/);
  assert.ok(!shield.includes('${explanation}'));
  assert.match(shield, /verdict\.action !== 'warn'/);
  assert.match(shield, /formAction/);
  assert.match(shield, /isHardBlock/);
});
