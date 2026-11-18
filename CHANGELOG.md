# Changelog

Alle wesentlichen Änderungen an **Antipisher by GeDefense**. Format orientiert an Keep a Changelog;
Versionierung folgt der Alpha-Reihe `0.2.x`.

## [0.2.4] — 2026-11-18 (Antipisher by GeDefense · Dark Navy Blue UI & Rebrand)

### Rebrand & UI-Design („Antipisher by GeDefense“)
- **Offizielles Rebranding:** Alle Erweiterungs-Manifeste (`chrome/manifest.json`, `firefox/manifest.json`), `_locales/{en,de,ru,zh_CN}/messages.json`, `shared/i18n.js`, Popup, Options, Guard-Page, In-Page-Shield und Self-XSS-Konsolenbanner tragen nun das vereinheitlichte Branding **Antipisher by GeDefense** (`GeDefense · VisionGaiaTechnology`).
- **GeDefense-Wappen überall integriert:** Neue deterministische Browser-Tray-Icons (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`) sowie Integration des GeDefense-Logos in Popup, Options, Guard-Interstitial und als Inline-Wappen im geschlossenen Shadow-DOM von `shared/shield-content.js` (ohne Aufweichung von `web_accessible_resources: ['guard.html']`).
- **GeDefense Dark Navy Blue Theme (`shared/design-tokens.css`, `popup.css`, `options.css`, `guard.css`, `shield-content.js`):** Umstellung der gesamten Glas-UI vom bisherigen Emerald-Schema auf tiefes GeDefense-Mitternachtsblau (`#040914` – `#0b1830`) mit präzisen Cyan-Blue-Akzenten (`#38bdf8` / `#0ea5e9`).
- **Release- & Spiegel-Infrastruktur:** Synchronisierte `v0.2.4-alpha`-Builds für Chrome MV3, Firefox MV3 und Source inkl. `SHA256SUMS.txt` & CycloneDX 1.5 `sbom.json` auf GitHub und GitFlic.

## [0.2.3] — 2026-11-17 (Platin Security Hardened)

### VGT-100 Security Audit & Platin-Härtung (`48/52 PASS, 0 FAIL`)
- **RFC-1035 Input- & DoS-Ressourcenbudgets (`shared/detector.js`, `shared/popup.html`, `shared/popup.js`):**
  - Strikte Längenbudgets (`MAX_URL_INPUT_LEN = 262144`, `MAX_HOST_LEN = 253`, `MAX_LABEL_LEN = 63`, `MAX_LABELS = 32`, `MAX_PATH_SCAN_LEN = 2048`) und einmalige Label-Vorberechnung vor der 187-Marken-Schleife.
  - Verarbeitungszeit eines `100.000`-Zeichen-Hostlabels sinkt von `2.753,4 ms` auf **`0,26 ms`** (**10.590× Speedup**); reguläre Klassifikationslatenz sinkt auf `p50 = 0,023 ms`, `p95 = 0,39 ms`, `p99 = 0,53 ms`.
  - `#url`-Eingabefeld im Popup auf `maxlength="2048"` begrenzt.
- **Allow-Once Lifecycle mit 30s-TTL, Stale-Bypass-Clear & Queue-Mutex (`chrome/background.js`, `firefox/background.js`):**
  - Temporäre Einmal-Freigaben (`allow-once`) verfallen automatisch nach `ALLOW_TTL_MS = 30000` (30 Sekunden) oder sofort bei einer abweichenden Navigation im selben Tab.
  - Queue-serialisiertes `configure()` (`configPromise` / `configPending`) verhindert Race-Conditions bei überlappenden Konfigurationsläufen; verwaiste Session-Regeln (`id >= 10001`) werden beim Start noch vor dem ersten Storage-Read bereinigt.
- **Fail-Closed Engine Guard & Datensparsamer Security-Event-Ringpuffer (`chrome/background.js`, `firefox/background.js`):**
  - Fehlt die Detektor-Engine oder wirft `classify()`, leiten Firefox (`analyzeRequest`) und Chrome (`onBeforeNavigate`) Navigationen **fail-closed** auf `guard.html` um und setzen `protectionDegraded = true`.
  - Lokaler Ringpuffer `storage.local.securityEvents` (max. 50 Einträge, `{ ts, type, detail }`) protokolliert `block`, `allow-once`, `degraded` und `healthy` ohne Speicherung von URLs, Hostnamen oder PII.
- **Detektor-Kalibrierung (`shared/detector.js`):**
  - Eliminiert alle 20 Benign-FPs in `probe02` (`0/745 FP`, `0` Subdomain-FP-Kandidaten in `probe08`) und schließt Combosquat-Lücken (`tiktok-coin.com`, `ledger-live.com`, `paypal-me.com`): `42/43` in `probe02` (`97,7 %`), `44/44` in `fresh_sanity.cjs` (`100 %`), `292/296` mit **`0/166 FN` (`100 % TPR`)** im unabhängigen Holdout.
- **Build-Allowlist, RFC-1123-Domain-Schema & CycloneDX 1.5 SBOM (`build.py`, `build_sites.py`, `sbom.json`):**
  - `build_sites.py` validiert alle 187 Marken und 353 Domains gegen strikte RFC-1123-Hostname-Regexe.
  - `build.py` prüft vor dem Packen eine explizite Datei-Positivliste (`ALLOWED_PACKAGE_FILES`, 22 Dateien) und generiert deterministisch `sbom.json` (CycloneDX 1.5, 0 externe Dependencies) sowie `SHA256SUMS.txt`.
- **Platin-Security-Testsuite (`tests/platin-security.test.cjs`):**
  - 6 neue Security-Testsuiten prüfen dauerhaft alle VGT-100-Negativ- und Grenzfälle in CI (**91/91 Tests in 13 Dateien PASS**).

### Security & GeDefense Light (Optimizely Supply-Chain & Magecart Hardening)
- **GeDefense Light Supply-Chain & Dynamic Script/Iframe Gatekeeper:**
  - Blockiert bösartige dynamische `<script>`- und `<iframe>`-Injektionen (`Element.prototype.setAttribute`, `HTMLScriptElement.prototype.src`, `HTMLIFrameElement.prototype.src`, `Node.prototype.appendChild`, `Node.prototype.insertBefore`) zu kompromittierten C2-Endpunkten (`1688360.cc`, `webshell.lol`, `linkforge.cc`, `.icu` iOS-Exploit-Kits wie Coruna/DarkSword), Hochrisiko-TLDs (`.icu`, `.lol`, `.top`, `.click`, `.gq`, `.tk` etc.) und rohen öffentlichen IPv4-Hosts.
  - Neutralisiert inline verschleierte Loader-Payloads (`eval(atob(...))`, `window._k7`, `data-channel-code="02111110"`), ohne legitime First-Party-Skripte oder Zahlungs-CDNs (Stripe, Adyen, PayPal) einzuschränken.
- **Anti-Magecart Exfiltration Guard (`sendBeacon` & `fetch`):**
  - Verhindert das stille Abfließen von Zahlungs-, Kreditkarten- und Passwortdaten über `navigator.sendBeacon` und `window.fetch` an Skimmer-Endpunkte (`/card.php`, `/hit.php`, `/skimmer.php` sowie fremde Hochrisiko-Domains).
- **Crypto-Clipper & Clipboard Hijack Guard:**
  - Schützt `navigator.clipboard.writeText` vor stillem Austausch kopierter Krypto-Wallet-Adressen (BTC, ETH/EVM, TRON) gegen Angreifer-Wallets, indem die tatsächlich im DOM markierte Nutzer-Auswahl wiederhergestellt wird.
- **Plattform-Parität für Tracker- & Supply-Chain-Blocklisten (`rulesets/trackers.json`, `chrome/background.js`, `firefox/background.js`):**
  - Synchronisiert `optimizely.com`, `logx.optimizely.com`, `browser.sentry-cdn.com`, `bam.nr-data.net` sowie die bekannten Supply-Chain-IOCs vom 16.11.2026 über Chrome MV3 (DNR + webRequest) und Firefox MV3 (`webRequestBlocking`).
  - Behebt fehlenden `typeof api.runtime.sendMessage === 'function'`-Guard in `firefox/background.js`.

### Bugfixes
- **YouTube Video Ad Accelerator End-Jump-Bug behoben (`shared/aegis-engine.js`):**
  - Behebt den Fehler, bei dem normale YouTube-Videos plötzlich ans Ende sprangen und sofort zum nächsten Video weiterleiteten. Ursache war die Abfrage auf statisch im DOM verbleibende leere Container (`.ytp-ad-player-overlay`, `.ytp-ad-module`) sowie das Nicht-Zurücksetzen von `video.playbackRate = 16.0` nach Werbeende.
  - Der Beschleuniger greift nun ausschließlich, solange `#movie_player` aktiv die Klasse `ad-showing` oder `ad-interrupting` trägt (und `duration <= 300s`), und stellt danach die ursprüngliche Wiedergabegeschwindigkeit (`1.0x`) und Lautstärke automatisch wieder her.
- **Safe-Toast Anzeigedauer (`shared/shield-content.js`), Synchrones Guard-Rendering (`shared/guard.js`) & Guard-Versionsmetadaten (`shared/guard.html`):**
  - `renderSafeToast(duration)` übernimmt nun den konfigurierten `duration`-Parameter aus den Einstellungen.
  - `shared/guard.js` rendert die lokalisierte Warn-UI sofort synchron beim Laden, noch bevor `storage.local.get('user_locale')` auflöst (behebt Optional-Chaining-Kurzschluss bei fehlendem `api.storage`).
  - Synchronisiert alle Versionsangaben auf `0.2.3`.

## [0.2.2] — 2026-10-19 (Alpha)

### Features & VGT Ad Shield
- **VGT Ad Shield (Werbeblocker & Element Hiding):**
  - Zero-Flicker kosmetische Filterung via `document.adoptedStyleSheets` (blendet Banner, Werbe-Slots, Sponsoren-Kacheln und Werbe-iFrames lautlos und ohne Cumulative Layout Shift aus).
  - Dynamischer `MutationObserver` zum fortlaufenden Kollabieren asynchron nachgeladener Werbeeinheiten.
  - Granulare Schalter im Einstellungsmenü (`options.html`): Master-Schalter, Kosmetische Filterung, Anti-Adblock-Bypass und Popunder-Schutz.
  - Kombinierter Live-Metrik-Zähler für Werbung und Tracker im Popup und Toolbar-Badge.
- **YouTube Video Ad Defense & Fast-Forward Accelerator:**
  - `window.ytInitialPlayerResponse`-Property-Trap tilgt `adPlacements`, `playerAds` und `adSlots` beim Seitenstart im Keim.
  - JSON-Pruning für `window.fetch` und `XMLHttpRequest` fängt Player-Requests (`/youtubei/v1/player` und `/reel_watch_sequence`) ab und filtert Werbeeinschübe heraus.
  - Video Ad Fast-Forward & Auto-Skipper: Schaltet sporadisch verbleibende Video-Ads stumm (`muted = true`), spult mit 16-facher Geschwindigkeit an das Ende (`currentTime = duration`) und betätigt Skip-Buttons (`.ytp-ad-skip-button`) in Millisekunden.
  - Anti-Adblock Modal Defuser: Beseitigt YouTube-Warnmeldungen („Werbeblocker verstoßen gegen die Nutzungsbedingungen...“), reaktiviert das Video und stellt das Seiten-Scrolling wieder her.
- **GeDefense Light TrustedHTML Hardening:**
  - Vollständige Kompatibilität mit strikten CSP-Direktiven (`require-trusted-types-for 'script'`).
  - Native Trusted-Types-Erkennung (`isTrustedHTML`, `isTrustedTypesEnforced`) verhindert `This document requires 'TrustedHTML' assignment`-Fehler auf YouTube und modernen Webanwendungen.

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
