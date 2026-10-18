const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Ensure VGT_SITES is loaded before detector
const sitesCode = fs.readFileSync(path.join(__dirname, '../shared/sites.js'), 'utf8');
eval(sitesCode);

const detector = require('../shared/detector.js');

test('Whitelist: setWhitelist and isWhitelisted functionality', () => {
  detector.setWhitelist(['custom-corp.internal', 'partner-portal.de']);
  
  assert.equal(detector.isWhitelisted('custom-corp.internal'), true);
  assert.equal(detector.isWhitelisted('sub.custom-corp.internal'), true);
  assert.equal(detector.isWhitelisted('deep.nested.sub.custom-corp.internal'), true);
  assert.equal(detector.isWhitelisted('partner-portal.de'), true);
  assert.equal(detector.isWhitelisted('other-domain.com'), false);

  const list = detector.getWhitelist();
  assert.deepEqual(list.sort(), ['custom-corp.internal', 'partner-portal.de'].sort());

  // Reset whitelist
  detector.setWhitelist([]);
  assert.equal(detector.isWhitelisted('custom-corp.internal'), false);
  assert.equal(detector.getWhitelist().length, 0);
});

test('Whitelist: classify bypasses detection for whitelisted domains and subdomains', () => {
  // A domain that looks like a brand typosquat or lookalike:
  // e.g. "paypa1-internal.net" or "custom-paypal-gateway.corp"
  const testUrl = 'https://paypa1.corp/login';
  
  // Without whitelist, paypa1.corp would trigger detection
  const beforeVerdict = detector.classify(testUrl);
  assert.equal(beforeVerdict.status, 'block');

  // Now whitelist paypa1.corp
  detector.setWhitelist(['paypa1.corp']);
  const afterVerdict = detector.classify(testUrl);
  assert.equal(afterVerdict.status, 'safe');
  assert.equal(afterVerdict.host, 'paypa1.corp');

  // Subdomain check
  const subVerdict = detector.classify('https://auth.sub.paypa1.corp/login');
  assert.equal(subVerdict.status, 'safe');

  // Reset
  detector.setWhitelist([]);
});

test('Whitelist: per-call options override in classify()', () => {
  const testUrl = 'https://paypa1.corp/login';
  
  // Pass whitelist directly in options parameter
  const verdictWithOptions = detector.classify(testUrl, ['paypa1.corp']);
  assert.equal(verdictWithOptions.status, 'safe');

  const verdictWithOptionsObj = detector.classify(testUrl, { whitelist: ['paypa1.corp'] });
  assert.equal(verdictWithOptionsObj.status, 'safe');

  // Without passing options, should block
  const regularVerdict = detector.classify(testUrl);
  assert.equal(regularVerdict.status, 'block');
});

test('Manifest: Chrome and Firefox register options_ui correctly', () => {
  const chromeManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../chrome/manifest.json'), 'utf8'));
  const firefoxManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../firefox/manifest.json'), 'utf8'));

  assert.ok(chromeManifest.options_ui, 'Chrome manifest must have options_ui');
  assert.equal(chromeManifest.options_ui.page, 'options.html');
  assert.equal(chromeManifest.options_ui.open_in_tab, true);

  assert.ok(firefoxManifest.options_ui, 'Firefox manifest must have options_ui');
  assert.equal(firefoxManifest.options_ui.page, 'options.html');
  assert.equal(firefoxManifest.options_ui.open_in_tab, true);

  // P0 Invariant check: web_accessible_resources must only contain guard.html
  const chromeWar = chromeManifest.web_accessible_resources[0].resources;
  assert.deepEqual(chromeWar, ['guard.html'], 'Chrome WAR must only expose guard.html');

  const firefoxWar = firefoxManifest.web_accessible_resources[0].resources;
  assert.deepEqual(firefoxWar, ['guard.html'], 'Firefox WAR must only expose guard.html');
});

test('Popup: Header contains options button and wires to runtime.openOptionsPage', () => {
  const popupHtml = fs.readFileSync(path.join(__dirname, '../shared/popup.html'), 'utf8');
  const popupJs = fs.readFileSync(path.join(__dirname, '../shared/popup.js'), 'utf8');
  const popupCss = fs.readFileSync(path.join(__dirname, '../shared/popup.css'), 'utf8');

  assert.ok(popupHtml.includes('id="btnOpenOptions"'), 'popup.html must have #btnOpenOptions');
  assert.ok(popupHtml.includes('class="header-actions"'), 'popup.html must have .header-actions');

  assert.ok(popupJs.includes('btnOpenOptions'), 'popup.js must reference btnOpenOptions');
  assert.ok(popupJs.includes('openOptionsPage'), 'popup.js must call openOptionsPage');

  assert.ok(popupCss.includes('.header-actions'), 'popup.css must style .header-actions');
  assert.ok(popupCss.includes('.btn-icon'), 'popup.css must style .btn-icon');
});

test('Options page: HTML, CSS, and JS structure is complete and valid', () => {
  const optionsHtml = fs.readFileSync(path.join(__dirname, '../shared/options.html'), 'utf8');
  const optionsCss = fs.readFileSync(path.join(__dirname, '../shared/options.css'), 'utf8');
  const optionsJs = fs.readFileSync(path.join(__dirname, '../shared/options.js'), 'utf8');

  // Verify tabs
  assert.ok(optionsHtml.includes('id="tabGeneral"'));
  assert.ok(optionsHtml.includes('id="tabTrackers"'));
  assert.ok(optionsHtml.includes('id="tabGeDefense"'));
  assert.ok(optionsHtml.includes('id="tabFingerprinting"'));
  assert.ok(optionsHtml.includes('id="tabWhitelist"'));
  assert.ok(optionsHtml.includes('id="tabData"'));

  // Verify switches
  assert.ok(optionsHtml.includes('id="chkStrictMode"'));
  assert.ok(optionsHtml.includes('id="chkFormShield"'));
  assert.ok(optionsHtml.includes('id="chkSafeToast"'));
  assert.ok(optionsHtml.includes('id="selToastDuration"'));
  assert.ok(optionsHtml.includes('id="chkTrackerShield"'));
  assert.ok(optionsHtml.includes('id="chkUrlStrip"'));
  assert.ok(optionsHtml.includes('id="chkBeacon"'));
  assert.ok(optionsHtml.includes('id="chkBadge"'));
  assert.ok(optionsHtml.includes('id="chkGeDefense"'));
  assert.ok(optionsHtml.includes('id="chkSelfXss"'));
  assert.ok(optionsHtml.includes('id="chkProtocol"'));
  assert.ok(optionsHtml.includes('id="chkAegis"'));
  assert.ok(optionsHtml.includes('id="chkCanvas"'));
  assert.ok(optionsHtml.includes('id="chkWebGL"'));
  assert.ok(optionsHtml.includes('id="chkAudio"'));
  assert.ok(optionsHtml.includes('id="btnAddWhitelist"'));
  assert.ok(optionsHtml.includes('id="btnResetStats"'));
  assert.ok(optionsHtml.includes('id="btnExportConfig"'));
  assert.ok(optionsHtml.includes('id="btnResetDefaults"'));

  // Verify JS logic elements
  assert.ok(optionsJs.includes('strictMode'));
  assert.ok(optionsJs.includes('customWhitelist'));
  assert.ok(optionsJs.includes('geDefenseLight'));
  assert.ok(optionsJs.includes('aegisProtection'));
  assert.ok(optionsJs.includes('showBadgeCount'));
  assert.ok(optionsJs.includes('exportConfig'));
  assert.ok(optionsJs.includes('handleImportFile'));
  assert.ok(optionsJs.includes('showSavedToast'));

  // Verify CSS Glass 2100 properties
  assert.ok(optionsCss.includes('backdrop-filter'));
  assert.ok(optionsCss.includes('options-shell'));
});
