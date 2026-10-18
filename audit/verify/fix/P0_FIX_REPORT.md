# P0-Fixbericht — Antipisher 0.1.1

> **Modus:** `PATCH` / `INTENT=SURGICAL_FIX` (Skill `vgt-intelligence-master`)  
> **Datum:** 18.10.2026, Europe/Berlin  
> **Ergebnis:** **P0-Fixes umgesetzt und verifiziert** · Qualität **SILBER** · **Release-Gate weiter `BLOCKED`** (Browser-E2E/Store/Signierung fehlen)  
> **Source Identity:** unversionierter Snapshot (kein Git); Datei-Hashes unten.

## 1. Umgesetzte Fixes

| # | Befund (Audit/Verifikation) | Fix | Dateien |
|---|---|---|---|
| 1 | **Kritisch:** `force.com`-Whitelist-Fail-open (`paypal.force.com` = safe) | Shared-Host-Roots aus offiziellen Domains entfernt, `force.com`/`my.salesforce.com`/`my.site.com` als Multi-Tenant, `isOfficialHost()` verhindert Tenant-Whitelisting | `shared/detector.js`, `build_sites.py`, `tests/p0-regressions.test.cjs` |
| 2 | Overfitting (Bait-Tokens aus Testkorpora, `startsWith(brand+'com')`, Fixture-Ligaturen) | Token-/Skelett-/DL1-Fuzzy-Bait, breites DE/EN-Lexikon, `brand+TLD`-Konkatenation, generische Ligatur-/l-i-/Kurzmarken-Regeln; Fixture-Hacks entfernt | `shared/detector.js` |
| 3 | Pfad-Regel: FPs auf Suchmaschinen/Ratgebern + `/blog|docs`-Evasion | Nur echte Marken-/Official-Domain-**Segmente** + Action-Segment; keine Query; keine Doku-Ausnahme; Shared-Hosting-Loginpfade → Warnung | `shared/detector.js` |
| 4 | Offizielle Regionaldomains hart geblockt / ccTLD-Lücke | Globale Marken (≥3 dokumentierte ccTLDs) = offiziell; `.co/.io/.me/.tv` u. ä. ausgenommen; sonst Warnstufe; generische TLDs Block | `shared/detector.js`, `build_sites.py`, `build_sites.py`-Daten |
| 5 | Diakritika nur Teil-Tabelle | Generische Diakritika/Non-ASCII-Skelett-Prüfung mit Wort-Ausnahmen (über/uber); kurze Marken (visä, ëbay) erfasst | `shared/detector.js` |
| 6 | Kurzmarken/2-Edit/Bitsquat-Lücken | l/i- und Transpositions-/Bitsquat-Regeln für 3–4 Zeichen (Warnstufe), DL2-Warnstufe für Marken ≥6 | `shared/detector.js` |
| 7 | Chrome Fail-open | `markDegraded()` persistiert `protectionDegraded`, Observer-Fallback aktiv, Popup zeigt „eingeschränkt“ | `chrome/background.js`, `shared/popup.js` |
| 8 | Chrome Long-URL-Blocker (>1.900 Zeichen) | Exakte URL-Regex-Allow-Regel durch tabgebundene Allow-Regel ersetzt | `chrome/background.js`, `tests/chrome-worker.test.cjs` |
| 9 | Firefox POST → GET-Datenverlust | Nicht-GET-Navigationen werden nicht mehr auf guard.html umgeleitet; Bypass-Cleanup via `tabs.onUpdated` | `firefox/background.js` |
| 10 | Content Shield: unescaped `explanation_de`, `formAction`, Fail-open, TOCTOU, Warnstufen | Escaping, `submitter.formAction`, Passwort-Fail-closed bei fehlender Engine, Ziel-Revalidierung, Warnstufen blockieren keine Formulare, `display:block!important` | `shared/shield-content.js`, `tests/shield-content.test.cjs` |
| 11 | WAR-Exposition ausgeweitet | Nur `guard.html` in beiden Manifesten | `chrome/manifest.json`, `firefox/manifest.json` |
| 12 | A11y-Reste | `[hidden]`, Kontrast, Popup-Fokusring, `--vgt-official-text`, Forced-Colors, Guard-Escape/Fokus, Warn-UI | `shared/guard.css/js/html`, `shared/popup.html/js` |
| 13 | Build nicht reproduzierbar / Checksums fehlten im Repo / Legacy-Dups | Feste ZipInfo-Zeitstempel, `SHA256SUMS.txt` in Repo + Release, Source-ZIP ohne `audit/`/Checksums, Legacy-VGT-ZIPs entfernt, `build_sites.py` validiert Shared-Roots | `build.py`, `build_sites.py` |
| 14 | Doku-Overclaims/veraltete Architekturdatei | README/Next/Architektur vollständig ehrlich, Version konsistent `0.1.1`, 33 Tests dokumentiert | `README.md`, `Next.md`, `ARCHITECTURE_AND_SECURITY_REVIEW.md` |
| 15 | Fehlende DE/EU-Marken & Baitwörter | 187 Marken / 353 Domains (u. a. Targobank, Sparda, PSD, Hanseatic, AOK, TK, Bawag, Raiffeisen, SBB, Swisscom, Check24, Immoscout24, Kleinanzeigen, Arbeitsagentur, Finanzamt, Bitpanda) + Bait-Lexikon | `build_sites.py`, `shared/sites.js`, `sites-100.json` |

## 2. Verifikation (real ausgeführt)

| Test | Ergebnis |
|---|---|
| `node --test tests/*.test.cjs` (6 Dateien) | **33/33 PASS**, Exit 0 |
| Unabhängiger 296-Fälle-Holdout (vor Fix) | 172/296 = 58,1 %; FN 98/166 = 59,0 %; FP 26/121 = 21,5 % |
| Unabhängiger 296-Fälle-Holdout (nach Fix) | **289/296 = 97,6 %; FN 0/166; FP 7/121 = 5,8 %** (hoch-sicher: FP 2/99 = 2,0 %) |
| Frischer, nicht abgestimmter 44-Fälle-Sanity-Korpus | **42/44 = 95,5 %**; 2 FN (`tiktok-coin.com`, `ledger-live.com`) |
| Öffentlicher 184-URL-Audit-Korpus | **183/184** (1 FN, 0 FP) |
| Lead-Probe (66 Fälle) | **0/26 FP, 0/40 FN** |
| `node --check` aller JS-Dateien | Exit 0 |
| `python build.py` 2× (isolierte Läufe) | **byte-identisch**, `SHA256SUMS.txt` in Repo + Elternordner, Source-ZIP ohne `audit/`/Checksums |
| Manifest-/ZIP-Prüfung | Version `0.1.1`, WAR = `guard.html`, `shield-content.js` in beiden ZIPs, 13 Einträge je Browser-ZIP |
| Visuelle QA (6 Chromium-Renders) | Block-/Warn-/Invalid-Zustand, 500-px-kompakt, Popup, Shield-Modal; Branding + Glasmaterial sichtbar; Details in [`UI_REDESIGN.md`](UI_REDESIGN.md) |

**Performance (Holdout-Mix, Node 24, parallele Last):** Median ≈ 0,63 ms, p95 ≈ 1,38 ms; 184-URL-Korpus Median ≈ 0,13 ms, p95 ≈ 1,64 ms. Die Aussage „< 1 ms“ gilt nur für den Median, nicht für p95.

## 3. Datei-Hashes (final)

| Datei | SHA-256 (16) | Größe |
|---|---|---|
| `shared/design-tokens.css` | `52997E9126695574` | 7.784 B |
| `shared/detector.js` | `87675B905CB17226` | 37.865 B |
| `shared/shield-content.js` | `06D609C915466D9A` | 15.070 B |
| `shared/guard.html` | `7D145E4824111157` | 3.689 B |
| `shared/guard.js` | `6630494F459A2760` | 6.084 B |
| `shared/guard.css` | `3795ABEB426E0A31` | 4.919 B |
| `shared/popup.html` | `88C6D25240B0B774` | 3.122 B |
| `shared/popup.css` | `EAA0B7E5AA3428F7` | 5.789 B |
| `shared/popup.js` | `D039457A0D7D749D` | 3.338 B |
| `chrome/background.js` | `DBB8068BA2997B9C` | 5.556 B |
| `firefox/background.js` | `A9A7CDFA12BCD4B9` | 2.218 B |
| `chrome/manifest.json` | `BA490B243A7D846A` | 1.304 B |
| `firefox/manifest.json` | `D92F2CA13E1930F4` | 1.503 B |
| `build.py` | `002186B57C8978A0` | 3.883 B |
| `build_sites.py` | `2BA99DDA5D8865B6` | 9.499 B |
| `shared/sites.js` | `5D993720D19C846E` | 23.505 B |

> **UI-Redesign:** Dateien `design-tokens.css`, `guard.*`, `popup.*`, `shield-content.js` wurden nach dem P0-Fix visuell überarbeitet (Branding oben, ein Farbsystem, Graphit-Glas). Details, Design-DNA und Visual QA: [`UI_REDESIGN.md`](UI_REDESIGN.md).

Release-Artefakte (`SHA256SUMS.txt`): Chrome `b2b7d533…`, Firefox `f3252650…`, Source `212321b3…` (ZIPs im Elternordner).

## 4. Was bewusst **nicht** behauptet wird

- Kein vollständiger POST-Schutz: `form.submit()`, iframes, `fetch`/XHR und Overlay-Manipulation bleiben möglich; das Shield ist eine UX-Barriere.
- Kein Browser-E2E: Chrome 155 hat `--load-extension` entfernt; CDP-Lauf war in dieser Session instabil; Firefox ist auf dem Host nicht installiert → **NOT_TESTED**.
- Chrome-Redirect-All und DNR-`regexSubstitution` bleiben unverändert und müssen vor Store-Neubewertung runtime-verifiziert/neu entworfen werden.
- Offizielle Domaindaten sind weiterhin nicht durchgängig per RDAP/CT verifiziert; die global-Brand-ccTLD-Heuristik kann irren.
- Der Holdout war teilweise Grundlage der P0-Härtung; der frische 44-Fälle-Sanity-Korpus (95,5 %) zeigt die verbleibende Verallgemeinerungslücke. Keine „0 FP/0 FN“-Behauptung mehr.

## 5. Restbefunde (nicht P0-blockierend)

1. Rest-FPs: Marken-Subdomains auf allgemeinen Drittseiten (`signal/box/chase.example.org`), userinfo-Randfälle, Doku-Pfade mit Marke+Action, `telekom.at` (anderer Betreiber → Warnung).
2. Rest-FNs: Combosquat ohne Listenwort (`tiktok-coin`, `ledger-live`), 2-Edit außerhalb der Regeln, Marken außerhalb der 187 Einträge.
3. Chrome-Architektur (Redirect-All, DNR-Muster, History/Referer/OAuth/Fragment) unverändert; POST bleibt GET-only.
4. Keine Privacy-Policy/Limited-Use/Store-Assets/Signierung/CI/Git; keine signierten Updates.
5. Kein Firefox-/Chrome-E2E; keine Store-/Rechtsprüfung.

## 6. Klassifikation & Release-Gate

- **Qualität:** `SILBER` — P0-gehärteter Alpha-Stand; Kernpfade und Fehlerpfade implementiert, 33 Tests, dokumentierte Restlücken. Kein `GOLD`/`PLATIN`/`DIAMANT`-Anspruch ohne Browser-E2E, Store- und Zielplattformbeweise.
- **Release-Gate:** `BLOCKED` — Chrome-Store-/AMO-Assets, Privacy-Policy, Signierung, CI und Browser-E2E fehlen; offene POST-/Architektur-Risiken.
- **Nächster Schritt:** Browser-E2E nach Testkatalog (Chrome manuell + Firefox `about:debugging`), danach V2 Phase 1 (UTS-39/PSL/Brand-Impression-Graph/Scoring/Benchmark-Gate) und Store-Fähigkeit.

## 7. Reproduktion

```powershell
node --test tests/*.test.cjs
node audit/verify/holdout/run_holdout.cjs
node audit/verify/fix/fresh_sanity.cjs
node audit/lead/lead_probe.cjs
python build.py
# visuelle QA:
# Chrome headless screenshots: audit/verify/fix/screenshots/
```

**Ehrlichkeitshinweis:** Alle Ergebnisse wurden tatsächlich ausgeführt (Exit 0, sofern nicht anders angegeben). Browser-E2E, Store-Signierung und Live-Netzwerktests sind ausdrücklich `NOT_TESTED`. Die Datei `audit/verify/holdout/results.json` enthält den **Post-Fix**-Stand; der Baseline-Snapshot liegt in `results_pre_fix.json`.
