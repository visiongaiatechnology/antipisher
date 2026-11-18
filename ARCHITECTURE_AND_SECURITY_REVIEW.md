# Antipisher by GeDefense 0.2.4 — Architektur- und Security-Review (Platin-Status)

> **Qualitäts- & Sicherheitsstatus:** **`PLATIN`** (`VGT-100: 48/52 anwendbare Kontrollen PASS, 0 FAIL` · `Release Gate: CONDITIONAL` nur für externe Store-Codesignierung `VGT-056` / GUI-Browser-Smoke-Test `VGT-090`) · Stand: `18.11.2026`.

---

## 1. Source Identity & Kennzahlen

| Parameter | Verifizierter Wert |
|---|---|
| Produkt / Version | **Antipisher by GeDefense `0.2.4`** (Chrome MV3 & Firefox MV3) |
| Lizenz | GNU Affero General Public License v3.0 (`AGPL-3.0-only`) |
| Marken-Datenbank | `shared/sites.js` ≡ `sites-100.json` (**187 Marken / 353 offizielle Domains**, RFC-1123-validiert) |
| Detektor-Engine | `shared/detector.js` (RFC-1035-Längenbudgets, Label-Precomputation, `p50 = 0,023 ms`, `p95 = 0,39 ms`) |
| In-Page Defense | `shared/shield-content.js` (Shadow-DOM Form/POST-Shield & Safe-Toast) + `shared/aegis-engine.js` (AEGIS Anti-Fingerprinting, Ad/Tracker-Shield, GeDefense Light Supply-Chain/Magecart/Clipper-Guard) |
| Build & SBOM | `build.py` (`ALLOWED_PACKAGE_FILES`, 2× bit-identisch) + `SHA256SUMS.txt` + CycloneDX 1.5 `sbom.json` (0 externe Dependencies) |
| Automatisierte Tests | **13 Testdateien · 91/91 Unit- & Security-Negativtests PASS** (`Exit 0`) |
| VGT-100 Security-Probes | **9/9 Probes PASS** (`probe01`..`probe09` + `validate_audit.py` `Exit 0`) |
| Detektor-Genauigkeit | Holdout: **292/296 PASS (98,65 %, 0/166 FN = 100 % TPR)** · `probe02`: **42/43 Angriffe (97,7 %), 0/745 Benign-FP (0,0 %)** · Fresh-Sanity: **44/44 PASS (100 %)** |

---

## 2. Mehrschichtige Verteidigungsarchitektur (Defense-in-Depth)

```text
Web-Navigation / Seitenaufruf / Formular-Interaktion
  │
  ├─► [Schicht 1: Netzwerk- & Navigations-Gate]
  │     ├─ Chrome MV3: DNR-Preflight (Streng) + webNavigation-Observer (Standard & Degraded-Fallback)
  │     ├─ Firefox MV3: webRequestBlocking (main_frame + Tracker-Subressourcen, Fail-Closed Engine Guard)
  │     └─ Tracker- & Supply-Chain-DNR/WebRequest (`rulesets/trackers.json`, Optimizely + C2-IOCs)
  │
  ├─► [Schicht 2: Deterministische Offline-Phishing- & Homograph-Engine (`shared/detector.js`)]
  │     ├─ RFC-1035 Host-/Label-Bounds (MAX_HOST_LEN=253, MAX_LABEL_LEN=63, 100k-Host in 0,26 ms)
  │     ├─ Punycode/IDNA, NFKD-Skeleton, Kyrillisch/Griechisch/Diakritika-Homoglyphen, Zero-Width & Bidi
  │     ├─ Visuelle Ligaturen (rn/m, vv/w, cl/d), Damerau-Levenshtein 1/2, Bitsquatting, Combosquats
  │     ├─ Multi-Tenant-Isolierung (force.com, github.io, vercel.app, pages.dev ...)
  │     └─ Layer-3-Pfad-Phishing & RFC-3986-Userinfo-Täuschungsschutz
  │
  ├─► [Schicht 3: Isoliertes Guard-Interstitial (`guard.html` / `guard.js`)]
  │     ├─ Synchrones Initial-Rendering ohne Flash, 100 % textContent (0 innerHTML-Sinks)
  │     └─ Doppelt gebundene Einmal-Freigabe (`allow-once`: sender.url + tab.url + http(s) + 30s TTL)
  │
  ├─► [Schicht 4: Content-Shield (`shared/shield-content.js`)]
  │     ├─ Capture-Phase Form-Submit-Interceptor (schließt die POST-Formular-Lücke im Dokument)
  │     └─ Geschlossenes Shadow-DOM (`mode: 'closed'`) + konfigurierbarer Glass-2100-Safe-Toast
  │
  └─► [Schicht 5: AEGIS OMEGA & GeDefense Light (`shared/aegis-engine.js`)]
        ├─ Canvas-, WebGL-, Audio- & Font-Anti-Fingerprinting mit rotierbarem Session-Seed
        ├─ Safe Analytics Surrogates (`ga`, `gtag`, `dataLayer`, `fbq`, `ttq`, `clarity`, `hj`)
        ├─ Cross-Origin `<script>`/`<iframe>` Supply-Chain-Gatekeeper (blockiert `.icu`, `.lol`, C2-IPs)
        ├─ Anti-Magecart `sendBeacon`/`fetch` Exfiltrationsschutz (`/card.php`, Skimmer-Payloads)
        ├─ Crypto-Clipper Clipboard-Schutz (`navigator.clipboard.writeText` vs. echte DOM-Selektion)
        └─ YouTube Video Ad Defense (ohne falsches Überspringen des Hauptvideos nach Werbeende)
```

---

## 3. Behobene Audit-Befunde auf dem Weg zum Platin-Status

1. **VGT-020 / `FIND-009` (Ressourcenlimits & CPU-Budget):**
   RFC-1035-Längenprüfungen (`host <= 253`, `label <= 63`, `labels <= 32`) und einmalige Label-Vorberechnung senken die Verarbeitungszeit eines `100.000`-Zeichen-Hostlabels von `2.753 ms` auf **`0,26 ms`** (**10.590× schneller**) und die reguläre `p95`-Latenz auf **`0,39 ms`**.
2. **VGT-002 / VGT-061 / VGT-062 / VGT-063 / VGT-066 / `FIND-002` & `FIND-003` (Fail-Closed & Lifecycle):**
   - `ALLOW_TTL_MS = 30000` (30s TTL) für Einmal-Freigaben in Chrome und Firefox sowie sofortige Invalidierung bei abweichender Navigation.
   - Queue-serialisiertes `configure()` in Chrome verhindert Race-Conditions bei überlappenden Moduswechseln; Startup-Session-Purge läuft vor dem ersten Storage-Read.
   - Fehlende oder werfende Detektor-Engine in Firefox (`analyzeRequest`) und Chrome (`onBeforeNavigate`) leitet Navigationen **fail-closed** auf `guard.html` um und setzt `protectionDegraded = true`.
3. **VGT-071 / VGT-072 / `FIND-006` (Datensparsames Security-Event-Log):**
   Lokaler Ringpuffer `storage.local.securityEvents` (max. 50 Einträge, `{ ts, type, detail }`) protokolliert `block`, `allow-once`, `degraded` und `healthy` ohne Speicherung von URLs, Hostnamen oder PII.
4. **VGT-051 / VGT-055 / VGT-059 / `FIND-005` (Supply-Chain & Build-Hygiene):**
   `build_sites.py` erzwingt RFC-1123-Hostname-Regexe; `build.py` erzwingt `ALLOWED_PACKAGE_FILES` (22 Dateien) und generiert deterministisch `SHA256SUMS.txt` sowie eine CycloneDX-1.5-SBOM (`sbom.json`).
5. **VGT-080 / `FIND-007` & `FIND-008` (Detektor-Kalibrierung):**
   Eliminierung aller 20 Benign-FPs in `probe02` (`0/745 FP`) sowie Erkennung der Combosquats `tiktok-coin.com`, `ledger-live.com` und `paypal-me.com` (`42/43` in `probe02`, `44/44` in `fresh_sanity.cjs`, `292/296` mit `0 FN` im Holdout).
6. **Synchrones Guard-Rendering (`FIND-011`):**
   Behebung eines Optional-Chaining-Kurzschlusses in `shared/guard.js`, sodass Warnhinweise sofort synchron vor dem asynchronen `storage.local`-Abruf gerendert werden (`probe06`: `38/38 PASS`).

---

## 4. Qualitäts- und Security-Bewertung (`v0.2.4`)

| Achse | Bewertung | Nachweis |
|---|---|---|
| Architektur & Trust Boundaries | **PLATIN** | Doppelt gebundene IPC, 30s TTL, Queue-Mutex, Fail-Closed Engine Guards |
| Phishing- & Homograph-Erkennung | **PLATIN** | Holdout **100 % TPR (0/166 FN)**, `probe02` **97,7 % TPR / 0,0 % FP (0/745)**, Sanity **44/44** |
| In-Page & Supply-Chain Defense | **PLATIN** | Content-Shield (POST-Forms) + GeDefense Light (Optimizely/Magecart/Clipper) + AEGIS |
| Performance & DoS-Härtung | **PLATIN** | `p50 = 0,023 ms`, `p95 = 0,39 ms`, `100k`-Hostlabel in `0,26 ms` |
| Build, SBOM & Regression-Gate | **PLATIN** | `ALLOWED_PACKAGE_FILES`, CycloneDX 1.5 `sbom.json`, 2× bit-identische ZIPs, **91/91 Tests PASS** |
| **Gesamtstatus** | **`PLATIN`** | Vollständige Evidenz in [`audit/security/AUDIT_SECURITY.md`](audit/security/AUDIT_SECURITY.md) & [`audit/security/AUDIT_MATRIX.json`](audit/security/AUDIT_MATRIX.json) |
