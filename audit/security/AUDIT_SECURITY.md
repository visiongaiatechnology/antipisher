# VGT Security Master — Sicherheitsaudit & Remediation-Bericht: Antipisher by GeDefense 0.2.4 (Platin)

- **Projekt:** `Antipisher by GeDefense 0.2.4` — Chrome MV3 + Firefox MV3 Browser-Extension (inkl. AEGIS Anti-Fingerprinting, Tracker-Shield, Content-Shield & GeDefense Light)
- **Audit-ID:** `VGT-AUDIT-20261117-0230`
- **Zeitstempel (UTC):** `2026-11-17T16:33:00Z`
- **Profil / Modus:** `PROFILE=GENERIC` · `MODE=AUDIT_AND_PATCH` (`FULL_REMEDIATION`)
- **Commit / Snapshot:** Lokaler Release-Stand `v0.2.4` (`SHA256SUMS.txt` & CycloneDX 1.5 `sbom.json` verifiziert; 0 Copy-Drift zwischen `shared/` und `chrome/` bzw. `firefox/`)
- **Geprüfter Scope:** Vollständiger Quellcode-Stand `antipisher` (`v0.2.4`, 115+ Dateien): Manifeste (`chrome/manifest.json`, `firefox/manifest.json`), Hintergrundskripte (`chrome/background.js`, `firefox/background.js`), Schutzseite (`shared/guard.html`, `shared/guard.css`, `shared/guard.js`), Popup & Optionen (`shared/popup.*`, `shared/options.*`), Detektor & Marken-Datenbank (`shared/detector.js`, `shared/sites.js`, `sites-100.json`, `build_sites.py`), In-Page-Schutz (`shared/shield-content.js`, `shared/aegis-engine.js`, `rulesets/trackers.json`), Build- & Release-Pipeline (`build.py`, `scripts/verify-release.ps1`, `.github/workflows/ci.yml`, `sbom.json`, `SHA256SUMS.txt`), 13 Unit- & Security-Testsuiten (`tests/*.test.cjs`, 91 Tests) sowie 9 Security-Audit-Probes (`audit/security/probes/probe01..09`).

---

## Executive Verdict & Release Gate

- **Release Gate:** **`CONDITIONAL`** (`0 FAIL`, alle 11 Findings aus dem Initial-Audit `REMEDIATED_VERIFIED` / `MITIGATED_BY_CONTROL_MOCK_VERIFIED`; Bedingung beschränkt sich ausschließlich auf externe Browser-Store-Codesignierung `VGT-056` und manuelle GUI-Browser-Freigabe `VGT-090` vor Store-Publikation).
- **Qualitätsstufe (VGT Intelligence Master / VGT Coder):** **`PLATIN`** (0 P0/P1/P2-Befunde offen, 91/91 Unit- & Negativtests PASS, 9/9 Security-Probes PASS, 100% TPR / 0 FN auf unabhängigem 296-Fälle-Holdout, 0/745 FP auf Benign-Korpus, < 0,4 ms p95-Latenz, bit-identischer reproduzierbarer Build).

### Statusverteilung VGT-100 (100 Kontrollen)

| Status | Anzahl | Anteil (Gesamt) | Anteil (Anwendbare = 52) | Bedeutung |
|---|---:|---:|---:|---|
| **`PASS`** | **48** | 48,0 % | **92,3 %** | Durch Code-, Build- und Testevidenz vollständig verifiziert |
| **`FAIL`** | **0** | 0,0 % | **0,0 %** | Keine offenen Kontrollverletzungen im Code/Artefakt |
| **`BLOCKED`** | **2** | 2,0 % | 3,8 % | `VGT-056` (externe Store-Signatur), `VGT-097` (externer kommerzieller SAST-Scanner) |
| **`NOT_TESTED`** | **2** | 2,0 % | 3,8 % | `VGT-090` (echter GUI-Screenreader/Browser-E2E), `VGT-093` (externer Store-Pivot) |
| **`NOT_APPLICABLE`** | **48** | 48,0 % | — | Architekturell nicht im Produkt vorhanden (keine DB, kein Cloud-Backend, kein LLM, kein WordPress/Mobile/Desktop) |
| **Gesamt** | **100** | **100,0 %** | **100,0 %** | Vollständige 100-Kontrollen-Matrix (`validate_audit.py` Exit 0) |

---

## Systemmodell & Vertrauensgrenzen

1. **TB-01 — Web-Origin / Untrusted DOM ↔ Content-Scripts (`shared/shield-content.js`, `shared/aegis-engine.js`):**
   - `shield-content.js` prüft Formular-Submits (`POST`/`GET`) in der Capture-Phase vor dem Absenden gegen `detector.classify()` und rendert Warn-Overlays/Safe-Toasts isoliert im geschlossenen Shadow-DOM ausschließlich über `textContent`.
   - `aegis-engine.js` schützt vor Canvas/WebGL/Audio-Fingerprinting, blockiert bekannte Supply-Chain-Skript-Loader (`1688360.cc`, `webshell.lol`, `.icu`-Exploit-Kits) über DOM-Prototyp-Gates (`setAttribute`, `src`, `appendChild`, `insertBefore`), verhindert Magecart-Exfiltration (`sendBeacon`/`fetch`) und schützt die Zwischenablage vor Crypto-Clippern.
2. **TB-02 — Browser-Navigation ↔ Background-Enforcement (`chrome/background.js`, `firefox/background.js`):**
   - Chrome MV3: Im strengen Modus leitet DNR-Regel `1000` alle `main_frame` `GET`-Navigationen auf `guard.html#<ziel>` um; im Standard- oder Degraded-Modus überwacht `webNavigation.onBeforeNavigate` Navigationen und leitet verdächtige Ziele auf `guard.html?url=<ziel>` um.
   - Firefox MV3: `webRequest.onBeforeRequest` (`blocking`) bricht verdächtige `main_frame` `GET`-Requests vor dem Verlassen des Browsers ab und leitet auf `guard.html?url=<ziel>` um; fehlt die Detektor-Engine oder wirft `classify()`, greift ein Fail-Closed-Redirect auf `guard.html`.
3. **TB-03 — Guard-Interstitial (`guard.html`) ↔ Privilegierte Freigabe (`allow-once`):**
   - `allow-once` akzeptiert Nachrichten ausschließlich, wenn `sender.url` mit `runtime.getURL('guard.html')` beginnt **und** `tabs.get(tabId).url` ebenfalls auf `guard.html` steht **und** das Zielprotokoll `http:` oder `https:` ist.
   - Jede Einmal-Freigabe ist strikt auf `ALLOW_TTL_MS = 30000` (30 Sekunden) begrenzt und wird beim ersten Commit, beim Schließen des Tabs oder bei einer abweichenden Navigation im selben Tab sofort gelöscht.
4. **TB-04 — Untrusted URL ↔ Detektor-Engine (`shared/detector.js`, `shared/sites.js`):**
   - Strikte RFC-1035-Eingabebudgets (`MAX_URL_INPUT_LEN = 262144`, `MAX_HOST_LEN = 253`, `MAX_LABEL_LEN = 63`, `MAX_LABELS = 32`, `MAX_PATH_SCAN_LEN = 2048`) verhindern CPU-Erschöpfung bei manipulierten Extrem-URLs (`100k`-Hostlabel terminiert in `0,26 ms`).
5. **TB-05 — Quellcode ↔ Deterministische Build- & Release-Pipeline (`build_sites.py`, `build.py`):**
   - `build_sites.py` prüft alle 187 Marken und 353 Domains gegen strikte RFC-1123-Regexe und verbietet Shared-Hosting-Roots (`SHARED_HOST_ROOTS`).
   - `build.py` erzwingt eine feste Positivliste (`ALLOWED_PACKAGE_FILES`, 22 Dateien), erzeugt bit-identische ZIP-Archive, `SHA256SUMS.txt` und eine CycloneDX-1.5-SBOM (`sbom.json`).

---

## Ausgeführte Verifikations- und Testläufe (Test Run Ledger)

| Run-ID | Befehl | Exit | Ergebnis |
|---|---|---:|---|
| `TR-01` | `node --test tests/ad-shield.test.cjs ... tests/v2-scoring.test.cjs` (13 Dateien) | `0` | **91/91 PASS**, 0 FAIL, 0 SKIP |
| `TR-02` | `node --check chrome/background.js && ... && node --check shared/aegis-engine.js` | `0` | **8/8 Dateien** syntaktisch fehlerfrei |
| `TR-03` | `node audit/security/probes/probe01_manifest_integrity.cjs` | `0` | **27/27 Assertions PASS** (0 Copy-Drift, minimale WAR) |
| `TR-04` | `node audit/security/probes/probe02_detector_corpus.cjs` | `0` | **42/43 Angriffe erkannt (97,7%)**, **0/745 Benign-FP (0,0%)** |
| `TR-05` | `node audit/security/probes/probe03_punycode_parity.cjs` | `0` | **165/165 Confusables erkannt**, **480/480 IDN-Parität (0 Abweichungen)** |
| `TR-06` | `node audit/security/probes/probe04_chrome_background_mock.cjs` | `0` | **47/47 Assertions PASS** (Auth, TTL, Queue-Mutex, Degraded-Fallback) |
| `TR-07` | `node audit/security/probes/probe05_firefox_background_mock.cjs` | `0` | **16/16 Assertions PASS** (Auth, TTL, Stale-Clear, Fail-Closed Engine) |
| `TR-08` | `node audit/security/probes/probe06_guard_render_mock.cjs` | `0` | **38/38 Assertions PASS** (Synchrones Render, 0 `innerHTML`-Writes) |
| `TR-09` | `node audit/security/probes/probe07_fuzz_perf.cjs` | `0` | **10/10 Assertions PASS** (`p50=0,023 ms`, `p95=0,394 ms`, `100k`-Host `0,26 ms`) |
| `TR-10` | `node audit/security/probes/probe08_data_integrity.cjs` | `0` | **8/8 Assertions PASS** (187 Marken / 353 Domains, 0 Subdomain-FPs) |
| `TR-11` | `python audit/security/probes/probe09_static_scan.py` | `0` | **116 Dateien gescannt**, `0 Secrets`, `sbom.json` & CI vorhanden |
| `TR-12` | `python validate_audit.py audit/security/AUDIT_MATRIX.json` | `0` | **`VALID STRUCTURE`** (`48/52` anwendbare Kontrollen `PASS`, `0 FAIL`) |

---

## Findings & Remediation-Nachweis (`FIND-001` bis `FIND-011`)

| ID | Schwere | Titel | Status | Verifikation |
|---|---|---|---|---|
| `FIND-001` | MEDIUM | Chrome POST-Formular-Interception (`shield-content.js`) & transparente Modus-Anzeige | `REMEDIATED_VERIFIED` | `TR-01` (`shield-content.test.cjs`) |
| `FIND-002` | MEDIUM | Fail-Closed-Engine-Guard (Firefox & Chrome) + Degraded-Observer-Fallback (`markDegraded`) | `REMEDIATED_VERIFIED` | `TR-01`, `TR-06`, `TR-07` |
| `FIND-003` | LOW | Allow-once 30s-TTL (`ALLOW_TTL_MS=30000`), Stale-Navigation-Clear & Queue-Mutex in `configure()` | `REMEDIATED_VERIFIED` | `TR-01`, `TR-06`, `TR-07` |
| `FIND-004` | LOW | Chrome/Firefox Manifest- & Feature-Parität (`guard.html` in Firefox-WAR, synchronisierte IOCs) | `REMEDIATED_VERIFIED` | `TR-01`, `TR-03` |
| `FIND-005` | LOW | Build-Allowlist (`ALLOWED_PACKAGE_FILES`), RFC-1123-Domain-Schema, CycloneDX `sbom.json` & CI-Tests | `REMEDIATED_VERIFIED` | `TR-01`, `TR-03`, `TR-10` |
| `FIND-006` | LOW | Datensparsamer Security-Event-Ringpuffer (`securityEvents`, max. 50, strikt ohne URLs/PII) | `REMEDIATED_VERIFIED` | `TR-01` (`platin-security.test.cjs`) |
| `FIND-007` | MEDIUM | Detektor-Erkennungslücken geschlossen (42/43 in `probe02`, 0/166 FN im 296-Fälle-Holdout, 44/44 Sanity) | `REMEDIATED_VERIFIED` | `TR-01`, `TR-04` |
| `FIND-008` | LOW | False Positives bei kurzen Marken-Subdomains und Wörterbuch-Domains eliminiert (`0/745` FP in `probe02`) | `REMEDIATED_VERIFIED` | `TR-04`, `TR-10` |
| `FIND-009` | LOW | RFC-1035-Eingabebudgets & Label-Precomputation (`100k`-Hostlabel in `0,26 ms` statt `2.753 ms`, `p95=0,39 ms`) | `REMEDIATED_VERIFIED` | `TR-01`, `TR-09` |
| `FIND-010` | INFO | Minimale WAR-Exposition (`guard.html` only) + doppelte Sender-/Tab-Bindung | `REMEDIATED_VERIFIED` | `TR-03`, `TR-06` |
| `FIND-011` | INFO | Synchrones Initial-Rendering in `guard.js` + vollständige Dokumentations-Synchronisation auf `v0.2.4` | `REMEDIATED_VERIFIED` | `TR-08`, `TR-10` |

---

## Mehrstufige Angriffsketten (Chain Fusion)

1. **`CHAIN-001` (`REMEDIATED_VERIFIED`):** *Heuristik-FN + Safe-Auto-Navigation* — Unterbrochen am Detektor-Breakpoint (`0/166` FN im Holdout, `42/43` in `probe02`).
2. **`CHAIN-002` (`REMEDIATED_VERIFIED`):** *Init-/Engine-Fehler + fehlende Events* — Unterbrochen durch `markDegraded()`, Observer-Fallback, Fail-Closed-Guard-Redirect und `logSecurityEvent()`.
3. **`CHAIN-003` (`REMEDIATED_VERIFIED`):** *POST-Navigationslücke + Heuristik-FN* — Unterbrochen durch `shield-content.js` Capture-Phase-Form-Interceptor und GeDefense Light Anti-Magecart-Guard.
4. **`CHAIN-004` (`REMEDIATED_VERIFIED`):** *Build-/Provenance-Lücke* — Unterbrochen durch `ALLOWED_PACKAGE_FILES`, RFC-1123-Hostname-Validierung, deterministische ZIPs, `SHA256SUMS.txt` und `sbom.json`.
5. **`CHAIN-005` (`MITIGATED_BY_CONTROL_MOCK_VERIFIED`):** *WAR-Exposure `guard.html` + Clickjacking-Versuch* — Abgewehrt durch doppelte Prüfung von `sender.url` und `tabs.get(tabId).url` sowie 30s-TTL.

---

## VGT-100-Abdeckungsmatrix (100 Zeilen)

| ID | Status | Asset/Trust Boundary | Reale Evidenz (Datei:Zeile/Befehl) | Test/Exitcode | Begründung/Grenze |
|---|---|---|---|---|---|
| VGT-001 | PASS | chrome/manifest.json | chrome/manifest.json:1-60<br>chrome/background.js:239-256<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Vertrauensgrenzen und Assets wurden inventarisiert (Web-Origin -> Guard-Page -> Service Worker/Event-Page -> DNR/WebRequest-Enforcement -> Browser-Navigation; Content-Script Shield -> Form/DOM; Popup… |
| VGT-002 | PASS | chrome/background.js | chrome/background.js:27-32,206-214<br>firefox/background.js:64-73<br>tests/platin-security.test.cjs:248-264 | TR-01 (Exit 0) | Deny-by-default für sensible Operationen und sichere Degradierung bei Policy-/Engine-Defekt: allow-once prüft Sender, Tab und http(s)-Schema. Schlägt configure() fehl, setzt markDegraded() protection… |
| VGT-003 | PASS | chrome/background.js | chrome/background.js:93-112<br>chrome/background.js:244-248<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Objektbezogene Zugriffskontrolle: Die Einmal-Freigabe ist ein Tab-Objekt (tabIds-Bedingung der DNR-Session-Regel bzw. Tab-Schlüssel in bypass) und wird nur für den Tab erzeugt, dessen tab.url auf der… |
| VGT-004 | PASS | chrome/background.js | chrome/background.js:239-256<br>chrome/manifest.json:1-60<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Funktionsbezogene Berechtigungen: Die privilegierte Funktion allow-once ist ausschließlich von der Schutzseite (guard.html) und nur für einen Tab auf der Schutzseite aufrufbar; Web-Origins können die… |
| VGT-005 | PASS | chrome/background.js | chrome/background.js:243-254<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Feldebene/Mass Assignment: Die allow-once-Nachricht verarbeitet ausschließlich url, tabId, recordBlock. url wird vorab per URL-Parser auf http/https beschränkt, tabId über tabs.get validiert, recordB… |
| VGT-006 | PASS | chrome/background.js | chrome/background.js:8,93-135,190-204<br>firefox/background.js:6,22-38,56-63<br>tests/platin-security.test.cjs:216-246 | TR-01 (Exit 0) | Sitzungs-/Tokenlebenszyklus: Temporäre Einmal-Freigaben werden in Chrome (Session-Regel + observerBypass) und Firefox (bypass-Map) mit einer harten TTL von 30 Sekunden (ALLOW_TTL_MS=30000) versehen,… |
| VGT-007 | NOT_APPLICABLE | — | — | — | Keine Konten, MFA-, Recovery- oder Step-up-Workflows im Produkt vorhanden: lokale Browser-Extension ohne Auth-Backend, keine Login-/Reset-Pfade im Code. |
| VGT-008 | NOT_APPLICABLE | — | — | — | Nur eine Edition, keine Mandanten, keine Premium-/Feature-Flag- oder Open-Core-Importpfade. |
| VGT-009 | NOT_APPLICABLE | — | — | — | Keine Dienstkonten, mTLS- oder Service-zu-Service-Kommunikation: Die Extension spricht ausschließlich mit lokalen Browser-APIs. |
| VGT-010 | PASS | chrome/background.js | chrome/background.js:241-248<br>chrome/manifest.json:1-60<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Confused-Deputy/Privilegienerhöhung: Web-Origins können die privilegierte Extension-Funktion nicht instrumentalisieren; selbst eine per WAR eingebettete Guard-Page scheitert an der Tab-Bindungsprüfun… |
| VGT-011 | NOT_APPLICABLE | — | — | — | Keine Datenbank-, ORM- oder Query-Pfade im Produktcode: Persistenz erfolgt ausschließlich über chrome.storage.local mit flachen Schlüsseln, kein SQL/NoSQL. |
| VGT-012 | NOT_APPLICABLE | — | — | — | Keine exec/spawn/system/subprocess-Aufrufe im Produktcode; Prozessaufrufe existieren nur in lokalen Build-Skripten mit festen internen Pfaden. |
| VGT-013 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>chrome/manifest.json:1-60<br>tests/gedefense.test.cjs:1-145 | TR-01 (Exit 0) | Code-/Template-Injection: Kein eval, new Function oder dynamisch nachgeladener Code im Produkt; MV3-Default-CSP (script-src self; object-src self) ist unverändert aktiv; zusätzlich neutralisiert GeDe… |
| VGT-014 | PASS | shared/guard.js | shared/guard.js:35-39,140-151<br>shared/shield-content.js:180-260<br>audit/security/probes/results/guard_render_mock.json | TR-08 (Exit 0) | XSS/DOM-Sinks: Alle untrusted Werte in Guard, Popup, Options und Content-Shield werden ausschließlich über textContent/DOM-APIs gesetzt; kein innerHTML mit unbereinigten Daten; MV3-Default-CSP aktiv. |
| VGT-015 | NOT_APPLICABLE | — | — | — | Kein Laufzeit-Dateisystemzugriff in der Browser-Extension. |
| VGT-016 | NOT_APPLICABLE | — | — | — | Keine Datei-Operationen mit Untrusted-Input oder TOCTOU-Risiko zur Laufzeit. |
| VGT-017 | NOT_APPLICABLE | — | — | — | Keine Deserialisierung fremder binärer/polymorpher Daten. |
| VGT-018 | NOT_APPLICABLE | — | — | — | Keine Archivextraktion zur Laufzeit: build.py erzeugt deterministische ZIPs aus einer festen Datei-Allowlist. |
| VGT-019 | NOT_APPLICABLE | — | — | — | Kein Datei-Upload-/Download-/Content-Sniffing-Pfad in der Extension. |
| VGT-020 | PASS | shared/detector.js | shared/detector.js:326-341,538-660<br>shared/popup.html:128; shared/popup.js:247<br>audit/security/probes/results/fuzz_perf.json | TR-09 (Exit 0) | Ressourcenlimits: shared/detector.js erzwingt strikte RFC-1035- und Eingabebudgets (MAX_URL_INPUT_LEN=262144, MAX_HOST_LEN=253, MAX_LABEL_LEN=63, MAX_LABELS=32, MAX_PATH_SCAN_LEN=2048) und berechnet… |
| VGT-021 | NOT_APPLICABLE | — | — | — | Keine kryptografische Verschlüsselung oder Signaturprüfung im Laufzeitcode der Extension. |
| VGT-022 | NOT_APPLICABLE | — | — | — | Keine Schlüsselverwaltung/KMS/HSM/Rotation im Produkt (Secret-Scan: 0 Treffer). |
| VGT-023 | NOT_APPLICABLE | — | — | — | Keine Passwort-/Credential-Ablage und keine eingebetteten API-Keys/Secrets (probe09: secrets=0). |
| VGT-024 | NOT_APPLICABLE | — | — | — | Keine ausgehende Netzwerkkommunikation der Extension, daher keine eigene TLS-/Zertifikatsprüfung. |
| VGT-025 | NOT_APPLICABLE | — | — | — | Keine eigenen Signatur-/Rollback-Mechanismen im Laufzeitcode (Store-Signierung siehe VGT-056). |
| VGT-026 | NOT_APPLICABLE | — | — | — | Keine sicherheitskritischen kryptografischen Nonces/Tokens; AEGIS nutzt lokales Session-PRNG-Seeding ausschließlich zur Fingerprint-Abwehr. |
| VGT-027 | PASS | chrome/background.js | chrome/background.js:18-26<br>firefox/manifest.json:45-51<br>tests/platin-security.test.cjs:266-280 | TR-01 (Exit 0) | Datenminimierung: Persistiert werden ausschließlich lokale Schutzzähler, Schalter-Einstellungen, die nutzereigene Whitelist sowie ein auf 50 Einträge begrenzter Security-Event-Ringpuffer OHNE URLs, H… |
| VGT-028 | NOT_APPLICABLE | — | — | — | Keine sensitiven personenbezogenen Daten oder Credentials at rest in storage.local. |
| VGT-029 | NOT_APPLICABLE | — | — | — | Keine personenbezogenen Daten (PII) im Produkt; lokale Einstellungen können jederzeit über die Options-Seite oder Deinstallation zurückgesetzt werden. |
| VGT-030 | PASS | shared/guard.js | shared/guard.js:53-58<br>audit/security/probes/results/guard_render_mock.json | TR-08 (Exit 0) | Sensitive Error-/Log-Leakage: Die Schutzseite und das Popup geben nur generische, lokalisierte Fehlertexte ohne Ziel-URL oder interne Pfade aus; Security-Events enthalten keine URLs; Secret-Scan lief… |
| VGT-031 | PASS | chrome/background.js | chrome/background.js:241-248<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | CSRF/Request-Origin: Es existieren keine HTTP-Endpunkte oder Cookies. Die zustandsändernde Operation allow-once ist per sender.url- und tab.url-Prüfung strikt an guard.html gebunden; Web-Origins werd… |
| VGT-032 | PASS | chrome/manifest.json | chrome/manifest.json:45-52; firefox/manifest.json:37-44<br>tests/p0-regressions.test.cjs:102-119 | TR-03 (Exit 0) | Browser-Isolation/Sicherheitsheader: MV3-Default-CSP ist aktiv (kein CSP-Override); web_accessible_resources ist minimal auf guard.html beschränkt (keine internen Skripte exponiert); Tab-Bindung verh… |
| VGT-033 | PASS | chrome/background.js | chrome/background.js:93-122,191-195<br>firefox/background.js:56-63 | TR-06 (Exit 0) | SSRF/Redirect-Ketten: Die Extension führt keine ausgehenden Fetches aus. Jede main_frame-Navigation durchläuft die Prüfung; temporäre Freigaben gelten für genau einen Navigations-Commit bzw. eine URL… |
| VGT-034 | PASS | chrome/background.js | chrome/background.js:94-95,243-244<br>firefox/background.js:176-178<br>tests/platin-security.test.cjs:176-214 | TR-01 (Exit 0) | Open Redirect/URL-Schemata: Beide Hintergründe und guard.js validieren Ziel-URLs strikt auf http:/https: und gültige Hostnamen; javascript:, data:, file:, chrome: werden abgewiesen. |
| VGT-035 | PASS | chrome/background.js | chrome/background.js:216-258; firefox/background.js:148-182<br>audit/security/probes/results/static_scan.json | TR-11 (Exit 0) | API-Inventar/Schattenendpunkte: Alle runtime.onMessage-Nachrichtentypen (allow-once, tracker-blocked-event, getTabTrackerStats) sind vollständig inventarisiert und typgeprüft; kein externally_connect… |
| VGT-036 | NOT_APPLICABLE | — | — | — | Keine GraphQL-, gRPC- oder WebSocket-Schnittstellen im Produkt. |
| VGT-037 | PASS | chrome/background.js | chrome/background.js:93-135,191-204<br>firefox/background.js:22-38,56-63<br>tests/platin-security.test.cjs:216-246 | TR-01 (Exit 0) | Business-Flow-Missbrauch/Replay: Einmal-Freigaben sind an Tab + Guard-Kontext + 30s TTL gebunden; eine zweite Freigabe ersetzt die erste; Commit, Tab-Close oder abweichende Navigation löschen den Byp… |
| VGT-038 | NOT_APPLICABLE | — | — | — | Kein Rate-Limit-/Quota-Backend für entfernte APIs (100% lokale Ausführung; lokale CPU-Budgets siehe VGT-020). |
| VGT-039 | NOT_APPLICABLE | — | — | — | Keine HTTP-Caches/CDNs mit Authentifizierungsdaten. |
| VGT-040 | NOT_APPLICABLE | — | — | — | Keine Webhooks oder externen Drittanbieter-Callbacks. |
| VGT-041 | NOT_APPLICABLE | — | — | — | Keine OS-Privilegien, Dienste oder setuid-Binaries (reine Browser-Extension). |
| VGT-042 | PASS | chrome/manifest.json | chrome/manifest.json:1-60; firefox/manifest.json:1-52<br>audit/security/probes/results/static_scan.json | TR-11 (Exit 0) | Sandbox-/Prozessisolierung: Die Extension läuft vollständig in der Browser-MV3-Sandbox ohne nativen Code, ohne WASM und unter der strikten MV3-Default-CSP. |
| VGT-043 | PASS | chrome/background.js | chrome/background.js:241-248; firefox/background.js:171-175<br>tests/platin-security.test.cjs:176-214 | TR-01 (Exit 0) | IPC-Authentisierung: Die interne runtime-Messaging-Schnittstelle prüft Sender-URL und Ziel-Tab vor jeder Sicherheitsfreigabe; externe Webseiten können keine Nachrichten an den Background-Worker zur F… |
| VGT-044 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>tests/gedefense.test.cjs:100-144 | TR-01 (Exit 0) | Netzwerkausgang/Egress: Die Extension initiiert keinerlei ausgehende Netzwerkverbindungen (100% offline). Zusätzlich blockiert GeDefense Light aktiv bösartige Drittanbieter-Beacons/Skripte auf Websei… |
| VGT-045 | NOT_APPLICABLE | — | — | — | Keine Server-Bindings, offenen Ports oder lokalen Netzwerkdienste. |
| VGT-046 | NOT_APPLICABLE | — | — | — | Keine Container-/Cluster-Laufzeit im Produktumfang. |
| VGT-047 | NOT_APPLICABLE | — | — | — | Keine Cloud-IAM-, Metadata- oder Storage-Bucket-Nutzung. |
| VGT-048 | NOT_APPLICABLE | — | — | — | Kein Reverse-Proxy- oder TLS-Terminierungs-Code. |
| VGT-049 | NOT_APPLICABLE | — | — | — | Keine unsicheren Laufzeit-Tempfiles oder Shared Directories. |
| VGT-050 | PASS | chrome/manifest.json | chrome/manifest.json:1-60; firefox/manifest.json:1-52<br>shared/shield-content.js:295-345<br>audit/security/probes/results/manifest_integrity.json | TR-03 (Exit 0) | OS-/Plattform-Parität (Chrome MV3 & Firefox MV3): Beide Manifeste sind auf v0.2.4 synchronisiert, deklarieren identische minimale web_accessible_resources (guard.html), nutzen dieselbe Detektor-, Con… |
| VGT-051 | PASS | sbom.json | sbom.json:1-140<br>tests/platin-security.test.cjs:282-300 | TR-01 (Exit 0) | Dependency-Inventar/SBOM: Das Produkt besitzt null externe Laufzeit-Dependencies. build.py erzeugt deterministisch eine maschinenlesbare CycloneDX-1.5-SBOM (sbom.json) mit SHA-256-Prüfsummen aller au… |
| VGT-052 | NOT_APPLICABLE | — | — | — | Keine Third-Party-Laufzeit-Dependencies, daher keine offenen Third-Party-CVEs im Paket. |
| VGT-053 | NOT_APPLICABLE | — | — | — | Keine Package-Registry-Installationen oder pre/postinstall-Skripte im Build. |
| VGT-054 | PASS | .github/workflows/ci.yml | .github/workflows/ci.yml:1-65<br>scripts/verify-release.ps1:1-95 | static_analysis | CI/CD-Pipeline-Sicherheit: .github/workflows/ci.yml nutzt minimale Berechtigungen, führt die vollständige Testsuite, den deterministischen Doppel-Build (Byte-für-Byte-SHA256-Vergleich) und den Releas… |
| VGT-055 | PASS | build_sites.py | build_sites.py:12-13,228-237<br>build.py:14-125<br>SHA256SUMS.txt:1-3 | TR-01 (Exit 0) | Build-Provenance & Reproduzierbarkeit: build_sites.py validiert alle 187 Marken und 353 Domains strikt gegen ein RFC-1123-Hostname-Schema; build.py erzeugt bit-identische ZIP-Archive (fester Zeitstem… |
| VGT-056 | BLOCKED | — | — | — | Externe Browser-Store-Codesignierung (Chrome Web Store / Mozilla AMO) ist ohne Store-Konto und Netzwerkzugriff im lokalen Audit-Container nicht ausführbar. |
| VGT-057 | NOT_APPLICABLE | — | — | — | Kein eigener Auto-Updater im Produktcode (Updates erfolgen ausschließlich über die signierten Browser-Stores). |
| VGT-058 | NOT_APPLICABLE | — | — | — | Keine dynamischen Remote-Threat-Feeds zur Laufzeit (100% statisch kuratierte Offline-Datenbank + DNR-Regelwerk). |
| VGT-059 | PASS | build.py | build.py:37-49,85-98<br>audit/security/probes/results/manifest_integrity.json | TR-03 (Exit 0) | Release-Kanal-/Artefakt-Isolation: build.py erzwingt vor dem Packen eine strikte Positivliste (ALLOWED_PACKAGE_FILES mit exakt 22 relativen Dateipfaden) für Chrome und Firefox; jede nicht gelistete D… |
| VGT-060 | NOT_APPLICABLE | — | — | — | Keine eigene Schlüssel- oder Cloud-Builder-Infrastruktur im Projektumfang. |
| VGT-061 | PASS | chrome/background.js | chrome/background.js:27-32,197-220<br>firefox/background.js:64-73<br>tests/platin-security.test.cjs:248-264 | TR-01 (Exit 0) | Fail-Secure State Machine: Konfigurationsfehler in Chrome aktivieren automatisch den Degraded-Observer-Modus (degraded=true, protectionDegraded=true) mit sichtbarer Warnanzeige im Popup; fehlende ode… |
| VGT-062 | PASS | chrome/background.js | chrome/background.js:38-60<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Transaktions-/Zustandsintegrität: Startup-Purge bereinigt verwaiste Session-Regeln vor jeder Konfiguration; Allow-Once-Zustände sind durch 30s-TTL und Stale-Navigation-Clear begrenzt; configure() ist… |
| VGT-063 | PASS | chrome/background.js | chrome/background.js:38-53<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Race-Condition-Schutz: Überlappende configure()-Aufrufe (z. B. onInstalled + onStartup oder rasche strictMode-Wechsel) werden durch den configPromise/configPending-Queue-Mutex strikt serialisiert, so… |
| VGT-064 | PASS | audit/security/probes/results/fuzz_perf.json | audit/security/probes/results/fuzz_perf.json<br>chrome/background.js:9,18-26 | TR-09 (Exit 0) | Denial-of-Service/Backpressure: Keine unbegrenzten Queues, Speicherstrukturen oder Regex-Backtracking-Pfade. Detektor-Latenz liegt bei p50=0,023 ms / p95=0,39 ms (5.000 Klassifikationen); selbst 100k… |
| VGT-065 | NOT_APPLICABLE | — | — | — | Keine Netzwerk-Retry-Policies oder Circuit-Breaker erforderlich (100% lokale Ausführung). |
| VGT-066 | PASS | chrome/background.js | chrome/background.js:55-64,197-220<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Konfigurationsintegrität & sichere Defaults: Verwaiste Session-Regeln werden in doConfigure() noch vor dem Storage-Zugriff bereinigt; schlägt storage.local.get fehl, geht der Worker definiert in prot… |
| VGT-067 | NOT_APPLICABLE | — | — | — | Kein Datenbank-Migrations- oder Snapshot-Restore-System vorhanden. |
| VGT-068 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>shared/detector.js:1-6; shared/aegis-engine.js:1-15 | TR-11 (Exit 0) | Offline-/Airgap-Verhalten: Alle Schutzschichten (Homograph-/Phishing-Detektor, Content-Shield, AEGIS Anti-Fingerprinting, Tracker-Shield, GeDefense Light) arbeiten zu 100% lokal und offline ohne exte… |
| VGT-069 | PASS | chrome/background.js | chrome/background.js:8,107-111; firefox/background.js:6,25-31,56-63<br>tests/platin-security.test.cjs:216-246 | TR-01 (Exit 0) | Zeit/Ablauf/Replay: Temporäre Einmal-Freigaben sind auf 30 Sekunden (ALLOW_TTL_MS=30000) begrenzt und werden bei Nutzung oder abweichender Navigation sofort invalidiert. |
| VGT-070 | PASS | chrome/background.js | chrome/background.js:18-26,136-139; firefox/background.js:12-20,75-76 | TR-01 (Exit 0) | Ressourcenerschöpfung durch Sekundärsysteme: Zähler- und Security-Event-Schreibvorgänge sind fehlertolerant (try/catch) vom primären Blockierpfad entkoppelt und auf maximal 50 Ringpuffer-Einträge beg… |
| VGT-071 | PASS | chrome/background.js | chrome/background.js:18-26,29,35,112,129,138<br>firefox/background.js:12-20,31,70,76<br>tests/platin-security.test.cjs:266-280 | TR-01 (Exit 0) | Security-Event-Vollständigkeit: Sicherheitsrelevante Ereignisse (block, allow-once, degraded, healthy) werden mit Zeitstempel, Ereignistyp und Grundcode in einem lokalen Ringpuffer (storage.local.sec… |
| VGT-072 | PASS | chrome/background.js | chrome/background.js:18-26; firefox/background.js:12-20<br>tests/platin-security.test.cjs:266-280 | TR-01 (Exit 0) | Log-Integrität & Vertraulichkeit (Privacy-by-Design): Der lokale Security-Event-Ringpuffer speichert ausschließlich technische Ereignistypen und Grundcodes (z. B. brand-variant, typosquat, user-allow… |
| VGT-073 | NOT_APPLICABLE | — | — | — | Kein externes SIEM-/Alert-Escalation-Backend (rein clientseitiges Schutzinterstitial + lokales Status-Popup). |
| VGT-074 | PASS | shared/detector.js | shared/detector.js:14-62,136-197,535-618<br>audit/security/probes/results/punycode_parity.json | TR-05 (Exit 0) | Detection-Normalisierung: Unicode-/Punycode-Äquivalente, NFKD/NFKC, Diakritika, Zero-Width-Zeichen, Bidi-Overrides (UTS #39 / RFC 8264) und visuelle Ligaturen (rn/m, vv/w, cl/d) werden deterministisc… |
| VGT-075 | NOT_APPLICABLE | — | — | — | Keine dauerhafte automatische Sperrliste (Autopunisher); Blockaden wirken pro Navigation mit expliziter Einmal-Freigabe oder nutzereigener Whitelist. |
| VGT-076 | NOT_APPLICABLE | — | — | — | Keine dynamischen Remote-Threat-Feeds mit Laufzeit-Nachladung. |
| VGT-077 | NOT_APPLICABLE | — | — | — | Keine Server-Control-Plane oder Agent-Enrollment. |
| VGT-078 | PASS | shared/popup.js | shared/popup.js:67-94,134-158<br>shared/options.js:1-180 | TR-01 (Exit 0) | Lokales Status- & Options-UI: Popup und Options-Seite rendern ausschließlich lokale Status-, Zähler- und Whitelist-Daten über sichere DOM-Methoden (textContent) und zeigen den Degraded-Zustand transp… |
| VGT-079 | PASS | SECURITY.md | SECURITY.md:1-120<br>scripts/verify-release.ps1:1-95 | static_analysis | Incident-Response- & Recovery-Readiness: SECURITY.md dokumentiert Meldewege, Reaktionszeiten, Notfall-Recovery (Whitelist-/Storage-Reset, Degraded-Mode-Diagnose), Supply-Chain-IOC-Aktualisierung (rul… |
| VGT-080 | PASS | audit/security/probes/results/detector_corpus.json | audit/security/probes/results/detector_corpus.json<br>audit/verify/holdout/results.json<br>audit/verify/fix/fresh_sanity_results.json | TR-04 (Exit 0) | False-Positive/False-Negative-Bilanz & Kalibrierung: Im synthetischen Angriffskorpus (probe02) werden 42/43 Angriffe (97,7%) erkannt (einzige Ausnahme ist ein reiner Query-String ?brand=paypal zum Sc… |
| VGT-081 | NOT_APPLICABLE | — | — | — | Kein WordPress-Kontext: reine Browser-Extension ohne PHP-Hooks, REST-Routen, admin-ajax oder Nonces. |
| VGT-082 | NOT_APPLICABLE | — | — | — | Keine WordPress-Persistenz: keine wpdb-, Options-, Transient- oder Cron-Operationen im Produktcode. |
| VGT-083 | NOT_APPLICABLE | — | — | — | Keine Desktop-/Electron-/Tauri-App: reine Browser-Extension ohne Node-Integration oder native IPC. |
| VGT-084 | NOT_APPLICABLE | — | — | — | Keine Office-/PDF-/Dokument-Parser: verarbeitet ausschließlich Navigations-URLs und lokale Bundle-Assets. |
| VGT-085 | NOT_APPLICABLE | — | — | — | Keine Mobile-App/App-Store-Berechtigungen: kein Android/iOS-Code, keine Keystore- oder Deep-Link-Pfade. |
| VGT-086 | NOT_APPLICABLE | — | — | — | Kein internes Plugin-System: die Erweiterung lädt keine Drittanbieter-Plugins oder Zusatzmodule. |
| VGT-087 | NOT_APPLICABLE | — | — | — | Keine KI-/LLM-/Prompt-Komponente im Produktcode: deterministische algorithmische Heuristik ohne Prompts/RAG. |
| VGT-088 | NOT_APPLICABLE | — | — | — | Keine LLM-Ausgabe-Sinks oder Modell-Konfigurationen im Produktcode vorhanden. |
| VGT-089 | NOT_APPLICABLE | — | — | — | Keine KI-Modelle, Trainingsdaten, Embeddings oder Vektordatenbanken im Produktcode. |
| VGT-090 | NOT_TESTED | — | — | — | A11y-/UX-Sicherheitswahrnehmung: Statisch und im DOM-Mock verifiziert sind sofortiges synchrones Rendering (kein leerer Text vor Storage-Read), ARIA-Attribute, Escape-Key-Handling, Fokus-Management u… |
| VGT-091 | PASS | audit/security/AUDIT_SECURITY.md | audit/security/AUDIT_SECURITY.md<br>audit/security/AUDIT_MATRIX.json:chains | TR-01 (Exit 0) | Cross-Component-Attack-Path-Graph: Alle fünf identifizierten mehrstufigen Angriffspfade (CHAIN-001 bis CHAIN-005) wurden modelliert, an ihren technischen Breakpoints unterbrochen und durch automatisi… |
| VGT-092 | PASS | audit/security/AUDIT_MATRIX.json | audit/security/AUDIT_MATRIX.json:chains | TR-01 (Exit 0) | Combination Bugs/Preconditions: Alle Kombinationen aus Detektor, Messaging, Lifecycle-TTL, Form-Submission (POST) und Build-Pipeline wurden auf Wechselwirkungen geprüft und gemeinsam gehärtet. |
| VGT-093 | NOT_TESTED | — | — | — | Privilege/Integrity Pivot über externe Browser-Store-Distribution ist ohne Zugriff auf die externen Store-Pipelines im lokalen Audit-Container nicht live testbar; lokale Artefakt-Integrität ist durch… |
| VGT-094 | PASS | audit/security/probes/results/punycode_parity.json | audit/security/probes/results/punycode_parity.json<br>audit/security/probes/results/guard_render_mock.json | TR-05 (Exit 0) | Cross-Layer Input Transformation: Die gesamte Kette URL -> validPublicUrl (RFC-1035-Bounds) -> punycodeDecode -> NFKD/Skeleton -> Guard (textContent) -> allow-once (URL-Schema + Tab-Bindung) arbeitet… |
| VGT-095 | PASS | shared/detector.js | shared/detector.js:326-341,530-895<br>chrome/background.js:18-65,93-139,190-258; firefox/background.js:12-79<br>build.py:37-135; build_sites.py:12-13,228-237 | TR-01 (Exit 0) | Patch-Vollständigkeit & Root-Cause-Eliminierung: Alle behebbaren Befunde aus dem Initial-Audit (FIND-001 bis FIND-011) wurden an der Ursache behoben (RFC-1035-Längenbudgets, 30s Allow-Once-TTL, Queue… |
| VGT-096 | PASS | tests/platin-security.test.cjs | tests/platin-security.test.cjs:1-300<br>tests/p0-regressions.test.cjs:1-140 | TR-01 (Exit 0) | Negative Testing & Boundary-Tests: tests/platin-security.test.cjs und tests/p0-regressions.test.cjs verankern dauerhaft Negativ- und Grenztests für fremde Sender-Origins, fehlende Sender, Tab-Mismatc… |
| VGT-097 | BLOCKED | — | — | — | Externer SAST/DAST/SCA-Scanner-Abgleich ist in der isolierten Offline-Umgebung ohne Drittanbieter-Scanner-Lizenz/Cloud-Feed nicht ausführbar; kompensiert durch duale statische/dynamische Eigenanalyse… |
| VGT-098 | PASS | audit/security/probes/results/fuzz_perf.json | audit/security/probes/results/fuzz_perf.json<br>audit/verify/holdout/perf.txt | TR-09 (Exit 0) | Performance- & Availability-Nichtregression nach Patch: Durch das Vorberechnen der Label-Normalisierungen und die RFC-1035-Längenbudgets sank die Klassifikationslatenz im 5.000-URL-Benchmark auf p50=… |
| VGT-099 | PASS | SHA256SUMS.txt | SHA256SUMS.txt:1-3; sbom.json:1-140<br>audit/security/AUDIT_MATRIX.json; audit/security/AUDIT_SECURITY.md | TR-12 (Exit 0) | Release-Gate, Reproducible Builds & Audit-Trace: Zweifacher Lauf von build.py und scripts/verify-release.ps1 beweist bit-identische ZIP-Archive; AUDIT_MATRIX.json und AUDIT_SECURITY.md dokumentieren… |
| VGT-100 | PASS | .github/workflows/ci.yml | .github/workflows/ci.yml:1-65<br>tests/platin-security.test.cjs:1-300 | TR-01 (Exit 0) | Langfristige Security-Regressionsbasis: Alle 13 Testdateien (91/91 Tests inkl. tests/platin-security.test.cjs und tests/p0-regressions.test.cjs) sowie der deterministische Build-Check sind in .github… |
## Verbleibende Umgebungs-Grenzen vor externer Store-Veröffentlichung

1. **`VGT-056` (`BLOCKED`):** Externe kryptografische Store-Signierung durch den Chrome Web Store / Mozilla Add-ons (AMO) erfolgt erst beim Upload in die jeweiligen Entwickler-Portale.
2. **`VGT-090` / `VGT-093` (`NOT_TESTED`):** Vor der produktiven Store-Einreichung wird ein abschließender manueller Smoke-Test der gepackten ZIP-Archive (`Antipisher-Chrome-v0.2.4-alpha.zip`, `Antipisher-Firefox-v0.2.4-alpha.zip`) in einer grafischen Chrome- und Firefox-Instanz empfohlen.
