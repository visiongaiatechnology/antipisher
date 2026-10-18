/*
 * Unabhaengiger Holdout-Runner (VERIFY_ONLY).
 * - fuehrt audit/verify/holdout/corpus.json gegen shared/detector.js aus
 * - prueft die veroeffentlichten Korpora (audit/code/corpus.json, audit/lead/lead_probe.cjs) nach
 * - belegt Overfitting-/Gaming-Muster in shared/detector.js
 * - prueft Datenintegritaet von shared/sites.js stichprobenartig + automatisiert
 * - misst Performance 10.000 classify-Aufrufe (Median/p95/p99) gegen Audit-Baseline
 * Schreibt NUR audit/verify/holdout/results.json und audit/verify/holdout/perf.txt.
 * Quellcode wird nicht veraendert.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = __dirname;
const ROOT = path.resolve(__dirname, '..', '..', '..');
require(path.join(ROOT, 'shared', 'sites.js'));
const d = require(path.join(ROOT, 'shared', 'detector.js'));
const SITES = globalThis.VGT_SITES;
const DETECTOR_PATH = path.join(ROOT, 'shared', 'detector.js');
const SITES_PATH = path.join(ROOT, 'shared', 'sites.js');
const sha256 = (p) => require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const stat = (p) => ({ sha256: sha256(p), size: fs.statSync(p).size, mtime_utc: fs.statSync(p).mtime.toISOString() });

// Snapshot des urspruenglichen Audit-Baselines (audit/code/results.json), aufgenommen VOR dem
// Overwrite durch einen anderen Agenten (Datei-mtime 2026-10-18T18:15:35+02:00, neuer Hash 1DE39BDB...).
const BASELINE_SNAPSHOT = {
  source: 'audit/code/results.json (Snapshot des Audit-Baselines)',
  captured_note: 'Snapshot wurde vom Verifier gelesen, BEVOR ein anderer Agent die Datei um 18:15:35 Ortszeit mit dem neuen Detektor neu erzeugte (Hash-Wechsel BA8CF8C2... -> 1DE39BDB...). Kein Git im Repo -> Snapshot ist der einzige Beleg des ALTEN Stands.',
  sha256: 'BA8CF8C2228CE3C3941773EF2E260B16099FA5BBC52AC7C520DE86884D8E55C2',
  size_bytes: 118733,
  engine_sha256: '41bf609836bb480af772413f3f775fe1c44b68a6a07670e3ee91b78ba597baf9',
  sites_sha256: 'c814babb52790eebe7aaa665bf708ff5adfa90f8d6b0ee8a594b8892f8b9451d',
  corpus_summary: {
    total: 184,
    expected: { block: 98, safe: 82, skip: 4 },
    passed: 124, failed: 60, pass_rate: 0.6739130434782609,
    false_negatives: 33, false_negatives_skipped: 0, false_negative_rate: 0.336734693877551,
    false_negative_certainty: { hoch: 30, mittel: 3 },
    false_positives: 27, false_positive_rate: 0.32926829268292684,
    false_positive_certainty: { hoch: 19, mittel: 8 },
    skipped_mismatches: 0,
  },
  by_category: [
    ['bait-combination', 22, 9, 13, 0], ['brand-collision-safe', 2, 0, 0, 2], ['brand-coverage-gap', 6, 0, 6, 0],
    ['edge-case', 11, 11, 0, 0], ['foreign-domain-in-host', 5, 5, 0, 0], ['free-hoster-tenant', 5, 5, 0, 0],
    ['generic-subdomain-policy', 2, 1, 1, 0], ['homoglyph-cyrillic', 6, 6, 0, 0], ['homoglyph-diacritic', 6, 0, 6, 0],
    ['homoglyph-greek-latin', 5, 5, 0, 0], ['idn-legit', 4, 4, 0, 0], ['leetspeak', 6, 6, 0, 0],
    ['legit-third-party-safe', 8, 8, 0, 0], ['long-url', 2, 2, 0, 0], ['multi-tenant-root-safe', 3, 0, 0, 3],
    ['official-brand-unlisted', 19, 0, 0, 19], ['official-reference-safe', 30, 30, 0, 0], ['punycode-homograph', 6, 6, 0, 0],
    ['punycode-legit-idn', 3, 3, 0, 0], ['short-brand-typosquat', 4, 0, 4, 0], ['two-edit-typosquat', 2, 0, 2, 0],
    ['typosquat-deletion-insertion', 5, 5, 0, 0], ['typosquat-substitution', 8, 8, 0, 0], ['typosquat-transposition', 6, 6, 0, 0],
    ['userinfo-deception', 5, 4, 1, 0], ['userinfo-substring-fp', 3, 0, 0, 3],
  ].map(([category, total, pass, fn, fp]) => ({ category, total, pass, fn, fp, fp_or_other: fp })),
  false_negatives: [
    'https://páypal.com/', 'https://paypál.com/', 'https://góogle.com/', 'https://ámazon.com/', 'https://micrósoft.com/', 'https://applé.com/',
    'https://paypalsupport.com/', 'https://secure-paypa1.com/', 'https://paypa1-login.com/', 'https://paypalverify.com/', 'https://netflixbilling.com/',
    'https://dhl-tracking.com/', 'https://sparkasse-sicherheit.de/', 'https://paypal-konto.de/', 'https://metamask-airdrop.com/', 'https://dhl-zoll.com/',
    'https://microsoft365-login.com/', 'https://amazonprime-login.com/', 'https://appleid-login.com/', 'https://paypal@evil.tld/', 'https://gmial.com/',
    'https://gmai.com/', 'https://gmail-login.com/', 'https://azure-login.com/', 'https://disneyplus-login.com/', 'https://alipay-login.com/',
    'https://vlsa.com/', 'https://v1sa.com/', 'https://wlse.com/', 'https://ubr.com/', 'https://arnazon.com/', 'https://rnicrosoft.com/', 'https://office.attacker.com/',
  ],
  false_positives: [
    'https://google.co.jp/', 'https://microsoft.co.jp/', 'https://ing.nl/', 'https://coinbase.de/', 'https://visa.fr/', 'https://sparkasse.at/',
    'https://google.com.mx/', 'https://google.com.ar/', 'https://amazon.se/', 'https://walmart.ca/', 'https://walmart.com.mx/', 'https://bestbuy.ca/',
    'https://vodafone.it/', 'https://dhl.co.uk/', 'https://chase.co.uk/', 'https://github.blog/', 'https://pinterest.co.uk/', 'https://microsoft.de/',
    'https://wikipedia.de/', 'https://hermes.com/', 'https://elster.com/', 'https://github.io/', 'https://vercel.app/', 'https://netlify.app/',
    'https://max.com@example.com/', 'https://testing.developer@example.com/', 'https://mixing.delivery@example.com/',
  ],
  performance: { mixed_n: 50000, mixed_median_ms: 0.2525, mixed_p95_ms: 0.6297, mixed_p99_ms: 0.9345, safe_2label_median_ms: 0.5973, safe_2label_p95_ms: 0.8989, cold_start_ms: 0.7714 },
};

const nowIso = () => new Date().toISOString();
const pct = (a, b) => (b === 0 ? null : +(100 * a / b).toFixed(2));

function classifyOne(c) {
  let v;
  try {
    v = d.classify(c.url);
  } catch (e) {
    v = { status: 'error', error: String(e && e.message || e) };
  }
  return {
    id: c.id,
    cat: c.cat || c.category,
    url: c.url,
    expect: c.expect || c.expected,
    conf: c.conf || c.certainty || null,
    note: c.note || '',
    status: v.status,
    action: v.action || null,
    score: v.score == null ? null : v.score,
    reason: v.reason || null,
    site: v.site || null,
    official: v.official || null,
    weight: v.weight == null ? null : v.weight,
  };
}

function evaluate(rows) {
  for (const r of rows) {
    r.pass = r.status === r.expect;
    r.fn = r.expect === 'block' && r.status !== 'block';
    r.fp = r.expect === 'safe' && r.status === 'block';
    r.skip_mismatch = r.expect === 'skip' && r.status !== 'skip';
  }
  const blockCases = rows.filter(r => r.expect === 'block');
  const safeCases = rows.filter(r => r.expect === 'safe');
  const skipCases = rows.filter(r => r.expect === 'skip');
  const fn = rows.filter(r => r.fn);
  const fp = rows.filter(r => r.fp);
  const other = rows.filter(r => !r.pass && !r.fn && !r.fp);
  const byCat = {};
  for (const r of rows) {
    const k = r.cat;
    if (!byCat[k]) byCat[k] = { category: k, total: 0, block: 0, safe: 0, skip: 0, pass: 0, fn: 0, fp: 0, other: 0 };
    const b = byCat[k];
    b.total++;
    b[r.expect]++;
    if (r.pass) b.pass++;
    if (r.fn) b.fn++;
    if (r.fp) b.fp++;
    if (!r.pass && !r.fn && !r.fp) b.other++;
  }
  const byCategory = Object.values(byCat).map(b => ({
    ...b,
    pass_rate_pct: pct(b.pass, b.total),
    fn_rate_pct: b.block ? pct(b.fn, b.block) : null,
    fp_rate_pct: b.safe ? pct(b.fp, b.safe) : null,
  })).sort((a, b) => (b.fn + b.fp) - (a.fn + a.fp) || a.category.localeCompare(b.category));
  const conf = {};
  for (const level of ['hoch', 'mittel']) {
    const sub = rows.filter(r => r.conf === level);
    conf[level] = {
      total: sub.length,
      block: sub.filter(r => r.expect === 'block').length,
      safe: sub.filter(r => r.expect === 'safe').length,
      fn: sub.filter(r => r.fn).length,
      fp: sub.filter(r => r.fp).length,
      fn_rate_pct: pct(sub.filter(r => r.fn).length, sub.filter(r => r.expect === 'block').length),
      fp_rate_pct: pct(sub.filter(r => r.fp).length, sub.filter(r => r.expect === 'safe').length),
    };
  }
  return {
    total: rows.length,
    pass: rows.filter(r => r.pass).length,
    fail: rows.filter(r => !r.pass).length,
    pass_rate_pct: pct(rows.filter(r => r.pass).length, rows.length),
    expected_block: blockCases.length,
    expected_safe: safeCases.length,
    expected_skip: skipCases.length,
    detected_block_on_block: blockCases.filter(r => r.status === 'block').length,
    fn: fn.length,
    fn_rate_pct: pct(fn.length, blockCases.length),
    fp: fp.length,
    fp_rate_pct: pct(fp.length, safeCases.length),
    other: other.length,
    detected_action_breakdown: {
      block: blockCases.filter(r => r.status === 'block' && r.action === 'block').length,
      warn: blockCases.filter(r => r.status === 'block' && r.action === 'warn').length,
      note: 'warn = nur Pfad-Ebene (action warn), d.h. Browser-UI-Warnung statt Redirect-Sperre',
    },
    detected_reason_breakdown: blockCases.reduce((acc, r) => {
      if (r.status === 'block') acc[r.reason || 'unknown'] = (acc[r.reason || 'unknown'] || 0) + 1;
      return acc;
    }, {}),
    tpr_pct: pct(blockCases.filter(r => r.status === 'block').length, blockCases.length),
    tnr_pct: pct(safeCases.filter(r => r.status === 'safe').length, safeCases.length),
    by_certainty: conf,
    by_category: byCategory,
    false_negatives: fn.map(r => ({ id: r.id, cat: r.cat, url: r.url, conf: r.conf, status: r.status, reason: r.reason, note: r.note })),
    false_positives: fp.map(r => ({ id: r.id, cat: r.cat, url: r.url, conf: r.conf, status: r.status, reason: r.reason, site: r.site, action: r.action, note: r.note })),
    other_failures: other.map(r => ({ id: r.id, cat: r.cat, url: r.url, expect: r.expect, status: r.status })),
  };
}

// ---------------------------------------------------------------- HOLD OUT ---
const corpus = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'corpus.json'), 'utf8'));
const holdoutRows = corpus.cases.map(classifyOne);
const holdout = evaluate(holdoutRows);

// ------------------------------------------------- veroeffentlichte Korpora ---
const audits = {};

// a) audit/code/corpus.json (184 URLs, Ground Truth des Code-Audits)
try {
  const pub = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'code', 'corpus.json'), 'utf8'));
  const pubRows = pub.entries.map(classifyOne);
  const ev = evaluate(pubRows);
  const currentResultsPath = path.join(ROOT, 'audit', 'code', 'results.json');
  const currentResults = JSON.parse(fs.readFileSync(currentResultsPath, 'utf8'));
  const currentResultsStat = stat(currentResultsPath);
  const oldFnSet = new Set(BASELINE_SNAPSHOT.false_negatives.map(u => u.replace(/\/$/, '')));
  const oldFpSet = new Set(BASELINE_SNAPSHOT.false_positives.map(u => u.replace(/\/$/, '')));
  const key = (u) => u.replace(/\/$/, '');
  const flips = pubRows.map(r => {
    const wasFn = oldFnSet.has(key(r.url));
    const wasFp = oldFpSet.has(key(r.url));
    const oldStatus = wasFn ? 'safe' : wasFp ? 'block' : r.expect;
    return {
      url: r.url, category: r.cat, expect: r.expect,
      old_status: oldStatus,
      new_status: r.status, new_reason: r.reason, pass: r.pass,
      fixed: oldStatus !== r.status,
    };
  });
  audits.audit_code_corpus = {
    source: 'audit/code/corpus.json (veroeffentlichter Audit-Korpus, NICHT Holdout)',
    corpus_sha256_current: sha256(path.join(ROOT, 'audit', 'code', 'corpus.json')),
    baseline_snapshot: {
      source: BASELINE_SNAPSHOT.source,
      sha256: BASELINE_SNAPSHOT.sha256,
      engine_sha256: BASELINE_SNAPSHOT.engine_sha256,
      summary: BASELINE_SNAPSHOT.corpus_summary,
      by_category: BASELINE_SNAPSHOT.by_category,
    },
    current_engine_sha256: sha256(DETECTOR_PATH),
    current_evaluation: ev,
    changed_vs_old: flips.filter(f => f.fixed).length,
    old_fail_now_pass: flips.filter(f => f.old_status !== f.expect && f.pass).length,
    old_fail_still_fail: flips.filter(f => f.old_status !== f.expect && !f.pass).map(f => ({ url: f.url, expected: f.expect, old: f.old_status, now: f.new_status })),
    old_false_negatives_fixed_now: pubRows.filter(r => oldFnSet.has(key(r.url))).map(r => ({ url: r.url, now: r.status, reason: r.reason, site: r.site })),
    old_false_positives_fixed_now: pubRows.filter(r => oldFpSet.has(key(r.url))).map(r => ({ url: r.url, now: r.status })),
    results_json_overwritten_during_verification: {
      file: 'audit/code/results.json',
      baseline_snapshot_sha256: BASELINE_SNAPSHOT.sha256,
      current_sha256: currentResultsStat.sha256,
      current_mtime_utc: currentResultsStat.mtime_utc,
      overwritten: currentResultsStat.sha256 !== BASELINE_SNAPSHOT.sha256,
      current_file_engine_sha256: currentResults.meta.engine_sha256,
      current_file_summary_after_rerun: currentResults.corpus_summary,
      cross_check_harness_vs_rerun: {
        verifier_measured: { total: ev.total, passed: ev.pass, fn: ev.fn, fp: ev.fp },
        other_agent_rerun: { total: currentResults.corpus_summary.total, passed: currentResults.corpus_summary.passed, fn: currentResults.corpus_summary.false_negatives, fp: currentResults.corpus_summary.false_positives },
        identical: ev.pass === currentResults.corpus_summary.passed && ev.fn === currentResults.corpus_summary.false_negatives && ev.fp === currentResults.corpus_summary.false_positives,
      },
    },
  };
} catch (e) {
  audits.audit_code_corpus = { error: String(e && e.message || e) };
}

// b) audit/lead/lead_probe.cjs (26 Safe- / 40 Block-Erwartungen; veroeffentlichter Claim 0/26 FP, 0/40 FN)
try {
  const leadSrc = fs.readFileSync(path.join(ROOT, 'audit', 'lead', 'lead_probe.cjs'), 'utf8');
  const grab = (name) => {
    const m = leadSrc.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);'));
    if (!m) throw new Error('Array ' + name + ' nicht gefunden');
    return Function('"use strict";return ' + m[1])();
  };
  const officialExpectedSafe = grab('officialExpectedSafe');
  const phishingExpectedBlock = grab('phishingExpectedBlock');
  const knownOfficialFromList = grab('knownOfficialFromList');
  const knownSpoofCaught = grab('knownSpoofCaught');
  const runList = (list) => list.map(u => groupUrl(u));
  function groupUrl(u) { const r = d.classify(u); return { url: u, status: r.status, reason: r.reason || null, site: r.site || null, action: r.action || null }; }
  const fpRows = runList(officialExpectedSafe);
  const fnRows = runList(phishingExpectedBlock);
  const okRows = runList(knownOfficialFromList);
  const spoofRows = runList(knownSpoofCaught);
  const leadResults = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'lead', 'lead_probe_results.json'), 'utf8'));
  audits.lead_probe = {
    source: 'audit/lead/lead_probe.cjs (veroeffentlichter Lead-Korpus, NICHT Holdout)',
    probe_sha256_current: require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'audit', 'lead', 'lead_probe.cjs'))).digest('hex'),
    probe_results_json_sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'audit', 'lead', 'lead_probe_results.json'))).digest('hex'),
    claimed: { official_fp: '0/26', phishing_fn: '0/40', source: 'Next.md:29,37,38,82,108; README.md:67,76' },
    measured: {
      official_expected_safe: fpRows.length,
      official_false_positives: fpRows.filter(r => r.status !== 'safe'),
      phishing_expected_block: fnRows.length,
      undetected_phishing: fnRows.filter(r => r.status !== 'block'),
      known_official_sanity_failures: okRows.filter(r => r.status !== 'safe'),
      known_spoof_sanity_failures: spoofRows.filter(r => r.status !== 'block'),
    },
    stored_results_claim: leadResults.totals,
  };
} catch (e) {
  audits.lead_probe = { error: String(e && e.message || e) };
}

// ------------------------------------------------------- Overfit-/Gaming ---
const detectorSrc = fs.readFileSync(DETECTOR_PATH, 'utf8');
const srcLines = detectorSrc.split(/\r?\n/);
const findLine = (needle, occurrence = 0) => {
  let seen = 0;
  for (let i = 0; i < srcLines.length; i++) {
    if (srcLines[i].includes(needle)) { if (seen === occurrence) return i + 1; seen++; }
  }
  return null;
};
const findRegex = (re) => {
  for (let i = 0; i < srcLines.length; i++) if (re.test(srcLines[i])) return i + 1;
  return null;
};
const corpusTokens = ['logln', 'l0gin', 'airdrop', 'deutschland', 'prime', 'inc', 'plus', 'express', 'customerservice', 'appleid', 'paypalcom', 'konto', 'sicherheit', 'zoll'];
const tuning = {
  published_corpus_tokens_in_baitword_set: corpusTokens.map(t => ({ token: t, line: findLine("'" + t + "'") })).filter(x => x.line),
  code_patterns: [
    { pattern: "startsWith(brand + 'com')", line: findLine("startsWith(brand + 'com')"), targets: 'audit/lead/lead_probe.cjs: paypalcom-login.com, paypalcom-verify.com' },
    { pattern: "startsWith(brand + 'de')", line: findLine("startsWith(brand + 'de')"), targets: 'Korpus-Muster Marke+de' },
    { pattern: 'ligature replace rn->m', line: findLine("replace(/rn/g, 'm')"), targets: 'audit/lead/lead_probe.cjs: arnazon.com, rnicrosoft.com' },
    { pattern: 'ligature replace vv->w', line: findLine("replace(/vv/g, 'w')"), targets: 'generisches Ligatur-Muster' },
    { pattern: 'ligature replace cl->d', line: findLine("replace(/cl/g, 'd')"), targets: 'generisches Ligatur-Muster' },
    { pattern: '4-Buchstaben l<->i-Regel', line: findRegex(/brand\.length === 4 && original\.length === 4/), targets: 'audit/code/corpus.json FN: vlsa.com, v1sa.com, wlse.com, ubr.com' },
    { pattern: 'Diakritika-Tabelle exakt á é í ó ú ý ...', line: findLine("'á':'a','é':'e','í':'i','ó':'o','ú':'u','ý':'y'"), targets: 'audit/code/corpus.json FN: páypal, paypál, góogle, ámazon, micrósoft, appl é - nur DIESE Diakritika wurden ergaenzt; ä/ö/ü/ë/ñ/å fehlen (Holdout: 8/8 FN)' },
    { pattern: 'Baitwort-Set Beginn (words)', line: findRegex(/const words = new Set\(\[/), targets: 'Korpus-Tokens logln/l0gin/airdrop/deutschland/prime/inc/plus/express/customerservice/appleid/konto/sicherheit/zoll' },
    { pattern: 'genericSubdomains set', line: findRegex(/const genericSubdomains = new Set/), targets: 'FP-Vermeidung generischer Markenwoerter' },
    { pattern: 'multiTenantSuffixes', line: findRegex(/const multiTenantSuffixes = \[/), targets: 'FP-Fix github.io/vercel.app/netlify.app' },
    { pattern: 'isDocOrBlog /blog/-Ausnahme', line: findLine('const isDocOrBlog'), targets: 'Evasion-Ausnahme im Pfad-Check' },
    { pattern: 'sensitiveActions Pfad-Check', line: findLine('const sensitiveActions'), targets: 'Pfad-/Query-Regel' },
  ],
};
// Minimalpaare: getuntes Korpusmuster vs. gleichartige, NICHT getunte Variante
const minimalPairs = [
  { pair: 'baitword_typo', tuned: 'https://paypal-logln.com/', untuned: 'https://paypal-logni.com/' },
  { pair: 'baitword_leet', tuned: 'https://paypal-l0gin.com/', untuned: 'https://paypal-l0qin.com/' },
  { pair: 'baitword_inc', tuned: 'https://paypal-inc.com/', untuned: 'https://paypal-gmbh.com/' },
  { pair: 'baitword_express', tuned: 'https://paypal-express.com/', untuned: 'https://paypal-bonus.com/' },
  { pair: 'baitword_deutschland', tuned: 'https://amazon-deutschland.com/', untuned: 'https://amazon-oesterreich.com/' },
  { pair: 'brand_com_prefix', tuned: 'https://paypalcom-verify.com/', untuned: 'https://paypalcom-rechnung.com/' },
  { pair: 'ligature_rn', tuned: 'https://arnazon.com/', untuned: 'https://arnazon-login.com/' },
  { pair: 'l_i_4letters', tuned: 'https://vlsa.com/', untuned: 'https://lng.de/' },
  { pair: 'concat_customerservice', tuned: 'https://paypalcustomerservice.com/', untuned: 'https://paypalkundenservice.com/' },
].map(p => {
  const a = d.classify(p.tuned);
  const b = d.classify(p.untuned);
  return {
    pair: p.pair,
    tuned: { url: p.tuned, status: a.status, reason: a.reason || null },
    untuned: { url: p.untuned, status: b.status, reason: b.reason || null },
    overfit_signal: a.status !== b.status,
  };
});
// Alte FN (Audit-Baseline-Snapshot) -> heutiger Status, mit Mechanismus-Zuordnung
const oldFnFix = BASELINE_SNAPSHOT.false_negatives.map(url => {
  const r = d.classify(url);
  return { url, old: 'safe', now: r.status, reason: r.reason || null, site: r.site || null, fixed: r.status === 'block' };
});
// Alte FP (Audit-Baseline-Snapshot) -> heutiger Status; wurde der FP durch exakte Domain-Listung gefixt?
const allDomainsForFix = SITES.flatMap(s => s.domains);
const oldFpFix = BASELINE_SNAPSHOT.false_positives.map(url => {
  const host = new URL(url).hostname.toLowerCase();
  const listed = allDomainsForFix.some(dom => host === dom || host.endsWith('.' + dom));
  const r = d.classify(url);
  return { url, old: 'block', now: r.status, host_listed_now: listed, fixed: r.status === 'safe' };
});
// ------------------------------------------------ Datenintegritaet sites.js ---
const allDomains = SITES.flatMap(s => s.domains);
const multiTenant = ['github.io', 'gitlab.io', 'pages.dev', 'vercel.app', 'webflow.io', 'netlify.app', 'firebaseapp.com', 'blogspot.com', 'wordpress.com', 'myshopify.com', 'azurewebsites.net', 'cloudfront.net', 's3.amazonaws.com'];
const listedMultiTenantRoots = allDomains.filter(dom => multiTenant.includes(dom));
const listedUnderMultiTenant = [];
for (const s of SITES) for (const dom of s.domains) if (multiTenant.some(suf => dom.endsWith('.' + suf))) listedUnderMultiTenant.push({ brand: s.name, domain: dom });
const brandMismatchCandidates = [];
for (const s of SITES) for (const dom of s.domains) {
  const compact = dom.replace(/\./g, '');
  const brand = s.brand;
  const base = dom.split('.').slice(0, -1).join('');
  if (!compact.includes(brand) && !brand.includes(base)) brandMismatchCandidates.push({ brand: s.name, domain: dom });
}
const dataIntegrity = {
  brands: SITES.length,
  domains: allDomains.length,
  unique_domains: new Set(allDomains).size,
  duplicate_domains: allDomains.filter((x, i) => allDomains.indexOf(x) !== i),
  brands_without_domains: SITES.filter(s => !s.domains || s.domains.length === 0).map(s => s.name),
  multi_tenant_roots_listed_as_official: listedMultiTenantRoots,
  official_entries_under_multi_tenant_suffix: listedUnderMultiTenant,
  alias_domains_whose_base_differs_from_brand: brandMismatchCandidates,
  sample_audit: [
    { domain: 'hermes.com', brand_listed_as: 'Hermes', assessment: 'FALSCHE MARKE: hermes.com gehoert Hermes Paris (Luxusmode); der Paketdienst nutzt myhermes.de/hermesworld.com. Fachliche Bewertung, extern nicht abschliessend verifiziert.', risk: 'data_error_low_user_risk', confidence: 'mittel' },
    { domain: 'elster.com', brand_listed_as: 'Elster', assessment: 'FALSCHE MARKE: elster.com ist Elster Group (Messtechnik); das deutsche Steuerportal ist elster.de. Fachliche Bewertung, extern nicht abschliessend verifiziert.', risk: 'data_error_low_user_risk', confidence: 'mittel' },
    { domain: 'force.com', brand_listed_as: 'Salesforce', assessment: 'MULTI-TENANT: Salesforce Sites/Communities-Kundenhosting auf *.force.com -> Tenants kundenseitig befuellbar und werden per withinDomain als safe freigegeben', risk: 'fail_open_user_controlled', confidence: 'hoch' },
    { domain: 'salesforce.com', brand_listed_as: 'Salesforce', assessment: 'MULTI-TENANT: *.my.salesforce.com sind kundenkontrollierte Org-Tenants; Whitelist deckt alle Subdomains ab', risk: 'fail_open_user_controlled', confidence: 'hoch' },
    { domain: 'google.github.io', brand_listed_as: 'Google', assessment: 'DRITT-PLATTFORM: GitHub-Pages-Seite eines GitHub-Kontos; Content durch Konto/Repo kontrolliert, aber als offizielle Markendomain gelistet', risk: 'third_party_content', confidence: 'hoch' },
    { domain: 'microsoft.github.io', brand_listed_as: 'Microsoft', assessment: 'DRITT-PLATTFORM: GitHub Pages unter Microsoft-Konto; Content-/Konto-Kompromittierung wuerde gesamte Domain als Marke freigeben', risk: 'third_party_content', confidence: 'hoch' },
    { domain: 'facebook.github.io', brand_listed_as: 'Facebook', assessment: 'DRITT-PLATTFORM: GitHub Pages unter Facebook-Konto; gleiche Risikoklasse', risk: 'third_party_content', confidence: 'hoch' },
    { domain: 'github.io', brand_listed_as: 'GitHub', assessment: 'PLATTFORM-ROOT als offizielle Domain gelistet; Subdomains durch multiTenantSuffixes von withinDomain ausgenommen -> Risiko begrenzt', risk: 'platform_root_low', confidence: 'hoch' },
    { domain: 'vercel.app', brand_listed_as: 'Vercel', assessment: 'PLATTFORM-ROOT als offizielle Domain; Tenants nicht erfasst (multiTenantSuffixes schuetzt)', risk: 'platform_root_low', confidence: 'hoch' },
    { domain: 'netlify.app', brand_listed_as: 'Netlify', assessment: 'PLATTFORM-ROOT als offizielle Domain; Tenants nicht erfasst', risk: 'platform_root_low', confidence: 'hoch' },
    { domain: 'wordpress.com', brand_listed_as: 'WordPress.com', assessment: 'PLATTFORM-ROOT als offizielle Domain; Subdomains durch multiTenantSuffixes ausgenommen', risk: 'platform_root_low', confidence: 'hoch' },
    { domain: 'gls.de', brand_listed_as: 'GLS', assessment: 'KOLLISION: GLS Bank (gls.de) vs. GLS Paketdienst (gls-group.com/gls-pakete.de); Audit-Baseline hat den Konflikt bereits dokumentiert', risk: 'ambiguous_owner', confidence: 'mittel' },
    { domain: 't-online.de', brand_listed_as: 'Telekom', assessment: 'Brand-Zuordnung veraltet (Portal heute Ströer/Telekom); Domain nicht user-kontrollierbar', risk: 'stale_mapping_low', confidence: 'mittel' },
    { domain: 'db.com', brand_listed_as: 'Deutsche Bank', assessment: 'Deutsche-Bank-Kurzdomain (plausibel); kein Multi-Tenant', risk: 'ok', confidence: 'mittel' },
    { domain: 'vr.de', brand_listed_as: 'Volksbank Raiffeisenbank', assessment: 'Dachdomain VR/Atruvia; Subdomains nicht frei registrierbar', risk: 'ok', confidence: 'mittel' },
    { domain: 'bund.de', brand_listed_as: 'BundID', assessment: 'Bundesverwaltungsroot; jede *.bund.de-Subdomain wird als safe behandelt (breit, aber staatlich kontrolliert)', risk: 'broad_but_trusted', confidence: 'hoch' },
    { domain: 'gov.uk', brand_listed_as: 'Gov.uk', assessment: 'UK-Regierungsroot; Registrierung beschraenkt', risk: 'broad_but_trusted', confidence: 'hoch' },
    { domain: 'live.com', brand_listed_as: 'Microsoft', assessment: 'Microsoft-Verbraucherdomain (plausibel)', risk: 'ok', confidence: 'mittel' },
    { domain: 'googleapis.com', brand_listed_as: 'Google', assessment: 'Google-API-Infrastruktur (plausibel)', risk: 'ok', confidence: 'mittel' },
    { domain: 'myhermes.de', brand_listed_as: 'Hermes', assessment: 'offizielle Hermes-Paketdomain (plausibel)', risk: 'ok', confidence: 'mittel' },
    { domain: 'icloud.com', brand_listed_as: 'Apple', assessment: 'Apple-Dienstdomain (plausibel)', risk: 'ok', confidence: 'hoch' },
    { domain: 'block.xyz', brand_listed_as: 'Square (Block)', assessment: 'Block Inc. Markendomain (plausibel)', risk: 'ok', confidence: 'mittel' },
    { domain: 'ir.bund.de', brand_listed_as: 'BundID', assessment: 'nicht gelistet; *.bund.de ohnehin via bund.de abgedeckt', risk: 'n/a' },
  ],
  wildcard_risk_count: listedUnderMultiTenant.length + 2,
  baseline_audit_counts: {
    brands: 165, domains: 257,
    sources: ['audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md:5 ("165 Marken / 257 Domains")', 'audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md:212', 'audit/code/CODE_REVIEW.md:10'],
    current_brands: SITES.length, current_domains: allDomains.length,
    delta_brands: SITES.length - 165, delta_domains: allDomains.length - 257,
    brand_delta_note: 'Audit-Baseline nennt als fehlend: Gmail, Azure, Disney+, Alipay (CODE_REVIEW:162,243,584; Plan:130,216). Genau diese 4 Marken sind neu (165 -> 169).',
  },
  build_data_consistency: (() => {
    try {
      const sitesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites-100.json'), 'utf8'));
      return {
        sites_100_json_equals_runtime_sites: JSON.stringify(sitesJson) === JSON.stringify(SITES),
        build_sites_docstring_still_140_plus: /140\+/.test(fs.readFileSync(path.join(ROOT, 'build_sites.py'), 'utf8')),
        filename_sites_100_json_but_brands: { filename: 'sites-100.json', brands: SITES.length },
        finding: 'build_sites.py-Docstring ("140+") und Dateiname sites-100.json (169 Marken) sind weiterhin irrefuehrend (Audit-Befund nicht behoben); Inhalt ist konsistent.',
      };
    } catch (e) { return { error: String(e && e.message || e) }; }
  })(),
  whitelist_fail_open_evidence: {
    live_holdout_cases: ['https://evil.force.com/paypal/login', 'https://evil.my.salesforce.com/paypal/login', 'https://tenant.anything.force.com/login'],
    behaviour: 'alle drei werden durch die offizielle Domain-Listung (force.com/salesforce.com) als safe freigegeben -> Holdout-FN',
  },
};

// ---------------------------------------------- Artefakt-/Prozessintegritaet ---
const ARTIFACT_PATHS = [
  'shared/detector.js', 'shared/sites.js', 'shared/shield-content.js',
  'tests/detector.test.cjs', 'tests/v2-scoring.test.cjs', 'tests/shield-content.test.cjs',
  'tests/chrome-worker.test.cjs', 'tests/firefox-worker.test.cjs',
  'audit/lead/lead_probe.cjs', 'audit/lead/lead_probe_results.json',
  'audit/code/corpus.json', 'audit/code/results.json', 'audit/code/run_corpus.cjs',
  'build_sites.py', 'sites-100.json',
  'chrome/shared/detector.js', 'chrome/shared/sites.js',
  'firefox/shared/detector.js', 'firefox/shared/sites.js',
];
const artifactStats = {};
for (const rel of ARTIFACT_PATHS) artifactStats[rel] = stat(path.join(ROOT, rel));
let auditStaticHashes = {};
try {
  const ss = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'security', 'probes', 'results', 'static_scan.json'), 'utf8'));
  for (const item of ss.inventory || []) auditStaticHashes[item.path] = item.sha256;
} catch { /* ignore */ }
const artifactIntegrity = {
  note: 'Hash-/mtime-Belege fuer Overfitting-/Gaming-Pruefung; Quellcode wurde vom Verifier NICHT veraendert.',
  artifacts: artifactStats,
  audit_time_hashes_from_static_scan: {
    'shared/detector.js': auditStaticHashes['shared/detector.js'] || null,
    'shared/sites.js': auditStaticHashes['shared/sites.js'] || null,
    'tests/detector.test.cjs': auditStaticHashes['tests/detector.test.cjs'] || null,
    'tests/chrome-worker.test.cjs': auditStaticHashes['tests/chrome-worker.test.cjs'] || null,
    'build_sites.py': auditStaticHashes['build_sites.py'] || null,
    'sites-100.json': auditStaticHashes['sites-100.json'] || null,
  },
  comparisons: [
    { file: 'tests/detector.test.cjs', audit_time_sha256: auditStaticHashes['tests/detector.test.cjs'] || null, current_sha256: artifactStats['tests/detector.test.cjs'].sha256, unchanged_since_audit: artifactStats['tests/detector.test.cjs'].sha256 === (auditStaticHashes['tests/detector.test.cjs'] || null), note: 'Testdatei wurde nach der Remediation NICHT veraendert (Hash identisch zum Audit-Zeitpunkt).' },
    { file: 'shared/detector.js', audit_time_sha256: auditStaticHashes['shared/detector.js'] || null, current_sha256: artifactStats['shared/detector.js'].sha256, unchanged_since_audit: artifactStats['shared/detector.js'].sha256 === (auditStaticHashes['shared/detector.js'] || null), note: 'Detektor wurde nach dem Audit ersetzt (erwartet).' },
    { file: 'shared/sites.js', audit_time_sha256: auditStaticHashes['shared/sites.js'] || null, current_sha256: artifactStats['shared/sites.js'].sha256, unchanged_since_audit: artifactStats['shared/sites.js'].sha256 === (auditStaticHashes['shared/sites.js'] || null), note: 'Marken-DB wurde nach dem Audit ersetzt (erwartet).' },
    { file: 'tests/chrome-worker.test.cjs', audit_time_sha256: auditStaticHashes['tests/chrome-worker.test.cjs'] || null, current_sha256: artifactStats['tests/chrome-worker.test.cjs'].sha256, unchanged_since_audit: artifactStats['tests/chrome-worker.test.cjs'].sha256 === (auditStaticHashes['tests/chrome-worker.test.cjs'] || null) },
    { file: 'build_sites.py', audit_time_sha256: auditStaticHashes['build_sites.py'] || null, current_sha256: artifactStats['build_sites.py'].sha256, unchanged_since_audit: artifactStats['build_sites.py'].sha256 === (auditStaticHashes['build_sites.py'] || null), note: 'build_sites.py wurde nach dem Audit erweitert (169 Marken).' },
  ],
  timeline: {
    detector_js_mtime_utc: artifactStats['shared/detector.js'].mtime_utc,
    sites_js_mtime_utc: artifactStats['shared/sites.js'].mtime_utc,
    shield_content_mtime_utc: artifactStats['shared/shield-content.js'].mtime_utc,
    tests_detector_mtime_utc: artifactStats['tests/detector.test.cjs'].mtime_utc,
    lead_probe_cjs_mtime_utc: artifactStats['audit/lead/lead_probe.cjs'].mtime_utc,
    lead_probe_results_mtime_utc: artifactStats['audit/lead/lead_probe_results.json'].mtime_utc,
    audit_corpus_mtime_utc: artifactStats['audit/code/corpus.json'].mtime_utc,
    audit_results_mtime_utc: artifactStats['audit/code/results.json'].mtime_utc,
    v2_scoring_test_mtime_utc: artifactStats['tests/v2-scoring.test.cjs'].mtime_utc,
    shield_test_mtime_utc: artifactStats['tests/shield-content.test.cjs'].mtime_utc,
    findings: [
      'audit/lead/lead_probe.cjs mtime 17:20:07 liegt VOR der Remediation von detector.js (18:07:12) -> Probe-Korpus wurde nicht nachtraeglich an den neuen Detektor angepasst (nur sein results.json wurde 18:11:54 neu erzeugt).',
      'tests/detector.test.cjs mtime 17:08:09 und SHA256 identisch zum Audit-Zeitpunkt -> unveraendert.',
      'tests/v2-scoring.test.cjs wurde 18:07:17 erzeugt, 5 Sekunden nach detector.js (18:07:12) -> Tests wurden NACH der Implementierung geschrieben und testen exakt die neu eingebauten Features (Fixture-Fitting, kein test-first).',
      'tests/shield-content.test.cjs 18:08:00, 11 Sekunden nach shield-content.js (18:07:49) -> gleiches Muster.',
      'audit/code/results.json wurde waehrend der Verifikation (18:15:35) von einem anderen Agenten mit dem neuen Detektor neu erzeugt; der alte Baseline-Stand (Hash BA8CF8C2..., 33 FN/27 FP) wurde dadurch ueberschrieben. Kein Git -> Audit-Evidenz ist nicht schreibgeschuetzt/reproduzierbar.',
    ],
  },
  test_ledger: {
    command: 'node --test <einzelne Testdatei> (5 Dateien einzeln; node --test tests/ schlaegt unter PowerShell wegen Verzeichnis-Glob fehl - bereits in Audit-Baseline dokumentiert)',
    files: [
      { file: 'tests/detector.test.cjs', tests: 10, pass: 10 },
      { file: 'tests/chrome-worker.test.cjs', tests: 2, pass: 2 },
      { file: 'tests/firefox-worker.test.cjs', tests: 2, pass: 2 },
      { file: 'tests/shield-content.test.cjs', tests: 3, pass: 3 },
      { file: 'tests/v2-scoring.test.cjs', tests: 4, pass: 4 },
    ],
    total: 21, pass: 21, fail: 0,
    note: 'Baseline 13/13 (Audit) + 8 neue Tests im Remediation-Kontext = 21/21. Die 8 neuen Tests sind Feature-Tests der neu eingebauten Mechanismen.',
  },
};


// ------------------------------------------------------------------ Performance ---
function stats(samples) {
  const arr = samples.slice().sort((a, b) => a - b);
  const at = q => arr[Math.min(arr.length - 1, Math.floor(q * (arr.length - 1)))];
  const sum = arr.reduce((a, b) => a + b, 0);
  return { n: arr.length, min_ms: +arr[0].toFixed(4), median_ms: +at(0.5).toFixed(4), mean_ms: +(sum / arr.length).toFixed(4), p95_ms: +at(0.95).toFixed(4), p99_ms: +at(0.99).toFixed(4), max_ms: +arr[arr.length - 1].toFixed(4) };
}
const perfUrls = corpus.cases.map(c => c.url).filter(u => { try { new URL(u); return true; } catch { return false; } });
const safePerfUrls = corpus.cases.filter(c => c.expect === 'safe').map(c => c.url);
function measureSeries(urls, reps) {
  const runs = [];
  const all = [];
  for (let r = 0; r < reps; r++) {
    const per = new Array(10000);
    for (let i = 0; i < 10000; i++) {
      const t0 = process.hrtime.bigint();
      d.classify(urls[i % urls.length]);
      per[i] = Number(process.hrtime.bigint() - t0) / 1e6;
    }
    const s = stats(per);
    s.total_ms = +per.reduce((a, b) => a + b, 0).toFixed(2);
    runs.push(s);
    for (const x of per) all.push(x);
  }
  return { reps, iterations_per_rep: 10000, total_samples: all.length, aggregate: stats(all), per_run: runs, per_run_median_min_max: [Math.min(...runs.map(x => x.median_ms)), Math.max(...runs.map(x => x.median_ms))], per_run_p95_min_max: [Math.min(...runs.map(x => x.p95_ms)), Math.max(...runs.map(x => x.p95_ms))] };
}
for (let i = 0; i < 500; i++) d.classify(perfUrls[i % perfUrls.length]); // Warmup
const coldStart = (() => { const t0 = process.hrtime.bigint(); d.classify(perfUrls[0]); return +(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(4); })();
const mixed = measureSeries(perfUrls, 7);
const safeOnly = measureSeries(safePerfUrls, 3);
const blockedUrls = corpus.cases.filter(c => c.expect === 'block').map(c => c.url);
const blocked = measureSeries(blockedUrls, 3);
// Apples-to-apples-Messreihe auf dem veroeffentlichten 184-URL-Audit-Korpus (dort wurde die Baseline erhoben)
const pubPerfUrls = (() => {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'code', 'corpus.json'), 'utf8'));
    return p.entries.map(e => e.url);
  } catch { return perfUrls; }
})();
for (let i = 0; i < 500; i++) d.classify(pubPerfUrls[i % pubPerfUrls.length]);
const publishedMix = measureSeries(pubPerfUrls, 7);
const baseline = { median_ms: 0.506, p95_ms: 2.58, source: 'audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md:344 (Audit-Baseline)' };
const medianOf = (vals) => { const v = vals.slice().sort((a, b) => a - b); const m = Math.floor(v.length / 2); return +(v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2).toFixed(4); };
const robustSeries = (s) => ({
  median_of_run_medians_ms: medianOf(s.per_run.map(r => r.median_ms)),
  median_of_run_p95_ms: medianOf(s.per_run.map(r => r.p95_ms)),
  min_run_median_ms: Math.min(...s.per_run.map(r => r.median_ms)),
  max_run_median_ms: Math.max(...s.per_run.map(r => r.median_ms)),
  min_run_p95_ms: Math.min(...s.per_run.map(r => r.p95_ms)),
  max_run_p95_ms: Math.max(...s.per_run.map(r => r.p95_ms)),
});
const interpRobust = (r) => ({
  median_vs_baseline: +(r.median_of_run_medians_ms - baseline.median_ms).toFixed(4),
  p95_vs_baseline: +(r.median_of_run_p95_ms - baseline.p95_ms).toFixed(4),
  median_under_baseline: r.median_of_run_medians_ms <= baseline.median_ms,
  p95_under_baseline: r.median_of_run_p95_ms <= baseline.p95_ms,
});
const robust = { mixed_holdout: robustSeries(mixed), published_corpus: robustSeries(publishedMix), safe_only: robustSeries(safeOnly), blocked_only: robustSeries(blocked) };
const performance = {
  environment: { node: process.version, platform: process.platform, cpus: require('node:os').cpus().length, cpu_model: require('node:os').cpus()[0].model, measured_utc: nowIso() },
  methodology: 'process.hrtime.bigint je Einzelaufruf; Warmup 500; je Wiederholung 10.000 classify-Aufrufe, Round-Robin ueber die URLs; keine Netz-/FS-Zugriffe im Messpfad. WICHTIG: Messung lief unter paralleler Last anderer Team-Agenten (12 logische Kerne geteilt) -> Streuung zwischen Wiederholungen; daher robuste Kennwerte als Median der Wiederholungslaeufe plus Min/Max-Range (kein Cherry-Picking, alle Rohwerte enthalten).',
  cold_start_ms: coldStart,
  mixed_holdout_10k: { ...mixed, robust: robust.mixed_holdout, comparison: interpRobust(robust.mixed_holdout) },
  published_corpus_mix_10k: { ...publishedMix, robust: robust.published_corpus, comparison: interpRobust(robust.published_corpus) },
  safe_only_10k: { ...safeOnly, robust: robust.safe_only, comparison: interpRobust(robust.safe_only) },
  blocked_only_10k: { ...blocked, robust: robust.blocked_only, comparison: interpRobust(robust.blocked_only) },
  audit_baseline: baseline,
  verdict: interpRobust(robust.published_corpus).median_under_baseline && interpRobust(robust.published_corpus).p95_under_baseline
    ? 'AUF DEM VEROEFFENTLICHTEN 184-URL-KORPUS BESTAETIGT (robuster Median + p95 unter Baseline); auf dem unabhaengigen Holdout-Mix Median ' + interpRobust(robust.mixed_holdout).median_vs_baseline + ' ms UEBER / p95 ' + interpRobust(robust.mixed_holdout).p95_vs_baseline + ' ms gegen Baseline -> "<1 ms" nur als Median, nicht als p95, und nicht auf adversarialem Mix bestaetigt'
    : 'ABWEICHUNG: Messung ueber Audit-Baseline in mindestens einem Kennwert',
};

const perfTxt = [
  'Antipisher 0.1 - unabhaengige Perfmessung Holdout-Verifier',
  'Datum: ' + nowIso(),
  'Node: ' + process.version + ' | Plattform: ' + process.platform + ' | CPUs: ' + performance.environment.cpus + ' | CPU: ' + performance.environment.cpu_model,
  '',
  'Methodik: process.hrtime.bigint pro Einzelaufruf; 500 Warmup-Aufrufe; je Wiederholung 10.000 classify-Aufrufe',
  'Round-Robin ueber die URLs; keine Netz-/Dateisystemzugriffe im Messpfad.',
  'Hinweis: Messung unter paralleler Last anderer Team-Agenten (12 logische Kerne geteilt) -> Streuung;',
  'deshalb robuste Kennwerte = Median der Wiederholungslaeufe, zusaetzlich Min/Max-Range und gepoolte Aggregate.',
  '',
  'Kaltstart (erster classify-Aufruf nach Modulladen): ' + coldStart + ' ms',
  '',
  'A) Gemischt (Holdout, ' + mixed.reps + ' x 10.000 = ' + mixed.total_samples + ' Proben):',
  '  robust: Median der Run-Mediane ' + robust.mixed_holdout.median_of_run_medians_ms + ' ms | Median der Run-p95 ' + robust.mixed_holdout.median_of_run_p95_ms + ' ms',
  '  Range  Mediane ' + robust.mixed_holdout.min_run_median_ms + ' - ' + robust.mixed_holdout.max_run_median_ms + ' ms | p95 ' + robust.mixed_holdout.min_run_p95_ms + ' - ' + robust.mixed_holdout.max_run_p95_ms + ' ms',
  '  gepoolt: Median ' + mixed.aggregate.median_ms + ' ms, p95 ' + mixed.aggregate.p95_ms + ' ms, p99 ' + mixed.aggregate.p99_ms + ' ms, mean ' + mixed.aggregate.mean_ms + ' ms, max ' + mixed.aggregate.max_ms + ' ms',
  '  per-Run Mediane: ' + mixed.per_run.map(r => r.median_ms).join(' / '),
  '  per-Run p95:     ' + mixed.per_run.map(r => r.p95_ms).join(' / '),
  '  vs Audit-Baseline 0,506 ms Median / 2,58 ms p95:',
  '    robuster Median ' + (interpRobust(robust.mixed_holdout).median_under_baseline ? 'UNTER' : 'UEBER') + ' Baseline (Differenz ' + interpRobust(robust.mixed_holdout).median_vs_baseline + ' ms)',
  '    robuster p95    ' + (interpRobust(robust.mixed_holdout).p95_under_baseline ? 'UNTER' : 'UEBER') + ' Baseline (Differenz ' + interpRobust(robust.mixed_holdout).p95_vs_baseline + ' ms)',
  '',
  'B) Apples-to-apples: veroeffentlichter 184-URL-Audit-Korpus (' + publishedMix.reps + ' x 10.000 = ' + publishedMix.total_samples + ' Proben):',
  '  robust: Median der Run-Mediane ' + robust.published_corpus.median_of_run_medians_ms + ' ms | Median der Run-p95 ' + robust.published_corpus.median_of_run_p95_ms + ' ms',
  '  Range  Mediane ' + robust.published_corpus.min_run_median_ms + ' - ' + robust.published_corpus.max_run_median_ms + ' ms | p95 ' + robust.published_corpus.min_run_p95_ms + ' - ' + robust.published_corpus.max_run_p95_ms + ' ms',
  '  gepoolt: Median ' + publishedMix.aggregate.median_ms + ' ms, p95 ' + publishedMix.aggregate.p95_ms + ' ms, p99 ' + publishedMix.aggregate.p99_ms + ' ms',
  '  Baseline 0,506 / 2,58: robuster Median ' + (interpRobust(robust.published_corpus).median_under_baseline ? 'UNTER' : 'UEBER') + ', robuster p95 ' + (interpRobust(robust.published_corpus).p95_under_baseline ? 'UNTER' : 'UEBER') + ' Baseline',
  '',
  'C) Nur erwartete safe-URLs (3 x 10.000): robust Median ' + robust.safe_only.median_of_run_medians_ms + ' ms / p95 ' + robust.safe_only.median_of_run_p95_ms + ' ms; gepoolt Median ' + safeOnly.aggregate.median_ms + ' ms, p95 ' + safeOnly.aggregate.p95_ms + ' ms',
  'D) Nur erwartete block-URLs (3 x 10.000): robust Median ' + robust.blocked_only.median_of_run_medians_ms + ' ms / p95 ' + robust.blocked_only.median_of_run_p95_ms + ' ms; gepoolt Median ' + blocked.aggregate.median_ms + ' ms, p95 ' + blocked.aggregate.p95_ms + ' ms',
  '',
  'Hinweis: Audit-Baseline stammt aus dem Gesamtaudit (audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md:344,',
  'Median 0,506 ms / p95 2,580 ms, dort ebenfalls unter paralleler Audit-Last erhoben).',
  'Der urspruengliche Audit-Lauf (audit/code/results.json, inzwischen von einem anderen Agenten ueberschrieben)',
  'nennt fuer den 184-URL-Mix Median 0,2525 ms / p95 0,6297 ms (abweichende Methodik/Messaufbau).',
  'Wiederholte Vollaeufe dieses Runners zeigten unter Team-Last Streuung (z.B. Holdout-Median 0,61 - 0,85 ms,',
  'p95 1,12 - 4,28 ms); deshalb sind die robusten Median-Kennwerte und die Range die belastbare Aussage.',
  '',
  'FAZIT: ' + performance.verdict,
  '',
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'perf.txt'), perfTxt, 'utf8');

// --------------------------------------------------------------------- Output ---
const results = {
  meta: {
    audit: 'Unabhaengige Holdout-Verifikation Antipisher 0.1 (Detektor-Generaliserung/Overfitting)',
    generated_utc: nowIso(),
    node: process.version,
    cwd: ROOT,
    mode: 'VERIFY_ONLY (kein Quellcode geaendert)',
    holdout_corpus: 'audit/verify/holdout/corpus.json',
    detector_sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(DETECTOR_PATH)).digest('hex'),
    detector_mtime_utc: fs.statSync(DETECTOR_PATH).mtime.toISOString(),
    sites_sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(SITES_PATH)).digest('hex'),
    sites_mtime_utc: fs.statSync(SITES_PATH).mtime.toISOString(),
    tests_detector_sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'tests', 'detector.test.cjs'))).digest('hex'),
    tests_detector_mtime_utc: fs.statSync(path.join(ROOT, 'tests', 'detector.test.cjs')).mtime.toISOString(),
    claims_under_test: [
      '"0/26 False Positives, 0/40 False Negatives (100% Trefferquote)" - Next.md:29,82; README.md:67,76',
      '"21/21 Unit-Tests" - Next.md:108',
      '"169 Marken / 339 Domains" - Next.md TASK-03, shared/sites.js',
      '"<1 ms" Perf-Claim - Next.md; Audit-Baseline 0,506 ms Median / 2,58 ms p95',
    ],
  },
  holdout: {
    corpus_meta: corpus.meta,
    counts: corpus.counts,
    evaluation: holdout,
  },
  published_claims_check: audits,
  artifact_integrity: artifactIntegrity,
  overfit_evidence: {
    baseline_identity: {
      old_engine_sha256: BASELINE_SNAPSHOT.engine_sha256,
      old_sites_sha256: BASELINE_SNAPSHOT.sites_sha256,
      current_engine_sha256: sha256(DETECTOR_PATH),
      current_sites_sha256: sha256(SITES_PATH),
      note: 'Audit-Baseline-Hashes stammen aus dem Snapshot von audit/code/results.json (meta.engine_sha256) und audit/security/probes/results/static_scan.json; der Detektor wurde nach dem Audit komplett ersetzt.',
    },
    detector_tuning_patterns: tuning,
    minimal_pairs: minimalPairs,
    overfit_pairs_count: minimalPairs.filter(p => p.overfit_signal).length,
    old_false_negatives_now: oldFnFix,
    old_false_positives_now: oldFpFix,
    old_fp_fixed_by_exact_domain_listing: oldFpFix ? oldFpFix.filter(x => x.fixed && x.host_listed_now).length : null,
    old_fp_total: oldFpFix ? oldFpFix.length : null,
    old_fn_fixed_by_rules: oldFnFix ? oldFnFix.filter(x => x.fixed).length : null,
    old_fn_total: oldFnFix ? oldFnFix.length : null,
  },
  data_integrity: dataIntegrity,
  performance,
};

fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');

// ------------------------------------------------------------------- Console ---
const line = '='.repeat(78);
console.log(line);
console.log('HOLDOUT (unabhaengig, ' + holdout.total + ' Faelle, ' + corpus.counts.categories + ' Kategorien)');
console.log(line);
console.log('Pass: ' + holdout.pass + '/' + holdout.total + ' (' + holdout.pass_rate_pct + '%)');
console.log('FN:   ' + holdout.fn + '/' + holdout.expected_block + ' (' + holdout.fn_rate_pct + '%)   FP: ' + holdout.fp + '/' + holdout.expected_safe + ' (' + holdout.fp_rate_pct + '%)   other: ' + holdout.other);
console.log('TPR:  ' + holdout.tpr_pct + '%   TNR(nur safe): ' + holdout.tnr_pct + '%');
console.log('Conf hoch  : FN ' + holdout.by_certainty.hoch.fn + '/' + holdout.by_certainty.hoch.block + ' (' + holdout.by_certainty.hoch.fn_rate_pct + '%), FP ' + holdout.by_certainty.hoch.fp + '/' + holdout.by_certainty.hoch.safe + ' (' + holdout.by_certainty.hoch.fp_rate_pct + '%)');
console.log('Conf mittel: FN ' + holdout.by_certainty.mittel.fn + '/' + holdout.by_certainty.mittel.block + ' (' + holdout.by_certainty.mittel.fn_rate_pct + '%), FP ' + holdout.by_certainty.mittel.fp + '/' + holdout.by_certainty.mittel.safe + ' (' + holdout.by_certainty.mittel.fp_rate_pct + '%)');
console.log('');
console.log('Top-Kategorien nach Fehlern:');
for (const c of holdout.by_category.filter(c => c.fn + c.fp + c.other > 0).slice(0, 15)) {
  console.log('  ' + c.category.padEnd(28) + ' n=' + String(c.total).padStart(3) + '  FN=' + String(c.fn).padStart(3) + '  FP=' + String(c.fp).padStart(3) + (c.other ? '  other=' + c.other : ''));
}
console.log('');
const ac = audits.audit_code_corpus;
if (ac && ac.current_evaluation) {
  console.log('Veroeffentlichter Audit-Korpus (184 URLs, NICHT Holdout): ' + ac.current_evaluation.pass + '/' + ac.current_evaluation.total + ' pass, FN ' + ac.current_evaluation.fn + '/' + ac.current_evaluation.expected_block + ', FP ' + ac.current_evaluation.fp + '/' + ac.current_evaluation.expected_safe);
}
const lp = audits.lead_probe;
if (lp && lp.measured) {
  console.log('Veroeffentlichter Lead-Korpus: official FP ' + lp.measured.official_false_positives.length + '/' + lp.measured.official_expected_safe + ', FN ' + lp.measured.undetected_phishing.length + '/' + lp.measured.phishing_expected_block + '  (Claim: 0/26, 0/40)');
}
console.log('');
console.log('Overfit-Minimalpaare mit Statusunterschied: ' + results.overfit_evidence.overfit_pairs_count + '/' + minimalPairs.length);
console.log('Alte FNs jetzt blockiert: ' + results.overfit_evidence.old_fn_fixed_by_rules + '/' + results.overfit_evidence.old_fn_total);
console.log('Alte FPs jetzt safe, davon durch exakte Domain-Listung: ' + results.overfit_evidence.old_fp_fixed_by_exact_domain_listing + '/' + results.overfit_evidence.old_fp_total);
const ai = artifactIntegrity;
const cmpTest = ai.comparisons.find(c => c.file === 'tests/detector.test.cjs');
console.log('');
console.log('Artefakt-Integritaet: tests/detector.test.cjs unveraendert seit Audit: ' + cmpTest.unchanged_since_audit + '; lead_probe.cjs mtime ' + ai.timeline.lead_probe_cjs_mtime_utc + ' < detector.js mtime ' + ai.timeline.detector_js_mtime_utc);
console.log('Audit-Baseline results.json waehrend Verifikation ueberschrieben: ' + (audits.audit_code_corpus.results_json_overwritten_during_verification || {}).overwritten + ' (Harness-Crosscheck identisch: ' + ((audits.audit_code_corpus.results_json_overwritten_during_verification || {}).cross_check_harness_vs_rerun || {}).identical + ')');
console.log('Tests: ' + ai.test_ledger.pass + '/' + ai.test_ledger.total + ' PASS (5 Dateien einzeln)');
console.log('');
console.log('Performance (robust): Holdout-Mix Median ' + robust.mixed_holdout.median_of_run_medians_ms + ' ms, p95 ' + robust.mixed_holdout.median_of_run_p95_ms + ' ms | 184-URL-Korpus Median ' + robust.published_corpus.median_of_run_medians_ms + ' ms, p95 ' + robust.published_corpus.median_of_run_p95_ms + ' ms');
console.log('  -> ' + performance.verdict);
console.log('Geschrieben: results.json, perf.txt, corpus.json');
