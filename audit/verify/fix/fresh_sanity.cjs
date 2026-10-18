/* Frischer P0-Fix-Sanity-Korpus (nicht aus dem Holdout abgeleitet). */
'use strict';
require('../../../shared/sites.js');
const d = require('../../../shared/detector.js');

const cases = [
  // [erwartung, url, kategorie]
  ['block', 'https://sparkasse-sicherheit.net/', 'bait'],
  ['block', 'https://deutschebank-konto.de/', 'bait'],
  ['block', 'https://commerzbank-tan.de/', 'bait'],
  ['block', 'https://dhl-zollgebuehr.de/', 'bait'],
  ['block', 'https://paypal-gutschein.de/', 'bait'],
  ['block', 'https://amazon-gutschein.de/', 'bait'],
  ['block', 'https://netflix-abo.de/', 'bait'],
  ['block', 'https://spotify-rechnung.de/', 'bait'],
  ['block', 'https://tiktok-coin.com/', 'combosquat'],
  ['block', 'https://binance-kyc.com/', 'combosquat'],
  ['block', 'https://coinbase-kyc.com/', 'combosquat'],
  ['block', 'https://ledger-live.com/', 'combosquat'],
  ['block', 'https://paypal-sperre.de/', 'bait'],
  ['block', 'https://amazon-paketstation.de/', 'bait'],
  ['block', 'https://ing-konto.de/', 'bait'],
  ['block', 'https://klarna-checkout.de/', 'bait'],
  ['block', 'https://paypa1.com/', 'typo'],
  ['block', 'https://g00gle.com/', 'typo'],
  ['block', 'https://amzaon.com/', 'typo'],
  ['block', 'https://microsoft365-login.com/', 'concat'],
  ['block', 'https://amazonprime-login.com/', 'concat'],
  ['block', 'https://paypal-support-center.de/', 'bait'],
  ['block', 'https://dhl-sendungsverfolgung.de/', 'bait'],
  ['block', 'https://bitpanda-login.com/', 'db-gap'],
  ['block', 'https://n26-login.com/', 'bait'],
  ['block', 'https://traderepublic-login.com/', 'bait'],
  ['safe', 'https://www.google.co.nz/', 'official'],
  ['safe', 'https://www.amazon.com.au/', 'official'],
  ['safe', 'https://www.apple.de/', 'official'],
  ['safe', 'https://www.microsoft.co.jp/', 'official'],
  ['safe', 'https://www.ing.nl/', 'official'],
  ['safe', 'https://www.visa.es/', 'official'],
  ['safe', 'https://www.sparkasse.at/', 'official'],
  ['safe', 'https://www.elster.de/', 'official'],
  ['safe', 'https://www.bund.de/', 'official'],
  ['safe', 'https://www.telekom.de/', 'official'],
  ['safe', 'https://www.heise.de/ratgeber/neue-paypal-login-regel-999.html', 'benign-path'],
  ['safe', 'https://www.chip.de/ratgeber/paypal-konto-loeschen_888.html', 'benign-path'],
  ['safe', 'https://de.wikipedia.org/wiki/PayPal', 'benign'],
  ['safe', 'https://www.reddit.com/r/paypal/comments/xyz/login_problem/', 'benign'],
  ['safe', 'https://stackoverflow.com/questions/999/paypal-login-api', 'benign'],
  ['safe', 'https://www.ecosia.org/search?q=paypal.com%20login', 'benign-search'],
  ['safe', 'https://github.com/paypal/paypal-js', 'benign'],
  ['safe', 'https://www.paypal.com/de/webapps/mpp/home', 'official']
];

const results = cases.map(([expected, url, category]) => {
  const r = d.classify(url);
  return { category, url, expected, got: r.status, action: r.action || '', reason: r.reason || '', ok: r.status === expected };
});
const fail = results.filter(r => !r.ok);
console.log(`Fälle: ${results.length} | PASS: ${results.length - fail.length} | FAIL: ${fail.length}`);
for (const f of fail) console.log(`FAIL [${f.category}] erwartet=${f.expected} erhalten=${f.got} ${f.url} (${f.reason}/${f.action})`);
require('node:fs').writeFileSync(require('node:path').join(__dirname, 'fresh_sanity_results.json'),
  JSON.stringify({ generated: new Date().toISOString(), totals: { total: results.length, pass: results.length - fail.length, fail: fail.length }, results }, null, 2));
