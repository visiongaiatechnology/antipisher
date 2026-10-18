/* Lead-Gegenprüfung der Gemini-Remediation v2 (VERIFY). Keine Quellcode-Änderung. */
'use strict';
require('../../../shared/sites.js');
const d = require('../../../shared/detector.js');

const cases = [];
function add(cat, expected, url) { cases.push({ cat, expected, url }); }

add('fp-path', 'safe', 'https://stackoverflow.com/questions/19012345/how-to-fix-paypal-login-error');
add('fp-path', 'safe', 'https://www.reddit.com/r/paypal/comments/abc123/cant_login_to_my_account/');
add('fp-path', 'safe', 'https://en.wikipedia.org/wiki/PayPal_login');
add('fp-path', 'safe', 'https://medium.com/@user/paypal-login-problem-abc123');
add('fp-path', 'safe', 'https://www.heise.de/ratgeber/paypal-login-problem-123.html');
add('fp-path', 'safe', 'https://www.verbraucherzentrale.de/wissen/paypal-login-12345');
add('fp-path', 'safe', 'https://github.com/paypal/paypal-js/issues/123');
add('fp-path', 'safe', 'https://www.paypal.com/signin');
add('fp-path', 'safe', 'https://docs.stripe.com/payments/checkout');
add('fp-path', 'safe', 'https://www.sparkasse.de/service/login-hilfe.html');
add('fp-path', 'safe', 'https://www.test.de/paypal-login-problem-12345/');

add('fn-doc-bypass', 'block', 'https://evil.test/blog/paypal/login');
add('fn-doc-bypass', 'block', 'https://evil.test/docs/paypal/login');
add('fn-doc-bypass', 'block', 'https://evil.test/api/paypal/signin');
add('fn-doc-bypass', 'block', 'https://evil.test/tutorials/paypal/verify');

add('fn-bait', 'block', 'https://paypal-rechnung.com');
add('fn-bait', 'block', 'https://amazon-paket.de');
add('fn-bait', 'block', 'https://sparkasse-kontoauszug.de');
add('fn-bait', 'block', 'https://dhl-sendung.de');
add('fn-bait', 'block', 'https://telekom-rechnung.de');
add('fn-bait', 'block', 'https://paypal-rueckerstattung.com');
add('fn-bait', 'block', 'https://netflix-abo.com');
add('fn-bait', 'block', 'https://microsoft-refund.com');
add('fn-bait', 'block', 'https://binance-verifizierung.com');
add('fn-bait', 'block', 'https://coinbase-auszahlung.com');
add('fn-bait', 'block', 'https://klarna-rechnung.de');
add('fn-bait', 'block', 'https://ing-tan.de');
add('fn-bait', 'block', 'https://sparkasse-ueberweisung.de');
add('fn-bait', 'block', 'https://paypal-zahlung.de');

const official = [
  'https://www.google.com.pe/', 'https://www.google.com.co/', 'https://www.google.com.eg/',
  'https://www.google.com.sa/', 'https://www.google.co.il/', 'https://www.google.com.ua/',
  'https://www.google.ru/', 'https://www.google.kz/', 'https://www.google.com.pk/',
  'https://www.google.com.my/', 'https://www.google.com.vn/', 'https://www.google.co.th/',
  'https://www.google.com.ng/', 'https://www.google.co.ke/', 'https://www.google.com.au/',
  'https://www.amazon.com.be/', 'https://www.amazon.co.za/', 'https://www.amazon.com.eg/',
  'https://www.microsoft.fr/', 'https://www.microsoft.co.uk/', 'https://www.microsoft.com.au/',
  'https://www.apple.co.jp/', 'https://www.apple.co.uk/', 'https://www.apple.com.br/',
  'https://www.visa.com.mx/', 'https://www.visa.com.br/', 'https://www.visa.ca/',
  'https://www.visa.com.au/', 'https://www.ing.fr/', 'https://www.ing.it/',
  'https://www.walmart.com.mx/', 'https://www.walmart.ca/',
  'https://www.hsbc.co.uk/', 'https://www.barclays.co.uk/', 'https://www.santander.co.uk/',
  'https://www.dhl.co.uk/', 'https://www.pinterest.co.uk/', 'https://www.airbnb.co.uk/'
];
for (const u of official) add('fp-official-new', 'safe', u);

add('fp-bidi', 'safe', 'https://example.com/\u200F');
add('fp-bidi', 'safe', 'https://example.com/path?q=%E2%80%8F');
add('fp-bidi', 'safe', 'https://fa.wikipedia.org/wiki/%D8%B5%D9%81%D8%AD%D9%87%D9%94_%D8%A7%D8%B5%D9%84%DB%8C');

add('fp-userinfo', 'safe', 'https://paypal@paypal.com/');
add('fp-userinfo', 'safe', 'https://user:paypal@paypal.com/');
add('fp-userinfo', 'safe', 'https://max.com@example.com/');
add('fp-userinfo', 'safe', 'https://testing.developer@example.com/');
add('fp-userinfo', 'safe', 'https://mixing.delivery@example.com/');
add('tp-userinfo', 'block', 'https://paypal.com@evil.test/');
add('tp-userinfo', 'block', 'https://paypal@evil.test/');

add('multi-tenant', 'safe', 'https://github.io/');
add('multi-tenant', 'safe', 'https://vercel.app/');
add('multi-tenant', 'safe', 'https://netlify.app/');
add('multi-tenant', 'safe', 'https://microsoft.github.io/');
add('multi-tenant', 'safe', 'https://evil.github.io/');
add('multi-tenant', 'block', 'https://paypal.github.io/');
add('multi-tenant', 'block', 'https://paypa1.github.io/');

add('short-brand', 'block', 'https://vlsa.com/');
add('short-brand', 'block', 'https://wlse.com/');
add('short-brand', 'block', 'https://ubr.com/');
add('short-brand', 'block', 'https://hp-login.com/');
add('two-edit', 'block', 'https://arnazon.com/');
add('two-edit', 'block', 'https://rnicrosoft.com/');
add('bitsquat', 'block', 'https://amaxon.com/');
add('bitsquat', 'block', 'https://microsmft.com/');
add('bitsquat', 'block', 'https://gongle.com/');

add('idn-diacritic', 'block', 'https://paypäl.com/');
add('idn-diacritic', 'block', 'https://päypal.com/');
add('idn-diacritic', 'block', 'https://applè.com/');
add('idn-diacritic', 'block', 'https://mïcrosoft.com/');
add('idn-diacritic', 'block', 'https://amazön.com/');
add('idn-diacritic', 'block', 'https://páypal.com/');

add('regression', 'block', 'https://paypa1.com/');
add('regression', 'block', 'https://amzaon.com/');
add('regression', 'block', 'https://p\u0430ypal.com/');
add('regression', 'block', 'https://paypal.com.evil.test/');
add('regression', 'safe', 'https://www.google.de/');
add('regression', 'safe', 'https://www.paypal.com/');
add('regression', 'safe', 'https://github.com/');
add('regression', 'safe', 'https://www.amazon.co.jp/');

const results = cases.map(c => {
  const r = d.classify(c.url);
  const got = r.status === 'skip' ? 'skip' : r.status;
  return { ...c, got, reason: r.reason || '', action: r.action || '', site: r.site || '', ok: got === c.expected };
});
const byCat = {};
for (const r of results) {
  byCat[r.cat] = byCat[r.cat] || { total: 0, pass: 0 };
  byCat[r.cat].total++;
  if (r.ok) byCat[r.cat].pass++;
}
const fail = results.filter(r => !r.ok);
console.log('Fälle:', results.length, '| PASS:', results.length - fail.length, '| FAIL:', fail.length);
for (const [cat, v] of Object.entries(byCat)) console.log(`  ${cat.padEnd(20)} ${v.pass}/${v.total}`);
console.log('\n--- FEHLER ---');
for (const f of fail) console.log(`${f.cat.padEnd(18)} erwartet=${f.expected.padEnd(5)} erhalten=${f.got.padEnd(5)} ${f.url}${f.reason ? '  [' + f.reason + '/' + f.action + ']' : ''}`);
require('node:fs').writeFileSync(require('node:path').join(__dirname, 'lead_verify_results.json'), JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
