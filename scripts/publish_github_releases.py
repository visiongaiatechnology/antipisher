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

CHROME_ZIP = DIST_DIR / "Antipisher-Chrome-v0.2.0-alpha.zip"
FIREFOX_ZIP = DIST_DIR / "Antipisher-Firefox-v0.2.0-alpha.zip"
SOURCE_ZIP = DIST_DIR / "Antipisher-Source-v0.2.0-alpha.zip"
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
    chrome_body = f"""# 🛡️ Antipisher for Google Chrome v0.2.0-alpha (MV3)

**High-precision offline anti-phishing, IDN homograph & typosquatting protection extension for Google Chrome.**

### 🌟 What's New in v0.2.0
- **Quiet Safe Browsing:** Safe pages load directly with 0ms added delay — eliminating disruptive full-screen redirects.
- **Glass 2100 Status Toast:** Subtle, non-blocking floating pill badge briefly appears on verified sites and fades away.
- **Standard vs. Strict Preflight Mode:** Standard mode provides smooth, instant browsing; Strict mode offers optional full-screen pre-request isolation.
- **4 Languages Native Support:** English (`en`), Deutsch (`de`), Русский (`ru`), 中文 (`zh`). Defaults to browser language.
- **In-Page Content Shield:** Intercepts credential theft during form submission (DOM Capture phase), closing Chrome MV3 DNR POST gap.
- **Fail-Open Elimination:** Graceful degradation handling with visual indicator on configuration errors.
- **100% Offline & Zero Telemetry:** No external network requests, no analytics, no credentials stored.

### 📦 Installation (Google Chrome)
1. Download `Antipisher-Chrome-v0.2.0-alpha.zip` below and unzip it.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the extracted folder.

### 🔒 Checksums (SHA-256)
```
{sha_text.strip()}
```
"""

    # 2. Firefox Release
    firefox_body = f"""# 🛡️ Antipisher for Mozilla Firefox v0.2.0-alpha (MV3)

**High-precision offline anti-phishing, IDN homograph & typosquatting protection extension for Mozilla Firefox.**

### 🌟 What's New in v0.2.0
- **Quiet Safe Browsing:** Instant synchronous safe navigation via `webRequestBlocking` with zero full-screen interruptions.
- **Glass 2100 Status Toast:** Soft, non-blocking floating pill badge appears on verified sites.
- **4 Languages Native Support:** English (`en`), Deutsch (`de`), Русский (`ru`), 中文 (`zh`). Defaults to browser language.
- **In-Page Content Shield:** Closed Shadow DOM modal protection with zero style leakage.
- **AMO MV3 Compliance:** Declares `web_accessible_resources` for `guard.html` and explicit `data_collection_permissions: {{"required":["none"]}}`.
- **100% Offline & Zero Telemetry:** Pure local heuristic engine, zero tracking, zero external dependencies.

### 📦 Installation (Mozilla Firefox)
1. Download `Antipisher-Firefox-v0.2.0-alpha.zip` below and unzip it.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `manifest.json` from the extracted directory.

### 🔒 Checksums (SHA-256)
```
{sha_text.strip()}
```
"""

    # 3. Unified Release
    unified_body = f"""# 🛡️ Antipisher v0.2.0-alpha — Quiet Safe Browsing & Universal Multilingual Milestone

**Offline, High-Precision Anti-Phishing, IDN Homograph & Typosquatting Protection for Google Chrome & Mozilla Firefox.**

*Licensed under the GNU Affero General Public License v3.0 (AGPLv3)*

### 🚀 Highlights in v0.2.0
- **Quiet Safe Browsing:** Benign and verified websites now load immediately with zero full-screen interstitials.
- **Glass 2100 Floating Toast:** Verified websites display a brief, unobtrusive glassmorphic status badge that automatically fades away.
- **Preflight Mode Toggle:** Smooth Standard Mode (default) or Strict Preflight Mode (isolated gate on every GET) customizable via extension popup.
- **4 Native Languages:** 100% complete key parity across **English (`en`)**, **Deutsch (`de`)**, **Русский (`ru`)**, and **中文 (`zh`)**.
- **187 Brands & 353 Official Domains:** Financial institutions, crypto platforms, cloud/AI infrastructure, logistics, governments.
- **In-Page Content Shield:** Intercepts form submission credential phishing in closed Shadow DOM (`attachShadow({{ mode: 'closed' }})`).
- **Reproducible Builds:** Bit-identical deterministic ZIP packages.

### 🔒 SHA-256 Verification
```
{sha_text.strip()}
```
"""

    print("\n--- Publishing Chrome Release ---")
    rel_chrome = create_or_get_release("chrome-v0.2.0-alpha", "Antipisher for Google Chrome v0.2.0-alpha", chrome_body)
    sync_release_assets(rel_chrome, [(CHROME_ZIP, "application/zip"), (SHA256_FILE, "text/plain")])

    print("\n--- Publishing Firefox Release ---")
    rel_firefox = create_or_get_release("firefox-v0.2.0-alpha", "Antipisher for Mozilla Firefox v0.2.0-alpha", firefox_body)
    sync_release_assets(rel_firefox, [(FIREFOX_ZIP, "application/zip"), (SHA256_FILE, "text/plain")])

    print("\n--- Publishing Unified Release ---")
    rel_unified = create_or_get_release("v0.2.0-alpha", "Antipisher v0.2.0-alpha (Quiet Safe Browsing)", unified_body)
    sync_release_assets(rel_unified, [
        (CHROME_ZIP, "application/zip"),
        (FIREFOX_ZIP, "application/zip"),
        (SOURCE_ZIP, "application/zip"),
        (SHA256_FILE, "text/plain")
    ])

    print("\nAll releases successfully updated on GitHub!")

if __name__ == "__main__":
    main()
