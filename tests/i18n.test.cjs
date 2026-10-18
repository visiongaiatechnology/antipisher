const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const i18n = require('../shared/i18n.js');
require('../shared/sites.js');
const detector = require('../shared/detector.js');

test('i18n: All 4 mandatory languages (en, de, ru, zh) are supported with 100% key parity', () => {
  const supported = ['en', 'de', 'ru', 'zh'];
  assert.deepEqual(i18n.SUPPORTED_LANGS, supported);

  const baseKeys = Object.keys(i18n.dictionary.en).filter(k => k !== 'reasons');
  const baseReasons = Object.keys(i18n.dictionary.en.reasons);

  for (const lang of supported) {
    const pack = i18n.dictionary[lang];
    assert.ok(pack, `Language pack for ${lang} must exist`);

    for (const k of baseKeys) {
      assert.ok(typeof pack[k] === 'string' && pack[k].length > 0, `Key "${k}" missing or empty in ${lang}`);
    }

    assert.ok(pack.reasons, `Reasons dictionary missing in ${lang}`);
    for (const rk of baseReasons) {
      assert.ok(typeof pack.reasons[rk] === 'string' && pack.reasons[rk].length > 0, `Reason "${rk}" missing or empty in ${lang}`);
    }
  }
});

test('i18n: Language normalization correctly maps browser locale prefixes', () => {
  assert.equal(i18n.normalizeLang('de-DE'), 'de');
  assert.equal(i18n.normalizeLang('de-AT'), 'de');
  assert.equal(i18n.normalizeLang('de-CH'), 'de');
  assert.equal(i18n.normalizeLang('ru-RU'), 'ru');
  assert.equal(i18n.normalizeLang('ru-BY'), 'ru');
  assert.equal(i18n.normalizeLang('zh-CN'), 'zh');
  assert.equal(i18n.normalizeLang('zh-TW'), 'zh');
  assert.equal(i18n.normalizeLang('zh-HK'), 'zh');
  assert.equal(i18n.normalizeLang('en-US'), 'en');
  assert.equal(i18n.normalizeLang('en-GB'), 'en');
  // Fallbacks
  assert.equal(i18n.normalizeLang('fr-FR'), 'en');
  assert.equal(i18n.normalizeLang('ja-JP'), 'en');
  assert.equal(i18n.normalizeLang(''), 'en');
  assert.equal(i18n.normalizeLang(null), 'en');
});

test('i18n: Parameter interpolation works across languages', () => {
  const deStr = i18n.t('resSuspicious', 'de', { site: 'PayPal', official: 'paypal.com' });
  assert.match(deStr, /PayPal/);
  assert.match(deStr, /paypal\.com/);
  assert.match(deStr, /Verdächtig/);

  const enStr = i18n.t('resSuspicious', 'en', { site: 'PayPal', official: 'paypal.com' });
  assert.match(enStr, /Suspicious/);
  assert.match(enStr, /PayPal/);

  const ruStr = i18n.t('resSuspicious', 'ru', { site: 'PayPal', official: 'paypal.com' });
  assert.match(ruStr, /Подозрительно/);

  const zhStr = i18n.t('resSuspicious', 'zh', { site: 'PayPal', official: 'paypal.com' });
  assert.match(zhStr, /可疑/);
});

test('i18n: WebExtension _locales directories are valid and present for all 4 languages', () => {
  const root = path.join(__dirname, '..');
  const locales = ['en', 'de', 'ru', 'zh_CN'];
  for (const loc of locales) {
    const p = path.join(root, '_locales', loc, 'messages.json');
    assert.ok(fs.existsSync(p), `_locales/${loc}/messages.json must exist`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(data.appName && data.appName.message === 'Antipisher');
    assert.ok(data.appDesc && typeof data.appDesc.message === 'string');
  }
});

test('i18n: Detector engine outputs rich multilingual explanations', () => {
  const res = detector.classify('https://paypa1.com');
  assert.equal(res.status, 'block');
  const r0 = res.reasons[0];
  assert.ok(r0.explanation_de && r0.explanation_de.length > 10, 'DE explanation present');
  assert.ok(r0.explanation_en && r0.explanation_en.length > 10, 'EN explanation present');
  assert.ok(r0.explanation_ru && r0.explanation_ru.length > 10, 'RU explanation present');
  assert.ok(r0.explanation_zh && r0.explanation_zh.length > 10, 'ZH explanation present');
});
