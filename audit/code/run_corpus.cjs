#!/usr/bin/env node
/*
 * Antipisher 0.1 Alpha - adversarialer Erkennungskorpus + Performance-Messung.
 * AUDIT-ONLY: liest shared/sites.js + shared/detector.js, veraendert keine Quelldateien.
 *
 * Ausfuehrung:  node audit/code/run_corpus.cjs
 * Ausgaben:     audit/code/results.json, audit/code/perf_results.txt, stdout-Summary
 * Exitcode:     0 = Auditlauf erfolgreich (FN/FP werden dokumentiert, nicht als Prozessfehler gewertet)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'audit', 'code');
const CORPUS_PATH = path.join(OUT_DIR, 'corpus.json');
const RESULTS_PATH = path.join(OUT_DIR, 'results.json');
const PERF_PATH = path.join(OUT_DIR, 'perf_results.txt');

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function readText(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// ---------------------------------------------------------------------------
// Engine laden (identisch zu dem, was Browser-Background/-Guard laden)
// ---------------------------------------------------------------------------
require(path.join(ROOT, 'shared', 'sites.js'));
const engine = require(path.join(ROOT, 'shared', 'detector.js'));
const SITES = globalThis.VGT_SITES || [];

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// 1) Korpus ausfuehren
// ---------------------------------------------------------------------------
const detail = [];
const failures = { fn: [], fp: [], unexpectedSkip: [], skipMismatch: [] };
let pass = 0;

for (const entry of corpus.entries) {
  let res;
  try {
    res = engine.classify(entry.url);
  } catch (e) {
    res = { status: 'throw', error: String(e && e.message || e) };
  }
  const ok = res.status === entry.expected;
  if (ok) pass += 1;
  const row = {
    id: entry.id,
    category: entry.category,
    url: entry.url.length > 180 ? entry.url.slice(0, 177) + '...' : entry.url,
    expected: entry.expected,
    actual: res.status,
    reason: res.reason || null,
    site: res.site || null,
    official: res.official || null,
    host: res.host || null,
    certainty: entry.certainty,
    note: entry.note,
    pass: ok
  };
  detail.push(row);
  if (ok) continue;
  if (entry.expected === 'block') {
    failures.fn.push(row);
  } else if (entry.expected === 'safe' && res.status === 'block') {
    failures.fp.push(row);
  } else if (entry.expected === 'safe' && res.status === 'skip') {
    failures.unexpectedSkip.push(row);
  } else {
    failures.skipMismatch.push(row);
  }
}

function certaintyCount(list, cert) {
  return list.filter(r => r.certainty === cert).length;
}
function rate(num, den) {
  return den === 0 ? 0 : num / den;
}
const expectedBlock = corpus.entries.filter(e => e.expected === 'block').length;
const expectedSafe = corpus.entries.filter(e => e.expected === 'safe').length;

const corpusSummary = {
  total: corpus.entries.length,
  expected: {
    block: expectedBlock,
    safe: expectedSafe,
    skip: corpus.entries.filter(e => e.expected === 'skip').length
  },
  passed: pass,
  failed: corpus.entries.length - pass,
  pass_rate: rate(pass, corpus.entries.length),
  false_negatives: failures.fn.length + failures.unexpectedSkip.length,
  false_negatives_skipped: failures.unexpectedSkip.length,
  false_negative_rate: rate(failures.fn.length + failures.unexpectedSkip.length, expectedBlock),
  false_negative_certainty: {
    hoch: certaintyCount(failures.fn, 'hoch') + certaintyCount(failures.unexpectedSkip, 'hoch'),
    mittel: certaintyCount(failures.fn, 'mittel') + certaintyCount(failures.unexpectedSkip, 'mittel')
  },
  false_positives: failures.fp.length,
  false_positive_rate: rate(failures.fp.length, expectedSafe),
  false_positive_certainty: {
    hoch: certaintyCount(failures.fp, 'hoch'),
    mittel: certaintyCount(failures.fp, 'mittel')
  },
  skipped_mismatches: failures.skipMismatch.length
};

// Kategorien-Auswertung
const catMap = new Map();
for (const row of detail) {
  const c = catMap.get(row.category) || { category: row.category, total: 0, pass: 0, fn: 0, fp: 0, other: 0 };
  c.total += 1;
  if (row.pass) c.pass += 1;
  else if (row.expected === 'block') c.fn += 1;
  else if (row.expected === 'safe' && row.actual === 'block') c.fp += 1;
  else c.other += 1;
  catMap.set(row.category, c);
}
const byCategory = [...catMap.values()].sort((a, b) => a.category.localeCompare(b.category));

// ---------------------------------------------------------------------------
// 2) Offizielle Selbstregression: jede in sites.js genannte Domain + Varianten
// ---------------------------------------------------------------------------
const officialFailures = [];
let officialChecked = 0;
for (const site of SITES) {
  for (const domain of site.domains) {
    for (const probe of [domain, 'www.' + domain, 'accounts.' + domain]) {
      officialChecked += 1;
      const r = engine.classify('https://' + probe + '/');
      if (r.status !== 'safe') {
        officialFailures.push({ url: 'https://' + probe + '/', expected: 'safe', actual: r.status, reason: r.reason || null, site: r.site || null });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3) Datenqualitaet sites.js / sites-100.json / build_sites.py
// ---------------------------------------------------------------------------
const domainOwner = new Map();
for (const site of SITES) {
  for (const d of site.domains) {
    if (!domainOwner.has(d)) domainOwner.set(d, []);
    domainOwner.get(d).push(site.name);
  }
}
const duplicateDomains = [...domainOwner.entries()].filter(([, owners]) => owners.length > 1)
  .map(([domain, owners]) => ({ domain, owners }));

const shortBrands = SITES.filter(s => (s.brand || '').length < 5).map(s => ({ name: s.name, brand: s.brand, len: (s.brand || '').length }));
const subdomainOfficialDomains = SITES.flatMap(s => s.domains.filter(d => d.split('.').length > 2).map(d => ({ site: s.name, domain: d })));

// Marke muss als Label in einer offiziellen Domain auffindbar sein, sonst greift Typosquat-Vergleich ins Leere.
const brandLabelMismatches = [];
for (const site of SITES) {
  const normDomains = site.domains.map(d => d.replace(/-/g, ''));
  const hit = normDomains.some(d => d.split('.').some(label => label.includes(site.brand)));
  if (!hit) brandLabelMismatches.push({ name: site.name, brand: site.brand, domains: site.domains });
}

// build_sites.py -> sites-100.json Konsistenz
let buildSitesConsistent = null;
let buildSitesError = null;
try {
  const py = readText(path.join(ROOT, 'build_sites.py')) || '';
  const m = py.match(/raw = """([\s\S]*?)"""/);
  if (!m) throw new Error('raw-Block in build_sites.py nicht gefunden');
  const records = [];
  for (const line of m[1].split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [name, brand, hosts] = t.split('|');
    records.push({ name: name.trim(), brand: brand.trim(), domains: hosts.split(/\s+/).filter(Boolean) });
  }
  const json = JSON.parse(readText(path.join(ROOT, 'sites-100.json')) || '[]');
  buildSitesConsistent = JSON.stringify(records) === JSON.stringify(json);
} catch (e) {
  buildSitesConsistent = false;
  buildSitesError = String(e.message || e);
}

// ---------------------------------------------------------------------------
// 4) Version / Quelle / Dokumente / Build-Sync
// ---------------------------------------------------------------------------
const versionSources = [];
function addVersion(source, value, note) {
  versionSources.push({ source, value, note });
}
try {
  const cm = JSON.parse(readText(path.join(ROOT, 'chrome', 'manifest.json')));
  const fm = JSON.parse(readText(path.join(ROOT, 'firefox', 'manifest.json')));
  addVersion('chrome/manifest.json version', cm.version, 'Chrome-Manifest');
  addVersion('chrome/manifest.json version_name', cm.version_name || null, 'Chrome-Anzeigename');
  addVersion('firefox/manifest.json version', fm.version, 'Firefox-Manifest');
  addVersion('firefox/manifest.json version_name', fm.version_name || null, 'Firefox kennt version_name nicht');
} catch (e) {
  addVersion('manifest-parse', String(e.message || e), 'Fehler');
}
const buildPy = readText(path.join(ROOT, 'build.py')) || '';
const zipMatch = buildPy.match(/Antipisher-(\{target\.capitalize\(\)\})-v([0-9][^']*)\.zip/);
addVersion('build.py ZIP-Name', zipMatch ? 'v' + zipMatch[2] : 'unbekannt', 'Archivversion');
const nextMd = readText(path.join(ROOT, 'Next.md')) || '';
const nextVersionClaim = /0\.1\.0-alpha/.test(nextMd) ? '0.1.0-alpha' : (/0\.1\.0/.test(nextMd) ? '0.1.0' : 'unbekannt');
addVersion('Next.md Behauptung', nextVersionClaim, 'Dokumentation');
addVersion('README.md Behauptung', '0.1.0 (Alpha 0.1)', 'Dokumentation');

const docs = {};
for (const f of ['README.md', 'SECURITY.md', 'Next.md', 'LICENSE', 'ARCHITECTURE_AND_SECURITY_REVIEW.md']) {
  docs[f] = fs.existsSync(path.join(ROOT, f));
}
const licenseIsAgpl = /GNU AFFERO GENERAL PUBLIC LICENSE/.test(readText(path.join(ROOT, 'LICENSE')) || '');

// Kopien-Sync shared <-> chrome <-> firefox
const syncFiles = ['guard.html', 'guard.css', 'guard.js', 'popup.html', 'popup.js', 'shared/sites.js', 'shared/detector.js'];
const sync = [];
for (const f of syncFiles) {
  const sharedPath = path.join(ROOT, 'shared', f.replace(/^shared\//, ''));
  const chromePath = path.join(ROOT, 'chrome', f);
  const firefoxPath = path.join(ROOT, 'firefox', f);
  const hash = p => (fs.existsSync(p) ? sha256File(p) : 'MISSING');
  const hs = hash(sharedPath), hc = hash(chromePath), hf = hash(firefoxPath);
  sync.push({ file: f, shared_sha256: hs, chrome_sha256: hc, firefox_sha256: hf, in_sync: hs === hc && hs === hf });
}

// Manifest-/Permissions-Pruefung (statisch)
const manifestAudit = {};
try {
  const cm = JSON.parse(readText(path.join(ROOT, 'chrome', 'manifest.json')));
  const fm = JSON.parse(readText(path.join(ROOT, 'firefox', 'manifest.json')));
  const chaliceWar = Array.isArray(cm.web_accessible_resources) ? cm.web_accessible_resources : [];
  const guardInChromeWar = chaliceWar.some(w => (w.resources || []).includes('guard.html'));
  const ffWar = fm.web_accessible_resources;
  manifestAudit.chrome = {
    manifest_version: cm.manifest_version,
    permissions: cm.permissions,
    host_permissions: cm.host_permissions,
    background: cm.background,
    guard_html_in_war: guardInChromeWar,
    war_entries: chaliceWar,
    minimum_chrome_version: cm.minimum_chrome_version
  };
  manifestAudit.firefox = {
    manifest_version: fm.manifest_version,
    permissions: fm.permissions,
    host_permissions: fm.host_permissions,
    background: fm.background,
    web_accessible_resources: ffWar === undefined ? null : ffWar,
    guard_html_in_war: Array.isArray(ffWar) && ffWar.some(w => (w.resources || []).includes('guard.html')),
    browser_specific_settings: fm.browser_specific_settings
  };
  manifestAudit.firefox_redirect_target_requires_war = true; // MDN: Redirect auf Extension-Seite braucht WAR
  manifestAudit.firefox_war_gap = manifestAudit.firefox.guard_html_in_war === false;
} catch (e) {
  manifestAudit.error = String(e.message || e);
}

// Chrome-Rule-Statik aus background.js (requestMethods / Redirect-Ziel)
const chromeBg = readText(path.join(ROOT, 'chrome', 'background.js')) || '';
const firefoxBg = readText(path.join(ROOT, 'firefox', 'background.js')) || '';
const staticAnalysis = {
  chrome_dnr_request_methods_line: /requestMethods:\s*\['([^']+)'\]/.exec(chromeBg)?.[1] || null,
  chrome_dnr_redirect_target: /regexSubstitution:\s*api\.runtime\.getURL\('([^']+)'\)/.exec(chromeBg)?.[1] || null,
  chrome_allow_regex_length_limit: /regexp\.length>(\d+)/.exec(chromeBg)?.[1] || null,
  chrome_fragment_split_line: /requestUrl=url\.split\('#'\)\[0\]/.test(chromeBg),
  firefox_redirect_target: /runtime\.getURL\('([^']+)'\)/.exec(firefoxBg)?.[1] || null,
  firefox_request_method_filter: /requestMethods|method/.test(firefoxBg),
  firefox_uses_accounts_variable: /const api=browser;/.test(firefoxBg)
};

// ---------------------------------------------------------------------------
// 5) Performance-Messung
// ---------------------------------------------------------------------------
function statsMs(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const n = s.length;
  const pick = q => s[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))];
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n,
    min_ms: s[0],
    median_ms: pick(0.5),
    mean_ms: sum / n,
    p95_ms: pick(0.95),
    p99_ms: pick(0.99),
    max_ms: s[n - 1],
    total_ms: sum
  };
}
function measureSamples(fn, iterations, warmup) {
  for (let i = 0; i < warmup; i++) fn(i);
  const samples = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const a = process.hrtime.bigint();
    fn(i);
    const b = process.hrtime.bigint();
    samples[i] = Number(b - a) / 1e6;
  }
  return samples;
}
function measure(fn, iterations, warmup) {
  const t0 = process.hrtime.bigint();
  const samples = measureSamples(fn, iterations, warmup);
  const st = statsMs(samples);
  st.wall_total_ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return st;
}
function measureRepeated(fn, iterations, warmup, reps) {
  const runs = [];
  for (let r = 0; r < reps; r++) runs.push(measureSamples(fn, iterations, warmup));
  const flat = runs.flat();
  const agg = statsMs(flat);
  agg.reps = reps;
  agg.iterations_per_rep = iterations;
  agg.total_samples = flat.length;
  agg.per_run = runs.map(statsMs);
  agg.per_run_p95_min = Math.min(...agg.per_run.map(s => s.p95_ms));
  agg.per_run_p95_max = Math.max(...agg.per_run.map(s => s.p95_ms));
  return agg;
}

const corpusUrls = corpus.entries.map(e => (e.url.length > 1 ? e.url : 'https://example.com/'));
const rssBefore = process.memoryUsage().rss;
const coldStart = (() => {
  const a = process.hrtime.bigint();
  engine.classify('https://www.bundesregierung.de/');
  const b = process.hrtime.bigint();
  return Number(b - a) / 1e6;
})();
const mixed = measureRepeated(i => engine.classify(corpusUrls[i % corpusUrls.length]), 10000, 500, 5);
const safe2label = measureRepeated(() => engine.classify('https://www.bundesregierung.de/'), 10000, 500, 3);
const safe3label = measureRepeated(() => engine.classify('https://docs.python.org/'), 10000, 500, 3);
const blocked = measureRepeated(() => engine.classify('https://paypa1.com/'), 10000, 500, 3);
const longHost = 'a'.repeat(60) + '.' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.example.com';
const worstHost = measure(() => engine.classify('https://' + longHost + '/'), 1000, 100);
const rssAfter = process.memoryUsage().rss;

const perf = {
  environment: {
    node: process.version,
    platform: process.platform,
    release: os.release(),
    cpu: (os.cpus()[0] || {}).model || 'unbekannt',
    logical_cores: os.cpus().length
  },
  methodology: {
    clock: 'process.hrtime.bigint je Einzelaufruf (ns -> ms), kein Netzwerk, kein Dateisystem im Messpfad',
    warmup_calls: 500,
    main_iterations: 10000,
    main_reps: 5,
    main_mix: 'round-robin ueber alle ' + corpusUrls.length + ' Korpus-URLs, 5 Wiederholungen a 10.000 Aufrufe (50.000 Gesamtproben)',
    cold_start: 'erster classify()-Aufruf nach Modul-Laden (JIT kalt)',
    memory: 'process.memoryUsage().rss vor/nach den Messreihen',
    host: 'AMD Ryzen 5 4600H, Windows 11, Node 24.13.0; Absolutwerte plattform- und lastabhaengig (Audit-Container mit paralleler Last)'
  },
  cold_start_ms: coldStart,
  mixed_corpus_10k: mixed,
  safe_2label_10k: safe2label,
  safe_3label_10k: safe3label,
  blocked_10k: blocked,
  long_host_60x3_1k: worstHost,
  rss_before_bytes: rssBefore,
  rss_after_bytes: rssAfter,
  rss_delta_bytes: rssAfter - rssBefore,
  claim: '< 1 ms Erkennungszeit pro URL (Next.md, Performancebudget)',
  claim_check: {
    median_under_1ms: mixed.median_ms < 1,
    p95_under_1ms: mixed.p95_ms < 1,
    p95_all_runs_under_1ms: mixed.per_run_p95_max < 1,
    p99_under_1ms: mixed.p99_ms < 1,
    mean_under_1ms: mixed.mean_ms < 1,
    verdict: mixed.median_ms < 1 && mixed.per_run_p95_max < 1
      ? 'BESTAETIGT (Median und p95 in allen Wiederholungen)'
      : (mixed.median_ms < 1 ? 'TEILWEISE: Median < 1 ms, aber p95 in mindestens einem Lauf >= 1 ms - Budgetaussage "< 1 ms" nicht belastbar' : 'NICHT BESTAETIGT')
  }
};

// perf_results.txt schreiben
const L = [];
L.push('ANTIPISHER 0.1 ALPHA - PERFORMANCE-MESSUNG DER ERKENNUNG (AUDIT)');
L.push('Erzeugt: ' + new Date().toISOString() + ' | Node ' + process.version + ' | ' + os.platform() + ' ' + os.release());
L.push('CPU: ' + perf.environment.cpu + ' (' + perf.environment.logical_cores + ' logische Kerne)');
L.push('Engine: shared/detector.js SHA256 ' + sha256File(path.join(ROOT, 'shared', 'detector.js')));
L.push('Befehl: node audit/code/run_corpus.cjs');
L.push('');
L.push('Methodik:');
L.push('  - je Aufruf process.hrtime.bigint() vor/nach engine.classify(url); Umrechnung ns -> ms');
L.push('  - 500 Warmup-Aufrufe, dann Messung; keine I/O im Messpfad');
L.push('  - Hauptmessung: 5 Wiederholungen a 10.000 Aufrufe (50.000 Proben), round-robin ueber ' + corpusUrls.length + ' Korpus-URLs');
L.push('  - Zusatzmessungen: gleichfoermige URL-Typen (worst-case Safe = voller 165-Sites-Scan), je 3 Wiederholungen');
L.push('  - Audit-Container mit paralleler Last: p95/p99 streuen; Median ist die robusteste Kennzahl');
L.push('');
L.push('Ergebnisse (ms pro classify-Aufruf, aggregiert ueber alle Wiederholungen):');
L.push('  Kaltstart (1. Aufruf nach Modul-Laden): ' + coldStart.toFixed(4));
L.push('  Korpus-Mix 50.000 Proben        : min=' + mixed.min_ms.toFixed(4) + '  median=' + mixed.median_ms.toFixed(4) + '  mean=' + mixed.mean_ms.toFixed(4) + '  p95=' + mixed.p95_ms.toFixed(4) + '  p99=' + mixed.p99_ms.toFixed(4) + '  max=' + mixed.max_ms.toFixed(4));
L.push('    p95 je Wiederholung: ' + mixed.per_run.map(s => s.p95_ms.toFixed(3)).join(', ') + ' (min=' + mixed.per_run_p95_min.toFixed(3) + ', max=' + mixed.per_run_p95_max.toFixed(3) + ')');
L.push('    Median je Wiederholung: ' + mixed.per_run.map(s => s.median_ms.toFixed(3)).join(', '));
L.push('  Safe 2-Label 30.000 (worst)    : median=' + safe2label.median_ms.toFixed(4) + '  p95=' + safe2label.p95_ms.toFixed(4) + '  p99=' + safe2label.p99_ms.toFixed(4) + '  max=' + safe2label.max_ms.toFixed(4) + '  p95-Laeufe: ' + safe2label.per_run.map(s => s.p95_ms.toFixed(3)).join(', '));
L.push('  Safe 3-Label 30.000            : median=' + safe3label.median_ms.toFixed(4) + '  p95=' + safe3label.p95_ms.toFixed(4) + '  p99=' + safe3label.p99_ms.toFixed(4) + '  max=' + safe3label.max_ms.toFixed(4));
L.push('  Blockiert (paypa1) 30.000      : median=' + blocked.median_ms.toFixed(4) + '  p95=' + blocked.p95_ms.toFixed(4) + '  p99=' + blocked.p99_ms.toFixed(4) + '  max=' + blocked.max_ms.toFixed(4));
L.push('  Langer Host (3x60 Zeichen) 1000: median=' + worstHost.median_ms.toFixed(4) + '  p95=' + worstHost.p95_ms.toFixed(4) + '  max=' + worstHost.max_ms.toFixed(4));
L.push('');
L.push('Speicher: RSS vor=' + (rssBefore / 1048576).toFixed(1) + ' MiB, nach=' + (rssAfter / 1048576).toFixed(1) + ' MiB, Delta=' + ((rssAfter - rssBefore) / 1048576).toFixed(1) + ' MiB (JIT/GC, kein Cache)');
L.push('');
L.push('Behauptung: "Performancebudget: < 1 ms Erkennungszeit pro URL" (Next.md Z.33)');
L.push('Befund: Median ' + mixed.median_ms.toFixed(3) + ' ms, p95 ' + mixed.p95_ms.toFixed(3) + ' ms (Laufspanne p95 ' + mixed.per_run_p95_min.toFixed(3) + '-' + mixed.per_run_p95_max.toFixed(3) + ' ms), p99 ' + mixed.p99_ms.toFixed(3) + ' ms');
L.push('Bewertung: ' + perf.claim_check.verdict + '. Kaltstart ' + coldStart.toFixed(3) + ' ms und Lastspitzen (' + 'max ' + mixed.max_ms.toFixed(3) + ' ms) kommen hinzu. Die Budgetaussage ist damit nur fuer den Median (und bei unbelasteter CPU evtl. fuer p95) haltbar, nicht generell.');
fs.writeFileSync(PERF_PATH, L.join('\n') + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 6) Ergebnisse konsolidieren und schreiben
// ---------------------------------------------------------------------------
const results = {
  meta: {
    audit: 'Antipisher 0.1 Alpha - Code-/Erkennungs-Audit (Teil Code)',
    generated_utc: new Date().toISOString(),
    command: 'node audit/code/run_corpus.cjs',
    node: process.version,
    cwd: ROOT,
    engine_sha256: sha256File(path.join(ROOT, 'shared', 'detector.js')),
    sites_sha256: sha256File(path.join(ROOT, 'shared', 'sites.js')),
    corpus_sha256: sha256File(CORPUS_PATH),
    corpus_version: corpus.meta.version,
    corpus_created_utc: corpus.meta.created_utc,
    note: 'Ist-Verhalten = shared/detector.js; Erwartungswerte = fachliche Ground Truth aus corpus.json.'
  },
  corpus_summary: corpusSummary,
  by_category: byCategory,
  false_negatives: failures.fn,
  false_positives: failures.fp,
  unexpected_skips: failures.unexpectedSkip,
  skip_mismatches: failures.skipMismatch,
  official_self_regression: {
    checked: officialChecked,
    failures: officialFailures,
    note: 'Alle offiziellen Domains aus shared/sites.js inkl. www./accounts.-Varianten muessen safe sein.'
  },
  data_quality: {
    brands: SITES.length,
    official_domains: SITES.reduce((a, s) => a + s.domains.length, 0),
    duplicate_domains: duplicateDomains,
    short_brands_typosquat_excluded: shortBrands,
    subdomain_official_domains: subdomainOfficialDomains,
    brand_label_mismatches: brandLabelMismatches,
    build_sites_py_matches_sites_100_json: buildSitesConsistent,
    build_sites_py_error: buildSitesError
  },
  source_identity: {
    version_sources: versionSources,
    license_is_agpl: licenseIsAgpl,
    docs_exist: docs,
    build_copies_in_sync: sync,
    manifest_audit: manifestAudit,
    static_analysis: staticAnalysis
  },
  performance: perf,
  entries: detail
};

fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 7) stdout-Summary
// ---------------------------------------------------------------------------
const pct = x => (x * 100).toFixed(1) + '%';
console.log('=====================================================================');
console.log(' ANTIPISHER 0.1 ALPHA - ADVERSARIALER KORPUS (AUDIT, READ-ONLY)');
console.log('=====================================================================');
console.log('Engine : shared/detector.js SHA256 ' + results.meta.engine_sha256.slice(0, 16) + '...');
console.log('Korpus : ' + corpusSummary.total + ' URLs (' + corpusSummary.expected.block + ' block / ' + corpusSummary.expected.safe + ' safe / ' + corpusSummary.expected.skip + ' skip), version ' + corpus.meta.version);
console.log('Ergebnis: ' + corpusSummary.passed + ' pass, ' + corpusSummary.failed + ' fail -> Pass-Rate ' + pct(corpusSummary.pass_rate));
console.log('');
console.log('False Negatives (erwartet block, nicht blockiert): ' + corpusSummary.false_negatives +
  ' / ' + corpusSummary.expected.block + ' = ' + pct(corpusSummary.false_negative_rate) +
  ' (hoch: ' + corpusSummary.false_negative_certainty.hoch + ', mittel: ' + corpusSummary.false_negative_certainty.mittel + ')');
console.log('False Positives (erwartet safe, blockiert): ' + corpusSummary.false_positives +
  ' / ' + corpusSummary.expected.safe + ' = ' + pct(corpusSummary.false_positive_rate) +
  ' (hoch: ' + corpusSummary.false_positive_certainty.hoch + ', mittel: ' + corpusSummary.false_positive_certainty.mittel + ')');
console.log('');
console.log('Top-20 False Negatives:');
for (const r of failures.fn.slice(0, 20)) console.log('  FN  ' + r.url.padEnd(46) + ' actual=' + r.actual + '  [' + r.category + ']');
if (failures.fn.length > 20) console.log('  ... ' + (failures.fn.length - 20) + ' weitere in results.json');
console.log('');
console.log('Alle False Positives:');
for (const r of failures.fp) console.log('  FP  ' + r.url.padEnd(46) + ' site=' + (r.site || '-') + ' reason=' + (r.reason || '-'));
console.log('');
console.log('Offizielle Selbstregression: ' + officialChecked + ' Checks, ' + officialFailures.length + ' Fehlschläge');
console.log('Datenqualität: ' + results.data_quality.brands + ' Marken, ' + results.data_quality.official_domains + ' Domains, ' +
  duplicateDomains.length + ' Duplikate, ' + shortBrands.length + ' Kurzmarken(<5), ' + brandLabelMismatches.length + ' Brand/Label-Mismatches, build_sites sync=' + buildSitesConsistent);
console.log('Manifeste: Chrome WAR guard.html=' + manifestAudit.chrome.guard_html_in_war + ', Firefox WAR=' + JSON.stringify(manifestAudit.firefox.web_accessible_resources) + ', FF-WAR-Gap=' + manifestAudit.firefox_war_gap);
console.log('DNR static: requestMethods=' + staticAnalysis.chrome_dnr_request_methods_line + ', regex-Längenlimit=' + staticAnalysis.chrome_allow_regex_length_limit + ', Fragment-Split=' + staticAnalysis.chrome_fragment_split_line);
console.log('');
console.log('Performance: median=' + perf.mixed_corpus_10k.median_ms.toFixed(3) + ' ms, p95=' + perf.mixed_corpus_10k.p95_ms.toFixed(3) +
  ' ms, p99=' + perf.mixed_corpus_10k.p99_ms.toFixed(3) + ' ms, max=' + perf.mixed_corpus_10k.max_ms.toFixed(3) +
  ' ms -> Behauptung "<1ms": ' + perf.claim_check.verdict);
console.log('Details: audit/code/results.json, audit/code/perf_results.txt');
console.log('Exitcode 0 (Auditlauf erfolgreich; Findings werden dokumentiert, nicht als Prozessfehler gewertet).');
process.exitCode = 0;
