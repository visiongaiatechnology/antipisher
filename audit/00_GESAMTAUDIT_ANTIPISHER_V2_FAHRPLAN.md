# Antipisher / VGT DomainGuard 0.1 — Gesamtaudit & V2-Fahrplan

> **Status:** AUDIT ABGESCHLOSSEN · **RELEASE-GATE: BLOCKED** · **QUALITÄTSSTATUS: SILBER** (nicht releasefähig)
> **Datum:** 18.10.2026, Europe/Berlin · **Modus:** `AUDIT_ONLY` (keine Quellcode-Änderung; alle Artefakte unter `audit/`)
> **Scope:** `vgt-domainguard-src` v0.1.0 (44 Dateien, Chrome MV3 + Firefox MV3, 165 Marken / 257 Domains)
> **Prüferteam:** Lead + 4 unabhängige Prüfspuren (Security/VGT-100, Code & Erkennungslogik, State-of-the-Art/V2, UX/Release/Doku)

---

## 0. Management Summary (90 Sekunden)

Antipisher 0.1 ist eine **ehrlich gemeinte, lokal-offline arbeitende Alpha**, deren Erkennungsprimitive (Damerau-Levenshtein, Punycode-Decoder, `withinDomain`, Unicode-Skelett) sauber implementiert und per Property-/Fuzz-Tests bestätigt sind. **Das Produktversprechen wird durch die aktuelle Evidenz jedoch nicht gedeckt**, und zwei der drei Kernversprechen (Firefox-Schutz, „POST-Schutz“) sind nachweislich gebrochen oder falsch dokumentiert.

| Kernaussage | Beleg |
|---|---|
| **Nicht releasefähig** | Qualitätsstufe **SILBER** (Code-, UX- und Lead-Audit unabhängig); VGT-100-Matrix **29 PASS / 14 FAIL / 3 NOT_TESTED / 2 BLOCKED / 52 N/A**, Gate **BLOCKED**; Chrome-Store- und AMO-Gate BLOCKED |
| **Erkennung trifft zu oft nicht** | Adversarialer Korpus (184 URLs): **33,7 % False Negatives** (33/98), **32,9 % False Positives** (27/82). Lead-Korpus: **38/40** realistische Phishing-Varianten unerkannt; **26/26** offizielle Marken-Regionaldomains fälschlich blockiert |
| **Firefox-Schutz funktional gebrochen** | `firefox/background.js:14` leitet auf `guard.html` um, `firefox/manifest.json` deklariert aber **kein `web_accessible_resources`** — laut MDN zwingend für Redirects auf Extension-Seiten |
| **Chrome ist ein riskanter Prototyp** | Globaler DNR-Redirect **aller** GET-Navigationen; **POST ungeschützt** (Gegenteil der Doku); URLs > 1.900 Zeichen nie freigebbar; Konfigfehler ⇒ **stilles Fail-open**; DNR-Kernmuster (`regexSubstitution` auf `chrome-extension://…#<url>`) in offizieller Doku nicht belegt und nicht browser-verifiziert |
| **Dokumentation überzeichnet massiv** | 25 Doku-Behauptungen geprüft: **14 Widersprüche**, 10 bestätigt, 1 nicht prüfbar. „PLATIN VGT SUPREME“, „lückenloser Subdomain-Schutz“, „Manifest-Fingerprinting geschlossen“, „reproduzierbare Builds“ sind widerlegt; `ARCHITECTURE_AND_SECURITY_REVIEW.md` existiert nicht |
| **Gute Basis vorhanden** | 0 Netzwerk-/Telemetrie-Sinks, 0 XSS-Sinks (nur `textContent`), 0 Secrets, doppelt gebundene Allow-once-Authentisierung, konsistente Brand-DB, 13/13 Tests grün, AGPLv3 korrekt hinterlegt, solide Glas-Grundästhetik |

**Fazit:** Aus diesem Stand wird **kein revolutionäres Produkt durch Patchen einzelner Fehler**. Revolutionär wird es durch einen **neuen Erkennungs- und Integrationskern** (V2): echte UTS-39/PSL-Normalisierung, Brand-Impersonation-Graph mit gewichtetem, erklärbarem Scoring, hybride Browser-Integration ohne globalen Redirect, signierte Updates, eine „Domain-Autopsie“-UX und eine belastbare Benchmark-/Evasions-Suite. Der detaillierte Blueprint liegt in [`product/V2_BLUEPRINT.md`](product/V2_BLUEPRINT.md), die Research-Basis mit 37 Quellen in [`product/SOTA_RESEARCH.md`](product/SOTA_RESEARCH.md).

**Empfohlene Reihenfolge:** ① Ehrlichkeit & Baseline (Doku, Claims, Tests) → ② Firefox reparieren & Chrome riskantes Redirect-All entschärfen (Hybrid) → ③ Daten-/FP-Krise beheben (offizielle Domains, Schwellen, Allowlist) → ④ Engine V2 + Benchmark-Gate → ⑤ Update-/Store-/Rechts-Fähigkeit → ⑥ Content-Signale & 1.0.

---

## 1. Auftrag, Vorgehen und Evidenzbasis

**Auftrag:** Vollständige Prüfung von Antipisher 0.1 (Security, Code, Erkennungsqualität, UX/Release, Dokumentation) plus belastbarer V2-Blueprint für ein System, das Menschen vor Phishing über gefälschte Domains schützt. **Kein Änderungsauftrag** → `AUDIT_ONLY`; Quellcode nachweislich unverändert (keine Datei außerhalb `audit/` seit Auditstart geändert).

**Prüfspuren:**

| Spur | Ergebnisbericht | Kernergebnis |
|---|---|---|
| VGT-100 Security-Audit | [`security/AUDIT_SECURITY.md`](security/AUDIT_SECURITY.md) · Matrix [`AUDIT_MATRIX.json`](security/AUDIT_MATRIX.json) | Gate BLOCKED; 11 Befunde, 5 Chains; Matrix via `validate_audit.py` Exit 0 validiert |
| Code-/Erkennungs-Audit | [`code/CODE_REVIEW.md`](code/CODE_REVIEW.md) | 184-URL-Korpus, FN/FP-Tabellen, Performance, Build-Repro, SILBER |
| State of the Art + V2 | [`product/V2_BLUEPRINT.md`](product/V2_BLUEPRINT.md) · [`SOTA_RESEARCH.md`](product/SOTA_RESEARCH.md) | 37 Quellen; Gap-Analyse; Architektur, Roadmap, P0/P1/P2 |
| UX/Design/Release/Doku | [`ux-release/UX_RELEASE.md`](ux-release/UX_RELEASE.md) | 50 Release-Gate-Checks, 41 Kontrastfälle, 7 echte Chromium-Renders, 14 Doku-Widersprüche |
| Lead-Verifikation | [`lead/lead_probe.cjs`](lead/lead_probe.cjs) · [`lead_probe_results.json`](lead/lead_probe_results.json) · [`lead/screenshots/`](lead/screenshots) | Eigenständiger adversarialer Korpus + Render-QA + E2E-Versuch |

**Real ausgeführt (Auszug, alle Exit 0 sofern nicht anders vermerkt):** `node --test` (13/13 PASS), 9 Security-Probes + DNR/WebRequest-Mocks, 184-URL-Korpus, `validate_audit.py`, Kontrastrechner, UI-/Manifest-/Doku-Checks, Reproduzierbarkeits-Experiment (FAIL), 7 Chromium-Renders, Lead-Probe. Details: [`security/…/Test-Ledger`](security/AUDIT_SECURITY.md), [`code/CODE_REVIEW.md`](code/CODE_REVIEW.md) §2, [`ux-release/UX_RELEASE.md`](ux-release/UX_RELEASE.md) §6.

**Grenzen (ehrlich):**
- **Kein echter Browser-E2E-Test** der Erweiterung. Chrome 155 (installiert) hat `--load-extension` als CLI-Option entfernt ([SeleniumBase-Issue #4053](https://github.com/seleniumbase/SeleniumBase/issues/4053)); der Ladeversuch scheiterte (`ERR_CONNECTION_REFUSED`, Extension nicht aktiv). Der CDP-Weg (`Extensions.loadUnpacked`) blieb in dieser Session ohne verwertbares Ergebnis (Hang) → `NOT_TESTED`. Firefox ist auf dem Host nicht installiert.
- Die Screenshots sind **statische Chromium-Renders simulierter Zustände** (belegen CSS/Layout/Kontrast, nicht das Navigationsverhalten).
- Keine Store-Einreichung, keine Signaturprüfung, kein Live-Netzwerk-Scan, keine SAST/SCA-Toolchain → als `NOT_TESTED`/`BLOCKED` ausgewiesen.

---

## 2. Release-Gate und Qualitätsstatus

### 2.1 VGT-100 (validierte Hauptmatrix)

| Status | Anzahl |
|---|---:|
| PASS | 29 |
| FAIL | 14 |
| NOT_TESTED | 3 |
| BLOCKED | 2 (VGT-056 Signatur/Provenienz, VGT-097 SAST/SCA-Fundabgleich) |
| NOT_APPLICABLE | 52 |
| **Summe** | **100** |

Anwendbar: 48; verifizierte Abdeckung 43/48 = **89,6 %**; Validierung: `validate_audit.py` Exit 0 („VALID STRUCTURE“ – Struktur, nicht Softwaresicherheit). **Release-Gate: BLOCKED.** Die unabhängige Code-Audit-Matrix (17 PASS / 21 FAIL / 6 NOT_TESTED / 56 N/A) ist eine ergänzende Zweitsicht mit anderem Zuschnitt; maßgeblich ist die validierte Security-Matrix.

### 2.2 Qualitätsklassifikation

**SILBER** — Grundfunktion/Happy Path funktioniert, wesentliche Fehler-, Sicherheits-, Integrations- und Evidenzpfade fehlen. Alle drei unabhängigen Prüfspuren kommen zum selben Ergebnis. Die in `Next.md:71` behauptete Stufe „PLATIN VGT SUPREME“ ist **durch die Evidenz widerlegt** (kein E2E, keine Zielplattform-, Performance-, Recovery- oder Store-Beweise; `SECURITY.md:3` und `README.md:62` schließen eine Zertifizierung selbst aus).

### 2.3 Release-Gate-Tabelle

| Gate | Urteil | Hauptgründe |
|---|---|---|
| **Chrome Web Store** | **BLOCKED** | Privacy-Policy/URL fehlt, Limited-Use-Disclosure für Browsing-Aktivität fehlt, keine Screenshots/Promo/Support/Homepage; Redirect-all-Policy-Risiko; DNR-Kernmuster nicht runtime-verifiziert |
| **Firefox / AMO** | **BLOCKED** | `web_accessible_resources` fehlt (Redirect gebrochen); `gecko.data_collection_permissions` fehlt; gecko-ID nutzt reservierte TLD `.example`; kein signiertes XPI / keine Listing-Assets |
| **Build/Release** | **BLOCKED** | ZIPs nicht reproduzierbar, keine Checksummen/Signatur/CI/Provenienz, Source-ZIP-Hygiene fehlerhaft, Legacy-Duplikate |
| **Dokumentation** | **BLOCKED** | 14 Widersprüche, fehlende referenzierte Architekturdatei, überzogene Claims |
| **Qualität/Lieferfähigkeit** | **SILBER** | siehe oben |

---

## 3. Die Release-Blocker (P0) im Detail

### B1 — Firefox: Schutz funktional gebrochen (`KRITISCH`)

`firefox/background.js:14` erzeugt `redirectUrl = moz-extension://…/guard.html?url=…`, aber `firefox/manifest.json:1-44` enthält **kein** `web_accessible_resources`. MDN ist eindeutig: *„If an extension wants to redirect a public (e.g., HTTPS) URL to an extension page, the extension's manifest.json file must contain a web_accessible_resources key that lists the URL for the extension page.”* ([MDN onBeforeRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest), [MDN WAR](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)).

**Wirkung:** Die Warnseite kann im ausgelieferten Firefox-Build nicht als Redirect-Ziel dienen. Je nach Browser-Fehlerbehandlung wird der Nutzer entweder auf eine Fehlerseite umgeleitet (Verfügbarkeit) oder die Anfrage läuft ungeschützt weiter (**Fail-open**). Laufzeitverhalten im echten Firefox: `NOT_TESTED` (kein Firefox auf dem Host) — die Manifest-Voraussetzung ist jedoch dokumentiert nicht erfüllt und damit ein harter Release-Blocker.

**Fix (P0, ~1 Zeile + Test):**
```json
"web_accessible_resources": [
  { "resources": ["guard.html"], "matches": ["http://*/*", "https://*/*"] }
]
```
Danach echter Firefox-Test über `about:debugging` (Testkatalog §8.3).

### B2 — Firefox/AMO: Einreichung blockiert (`P0`)

- `browser_specific_settings.gecko.data_collection_permissions` fehlt; laut MDN für neue AMO-Einreichungen seit 03.11.2025 Pflicht → Fix: `{"required": ["none"]}` (sofern keine Datenerhebung).
- gecko-ID `antipisher@visiongaia.example` nutzt die reservierte TLD `.example`; die ID ist dauerhaft → vor Einreichung echte Domain verwenden.
- Es gibt kein signiertes XPI, keine AMO-Listing-Assets, keinen Support-Kontakt.

### B3 — Chrome: POST-/Nicht-GET-Navigationen ungeschützt, Doku behauptet das Gegenteil (`KRITISCH für Produktversprechen`)

`chrome/background.js:34-38`: DNR-Regel gilt nur für `requestMethods: ["get"]`. **Jede Hauptdokument-Navigation per POST (z. B. auto-submittiertes Formular einer kompromittierten Seite) erreicht die Phishing-Seite ohne Guard.** `README.md:13` und `Next.md:27` bewerben genau das Gegenteil („POST-Schutz“). Der Code-Kommentar `chrome/background.js:1-3` behauptet sogar, die Regel sei „fail-closed … for ALL top-level HTTP(S) GET navigations“ und warnt gleichzeitig vor „POST navigation semantics“ — beides zusammen ist widersprüchlich.

**Fix-Optionen:** (a) kurzfristig Claim korrigieren und POST-Lücke dokumentieren; (b) mittelfristig Hybrid-Architektur (V2): High-Confidence-DNR-Blockregeln für alle Methoden + Content-Script-Banner/Interstitial, das auch nach POST-Navigation greift.

### B4 — Chrome: DNR-Kernmechanismus nicht browser-verifiziert (`P0`)

Der Preflight-Mechanismus hängt an einer ungewöhnlichen Konstruktion: `regexSubstitution: chrome.runtime.getURL('guard.html') + '#\\1'` (`chrome/background.js:27-40`), also ein DNR-Redirect über einen Scheme-Wechsel auf eine `chrome-extension://`-URL mit URL im Fragment. Die offizielle Chrome-Doku zeigt für Extension-Ziele ausschließlich `redirect.extensionPath`; dass `regexSubstitution` mit `chrome-extension://` + Fragment zuverlässig funktioniert, ist weder dokumentiert noch in dieser Session browser-verifiziert (`NOT_TESTED`). **Vor jeder Store-Einreichung in echtem Chrome testen** (Testkatalog §8.3); andernfalls Redesign auf dokumentierte Muster.

### B5 — Erkennungsqualität: FP-/FN-Krise (`KRITISCH für Produktnutzen`)

| Korpus | Ergebnis | Bewertung |
|---|---|---|
| Code-Audit, 184 adversarialer URLs | **33,7 % FN** (33/98), **32,9 % FP** (27/82); 124/184 = 67,4 % pass | Für ein Sicherheitsprodukt nicht tragbar |
| Security-Audit, synthetische Angriffe | 37/43 erkannt = **14 % FN**; 18/553 Benign = **3,3 % FP** | Besserer Korpus, aber weiterhin über jedem vertretbaren Gate |
| Lead-Korpus (offizielle Regionaldomains) | **26/26 fälschlich blockiert** (Google JP/KR/MX/SG, Amazon SE/NL/PL/SG/AE/MX/TR, Apple CN, Microsoft JP, ING NL/BE/LU, Chase UK, Visa DE/JP/UK/FR, HSBC JP, Santander MX, GLS Bank) | Vertrauenskiller: echte Banken/Behörden werden abgewehrt |
| Lead-Korpus (Phishing-Varianten) | **38/40 unerkannt** (u. a. `paypa1-login.com`, `paypalsupport.com`, `secure-paypa1.com`, `g00gle-login.com`, `pаypal-login.com`, `arnazon.com`, `netflixbilling.com`, `appleid-apple.com`, `paypalcom-verify.com`) | Kern-Angriffsklassen (Bait-Konkatenation, Diakritika, Kurzmarken, 2-Edit) fallen durch |

**Systematische Ursachen:**
1. **Unvollständige offizielle Domainbasis:** exakte Marken-Baselabels werden auf *jeder* fremden TLD geblockt (`detector.js:286-299`), solange die Domain nicht in `sites.js` steht → echte ccTLDs/Regionaldomains werden zu False Positives.
2. **Bait-Erkennung nur bei Bindestrich-Segmenten / benachbarten Labels** (`detector.js:302-320`): `paypalsupport.com`, `paypa1-login.com`, `microsoft365-login.com` umgehen sie; deutsche/krypto Baitwörter (`konto`, `sicherheit`, `zoll`, `tracking`, `airdrop`) fehlen komplett.
3. **Diakritische IDN-Homographen** (`páypal.com`) werden nicht erkannt, weil Check 1 (`detector.js:279`) ein Zeichen als Schlüssel der Homoglyph-Tabelle verlangt; nach NFKD ist `á` = `a` + Markierung und `a` ist ASCII.
4. **Kurzmarken** (`brand.length >= 5`-Gate in `detector.js:323`) sind von Typosquat-Erkennung ausgeschlossen: `vlsa.com`, `v1sa.com`, `wlse.com`, `ubr.com`, `gmai.com`,
   `dhl-tracking.com`.
5. **Fehlende Marken:** Gmail, Azure, Disney+, Alipay, Coinbase-Wallet u. a. fehlen; generische Wörter als Marke (`box`, `target`, `signal`, `hermes`) kollidieren mit legitimen Fremdseiten (`hermes.com` = Luxusmarke, `elster.com` = Honeywell) und werden geblockt.
6. **PSL nur heuristisch** (`detector.js:175-189`): keine echte Public-Suffix-List; Multi-Tenant-Liste lückenhaft.

**Konsequenz:** Jeder FP kostet Vertrauen und erzeugt Abschaltungen; jeder FN ist ein potenziell erfolgreicher Angriff. Beide Raten sind vor jeder Beta auf ein definiertes, gemessenes Gate zu bringen (V2 §11: FPR/TPR-Budget, Tranco-FP-Korpus, Evasions-Suite).

### B6 — Stiller Fail-open bei Initialisierungsfehlern (`HOCH`)

`configure()` (`chrome/background.js:14-41,104`) fängt Fehler nur mit `console.error`; schlägt z. B. `isRegexSupported` fehl oder ist die Installation unvollständig, existiert **keine DNR-Regel** — die Extension zeigt im Popup aber weiter „Vorabprüfung aktiv“. Der Mock reproduziert das (`dynamicRules=0`, Konsole: „DNR regex unsupported“). Für ein Schutzprodukt ist das ein stiller Blindspot; es fehlen Statusanzeige, Degraded-Mode und ein Audit-Event.

### B7 — Chrome: lange URLs nie freigebbar (`HOCH`)

`allowOne()` (`chrome/background.js:48-49`) bricht bei Regex > 1.900 Zeichen ab. Da der Guard für **jede** Navigation durchlaufen wird, bleibt jede harmlose URL > ~1.900 Zeichen (OAuth-Authorize-URLs, Tracking-/Redirect-URLs) auf der Schutzseite hängen („Adresse zu lang für eine einmalige Freigabe“). Mock-belegt; Availability-Blocker.

### B8 — Chrome-Store-Gate (`P0`)

Keine gehostete Privacy-Policy/URL, keine Limited-Use-Disclosure für Browsing-Aktivität (die Extension liest jede Navigations-URL), keine Screenshots/Promo-Assets, kein Support-Kontakt/Homepage, keine Kategorie. CWS: fehlende Screenshots ⇒ Rejection; „Anti-Phishing-Extension ohne erkennbaren Schutz“ ist zusätzlich ein Policy-Risiko. Zusätzlich: `tabs`-Permission (`chrome/manifest.json:9-14`) erzeugt die Warnung „Read your browsing history“ und ist vermeidbar (Sender-/Tab-Bindung über `sender.tab` prüfen).

### B9 — Build/Release nicht reproduzierbar, keine Provenienz (`P0`)

- `build.py:6-11` nutzt `shutil.copyfile` (setzt neue mtime), `zipfile.write` übernimmt den Kopier-Zeitstempel → **zwei Builds erzeugen unterschiedliche ZIP-Hashes** (unabhängig von Code- und UX-Audit reproduziert).
- Kein `SOURCE_DATE_EPOCH`, keine deterministischen ZipInfo-Zeitstempel, keine Checksummen/Signatur.
- `build.py:27-28,35` erzeugt byteidentische Legacy-Duplikate (`VGT-DomainGuard-*`) → Verwirrung, doppelte Artefakte.
- Source-ZIP-Prefix = Checkout-Ordnername (nicht reproduzierbar), `build.py:32-34` packt **alle** Dateien inkl. `audit/` und `.tmp` (keine Allowlist).
- Kein Git-Repo, kein `package.json`, kein CHANGELOG, keine CI, kein Lint/SAST, keine Tests im Build erzwungen.
- `build_sites.py:3` docstring sagt „140+“, Datei heißt `sites-100.json`, tatsächlich 165 Marken — Daten-/Doku-Drift.

### B10 — Dokumentationsintegrität (`HOCH`)

25 Behauptungen geprüft: **10 CONFIRMED, 14 CONFLICT, 1 NOT_VERIFIABLE**. Widerlegt u. a.:
- `Next.md:71` „**PLATIN VGT SUPREME**“; Code-Header „Diamant VGT Supreme Quality Gate“ (`detector.js:4`, `guard.css:3`) — ohne E2E/Performance/Visuelle QA.
- `README.md:10`, `Next.md:23` „**lückenloser Subdomain-Schutz**“ — 6 Gegenbeispiele (office/target/medium/zoom/notion/line.attacker.com) + FPs.
- `README.md:13`, `Next.md:27` „**POST-Schutz**“ — DNR prüft nur GET.
- `README.md:15`, `Next.md:28` „**Manifest-Fingerprinting geschlossen**“ — `guard.html` bleibt als WAR für alle HTTP(S)-Origins sichtbar (notwendiges Restrisiko des Redirects, aber nicht „geschlossen“).
- `Next.md:31` „**reproduzierbare Build-Artefakte**“ — widerlegt.
- `Next.md:13,39` zitieren `ARCHITECTURE_AND_SECURITY_REVIEW.md` — **Datei existiert nicht**.
- `Next.md:11` „SOURCE_IDENTITY_CONFIRMED“ — kein Git/Commit/Dirty-State; Versionen uneinheitlich (`0.1.0` Manifest vs. `0.1.0-alpha` ZIP/Next vs. „0.1 Alpha“ UI).
- `README.md:14` „GLASS 2100 inkl. adaptiver Kontraste/A11y“ — 7 WCAG-AA-Kontrast-FAILs, Fokusring im Popup unterdrückt, kein Light-/System-Theme.
- `SECURITY.md:9` verweist auf „einen privaten Kanal“ ohne Adresse/`security.txt`.

---

## 4. Findings nach Disziplin

### 4.1 Security (VGT-100) — positives Bild bei den Primitive, Schwächen in Architektur/Prozess

**Positiv verifiziert:** 0 Netzwerk-/Telemetrie-/Fetch-Sinks; 0 XSS-/DOM-Sinks (ausschließlich `textContent`); 0 Secrets; Allow-once-Messaging doppelt gebunden (`sender.url` + `tabs.get(tabId).url`, 46/46 Mock-Assertions); Session-Allow-Regeln tab- und URL-exakt mit Priority 10 und Cleanup bei Commit/Tab-Close/Startup; Punycode/Unicode 165/165 + 480/480 IDN-Parität; Brand-DB konsistent (165 Marken, 257 Domains, keine Duplikate, alle offiziellen Hosts safe); Chrome-WAR korrekt für DNR; Firefox-MV3 `background.scripts` und `webRequestBlocking` zulässig; DE/EN-Fehlertexte ohne interne Pfade.

**Befunde (11 Einzel, 5 Chains, 0 Critical/High, 3 Medium, 6 Low, 2 Info):** GET-only-Lücke, stilles Fail-open, Allow-once-Lifecycle ohne TTL/Races, Chrome/Firefox-Parität (WAR, POST), Build-/Update-Provenienz fehlt, keine Audit-Events, FN/FP-Bilanz, begrenztes Least-Privilege, Doku-Integrität. Chains: FN + Safe-Auto-Navigation ⇒ stiller Phishing-Besuch; Konfigfehler + fehlende Statusanzeige ⇒ Blindspot; POST-Lücke + FN ⇒ preflight-freie Zustellung; Build-/DB-Provenienz ⇒ manipulierbares Update; WAR-Clickjacking ⇒ **durch Tab-Bindung abgewehrt** (Mock-verifiziert).

### 4.2 Architektur: Chrome (MV3/DNR)

**Ablauf:** DNR-Regel `^(https?://.+)$` (main_frame, GET) → Redirect auf `guard.html#<url>` → Guard klassifiziert lokal → bei „safe“ automatisch per `allow-once` + `location.replace` weiter; bei „block“ Interstitial mit einmaliger Freigabe.

**Bewertung:** Der Mechanismus ist ein mutiger Technik-Prototyp, aber für den Alltag ungeeignet: (a) **jede** GET-Navigation läuft über die Extension-Seite (Latenz, History-/Referer-Verhalten, OAuth-/Fragment-Risiken); (b) POST bleibt ungeprüft; (c) Fragment/Hash geht durch DNR-Netzwerk-URL verloren (statisch belegt, Runtime `NOT_TESTED`); (d) Long-URL-Blocker; (e) Fail-open bei Konfigfehler; (f) WAR-Exposure aller Origins; (g) Store-Review-Risiko durch Redirect-all. Zusätzlich: `strictMode=false` bedeutet bewusst „nur best-effort“ — das sollte klar als „Schutz reduziert“ kommuniziert und im Status sichtbar sein.

### 4.3 Architektur: Firefox (MV3/webRequestBlocking)

Der Blocking-Listener fängt **alle** Methoden inkl. POST ab (`firefox/background.js:17-21` ohne Methodenfilter) und wandelt eine blockierte POST-Navigation beim Fortfahren in ein GET um → **Formulardatenverlust**; README:42 behauptet „POST vollständig nativ unberührt“ (falsch). Zusätzlich: fehlendes WAR (B1), keine `webNavigation`-Bereinigung des Bypass (Einträge bis Tab-Close), `strictMode` wird ignoriert (Popup-Toggle wirkt auf Firefox nicht), kein Browser-E2E.

### 4.4 UX, Accessibility, Design

**Positiv:** klare Interstitial-Hierarchie (Befund → Original → Aktionen), ruhige Mineral-/Salbeigrün-Materialität, keine dekorativen Raster, `@supports`-Blur-Fallback, `prefers-reduced-transparency`/`-motion`/`forced-colors` im Guard, 3px-Fokusring, ehrliche Mikrocopy in Teilen, KEINE Dark-Patterns.

**P1-Befunde (real gerendert, Chromium 155):**
1. **`hidden`-Bug:** `.danger-panel { display:flex }` (`guard.css:135-140`) überschreibt das `hidden`-Attribut (`guard.html:26`); im Skip-/Invalid-Zustand zeigt die Seite **leere Gefahrenkarten und funktionslose Buttons** (Screenshot [`lead/screenshots/guard-invalid.png`](lead/screenshots/guard-invalid.png); UX-Report [`ux-release/screenshots/guard-invalid-1280x900.png`](ux-release/screenshots/guard-invalid-1280x900.png)). Fix: `[hidden] { display: none !important; }` oder `.danger-panel:not([hidden])`.
2. **7 WCAG-AA-Kontrast-FAILs:** Token `--vgt-text-muted #6b857f` erreicht nur 4,29–4,33:1 (< 4,5:1) bei Kicker/Footer/Popup-Section-Titles; Fix `#7f9a93` (≥ 5:1).
3. **Fokusring im Popup unterdrückt:** `input{outline:none}` (Spezifität 0,1,1) schlägt `:where(...):focus-visible` (0,1,0); real gemessen `outlineStyle=none` → WCAG 2.4.11-Risiko.
4. **Popup-Overflow bei 200 % Zoom:** fixe `body{width:350px}` → `scrollWidth 350 > 175` (Screenshot im UX-Report).
5. **Zustände/Onboarding:** kein Ladezustand, kein Schutzstatus („Ist der Schutz aktiv?“), kein Fehlalarm-/Rückgewinnungspfad, kein Onboarding, Engine-Fehler ⇒ stumme Seite, kein dekodierter Host/Zeichen-Diff (zeigt `xn--…` statt Unicode + Skeleton-Vergleich), Confirm-Warnung ohne `role="alertdialog"`/Fokus-Transfer/Escape, `aria-live="assertive"` auf großem Button-Panel.
6. **Copy/i18n:** Jargon („webNavigation“, „best-effort“), nur Deutsch, keine Lokalisierung; Icon „Schild mit Häkchen“ semantisch falsch für eine Warnfunktion; Blur liegt auf glattem Gradient (kein sichtbarer Materialeffekt), kein Signature-Element; Popup-Token dupliziert statt Design-System-CSS.

### 4.5 Datenschutz, Recht, Store

- **Positiv:** keine Telemetrie, keine Cloud, keine Remote-Assets, kein `fetch`; nur Blockzähler + Setting lokal; `textContent`-only; AGPLv3-Text vollständig hinterlegt.
- **Zu klären:** CWS Limited-Use/Privacy-Policy-Pflicht (Browsing-Aktivität!), ePrivacy/TDDDG § 25 (lokale Verarbeitung), DSGVO-Folgenabschätzung bei späterem Feedback-/Meldekanal, Marken-/Namensrecht der 165 Marken (nominative Nutzung), Safe-Browsing-/Web-Risk-ToS (kommerzielle Nutzung ohne separate Google-Vereinbarung unzulässig), CRA-Pflichten bei EU-Vertrieb, Security-Kontakt/`security.txt`.

### 4.6 Build, Release, Dokumentation

Siehe B9/B10. Zusätzlich: Tests laufen teils gegen Build-Kopien statt `shared/` (Schein-Pass-Risiko bei vergessener Sync); `build.py` ruft `build_sites.py` nicht auf (Daten-Drift möglich); keine Tests für Manifest/WAR, lange URLs, POST, FP-Korpus, Fail-open, Race/TTL; `node --test tests` scheitert unter PowerShell (Glob-Expansion), dokumentierter Befehl ist shellabhängig.

### 4.7 Markendatenbank (Datenqualität)

165 Marken / 257 Domains (bestätigt), keine Duplikate — aber:
- 34 Marken mit Brand < 5 Zeichen sind aus der Typosquat-Erkennung ausgeschlossen (Sicherheitslücke).
- 6 generische Wörter sind als Subdomain ausgenommen (`office`, `target`, `medium`, `zoom`, `notion`, `line`) → genau dort greift Subdomain-Phishing nicht.
- Offizielle ccTLDs/Regionaldomains systematisch unvollständig (siehe B5).
- Fehlende Hochrisiko-Marken: Gmail, Microsoft Azure, Disney+, Alipay, Coinbase Wallet u. a.
- Keine deutschen Bait-Wörter, keine TLD-Risikogewichtung, keine Marken-Kategorien/Gewichte, keine Provenienz/Review-Prozess, kein FP-Meldekanal.
- `google.github.io`/`microsoft.github.io`/`facebook.github.io` als „offizielle Domains“ gepflegt — funktioniert, ist aber konzeptionell Datenpflege per Sonderfall.

---

## 5. Was fehlt für ein revolutionäres System (Gap-Analyse)

| Fähigkeit | Heute | Für „revolutionär“ nötig | Wirkung |
|---|---|---|---|
| **Normalisierung** | Eigenbau-Homoglyph-Tabelle (~90 Zeichen), PSL-Heuristik | Vollständige **UTS-39/UTS-46**-Skelette (build-time generiert), echte **PSL** (komprimiert), Bidi-/Invisible-Handling, Mixed-Script-Erkennung | Schließt die größte IDN-FN-Klasse, senkt FPs |
| **Markenmodell** | 165 Einträge, Brand + Domainliste | **Brand-Impersonation-Graph**: Marke, Aliase, offizielle Domains je Land/Region, Kategorien, Gewichte, TLD-Erwartungen, Pflege-Workflow, 2-Augen-Review, FP-Portal | FP-Krise lösen, DE/EU-Abdeckung (Sparkassen, Behörden, Versicherer, Paketdienste) |
| **Erkennung** | Exakt-Match, DL≤1, Bait-Segmente | Familien-Erkennung: DL≤2 mit Gewichten, Bitsquatting, Combosquatting, Homophone, Keyboard-Nachbarn, TLD-Swap, IDN-Diakritika, **gewichtetem Scoring** statt Binärentscheidung | 33,7 % FN → Ziel < 3 % bei FPR-Gate |
| **Content-Signale** | keine | Optional lokal: Formular-/Login-Erkennung, Titel-/Logo-/Favicon-pHash, Marken-Text auf fremder Domain, Redirect-/Shortener-Ketten | Erfasst Angriffe ohne Domainähnlichkeit |
| **Browser-Integration** | Chrome: globaler Redirect-all; Firefox: gebrochen | **Hybrid**: High-Confidence-DNR-Blockregeln (alle Methoden) + Content-Script-Banner/Interstitial; Firefox webRequestBlocking mit WAR; kein globaler Redirect | Store-Fähigkeit, Performance, OAuth/History, POST |
| **Entscheidungslogik** | Binär block/safe, `safe` redirected automatisch | 3 Stufen (block/warn/info) mit kalibrierten Schwellen, sichtbarer Begründung, Nutzer-Allowlist, „einmal fortfahren“ mit Reibung | Weniger Alert-Fatigue, mehr Vertrauen |
| **Updates** | nur Store-Updates, keine Feed-/Signaturlogik | **Ed25519-signierte** Daten-Bundles + Manifest + Anti-Rollback + Transparenz-Log, Offline-Fallback | Aktualität + Integrität + CRA-Fähigkeit |
| **Qualität** | 13 Happy-Path-Tests, kein CI | Benchmark-Korpora (Tranco-FP, PhishTank/OpenPhish-Positive), TPR/FPR-Gates, Evasions-Suite, Browser-E2E in CI, Reproducible Builds | Behauptungen werden belegbar |
| **UX** | schönes Interstitial, kein Status/Onboarding | „Domain-Autopsie“: registrierte Domain, Unicode-Reveal, Skeleton-Diff, Marke + Distanz + offizielle Alternativen; Schutzstatus; FP-Rückgewinnung; Light/Dark; i18n; Onboarding | Aus Warnung wird erklärbarer Schutz |
| **Vertrauen/Recht** | AGPL, ehrliche Teile der README | Privacy-Policy, Limited-Use-Disclosure, security.txt, CRA-/DSGVO-Prozess, Store-Assets, Markenrechtsprüfung | Store-/Marktfähigkeit |

**Die revolutionäre Idee:** Nicht „noch eine Blockliste“, sondern ein **erklärbarer, lokal-first arbeitender Domain-Trust-Layer für den deutschsprachigen/EU-Raum** — mit nachweisbarer Erkennungsqualität, signierten transparenten Updates, einer Domain-Autopsie statt Schreck-Interstitial und einer Datenbasis, die Sparkassen/Behörden/Versicherer genauso ernst nimmt wie Google/Amazon. Das ist ein realer Differenzierer gegenüber Google Safe Browsing (Cloud, intransparent), Netcraft/Bitdefender (Cloud, Abo) und Browser-Bordmitteln (keine Marken-Tiefe, keine Erklärbarkeit).

---

## 6. V2-Blueprint (Kurzfassung — Details in [`product/V2_BLUEPRINT.md`](product/V2_BLUEPRINT.md))

### 6.1 Vision & Positionierung

„**Antipisher** — der erklärbare Domain-Schutz für Europa. Lokal. Offen. Nachweisbar.“ Privacy-first (keine Cloud-Pflicht), offen (AGPL), ehrlich (keine „100 %“-Versprechen), erklärt jede Entscheidung, aktualisiert sich signiert und transparent.

### 6.2 Zielarchitektur (lokal-first, mehrschichtig)

```text
[URL] → L0 Normalisierung (IDNA/UTS-46, PSL, Bidi/Invisible, registrable Domain)
      → L1 Brand-Impersonation-Graph (Marke, Aliase, official domains, Kategorien, TLD-Erwartung)
      → L2 Familien-Erkennung + gewichtetes Scoring (DL≤2, Bitsquat, Combosquat, Homophone,
           Keyboard, IDN-Confusables, Bait DE/EN, Kurzmarken)
      → L3 Redirect-/Shortener-Ketten (optionale Netzwerkebene mit Consent)
      → L4 Content-/Formular-/Visual-Signale (lokal: Formular, Titel, Favicon-pHash)
      → L5 Decision Engine (block/warn/info + Reason-Codes + Official-Alternative)
      → UX: Domain-Autopsie / Banner / Interstitial / Allowlist / Report
Update: ed25519-signiertes Daten-Bundle + Manifest + Anti-Rollback + Transparenz-Log
```

### 6.3 Erkennungskern v2

- **UTS-39-Skelette** aus offizieller `confusables.txt` (Build-Zeit), Mixed-Script-/Bidi-Erkennung, alle IDN-Formen inkl. Diakritika.
- **Echte PSL** (kompakt eingebettet) für korrekte registrierbare Domain, Multi-Tenant-Suffixe und ccTLD-Sonderfälle.
- **Familien + Scoring:** `score = Σ Gewicht(Familie) × Konfidenz × Markenpriorität`, Schwellen: `≥ block`, `≥ warn`, sonst info; jede Entscheidung mit Reason-Code und nachvollziehbarer Herleitung. Kalibrierung gegen Benchmark (TPR/FPR), nicht Bauchgefühl.
- **Datenmodell v2:** Marke, Aliase, offizielle Domains (Land/Region), TLD-Erwartungen, Kategorie/Priorität, Quellen + Reviewdatum + Reviewer; Generator validiert Hostnamen/PSL/IDNA und erzeugt versioniertes Bundle.

### 6.4 Browser-Integration (Hybrid statt Global-Redirect)

- **Chrome:** keine Redirect-all-Regel. Stattdessen (a) statische/dynamische **DNR-Blockregeln** für hochsichere, vorab generierte Known-Bad-Domains (alle Methoden, 30k statische + 5k dynamic Limits, 1k Regex-Limit beachten); (b) **Content-Script** ab `document_start` für Heuristik-Treffer: Warnbanner/Overlay vor Eingaben, optional Interstitial; (c) `webNavigation` für Status/Feedback. Ergebnis: kein Eingriff in jede Navigation, POST abgedeckt, OAuth/History/Fragmente unangetastet.
- **Firefox:** `webRequestBlocking` mit korrektem WAR beibehalten (stärker als Chrome), gleiche Warn-UI; Methodenfilter + klare Regeln für POST (nie umschreiben, nur blockieren/warnen ohne Datenverlust).
- **Permissions:** `tabs` entfernen, wo `sender.tab` genügt; Host-Permissions begründen; WAR nur auf das Minimum.

### 6.5 Signierte Updates & Transparenz

Daten-Bundle (JSON) mit `version`, `minEngine`, `issuedAt`, `expiresAt`, Ed25519-Signatur; Client prüft Signatur, Monotonie (Anti-Rollback) und Ablauf; Update nur Daten, kein Remote-Code (MV3-konform); optionaler Transparenz-Log (Merkle-Root) für Community-Prüfbarkeit; Offline-Fallback mit sichtbarem „Datenstand“. Schlüsselrotation dokumentiert; Build/Release mit Reproducible-Builds + Checksums + SBOM.

### 6.6 UX: Domain-Autopsie statt Schreckmoment

- Ruhige 3-Stufen-Kommunikation: **Block** (hohe Konfidenz), **Warnung** (mittlere), **Info** (niedrige).
- „Domain-Autopsie“: registrierbare Domain, Unicode-dekodierte Anzeige (`xn--pypal-4ve.com` → `pаypal.com`), Skeleton-Vergleich (`pаypal` → `paypal`), Marke + offizielle Domain + Distanz + Grund; primärer CTA = offizielle Seite; sekundär = zurück; tertiär = „einmal fortfahren“ mit Reibung.
- Schutzstatus sichtbar (aktiv/degraded/aus), Onboarding beim Erststart, dauerhafte Allowlist + „Fehlalarm melden“ (ohne Telemetrie, z. B. Copy/JSON-Export), Light/Dark/System, i18n DE/EN, WCAG 2.2 AA.

### 6.7 Datenpflege & FP/FN-Feedback

Kuratierter Prozess mit 2-Augen-Review, Quartals-Review, Marken-Claim-Workflow, FP-Feedback-Loop (lokal + optional issue-basiert), Triage-SLA, Benchmark-Gate in CI. Zielbild Beta: ~300 DE/EU-Marken + globale Top-100, 100 % der offiziellen Regionaldomains abgedeckt.

### 6.8 Benchmark, Test & Evasion

Korpora: Tranco (FP-Negative), PhishTank/OpenPhish/URLhaus (Positive), eigene kuratierte DE/EU-Fälle, historische Kampagnen. Metriken: TPR, FPR, Precision, p95-Latenz, Kaltstart, Speicher; Gates z. B. FPR < 0,5 % auf Tranco-Stichprobe, TPR > 95 % auf Positiv-Korpus, p95 < 2 ms (Werte vorläufig, messen!). Evasions-Suite (Diakritika, Bait-Konkatenation, Kurzmarken, 2-Edit, TLD-Swap, Bitsquat, IDN, Percent-Encoding, userinfo, Subdomain-Ketten) als Release-Blocker; Browser-E2E (Chrome+Firefox) in CI; Reproducible Builds.

### 6.9 Roadmap & Aufwand (aus Blueprint, ±50 %)

| Phase | Inhalt | Aufwand |
|---|---|---|
| **Phase 0 — „0.2 Ehrlichkeit & Baseline“** | Claims korrigieren, Firefox-WAR/AMO-Fix, Chrome-Redirect-All entschärfen/opt-in, FP-Sofortfix, Benchmark-Gerüst, CI, Reproducible Builds | 3–4 Personenwochen |
| **Phase 1 — „Alpha→Beta-Kern“** | UTS-39/46 + PSL, Brand-Impersonation-Graph v2 (~300 DE-Marken), Familien + Scoring, Hybrid-Integration, FP-/FN-Korpora, Browser-E2E | 14–16 PW |
| **Phase 2 — „Beta 0.9: Update, Vertrauen, Store“** | signierter Feed + Rollback + Transparenz, Privacy/Consent/DPIA, FP-Portal, CWS/AMO-Einreichung, Onboarding/i18n | 18–24 PW |
| **Phase 3 — „1.0“** | Content-/Favicon-Signale, optionale On-Demand-Cloud (Consent), CT-/Domain-Age-Backend, Enterprise, CRA-Fit | 20–28 PW |
| **Summe** | Alpha→Beta ≈ 18–20 PW; Beta→1.0 ≈ 38–50 PW | Basis: 1 FTE Dev + 0,3 FTE Security/Privacy + Markenpflege |

### 6.10 Differenzierung

1. **DE/EU-Markenabdeckung** jenseits der Browser-Top-500 (Sparkassen, Behörden, Versicherer, Paketdienste). 2. **Erklärbarkeit** (Domain-Autopsie, Reason-Codes). 3. **Lokal-first ohne Cloud-Zwang**. 4. **Signierte, transparente Updates**. 5. **Open Source/AGPL + EU-Datenhaltung + kein Datenverkauf**. 6. **Ehrliche Kommunikation** statt „100 % Schutz“.

---

## 7. Prioritäten und Quick Wins

### 7.1 Sofort (72 h) — konkrete, patchfähige Schritte (nicht ausgeführt, da AUDIT_ONLY)

1. **Firefox-WAR ergänzen** (`firefox/manifest.json`) + `gecko.data_collection_permissions: {required:["none"]}` + gecko-ID mit echter Domain; echter Firefox-Test.
2. **Chrome-Redirect-All entschärfen:** Default = nur bei Treffer warnen/blocken (DNR-Blockregeln + Content-Script); experimentellen Streng-Modus nur als Opt-in mit Consent.
3. **Claims korrigieren:** `Next.md` (PLATIN, lückenlos, POST, Fingerprinting, reproduzierbar, fehlende Architekturdatei), `README.md` (POST, Fingerprinting, Glass-A11y), Version vereinheitlichen; `ARCHITECTURE_AND_SECURITY_REVIEW.md` neu schreiben oder Referenzen entfernen.
4. **FP-Sofortfix:** offizielle ccTLD-/Regionaldomains der 165 Marken ergänzen; generische Markenwörter nicht mehr als Base-Label blocken (nur warnen); Root-Domains von Multi-Tenant-Plattformen (github.io, vercel.app, netlify.app) freigeben; harte Markenkollisionen (hermes.com, elster.com) manuell behandeln.
5. **`hidden`-Bug fixen:** `[hidden]{display:none!important}` + `guard.js`-Skip-Zustand ohne Dead Buttons; danach Render-Review.
6. **A11y-Fixe:** `--vgt-text-muted: #7f9a93`; Popup-`outline:none` entfernen; `body{width:min(350px,100vw)}`; `prefers-reduced-transparency/-motion/forced-colors` in Popup; Confirm als `role="alertdialog"` mit Fokus/Escape.
7. **Lange-URL-Fallback** (tabgebundene Allow-Regel ohne exakte URL-Regex oder sichtbarer „URL kopieren/öffnen“-Pfad).
8. **Fail-open sichtbar machen:** bei `configure()`-Fehler Status im Popup auf „Schutz eingeschränkt“, Degraded-Mode + Audit-Event; UI darf nicht weiter „aktiv“ behaupten.
9. **Build deterministisch:** `copy2`, feste ZipInfo-Zeitstempel/SOURCE_DATE_EPOCH, Source-ZIP-Allowlist (ohne `audit/`, `.tmp`), Legacy-Duplikate entfernen, SHA256SUMS, `build_sites.py` in Build integrieren, Version aus einer Quelle.
10. **CI + Tests:** Git init, `node --test`, Korpus-/FP-Regression, Manifest/WAR-Test, Long-URL-/POST-/Fail-open-/TTL-Tests, `node --check`, `web-ext lint` (Firefox), Reproducible-Build-Check.

### 7.2 P1 (Beta-Vorbereitung)

UTS-39/46 + echte PSL; Brand-Impersonation-Graph + 300 DE/EU-Marken; Familien + gewichtetes Scoring (inkl. Diakritika, Bait-Konkatenation, Kurzmarken, 2-Edit, Bitsquat/Combosquat/TLD-Swap); Hybrid-Integration + Content-Script; FP-/FN-Portal; Benchmark- und Evasions-Suite in CI; signierter Feed + Rollback; Privacy-Policy/Limited-Use/Consent; Store-Assets; Domain-Autopsie-UX.

### 7.3 P2 (1.0+)

Favicon-/Logo-pHash, optionaler Cloud-Scan mit Consent (EU-Hosting), CT-/Domain-Age-Backend, Enterprise-Managed-Policies/Reporting, öffentliches Benchmark, CRA-/SBOM-Prozess, Firefox „Recommended“, Safari/Mobile prüfen.

---

## 8. Test- und Beweisführung

### 8.1 Wichtigste real ausgeführte Checks

| Check | Befehl/Werkzeug | Ergebnis |
|---|---|---|
| Repo-Tests | `node --test tests/detector.test.cjs tests/chrome-worker.test.cjs tests/firefox-worker.test.cjs` | **13/13 PASS**, Exit 0 |
| Adversarialer Korpus | `node audit/code/run_corpus.cjs` | 124/184 pass; FN 33/98; FP 27/82; Exit 0 |
| Lead-Korpus | `node audit/lead/lead_probe.cjs` | 26/26 offizielle FP, 38/40 FN; Exit 0 |
| VGT-100-Matrix | `python …/validate_audit.py audit/security/AUDIT_MATRIX.json` | „VALID STRUCTURE“, Exit 0; Gate BLOCKED |
| Security-Probes (DNR/WebRequest/Guard/Fuzz) | `audit/security/probes/run_all.ps1` u. a. | 12 Test-Runs, Exit 0; 16 PASS/5 WARN/5 FAIL (Mock) |
| Performance | `audit/code/run_corpus.cjs` | Median 0,506 ms; p95 2,580 ms; p99 6,02 ms; Kaltstart 0,995 ms → „<1 ms“ nur als Median |
| Build-Reproduzierbarkeit | Nachbau `build.py` zweimal | **FAIL** (unterschiedliche ZIP-SHA256) |
| Kontrast | `audit/ux-release/checks/contrast_check.py` | 34/41 PASS, **7 FAIL** (< 4,5:1) |
| UI-/A11y-/Doku-/Manifest-Checks | `ui_static_check.py`, `docs_identity_check.py`, `manifest_check.py` | 33 UI-FAILs, 14 Doku-Widersprüche, 50 Release-Findings |
| Chromium-Renders | `render_harness.py` | 7 Screenshots + Layout-/Fokus-Metriken (statisch) |
| Browser-E2E | Chrome 155 headless / CDP | **NOT_TESTED** (Chrome-CLI-Flag entfernt; CDP-Hang; kein Firefox) |

### 8.2 Screenshots (Auszug)

- Block-Interstitial (korrekt gerendert): [`lead/screenshots/guard-block.png`](lead/screenshots/guard-block.png)
- `hidden`-Bug im Invalid-/Skip-Zustand (leere Karten sichtbar): [`lead/screenshots/guard-invalid.png`](lead/screenshots/guard-invalid.png)
- Popup (Desktop): [`lead/screenshots/popup.png`](lead/screenshots/popup.png)
- Weitere reale Chromium-Renders + Zoom-/Mobile-Simulation: [`ux-release/screenshots/`](ux-release/screenshots)

### 8.3 Nachzuholender Browser-E2E-Testkatalog (manuell, ~45–60 Min)

**Chrome** (`chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ → `chrome/`):
1. Harmlose Seite (z. B. `example.com`) → kein sichtbarer Guard-Flash, kein Doppel-Request, korrekte History/Referer.
2. `https://paypa1.com/` → Warnseite; „Offizielle Seite öffnen“ → paypal.com; „Zurück“; „einmal fortfahren“ → Ziel lädt; erneuter Aufruf → wieder Warnung.
3. URL mit Fragment (`https://example.com/#/route`) → Fragment bleibt nach Freigabe erhalten?
4. POST-Formular (lokal) → Verhalten dokumentieren (erwartete Lücke).
5. URL > 1.900 Zeichen → Verhalten/Freigabe.
6. Redirect-Kette und `target=_blank`/neuer Tab; Service-Worker-Neustart (`chrome://serviceworker-internals` → Stop) → nächste Navigation.
7. Popup: Toggle, Testfeld, Zähler, Fehlerzustand bei deaktivierter Engine.
8. Umlaute/IDN-Domains (`xn--…`), lange Query-Strings, Back/Forward.
**Firefox** (`about:debugging` → „Temporäres Add-on laden“ → `firefox/manifest.json`): dieselbe Matrix + Browser-Konsole auf Redirect-Fehler prüfen (WAR).

---

## 9. Offene Entscheidungen (an den Nutzer)

1. **Nächster Schritt:** P0-Härtung jetzt umsetzen (Patch) oder zuerst V2-Phase 1 (Engine + Datenmodell) starten?
2. **Produktstrategie:** Reines FOSS (AGPL) vs. Open-Core/Enterprise? → beeinflusst Backend, Safe-Browsing-ToS, CRA.
3. **Backend ja/nein:** signierter Feed + FP-Portal brauchen ein EU-Backend (Betrieb, Budget, AVV) — oder rein offline mit Store-Updates bleiben?
4. **Chrome-Strategie:** Hybrid sofort (empfohlen) oder globalen Redirect als experimentelle Opt-in-Funktion behalten?
5. **Store-Timing:** erst privater Beta-/Direktvertrieb + manueller Test, dann CWS/AMO?
6. **Marken-Datenverantwortung:** Wer pflegt/reviewt die Marken (2-Augen-Prinzip), welche Quellen dürfen genutzt werden?
7. **Rechtliche Prüfung:** ePrivacy/TDDDG § 25, DSGVO/DPIA, Markenrecht, Safe-Browsing-/Feed-ToS, CRA — wer beauftragt?
8. **Positivdaten:** Welche lizenzierte Quelle (PhishTank/OpenPhish/APWG/Partner) wird für Benchmark/Beta beschafft?

---

## 10. Handoff (Vorschlag für `Next.md`, PENDING_WRITE — nicht angewendet, da AUDIT_ONLY)

```text
2026-10-18 17:50 Europe/Berlin | TASK: AUDIT-001 | SOURCE: v0.1.0 (kein Git, Snapshot)
STATUS: AUDIT_ABGESCHLOSSEN / RELEASE_GATE=BLOCKED / QUALITY=SILBER
SCOPE: 44 Dateien, Chrome MV3 + Firefox MV3; Audit-Artefakte unter audit/
TESTS: node --test 13/13 PASS | Korpus 124/184 | Security-Matrix validiert (Exit 0)
BEFUNDE: Firefox-WAR fehlt (KRITISCH); Chrome GET-only/POST-Lücke (KRITISCH);
         26/26 offizielle Regionaldomains FP, 38/40 Phishing-Varianten FN im Lead-Korpus;
         stilles Fail-open; Long-URL-Blocker; 14 Doku-Widersprüche; Build nicht reproduzierbar
NEXT: P0-Fixes 1-10 aus audit/00_GESAMTAUDIT... §7.1; danach V2-Phase 0/1
NEXT_STEP: Firefox-WAR + data_collection_permissions + Claims-Korrektur + FP-Datenfix;
           Chrome-Redirect-All durch Hybrid ersetzen; echten Browser-E2E nach §8.3 durchführen.
```

---

## Anhang A — Dokumentenindex

| Dokument | Inhalt |
|---|---|
| [`security/AUDIT_SECURITY.md`](security/AUDIT_SECURITY.md) | VGT-100-Bericht, 11 Findings, 5 Chains, Gate, Restlücken |
| [`security/AUDIT_MATRIX.json`](security/AUDIT_MATRIX.json) | validierte 100-ID-Matrix + Findings/Chains/Testruns |
| [`security/probes/`](security/probes/) | 9 Probes, Runner, Logs/JSON-Ergebnisse |
| [`code/CODE_REVIEW.md`](code/CODE_REVIEW.md) | Code-/Erkennungs-Audit, FN/FP-Tabellen, Performance, Build-Repro, SILBER |
| [`code/corpus.json`](code/corpus.json) · [`code/results.json`](code/results.json) | 184-URL-Korpus + vollständige Ergebnisse |
| [`code/runtime_probes.txt`](code/runtime_probes.txt) | DNR-/WebRequest-/Guard-Mocks (16 PASS/5 WARN/5 FAIL) |
| [`product/V2_BLUEPRINT.md`](product/V2_BLUEPRINT.md) | vollständiger V2-Blueprint, Architektur, Roadmap, P0/P1/P2 |
| [`product/SOTA_RESEARCH.md`](product/SOTA_RESEARCH.md) | State of the Art, 37 Quellen, Bewertungsmatrizen |
| [`ux-release/UX_RELEASE.md`](ux-release/UX_RELEASE.md) | GLASS-2100-Gate, A11y/Kontrast, Release-Gate, Doku-Widersprüche, P0/P1/P2 |
| [`ux-release/checks/`](ux-release/checks/) | Kontrast-/UI-/Manifest-/Doku-/Reproduzierbarkeits-Checks |
| [`ux-release/screenshots/`](ux-release/screenshots) | 7 reale Chromium-Renders |
| [`lead/lead_probe.cjs`](lead/lead_probe.cjs) | unabhängiger adversarialer Lead-Korpus |
| [`lead/screenshots/`](lead/screenshots) | Lead-Render-QA (Block, Invalid, Popup) |

---

## Anhang B — Reproduktion der wichtigsten Befunde

```powershell
# 1) Repo-Tests
node --test tests/detector.test.cjs tests/chrome-worker.test.cjs tests/firefox-worker.test.cjs

# 2) Code-Korpus (schreibt audit/code/results.json + perf_results.txt)
node audit/code/run_corpus.cjs

# 3) Lead-Korpus
node audit/lead/lead_probe.cjs

# 4) Security-Matrix validieren
python "C:\Users\Masterboard\.dsh\skills\vgt-security-master\scripts\validate_audit.py" audit/security/AUDIT_MATRIX.json

# 5) Einzelbeweise
node -e "require('./shared/sites.js');const d=require('./shared/detector.js');for(const u of ['https://google.co.jp/','https://ing.nl/','https://paypa1-login.com/','https://paypalsupport.com/','https://páypal.com/']) console.log(u,d.classify(u))"
```

**Ehrlichkeitshinweis:** Dieses Dokument trennt belegte Befunde (`FAKT`) von Ableitungen (`STATIC`/`MOCK`) und offenen Punkten (`NOT_TESTED`). Es behauptet keine 100-%-Sicherheit, keine Store-Freigabe und keine erfundenen Messwerte. Browser-E2E, Store-Signierung und SAST/SCA konnten in dieser Session nicht belastbar ausgeführt werden und sind entsprechend markiert.
