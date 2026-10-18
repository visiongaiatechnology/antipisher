#!/usr/bin/env node
/* Audit probe 02 — Detektor-Korpus (nichtdestruktiv, offline).
 * Misst Erkennungsrate (False Negatives) auf synthetischem Angriffskorpus mit
 * reservierten Testdomains sowie False-Positive-Klassen auf benignem Korpus.
 * Exit 0 = Messung vollständig ausgeführt (Ergebnis selbst ist Beobachtung).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'detector_corpus.json');
require(path.join(ROOT, 'shared', 'sites.js'));
const engine = require(path.join(ROOT, 'shared', 'detector.js'));
const SITES = globalThis.VGT_SITES;

let punycode = null;
try { punycode = require('node:punycode'); } catch { punycode = null; }

function hostOf(url) { try { return new URL(url).hostname; } catch { return '<invalid>'; } }
function toPunycodeLabel(unicodeLabel) {
  try {
    const u = new URL('https://' + unicodeLabel + '.com/');
    const h = u.hostname;
    if (h.startsWith('xn--')) return h.replace(/\.com$/, '');
  } catch { /* fallthrough */ }
  if (punycode) { try { return punycode.toASCII(unicodeLabel); } catch { /* noop */ } }
  return null;
}
function cls(url) { try { return engine.classify(url); } catch (e) { return { status: 'THROW', error: String(e && e.message || e) }; } }
function isValidHttpUrl(url) { try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }

/* ---------------- Angriffskorpus ---------------- */
const attacks = [];
function addAttack(classId, url, note) { attacks.push({ id: classId + '-' + (attacks.length + 1), class: classId, url, note }); }

const typoTransposition = ['https://amzaon.com/', 'https://goolge.com/', 'https://paypla.com/', 'https://netlfix.com/', 'https://yuotube.com/'];
for (const u of typoTransposition) addAttack('typosquat-transposition', u, 'benachbarte Buchstabendreher');

const typoSubstitution = ['https://paypa1.com/', 'https://amaz0n.com/', 'https://g00gle.com/', 'https://micr0soft.com/', 'https://microsft.com/'];
for (const u of typoSubstitution) addAttack('typosquat-substitution', u, 'Leetspeak/Löschung');

const unicodeHomographs = [
  'https://pаypal.com/',      // Cyrillic a
  'https://gοοgle.com/',      // Greek omicron
  'https://аmazon.com/',      // Cyrillic a
  'https://аррӏе.com/',       // Cyrillic homographs
  'https://micrоsoft.com/',   // Cyrillic o
  'https://www.revoluт.com/'  // Cyrillic te
];
for (const u of unicodeHomographs) addAttack('unicode-homograph', u, 'Unicode-Confusable (UTF-8-URL)');

// punycode-codierte Variante derselben Homographen (Browser-kanonische Form)
for (const u of unicodeHomographs) {
  let puny = null;
  try { puny = new URL(u).hostname; } catch { puny = null; }
  if (puny && puny.startsWith('xn--')) addAttack('punycode-homograph', 'https://' + puny + '/', 'IDNA-kanonische Punycode-Form');
}

// Unsichtbare Zeichen: Browser/WHATWG-URL-Parser normalisiert U+00AD/U+200B im Host
// auf ASCII oder verwirft die URL. Punycode-Formen solcher Labels sind laut URL-Parser
// ungültig ("Invalid URL"), d.h. nicht navigierbar -> keine realistische Angriffs-URL.
// Wir dokumentieren das Verhalten separat, statt es als Detection-Lücke zu zählen.
const invisibleProbe = [];
for (const [label, note] of [['pay\u00ADpal', 'U+00AD Soft Hyphen'], ['pay\u200Bpal', 'U+200B Zero-Width Space'], ['g\u200Doogle', 'U+200D ZWJ']]) {
  const unicodeUrl = 'https://' + label + '.com/';
  let parsedHost = null, parseError = null;
  try { parsedHost = new URL(unicodeUrl).hostname; } catch (e) { parseError = e.message; }
  let punyAscii = null;
  if (punycode) { try { punyAscii = punycode.toASCII(label); } catch { /* noop */ } }
  let punyUrlState = null;
  if (punyAscii && punyAscii.startsWith('xn--')) {
    const punyUrl = 'https://' + punyAscii + '.com/';
    try { new URL(punyUrl); punyUrlState = 'valid'; } catch (e) { punyUrlState = 'invalid-url: ' + e.message; }
  }
  invisibleProbe.push({ label, note, unicode_url: unicodeUrl, parsed_host: parsedHost, parse_error: parseError, punycode_label: punyAscii, punycode_url_state: punyUrlState, classify_unicode: engine.classify(unicodeUrl).status });
}

const userinfo = [
  'https://paypal.com@evil.test/',
  'https://paypal.com:443@evil.test/',
  'https://paypal@evil.test/'
];
for (const u of userinfo) addAttack('userinfo-deception', u, 'RFC-3986-Userinfo-Täuschung');

const deceptiveSubdomains = [
  'https://apple.attacker.test/',
  'https://paypal.attacker.test/',
  'https://chase.attacker.test/',
  'https://mail.ru.evil.test/',
  'https://google.com.login-billing.evil.test/',
  'https://paypal.com.evil.test/'
];
for (const u of deceptiveSubdomains) addAttack('deceptive-subdomain', u, 'Marke als Subdomain/Fremddomain');

const multiTenant = [
  'https://paypal.github.io/',
  'https://paypa1.github.io/',
  'https://chase-login.pages.dev/'
];
for (const u of multiTenant) addAttack('multi-tenant-abuse', u, 'Marke auf Public-Suffix-Hosting');

const credentialBait = [
  'https://paypal-security.example.test/login',
  'https://secure-paypal.example.test/',
  'https://microsoft-login.example.test/',
  'https://paypal-login.com/'
];
for (const u of credentialBait) addAttack('credential-bait', u, 'Marke plus Bait-Wort');

/* Verdünnte/abweichende Kombinationen — erwartete Lücken (werden gemessen) */
const dilution = [
  'https://paypa1-login.com/',
  'https://paypal-me.com/',
  'https://g00gle-login.com/',
  'https://paypal-login-secure.example.test/',
  'https://evil.test/paypal/login',
  'https://evil.test/?brand=paypal'
];
for (const u of dilution) addAttack('dilution-or-path', u, 'Homograph/Bait verdünnt oder Marke nur im Pfad');

/* ---------------- Benigner Korpus ---------------- */
const benign = [];
function addBenign(group, url, note) { benign.push({ id: 'benign-' + (benign.length + 1), group, url, note: note || '' }); }

for (const site of SITES) {
  for (const d of site.domains) {
    addBenign('official-domain', 'https://' + d + '/', site.name);
    addBenign('official-subdomain', 'https://accounts.' + d + '/', site.name);
  }
}
addBenign('generic-subdomain', 'https://office.example.test/');
addBenign('generic-subdomain', 'https://line.example.test/');
addBenign('generic-subdomain', 'https://target.example.test/');
addBenign('generic-subdomain', 'https://zoom.example.test/');
// Weitere kurze/generische Markennamen als legitime Firmen-Subdomains (FP-Kandidaten)
for (const label of ['box', 'hp', 'visa', 'ing', 'ups', 'amd', 'sap', 'ibm', 'dhl', 'dpd', 'gls', 'wise', 'temu', 'cursor', 'gemini', 'signal', 'notion', 'medium']) {
  addBenign('short-brand-subdomain-fp', 'https://' + label + '.firma.example.test/', 'legitime Subdomain-Bezeichnung');
}
// Wörter, die zu kurzen Marken Distanz 1 haben (FP-Kandidaten)
for (const d of ['apply.com', 'blocks.com', 'applet.com', 'boxen.de', 'overs.de', 'visum.de']) {
  addBenign('word-damerau-fp', 'https://' + d + '/', 'Wortdomain nahe Markenname');
}
// IDN / Normalisierung / Großschreibung
for (const u of [
  'https://www.xn--bcher-kva.de/',
  'https://www.über.de/',
  'https://www.münchen.de/',
  'https://PAYPAL.COM/',
  'https://www.paypal.com./',
  'https://www.amazon.co.jp/',
  'https://google.de/',
  'https://docs.mozilla.org/',
  'https://mail.proton.me/',
  'https://example.com/',
  'https://irgendeine-unbekannte-seite.test/'
]) addBenign('normalization-and-generic', u);

/* ---------------- Auswertung ---------------- */
const attackResults = attacks.map(a => {
  const r = cls(a.url);
  return { ...a, host: hostOf(a.url), status: r.status, reason: r.reason || null, matchSite: r.site || null };
});
const benignResults = benign.map(b => {
  const r = cls(b.url);
  return { ...b, host: hostOf(b.url), status: r.status, reason: r.reason || null, matchSite: r.site || null };
});

const attacksDetected = attackResults.filter(r => r.status === 'block');
const attacksMissed = attackResults.filter(r => r.status !== 'block');
const benignBlocked = benignResults.filter(r => r.status === 'block');
const uniqueBenign = [];
const seenBenign = new Set();
for (const b of benignResults) { const k = b.group + '|' + b.host + '|' + b.status; if (!seenBenign.has(k)) { seenBenign.add(k); uniqueBenign.push(b); } }
const benignBlockedUnique = uniqueBenign.filter(r => r.status === 'block');

const byClass = {};
for (const r of attackResults) {
  byClass[r.class] = byClass[r.class] || { total: 0, blocked: 0 };
  byClass[r.class].total++;
  if (r.status === 'block') byClass[r.class].blocked++;
}
const fpByClass = {};
for (const r of benignBlocked) { fpByClass[r.group] = fpByClass[r.group] || []; fpByClass[r.group].push(r.host + ' [' + r.reason + '=>' + r.matchSite + ']'); }

const result = {
  probe: 'probe02_detector_corpus',
  timestamp_utc: new Date().toISOString(),
  engine: 'shared/detector.js + shared/sites.js (v0.1.0)',
  brand_count: SITES.length,
  attack_corpus: { total: attackResults.length, blocked: attacksDetected.length, missed: attacksMissed.length, detection_rate: +(attacksDetected.length / attackResults.length).toFixed(4), by_class: byClass },
  benign_corpus: { total_unique: uniqueBenign.length, blocked_unique: benignBlockedUnique.length, false_positive_rate: +(benignBlockedUnique.length / uniqueBenign.length).toFixed(4), blocked_by_group: fpByClass },
  missed_attacks: attacksMissed.map(r => ({ class: r.class, url: r.url, host: r.host, status: r.status, note: r.note })),
  blocked_benign: benignBlockedUnique.map(r => ({ group: r.group, host: r.host, status: r.status, reason: r.reason, matched: r.matchSite, note: r.note })),
  attack_results: attackResults,
  benign_results_sample: uniqueBenign.slice(0, 400),
  invisible_char_analysis: invisibleProbe
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('[probe02] Marken: ' + SITES.length);
console.log('[probe02] Angriffskorpus: ' + attacksDetected.length + '/' + attackResults.length + ' erkannt (' + (result.attack_corpus.detection_rate * 100).toFixed(1) + '%), ' + attacksMissed.length + ' Lücken');
for (const m of attacksMissed) console.log('  MISS: [' + m.class + '] ' + m.host + ' (' + m.url + ')');
console.log('[probe02] Benign-Korpus: ' + benignBlockedUnique.length + '/' + uniqueBenign.length + ' fälschlich blockiert');
for (const [g, list] of Object.entries(fpByClass)) console.log('  FP:' + g + ': ' + list.length + ' z.B. ' + list.slice(0, 6).join(', '));
console.log('[probe02] report: ' + path.relative(ROOT, OUT));
process.exit(0);
