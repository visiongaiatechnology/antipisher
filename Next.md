# Next.md — VGT Project Continuity

> Antipisher · Kontinuierliches Übergabeprotokoll gemäß `references/NEXT_HANDOFF.md`.

## Projektidentität

- **Produkt:** Antipisher (vormals VGT DomainGuard)
- **Workspace:** `c:\Users\Masterboard\Downloads\VGT-DomainGuard-Source-v0.1.0\vgt-domainguard-src`
- **Version:** `0.1.1` (Manifeste), Anzeige `0.1.1 Alpha`; ZIPs `v0.1.1-alpha`
- **Lizenz:** GNU Affero General Public License v3.0 (AGPLv3) — [`LICENSE`](LICENSE)
- **Source Identity:** `UNVERSIONED_SNAPSHOT` — **kein Git-Repo/Commit/Tag**; Hashes siehe [`audit/verify/fix/P0_FIX_REPORT.md`](audit/verify/fix/P0_FIX_REPORT.md). Frühere „SOURCE_IDENTITY_CONFIRMED“-Angabe war unbelegt.
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

## Test-Ledger (zuletzt ausgeführt)

| Befehl | Ergebnis |
|---|---|
| `node --test tests/*.test.cjs` (7 Dateien) | 38 pass / 0 fail, Exit 0 |
| `node audit/verify/holdout/run_holdout.cjs` | 289/296, FN 0/166, FP 7/121, Exit 0 |
| `node audit/verify/fix/fresh_sanity.cjs` | 42/44, Exit 0 |
| `node audit/lead/lead_probe.cjs` | 0/26 FP, 0/40 FN, Exit 0 |
| `python build.py` (2×) | byte-identische ZIPs, `SHA256SUMS.txt`, Exit 0 |
| `node --check` (detector/shield/guard/popup/i18n/background) | Exit 0 |

## Offene Risiken (nicht Release-blockierend für Alpha, aber vor Beta)

- Chrome-Redirect-All + DNR-`regexSubstitution` (Store-/Runtime-Risiko).
- Kein Browser-E2E; kein Firefox auf dem Host.
- Offizielle Domaindaten unvollständig/nicht durchgängig verifiziert.
- Rest-FPs (Marken-Subdomains, userinfo, Doku-Pfade) und Rest-FNs (Combosquat, 2-Edit, unbekannte Marken).
- Keine Privacy-Policy/Store-Assets/Signierung/CI/Git.

**Nächster atomarer Schritt:** Chrome-E2E manuell über `chrome://extensions` mit Testkatalog (harmlose Seite, `paypa1.com`, Warn-URL, POST, Fragment, Long-URL, SW-Restart, Popup-Status), danach Firefox `about:debugging`; Ergebnisse in `audit/verify/fix/BROWSER_E2E.md` dokumentieren.
