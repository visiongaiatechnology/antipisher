#!/usr/bin/env node
/* Audit probe 08 — Brand-Datenintegrität (offline, nichtdestruktiv).
 * Prüft Konsistenz sites.js <-> sites-100.json, Domänenformat, Duplikate,
 * Klassifikation aller offiziellen Domains/Subdomains und Doku-Zahlenansprüche.
 * Exit 0 = alle Datenintegritäts-Invarianten halten.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'data_integrity.json');
const failures = [], assertions = [], observations = [];
function assert(name, ok, detail) { assertions.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); if (!ok) failures.push(name + ' :: ' + detail); }
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }

const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites-100.json'), 'utf8'));
require(path.join(ROOT, 'shared', 'sites.js'));
const js = globalThis.VGT_SITES;
const engine = require(path.join(ROOT, 'shared', 'detector.js'));

assert('data:sites.js-equals-sites-100.json', JSON.stringify(json) === JSON.stringify(js), 'sites.js und sites-100.json divergieren (' + js.length + ' vs ' + json.length + ')');
assert('data:brand-count>=100', js.length >= 100, String(js.length));

const brands = js.map(x => x.brand);
const names = js.map(x => x.name);
const domains = js.flatMap(x => x.domains);
const dupBrands = brands.filter((b, i) => brands.indexOf(b) !== i);
const dupDomains = domains.filter((d, i) => domains.indexOf(d) !== i);
assert('data:no-duplicate-brands', dupBrands.length === 0, dupBrands.join(','));
assert('data:no-duplicate-domains', dupDomains.length === 0, dupDomains.join(','));

const hostRe = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const badDomains = [];
const badRecords = [];
for (const rec of js) {
  if (!rec || typeof rec.name !== 'string' || !rec.name.trim()) badRecords.push('name fehlt: ' + JSON.stringify(rec));
  if (!rec || typeof rec.brand !== 'string' || !rec.brand.trim()) badRecords.push('brand fehlt: ' + JSON.stringify(rec));
  if (rec && typeof rec.brand === 'string' && rec.brand !== rec.brand.toLowerCase()) badRecords.push('brand nicht lowercase: ' + rec.brand);
  if (rec && typeof rec.brand === 'string' && /[.\s]/.test(rec.brand)) badRecords.push('brand enthält Leerzeichen/Punkt: ' + rec.brand);
  if (!rec || !Array.isArray(rec.domains) || rec.domains.length === 0) { badRecords.push('domains fehlt/leer: ' + JSON.stringify(rec && rec.name)); continue; }
  for (const d of rec.domains) {
    if (typeof d !== 'string' || !hostRe.test(d)) badDomains.push(rec.name + ' -> ' + d);
    if (/^https?:|^\/|@|:\d+|\.$|\*/.test(String(d))) badDomains.push(rec.name + ' -> ' + d + ' (Schema/Pfad/Wildcard)');
  }
}
assert('data:records-valid', badRecords.length === 0, badRecords.slice(0, 10).join(' | '));
assert('data:domains-valid-hostname', badDomains.length === 0, badDomains.slice(0, 10).join(' | '));

// Jede offizielle Domain + accounts.-Subdomain muss als safe klassifiziert werden
const wronglyBlocked = [];
for (const rec of js) for (const d of rec.domains) {
  for (const host of [d, 'accounts.' + d, 'www.' + d]) {
    const r = engine.classify('https://' + host + '/');
    if (r.status !== 'safe') wronglyBlocked.push(host + ' => ' + r.status + '/' + (r.reason || '') + '/' + (r.site || ''));
  }
}
assert('data:all-official-hosts-safe', wronglyBlocked.length === 0, wronglyBlocked.slice(0, 15).join(' | '));

// Generische Marken (Subdomain-FP-Risiko)
const genericSubdomains = ['office', 'line', 'medium', 'zoom', 'notion', 'target'];
const shortBrands = js.filter(r => r.brand.length <= 3).map(r => r.brand);
const genericNotExcluded = js.filter(r => ['box', 'hp', 'ups', 'visa', 'ing', 'amd', 'sap', 'ibm', 'dhl', 'dpd', 'gls', 'wise', 'temu', 'cursor', 'gemini', 'signal', 'threads', 'yahoo', 'intel', 'sony', 'otto', 'n26', 'okx', 'dkb', 'ebay', 'etsy', 'asos', 'gls', 'nvidia', 'oracle', 'adobe', 'canva', 'figma', 'slack', 'twitch', 'xbox', 'tmobile'].includes(r.brand))
  .filter(r => !genericSubdomains.includes(r.brand)).map(r => r.brand);
obs('data:brand-statistics', 'Marken=' + js.length + ', Domains=' + domains.length + ', Marken mit Brand <=3 Zeichen=' + shortBrands.length + ' [' + shortBrands.join(',') + '], Typosquat-Prüfung inaktiv (brand.length>=5) für ' + js.filter(r => r.brand.length < 5).length + ' Marken.');

// Doku-Zahlenansprüche
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const next = fs.readFileSync(path.join(ROOT, 'Next.md'), 'utf8');
const buildSites = fs.readFileSync(path.join(ROOT, 'build_sites.py'), 'utf8');
const claim165 = (readme.match(/165 fest eingetragene/) || [])[0] || null;
const next165 = (next.match(/165/) || [])[0] || null;
const build140 = (buildSites.match(/140\+/) || [])[0] || null;
obs('docs:brand-count-claims', 'Tatsächliche Marken=' + js.length + ' | README "165": ' + !!claim165 + ' | Next.md "165": ' + !!next165 + ' | build_sites.py "140+": ' + !!build140 + ' — Ansprüche ' + ((claim165 && js.length === 165) ? 'gedeckt' : 'NICHT gedeckt') + '.');
assert('docs:README-brand-count-matches', !claim165 || js.length === 165, 'README behauptet 165, Daten=' + js.length);

// Subdomain-FP-Kandidaten: kurze Brand-Labels, die als Subdomain blockiert würden
const fpCandidates = [];
for (const [label] of [['box'], ['hp'], ['visa'], ['ing'], ['ups'], ['amd'], ['sap'], ['ibm'], ['dhl'], ['dpd'], ['gls'], ['wise'], ['temu'], ['cursor'], ['gemini'], ['signal']]) {
  const r = engine.classify('https://' + label + '.firma.example.test/');
  if (r.status === 'block') fpCandidates.push(label + ' (' + r.reason + '/' + r.site + ')');
}
obs('data:subdomain-fp-candidates', fpCandidates.length + ' kurze/generische Markenlabels werden als Subdomain fremder Domains blockiert: ' + fpCandidates.join(', '));

// Marken-Kollisionen: offizielle Domain eines Records, die als Marken-Subdomain eines anderen Records blockiert würde
const collisions = [];
for (const rec of js) for (const d of rec.domains) {
  const labels = d.split('.');
  for (const other of js) {
    if (other === rec) continue;
    if (labels.includes(other.brand) && !other.domains.some(x => d === x || d.endsWith('.' + x))) {
      collisions.push(d + ' (Brand "' + other.brand + '" von ' + other.name + ')');
    }
  }
}
obs('data:brand-label-collisions', collisions.length + ' Kollisionen (offizielle Domain enthält fremdes Brand-Label): ' + collisions.slice(0, 15).join('; '));

const result = {
  probe: 'probe08_data_integrity',
  timestamp_utc: new Date().toISOString(),
  brand_count: js.length,
  domain_count: domains.length,
  duplicate_brands: dupBrands,
  duplicate_domains: dupDomains,
  invalid_records: badRecords,
  invalid_domains: badDomains,
  wrongly_blocked_official_hosts: wronglyBlocked,
  generic_brand_subdomain_fp_candidates: fpCandidates,
  brand_label_collisions: collisions,
  assertions_total: assertions.length,
  assertions_failed: failures.length,
  assertions,
  observations
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('[probe08] Assertions: ' + (assertions.length - failures.length) + '/' + assertions.length + ' PASS, ' + failures.length + ' FAIL');
for (const f of failures) console.log('  FAIL: ' + f);
for (const o of observations) console.log('  OBS : ' + o.name + ' — ' + o.detail);
console.log('[probe08] report: ' + path.relative(ROOT, OUT));
process.exit(failures.length ? 1 : 0);
