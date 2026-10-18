#!/usr/bin/env node
/* Audit probe 03 — Confusable-/Punycode-Parität (nichtdestruktiv, offline).
 * 1) Systematischer Homograph-Substitutionstest über reale Markenwörter:
 *    echte Unicode-Confusables (Kyrillisch/Griechisch) je Buchstabe, jeweils als
 *    UTF-8-URL UND als IDNA-Punycode-URL. Erwartung: beide werden blockiert.
 * 2) Decoder-Parität: eigenes punycodeDecode() vs. Node-IDNA-Referenz
 *    (url.domainToUnicode) für gültige IDN-Labels.
 * Exit 0 = Messung vollständig ausgeführt (Ergebnisse sind Beobachtungen).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const nodeUrl = require('node:url');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'punycode_parity.json');
require(path.join(ROOT, 'shared', 'sites.js'));
const engine = require(path.join(ROOT, 'shared', 'detector.js'));

const brandWords = ['paypal', 'google', 'apple', 'amazon', 'microsoft', 'facebook', 'netflix', 'instagram', 'binance', 'coinbase', 'steam', 'discord', 'linkedin', 'youtube', 'revolut'];
const confusables = {
  a: ['а', 'α'], o: ['о', 'ο'], e: ['е', 'ε'], p: ['р', 'ρ'], c: ['с', 'ϲ'], x: ['х', 'χ'],
  y: ['у', 'γ'], s: ['ѕ'], i: ['і', 'ι'], j: ['ј'], h: ['һ'], d: ['ԁ'], q: ['ԛ'],
  w: ['ѡ'], v: ['ν'], m: ['м', 'μ'], t: ['т', 'τ'], b: ['в'], k: ['к', 'κ'], g: ['ɡ', 'ԍ'], l: ['ӏ', 'ⅼ'], n: ['п'], r: ['г']
};

function hostFromUrl(url) { try { return new URL(url).hostname; } catch { return null; } }
function validUrl(url) { try { const u = new URL(url); return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname; } catch { return false; } }

/* ---------- 1. Confusable-Substitution ---------- */
const subs = [];
const seenSpoof = new Set();
for (const word of brandWords) {
  for (let pos = 0; pos < word.length; pos++) {
    const letter = word[pos];
    const chars = confusables[letter];
    if (!chars) continue;
    for (const ch of chars) {
      const spoofWord = word.slice(0, pos) + ch + word.slice(pos + 1);
      if (seenSpoof.has(spoofWord)) continue;
      seenSpoof.add(spoofWord);
      const unicodeUrl = 'https://' + spoofWord + '.com/';
      if (!validUrl(unicodeUrl)) continue;
      const punyLabel = hostFromUrl(unicodeUrl);
      if (!punyLabel || !punyLabel.startsWith('xn--')) continue;
      const punyUrl = 'https://' + punyLabel + '/';
      const rUni = engine.classify(unicodeUrl);
      const rPuny = engine.classify(punyUrl);
      subs.push({
        brand: word, position: pos, ascii_letter: letter, confusable: ch,
        unicode_url: unicodeUrl, punycode_url: punyUrl,
        unicode_status: rUni.status, unicode_reason: rUni.reason || null, unicode_site: rUni.site || null,
        punycode_status: rPuny.status, punycode_reason: rPuny.reason || null, punycode_site: rPuny.site || null,
        detected_unicode: rUni.status === 'block', detected_punycode: rPuny.status === 'block'
      });
    }
  }
}
const subsDetectedUni = subs.filter(x => x.detected_unicode);
const subsDetectedPuny = subs.filter(x => x.detected_punycode);
const subsMissed = subs.filter(x => !x.detected_unicode || !x.detected_punycode);
const inconsistency = subs.filter(x => x.detected_unicode !== x.detected_punycode);
const byConfusable = {};
for (const s of subs) {
  const k = s.confusable;
  byConfusable[k] = byConfusable[k] || { total: 0, detected: 0 };
  byConfusable[k].total++;
  if (s.detected_unicode && s.detected_punycode) byConfusable[k].detected++;
}
const byBrand = {};
for (const s of subs) {
  byBrand[s.brand] = byBrand[s.brand] || { total: 0, detected: 0 };
  byBrand[s.brand].total++;
  if (s.detected_unicode && s.detected_punycode) byBrand[s.brand].detected++;
}

/* ---------- 2. Decoder-Parität (nur gültige IDN) ---------- */
let seed = 0x5eed1234;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0x100000000; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
const unicodeAlphabet = ['а', 'е', 'о', 'р', 'с', 'х', 'у', 'ѕ', 'і', 'ј', 'һ', 'ԁ', 'ԛ', 'ѡ', 'ν', 'м', 'τ', 'в', 'κ', 'ԍ', 'п', 'г', 'α', 'ο', 'ε', 'ρ', 'ϲ', 'χ', 'γ', 'ι', 'μ', 'ö', 'ü', 'ñ', 'ç', 'ß'];
const asciiAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomMixedLabel() {
  const len = 4 + Math.floor(rnd() * 8);
  let s = '';
  for (let i = 0; i < len; i++) s += rnd() < 0.4 ? pick(unicodeAlphabet) : pick([...asciiAlphabet]);
  return s;
}
const decoderCases = [];
for (let i = 0; i < 500; i++) {
  const label = randomMixedLabel();
  let ascii = null;
  try { ascii = hostFromUrl('https://' + label + '.com/'); } catch { ascii = null; }
  if (!ascii) continue;
  ascii = ascii.replace(/\.com$/, '');
  if (!ascii.startsWith('xn--')) continue;
  let reference = null;
  try { reference = nodeUrl.domainToUnicode(ascii); } catch { reference = null; }
  if (reference === null || reference === '') continue; // IDNA-disallowed -> nicht registrierbar, nicht bewertbar
  const own = engine.punycodeDecode(ascii);
  decoderCases.push({ ascii, reference, own, match: own === reference });
}
const decoderMismatches = decoderCases.filter(c => !c.match);

/* ---------- Ergebnis ---------- */
const result = {
  probe: 'probe03_punycode_parity',
  timestamp_utc: new Date().toISOString(),
  node_version: process.version,
  homograph_substitution: {
    cases: subs.length,
    detected_unicode: subsDetectedUni.length,
    detected_punycode: subsDetectedPuny.length,
    missed_full: subsMissed.length,
    unicode_punycode_inconsistent: inconsistency.length,
    detection_rate: subs.length ? +((subs.length - subsMissed.length) / subs.length).toFixed(4) : null,
    by_confusable: byConfusable,
    by_brand: byBrand,
    missed_examples: subsMissed.slice(0, 40),
    inconsistent_examples: inconsistency.slice(0, 20)
  },
  decoder_parity: {
    valid_idn_cases: decoderCases.length,
    mismatches: decoderMismatches.length,
    mismatch_examples: decoderMismatches.slice(0, 20),
    note: 'Referenz = Node url.domainToUnicode (IDNA/UTS46). IDNA-disallowte Labels werden ausgefiltert (nicht registrierbar).'
  }
};
result.homograph_substitution.detected_punycode = subsDetectedPuny.length;
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('[probe03] Confusable-Substitutionen: ' + subs.length + ' Fälle, Unicode erkannt=' + subsDetectedUni.length + ', Punycode erkannt=' + subsDetectedPuny.length + ', vollständig verfehlt=' + subsMissed.length + ', Unicode/Punycode inkonsistent=' + inconsistency.length);
for (const m of subsMissed.slice(0, 12)) console.log('  MISS: ' + m.unicode_url + ' uni=' + m.unicode_status + '/' + m.unicode_reason + ' puny=' + m.punycode_status + '/' + m.punycode_reason);
console.log('[probe03] Decoder-Parität: ' + decoderCases.length + ' gültige IDN-Fälle, ' + decoderMismatches.length + ' Abweichungen');
for (const m of decoderMismatches.slice(0, 8)) console.log('  MISMATCH: ' + m.ascii + ' ref=' + m.reference + ' own=' + m.own);
console.log('[probe03] report: ' + path.relative(ROOT, OUT));
process.exit(0);
