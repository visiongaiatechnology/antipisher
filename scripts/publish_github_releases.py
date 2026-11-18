import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

import subprocess

def get_token():
    env_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if env_token:
        return env_token
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            check=True
        )
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1]
    except Exception as e:
        print("Could not retrieve token from git credential fill:", e)
    return None

TOKEN = get_token()
if not TOKEN:
    print("Error: Could not retrieve GitHub token.")
    sys.exit(1)
REPO = "visiongaiatechnology/antipisher"
ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT.parent

CHROME_ZIP = DIST_DIR / "Antipisher-Chrome-v0.2.3-alpha.zip"
FIREFOX_ZIP = DIST_DIR / "Antipisher-Firefox-v0.2.3-alpha.zip"
SOURCE_ZIP = DIST_DIR / "Antipisher-Source-v0.2.3-alpha.zip"
SHA256_FILE = DIST_DIR / "SHA256SUMS.txt"

sha_text = SHA256_FILE.read_text(encoding="utf-8") if SHA256_FILE.exists() else ""

def api_request(url, method="GET", data=None, content_type="application/json"):
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Antipisher-Publisher"
    }
    if content_type:
        headers["Content-Type"] = content_type
    
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode("utf-8")
        elif isinstance(data, (bytes, bytearray)):
            body = data
        else:
            body = str(data).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="replace")
        print(f"HTTPError {e.code} on {url}: {err_msg}")
        raise

def upload_asset(upload_url_template, file_path, content_type="application/octet-stream"):
    base_url = upload_url_template.split("{")[0]
    name = file_path.name
    upload_url = f"{base_url}?name={name}"
    print(f"Uploading asset {name} to {upload_url}...")
    data = file_path.read_bytes()
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": content_type,
        "User-Agent": "Antipisher-Publisher"
    }
    req = urllib.request.Request(upload_url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"Uploaded {name}: ID={res.get('id')}")
        return res

def create_or_get_release(tag, name, body):
    releases_url = f"https://api.github.com/repos/{REPO}/releases"
    try:
        tag_url = f"{releases_url}/tags/{tag}"
        existing = api_request(tag_url)
        print(f"Release for {tag} exists. ID={existing['id']}. Updating metadata...")
        patch_url = f"{releases_url}/{existing['id']}"
        updated = api_request(patch_url, method="PATCH", data={
            "name": name,
            "body": body,
            "draft": False,
            "prerelease": True
        })
        return updated
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise

    payload = {
        "tag_name": tag,
        "target_commitish": "main",
        "name": name,
        "body": body,
        "draft": False,
        "prerelease": True
    }
    created = api_request(releases_url, method="POST", data=payload)
    print(f"Created release '{name}' ({tag}). ID={created['id']}")
    return created

def sync_release_assets(release_obj, assets_to_upload):
    upload_url = release_obj["upload_url"]
    existing = {a["name"]: a["id"] for a in release_obj.get("assets", [])}
    for file_path, mime in assets_to_upload:
        if file_path.name in existing:
            asset_id = existing[file_path.name]
            print(f"Deleting existing asset {file_path.name} (ID={asset_id})...")
            try:
                api_request(f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}", method="DELETE", content_type=None)
            except Exception as e:
                print(f"Warning deleting {file_path.name}: {e}")
        upload_asset(upload_url, file_path, mime)

def main():
    print("Verifying build assets...")
    assert CHROME_ZIP.exists(), f"Missing {CHROME_ZIP}"
    assert FIREFOX_ZIP.exists(), f"Missing {FIREFOX_ZIP}"
    assert SOURCE_ZIP.exists(), f"Missing {SOURCE_ZIP}"
    assert SHA256_FILE.exists(), f"Missing {SHA256_FILE}"

    # 1. Chrome Release
    chrome_body = f"""# 🛡️ Antipisher for Google Chrome v0.2.3-alpha (MV3 · Platin Security Hardened)

**High-precision offline anti-phishing, IDN homograph, supply-chain, tracker & ad protection extension for Google Chrome.**

### 🔒 What's New in v0.2.3
- **GeDefense Light Supply-Chain, Magecart & Crypto-Clipper Fortress:** Cross-origin `<script>`/`<iframe>` prototype gatekeeper (`1688360.cc`, `webshell.lol`, `.icu` exploit kits, `eval(atob(...))`), Anti-Magecart `sendBeacon`/`fetch` skimmer blocking (`/card.php`, `/skimmer.php`), and Crypto-Clipper `clipboard.writeText` protection.
- **VGT-100 Platin Security Hardening (`48/52 PASS, 0 FAIL`):** RFC-1035 DoS bounds (`100k`-host in `0.26 ms`, `p95 = 0.39 ms`), 30s `allow-once` TTL, queue-serialized `configure()` mutex, fail-closed engine guards, zero-PII security event ring-buffer, build allowlist, and CycloneDX 1.5 SBOM.
- **YouTube Ad Accelerator Bugfix:** Fixed normal videos jumping to the end when empty `.ytp-ad-player-overlay` containers persist; cleanly restores `1.0x` playback rate and mute state.
- **91/91 Unit & Negative Security Tests PASS** · **292/296 Holdout (0 FN / 100% TPR)**.

### 📦 Installation (Google Chrome)
1. Download `Antipisher-Chrome-v0.2.3-alpha.zip` below and unzip it.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the extracted folder.

### 🔒 Checksums (SHA-256)
```
{sha_text.strip()}
```
"""

    # 2. Firefox Release
    firefox_body = f"""# 🛡️ Antipisher for Mozilla Firefox v0.2.3-alpha (MV3 · Platin Security Hardened)

**High-precision offline anti-phishing, IDN homograph, supply-chain, tracker & ad protection extension for Mozilla Firefox.**

### 🔒 What's New in v0.2.3
- **GeDefense Light Supply-Chain, Magecart & Crypto-Clipper Fortress:** Cross-origin `<script>`/`<iframe>` prototype gatekeeper, Anti-Magecart `sendBeacon`/`fetch` skimmer guard, Crypto-Clipper guard, and synchronized `webRequestBlocking` IOCs (`optimizely.com`, `1688360.cc`, `webshell.lol`, `.icu`).
- **VGT-100 Platin Security Hardening (`48/52 PASS, 0 FAIL`):** RFC-1035 DoS bounds (`100k`-host in `0.26 ms`, `p95 = 0.39 ms`), 30s `allow-once` TTL with stale-navigation invalidation, fail-closed engine guard in `analyzeRequest()`, and zero-PII security event ring-buffer.
- **YouTube Ad Accelerator Bugfix:** Cleanly restores `1.0x` playback rate and mute state after ads finish without skipping the main video.
- **91/91 Unit & Negative Security Tests PASS** · **292/296 Holdout (0 FN / 100% TPR)**.

### 📦 Installation (Mozilla Firefox)
1. Download `Antipisher-Firefox-v0.2.3-alpha.zip` below and unzip it.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `manifest.json` from the extracted directory.

### 🔒 Checksums (SHA-256)
```
{sha_text.strip()}
```
"""

    # 3. Unified Release
    unified_body = f"""# 🛡️ Antipisher v0.2.3-alpha — Platin Security Hardened & GeDefense Light Supply-Chain Fortress

**Offline, High-Precision Anti-Phishing, IDN Homograph, Supply-Chain, Tracker & Ad Protection for Google Chrome & Mozilla Firefox.**

*Licensed under the GNU Affero General Public License v3.0 (AGPLv3)*

### 🚀 Highlights in v0.2.3
- **GeDefense Light Supply-Chain & Magecart Defense:** Blocks Optimizely-style supply-chain loaders (`1688360.cc`, `webshell.lol`, `.icu` exploit kits, `eval(atob(...))`), Magecart `sendBeacon`/`fetch` card skimmers, and clipboard crypto-clippers.
- **VGT-100 Platin Security Audit (`48/52 PASS, 0 FAIL`):** RFC-1035 DoS bounds (`100k`-host in `0.26 ms`), 30s `allow-once` TTL, queue-serialized `configure()`, fail-closed engine guards, zero-PII security event ring-buffer, `ALLOWED_PACKAGE_FILES` build allowlist, and CycloneDX 1.5 `sbom.json`.
- **YouTube Ad Accelerator Bugfix:** Eliminated normal-video end-jump when empty `.ytp-ad-player-overlay` persists.
- **Verified Quality:** **91/91 Unit & Security Tests PASS**, **9/9 Audit Probes PASS**, **292/296 Holdout (0/166 FN = 100% TPR)**, **0/745 Benign FP** in `probe02`.

### 🔒 SHA-256 Verification
```
{sha_text.strip()}
```
"""

    print("\n--- Publishing Chrome Release ---")
    rel_chrome = create_or_get_release("chrome-v0.2.3-alpha", "Antipisher for Google Chrome v0.2.3-alpha", chrome_body)
    sync_release_assets(rel_chrome, [(CHROME_ZIP, "application/zip"), (SHA256_FILE, "text/plain")])

    print("\n--- Publishing Firefox Release ---")
    rel_firefox = create_or_get_release("firefox-v0.2.3-alpha", "Antipisher for Mozilla Firefox v0.2.3-alpha", firefox_body)
    sync_release_assets(rel_firefox, [(FIREFOX_ZIP, "application/zip"), (SHA256_FILE, "text/plain")])

    print("\n--- Publishing Unified Release ---")
    rel_unified = create_or_get_release("v0.2.3-alpha", "Antipisher v0.2.3-alpha (Platin Security Hardened)", unified_body)
    sync_release_assets(rel_unified, [
        (CHROME_ZIP, "application/zip"),
        (FIREFOX_ZIP, "application/zip"),
        (SOURCE_ZIP, "application/zip"),
        (SHA256_FILE, "text/plain")
    ])

    print("\nAll releases successfully updated on GitHub!")

if __name__ == "__main__":
    main()
