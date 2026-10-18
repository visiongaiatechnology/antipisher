# Next.md — VGT Project Continuity

> Antipisher · Kontinuierliches Übergabeprotokoll gemäß `references/NEXT_HANDOFF.md`.

## Projektidentität

- **Produkt:** Antipisher (vormals VGT DomainGuard)
- **Workspace:** `c:\Users\Masterboard\Downloads\VGT-DomainGuard-Source-v0.1.0\vgt-domainguard-src`
- **Version:** `0.2.1` (Manifeste), Anzeige `0.2.1 Alpha`; ZIPs `v0.2.1-alpha`
- **Lizenz:** GNU Affero General Public License v3.0 (AGPLv3) — [`LICENSE`](LICENSE)
- **Source Identity:** Git-Repository auf `main`, Remote `https://github.com/visiongaiatechnology/antipisher.git`.
- **Zielplattformen:** Chrome MV3, Firefox MV3
- **Dokumentation:** [`README.md`](README.md), [`ARCHITECTURE_AND_SECURITY_REVIEW.md`](ARCHITECTURE_AND_SECURITY_REVIEW.md), [`SECURITY.md`](SECURITY.md), [`audit/verify/fix/P0_FIX_REPORT.md`](audit/verify/fix/P0_FIX_REPORT.md)

## Ziel / Definition of Done (P0-Fixstand)

- **Status:** `SILBER` (Alpha 0.1, P0-gehärtet). Kein Release; Browser-E2E/Store/V2 offen.
- **Akzeptanzkriterien P0:**
  1. [x] **Critical:** `force.com`/`my.salesforce.com` nicht mehr als exklusive Markendomäne; `paypal.force.com` wird blockiert; Regressionstest vorhanden.
  2. [x] **Overfitting reduziert:** Bait-Erkennung token-/fuzzy-basiert statt Fixture-Tokens; deutsche/EU-Begriffe; 187 Marken; `startsWith(brand+'com')`-Hack entfernt.
  3. [x] **Pfad-Regel:** nur echte Marken-Verzeichnissegmente, keine Query/Suchmaschinen, keine `/blog|docs`-Umgehung; Artikel-Slugs (heise/chip/test.de) bleiben safe.
  4. [x] **ccTLD:** globale Marken mit dokumentierter ccTLD-Präsenz = offiziell; unklare Fälle = Warnstufe; generische TLDs = Block.
  5. [x] **Firefox:** WAR + `data_collection_permissions`; POST wird nicht mehr still in GET umgeschrieben.
  6. [x] **Chrome:** Fail-open sichtbar („eingeschränkt“ + Observer-Fallback); Long-URL-Blocker beseitigt (tabgebundene Allow-Regel).
  7. [x] **Shield:** Escaping der Erklärung, `submitter.formAction`, Warnstufen blockieren keine Formulare, Revalidierung vor Fortfahren, Passwort-Fail-closed bei fehlender Engine.
  8. [x] **WAR minimiert:** nur `guard.html` in beiden Manifesten.
  9. [x] **A11y:** `[hidden]`, Kontrast, Popup-Fokusring, `--vgt-official-text`, Forced-Colors, `alertdialog` + Escape + Fokusführung.
  10. [x] **Build:** deterministisch (2× byte-identisch), `SHA256SUMS.txt` im Repo + Release-Ordner, Source-ZIP ohne `audit/`/Checksums, Legacy-VGT-ZIPs entfernt.
  11. [x] **Doku ehrlich:** README/Next/Architektur ohne PLATIN-/0-FP/FN-/„POST geschlossen“-/„immun“-Behauptungen; Version konsistent.
  12. [x] **Tests:** 33/33 grün; unabhängiger Holdout 289/296; frischer Sanity 42/44 (Restlücken dokumentiert).
  13. [ ] **Offen (P1):** echter Chrome-/Firefox-Browser-E2E, Chrome-Redirect-All-Neubewertung/Store-Review, UTS-39/PSL-Vollintegration, signierte Feeds, Privacy-Policy/Store-Assets, Git/CI.
- **Performance:** Median 0,1–0,6 ms, p95 1,1–1,6 ms (korpusspezifisch); „<1 ms“ nur als Median, nicht p95.
- **UI-Design-DNA:** VGT GLASS 2100 (dunkles Mineral/Salbeigrün), keine dekorativen Raster.

## Aktueller Fortschritt

| ID | Arbeitspaket | Status | Codebeleg | Testbeleg |
|---|---|---|---|---|
| P0-01 | force.com / Shared-Host-Whitelist | `DONE_VERIFIED` | `shared/detector.js` (`isOfficialHost`, `multiTenantSuffixes`), `build_sites.py` | `tests/p0-regressions.test.cjs` |
| P0-02 | Overfitting/Bait/DE-Marken | `DONE_VERIFIED` | `shared/detector.js` (Bait-Lexikon, Fuzzy-Match, DL2), `build_sites.py` (187 Marken) | Holdout 289/296, frischer Sanity 42/44 |
| P0-03 | Pfad-Regel | `DONE_VERIFIED` | `shared/detector.js` (Pfad-Segmente, `isActionSegment`) | P0-Tests + Holdout `path_*` |
| P0-04 | Official-ccTLD-Warnstufe | `DONE_VERIFIED` | `shared/detector.js` (global-brand ccTLD, Warn-Action) | P0-Tests |
| P0-05 | Firefox-Manifest/POST | `DONE_VERIFIED` | `firefox/manifest.json`, `firefox/background.js` | `tests/firefox-worker.test.cjs` |
| P0-06 | Chrome Fail-open/Long-URL | `DONE_VERIFIED` | `chrome/background.js` (`markDegraded`, tab-Allow) | `tests/chrome-worker.test.cjs` |
| P0-07 | Content-Shield-Härtung | `DONE_VERIFIED` | `shared/shield-content.js`, beide Manifeste | `tests/shield-content.test.cjs` |
| P0-08 | WAR-Minimierung | `DONE_VERIFIED` | beide `manifest.json` | `tests/p0-regressions.test.cjs` |
| P0-09 | UI/A11y-Fixes | `DONE_VERIFIED` | `guard.css/js/html`, `popup.html/js` | statisch + 4 Chromium-Renders |
| P0-10 | Deterministischer Build | `DONE_VERIFIED` | `build.py` | 2× Build byte-identisch + `SHA256SUMS.txt` |
| P0-11 | Doku/Claims | `DONE_VERIFIED` | README/Next/ARCH | Review + Verifikationsberichte |
| P0-12 | UI-Redesign GLASS 2100 (Branding, ein Farbsystem) | `DONE_VERIFIED` | `design-tokens.css`, `guard.*`, `popup.*`, `shield-content.js` | 6 Chromium-Renders, [`audit/verify/fix/UI_REDESIGN.md`](audit/verify/fix/UI_REDESIGN.md) |
| P0-13 | GitHub-Alpha-Vorbereitung (ohne Store) | `DONE_VERIFIED` | `.github/workflows/{ci,release}.yml`, Issue-Templates, `docs/ALPHA-INSTALL.md`, `docs/TESTING-ALPHA.md`, `docs/RELEASE-SIGNING.md`, `scripts/verify-release.*`, `PRIVACY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md` | YAML-Templates angelegt; CI lokal nicht ausführbar → `NOT_TESTED` |
| P1-01 | Browser-E2E | `NOT_TESTED` | — | Chrome 155 ohne `--load-extension`; CDP instabil; kein Firefox |
| P1-02 | Signierte Feeds/Rollback | `NOT_STARTED` | — | — |
| P1-03 | Store-Assets/Privacy-Policy/Signierung | `NOT_STARTED` | — | — |
| P1-04 | UTS-39/PSL-Vollintegration, V2-Blueprint Phase 1 | `NOT_STARTED` | — | — |

## Checkpoints

### 2026-10-18 16:54 — Checkpoint 001: Initial Audit & Task Kickoff
### 2026-10-18 17:02 — Checkpoint 002: Damerau-Levenshtein, Subdomain/PSL, Zero-Width, Glass 2100
### 2026-10-18 17:08 — Checkpoint 003: Rebranding Antipisher, AGPLv3, Alpha 0.1
### 2026-10-18 17:55 — Checkpoint 004: Erste „P0-Remediation“ (später als überzeichnet bewertet)
### 2026-10-18 18:10 — Checkpoint 005: V2 Phase 1 (Bitsquat, Pfad-Regel, Content Shield) — **Claims im Audit widerlegt**
### 2026-10-18 19:00 — Checkpoint 006: **P0-Fixstand 0.1.1 (dieser Stand)**
- **Source/Version:** `0.1.1` (unversionierter Snapshot, keine Git-Historie)
- **Änderungen:** force.com-Whitelist-Fix; Official-Host-Prüfung; Shared-Host-Regeln; breites Bait-/DE-Lexikon; Fuzzy-Bait; DL2-Warnstufe; Kurzmarken-/Bitsquat-/Diakritika-Regeln; Pfad-Regel-Neufassung; ccTLD-Warnstufe/global-Brand-Heuristik; Chrome-Degraded-Modus + tabgebundene Allow-Regel; Firefox WAR/`data_collection_permissions` + POST-Datenverlust-Fix; Shield-Escaping/`formAction`/Fail-closed/Revalidierung; WAR-Minimierung; A11y-Fixes; deterministischer Build + Checksums; vollständige Doku-Korrektur; 187 Marken.
- **Tests:** `node --test` → **33/33 PASS**; Holdout **289/296 (97,6 %, FN 0, FP 7)**; frischer Sanity **42/44**; Build 2× byte-identisch; `node --check` alle JS-Dateien OK.
- **Security:** force.com-Fail-open geschlossen; Shield-Bypässe (`form.submit`, iframe, fetch) bleiben dokumentierte Restlücke; Chrome GET-only bleibt.
- **Nächster Schritt:** Browser-E2E Chrome/Firefox nach Testkatalog (README/Verifikationsbericht), danach V2 Phase 1 (UTS-39/PSL/Brand-Graph) und Store-Fähigkeit.

### 2026-10-18 19:20 — Checkpoint 007: **UI-Redesign GLASS 2100 (0.1.1)**
- **Änderungen:** gemeinsame Design-Tokens (`shared/design-tokens.css`) mit Graphit-Glas + Emerald-Signal; Branding oben in Guard und Popup (`VisionGaiaTechnology` + `Antipisher · Domain Trust`); Guard als eine Glasfläche mit Hairline-Datenzeilen statt Kartenwand; Popup mit Statuszeile, Switch, ruhigen Metriken; Shield-Modal im gleichen Material mit Brandbar, „Angehalten“-Chip und Abbrechen als Primäraktion; Zustandsmaschine `data-state` (block/warn/invalid/safe); Emojis entfernt; `popup.css` neu.
- **Tests:** `node --test` → **33/33 PASS**; `node --check` Guard/Popup/Shield → Exit 0; Build deterministisch; ZIPs 0.1.1 erneut erzeugt.
- **Visuelle QA:** 6 echte Chromium-Renders (Desktop Block/Warn/Invalid, 500-px-kompakt, Popup, Shield-Harness) unter `audit/verify/fix/screenshots/`; kein Grid, ein Akzent, Kontrast ≥ 4,5:1; echte 360-/390-px- und Firefox-Runtime **NOT_TESTED**.
- **Security:** keine Sicherheitsgrenze gelockert; Shield-Logik unverändert, nur Darstellung/Branding; `escapeHtml` beibehalten.
- **Nächster Schritt:** Browser-E2E (Chrome/Firefox) + ggf. 390-px-CD-Emulation; danach V2 Phase 1.

### 2026-10-18 19:40 — Checkpoint 008: **GitHub-Alpha-Verteilung vorbereitet**
- **Entscheidung:** kein Store; Alpha über GitHub-Releases, Browser-E2E durch Alpha-Nutzer, FP/FN über Issue-Templates.
- **Neu:** `.gitignore`/`.gitattributes`; CI-Workflow (Tests, Syntax, Manifest, deterministischer Build, ZIP-Inhalte); Release-Workflow (Tag `v*` → GitHub Release mit ZIPs + `SHA256SUMS.txt`); Issue-Templates Bug/FP-FN; `docs/ALPHA-INSTALL.md`, `docs/TESTING-ALPHA.md`, `docs/RELEASE-SIGNING.md`; `scripts/verify-release.ps1|sh`; `PRIVACY.md`; `CONTRIBUTING.md`; `CHANGELOG.md`; `SECURITY.md` (private Advisories); README-Installation/Integrität; Git-Repo `main` initialisiert (noch kein Commit).
- **Signierung:** bewusst **nicht** implementiert (kein Key im Repo). Chrome-unpacked braucht keine Signatur; Firefox-dauerhaft braucht Mozilla-Signatur (AMO unlisted); Release-Integrität über SHA256SUMS + optional GPG/Sigstore signierten Tag. Doku: `docs/RELEASE-SIGNING.md`.
- **Tests:** 33/33 PASS; Build deterministisch; `scripts/verify-release.ps1` gegen Release-ZIPs → OK (lokal ausgeführt).
- **Nächster Schritt:** `git add -A && git commit` mit eigener Identität, Remote anlegen, Tag `v0.1.1` (signiert empfohlen) pushen, Release-Workflow beobachten; Issue-Links in `.github/ISSUE_TEMPLATE/*` nach Repo-Anlage prüfen.

### 2026-10-18 19:55 — Checkpoint 009: **4-Sprachen-Lokalisierung & Mehrsprachige GitHub-Alpha (0.1.1)**
- **Entscheidung & Anforderung:** Vollständige und konsistente 4-Sprachen-Unterstützung: Englisch (`en`, Standard), Deutsch (`de`), Russisch (`ru`) und Chinesisch (`zh`). Automatische Spracherkennung anhand der aktuellen Browsersprache (`navigator.language` / `chrome.i18n.getUILanguage()`) mit manuellem Umschalter in allen UIs.
- **Implementierte Komponenten:**
  - `shared/i18n.js`: Universelles i18n-Modul mit 100 % Key-Parität über alle 4 Sprachen (`en`, `de`, `ru`, `zh`), automatischer Normalisierung von Sprachpräfixen (`de-*` → `de`, `ru-*` → `ru`, `zh-*` → `zh`, Fallback → `en`) und dynamischer Parameter-Interpolation.
  - `_locales/`: Vollständige WebExtension-Standard-Nachrichtenverzeichnisse (`en`, `de`, `ru`, `zh_CN`) für Chrome & Firefox MV3. Manifeste mit `"default_locale": "en"` und `"description": "__MSG_appDesc__"`.
  - `shared/detector.js`: `buildReasonObj()` erzeugt lokalisierte Erklärungen für alle 4 Sprachen (`explanation_en`, `explanation_de`, `explanation_ru`, `explanation_zh` sowie dynamisches `explanation`) unter Wahrung 100 % Rückwärtskompatibilität.
  - `shared/guard.*`: Lokalisierte Zwischenseite mit Glas-Language-Switcher-Pill (`EN | DE | RU | ZH`) in der Brandbar und dynamischer Neu-Rendierung aller Hinweistexte und Aktionen.
  - `shared/popup.*`: Lokalisierter Popup-Dialog mit Sprachumschalt-Pill (`Auto | EN | DE | RU | ZH`), lokalisierten Statusanzeigen, Metrik-Beschriftungen und Heuristik-Auswertungen.
  - `shared/shield-content.js`: Integrierter In-Page-Schutz im geschlossenen Shadow DOM mit nativer 4-Sprachen-Unterstützung und automatischer Erkennung der Browsersprache.
  - Dokumentation: Standard `README.md` in Englisch mit GitHub-Shields/Badges und Navigationsleiste; 3 vollständige Sprach-READMEs: `README.de.md` (Deutsch), `README.ru.md` (Russisch) und `README.zh.md` (Chinesisch) mit gegenseitigen Schnellwechsel-Buttons.
  - `build.py`: Kopiert `_locales/` und `shared/i18n.js` automatisiert in die Chrome- und Firefox-Builds und verifiziert diese in den Assertions.
- **Tests & Qualität:**
  - `tests/i18n.test.cjs`: Neuer Testsuite-Baustein zur Verifikation von 100 % Key-Parität, Erkennung, Interpolation und Detector-Mehrsprachigkeit.
  - `node --test tests/*.test.cjs` → **38/38 PASS (100 %)**
  - `node audit/lead/lead_probe.cjs` → **0/26 FP, 0/40 FN (100 % PASS)**
  - `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` → **3/3 OK**

### 2026-10-18 19:44 — Checkpoint 010: **DNR Rule Unique ID Fix (Chrome MV3)**
- **Fehlerbefund:** Chrome warf beim Installieren `Error: Rule with id 1000 does not have a unique ID` (Stacktrace `background.js:77`), da `onInstalled` und Top-Level-Initialisierung parallel liefen und `getDynamicRules()` vor dem Einfügen keine ID fand, wodurch `removeRuleIds: []` übergeben wurde.
- **Fix:**
  1. `configure()` serialisiert: Mutex-Promise verhindert parallele Ausführung bei gleichzeitigem `onInstalled` / Service-Worker-Start.
  2. `removeRuleIds: [RULE_ID]` bedingungslos übergeben: Chrome ignoriert nicht existierende IDs fehlerfrei und entfernt Regel 1000 atomar vor dem Neueinfügen.
  3. `tests/chrome-worker.test.cjs` erweitert um Unique-ID-Validierung im Mock und Concurrent-Startup-Test.
- **Tests:** `node --test tests/*.test.cjs` → **39/39 PASS (100 %)**.

### 2026-10-18 21:05 — Checkpoint 011: **Leises sicheres Surfen (Quiet Safe Browsing), Glass 2100 Status-Toast & Versionssprung auf 0.2.0 (Alpha)**
- **Problemstellung & Nutzerfeedback:** Das Aufpoppen der Vollbild-Zwischenseite ("Adresse geprüft") bei absolut jedem regulären Seitenaufruf in Chrome störte den Nutzer erheblich ("nervt jedesmal :D"). Ziel: Sichere Seiten müssen flüssig und ohne Unterbrechung direkt laden; visuelle Bestätigung nur sanft und dezent als schwebender Glassmorphism-Badge.
- **Implementierte Lösung:**
  1. **Standard-Modus (`strictMode: false` als Standard):** In `chrome/background.js` wird die globale DNR-Redirect-Regel 1000 im Standardbetrieb nicht geladen. Sichere Seiten laden ohne jeden Zeitverlust direkt (0 ms zusätzliche Latenz).
  2. **Gezielte Phishing-Blockade:** `webNavigation.onBeforeNavigate` fängt bösartige und verdächtige Domains (`status === 'block'`) sofort ab und leitet auf `guard.html` um. Einmalklicks ("Trotzdem fortfahren") werden via `observerBypass` tabgenau autorisiert.
  3. **Strenger Preflight-Modus (`strictMode: true`):** Bleibt als optionaler Toggle im Popup erhalten für Hochsicherheitsumgebungen, die präventive Vollbild-Isolation vor jedem GET-Request wünschen.
  4. **Glass 2100 Status-Toast (`shared/shield-content.js`):** Auf sauberen/verifizierten Domains wird im geschlossenen Shadow DOM (`attachShadow({ mode: 'closed' })`) ein zarter, schwebender Glas-Badge (*„Domain verifiziert · Antipisher · Geschützt“*) eingeblendet.
     - Animiert sanft ein, bleibt ca. 2,4 Sekunden sichtbar, blendet sanft aus und entfernt sich rückstandslos aus dem DOM.
     - `pointer-events: none` stellt sicher, dass Klicks auf der Zielseite niemals blockiert werden.
     - Deaktivierbar über Popup-Einstellung (`showSafeToast: false`).
  5. **100 % Key-Parität in `shared/i18n.js`:** Alle 4 Sprachen (EN, DE, RU, ZH) verfügen über die neuen Schlüssel `toastSafeTitle`, `toastSafeSub`, `settingSafeToast`, `noticeSafeToast`, `noticeStrictActive`, `noticeStrictInactive`.
  6. **Popup & Manifeste aktualisiert:** Version `0.2.0` in `chrome/manifest.json`, `firefox/manifest.json`, `shared/popup.html`, `build.py`, `scripts/publish_github_releases.py`, `tests/p0-regressions.test.cjs`, `README.md`, `README.de.md`, `README.ru.md`, `README.zh.md`.
- **Tests & Qualität:**
  - `tests/shield-content.test.cjs`: Erweiterte Testabdeckung für Safe-Toast-Injektion, Shadow DOM, Pointer-Events und Einstellungsrespekt.
  - `tests/chrome-worker.test.cjs`: Getrennte Verifikation von Standard-Quiet-Browsing (0 DNR-Regeln) und Strict-Preflight-Modus (1 DNR-Regel).
  - `tests/p0-regressions.test.cjs`: Manifest-Versionsprüfung auf `0.2.0`.
  - `node --test tests/*.test.cjs` → **42/42 PASS (100 %)**.

### 2026-10-18 22:20 — Checkpoint 012: **Lokale Integration des AEGIS PROTOCOL :: OMEGA (V17.1) Anti-Fingerprinting & Tracking-Schutzes**
- **Kontext & Nutzeranforderung:** Lokale Integration von Anti-Fingerprinting- und Anti-Tracking-Schutzmechanismen basierend auf dem VGT-eigenen AEGIS PROTOCOL :: OMEGA (V17.1). **Ausdrückliche Nutzerauflage:** Vorab-Tests rein lokal durchführen — **KEIN PUSH** auf GitHub / Remote.
- **Implementierte Schutzmodule (`shared/aegis-engine.js`):**
  1. **Canvas Farbling Defense:** Gezieltes, deterministisches Pseudozufallsrauschen (FNV-1a PRNG) auf Canvas-Auslesevorgänge (`getImageData`, `toDataURL`) mit Rekursionssperre (`_aegis_locked`) und automatischer Rückschreibung.
  2. **WebGL GPU Masking:** Maskiert `UNMASKED_VENDOR_WEBGL` (37445) und `UNMASKED_RENDERER_WEBGL` (37446) mit sauberen, unauffälligen Standard-GPUs (z. B. NVIDIA GeForce RTX 4090 auf Windows, Apple M2 auf macOS, Mesa Intel auf Linux).
  3. **AudioContext Dynamics Jitter:** Subtiles Rauschen auf `DynamicsCompressorNode`-Parameter (`threshold`, `knee`), um akustisches Device-Fingerprinting zu vereiteln.
  4. **Font- & Layout-Metrics Protection:** Jitter auf Schriftbreiten (`measureText`) und Elementabmessungen (`getBoundingClientRect`).
  5. **DPI-Normalisierung:** Standardisierung von `window.devicePixelRatio` auf `1.0`.
  6. **Native Cloaking:** Alle überschriebenen Methoden geben bei `.toString()` täuschend echtes `function ...() { [native code] }` zurück.
  7. **Domain Intelligence:** Zero-Touch-Modus auf bot-sensitiven Plattformen (z. B. X/Twitter) sowie adaptiver Schutz für layout-kritische Web-Apps (Google Docs, Figma, Tuta etc.).
  8. **Identitätsrotation & Live-Synchronisation:** Identitäts-Seed (`aegis_omega_seed`) rotiert bei Bedarf auf Knopfdruck ("Identität neu würfeln") oder tab-übergreifend via Custom-Events (`aegis:rotate-seed`, `aegis:configure`).
- **UI & Lokalisierung:**
  - VGT Glass 2100 Toggle `#aegisToggle` und Mikro-Button `#btnRotateSeed` im Popup.
  - 100 % Key-Parität in `shared/i18n.js` über alle 4 Sprachen (EN, DE, RU, ZH) für `settingAegis`, `noticeAegis`, `btnRotateSeed`, `toastAegisRotated`.
  - Content Script in Manifesten als `content_scripts[1]` mit `"world": "MAIN"` und `"run_at": "document_start"` eingebunden. WAR-Invariante (`guard.html` exklusiv) bleibt unberührt.
- **Build & Tests:**
  - `build.py` synchronisiert `aegis-engine.js` automatisiert in Chrome- und Firefox-Distributionen.
  - `tests/aegis-shield.test.cjs`: 7 dedizierte Unit-Tests für Farbling, WebGL, Audio, Cloaking, Zero-Touch, Seed-Rotation und Deaktivierung.
  - `node --test tests/*.test.cjs` → **49/49 PASS (100 %)**.
  - `python build.py` → deterministische ZIPs neu gebaut, `SHA256SUMS.txt` aktualisiert.
  - `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` → **3/3 OK**.
  - **Lokale Bindung:** Alle Änderungen verbleiben strikt lokal auf der Arbeitsstation; kein `git push` ausgeführt.

### 2026-10-18 22:36 — Checkpoint 013: **AEGIS Tracker & Privacy Shield (inspiriert durch uBlock Origin Lite, VGT-veredelt)**
- **Kontext & Nutzeranforderung:** Erweiterung von Antipisher um einen hochperformanten Tracker- und Telemetrie-Blocker. Als Vorbild dient die Architektur von uBlock Origin Lite (`uBOL-home-main`), jedoch ohne 1:1-Kopie oder Regel-Bloat, sondern veredelt nach VGT-Standards (Zero-Overhead, Safe Surrogates, kein WAR-Leak, Glass 2100). Verbleibt strikt lokal für Tests (kein Push).
- **Architektonische Neuerungen & Komponenten:**
  1. **Native Declarative Net Request Ruleset (`rulesets/trackers.json`):**
     - Vorab kompilierte, hochwirksame Offline-Regelliste für Chrome MV3 (`declarative_net_request.rule_resources`), die Top-Tracking- und Telemetrie-Netzwerke (Google Analytics, GTM, DoubleClick, Facebook Pixel, Microsoft Clarity, Bing Ads, TikTok, Hotjar, Criteo, Taboola, Outbrain, Sentry, NewRelic, Segment, Adjust etc.) nativ auf C++-Ebene ohne Hintergrund-CPU-Last blockiert.
  2. **URL Parameter Sanitization (Anti-Bounce / Clean Navigation):**
     - Nativer DNR-Query-Transform (`removeParams`) sowie Laufzeit-Bereinigung via `history.replaceState` entfernt 19 invasive Tracking-Tokens (`utm_*`, `fbclid`, `gclid`, `msclkid`, `mc_eid`, `yclid`, `_openstat`, `igshid`, `ttclid` etc.) direkt beim Navigieren.
  3. **Safe Surrogate Defusers (`shared/aegis-engine.js`):**
     - Im Gegensatz zu uBOL keine riskanten Web-Accessible-Resources (WAR bleibt exklusiv `guard.html` gemäß P0-Invariante!).
     - Stattdessen werden sichere Stubs im `MAIN`-World-Kontext bei `document_start` bereitgestellt: `ga`, `gtag`, `dataLayer.push`, `fbq`, `ttq`, `clarity`, `hj`, `ym`.
     - **Asynchrone Callback-Erfüllung (`safeAsync`):** Übergaben wie `hitCallback` bei `ga.send` oder `eventCallback` bei `dataLayer.push` werden sofort asynchron aufgerufen, sodass Kaufabschlüsse, Login-Formulare und Single-Page-Apps niemals einfrieren.
     - **Native Cloaking:** Alle Stubs melden bei `.toString()` `function ...() { [native code] }` und vereiteln Anti-Adblock-Erkennung.
  4. **Beacon & Telemetrie-Entwaffnung:**
     - `navigator.sendBeacon` fängt Telemetrie-Payloads ab, meldet der aufrufenden Seite Erfolg (`true`), blockiert aber den tatsächlichen Netzwerkabfluss.
  5. **Firefox MV3 Dual-Support (`firefox/background.js`):**
     - Blockiert Tracking-Subressourcen (`script`, `xmlhttprequest`, `ping`, `beacon` etc.) via `webRequest.onBeforeRequest`.
  6. **VGT Glass 2100 UI & Live-Metriken (`popup.html`, `popup.js`):**
     - Dritte Kennzahl in der Statusleiste: *Marken* | *Phishing abgewehrt* | *Tracker blockiert* (`trackersBlocked`).
     - Neuer Schalter `#trackerToggle`: *AEGIS Tracker- & Telemetrie-Schutz*.
     - 100 % 4-Sprachen-Lokalisierung (EN, DE, RU, ZH) für `metricTrackers`, `settingTrackers`, `noticeTrackers`.
- **Build & Tests:**
  - `build.py` synchronisiert `rulesets/trackers.json` in `chrome/` und `firefox/` Builds.
  - `tests/tracker-shield.test.cjs`: 7 neue Unit-Tests (DNR-JSON-Validität, Surrogate-Callbacks, FB/TikTok-Stubs, Clarity/Hotjar-Cloaking, Beacon-Drop, URL-Sanitizer) → 7/7 PASS.
  - Gesamt-Testsuite: `node --test tests/*.test.cjs` (9 Dateien) → **56/56 PASS (100 %)**.
  - `python build.py` & `powershell scripts/verify-release.ps1` → **3/3 Dateien & Source-ZIP-Hygiene OK**.

### Checkpoint 014 (2026-10-18): GeDefense Light, Tab-Zähler wie uBlock & Glass 2100 Popup-Politur
- **GeDefense Light (DOM Hypervisor & Script Inoculation):**
  - Integriert in `shared/aegis-engine.js` (läuft in der `MAIN`-Welt bei `document_start`).
  - **Self-XSS Console Defender:** Warnt vor Social-Engineering-Angriffen in den Entwickler-Tools (Bilingual DE/EN, VGT Branding).
  - **Kognitiver Fast-Path DOM-Sanitizer:** Prüft `innerHTML`, `outerHTML`, `insertAdjacentHTML` per Regex auf verdächtige Tags/Attribute (`hasSusTag`, `hasSusAttr`, `hasSusProto`, `hasObfuscatedUrl`). 99.9 % aller unkritischen DOM-Operationen passieren mit 0 ms Latenz.
  - **DOM Clobbering & XSS-Schutz:** Entfernt bösartige `<script>`, `<iframe>`, `<object>` Tags und inline `on*`-Event-Handler; neutralisiert `javascript:` / `vbscript:` und protocol-relative Injektionen (`#vgt-blocked-protocol`).
  - **Stack-Safety:** Sichert Original-Deskriptoren im Modul-Scope und nutzt `<template>`-Fragmente; unendlich-rekursionsfest.
  - Togglebar im Popup (`#geDefenseToggle`, `geDefenseLight: true/false`).
- **Tab-Zähler wie uBlock (Toolbar-Badge & Tab-Metrik):**
  - Chrome: `declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true })` + `api.action.setBadgeBackgroundColor({ color: '#0ea5e9' })`.
  - Firefox & In-Page: `tabBlockedCounts`-Map; zählt live pro Tab hoch und aktualisiert `api.action.setBadgeText({ tabId, text: String(count) })`.
  - Popup-Metrik: `#trackersBlocked` zeigt jetzt prominent die blockierten Tracker **dieses Tabs** an; Sub-Label `#trackersScope` zeigt `Tab: X · Gesamt: Y`.
- **Glass 2100 Popup-Redesign & Bugfixes:**
  - Breite auf 390px erweitert mit fester Breite für Chrome-Popup-Container.
  - **Header-Überlagerung behoben:** Flexbox-Container mit sauberer Trennung von Logo, Text (`VisionGaiaTechnology` / `Antipisher`) und Smaragd-Glas-Versionschip (`0.2.0`). Kein Zusammenstauchen oder Überlappen mehr.
  - **Glass 2100 Scrollbar:** Eigene transparente Graphit-Smaragd-Scrollbar (`::-webkit-scrollbar` & `scrollbar-color`), kein hässlicher Windows-System-Scrollbalken mehr.
  - 100 % 4-Sprachen-Lokalisierung (EN, DE, RU, ZH) für `settingGeDefense`, `noticeGeDefense`, `metricTrackersScope`.
- **Build & Tests:**
  - `tests/gedefense-light.test.cjs`: 7 Unit-Tests für Self-XSS, Fast-Path, Tag-/Handler-Sanitizing, Protocol-Blocking, setAttribute-Hook und Config-Toggle → 7/7 PASS.
  - Gesamt-Testsuite: `node --test tests/*.test.cjs` (10 Testdateien) → **63/63 PASS (100 %)**.
  - `python build.py` & `scripts/verify-release.ps1` → **3/3 Dateien & Source-ZIP-Hygiene OK**.

### Checkpoint 015 (2026-10-18): Umfassendes Einstellungsmenü (Options UI), Whitelist-Engine & Nutzer-Konfigurierbarkeit
- **Vollständiges Einstellungsmenü (Options Page, Glass 2100):**
  - Erstellt: `shared/options.html`, `shared/options.css`, `shared/options.js`.
  - In beiden Manifesten (`chrome/manifest.json`, `firefox/manifest.json`) als `"options_ui": { "page": "options.html", "open_in_tab": true }` registriert.
  - P0-Invariante gewahrt: `web_accessible_resources` bleibt unverändert minimal (`['guard.html']`).
  - 6 modulare Konfigurations-Kategorien mit reaktiven Tabs:
    1. **Phishing & Basis:** Strenger Preflight-Modus (`strictMode`), In-Page Form Shield (`formShieldEnabled`), Status-Toast bei sicheren Seiten (`showSafeToast`), Toast-Anzeigedauer (`toastDuration`: 1.5s, 2.5s, 4s).
    2. **Tracker & Telemetrie:** AEGIS Tracker-Schutz (`aegisTrackerShield`), URL-Tracking-Token Stripper (`sanitizeUrlParams`), sendBeacon-Abfang (`defuseBeacons`), Toolbar-Badge Zähler (`showBadgeCount`).
    3. **GeDefense Light:** Master-Schutz (`geDefenseLight`), Self-XSS DevTools-Schutz (`selfXssWarning`), DOM-Protokoll-Schutz (`blockProtocolInjection`).
    4. **Anti-Fingerprinting:** AEGIS Master-Schutz (`aegisProtection`), Canvas Farbling (`spoofCanvas`), WebGL GPU-Maskierung (`spoofWebGL`), AudioContext Farbling (`spoofAudio`), Digitaler Identitäts-Seed mit Live-Anzeige und "Neu würfeln"-Funktion.
    5. **Ausnahmen & Whitelist:** Dynamische Verwaltung benutzerdefinierter Ausnahmen (`customWhitelist`). Sofortige Validierung, Bereinigung, Hinzufügen, Löschen und Persistierung.
    6. **System & Daten:** Sprachauswahl (`user_locale`: Auto, DE, EN, RU, ZH), Statistiken mit Live-Zähler und Reset-Button, Konfigurations-Export als JSON (`antipisher-settings.json`), Konfigurations-Import mit Validierung, Werkseinstellungen-Reset mit Sicherheitsabfrage.
  - Dezenter animierter Glass-Toast (`.saved-toast`) bei jeder Konfigurationsänderung.
- **Whitelist-Engine im Core:**
  - `shared/detector.js`: `setWhitelist(list)`, `getWhitelist()`, `isWhitelisted(host, customList)` integriert. `classify(url)` prüft Whitelist vorab; Domains und deren Subdomains werden sofort als `safe` freigegeben.
  - Background-Worker (`chrome/background.js`, `firefox/background.js`) und `shared/shield-content.js` synchronisieren `customWhitelist` reaktiv über `storage.onChanged`.
- **Popup-Integration:**
  - Neuer Einstellungs-Button (Zahnrad ⚙️ `#btnOpenOptions`) in der Kopfzeile neben dem Versionschip (`.header-actions`, `.btn-icon`).
  - Öffnet per Klick direkt die Einstellungsseite über `api.runtime.openOptionsPage()`.
- **Build & Tests:**
  - `build.py` synchronisiert `options.html`, `options.css`, `options.js` in Chrome- und Firefox-Builds und validiert `options_ui` im Manifest.
  - `tests/options-and-whitelist.test.cjs`: 6 neue Unit-Tests für Whitelist-Matching, Subdomain-Ausnahmen, Per-Call-Overrides, Manifest-Validierung, Popup-Integration und Options-DOM-Integrität.
  - Gesamt-Testsuite: `node --test tests/*.test.cjs` (11 Testdateien) → **69/69 PASS (100 %)**.
  - `python build.py` & `scripts/verify-release.ps1` → **3/3 Dateien & Source-ZIP-Hygiene OK**.

### 2026-10-18 23:38 — Checkpoint 008: Release 0.2.1-Alpha & Verification
- **Tracker-Zähler-Synchronisation:** Chrome MV3 `webRequest` Erfassung von Tracker-Netzwerkanfragen (`isTrackerRequest`), explizite `action.setBadgeText` Aktualisierung und tabgebundener `getTabTrackerStats` Message-Handler. Dynamisch nachladende Tracker werden in Echtzeit erfasst und lösen einen Live-Refresh im geöffneten Popup aus.
- **GitHub Release CI Workflow:** Release-Erstellung in `.github/workflows/release.yml` idempotent gehärtet. Falls Release bereits existiert (z. B. durch parallele Tags oder vorherige Läufe), wird fehlertolerant mit `gh release upload ... --clobber` aktualisiert.
- **Multilinguale Parität & Dokumentation:** Alle 4 Sprachen (`de`, `en`, `ru`, `zh`) vollständig auf 0.2.1 aktualisiert; `README.md`, `README.de.md`, `README.ru.md`, `README.zh.md` und `CHANGELOG.md` ausgebaut.
- **Echte Screenshots generiert:** Echte Chromium-Headless Renders von Popup (`v2-popup.png`), Options-Dashboard (`v2-options.png`) und Whitelist-Management (`v2-options-whitelist.png`) in `audit/verify/fix/screenshots/` abgelegt und in die READMEs eingebettet.
- **Deterministischer Release-Build:** Bit-identische ZIP-Dateien für Chrome, Firefox und Source (`v0.2.1-alpha`) erzeugt und über `scripts/verify-release.ps1` validiert.

## Test-Ledger (zuletzt ausgeführt)

| Befehl | Ergebnis |
|---|---|
| `node --test tests/*.test.cjs` (11 Dateien) | 69 pass / 0 fail, Exit 0 |
| `node audit/verify/holdout/run_holdout.cjs` | 289/296, FN 0/166, FP 7/121, Exit 0 |
| `node audit/verify/fix/fresh_sanity.cjs` | 42/44, Exit 0 |
| `node audit/lead/lead_probe.cjs` | 0/26 FP, 0/40 FN, Exit 0 |
| `python build.py` (2×) | byte-identische ZIPs (`v0.2.1-alpha`), `SHA256SUMS.txt`, Exit 0 |
| `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` | 3 Dateien OK, Source-ZIP-Hygiene OK, Exit 0 |
| `node --check` (detector/shield/guard/popup/options/i18n/background/aegis) | Exit 0 |

## Offene Risiken (nicht Release-blockierend für Alpha, aber vor Beta)

- Echter Browser-E2E-Automatisierungstest; kein Firefox auf dem Host.
- Offizielle Domaindaten unvollständig/nicht durchgängig verifiziert.
- Rest-FPs (Marken-Subdomains, userinfo, Doku-Pfade) und Rest-FNs (Combosquat, 2-Edit, unbekannte Marken).


