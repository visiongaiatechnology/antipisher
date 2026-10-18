# Antipisher — Release-Verifikation (PowerShell)
# Prüft SHA256SUMS.txt gegen die ZIPs im Release-Ordner und die Source-ZIP-Hygiene.
param(
  [string]$ReleaseDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
$sumsPath = Join-Path $ReleaseDir 'SHA256SUMS.txt'
if (-not (Test-Path $sumsPath)) { Write-Error "SHA256SUMS.txt nicht gefunden: $sumsPath"; exit 1 }

$failed = 0
$checked = 0
foreach ($line in Get-Content $sumsPath) {
  if ($line -notmatch '^([a-fA-F0-9]{64})\s{2}(.+)$') { continue }
  $expected = $Matches[1].ToLowerInvariant()
  $name = $Matches[2].Trim()
  $file = Join-Path $ReleaseDir $name
  if (-not (Test-Path $file)) { Write-Host "FEHLT  $name"; $failed++; continue }
  $actual = (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { Write-Host "FALSCH $name`n  erwartet $expected`n  erhalten $actual"; $failed++ }
  else { Write-Host "OK     $name"; $checked++ }
}

# Source-ZIP-Hygiene: keine audit/- oder SHA256SUMS-Einträge
$sourceZip = Get-ChildItem $ReleaseDir -Filter 'Antipisher-Source-*.zip' | Select-Object -First 1
if ($sourceZip) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($sourceZip.FullName)
  $bad = @($zip.Entries | Where-Object { $_.FullName -like '*audit/*' -or $_.FullName -like '*SHA256SUMS.txt' })
  $zip.Dispose()
  if ($bad.Count -gt 0) { Write-Host "FALSCH Source-ZIP enthält audit/ oder Checksums"; $failed++ }
  else { Write-Host "OK     Source-ZIP-Hygiene" }
}

if ($failed -gt 0) { Write-Host "`nVERIFIKATION FEHLGESCHLAGEN: $failed Fehler"; exit 1 }
Write-Host "`nVERIFIKATION OK: $checked Dateien geprueft."
