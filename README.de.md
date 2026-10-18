<div align="center">

# 🛡️ Antipisher 0.2.1 (Alpha)

**Offline-fähiger, hochpräziser Schutz vor Phishing, IDN-Homoglyphen & Typosquatting für Google Chrome & Mozilla Firefox**  
*Lizenziert unter der GNU Affero General Public License v3.0 (AGPLv3)*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](LICENSE)
[![Version: 0.2.1-alpha](https://img.shields.io/badge/Version-0.2.1--alpha-10b981.svg?style=for-the-badge)](https://github.com/visiongaiatechnology/antipisher)
[![Tests: 69/69 Passing](https://img.shields.io/badge/Tests-69%2F69_Passing-2ea043.svg?style=for-the-badge)](#tests--entwicklung)
[![Telemetry: Zero / 100% Offline](https://img.shields.io/badge/Telemetrie-Keine_%2F_100%25_Offline-0284c7.svg?style=for-the-badge)](#datenschutz--offline-garantien)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3_Bereit-f59e0b.svg?style=for-the-badge)](chrome/)
[![Firefox MV3](https://img.shields.io/badge/Firefox-MV3_Bereit-ef4444.svg?style=for-the-badge)](firefox/)

---

### 🌐 Select Language / Sprache wählen / Выберите язык / 选择语言

[🇬🇧 **English**](README.md) &nbsp;•&nbsp; [🇩🇪 **Deutsch**](README.de.md) &nbsp;•&nbsp; [🇷🇺 **Русский**](README.ru.md) &nbsp;•&nbsp; [🇨🇳 **中文**](README.zh.md)

---

</div>

> **Status:** `SILVER` · Version `0.2.1` · Stand: 18.10.2026 · AEGIS Tracker Shield & Options Meilenstein.  
> **Kein finales Store-Produkt:** Browser-E2E-Tests, offizielle Store-Listung, signierte Update-Feeds und die vollständige V2-Graph-Engine sind laufende Entwicklungsziele (siehe [Bekannte Grenzen & Einschränkungen](#bekannte-grenzen--einschränkungen)).

---

## ⚡ Kernfunktionen & Architektur-Module

### 🛡️ 1. Phishing-, Marken- & Domain-Schutz
- **187 kuratierte Marken / 353 offizielle Domains:** Umfassende Offline-Datenbank für Finanzinstitute (Sparkasse, Volksbank, ING, DKB, Deutsche Bank etc.), Behörden (Bund, Elster), Krypto-Börsen, Cloud/KI-Infrastruktur, Logistik (DHL, Hermes) sowie internationale Plattformen in [`shared/sites.js`](shared/sites.js).
- **Heuristische Multi-Vektor-Erkennungs-Engine:**
  - **Tippfehler- & Buchstabendreher-Schutz:** Damerau-Levenshtein 1 & 2 Distanz fängt Vertauschungen benachbarter Buchstaben ab (`amzaon.com`, `goolge.com`, `paypla.com`).
  - **1-Bit Bitsquatting (`isBitFlip`):** Erkennt Bit-Flips durch Hardware- oder DNS-Speicherübertragungsfehler (`amaxon.com` → Amazon, `microsmft.com` → Microsoft, `gongle.com` → Google).
  - **Visuelle Ligaturen & Zwillingszeichen:** Deckt optische 2-Edit-Ähnlichkeiten auf (`arnazon.com` durch `rn→m`, `rnicrosoft.com`, `vv→w`, `cl→d`).
  - **Unicode-Homoglyphen & Diakritika:** Identifiziert gemischte Schriftsysteme aus Kyrillisch, Griechisch, eingekreisten Zeichen und lateinischen Diakritika (`páypal.com`, `päypal.com`, `mïcrosoft.com`, `amazön.com`), ohne echte Begriffe wie `über.de` fälschlicherweise zu blockieren.
  - **Bidirektionale Steuerzeichen (UTS #39 / RFC 8264):** Blockiert unsichtbare RTL/LTR-Richtungswechsler zur Verschleierung von Dateiendungen und Domains (`\u202E`, `\u202A`–`\u202E`, `\u2066`–`\u2069`).
  - **Marken- & Credential-Ködersubstantive:** Fängt ungegliederte Keyword-Kombinationen ab (`paypalsupport.com`, `binancelogin.com`, `paypal-rechnung.com`, `dhl-sendung.de`, `sparkasse-kontoauszug.de`).
  - **Subdomain-Impersonation:** Erkennt missbrauchte Markennamen auf fremden Domains (`apple.attacker.com`, `paypal.evil.test`).
  - **RFC 3986 Userinfo-Täuschung:** Blockiert irreführende Benutzerinformations-Präfixe (`https://paypal.com@evil.com/`).
- **Ebene 3: Pfad- & Query-Prüfung:** Erkennt gezielten Identitätsdiebstahl in URL-Pfaden auf fremden Hosts (z. B. `https://unrelated.com/paypal/login`, `https://phish-host.org/paypal.com/verify`), schützt jedoch legitime Entwickler-Dokumentationen, API-Referenzen und Nachrichtenartikel (`/docs/`, `/news/`, `/blog/`).
- **Isolation von Shared-Hosting-Namespaces:** Public-Suffix- und Multi-Tenant-Domains (`force.com`, `github.io`, `vercel.app`, `netlify.app`, `wordpress.com` etc.) werden isoliert und niemals als exklusive Marken-Roots gewertet (`paypal.force.com` geblockt, Plattform-Root bleibt sicher erreichbar).
- **Offizielle Länder-TLD-Intelligenz:** Erkennt offizielle Ländervertretungen globaler Marken als legitim an (`google.co.jp`, `amazon.se`, `ing.nl`, `visa.de`); warnt informativ bei uneindeutigen TLDs und blockiert strikt verdächtige generische TLDs.
- **In-Page Content Shield (`shared/shield-content.js`):**
  - Schließt die POST-Navigationslücke von Chrome MV3 declarativeNetRequest (DNR).
  - Fängt Formularabsendungen (`submit`-Event in der DOM-Capture-Phase) ab, bevor Zugangsdaten den Browser verlassen können.
  - Rendert ein manipulationssicheres Glass-2100-Warn-Modal in einem geschlossenen Shadow DOM (`attachShadow({ mode: 'closed' })`), immun gegen CSS-Resets und Skriptangriffe der Hostseite.
  - Hebt Passwortfelder auf verdächtigen Domains automatisch mit einem dezenten Schutz-Badge hervor.

### 🚫 2. Tracker- & Telemetrie-Abwehr (AEGIS Tracker Shield)
- **Lokale deklarative Netzwerksperren:** Native deklarative Regelsätze (`rulesets/trackers.json`) zur Blockade kommerzieller Werbe-, Analyse- und Telemetrienetzwerke in Chrome MV3 (DNR) und Firefox (webRequest).
- **Dynamische Skript-Surrogates (uBlock-Prinzip):** In-Page Funktions-Ersatz für `window.ga`, `window.dataLayer`, `window.fbq`, `window.ttq`, `window.clarity`, `window.hj` und `navigator.sendBeacon`. Verhindert das Einfrieren von Checkouts, Formularen und Logins bei vollständiger Unterbindung von Telemetriedaten.
- **URL-Tracking-Parameter-Sanitizer:** Bereinigt kommerzielle Tracking-Tokens (`utm_source`, `utm_medium`, `fbclid`, `gclid` etc.) automatisch und nahtlos via `history.replaceState`.
- **Echtzeit Live-Tracker-Zähler:** Toolbar-Icon-Badge und Popup zeigen in Echtzeit geblockte Tracker (`Tab: X · Gesamt: Y`) und erfassen präzise auch dynamisch oder asynchron nachladende Tracker-Skripte.

### ⚡ 3. DOM- & Skript-Sicherheit (GeDefense Light)
- **Self-XSS Konsole-Schutz:** Warnt Anwender in den Entwicklertools mit einer deutlichen Sicherheitswarnung vor Social-Engineering-Paste-Attacken.
- **Cognitive Fast-Path Engine:** Extrem performante Heuristik-Prüfung auf potenziell schädliche Tags (`<script>`, `<iframe>`) ohne unnötigen DOM-Parsing-Overhead.
- **Dynamische Injektions- & Protokoll-Neutralisierung:** Entschärft gefährliche Script- und Iframe-Injektionen, entfernt Inline-Handler (`onerror`, `onclick`) und unterbindet `javascript:` URI-Ausführungen auf Prototyp-Ebene (`Element.prototype.setAttribute`).

### 🎭 4. Privatsphäre & Anti-Fingerprinting
- **Canvas & WebGL Cloaking:** Injiziert subtiles, unmerkliches 1-Bit-Rauschen bei Canvas-Ausleseoperationen und maskiert WebGL-Renderer-Strings gegen geräteübergreifendes Fingerprinting.
- **Screen-Geometrie-Fuzzing:** Normalisiert und fuzzt Bildschirmmaße zur Verhinderung hardwarebasierter Geräte-Wiedererkennung.
- **Rotierender digitaler Identitäts-Seed:** Generiert eine kryptografische Sitzungsidentität mit 1-Klick-Neu-Würfeln direkt im Popup oder Einstellungsmenü.
- **100 % Offline & Null Telemetrie:** Keine externen HTTP-Aufrufe, keine Cloud-Abhängigkeiten, keine API-Schlüssel, keine Speicherung des Browserverlaufs.

### ⚙️ 5. Benutzerfreundlichkeit, Einstellungen & Whitelist
- **Dediziertes Einstellungsmenü (`options.html`):** Vollständiges Glass-2100-Options-Dashboard, erreichbar über das Zahnrad-Symbol im Popup oder die Browser-Erweiterungsverwaltung.
- **Benutzerdefinierte Domain-Whitelist:** Schnelles Pflegen vertrauenswürdiger Domains und Intranet-Portale (z. B. Firmen-SSO), mit sofortiger lokaler Freigabe ohne externe Abfragen.
- **Leises sicheres Surfen & Glass 2100 Status-Toast:** Saubere, verifizierte Webseiten öffnen direkt ohne zusätzliche Latenz (0 ms) und ohne störende Vollbild-Unterbrechungen. Beim Aufrufen verifizierter Webseiten erscheint kurz ein dezenter, schwebender Glass-2100-Status-Toast (*„Domain verifiziert · Antipisher“*), der sanft ausblendet, ohne Klicks zu blockieren (`pointer-events: none`).
- **Standard- vs. Strenger Preflight-Modus:** Der Standard-Modus ermöglicht flüssiges Surfen mit gezielter Phishing-Abwehr; der optionale strenge Modus schaltet eine vollständige Vollbild-Vorabprüfung vor jeden GET-Aufruf.
- **4 Muttersprachen:** 100 % Parität in Deutsch (`de`), Englisch (`en`), Russisch (`ru`) und Chinesisch (`zh`), automatische Erkennung der Browsersprache mit manuellem Override.

### 🏗️ 6. Architektur, Barrierefreiheit & Build-Integrität
- **Chrome MV3 Preflight & Beseitigung von Fail-Open:** Führt GET-Anfragen über DNR; bei einem DNR-Konfigurationsfehler schaltet Antipisher sofort in einen klar signalisierten Degraded-Modus mit Observer-Fallback. Beseitigt willkürliche URL-Längenbeschränkungen.
- **Firefox MV3 Konformität:** Synchrones `webRequestBlocking` + In-Page Shield mit deklarierten `web_accessible_resources` und `data_collection_permissions: {"required":["none"]}` gemäß MDN- und AMO-Richtlinien.
- **Glass 2100 Design System:** Gemeinsame Design-Tokens (`shared/design-tokens.css`), WCAG-AA-konforme Kontrastwerte (≥ 4.5:1), vollständige Tastatursteuerung mit 2px Fokusringen, ARIA `alertdialog`, Unterstützung für Prefers-Reduced-Motion und Forced-Colors.
- **100 % bit-identische reproduzierbare Builds:** Deterministische ZIP-Erstellung mit festen Zeitstempeln via `build.py` und zentrale Prüfsummen in [`SHA256SUMS.txt`](SHA256SUMS.txt).

---

## 📸 Benutzeroberfläche & Screenshots

| Einstellungs-Menü (v0.2.1) | Benutzerdefinierte Whitelist (v0.2.1) |
|:---:|:---:|
| ![Einstellungs-Menü](audit/verify/fix/screenshots/v2-options.png) | ![Benutzerdefinierte Whitelist](audit/verify/fix/screenshots/v2-options-whitelist.png) |

| Erweiterungs-Popup (v0.2.1) | In-Page Content Shield (Formular-Schutz) |
|:---:|:---:|
| ![Erweiterungs-Popup](audit/verify/fix/screenshots/v2-popup.png) | ![In-Page Shield](audit/verify/fix/screenshots/v2-shield-modal.png) |

| Bedrohung abgefangen (Block-Interstitial) | Unklare Domain (Warn-Interstitial) |
|:---:|:---:|
| ![Block-Interstitial](audit/verify/fix/screenshots/v2-guard-block.png) | ![Warn-Interstitial](audit/verify/fix/screenshots/v2-guard-warn.png) |

| Kompakt-Ansicht (500px) | Mobile Ansicht (390px) |
|:---:|:---:|
| ![Kompakt-Ansicht](audit/verify/fix/screenshots/v2-guard-compact.png) | ![Mobile Ansicht](audit/verify/fix/screenshots/v2-guard-mobile.png) |

---

## 📊 Gemessene Erkennungsleistung

| Test-Korpus | Benchmark-Ergebnis |
|---|---|
| Unabhängiges 296-Fälle Holdout (Audit-Verifier) | **289/296 = 97,6 %** Genauigkeit; 0/166 False Negatives, 7/121 False Positives (High-Confidence: FP 2/99 = 2,0 %) |
| Frischer unkalibrierter 44-Fälle Sanity-Korpus | **42/44 = 95,5 %** (2 FN bei nicht gelisteten Combosquats: `tiktok-coin.com`, `ledger-live.com`) |
| Öffentlicher 184-URL Audit-Korpus | 183/184 erkannt (1 FN, 0 FP) |
| Adversarial Lead Probe (66 Fälle) | **0/26 False Positives (0 %)**, **0/40 False Negatives (0 %)** — 100 % bestanden |
| Node.js Unit- & Regressionstest-Suite | **69/69 bestanden (100 %)** |

> [!NOTE]
> Diese Zahlen spiegeln empirische Testergebnisse wider und stellen keine absolute Garantie dar. Der kontinuierliche Ausbau hin zu vollständigen UTS-39-Tabellen und graphenbasierten Markenmodellen ist für V2 geplant.

---

## 🏛️ Architektur-Vergleich nach Browser

| Dimension | Google Chrome (MV3) | Mozilla Firefox (MV3) |
|---|---|---|
| **Top-Level GET-Navigation** | DNR-Preflight-Redirect → Lokales `guard.html` → Heuristische Einstufung | Synchrones `webRequestBlocking` vor dem Absenden der Anfrage |
| **POST / Formular-Absendungen** | In-Page Content Shield (Abfangen in DOM-Capture-Phase) | Synchrones `webRequestBlocking` + In-Page Content Shield |
| **DNR-Fehlerverhalten** | Explizite „Degraded“-Meldung im Popup + Fallback-Beobachtermodus | Nicht zutreffend (natives `webRequestBlocking` aktiv) |
| **Offline First** | Ja (100 % offline, null Netzwerkverkehr) | Ja (100 % offline, null Netzwerkverkehr) |
| **Browser E2E-Ausführung** | Manuelle Verifikation via entpackter Erweiterung (Chrome 155 CLI-Restriktion) | Manuelle Verifikation via `about:debugging` |

---

## 🔒 Datenschutz & Offline-Garantien

- **Keinerlei Netzwerkaktivität:** Verbindet sich niemals mit externen Servern, Cloud-Diensten oder Analyse-Tools.
- **Reiner Lokalspeicher:** Speichert ausschließlich Zählerstände, Konfigurations-Flags (`strictMode`) und die Sprachpräferenz (`user_locale`).
- **Keine Protokollierung des Verlaufs:** Besuchte Adressen werden weder gespeichert noch übertragen. Einmalige Freigaben gelten ausschließlich für den spezifischen Tab und die aktuelle Sitzung.
- **Integrität des DOM-Shields:** Liest bei Formularabsendungen nur die Ziel-URL und prüft auf das Vorhandensein von Passwortfeldern — **Passwörter selbst werden zu keinem Zeitpunkt ausgelesen, protokolliert oder gespeichert**.

---

## ⚠️ Bekannte Grenzen & Einschränkungen

1. **POST-Shield Abdeckung:** Formularübermittlungen, die rein programmatisch über `form.submit()` ohne auslösendes Event, in verschachtelten Cross-Origin-iFrames oder manuell über `fetch`/XHR erfolgen, können nicht im DOM abgefangen werden. Chrome MV3 DNR bleibt laut Spezifikation rein auf GET beschränkt.
2. **Chrome Global-Redirect-Ablauf:** Chrome-GET-Navigationen durchlaufen die lokale Guard-Zwischenseite und erfordern temporäre Einzelfreigaberegeln.
3. **Datenabdeckung:** Der Markenkatalog umfasst derzeit 187 kuratierte Entitäten. Nicht enthaltene Marken werden nicht aktiv überwacht.
4. **Verbleibende Randfälle:** Generische Wörterbuch-Subdomains auf Drittanbieter-Servern oder ungekannte Wortkombinationen (`tiktok-coin`) erfordern einen weiteren Ausbau des heuristischen Vokabulars.
5. **Kein Cloud-Update-Feed:** Aktualisierungen der Markendatenbank erfolgen über neue Releases des Erweiterungspakets.

---

## 🚀 Installation & Lokales Testen

Antipisher wird derzeit als **Alpha-Version** über GitHub bereitgestellt:

```bash
# 1. Release-Archiv aus GitHub Releases herunterladen oder lokal bauen:
python build.py

# 2. Integrität der Archive verifizieren:
# Unter Windows:
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
# Unter Linux/macOS:
bash scripts/verify-release.sh
```

### Google Chrome
1. Öffne `chrome://extensions`.
2. Aktiviere den **Entwicklermodus** (Schalter oben rechts).
3. Klicke auf **Entpackte Erweiterung laden** und wähle das Verzeichnis [`chrome/`](chrome/) aus.

### Mozilla Firefox
1. Öffne `about:debugging#/runtime/this-firefox`.
2. Klicke auf **Temporäres Add-on laden…**.
3. Wähle die Datei [`firefox/manifest.json`](firefox/manifest.json) aus.
*(Eine dauerhafte Installation außerhalb des Entwicklermodus erfordert das unlisted Signieren über AMO; siehe [`docs/ALPHA-INSTALL.md`](docs/ALPHA-INSTALL.md)).*

---

## 🧪 Tests & Entwicklung

Antipisher verfügt über eine vollständig automatisierte Test-Suite ohne externe Abhängigkeiten:

```bash
# Alle 38 Unit- und Regressionstests ausführen
node --test tests/*.test.cjs

# JavaScript-Syntax aller Kernkomponenten validieren
node --check shared/detector.js
node --check shared/shield-content.js
node --check shared/i18n.js
node --check chrome/background.js
node --check firefox/background.js

# Unabhängige Holdout- und Sanity-Prüfungen durchführen
node audit/verify/holdout/run_holdout.cjs
node audit/verify/fix/fresh_sanity.cjs
node audit/lead/lead_probe.cjs

# Deterministische, bit-identische Release-Archive erstellen
python build.py
```

---

## 📜 Referenzen & Standards

- **Unicode-Sicherheit:** [Unicode Technical Standard #39 (UTS #39)](https://www.unicode.org/reports/tr39/)
- **Chrome Extensions:** [DeclarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- **Mozilla Add-ons:** [MDN webRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)
- **Public Suffixes:** [Public Suffix List (PSL)](https://publicsuffix.org/)
- **Store-Richtlinien:** [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

---

## 📄 Lizenz & Urheberrecht

Lizenziert unter der **GNU Affero General Public License v3.0 (AGPLv3)**.  
Den vollständigen Lizenztext findest du in [`LICENSE`](LICENSE).

Copyright © 2026 VisionGaiaTechnology. Alle Rechte vorbehalten.
