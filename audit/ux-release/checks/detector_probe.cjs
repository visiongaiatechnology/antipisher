#!/usr/bin/env node
/*
 * Antipisher 0.1 (Alpha) — Verhaltens-Probes fuer Doku-Behauptungen (AUDIT-ONLY).
 * Prueft die in README.md/Next.md aufgestellten Behauptungen gegen die echte Engine
 * in shared/detector.js + shared/sites.js. Keine Netzwerkzugriffe.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const ctx = { console, URL, Map, Set, Promise };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['shared/sites.js', 'shared/detector.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
const d = ctx.Antipisher;
const sites = ctx.VGT_SITES;

const out = [];
function rec(group, claim, input, expectation, actual) {
  const ok = actual === expectation;
  out.push({ group, claim, input, expected: expectation, actual, verdict: ok ? 'MATCH' : 'CONFLICT' });
}

// --- Behauptung: "165 fest eingetragene Marken"
out.push({ group: 'Datenbank', claim: 'README:8 "165 Marken"', expected: 165, actual: sites.length,
  verdict: sites.length === 165 ? 'MATCH' : 'CONFLICT' });
out.push({ group: 'Datenbank', claim: 'sites-100.json = 165',
  expected: 165, actual: JSON.parse(fs.readFileSync(path.join(ROOT, 'sites-100.json'), 'utf8')).length,
  verdict: JSON.parse(fs.readFileSync(path.join(ROOT, 'sites-100.json'), 'utf8')).length === 165 ? 'MATCH' : 'CONFLICT' });

// --- Behauptung: "Lueckenloser Subdomain-Schutz fuer alle Marken" (README:10, Next.md:23)
const subdomainCases = [
  ['office.attacker.com', 'block', 'Marke "office" (Microsoft 365) ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['target.attacker.com', 'block', 'Marke "target" ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['medium.attacker.com', 'block', 'Marke "medium" ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['zoom.attacker.com', 'block', 'Marke "zoom" ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['notion.attacker.com', 'block', 'Marke "notion" ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['line.attacker.com', 'block', 'Marke "line" ist in genericSubdomains ausgenommen -> Engine blockt bewusst nicht'],
  ['apple.attacker.com', 'block', 'Kontrollfall (Behauptung gilt fuer Apple)'],
  ['chase.attacker.com', 'block', 'Kontrollfall'],
  ['steam.attacker.com', 'block', 'Kontrollfall'],
];
for (const [input, expectedDoc, note] of subdomainCases) {
  const r = d.classify('https://' + input + '/');
  out.push({ group: 'Subdomain-Schutz', claim: 'README:10/Next.md:23 "lueckenloser Subdomain-Schutz fuer ALLE Marken" (Doku-Erwartung: block)',
    input, expected: expectedDoc, actual: r.status, verdict: r.status === expectedDoc ? 'MATCH' : 'CONFLICT', note });
}

// --- Behauptung: Multi-Tenant-Doku bleibt unblockiert / Marken-Tenants blockiert
for (const [input, expectedDoc] of [
  ['https://microsoft.github.io/', 'safe'], ['https://google.github.io/', 'safe'],
  ['https://paypal.github.io/', 'block'], ['https://chase-login.pages.dev/', 'block'],
]) {
  const r = d.classify(input);
  out.push({ group: 'Multi-Tenant', claim: 'README:11 / Tests', input, expected: expectedDoc,
    actual: r.status, verdict: r.status === expectedDoc ? 'MATCH' : 'CONFLICT' });
}

// --- False-Positive-Proben fuer offensichtlich legitime Hosts
const fpCases = [
  'https://apple.stackexchange.com/',
  'https://visa.example.test/',
  'https://box.example.test/',
  'https://steam.example.test/',
  'https://signal.example.test/',
];
for (const input of fpCases) {
  const r = d.classify(input);
  out.push({ group: 'False-Positive-Risiko', claim: 'README:59 "Falschpositive sind moeglich" (kein Anspruch, aber UX-relevant)',
    input, expected: 'safe', actual: r.status, verdict: r.status === 'safe' ? 'MATCH' : 'CONFLICT',
    note: r.status === 'block' ? `reason=${r.reason}, site=${r.site}` : '' });
}

// --- reason-Abdeckung in guard.js (Mikrocopy)
const reasons = new Map();
for (const u of [
  'https://paypa1.com/', 'https://amzaon.com/', 'https://pаypal.com/', 'https://xn--pypal-4ve.com/',
  'https://paypal.com.evil.test/', 'https://paypal-security.example.test/',
  'https://paypal.com@evil.test/', 'https://paypal.github.io/',
]) {
  const r = d.classify(u);
  reasons.set(u, r.reason || r.status);
}
const guardReasonNames = ['unicode', 'unicode-hidden', 'foreign-domain', 'brand-variant', 'credential-bait', 'typosquat'];
const unmapped = [...reasons.entries()].filter(([, r]) => !guardReasonNames.includes(r) && r !== 'safe');
out.push({ group: 'Mikrocopy', claim: 'guard.js reasonNames deckt alle detector-reasons ab',
  expected: [], actual: unmapped.map(([u, r]) => `${u} -> ${r}`),
  verdict: unmapped.length === 0 ? 'MATCH' : 'CONFLICT',
  note: 'Unabgedeckte reasons erhalten den Fallback-Text "Verdaechtige Domain-Manipulation erkannt."' });

// --- Guard-Eingaben: classify roher/ungueltiger Eingaben
for (const [input, label] of [[undefined, 'undefined'], [null, 'null'], ['', 'leer'], ['not a url', 'kein URL']]) {
  let result, error = null;
  try { result = d.classify(input); } catch (e) { error = String(e && e.message); }
  out.push({ group: 'Guard-Fehlerpfad', claim: 'guard.js:19 ruft engine.classify(target) vor der Zielpruefung auf',
    input: label, expected: 'skip', actual: error ? 'THROW ' + error : result.status,
    verdict: !error && result.status === 'skip' ? 'MATCH' : 'CONFLICT' });
}

// --- Determinismus
const sample = ['https://paypa1.com/', 'https://apple.attacker.com/', 'https://microsoft.github.io/'];
const det = sample.every(u => JSON.stringify(d.classify(u)) === JSON.stringify(d.classify(u)));
out.push({ group: 'Determinismus', claim: 'Test "confusable module is deterministic"', expected: true,
  actual: det, verdict: det ? 'MATCH' : 'CONFLICT' });

const conflicts = out.filter(x => x.verdict === 'CONFLICT');
const lines = ['=== ANTIPISHER UX/RELEASE AUDIT — DETEKTOR-/DOKU-PROBES ===',
  `Quelle: ${ROOT}`, `Probes: ${out.length}  MATCH: ${out.length - conflicts.length}  CONFLICT: ${conflicts.length}`, ''];
for (const x of out) {
  lines.push(`[${x.verdict}] ${x.group} :: ${x.claim}`);
  if (x.input !== undefined) lines.push(`   input=${JSON.stringify(x.input)} expected=${JSON.stringify(x.expected)} actual=${JSON.stringify(x.actual)} ${x.note || ''}`);
}
lines.push('', 'CONFLICTS:');
for (const x of conflicts) lines.push(` - ${x.group}: ${x.input !== undefined ? JSON.stringify(x.input) + ' ' : ''}erwartet ${JSON.stringify(x.expected)}, tatsaechlich ${JSON.stringify(x.actual)} (${x.note || x.claim})`);
const logPath = path.join(__dirname, 'logs', 'detector_probe.log');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, 'detector_probe_results.json'),
  JSON.stringify({ tool: 'detector_probe.cjs', probes: out, conflicts }, null, 2) + '\n', 'utf8');
console.log(lines.join('\n'));
