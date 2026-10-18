# Antipisher 0.1.1 — Architektur- und Security-Review (P0-Fixstand)

> **Status:** `SILBER` · Stand 18.10.2026 · **kein Release**, kein Browser-E2E, kein Store.
> Dieses Dokument ersetzt den früheren, veralteten Fremdstand (100 Marken / 9/9 Tests / nicht existierende Codezeilen). Es beschreibt ausschließlich den aktuellen Quellstand.

## 1. Source Identity

| Parameter | Wert |
|---|---|
| Produkt / Version | Antipisher `0.1.1` (Alpha 0.1, P0-Fixstand) |
| Plattformen | Chrome MV3, Firefox MV3 |
| Source Identity | `UNVERSIONED_SNAPSHOT` — kein Git-Repo/Commit/Tag |
| Engine | `shared/detector.js` (ca. 900 Zeilen) |
| Brand-Daten | `shared/sites.js` = `sites-100.json` (**187 Marken / 353 Domains**) |
| Build | `build.py` deterministisch + `SHA256SUMS.txt` |
| Tests | 6 Dateien, 33 Tests (Node 24) |

## 2. Komponenten & Trust Boundaries

```text
Web-Origin / URL
  ├─ Chrome: DNR-Preflight (GET, main_frame) ──► guard.html (Extension-Kontext)
  ├─ Firefox: webRequestBlocking (GET) ────────► guard.html
  └─ Content Shield (beide, document_start, Top-Frame)
        ├─ klassifiziert aktuelle Seiten-URL + Formularziel (inkl. submitter.formAction)
        ├─ blockiert submit-Events, zeigt geschlossenes Shadow-DOM-Interstitial
        └─ Passwortfelder: fail-closed, wenn die Engine fehlt
Guard-Seite ──(allow-once, sender.url + tab.url geprüft)──► Background
Background ──► Chrome: tabgebundene Session-Allow-Regel; Firefox: tabgebundener Bypass
```

**Trust Boundaries:** Web-Origin → Extension-Kontext; Guard-Page → privilegierter Background (doppelt gebunden); Background → Netzwerkentscheidung; Content Script → Seitendokument (Isolated World); Brand-DB → Detektor (Paketvertrauen); Build → ZIP/Store (keine Signatur vorhanden).

## 3. P0-Fixes in diesem Stand

1. **`force.com`-Whitelist-Fail-open:** Shared-Hosting-Roots (`force.com`, `my.salesforce.com`, `my.site.com`, `github.io`, `vercel.app`, `netlify.app`, `wordpress.com` …) sind keine exklusiven Markendomains. `isOfficialHost()` verhindert, dass Tenants als offiziell gelten; `paypal.force.com` wird geblockt (`tests/p0-regressions.test.cjs`).
2. **Datenintegrität:** Build validiert, dass kein Shared-Host-Root als offizielle Domain gelistet ist; `build_sites.py` prüft Duplikate; 187 Marken inkl. DE/EU-Behörden/Banken/Versicherer.
3. **Erkennung generalisiert:** Bait-Lexikon (DE/EN) mit Token-/Skelett-/DL1-Matching statt Fixture-Tokens; DL2-Warnstufe; Bitsquatting; Ligaturen; generalisierte l/i- und Kurzmarken-Regeln; Diakritika generisch (mit Wort-Ausnahmen wie „über“); `brand+TLD`-Konkatenation; Marken-Subdomain-/Subdomain-Typosquat-Erkennung ohne andere Marken zu kapern (`brandLabels`).
4. **Pfad-Regel:** Nur Marken-/Official-Domain-**Segmente** + Auth-Action-Segment; keine Query, keine Suchmaschinen-/Artikel-Slugs, keine `/blog|docs`-Umgehung; Shared-Hosting-Loginpfade → Warnung.
5. **ccTLD-Strategie:** Globale Marken mit ≥3 dokumentierten ccTLDs gelten für exakte Regionaldomains als offiziell; generische TLDs bleiben Block; unklare ccTLDs → Warnstufe (fortfahren möglich). `.co/.io/.me/.tv`-ähnliche TLDs sind von der Vertrauensheuristik ausgenommen.
6. **Chrome:** Fail-open beseitigt (persistierter „eingeschränkt“-Status + Observer-Fallback); Long-URL-Blocker beseitigt (tabgebundene Allow-Regel, keine exakte 1.900-Zeichen-Regex).
7. **Firefox:** WAR + `data_collection_permissions`; GET-Preflight; POST wird **nicht mehr** still in GET umgeschrieben (Datenverlust behoben) — POST bleibt eine dokumentierte Restlücke.
8. **Content Shield:** Escaping der Erklärung (`escapeHtml`), `submitter.formAction`, Warnstufen blockieren keine Formulare, Revalidierung des Ziels vor Fortfahren (TOCTOU), Passwort-Fail-closed bei fehlender Engine, `display:block!important` gegen einfaches CSS-Verstecken. **Weiterhin umgehbar:** `form.submit()`, iframes, `fetch`/XHR, Seiten-JS kann den Host entfernen; kein Preflight.
9. **WAR:** Nur `guard.html` in beiden Manifesten (Content Scripts benötigen kein WAR).
10. **UI/A11y (GLASS 2100):** gemeinsame Design-Tokens (`design-tokens.css`), Graphit-Glas + Emerald-Signal, Brandbar oben in Guard/Popup, Hairline-Datenzeilen statt Kartenwand, `[hidden]`-Fix, WCAG-AA-Kontrast, Popup-Fokusring, Forced-Colors, `alertdialog` + Escape + Fokusführung, Warn-UI („Prüfung eingeschränkt“), kompaktes Layout. Visual QA: `audit/verify/fix/UI_REDESIGN.md` (6 Chromium-Renders; 360 px/Firefox `NOT_TESTED`).
11. **Build/Doku:** deterministische ZIPs, `SHA256SUMS.txt` in Repo + Release-Ordner, Source-ZIP ohne `audit/`/Checksums, Legacy-VGT-ZIPs entfernt; README/Next/Architektur ehrlich, Version konsistent `0.1.1`.

## 4. Qualitäts- und Security-Bewertung

| Achse | Status | Begründung |
|---|---|---|
| Funktionspfade | GOLD-nah | Kernpfade + Fehlerpfade implementiert; 33 Tests |
| Erkennung | SILBER | Holdout 289/296, frischer Sanity 42/44; Rest-FN/FP dokumentiert |
| Browser-Integration | SILBER | Chrome-Redirect-All/DNR-Muster nicht runtime-verifiziert; kein E2E |
| Security | SILBER | force.com-Fix, Allow-once gebunden, Fail-open behoben; Shield-Bypässe + WAR-Restrisiko |
| Release | **BLOCKED** | Store-Assets/Privacy/CI/Signatur/Browser-E2E fehlen |
| Gesamt | **SILBER** | ehrlicher Alpha-/P0-Stand, keine Release-/„Diamant“-Behauptung |

## 5. Bekannte Restrisiken

1. **POST:** Kein Preflight; Shield ist UX-Barriere, kein Sicherheitsperimeter. `form.submit()`, iframes, `fetch`/XHR, Overlay-Entfernen.
2. **Chrome-Architektur:** Redirect-All (History/Referer/OAuth/Fragment), `regexSubstitution`-Muster nicht dokumentiert; Store-Review-Risiko. Vor Store-Neubewertung (V2-Hybrid) nötig.
3. **Daten:** Offizielle Domains nicht durchgängig per RDAP/CT verifiziert; ccTLD-Heuristik kann irren; `telekom.at` = Warnung (anderer Betreiber).
4. **Rest-FPs:** Markenname als Subdomain auf Drittseiten (`signal/box/chase.example.org`), userinfo-Randfälle, Doku-Pfade mit Marke+Action.
5. **Rest-FNs:** Combosquat ohne Listenwort (`tiktok-coin`, `ledger-live`), 2-Edit außerhalb der Regeln, Marken außerhalb der 187 Einträge.
6. **Kein Update-Kanal/Signatur/Rollback; kein Git/CI; keine Privacy-Policy/Store-Assets.**
7. **Leistung:** Median 0,1–0,6 ms, p95 1,1–1,6 ms; „<1 ms“ nur Median.

## 6. Nächste Schritte (P1)

UTS-39/46 + echte PSL; signierte Datenfeeds + Rollback; Browser-E2E (Chrome + Firefox); Chrome-Hybrid statt Redirect-All; Privacy-Policy/Limited-Use/Store-Assets/Signierung; CI + Git; verifizierte offizielle Domaindaten (RDAP/CT); V2-Blueprint Phase 1 (Brand-Impersonation-Graph + Scoring + Benchmark-Gate).

**Ehrlichkeitshinweis:** Dieses Review enthält keine erfundenen Browser-/Store-Ergebnisse. Browser-E2E und Store-Signierung sind `NOT_TESTED`. Die Verifikationshistorie (inkl. der widerlegten Gemini-Claims) liegt unter `audit/verify/`.
