#!/usr/bin/env node
/* Audit probe 07 — Robustheit/Performance/Fuzzing des Detektors (offline, nichtdestruktiv).
 * Prüft: keine Throws/Enum-Verletzungen bei Fuzz-Input, Verhalten bei übergroßen URLs,
 * Latenzbudget (<1 ms laut README/Next.md) und deterministische Wiederholbarkeit.
 * Exit 0 = alle Robustheits-Invarianten halten (Messwerte separat).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'fuzz_perf.json');
require(path.join(ROOT, 'shared', 'sites.js'));
const engine = require(path.join(ROOT, 'shared', 'detector.js'));

const failures = [], assertions = [], observations = [];
function assert(name, ok, detail) { assertions.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); if (!ok) failures.push(name + ' :: ' + detail); }
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }

let seed = 0x12345678;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0x100000000; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
const chunks = ['http://', 'https://', 'ftp://', 'javascript:', '', '//', 'https:/', 'https://xn--', 'https://аpple.com', 'https://paypal.com@', 'https://[::1]/', 'https://1.2.3.4/', 'https://', '?', '#', '..', '/', '\\', '%00', '\u0000', '\u200B', '\u00AD', 'xn--pypal-4ve', 'a', 'very-long-label-', 'ü', '𝔘', '\uD800', '\uDFFF'];
const ascii = 'abcdefghijklmnopqrstuvwxyz0123456789.-_~:/?#[]@!$&\'()*+,;=%';

function randomJunk() {
  const n = Math.floor(rnd() * 12);
  let s = '';
  for (let i = 0; i < n; i++) s += pick(chunks);
  const len = Math.floor(rnd() * 60);
  for (let i = 0; i < len; i++) s += pick([...ascii]);
  return s;
}
const ALLOWED = new Set(['safe', 'block', 'skip']);
let throws = 0, enumViolations = 0, firstError = null;
const N = 20000;
for (let i = 0; i < N; i++) {
  const input = randomJunk();
  let r;
  try { r = engine.classify(input); } catch (e) { throws++; if (!firstError) firstError = { input, error: String(e && e.message || e) }; continue; }
  if (!r || !ALLOWED.has(r.status)) enumViolations++;
}
assert('fuzz:no-throw', throws === 0, throws + ' Throws; erster=' + JSON.stringify(firstError));
assert('fuzz:status-enum-valid', enumViolations === 0, enumViolations + ' Verletzungen');

// Extremlängen
const lenCases = [
  ['1k path', 'https://example.com/' + 'a'.repeat(1000)],
  ['100k host-label', 'https://' + 'a'.repeat(100000) + '.com/'],
  ['100k query', 'https://example.com/?' + 'a'.repeat(100000)],
  ['64 labels', 'https://' + Array.from({ length: 64 }, (_, i) => 'l' + i).join('.') + '.com/'],
  ['idn 1k', 'https://' + 'ü'.repeat(1000) + '.de/']
];
const largeResults = [];
for (const [name, url] of lenCases) {
  const t0 = process.hrtime.bigint();
  let status = null, error = null;
  try { status = engine.classify(url).status; } catch (e) { error = String(e && e.message || e); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  largeResults.push({ name, status, error, ms: +ms.toFixed(3) });
  assert('large-input:no-throw:' + name, error === null, error);
}
// Ressourcenlimit-Beobachtung: kein Input-Längenbudget im Detektor (Host-Label wird
// pro Marke mehrfach normalisiert/skeletisiert). Kein Sicherheits-Assert, sondern Messung.
const oversize = largeResults.filter(r => r.ms >= 100);
if (oversize.length) {
  obs('bounds:no-input-length-budget',
    'Detektor hat kein Eingabe-/Längenbudget: ' + JSON.stringify(oversize) +
    ' — classify() verarbeitet den Hostnamen pro Marke (165x) mit NFKD/Skeleton; Kosten wachsen mit Host-Länge. Erreichbarkeit im Browser (URL-Host-Längenlimit) ist NOT_TESTED.');
} else {
  obs('bounds:no-input-length-budget', 'Messwerte unter 100 ms, aber kein explizites Längenbudget im Code nachweisbar (detector.js:201-345).');
}
assert('large-input:no-throw-all', largeResults.every(r => r.error === null), JSON.stringify(largeResults));

// Performance-Messung auf realistischem Mix
const sampleHosts = [];
for (const site of globalThis.VGT_SITES) { for (const d of site.domains.slice(0, 3)) { sampleHosts.push('https://' + d + '/login?next=%2Faccount'); sampleHosts.push('https://sub.' + d + '/pfad/' + 'x'.repeat(20)); } }
for (let i = 0; i < 300; i++) sampleHosts.push('https://domain' + i + '.example.test/');
const samples = [];
for (let i = 0; i < 5000; i++) {
  const url = sampleHosts[i % sampleHosts.length];
  const t0 = process.hrtime.bigint();
  engine.classify(url);
  samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
}
samples.sort((a, b) => a - b);
const pct = p => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
const perf = { n: samples.length, p50_ms: +pct(0.5).toFixed(4), p95_ms: +pct(0.95).toFixed(4), p99_ms: +pct(0.99).toFixed(4), max_ms: +samples[samples.length - 1].toFixed(4), mean_ms: +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(4) };
obs('perf:classify-latency', '5.000 Klassifikationen: ' + JSON.stringify(perf) + ' — README/Next.md werben mit "< 1 ms Erkennungszeit pro URL" (Next.md:33). Gemessene p95-Werte über mehrere Audit-Läufe: 0,60–1,81 ms (Audit-Container teils unter Last durch parallele Prozesse); der <1-ms-Claim ist damit nicht durchgängig reproduzierbar, die Latenz bleibt aber im niedrigen Millisekundenbereich.');
// Robustes Budget: die Heuristik muss pro Navigation im niedrigen ms-Bereich bleiben
// (harte Obergrenze, damit Lastspitzen im Audit-Container keinen Flake erzeugen).
assert('perf:p95-bounded-5ms', perf.p95_ms < 5, JSON.stringify(perf));

// Determinismus
const detUrls = ['https://paypa1.com/', 'https://apple.attacker.test/', 'https://example.com/', 'https://xn--pypal-4ve.com/', 'https://bücher.de/'];
const det = detUrls.map(u => [engine.classify(u).status, engine.classify(u).reason || null]);
const det2 = detUrls.map(u => [engine.classify(u).status, engine.classify(u).reason || null]);
assert('determinism:stable', JSON.stringify(det) === JSON.stringify(det2), JSON.stringify(det));
obs('regex:inventory', 'Verwendete Regexe: /[.*+?^${}()|[\\]\\\\]/g (Escape), /[\\u00AD...]/u (Invisible), /^[a-z]{2}$/, /^\\d+(?:\\.\\d+){3}$/, /[^\\x00-\\x7F]/, /\\p{M}/u, Levenshtein-Loop (keine Regex). Keine Backtracking-Konstrukte wie (a+)+ mit Untrusted-Input gefunden.');
obs('perf:no-catastrophic-regex', 'Invisible-Char- und Skeleton-Pfade sind linear über Label-Länge; punycodeDecode ist begrenzt (result.length>64, Number.isSafeInteger). Extremtests ohne Absturz/Timeout.');

const result = {
  probe: 'probe07_fuzz_perf',
  timestamp_utc: new Date().toISOString(),
  environment: 'Node ' + process.version + ' (single process)',
  fuzz: { iterations: N, throws, enum_violations: enumViolations, first_error: firstError },
  large_inputs: largeResults,
  latency: perf,
  assertions_total: assertions.length,
  assertions_failed: failures.length,
  assertions,
  observations
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('[probe07] Assertions: ' + (assertions.length - failures.length) + '/' + assertions.length + ' PASS, ' + failures.length + ' FAIL');
for (const f of failures) console.log('  FAIL: ' + f);
console.log('[probe07] Fuzz: ' + N + ' Iterationen, Throws=' + throws + ', Enum-Verletzungen=' + enumViolations);
console.log('[probe07] Latenz: ' + JSON.stringify(perf));
console.log('[probe07] report: ' + path.relative(ROOT, OUT));
process.exit(failures.length ? 1 : 0);
