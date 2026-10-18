#!/usr/bin/env node
/* Injiziert die 100-Zeilen-Abdeckungsmatrix aus AUDIT_MATRIX.json in
 * audit/security/AUDIT_SECURITY.md an der Stelle <!-- COVERAGE_TABLE -->.
 * Idempotent: ersetzt vorhandenen Tabellenblock zwischen Marker und nächster Überschrift.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MATRIX = path.join(ROOT, 'audit', 'security', 'AUDIT_MATRIX.json');
const REPORT = path.join(ROOT, 'audit', 'security', 'AUDIT_SECURITY.md');
const MARKER = '<!-- COVERAGE_TABLE -->';

const m = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));

function clean(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}
function truncate(s, n) { s = clean(s); return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…'; }

const rows = m.controls.map(c => {
  const ev = (c.evidence || []).map(e => e.location).join('<br>') || '—';
  const test = c.verification && c.verification.test_run_id
    ? c.verification.test_run_id + ' (Exit 0)'
    : (c.verification && c.verification.method ? c.verification.method : '—');
  const asset = (c.evidence && c.evidence[0] && c.evidence[0].location ? c.evidence[0].location.split(':')[0] : '—');
  return '| ' + [c.id, c.status, clean(asset), ev, test, truncate(c.rationale, 200)].join(' | ') + ' |';
});
const table = [
  '| ID | Status | Asset/Trust Boundary | Reale Evidenz (Datei:Zeile/Befehl) | Test/Exitcode | Begründung/Grenze |',
  '|---|---|---|---|---|---|',
  ...rows
].join('\n');

let report = fs.readFileSync(REPORT, 'utf8');
if (!report.includes(MARKER)) {
  // idempotenter Fall: bereits injizierte Tabelle zwischen Marker-Überschrift und nächster "## "-Überschrift ersetzen
  const re = /(## VGT-100-Abdeckungsmatrix \(100 Zeilen\)\n\n)([\s\S]*?)(\n## )/;
  if (!re.test(report)) { console.error('[embed] Marker/Tabelle nicht gefunden'); process.exit(1); }
  report = report.replace(re, (_, head, _old, tail) => head + table + tail);
} else {
  report = report.replace(MARKER, table);
}
fs.writeFileSync(REPORT, report, 'utf8');
const rowCount = (table.match(/\n\| VGT-/g) || []).length;
console.log('[embed] Coverage-Tabelle injiziert: ' + rowCount + ' Datenzeilen');
if (rowCount !== 100) { console.error('[embed] WARNUNG: erwartet 100 Zeilen'); process.exit(1); }
