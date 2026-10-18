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

## ⚡ Key Capabilities & Architecture Modules

### 🛡️ 1. Phishing & Brand Impersonation Defense
- **187 Curated Brands & 353 Official Domains:** Comprehensive offline database covering global and European financial institutions, government portals, crypto exchanges, cloud/AI infrastructure, logistics, and major platforms in [`shared/sites.js`](shared/sites.js).
- **Multi-Vector Heuristic Detection Engine:**
  - **Typo- & Transposition Defense:** Damerau-Levenshtein 1 & 2 distance detection catches adjacent letter transpositions (`amzaon.com`, `goolge.com`, `paypla.com`).
  - **1-Bit Bitsquatting (`isBitFlip`):** Detects single-bit memory corruption and DNS transmission errors (`amaxon.com` → Amazon, `microsmft.com` → Microsoft, `gongle.com` → Google).
  - **Visual Ligatures & Twin Characters:** Uncovers 2-edit visual lookalikes (`arnazon.com` via `rn→m`, `rnicrosoft.com`, `vv→w`, `cl→d`).
  - **Unicode Homoglyphs & Diacritics:** Identifies mixed-script Cyrillic, Greek, circled alphanumerics, and Latin diacritics (`páypal.com`, `päypal.com`, `mïcrosoft.com`, `amazön.com`) without false-flagging legitimate terms like `über.de`.
  - **Bidirectional Control Characters (UTS #39 / RFC 8264):** Blocks invisible RTL/LTR override characters used to mask file and domain extensions (`\u202E`, `\u202A`–`\u202E`, `\u2066`–`\u2069`).
  - **Brand & Credential Bait Concatenation:** Catches unseparated keyword mashups (`paypalsupport.com`, `binancelogin.com`, `paypal-rechnung.com`, `dhl-sendung.de`, `sparkasse-kontoauszug.de`).
  - **Subdomain Impersonation:** Intercepts brands weaponized as subdomains on foreign roots (`apple.attacker.com`, `paypal.evil.test`).
  - **RFC 3986 Userinfo Deception:** Blocks deceptive userinfo schemes (`https://paypal.com@evil.com/`).
- **Layer 3: Path & Query Inspection:** Identifies targeted brand impersonation in URL paths on foreign hosts (`https://unrelated.com/paypal/login`, `https://phish-host.org/paypal.com/verify`) while preserving legitimate developer documentation, API tutorials, and news articles (`/docs/`, `/news/`, `/blog/`).
- **Shared-Hosting Namespace Isolation:** Public-suffix / customer multi-tenant domains (`force.com`, `github.io`, `vercel.app`, `netlify.app`, `wordpress.com`, etc.) are isolated and never treated as exclusive brand roots (`paypal.force.com` blocked, platform root safe).
- **Official ccTLD Intelligence:** Validates recognized national branches of global brands (`google.co.jp`, `amazon.se`, `ing.nl`, `visa.de`); raises informational warnings on ambiguous ccTLDs and enforces strict blocks on suspicious generic TLDs.
- **In-Page Content Shield (`shared/shield-content.js`):**
  - Intercepts form submissions (`submit` event in DOM capture phase) before credentials leave the browser, closing the Chrome MV3 DNR POST gap.
  - Renders a tamper-proof Glass 2100 warning modal in a closed Shadow DOM (`attachShadow({ mode: 'closed' })`), completely immune to host-page CSS resets and script tampering.
  - Automatically highlights password input fields on suspicious domains with a non-intrusive warning badge.

### 🚫 2. Tracker & Telemetry Defense (AEGIS Tracker Shield)
- **Local Declarative Network Blocking:** Native declarative ruleset (`rulesets/trackers.json`) blocking commercial analytics, ads, and telemetry networks in Chrome MV3 (declarativeNetRequest) and Firefox (webRequest).
- **Dynamic Script Surrogates (uBlock-Inspired):** In-page script surrogate defusers for `window.ga`, `window.dataLayer`, `window.fbq`, `window.ttq`, `window.clarity`, `window.hj`, and `navigator.sendBeacon`. Guarantees checkouts, forms, and logins never stall while terminating third-party telemetry.
- **URL Tracking Parameter Sanitizer:** Automatically strips commercial tracking tokens (`utm_source`, `utm_medium`, `fbclid`, `gclid`, etc.) via seamless `history.replaceState`.
- **Live Real-Time Tracker Counter:** Browser toolbar badge and extension popup display live metrics (`Tab: X · Total: Y`), actively updating even when third-party tracker scripts are injected dynamically or loaded asynchronously.

### ⚡ 3. DOM & Script Security (GeDefense Light)
- **Self-XSS Console Defense:** Displays an authoritative developer-console warning banner to protect users from social-engineering copy-paste attacks.
- **Cognitive Fast-Path Engine:** Ultra-low-overhead heuristic scanner that validates safe HTML without unnecessary DOM tree re-parsing.
- **Dynamic Injection & Protocol Neutralization:** Disarms dangerous `<script>` and `<iframe>` injections, strips inline event handlers (`onerror`, `onclick`), and neutralizes `javascript:` URI execution schemes at the prototype level (`Element.prototype.setAttribute`).

### 🎭 4. Privacy & Anti-Fingerprinting
- **Canvas & WebGL Cloaking:** Injects subtle, imperceptible 1-bit noise into HTML5 Canvas readbacks and masks WebGL renderer strings to defeat cross-site fingerprinting.
- **Screen Geometry Fuzzing:** Normalizes and fuzzes available screen resolution metrics to prevent cross-profile device hardware tracking.
- **Rotating Digital Identity Seed:** Generates a cryptographic session seed with a 1-click "Re-roll Identity" button in the popup and options dashboard.
- **100% Offline & Zero Telemetry:** Zero external HTTP requests, zero cloud dependencies, no API keys, and no recording of user browsing history.

### ⚙️ 5. User Experience, Settings & Whitelist
- **Dedicated Options Dashboard (`options.html`):** Comprehensive Glass 2100 preferences center accessible via the popup gear icon or extension management.
- **Custom Domain Whitelist:** Instant, local management of trusted domains and internal portals (e.g., enterprise intranets), immediately bypassing detection without remote queries.
- **Quiet Safe Browsing & Glass 2100 Status Toast:** Clean, verified websites load immediately with zero added latency (0 ms) and without any disruptive full-screen interstitials. A sleek, floating Glass 2100 status toast (*"Domain verified · Antipisher"*) briefly appears in the screen corner and gently auto-fades without blocking mouse interactions (`pointer-events: none`).
- **Standard vs. Strict Preflight Mode:** Standard mode provides smooth, direct browsing with on-demand threat interception; Strict mode offers an optional full-screen pre-request gate for high-risk threat environments.
- **4 Native Languages:** 100% complete key parity across English (`en`), Deutsch (`de`), Русский (`ru`), and 中文 (`zh`), automatically matching the browser locale with manual override.

### 🏗️ 6. Architecture, Accessibility & Reproducibility
- **Chrome MV3 Preflight & Fail-Open Elimination:** Preflight GET requests via declarativeNetRequest; if DNR configuration encounters an error, Antipisher persists a degraded state and falls back to observer mode with clear UI indication. Eliminates arbitrary URL length limits.
- **Firefox MV3 Strict Conformance:** Synchronous `webRequestBlocking` + In-Page Shield with explicit `web_accessible_resources` and `data_collection_permissions: {"required":["none"]}` in compliance with AMO and MDN standards.
- **Glass 2100 Design System:** Shared design tokens (`shared/design-tokens.css`), dark mineral glass aesthetics, visible 2px keyboard focus rings, WCAG-AA compliant contrast (≥ 4.5:1), ARIA `alertdialog`, reduced-motion, and forced-colors support.
- **Deterministic Reproducible Builds:** Bit-identical ZIP generation with fixed timestamps via `build.py` and repository-level verification via [`SHA256SUMS.txt`](SHA256SUMS.txt).

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
