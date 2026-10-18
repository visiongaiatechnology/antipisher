/* Lead-unabhängiger Probe-Korpus für Antipisher 0.1 (AUDIT_ONLY, verändert keinen Quellcode). */
'use strict';
require('../..' + '/shared/sites.js');
const d = require('../..' + '/shared/detector.js');

// Erwartung "safe": nachweislich offizielle Websites geschützter Marken (fehlende offizielle Domains in der Liste)
const officialExpectedSafe = [
  'https://www.google.co.jp/',
  'https://www.google.co.kr/',
  'https://www.google.com.mx/',
  'https://www.google.co.za/',
  'https://www.google.com.sg/',
  'https://www.google.co.id/',
  'https://www.amazon.se/',
  'https://www.amazon.nl/',
  'https://www.amazon.pl/',
  'https://www.amazon.sg/',
  'https://www.amazon.ae/',
  'https://www.amazon.com.mx/',
  'https://www.amazon.com.tr/',
  'https://www.apple.com.cn/',
  'https://www.microsoft.co.jp/',
  'https://www.ing.nl/',
  'https://www.ing.be/',
  'https://www.ing.lu/',
  'https://www.chase.co.uk/',
  'https://www.visa.de/',
  'https://www.visa.co.jp/',
  'https://www.visa.co.uk/',
  'https://www.visa.fr/',
  'https://www.hsbc.co.jp/',
  'https://www.santander.com.mx/',
  'https://www.gls.de/' // GLS Bank (gls.de) - Kollision mit GLS Paketdienst in der Liste
];

// Erwartung "block": realistische Phishing-Varianten, die die Heuristik umgehen könnte
const phishingExpectedBlock = [
  // Marke + Baitwort ohne Trennzeichen
  'https://paypalsupport.com/',
  'https://paypalverify.com/',
  'https://paypalaccount.com/',
  'https://paypalcustomerservice.com/',
  'https://paypalhelp.com/',
  'https://paypal-inc.com/',
  'https://paypalsecure.com/',
  'https://netflixbilling.com/',
  'https://netflixsupport.com/',
  'https://amazonsupport.com/',
  'https://microsoftsupport.com/',
  'https://binancelogin.com/',
  'https://coinbasesupport.com/',
  'https://chatgptlogin.com/',
  'https://appleid-apple.com/',
  // Marke+Bait mit Trenner, aber Baitwort nicht in der Wortliste / Marke nicht als ganzes Segment
  'https://paypa1-login.com/',
  'https://secure-paypa1.com/',
  'https://paypa1-secure.com/',
  'https://netfl1x-login.com/',
  'https://g00gle-login.com/',
  'https://faceb00k-login.com/',
  'https://micros0ft-login.com/',
  'https://amaz0n-login.com/',
  'https://app1e-login.com/',
  'https://paypal-logln.com/',
  'https://paypal-l0gin.com/',
  // Homoglyph + Trenner kombiniert
  'https://pаypal-login.com/', // Kyrillisch a
  'https://gοοgle-login.com/', // Griechisch omicron
  'https://facebооk-support.com/', // Kyrillisch o
  // visuelle Ersetzungen, die keine Edit-Distanz 1 sind
  'https://arnazon.com/',
  'https://rnicrosoft.com/',
  'https://paypa1.com-login.com/',
  // Combosquatting ohne Baitwort
  'https://paypal-express.com/',
  'https://paypal-plus.com/',
  'https://amazon-deutschland.com/',
  // Multi-Label-Typosquat
  'https://paypa1-login.co.uk/',
  'https://amazon-login.co.jp/',
  // Markenname als Teil eines längeren Base-Labels
  'https://paypalcom-login.com/',
  'https://paypalcom-verify.com/',
  'https://www-paypal.com/'
];

const knownOfficialFromList = [
  'https://www.google.de/',
  'https://www.amazon.co.jp/',
  'https://www.paypal.com/',
  'https://www.sparkasse.de/',
  'https://www.bund.de/'
];

const knownSpoofCaught = [
  'https://paypa1.com/',
  'https://amzaon.com/',
  'https://g00gle.com/',
  'https://pаypal.com/',
  'https://paypal.com.evil.test/',
  'https://paypal.com@evil.test/',
  'https://paypal.github.io/'
];

function run(list) {
  return list.map(u => {
    const r = d.classify(u);
    return { url: u, status: r.status, reason: r.reason || null, site: r.site || null, official: r.official || null };
  });
}

const fp = run(officialExpectedSafe);
const fn = run(phishingExpectedBlock);
const okOfficial = run(knownOfficialFromList);
const okSpoof = run(knownSpoofCaught);

const fpFailures = fp.filter(x => x.status !== 'safe');
const fnFailures = fn.filter(x => x.status !== 'block');
const officialFailures = okOfficial.filter(x => x.status !== 'safe');
const spoofFailures = okSpoof.filter(x => x.status !== 'block');

const report = {
  generated: new Date().toISOString(),
  corpusVersion: 'lead-probe-1',
  totals: {
    officialExpectedSafe: fp.length,
    officialFalsePositives: fpFailures.length,
    phishingExpectedBlock: fn.length,
    undetectedPhishing: fnFailures.length,
    knownOfficialSanity: officialFailures.length,
    knownSpoofSanity: spoofFailures.length
  },
  officialFalsePositives: fpFailures,
  undetectedPhishing: fnFailures,
  sanityFailures: { official: officialFailures, spoof: spoofFailures },
  all: { officialExpectedSafe: fp, phishingExpectedBlock: fn, okOfficial, okSpoof }
};

require('node:fs').writeFileSync(require('node:path').join(__dirname, 'lead_probe_results.json'), JSON.stringify(report, null, 2));

console.log('=== FALSE POSITIVES auf offiziellen Marken-Domains (erwartet safe, erhalten block) ===');
for (const x of fpFailures) console.log(`  FP  ${x.status.padEnd(5)} ${x.url.padEnd(38)} site=${x.site} reason=${x.reason}`);
console.log(`  -> ${fpFailures.length}/${fp.length} offizielle Domains fälschlich blockiert\n`);

console.log('=== NICHT ERKANNTE PHISHING-VARIANTEN (erwartet block, erhalten safe/skip) ===');
for (const x of fnFailures) console.log(`  FN  ${x.status.padEnd(5)} ${x.url}`);
console.log(`  -> ${fnFailures.length}/${fn.length} Phishing-Varianten nicht erkannt\n`);

console.log('=== SANITY: offizielle gelistete Domains ===');
console.log(officialFailures.length === 0 ? '  OK - alle safe' : JSON.stringify(officialFailures, null, 2));
console.log('=== SANITY: bekannte Spoofs ===');
console.log(spoofFailures.length === 0 ? '  OK - alle block' : JSON.stringify(spoofFailures, null, 2));
