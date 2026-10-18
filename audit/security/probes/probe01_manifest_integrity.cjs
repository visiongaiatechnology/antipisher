#!/usr/bin/env node
/* Audit probe 01 — Manifest-/Datei-Integrität (nichtdestruktiv, offline).
 * Prüft: Manifest-Syntax, referenzierte Dateien, WAR-Exposition, Build-Kopien-Drift,
 * Permissions-Inventar, externally_connectable, Inline-Skripte, Remote-Referenzen.
 * Exit 0 = alle MUSS-Invarianten halten; Beobachtungen (Parity/Exposure) separat.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'results', 'manifest_integrity.json');
const failures = [];
const observations = [];
const checks = [];
function chk(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  if (!ok) failures.push(name + ' :: ' + String(detail || ''));
}
function obs(name, detail) { observations.push({ name, detail: String(detail === undefined ? '' : detail) }); }
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function sha(rel) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex'); }

/* ---------- 1. Manifeste ---------- */
const manifests = {};
for (const b of ['chrome', 'firefox']) {
  try {
    manifests[b] = readJson(path.join(b, 'manifest.json'));
    chk(`manifest:${b}:json-valid`, true);
  } catch (e) {
    chk(`manifest:${b}:json-valid`, false, e.message);
  }
}
const cm = manifests.chrome, fm = manifests.firefox;

chk('manifest:mv3-both', cm && fm && cm.manifest_version === 3 && fm.manifest_version === 3,
  `chrome=${cm && cm.manifest_version} firefox=${fm && fm.manifest_version}`);
chk('manifest:version-consistent', cm && fm && cm.version === '0.1.0' && fm.version === '0.1.0',
  `chrome=${cm && cm.version} firefox=${fm && fm.version}`);
chk('manifest:name-consistent', cm && fm && cm.name === 'Antipisher' && fm.name === 'Antipisher');

/* ---------- 2. Referenzierte Dateien existieren ---------- */
function manifestRefs(base, m) {
  const refs = [];
  if (m.background && m.background.service_worker) refs.push(m.background.service_worker);
  if (m.background && Array.isArray(m.background.scripts)) refs.push(...m.background.scripts);
  if (m.action && m.action.default_popup) refs.push(m.action.default_popup);
  for (const v of Object.values((m.action && m.action.default_icon) || {})) refs.push(v);
  for (const v of Object.values(m.icons || {})) refs.push(v);
  for (const war of m.web_accessible_resources || []) {
    for (const r of war.resources || []) if (!r.includes('*')) refs.push(r);
  }
  return refs.map(r => ({ rel: r, ok: exists(path.join(base, r)) }));
}
const chromeRefs = manifestRefs('chrome', cm);
const firefoxRefs = manifestRefs('firefox', fm);
chk('chrome:referenced-files-exist', chromeRefs.every(r => r.ok),
  chromeRefs.filter(r => !r.ok).map(r => r.rel).join(','));
chk('firefox:referenced-files-exist', firefoxRefs.every(r => r.ok),
  firefoxRefs.filter(r => !r.ok).map(r => r.rel).join(','));
chk('chrome:background-imports-exist',
  ['chrome/shared/sites.js', 'chrome/shared/detector.js'].every(exists));
chk('chrome:guard-subresources-exist',
  ['chrome/guard.css', 'chrome/guard.js', 'chrome/shared/sites.js', 'chrome/shared/detector.js'].every(exists));

/* ---------- 3. web_accessible_resources ---------- */
const warC = (cm.web_accessible_resources || []).flatMap(w => w.resources || []);
const warF = (fm.web_accessible_resources || []).flatMap(w => w.resources || []);
chk('chrome:WAR-guard.html-present', warC.includes('guard.html'), warC.join(','));
chk('chrome:WAR-no-internal-scripts', !warC.some(r => /\.(js|json)$/.test(r)), warC.join(','));
if (!warF.includes('guard.html')) {
  obs('firefox:WAR-guard.html-missing',
    'Firefox-Manifest deklariert kein web_accessible_resources für guard.html, obwohl guard.html das Redirect-Ziel des webRequest-Blockers ist. Dynamisches Firefox-Verhalten ist ohne Browser-E2E NICHT getestet.');
}
obs('chrome:WAR-exposes-guard.html-to-all-http(s)',
  'guard.html ist für alle http/https-Origins web-accessible (Chrome). README behauptet "interne Skripte aus WAR entfernt" — Skripte sind entfernt, aber guard.html selbst bleibt exponiert (Extension-Fingerprinting/iframe-Einbettung möglich).');

/* ---------- 4. Permissions-Inventar ---------- */
function permSet(m) { return { permissions: [...(m.permissions || [])].sort(), host_permissions: [...(m.host_permissions || [])].sort() }; }
const pC = permSet(cm), pF = permSet(fm);
chk('permissions:shared-storage-tabs',
  ['storage', 'tabs'].every(p => pC.permissions.includes(p) && pF.permissions.includes(p)));
chk('permissions:chrome-has-DNR', pC.permissions.includes('declarativeNetRequest'));
chk('permissions:firefox-has-blocking-webRequest',
  pF.permissions.includes('webRequest') && pF.permissions.includes('webRequestBlocking'));
chk('permissions:host-broad-both',
  pC.host_permissions.includes('http://*/*') && pC.host_permissions.includes('https://*/*') &&
  pF.host_permissions.includes('http://*/*') && pF.host_permissions.includes('https://*/*'));
chk('permissions:no-externally-connectable',
  !cm.externally_connectable && !fm.externally_connectable,
  'externe Web-Origins können keine runtime-Messages senden');
obs('permissions:inventory',
  'Chrome: ' + pC.permissions.join(',') + ' | Firefox: ' + pF.permissions.join(',') +
  ' | host_permissions beide http://*/* + https://*/* (breit, funktional begründet: Domainvergleich aller Navigationen)');
const chromeOnly = pC.permissions.filter(p => !pF.permissions.includes(p));
const firefoxOnly = pF.permissions.filter(p => !pC.permissions.includes(p));
obs('permissions:parity-diff', 'nur Chrome: ' + chromeOnly.join(',') + ' | nur Firefox: ' + firefoxOnly.join(','));

/* ---------- 5. CSP / Inline-Skripte / Remote-Referenzen ---------- */
chk('manifest:no-CSP-override',
  !(cm.content_security_policy) && !(fm.content_security_policy),
  'MV3-Default-CSP (script-src self; object-src self) bleibt aktiv');
const htmlFiles = ['chrome/guard.html', 'chrome/popup.html', 'firefox/guard.html', 'firefox/popup.html', 'shared/guard.html', 'shared/popup.html'];
const inlineScripts = [], remoteRefs = [], inlineHandlers = [];
for (const rel of [...new Set(htmlFiles)]) {
  if (!exists(rel)) continue;
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html)) inlineScripts.push(rel);
  const attr = html.match(/\son(?:error|load|click|submit)\s*=/i);
  if (attr) inlineHandlers.push(rel);
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) remoteRefs.push(rel + ' -> ' + m[1]);
}
chk('html:no-inline-scripts', inlineScripts.length === 0, inlineScripts.join(','));
chk('html:no-inline-event-handlers', inlineHandlers.length === 0, inlineHandlers.join(','));
chk('html:no-remote-resource-refs', remoteRefs.length === 0, remoteRefs.join(','));
const cssFiles = ['chrome/guard.css', 'firefox/guard.css', 'shared/guard.css'];
const cssRemote = [];
for (const rel of cssFiles) {
  if (!exists(rel)) continue;
  const css = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of css.matchAll(/url\(\s*['"]?(https?:[^)'"]+)/gi)) cssRemote.push(rel + ' -> ' + m[1]);
  if (/@import\s+url\(\s*['"]?https?:/i.test(css)) cssRemote.push(rel + ' -> @import remote');
}
chk('css:no-remote-refs', cssRemote.length === 0, cssRemote.join(','));

/* ---------- 6. Build-Kopien-Drift (shared -> chrome/firefox) ---------- */
const drift = [];
const files = ['guard.html', 'guard.css', 'guard.js', 'popup.html', 'popup.js'];
for (const f of files) {
  const sh = sha(path.join('shared', f));
  for (const b of ['chrome', 'firefox']) {
    const rel = path.join(b, f);
    if (!exists(rel)) { drift.push(rel + ' FEHLT'); continue; }
    if (sha(rel) !== sh) drift.push(rel + ' != shared/' + f);
  }
}
for (const f of ['sites.js', 'detector.js']) {
  const sh = sha(path.join('shared', f));
  for (const b of ['chrome', 'firefox']) {
    const rel = path.join(b, 'shared', f);
    if (!exists(rel)) { drift.push(rel + ' FEHLT'); continue; }
    if (sha(rel) !== sh) drift.push(rel + ' != shared/' + f);
  }
}
chk('build:no-copy-drift', drift.length === 0, drift.join(' | '));
const iconDrift = [];
for (const i of ['icon16.png', 'icon48.png', 'icon128.png']) {
  const h = sha(path.join('icons', i));
  for (const b of ['chrome', 'firefox']) if (sha(path.join(b, 'icons', i)) !== h) iconDrift.push(b + '/' + i);
}
chk('build:no-icon-drift', iconDrift.length === 0, iconDrift.join(','));

/* ---------- 7. Browser-Versionen / Distribution ---------- */
chk('chrome:min-version-121', cm.minimum_chrome_version === '121', cm.minimum_chrome_version);
const gecko = (fm.browser_specific_settings && fm.browser_specific_settings.gecko) || {};
chk('firefox:gecko-id-and-min-version',
  typeof gecko.id === 'string' && gecko.id.length > 0 && gecko.strict_min_version === '128.0',
  JSON.stringify(gecko));
obs('manifest:background-models',
  'Chrome: service_worker (MV3, nicht persistent) | Firefox: background.scripts-Event-Page (MV3, nicht persistent ohne persistent:true) — globale In-Memory-Zustände können bei Suspend verloren gehen.');

/* ---------- 8. Ergebnis ---------- */
const result = {
  probe: 'probe01_manifest_integrity',
  timestamp_utc: new Date().toISOString(),
  root: ROOT,
  assertions_total: checks.length,
  assertions_failed: failures.length,
  checks,
  observations,
  manifests: {
    chrome: { permissions: pC, war: warC, background: cm.background, min_version: cm.minimum_chrome_version },
    firefox: { permissions: pF, war: warF, background: fm.background, gecko }
  }
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('[probe01] Assertions: ' + (checks.length - failures.length) + '/' + checks.length + ' PASS, ' + failures.length + ' FAIL');
for (const f of failures) console.log('  FAIL: ' + f);
for (const o of observations) console.log('  OBS : ' + o.name + ' — ' + o.detail);
console.log('[probe01] report: ' + path.relative(ROOT, OUT));
process.exit(failures.length ? 1 : 0);
