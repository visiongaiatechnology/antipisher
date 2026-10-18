<div align="center">

# 🛡️ Antipisher 0.2.1 (Alpha)

**Offline, High-Precision Anti-Phishing, IDN Homograph & Typosquatting Protection for Google Chrome & Mozilla Firefox**  
*Licensed under the GNU Affero General Public License v3.0 (AGPLv3)*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](LICENSE)
[![Version: 0.2.1-alpha](https://img.shields.io/badge/Version-0.2.1--alpha-10b981.svg?style=for-the-badge)](https://github.com/visiongaiatechnology/antipisher)
[![Tests: 69/69 Passing](https://img.shields.io/badge/Tests-69%2F69_Passing-2ea043.svg?style=for-the-badge)](#tests--development)
[![Telemetry: Zero / 100% Offline](https://img.shields.io/badge/Telemetry-Zero_%2F_100%25_Offline-0284c7.svg?style=for-the-badge)](#privacy)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3_Ready-f59e0b.svg?style=for-the-badge)](chrome/)
[![Firefox MV3](https://img.shields.io/badge/Firefox-MV3_Ready-ef4444.svg?style=for-the-badge)](firefox/)

---

### 🌐 Select Language / Sprache wählen / Выберите язык / 选择语言

[🇬🇧 **English**](README.md) &nbsp;•&nbsp; [🇩🇪 **Deutsch**](README.de.md) &nbsp;•&nbsp; [🇷🇺 **Русский**](README.ru.md) &nbsp;•&nbsp; [🇨🇳 **中文**](README.zh.md)

---

</div>

> **Status:** `SILVER` · Version `0.2.1` · As of 18.10.2026 · AEGIS Tracker Shield & Options Milestone.  
> **Not a store-release product:** Browser E2E, official store submission, signed update feeds, and full V2 graph engine are ongoing milestones (see [Known Boundaries & Limitations](#known-boundaries--limitations)).

---

## ⚡ Key Capabilities & Implemented Features

- **Dedicated Options Dashboard & Custom Whitelist:** Full preferences center (`options.html`) accessible directly via popup gear icon or extension management. Toggle Standard vs. Strict navigation modes, Safe Toast, badge counter, preferred locale, and manage a local, custom domain whitelist (bypassing detection immediately without remote calls).
- **AEGIS Tracker Shield (uBlock-Inspired Local Defense):** Pure local declarative network blocking (`rulesets/trackers.json`) combined with dynamic surrogate function defusers for `ga`, `dataLayer`, `fbq`, `ttq`, `clarity`, `hj`, and `navigator.sendBeacon`. Guarantees checkouts and logins never hang while blocking telemetry. Strips URL query tracking parameters (`utm_*`, `fbclid`, `gclid`).
- **Live Real-Time Tracker Counter:** Extension action icon badge and popup menu display real-time live metrics (`Tab: X · Total: Y`), accurately tracking and updating even late-loading or dynamically injected third-party tracker scripts.
- **GeDefense Light DOM Hypervisor:** Developer console Self-XSS scam defense banner, Cognitive Fast-Path engine for zero-overhead HTML sanitization, inline script & iframe injection neutralization, and prototype-level `javascript:` URI disarming.
- **AEGIS Anti-Fingerprinting Cloaking:** Screen geometry fuzzing and Canvas 1-bit noise mitigation to foil cross-site browser fingerprinting.
- **Quiet Safe Browsing & Glass 2100 Status Toast:** Clean, verified websites load immediately with zero added latency (0 ms) and without any disruptive full-screen interstitials. A sleek, floating Glass 2100 status toast (*"Domain verified · Antipisher"*) briefly appears in the screen corner and gently auto-fades without blocking mouse interactions (`pointer-events: none`).
- **Standard Mode vs. Strict Preflight Mode:** Standard mode enables frictionless direct browsing with targeted threat interception; Strict mode offers optional full-screen pre-request declarativeNetRequest gate for users in high-risk threat environments.
- **Multilingual Support (4 Languages):** Native user interface and detection explanations in **English (`en`)**, **German (`de`)**, **Russian (`ru`)**, and **Chinese (`zh`)**. The extension automatically defaults to the user's browser language, with optional manual switching.
- **187 Curated Brands / 353 Official Domains:** Covers major financial institutions, government agencies, cryptocurrency exchanges, cloud/AI infrastructure, logistics, and European/global services in [`shared/sites.js`](shared/sites.js) / `sites-100.json`.
- **Shared-Hosting Namespace Isolation:** Public-suffix / customer domains (`force.com`, `github.io`, `vercel.app`, `netlify.app`, `wordpress.com`, etc.) are isolated and never treated as exclusive brand roots. For instance, `paypal.force.com` and `paypal.github.io` are intercepted while genuine platform roots remain accessible.
- **Heuristic Detection Engine:**
  - **Damerau-Levenshtein 1 & 2:** Catches adjacent letter transpositions (`amzaon.com`, `goolge.com`, `paypla.com`).
  - **1-Bit Bitsquatting (`isBitFlip`):** Detects hardware and DNS memory transmission bit-flips (`amaxon.com` → Amazon, `microsmft.com` → Microsoft, `gongle.com` → Google).
  - **Visual Ligatures & Substitutions:** Uncovers 2-edit visual lookalikes (`arnazon.com` via `rn→m`, `rnicrosoft.com`, `vv→w`, `cl→d`).
  - **Unicode Homoglyphs & Diacritics:** Identifies mixed-script Cyrillic, Greek, circled alphanumerics, and Latin diacritics (`páypal.com`, `päypal.com`, `mïcrosoft.com`, `amazön.com`) without false-flagging legitimate terms like `über.de`.
  - **Bidirectional Control Characters (UTS #39 / RFC 8264):** Blocks invisible RTL/LTR override spoofing (`\u202E`, `\u202A`–`\u202E`, `\u2066`–`\u2069`).
  - **Brand & Credential Bait Concatenation:** Catches unseparated keyword mashups (`paypalsupport.com`, `binancelogin.com`, `paypal-rechnung.com`, `dhl-sendung.de`, `sparkasse-kontoauszug.de`).
  - **Subdomain Impersonation:** Intercepts brands weaponized on foreign roots (`apple.attacker.com`, `paypal.evil.test`).
  - **RFC 3986 Userinfo Deception:** Blocks deceptive userinfo schemes (`https://paypal.com@evil.com/`).
- **Layer 3: Path & Query Inspection:** Identifies targeted brand impersonation in URL paths on foreign hosts (e.g. `https://unrelated.com/paypal/login`, `https://phish-host.org/paypal.com/verify`) while preserving legitimate developer documentation, API tutorials, and news articles (`/docs/`, `/news/`, `/blog/`).
- **Official ccTLD Intelligence:** Treats recognized national branches of global brands as authentic (`google.co.jp`, `amazon.se`, `ing.nl`, `visa.de`); flags ambiguous cases with an informational warning level rather than a hard block; enforces strict blocks on suspicious generic TLDs.
- **In-Page Content Shield (`shared/shield-content.js`):**
  - Closes Chrome MV3's declarativeNetRequest (DNR) POST-navigation gap.
  - Intercepts form submissions (`submit` event in DOM capture phase) before credentials leave the browser.
  - Renders a tamper-proof Glass 2100 warning modal in a closed Shadow DOM (`attachShadow({ mode: 'closed' })`), immune to host page CSS resets and script tampering.
  - Automatically highlights password input fields on suspicious domains with a non-intrusive warning badge.
- **Firefox MV3 Alignment:** Declares `web_accessible_resources` for `guard.html` and sets `data_collection_permissions: {"required":["none"]}` in accordance with MDN and AMO requirements.
- **Chrome MV3 Preflight & Fail-Open Elimination:** Preflight GET requests via DNR; if DNR configuration fails, Antipisher immediately persists a degraded state and activates the best-effort observer with clear UI status. Eliminates arbitrary URL length limits.
- **Glass 2100 UI & Accessibility:** Shared design tokens (`shared/design-tokens.css`), WCAG-AA compliant contrast ratios, full keyboard navigation with focus rings, ARIA `alertdialog`, reduced-motion and forced-colors support.
- **100% Bit-Identical Reproducible Builds:** Deterministic ZIP generation with fixed timestamps via `build.py` and repository-level [`SHA256SUMS.txt`](SHA256SUMS.txt).
- **Zero-Telemetry Offline Privacy:** No external network requests, no remote CDNs, no API keys, no browsing history logging.

---

## 📸 Interface & Visual Preview

| Options Dashboard (v0.2.1) | Custom Domain Whitelist (v0.2.1) |
|:---:|:---:|
| ![Options Dashboard](audit/verify/fix/screenshots/v2-options.png) | ![Custom Whitelist](audit/verify/fix/screenshots/v2-options-whitelist.png) |

| Extension Popup Menu (v0.2.1) | In-Page Content Shield (Form Interception) |
|:---:|:---:|
| ![Extension Popup](audit/verify/fix/screenshots/v2-popup.png) | ![In-Page Shield](audit/verify/fix/screenshots/v2-shield-modal.png) |

| Threat Interception (Block Interstitial) | Ambiguous Domain (Warning Interstitial) |
|:---:|:---:|
| ![Threat Interception](audit/verify/fix/screenshots/v2-guard-block.png) | ![Warning Interstitial](audit/verify/fix/screenshots/v2-guard-warn.png) |

| Compact View (500px) | Mobile View (390px) |
|:---:|:---:|
| ![Compact View](audit/verify/fix/screenshots/v2-guard-compact.png) | ![Mobile View](audit/verify/fix/screenshots/v2-guard-mobile.png) |

---

## 📊 Measured Detection Performance

| Test Corpus | Benchmark Result |
|---|---|
| Independent 296-case Holdout (Audit-Verifier) | **289/296 = 97.6%** accuracy; 0/166 False Negatives, 7/121 False Positives (High-confidence: FP 2/99 = 2.0%) |
| Fresh Uncalibrated 44-case Sanity Corpus | **42/44 = 95.5%** (2 FN on unlisted combosquats: `tiktok-coin.com`, `ledger-live.com`) |
| Public 184-URL Audit Corpus | 183/184 detected (1 FN, 0 FP) |
| Adversarial Lead Probe (66 cases) | **0/26 False Positives (0%)**, **0/40 False Negatives (0%)** — 100% pass |
| Node.js Unit & Regression Test Suite | **69/69 passing (100%)** |

> [!NOTE]
> These figures reflect empirical testing and do not constitute an absolute guarantee. Continued expansion toward full machine-readable UTS-39 tables and graph-based brand models is scheduled for V2.

---

## 🏛️ Browser Architecture Comparison

| Dimension | Google Chrome (MV3) | Mozilla Firefox (MV3) |
|---|---|---|
| **Top-Level GET Navigation** | DNR preflight redirect → Local `guard.html` → Heuristic classification | Synchronous `webRequestBlocking` prior to request dispatch |
| **POST / Form Submissions** | In-Page Content Shield (capture-phase DOM submission interception) | Synchronous `webRequestBlocking` + In-Page Content Shield |
| **DNR Failure Mode** | Explicit "Degraded" status in popup + fallback observer mode | Not applicable (native `webRequestBlocking` available) |
| **Offline First** | Yes (100% offline, zero network requests) | Yes (100% offline, zero network requests) |
| **Browser E2E Execution** | Unpacked extension manual verification (Chrome 155 CLI limitation) | `about:debugging` manual testing |

---

## 🔒 Privacy & Offline Guarantees

- **Zero Network Activity:** Never connects to external servers, cloud services, or remote analytics.
- **Local Storage Only:** Persists only block counters, configuration flags (`strictMode`), and preferred locale (`user_locale`).
- **No Browsing History Persistence:** Visited URLs are never written to disk or transmitted. Single-use bypasses are bound exclusively to the specific tab and session.
- **DOM Shield Integrity:** Reads current action URLs during submission and checks for the existence of password inputs — **never records, logs, or stores password values**.

---

## ⚠️ Known Boundaries & Limitations

1. **POST Shield Coverage:** Form submissions triggered programmatically via `form.submit()` (without firing a submit event), nested cross-origin iframes, or manual `fetch`/XHR calls cannot be intercepted by DOM listeners. Chrome MV3 DNR remains GET-only by specification.
2. **Chrome Global Redirect Flow:** Chrome GET navigations traverse the local guard interstitial, requiring single-use temporary bypass rules.
3. **Data Completeness:** The brand list contains 187 curated entities. Brands outside this catalog are not actively protected.
4. **Residual Edge Cases:** Generic dictionary subdomains on third-party hosts or unlisted brand combinations (`tiktok-coin`) require continued expansion of the heuristic vocabulary.
5. **No Cloud Update Feed:** Domain updates are delivered via extension package releases.

---

## 🚀 Installation & Local Testing

Antipisher is currently distributed as an **Alpha Release** via GitHub:

```bash
# 1. Download the release archive from GitHub Releases or build locally:
python build.py

# 2. Verify archive integrity:
# On Windows:
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
# On Linux/macOS:
bash scripts/verify-release.sh
```

### Google Chrome
1. Navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the [`chrome/`](chrome/) directory.

### Mozilla Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the [`firefox/manifest.json`](firefox/manifest.json) file.
*(Permanent installation outside developer mode requires AMO unlisted signing; see [`docs/ALPHA-INSTALL.md`](docs/ALPHA-INSTALL.md)).*

---

## 🧪 Tests & Development

Antipisher includes a comprehensive automated test suite with zero external dependencies:

```bash
# Run all 38 unit and regression tests
node --test tests/*.test.cjs

# Verify JavaScript syntax across all files
node --check shared/detector.js
node --check shared/shield-content.js
node --check shared/i18n.js
node --check chrome/background.js
node --check firefox/background.js

# Execute independent adversarial holdout & sanity probes
node audit/verify/holdout/run_holdout.cjs
node audit/verify/fix/fresh_sanity.cjs
node audit/lead/lead_probe.cjs

# Build deterministic, bit-identical release archives
python build.py
```

---

## 📜 References & Specifications

- **Unicode Security:** [Unicode Technical Standard #39 (UTS #39)](https://www.unicode.org/reports/tr39/)
- **Chrome Extensions:** [DeclarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- **Mozilla Add-ons:** [MDN webRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)
- **Public Suffixes:** [Public Suffix List (PSL)](https://publicsuffix.org/)
- **Store Policies:** [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

---

## 📄 License & Attribution

Licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
See [`LICENSE`](LICENSE) for full legal text.

Copyright © 2026 VisionGaiaTechnology. All rights reserved.
