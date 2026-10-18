# Audit runner — VGT-100 Security-Audit "Antipisher 0.1" (AUDIT_ONLY, nichtdestruktiv)
# Führt Baseline-Tests, Syntax-Checks und alle Audit-Probes aus und schreibt ein Ledger.
# Schreibt ausschließlich unter audit/security/.
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..\..\..").Path
$logs = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$ledger = @()

function Run-Step([string]$id, [string]$cmd, [string]$logName) {
    $log = Join-Path $logs $logName
    Push-Location $root
    & cmd /c "$cmd > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    Pop-Location
    $script:ledger += [pscustomobject]@{ id = $id; command = $cmd; exit_code = $code; log = "audit/security/probes/logs/$logName" }
    Write-Host ("[{0}] exit={1}  {2}" -f $id, $code, $cmd)
}

# 1) Baseline-Produkt-Tests
Run-Step 'TR-01-baseline-tests' 'node --test tests/detector.test.cjs tests/chrome-worker.test.cjs tests/firefox-worker.test.cjs' 'baseline_tests.log'
Run-Step 'TR-02-syntax-check' 'node --check chrome/background.js && node --check firefox/background.js && node --check chrome/guard.js && node --check chrome/popup.js && node --check shared/detector.js && node --check shared/sites.js' 'syntax_check.log'

# 2) Audit-Probes
Run-Step 'TR-03-manifest-integrity' 'node audit/security/probes/probe01_manifest_integrity.cjs' 'probe01_manifest_integrity.log'
Run-Step 'TR-04-detector-corpus' 'node audit/security/probes/probe02_detector_corpus.cjs' 'probe02_detector_corpus.log'
Run-Step 'TR-05-punycode-parity' 'node audit/security/probes/probe03_punycode_parity.cjs' 'probe03_punycode_parity.log'
Run-Step 'TR-06-chrome-background-mock' 'node audit/security/probes/probe04_chrome_background_mock.cjs' 'probe04_chrome_background_mock.log'
Run-Step 'TR-07-firefox-background-mock' 'node audit/security/probes/probe05_firefox_background_mock.cjs' 'probe05_firefox_background_mock.log'
Run-Step 'TR-08-guard-render-mock' 'node audit/security/probes/probe06_guard_render_mock.cjs' 'probe06_guard_render_mock.log'
Run-Step 'TR-09-fuzz-perf' 'node audit/security/probes/probe07_fuzz_perf.cjs' 'probe07_fuzz_perf.log'
Run-Step 'TR-10-data-integrity' 'node audit/security/probes/probe08_data_integrity.cjs' 'probe08_data_integrity.log'
Run-Step 'TR-11-static-scan' 'python audit/security/probes/probe09_static_scan.py' 'probe09_static_scan.log'
Run-Step 'AUX-01-matrix-regenerate' 'node audit/security/probes/build_matrix.cjs' 'matrix_regenerate.log'
Run-Step 'AUX-02-coverage-embed' 'node audit/security/probes/embed_coverage.cjs' 'coverage_embed.log'
Run-Step 'TR-12-matrix-validate' 'python "C:\Users\Masterboard\.dsh\skills\vgt-security-master\scripts\validate_audit.py" audit/security/AUDIT_MATRIX.json' 'validate_audit.log'

$ledger | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot 'results\run_ledger.json')
Write-Host ''
Write-Host '=== Ledger ==='
$ledger | Format-Table -AutoSize | Out-String -Width 200
