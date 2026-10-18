# Changelog

Alle wesentlichen Änderungen an Antipisher. Format orientiert an Keep a Changelog;
Versionierung folgt der Alpha-Reihe `0.2.x`.

## [0.2.1] — 2026-10-18 (Alpha)

### Features & Security
- **Dediziertes Einstellungsmenü (`options.html`):** Vollständiges Options-Dashboard zur Konfiguration von Preflight-Modus (Standard vs. Streng), Status-Toast, Badge-Zähler und Sprache.
- **Benutzerdefinierte Whitelist:** Lokales Verwalten und sofortiges Freigeben vertrauenswürdiger Domains ohne externe Abfragen oder Latenz.
- **AEGIS Tracker Shield (uBlock-inspiriert):**
  - Deklarative Netzwerkblockade (`rulesets/trackers.json`) gängiger Analyse- und Werbenetzwerke in Chrome MV3 (DNR) und Firefox (webRequest).
  - Dynamische Script-Surrogates für unterbrechungsfreie Funktionalität: `window.ga`, `window.dataLayer`, `window.fbq`, `window.ttq`, `window.clarity`, `window.hj` und `navigator.sendBeacon`.
  - Bereinigung von URL-Tracking-Parametern (`utm_*`, `fbclid`, `gclid`).
- **Echtzeit Live-Tracker-Zähler:** Toolbar-Icon-Badge und Popup zeigen in Echtzeit geblockte Tracker (`Tab: X · Gesamt: Y`) und erfassen präzise auch dynamisch oder asynchron nachladende Tracker-Skripte.
- **GeDefense Light DOM-Hypervisor:**
  - Self-XSS Konsole-Schutzwarnung gegen Social-Engineering-Angriffe.
  - Kognitive Fast-Path Engine für HTML-Säuberung ohne Parsing-Overhead.
  - Inline-Script- und Iframe-Injektions-Neutralisierung sowie Prototype-Level `javascript:` URI-Entschärfung.
- **AEGIS Anti-Fingerprinting Cloaking:** Screen-Geometrie-Fuzzing und subtiles Canvas 1-Bit-Rauschen.
- **UI / Usability:**
  - Popup-Breite auf 380px erweitert mit dezenter Glassmorphism-Scrollbar und optimierter Typografie.
  - Versions-Chip sauber neben Marken-Titel positioniert (Überlagerung behoben).
- **CI / CD Fix:** GitHub Release Action-Schritt auf idempotente Verifikation und Fallback zu `gh release upload ... --clobber` umgestellt.

## [0.2.0] — 2026-10-18 (Alpha)

### Features
- **Leises sicheres Surfen:** Saubere, verifizierte Webseiten öffnen direkt ohne Latenz (0 ms) und ohne störende Vollbild-Unterbrechungen.
- **Glass 2100 Status-Toast:** Nicht-blockierender, schwebender Status-Pill beim Öffnen verifizierter Domains.
- **Mehrsprachigkeit (4 Sprachen):** Vollständige Lokalisierung für Deutsch (`de`), Englisch (`en`), Russisch (`ru`) und Chinesisch (`zh`).
- **Standard vs. Strenger Preflight-Modus:** Umschaltbar über Popup.

## [0.1.1] — 2026-10-18 (Alpha)

### Security

- **Kritisch:** `force.com`-/Shared-Hosting-Whitelist-Fail-open geschlossen; `paypal.force.com`
  wird blockiert, Plattform-Roots bleiben erreichbar (`isOfficialHost`, Multi-Tenant-Liste).
- Chrome: stilles Fail-open beseitigt (persistierter „eingeschränkt“-Status + Observer-Fallback);
  Long-URL-Blocker (>1.900 Zeichen) beseitigt (tabgebundene Allow-Regel).
- Firefox: POST wird nicht mehr still in GET umgeschrieben (Datenverlust); WAR +
  `data_collection_permissions`; Bypass-Cleanup.
- Content Shield: Escaping der Erklärung, `submitter.formAction`, Warnstufen blockieren keine
  Formulare, Ziel-Revalidierung, Passwort-Fail-closed bei fehlender Engine.
- WAR auf `guard.html` minimiert.

### Detection

- Bait-Erkennung auf Token-/Skelett-/Fuzzy-Matching umgestellt; Fixture-Tokens und
  `startsWith(brand+'com')`-Hacks entfernt.
- Pfad-Regel neu: nur Marken-/Official-Domain-Segmente + Action-Segment; keine Query,
  keine Suchmaschinen-/Artikel-Slugs, keine `/blog|docs`-Umgehung.
- Diakritika generisch (inkl. kurzer Marken), DL2-Warnstufe, Bitsquatting/Kurzmarken-Regeln,
  Marke+TLD-Konkatenation, Marken-Subdomain-Typosquats.
- Offizielle ccTLD-Strategie (global brands vs. Warnstufe; generische TLDs block).
- 187 Marken / 353 Domains (DE/EU-Ausbau: Targobank, Sparda, PSD, AOK, TK, Bawag, SBB,
  Swisscom, Check24, Immoscout24, Kleinanzeigen, Arbeitsagentur, Finanzamt, Bitpanda u. a.).

### UI / UX

- Vollständiges GLASS-2100-Redesign: gemeinsame Design-Tokens (`shared/design-tokens.css`),
  Graphit-Glas + Emerald-Signal, Branding oben in Guard/Popup (`VisionGaiaTechnology · Antipisher ·
  Domain Trust`), Hairline-Datenzeilen statt Kartenwand, Statuszustände block/warn/invalid/safe.
- Popup neu (`popup.css`), Shield-Modal im gleichen Material, Emojis entfernt, A11y-Fixes
  (Fokus, Escape, Kontrast ≥ 7:1, Forced Colors, Reduced Motion/Transparency).

### Build / Docs

- Deterministische ZIPs + `SHA256SUMS.txt` in Repo und Release-Ordner; Source-ZIP ohne
  `audit/`/Checksums; Legacy-VGT-ZIPs entfernt.
- README/Next/Architektur ehrlich: keine PLATIN-/0-FP/FN-/„POST geschlossen“-/„immun“-Claims.
- GitHub-Alpha-Vorbereitung: CI, Release-Workflow, Issue-Templates für FP/FN, Alpha-Install-
  und Signierungs-Dokumentation.

### Known limitations

- Kein vollständiger POST-Schutz (`form.submit()`, iframes, fetch/XHR, Overlay-Manipulation);
  Chrome-DNR bleibt GET-only.
- Chrome-Redirect-All und DNR-`regexSubstitution` nicht browser-verifiziert.
- Offizielle Domaindaten nicht durchgängig RDAP/CT-verifiziert.
- Kein echter Browser-E2E, keine Store-/Rechtsprüfung, keine signierten Updates.
- Performance: Median 0,1–0,6 ms; p95 1,1–1,6 ms. „< 1 ms“ nur Median.

## [0.1.0] — 2026-10-18 (Alpha)

- Erste Alpha: lokale Erkennung (Damerau-Levenshtein 1, Homoglyphen, Punycode, Subdomain-/PSL-
  Heuristik), Chrome-MV3-Preflight, Firefox-webRequest, Glass-Interstitial, 165 Marken.
- Bekannte Grenzen: hohe FP/FN-Raten, Firefox-WAR-Lücke, globale Redirect-Architektur.
