"""
Sync shared files to Chrome/Firefox builds and pack reproducible, bit-identical local ZIPs.
Conforms to VGT-099 Reproducible Builds specification.
"""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
FIXED_DATETIME = (2026, 1, 1, 0, 0, 0)

# 1. Regenerate database if needed
sites_script = ROOT / 'build_sites.py'
if sites_script.exists():
    res = subprocess.run([sys.executable, str(sites_script)], capture_output=True, text=True, cwd=str(ROOT))
    if res.returncode != 0:
        print("Error rebuilding sites:", res.stderr)
        sys.exit(1)

def add_deterministic(zip_file, file_path, arcname):
    data = file_path.read_bytes()
    zinfo = zipfile.ZipInfo(filename=arcname, date_time=FIXED_DATETIME)
    zinfo.compress_type = zipfile.ZIP_DEFLATED
    zinfo.external_attr = 0o644 << 16
    zip_file.writestr(zinfo, data, compresslevel=9)

FILES = ('guard.html', 'guard.css', 'guard.js', 'popup.html', 'popup.css', 'popup.js',
         'options.html', 'options.css', 'options.js',
         'sites.js', 'detector.js', 'shield-content.js', 'design-tokens.css', 'i18n.js',
         'aegis-engine.js')

# Explicit package file allowlist (VGT-059 artifact hygiene gate)
ALLOWED_PACKAGE_FILES = {
    'manifest.json', 'background.js',
    'guard.html', 'guard.css', 'guard.js',
    'popup.html', 'popup.css', 'popup.js',
    'options.html', 'options.css', 'options.js',
    'design-tokens.css',
    'shared/sites.js', 'shared/detector.js',
    'shared/shield-content.js', 'shared/i18n.js', 'shared/aegis-engine.js',
    'rulesets/trackers.json',
    'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    '_locales/en/messages.json', '_locales/de/messages.json',
    '_locales/ru/messages.json', '_locales/zh_CN/messages.json',
}
generated_zips = []

for target in ('chrome', 'firefox'):
    dst = ROOT / target
    for f in FILES:
        path = dst / ('shared' if f in ('sites.js', 'detector.js', 'shield-content.js', 'i18n.js', 'aegis-engine.js') else '') / f
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / 'shared' / f, path)
    for f in ('icon16.png', 'icon48.png', 'icon128.png'):
        path = dst / 'icons' / f
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / 'icons' / f, path)

    locales_src = ROOT / '_locales'
    if locales_src.exists():
        locales_dst = dst / '_locales'
        if locales_dst.exists():
            shutil.rmtree(locales_dst)
        shutil.copytree(locales_src, locales_dst)

    rulesets_src = ROOT / 'rulesets'
    if rulesets_src.exists():
        rulesets_dst = dst / 'rulesets'
        if rulesets_dst.exists():
            shutil.rmtree(rulesets_dst)
        shutil.copytree(rulesets_src, rulesets_dst)

    manifest = json.loads((dst / 'manifest.json').read_text(encoding='utf-8'))
    assert manifest['manifest_version'] == 3
    assert 'options_ui' in manifest, f"options_ui missing in {target} manifest"
    assert manifest['options_ui']['page'] == 'options.html'
    for file in sorted(ALLOWED_PACKAGE_FILES):
        assert (dst / file).exists(), f"Missing required package file in {target}: {file}"

    packed_arcnames = set()
    zip_path = ROOT.parent / f'Antipisher-{target.capitalize()}-v0.2.3-alpha.zip'
    with zipfile.ZipFile(zip_path, 'w') as z:
        for file in sorted(dst.rglob('*')):
            if file.is_file() and '_metadata' not in file.parts:
                arcname = file.relative_to(dst).as_posix()
                assert arcname in ALLOWED_PACKAGE_FILES, (
                    f"Unlisted file in {target} build directory (violates VGT-059 allowlist): {arcname}"
                )
                packed_arcnames.add(arcname)
                add_deterministic(z, file, arcname)
    assert packed_arcnames == ALLOWED_PACKAGE_FILES, (
        f"Package file mismatch in {target}: diff={ALLOWED_PACKAGE_FILES ^ packed_arcnames}"
    )
    generated_zips.append(zip_path)
    print(f"Generated: {zip_path.name}")

# Generate deterministic CycloneDX 1.5 zero-dependency SBOM (VGT-051 / VGT-055)
sbom_components = []
for rel_path in sorted(ALLOWED_PACKAGE_FILES):
    f_path = ROOT / 'chrome' / rel_path
    digest = hashlib.sha256(f_path.read_bytes()).hexdigest()
    sbom_components.append({
        "type": "file",
        "name": rel_path,
        "version": "0.2.3",
        "hashes": [{"alg": "SHA-256", "content": digest}]
    })
for extra_rel in ('chrome/background.js', 'firefox/background.js', 'chrome/manifest.json', 'firefox/manifest.json'):
    f_path = ROOT / extra_rel
    digest = hashlib.sha256(f_path.read_bytes()).hexdigest()
    sbom_components.append({
        "type": "file",
        "name": extra_rel,
        "version": "0.2.3",
        "hashes": [{"alg": "SHA-256", "content": digest}]
    })
sbom_doc = {
    "bomFormat": "CycloneDX",
    "specVersion": "1.5",
    "version": 1,
    "metadata": {
        "timestamp": "2026-01-01T00:00:00Z",
        "component": {
            "type": "application",
            "name": "antipisher",
            "version": "0.2.3",
            "licenses": [{"license": {"id": "AGPL-3.0-only"}}]
        }
    },
    "components": sbom_components,
    "dependencies": [{"ref": "antipisher@0.2.3", "dependsOn": []}]
}
(ROOT / 'sbom.json').write_text(json.dumps(sbom_doc, indent=2) + '\n', encoding='utf-8')

# Source archive (clean source only, excluding audit/, temp files and generated checksums)
src_zip = ROOT.parent / 'Antipisher-Source-v0.2.3-alpha.zip'
EXCLUDE_DIRS = {'audit', '__pycache__', '.git', '.tmp', 'node_modules', '_metadata'}
EXCLUDE_EXTS = {'.zip', '.log', '.tmp'}
EXCLUDE_FILES = {'SHA256SUMS.txt'}

with zipfile.ZipFile(src_zip, 'w') as z:
    for file in sorted(ROOT.rglob('*')):
        if not file.is_file():
            continue
        rel = file.relative_to(ROOT)
        parts = rel.parts
        if any(ex in parts for ex in EXCLUDE_DIRS):
            continue
        if file.suffix in EXCLUDE_EXTS:
            continue
        if file.name in EXCLUDE_FILES:
            continue
        arcname = (Path('vgt-domainguard-src') / rel).as_posix()
        add_deterministic(z, file, arcname)

generated_zips.append(src_zip)
print(f"Generated: {src_zip.name}")

# Compute SHA256SUMS
sha_lines = []
for zp in sorted(set(generated_zips)):
    digest = hashlib.sha256(zp.read_bytes()).hexdigest()
    sha_lines.append(f"{digest}  {zp.name}\n")
    print(f"{digest}  {zp.name}")

sums_path = ROOT.parent / 'SHA256SUMS.txt'
sums_text = "".join(sha_lines)
sums_path.write_text(sums_text, encoding='utf-8')
# Also keep a copy inside the repository for reproducible release verification.
(ROOT / 'SHA256SUMS.txt').write_text(sums_text, encoding='utf-8')
print(f"Checksums saved to: {sums_path.name} and SHA256SUMS.txt")
print("Build complete and deterministic.")
