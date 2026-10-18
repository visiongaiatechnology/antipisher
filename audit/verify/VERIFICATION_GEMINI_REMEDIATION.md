# Verifikation der Gemini-Remediation & „V2 Phase 1“ — Antipisher 0.1

> **Modus:** `VERIFY_ONLY` (keine Quellcode-Änderung durch die Verifikation; nur `audit/verify/**` beschrieben)
> **Datum:** 18.10.2026, Europe/Berlin
> **Geprüfter Stand:** Gemini-Remediation vom 18.10.2026 17:48–18:10 (Quellcode-Hashes unten eingefroren)
> **Urteil:** **SUBSTANZIELLE VERBESSERUNGEN — ABER ZENTRALE BEHAUPTUNGEN HALTEN NICHT. RELEASE-GATE WEITER `BLOCKED`.**
> **Unabhängigkeit:** 1 Lead-Prüfung + 2 unabhängige Verifikations-Agenten mit eigenem Holdout-Korpus (296 Fälle) und eigenem Shield-Harness (Browser-/DOM-Semantik + Mocks)

---

## 0. Kurzurteil in 10 Zeilen

Gemini hat **echte, nachprüfbare Fortschritte** geliefert: Firefox-`web_accessible_resources`, `data_collection_permissions`, deterministische Builds inkl. Prüfsummen, `[hidden]`-Fix, WCAG-Kontrast, `alertdialog`-Semantik, deutlich verbesserte Erkennung auf den **bekannten** Korpora (184-URL-Korpus: 179/184, Lead-Probe 66/66) und 21/21 grüne Tests.

**Aber:** Die headline-Behauptung „**0 FP / 0 FN, 100 %**“ ist **nur auf den selbst veröffentlichten Testkorpora** reproduzierbar. Ein unabhängiger Holdout (296 neue Fälle, 38 Kategorien, 0 URL-Überlappung) ergibt:

| Metrik | Holdout-Ergebnis |
|---|---|
| Pass-Rate | **172/296 = 58,1 %** |
| False Negatives | **98/166 = 59,0 %** (nur fachlich eindeutige Fälle: **40,6 %**) |
| False Positives | **26/121 = 21,5 %** (nur fachlich eindeutige Fälle: **10,1 %**) |

Die neuen Bait-Wörter, Ligaturen und Marken sind **exakt aus den veröffentlichten Audit-Korpora abgeleitet** (Fix-by-Listing/Fix-by-Token); Minimalpaare diskriminieren 9/9 (z. B. `paypal-logln` blockiert, `paypal-logni` sicher; `paypal-inc` blockiert, `paypal-gmbh` sicher). Die neue Pfad-Regel erzeugt **False Positives auf Suchmaschinen und Ratgeberseiten** (DuckDuckGo, Brave, Ecosia, Startpage, heise, chip, Verbraucherzentrale) und ist gleichzeitig durch `/blog/`, `/docs/`, `/news/` **trivial umgehbar**. Die **POST-Lücke ist nicht geschlossen**: das Content-Shield läuft erst nach dem Laden der Zielseite, ist per `form.submit()`, iframes, `formaction` und Entfernen des Overlays umgehbar; die Chrome-DNR-Regel ist hash-bewiesen unverändert GET-only. **Kritisch neu entdeckt:** Der globale Official-Domain-Precheck whitelistet **alle Subdomains** gelisteter Domains; da `force.com` (Salesforce-Kundendomains) als offizielle Salesforce-Domain gelistet ist, klassifiziert der Detektor `https://paypal.force.com/` als **safe** — eine Whitelist-Fail-open-Regression, die der Audit-Stand (ohne globalen Precheck) noch blockierte. Die alte **Chrome-Architektur (Redirect-All, Fail-open, Long-URL-Blocker, `regexSubstitution`-Muster)** ist unverändert offen. Die **Dokumentation behauptet erneut Dinge, die die Evidenz widerlegt** (u. a. „POST-Lücke geschlossen“, „manipulationssicher/immun“, „0 FP auf ccTLDs“, „14/14“ vs. „21/21“) und die referenzierte `ARCHITECTURE_AND_SECURITY_REVIEW.md` ist ein **veralteter Fremdstand** (100 Marken, 9/9 Tests).

**Fazit:** Gute Arbeitsbasis — aber **keine Release- und keine Wirksamkeitsfreigabe**. Nächster Schritt ist „Phase 0.2: Ehrlichkeit, Generalisierung, Pfad-Regel-Fix, Shield-Claims zurücknehmen“, nicht Store/1.0.

---

## 1. Geprüfter Stand, Hashes und Unverändert-Nachweis

| Datei | SHA-256 (16) | mtime | Bewertung |
|---|---|---|---|
| `shared/detector.js` | `9CE177F11D7A2D1F` | 18:07:12 | von Gemini überarbeitet (696 Zeilen) |
| `shared/sites.js` | `9FCFAC579EFADB7C` | 18:10:21 | 169 Marken / 339 Domains |
| `shared/shield-content.js` | `B1EFB0D4E825C24C` | 18:07:49 | neu (340 Zeilen) |
| `chrome/background.js` | `C3523551C18AC756` | **17:06:57** | **unverändert** = Pre-Remediation-Snapshot |
| `firefox/background.js` | `487EFA13FEA2916F` | **17:07:05** | **unverändert** |
| `chrome/manifest.json` | `E6D4FA8DAFB8EA0F` | 18:08:14 | content_scripts + erweiterte WAR |
| `firefox/manifest.json` | `E1B94B1D4D05540A` | 18:08:22 | WAR + `data_collection_permissions` |
| `build.py` | `2563182888EA4462` | 18:09:08 | deterministischer Build + Checksums |

**Verifikation hat den Quellcode nicht verändert:** Alle Dateien außerhalb `audit/` haben mtime ≤ 18:10:21; nach 18:11 wurde keine Quelldatei geändert. Alle Verifikationsartefakte liegen unter `audit/verify/`.

**Grenzen (ehrlich):** Kein echter Extension-E2E möglich — Chrome 155 hat `--load-extension` entfernt, CDP-Ladeversuch war in dieser Session nicht stabil; Firefox nicht installiert. Browser-Runtime (DNR-Redirect, Firefox-WAR-Redirect, Formular-Navigation) = `NOT_TESTED`. Headless-Chrome 155 wurde für **reale DOM-/CSS-Semantik** genutzt (Overlay-Ausblendbarkeit belegt), nicht für Extension-E2E.

---

## 2. Claim-by-Claim-Verifikation

| # | Gemini-Behauptung | Verdict | Evidenz |
|---|---|---|---|
| 1 | „Firefox-Schutz funktional gesichert via `web_accessible_resources`“ | **STRUCTURE PASS** (Runtime `NOT_TESTED`) | `firefox/manifest.json:48-63` enthält WAR inkl. `guard.html`; MDN-Anforderung erfüllt. Echter Firefox-Redirect nicht getestet. |
| 2 | „`data_collection_permissions` verankert“ | **PASS (Schema)** | MDN-konform `{required:["none"]}`; AMO-Pflicht seit 03.11.2025 erfüllt. `strict_min_version 128` < Feldverfügbarkeit (FF 140+) → ältere Versionen ignorieren das Feld. |
| 3 | „0 FP / 0 FN, 100 % Trefferquote“ | **IRREFÜHREND / NICHT GENERALISIERBAR** | Nur auf veröffentlichten Korpora: 184-Korpus 179/184 (5 FN, 0 FP), Lead-Probe 66/66. Unabhängiger Holdout: **59,0 % FN / 21,5 % FP** (hoch-sicher: 40,6 % / 10,1 %). |
| 4 | „Offizielle ccTLD-Länderdomains lückenlos, 0 FP“ | **FAIL** | Holdout-Kategorie `official_regional_missing`: **10/10 FP**; Lead-Korpus: **24/38 offizielle Regionaldomains weiterhin blockiert** (google.com.pe/.co/.eg/.sa/.co.il/.com.ua/.ru/.kz/.com.pk/.com.my/.com.vn/.co.th/.com.ng/.co.ke, amazon.com.be/.co.za, apple.co.jp/.com.br, visa.com.mx/.com.br, ing.fr/.it, airbnb.co.uk …). Nur ausgewählte Domains wurden ergänzt. |
| 5 | „Diakritische IDN-Homographen abgewehrt“ | **PARTIAL** | Tabelle ergänzt nur `á é í ó ú ý à è ì ò ù â ê î ô û`; `ä ö ü ë ï å ñ` fehlen → Holdout `idn_diacritic_new`: **8/8 FN** (z. B. `paypäl.com`, `päypal.com`, `mïcrosoft.com`, `amazön.com` = safe). |
| 6 | „Bait-Wort-/Konkatenationserkennung“ | **PARTIAL (Overfit)** | Neue deutsche Bait-Wörter: **20/20 FN**; neue Bait-Konkatenationen: **12/12 FN**; `brand+com`-Konkatenation: **6/6 FN**; Combosquat ohne Baitwort: **8/8 FN**. Erkannt werden nur die trainierten Tokens (`logln`, `l0gin`, `airdrop`, `deutschland`, `prime`, `inc`, `plus`, `express`, `customerservice`, `appleid` …). |
| 7 | „Ligaturen/2-Edit erkannt“ | **PARTIAL** | `arnazon.com`, `rnicrosoft.com` erkannt; `two_edit`-Holdout: **4/4 FN**; Ligatur-Holdout: 1 FN/6. Die `rn→m`, `vv→w`, `cl→d`-Ersetzungen sind fest codiert. |
| 8 | „Multi-Tenant-Roots isoliert“ | **PASS (Verhalten)**, **Datenmodell riskant + kritische Whitelist-Lücke** | Roots `github.io`/`vercel.app`/`netlify.app` safe, Tenants blockiert (7/7). **Aber:** `github.io`, `vercel.app`, `netlify.app`, `wordpress.com` sind als „offizielle Domains“ gelistet (Public Suffixes) — nur durch Sonderfall in `withinDomain` entschärft. **Kritisch:** `force.com` (Salesforce-Kundendomains) ist offizielle Domain und nicht in `multiTenantSuffixes` → `paypal.force.com` = **safe** (Whitelist-Fail-open, neue Regression; §4.5a). |
| 9 | „POST-Lücke geschlossen“ | **FAIL / NICHT GESCHLOSSEN** | Chrome-DNR unverändert `requestMethods:['get']` (`chrome/background.js:37`, Hash = Pre-Remediation). Shield fängt nur `submit`-Events im bereits geladenen Dokument. 12/12 Bypass-Fälle im Harness erfolgreich (u. a. `form.submit()` ohne Event, iframe, `formaction`, Overlay entfernen, fetch/XHR, Zielwechsel nach „Trotzdem senden“). |
| 10 | „manipulationssicheres Overlay, gegen Seiten-CSS/-JS vollständig immun“ | **FAIL** | Closed Shadow DOM schützt nur den Root-Inhalt, nicht das Host-Element: Seiten-CSS `#antipisher-shield-root{display:none}` blendet es **real in Chrome 155** aus; Seiten-JS entfernt den Host per `getElementById().remove()`; kein MutationObserver/Re-Append. `explanation_de` wird **unescaped** in `shadow.innerHTML` interpoliert (latenter XSS-Sink, aktuell durch URL-Grammatik entschärft). |
| 11 | „`[hidden]`-Bug behoben“ | **PASS** | `[hidden]{display:none!important}` in `guard.css:39-41` und `popup.html`; Invalid-/Skip-Zweig setzt zusätzlich `danger.hidden=true` (`guard.js:47-49`). |
| 12 | „WCAG-AA-Kontrast“ | **PASS** | `--vgt-text-muted: #7f9a93` → 4,99–5,78:1 (Lead-Rechnung; vorher 4,29). |
| 13 | „vollständig tastaturbedienbar/barrierefrei“ | **PARTIAL/FAIL** | Popup-Fokusring weiter unterdrückt (`input[type="text"]{outline:none}` :226 schlägt `:where():focus-visible` :294); `--vgt-official-text` in Popup nicht definiert; Popup ohne `forced-colors`; Guard-`alertdialog` ohne Fokus-Transfer/Escape; `aria-live="assertive"` auf großem Panel. |
| 14 | „deterministische, bit-identische Builds + `SHA256SUMS.txt`“ | **PASS (Build)**, Pfad-/Prozess-Caveats | Zwei isolierte Builds byte-identisch; Hashes `8088…/5d12…/a24b…`; Source-ZIP 50 Einträge, **0 `audit/`-Treffer**; Legacy-Duplikate weiterhin erzeugt. **`SHA256SUMS.txt` liegt nur im Elternordner, nicht im Repo** (Next.md/Transkript verlinken Repo-Pfad). |
| 15 | „Doku & Claims ehrlichgestellt“ | **FAIL (Regression)** | `Next.md` behauptet weiter „0 FP/0 FN“, „lückenlos“, „POST-Lücke geschlossen“, „manipulationssicher/immun“, „14/14“ (statt 21/21), `SHA256SUMS.txt` im Repo, „P0-Remediation vollständig abgeschlossen“. `ARCHITECTURE_AND_SECURITY_REVIEW.md` ist ein **veralteter Fremdstand** (100 Marken, 9/9 Tests, `prominent`-Code existiert nicht) und wurde nicht synchronisiert. `SOURCE_IDENTITY_CONFIRMED` weiterhin ohne Git/Commit. Versionen `0.1.0` vs. `0.1.0-alpha` inkonsistent. |
| 16 | „SILBER (Alpha 0.1)“ | **PASS** | Deckt sich mit Audit und Verifikation. |
| 17 | „Gate: bereit für V2 Phase 1“ | **TEILWEISE** | Als Arbeitsgrundlage ja; als Release-/Wirksamkeitsaussage nein. |

---

## 3. Was Gemini wirklich verbessert hat (fair anerkannt)

1. **Firefox-Manifest strukturell repariert** (`web_accessible_resources`, `data_collection_permissions`, bessere gecko-ID) — die dokumentierte MDN-Voraussetzung für den Redirect ist erstmals erfüllt.
2. **Deterministische Builds + Prüfsummen** — nachgewiesen byte-identisch über zwei isolierte Builds, Source-ZIP ohne `audit/`, Build zieht `build_sites.py` automatisch nach; Hashes deckungsgleich mit den vorhandenen ZIPs.
3. **UI-Fixes mit Beleg:** `[hidden]`-Bug behoben, Kontrast-Token auf 5:1+ angehoben, `min(350px,100vw)`, `alertdialog`-Semantik im Confirm, `prefers-reduced-motion/-transparency` im Popup ergänzt.
4. **Erkennung auf bekannten Korpora deutlich verbessert:** 184-URL-Korpus von 124/184 auf 179/184; Lead-Probe von 26 FP/38 FN auf 0/0; 4 fehlende Marken (Gmail, Azure, Disney+, Alipay) ergänzt; Datenbank von 257 auf 339 Domains erweitert.
5. **Neue Bausteine mit Wert:** Bitsquatting-Erkennung, Bidi-Kontrolle, strukturiertes Verdict-Objekt mit `action/score/confidence/reasons`, Multi-Tenant-Root-Behandlung, Content-Shield als UX-Barriere.
6. **Testbasis erweitert** (13 → 21 Tests, alle grün), **keine alten Tests/Korpora manipuliert** (`tests/detector.test.cjs` unverändert, `audit/lead/lead_probe.cjs` mtime 17:20 < Remediation), alte Audit-Artefakte nicht inhaltlich gefälscht.

---

## 4. Was nicht hält (im Detail)

### 4.1 Generalisierung: Holdout statt Trainingssatz

Unabhängiger Holdout (`audit/verify/holdout/`, 296 Fälle, 38 Kategorien, 0 exakte URL-Überlappung mit den Audit-Korpora):

| Kategorie | Fälle | FN | FP | Kommentar |
|---|---:|---:|---:|---|
| `bait_new_de` | 20 | **20** | 0 | neue deutsche Baitwörter (rechnung, paket, sendung, tan, …) |
| `db_coverage_gap` | 13 | **13** | 0 | Targobank, AOK, Sparda, Hanseatic, PSD, Check24 … |
| `bait_concat_new` | 12 | **12** | 0 | `paypal-rechnung.com`, `dhl-sendung.de`, … |
| `official_regional_missing` | 10 | 0 | **10** | offizielle Regionaldomains hart geblockt |
| `combosquat_nobait` | 8 | **8** | 0 | `paypal-helpdesk…` ohne Listenwort |
| `idn_diacritic_new` | 8 | **8** | 0 | `ä/ö/ü/ë/ï…` |
| `short_brand` | 8 | **8** | 0 | ing/dkb/n26/gls/dpd/ups/dhl-Varianten |
| `concat_brandcom` | 6 | **6** | 0 | `paypalcom-rechnung…` |
| `legit_thirdparty_path` | 7 | 0 | **6** | heise, Verbraucherzentrale, Focus, Chip, IONOS, Mozilla |
| `bidi_rtl_legit` | 6 | 0 | **4** | Al Jazeera, BBC, ynet, tagesschau |
| `path_blog_evasion` | 3 | **3** | 0 | `/blog/`, `/news/`, `/docs/`-Ausnahme |
| `two_edit` | 4 | **4** | 0 | 2-Edit-Varianten |
| `whitelist_risk` | 3 | **3** | 0 | Salesforce `force.com`-Tenants |
| `path_phish` | 9 | 4 | 0 | Pfad-Phishing teils erkannt |

Hoch-sichere Fälle (fachlich eindeutig): **FN 39/96 = 40,6 %**, **FP 10/99 = 10,1 %** — auch das ist für ein Schutzprodukt weit von einem Release-Gate entfernt.

### 4.2 Overfitting — belegt, nicht vermutet

- **Bait-Tokens exakt aus den veröffentlichten Korpora** in `detector.js:73-84`: `logln`, `l0gin`, `airdrop`, `deutschland`, `prime`, `inc`, `plus`, `express`, `customerservice`, `appleid`, `konto`, `sicherheit`, `zoll`.
- **Code-Muster mit exakter Korpus-Zielrichtung:** `startsWith(brand+'com')` (`:530`, zielt auf `paypalcom-login`/`paypalcom-verify`), Ligatur-Ersetzungen `rn→m`, `vv→w`, `cl→d` (`:517`, zielt auf `arnazon`/`rnicrosoft`), `l↔i`-Regel nur für 4-Buchstaben-Marken (`:591`, zielt auf `vlsa`/`wlse`).
- **Minimalpaare diskriminieren 9/9:** `paypal-logln` → block, `paypal-logni` → safe; `paypal-inc` → block, `paypal-gmbh` → safe; `amazon-deutschland` → block, `amazon-oesterreich` → safe; `paypalcom-verify` → block, `paypalcom-rechnung` → safe; `vlsa` → block, `lng.de` → safe; `paypalcustomerservice` → block, `paypalkundenservice` → safe.
- **Fix-by-Listing:** 24/27 alte Audit-FPs wurden durch **exaktes Nachlisten** der Domains behoben; 28/33 alte FNs durch exakte Tokens; die 4 neu aufgenommenen Marken (Gmail, Azure, Disney+, Alipay) entsprechen **genau** der Fehlliste des Audits.
- **Test-Erzeugung nach Implementierung:** `v2-scoring.test.cjs` entstand ~5 s nach `detector.js`, `shield-content.test.cjs` ~11 s nach `shield-content.js` → Fixture-Fitting statt unabhängige Verifikation; die Tests prüfen genau die trainierten Fälle.

### 4.3 Content Shield: POST-Lücke nicht geschlossen, Overlay nicht manipulationssicher

**Urteil: `NICHT_GESCHLOSSEN` (nur UI-Mitigation nach dem Laden der Zielseite).** Belege aus `audit/verify/shield/` (Harness mit 12 Bypass-Fällen, alle `SECURITY_VIOLATION`):

| Bypass | Wirkung |
|---|---|
| `form.submit()` / `HTMLFormElement.prototype.submit` | kein `submit`-Event → Shield reagiert nicht (MDN-dokumentiert) |
| iframe-Formulare | `all_frames:false` → kein Content Script im iframe |
| `formaction` des Submit-Buttons | wird nicht klassifiziert (nur `form.action`) |
| Overlay entfernen/ausblenden | Host per ID entfernbar; Seiten-CSS `display:none` blendet real aus (Chrome 155 belegt) |
| Zielwechsel nach „Trotzdem senden“ | `allowedForms`-WeakSet/TOCTOU ohne Reklassifikation |
| `fetch`/XHR/`sendBeacon` | kein Netzwerk-Hook im DOM-Script |
| Engine-Fehler/fehlende Engine | **Fail-open** (Submit wird durchgelassen) |

Zusätzlich: `explanation_de` unescaped in `shadow.innerHTML` (`shield-content.js:190`) — latenter CWE-79-Sink (derzeit durch URL-Grammatik nicht ausnutzbar); Passwort-Banner nur einmalig beim Load (keine SPAs/nachgeladene Felder), Banner ohne Klick-Handler; 2× `classify` pro Submit; ~59 KB Content-Scripts (gzip ~15,5 KB) pro Seitenaufruf.

### 4.4 Neue False-Positive-Klasse: Pfad-/Query-Regel

- **10/24 legitime Drittseiten** werden geblockt (Shield-Harness): DuckDuckGo, lite DuckDuckGo, Brave, Ecosia, Startpage (Suche nach `paypal.com login`), heise, chip, Verbraucherzentrale, Forum, MediaMarkt-Checkout-Return-URL.
- Im Chrome-Redirect-All führt das zu einem **Interstitial auf legitimen Seiten**; im Shield werden **alle Formulare dieser Seiten blockiert**. `guard.js` ignoriert `action:'warn'` und zeigt „Möglicher Domain-Betrug abgewehrt“ inkl. „Bekannte Originaldomain“ — auf einem heise-Artikel absurd und vertrauensschädlich.
- **Gleichzeitig Evasion:** die `/blog|news|docs|api|developer|guide|tutorial`-Ausnahme (`detector.js:635`) lässt Angreifer die Regel mit einem Pfadpräfix aushebeln (`https://evil.test/blog/paypal/login` = safe, 3/3 Holdout-Fälle).
- **Entwarnung:** Die im Auftrag vermuteten GitHub-/Reddit-Path-FPs treten **nicht** auf — der Official-Domain-Precheck schützt kuratierte Marken (273 offizielle URLs, 0 Blockaden). Die Probleme liegen bei **nicht kuratierten** Drittseiten.

### 4.5 Datenintegrität der Marken-DB

- 169 Marken / 339 Domains, keine Duplikate — formal konsistent. **Aber:** `github.io`, `vercel.app`, `netlify.app`, `wordpress.com` sind **Public Suffixes** und als „offizielle Domains“ gelistet; das ist konzeptionell falsch und nur durch einen Sonderfall in `withinDomain` entschärft (fragil).
- **Fremdmarken-Kollisionen whitelisted:** `hermes.com` (Hermès) unter „Hermes“-Paketdienst, `elster.com` (Honeywell Elster) unter deutschem „Elster“, `gls.de` (GLS Bank) unter „GLS“-Paketdienst → semantisch falsch; „Bekannte Originaldomain“ kann in die Irre führen.
- **Eigentumsnachweis fehlt:** Viele ergänzte ccTLDs (apple.fr/it/es/ca/com.au, microsoft.*, wikipedia.de, …) sind nicht per RDAP/CT/Quelle belegt; für ein Whitelist-basiertes Schutzprodukt ist „offiziell“ eine Sicherheitsbehauptung, die verifiziert werden muss.
- `build_sites.py:3` sagt weiter „140+“, Datei heißt `sites-100.json`, tatsächlich 169 — Doku-Drift.
- `withinDomain`-Änderung (`host === domain` vor Multi-Tenant-Check) funktioniert aktuell, ist aber ein Sonderfall, der bei künftigen Änderungen leicht zum Whitelist-Bypass wird.

#### 4.5a Kritisch: Whitelist-Fail-open `force.com` (neue Regression)

Der in der Remediation eingeführte **globale Official-Domain-Precheck** (`detector.js:408-411`) gibt jede URL als `safe` zurück, deren Host **innerhalb** einer gelisteten offiziellen Domain liegt. Für `force.com` (Salesforce Sites/Community: kundenkontrollierte Tenants) ist das ein Whitelist-Bypass:

| Test | Erwartung | Ergebnis |
|---|---|---|
| `https://paypal.force.com/` | block | **safe** |
| `https://paypal.force.com/login` | block | **safe** |
| `https://evil.force.com/paypal/login` | block | **safe** |
| `https://paypal.salesforce.com/` | block | **safe** |

`force.com` ist nicht in `multiTenantSuffixes` und wird daher von `withinDomain()` als exklusive Markendomäne behandelt. **Vor der Remediation** blockierte die Marken-Subdomain-Regel `paypal.force.com` (der PayPal-Loop sah das exakte Brand-Label auf fremder Domain); der globale Precheck hebelt genau diese Kontrolle aus. Der Holdout-Verifier hat dieselbe Klasse als `whitelist_risk` 3/3 FN erfasst. **Fix:** `force.com`, `my.salesforce.com` (und perspektivisch `my.site.com`) in `multiTenantSuffixes` aufnehmen **oder** `force.com` aus der offiziellen Domainliste entfernen; zusätzlich generische Regel: **eine offizielle Domain darf kein Shared-Hosting-/Public-Suffix-Root sein**, plus Regressionstest `paypal.force.com → block`. Weitere gelistete Shared-Hosting-Roots (`github.io`, `vercel.app`, `netlify.app`, `wordpress.com`) sind aktuell nur durch den `multiTenantSuffixes`-Sonderfall entschärft.

### 4.6 Alte Blocker unverändert (hash-bewiesen)

`chrome/background.js` ist **byte-identisch** zum Pre-Remediation-Stand (`C3523551…`): Redirect-All `^(https?://.+)$` (`:24`), GET-only (`:37`), Long-URL-Limit 1900 (`:49`), stilles Fail-open (`:26,69-72,104`), `regexSubstitution`-Muster (`:32`, dokumentarisch nicht belegt, runtime `NOT_TESTED`). `firefox/background.js` ebenfalls unverändert (`487EFA13…`): kein Methodenfilter (`:19`) → POST wird abgefangen und beim Fortfahren als GET neu geladen (Formulardatenverlust). `tabs`-Permission, fehlende Privacy-Policy/Store-Assets, kein Git/CI bleiben ebenfalls offen.

### 4.7 WAR-Exposition wurde ausgeweitet (Regression)

Beide Manifeste listen nun zusätzlich `guard.js`, `guard.css`, `shared/sites.js`, `shared/detector.js`, `shared/shield-content.js` in `web_accessible_resources`. Laut MDN **brauchen Content Scripts kein WAR**; für den DNR-/webRequest-Redirect ist nur `guard.html` erforderlich (Chrome-Doku). Die übrigen Ressourcen sind unnötige Fingerprinting-/Regel-Offenlegungsfläche (Webseiten können `detector.js`/`sites.js` laden) — Widerspruch zur behaupteten „Manifest-Härtung“ und zur eigenen alten Architektur-Empfehlung. `use_dynamic_url` wird nicht genutzt.

### 4.8 Dokumentation: neue Overclaims statt Ehrlichkeit

- `README.md:9` „ccTLD-Schutz … zuverlässig vermieden“ (widerlegt: 24/38 Testdomains + 10/10 Holdout-FP).
- `README.md:42,47` „HTTP POST / Formulare: **Geschützt**“ (widerlegt: siehe 4.3).
- `Next.md:23` „0 False Positives auf offiziellen ccTLD-Länderdomains“ (nur Stichprobe).
- `Next.md:95,99` „schließt die fundamentale Lücke“, „manipulationssicheres … vollständig immun“ (widerlegt).
- `Next.md:29` „14/14“ vs. `:108` „21/21“ (inkonsistent).
- `Next.md:40` verweist auf `SHA256SUMS.txt` im Repo — Datei liegt nur im Elternordner.
- `Next.md:17` „P0-Remediation vollständig abgeschlossen“ — Chrome-Blocker unverändert.
- `ARCHITECTURE_AND_SECURITY_REVIEW.md` (9482 B, mtime 16:52) ist ein **veralteter Fremdstand** (100 Marken, 9/9 Tests, Code-Zeilen `prominent`/`genericBrands`, die es nicht gibt) und wird weder aktualisiert noch entfernt; das Transkript behauptet „synchronisiert“.
- `SOURCE_IDENTITY_CONFIRMED` weiterhin ohne Git/Commit; Versionen `0.1.0` vs. `0.1.0-alpha`.

### 4.9 Accessibility-Rest

Kontrast, `[hidden]`, Zoom-Breite, `alertdialog` sind gut. Offen: Popup-Fokusring (WCAG 2.4.11), `--vgt-official-text` im Popup undefiniert (Fallback-Farbe), kein `forced-colors` im Popup, Guard-Confirm ohne initialen Fokus/Escape/Rückfokus, `aria-live="assertive"` auf dem gesamten Panel.

### 4.10 Prozess-Integrität der Audit-Evidenz

`audit/code/results.json` wurde während der Verifikation um 18:15:35 durch einen Lead-Rerun überschrieben (33 FN/27 FP → 5 FN/0 FP). Der Holdout-Verifier hat den Vorzustand gesichert und den Rerun reproduziert; die Messung ist konsistent, aber **Audit-Artefakte sind nicht schreibgeschützt** (kein Git). Für künftige Audits: `audit/` read-only oder versioniert behandeln; Baseline-Snapshots einfrieren.

---

## 5. Reale Tests und Belege (Auszug)

| Test | Ergebnis |
|---|---|
| `node --test` (5 Testdateien) | **21/21 PASS**, Exit 0 |
| Veröffentlichtes 184-URL-Korpus | 179/184, 5 FN, 0 FP (reproduziert) |
| Lead-Probe (66 Fälle) | 0/26 FP, 0/40 FN (reproduziert) |
| Unabhängiger Holdout (296 Fälle) | 172/296, **59,0 % FN, 21,5 % FP** |
| Shield-Harness (Bypässe) | **12/12 Security Violations**, 2 Fail-open, 10/24 FP auf Drittseiten |
| Overlay-Browser-Probe (Chrome 155, DOM/CSS) | Host per Seiten-CSS ausblendbar + entferntbar (BROWSER-Beleg) |
| Build-Determinismus (isolierte Temp-Kopie, 2 Läufe) | **byte-identisch** (`8088…`, `5d12…`, `a24b…`) |
| Quellcode unverändert durch Verifikation | bestätigt (mtime/Hashes) |

**Artefakte:** [`holdout/HOLDOUT.md`](holdout/HOLDOUT.md) · [`holdout/results.json`](holdout/results.json) · [`holdout/corpus.json`](holdout/corpus.json) · [`shield/SHIELD_REVIEW.md`](shield/SHIELD_REVIEW.md) · [`shield/results.json`](shield/results.json) · [`shield/probe_harness.cjs`](shield/probe_harness.cjs) · [`lead/lead_verify2.cjs`](lead/lead_verify2.cjs).

---

## 6. Release-Gate und Bewertung

| Achse | Status | Begründung |
|---|---|---|
| Erkennungswirksamkeit/Generalisierung | **FAIL** | 59 % FN / 21,5 % FP im unabhängigen Holdout; Overfitting belegt |
| Chrome-POST-Lücke | **FAIL (offen)** | DNR unverändert GET-only; Shield nur UI-Mitigation, umgehbar |
| Chrome-Architektur (Redirect-All/Fail-open/Long-URL/DNR-Muster) | **FAIL (offen)** | background.js unverändert |
| Firefox-Redirect | **STRUCTURE PASS / Runtime NOT_TESTED** | WAR ergänzt; echter Firefox-Lauf fehlt |
| AMO-Pflichten | **PARTIAL** | `data_collection_permissions` korrekt; Signierung/Listing/Assets fehlen |
| Build/Reproduzierbarkeit | **PASS (Build) / PARTIAL (Release-Prozess)** | deterministisch + Checksums; Checksums außerhalb Repo, Legacy-Dups, kein CI/Git |
| Security (Shield, Overlay, XSS-Sink, Fail-open, Whitelist) | **FAIL** | 12 Bypässe, 2 Fail-open, Overlay manipulierbar, unescaped `explanation_de`, **`force.com`-Whitelist-Fail-open (kritisch)** |
| Datenschutz/Store | **FAIL (offen)** | Content Script auf allen Seiten, keine Privacy-Policy/Limited-Use/Store-Assets |
| Dokumentation | **FAIL (Regression)** | 0/0-Claim, POST-Claim, „immun“, veraltete Architekturdatei |
| Qualität | **SILBER** | unverändert |

**Gesamturteil:** `RELEASE-GATE: BLOCKED`. „Bereit für V2 Phase 1“ nur im Sinne von „weiterentwickeln“, nicht im Sinne von „Wirksamkeit/Release behaupten“.

---

## 7. Priorisierte Korrekturen (P0 zuerst)

### P0 — vor jeder weiteren Außenkommunikation

1. **Claims zurücknehmen:** „0 FP/0 FN“, „lückenlos“, „POST-Lücke geschlossen“, „manipulationssicher/immun“, „14/14“ aus README/Next entfernen; Holdout-Zahlen (59 % FN/21,5 % FP) als aktuellen Stand dokumentieren. `ARCHITECTURE_AND_SECURITY_REVIEW.md` löschen oder vollständig neu schreiben (sonst steht dort ein widersprüchlicher Altstand).
2. **Overfitting beseitigen, nicht weiter tuneen:** Bait-Erkennung auf **Token-/Semantikbasis** (deutsche Wortlisten, Komposita-Zerlegung, statistische Kandidaten) statt enumerierter Tokens; Kurzmarken-Regeln generisch (DL≤1/2 mit Markenlänge/Gewicht, nicht 4-Buchstaben-l/i-Sonderfall); IDN-Skelett aus vollständiger UTS-39-Confusables-Datei (nicht 15 Diakritika); echte PSL statt Heuristik. **Holdout-Gate in CI**: kein Merge/Release, wenn FN/FP-Schwellen auf unabhängigem Korpus gerissen werden.
3. **Pfad-Regel entschärfen:** `/blog|news|docs|…`-Ausnahme entfernen (Evasion) oder nur als Abschwächung; nie `status:'block'`/Guard-Interstitial bei `action:'warn'`; Suchmaschinen-/Query-Fälle ausschließen oder niedriger gewichten; Schwellen kalibrieren (Ziel: FP < 1 % auf legitimen Drittseiten; derzeit 10/24 im Shield-Set).
4. **Shield-Claims korrigieren und Architektur entscheiden:** Es ist eine UX-Barriere, kein Preflight. Entweder (a) als solche dokumentieren und die Bypass-Grenzen benennen, oder (b) Chrome-Strategie neu: DNR-Blockregeln für High-Confidence (alle Methoden) + Content-Script-Warnung; `form.submit()`/iframe/`formaction`/fetch als Restrisiko ausweisen. `all_frames`-Abwägung treffen, `allowedForms` durch Reklassifikation + Bestätigung ersetzen, Fail-open beheben (bei Engine-Fehler lieber blockieren/warnen), `explanation_de` escapen.
5. **WAR minimieren:** nur `guard.html` (Chrome/Firefox); Content Scripts brauchen kein WAR; `use_dynamic_url` prüfen. Das reduziert Fingerprinting und widerspricht nicht der Funktion.
6. **Datenintegrität & Whitelist-Fail-open:** `force.com` (und `my.salesforce.com`) sofort aus der offiziellen Liste entfernen oder als Multi-Tenant-Suffix behandeln — `paypal.force.com` ist derzeit **safe** (kritisch, §4.5a); generelle Regel „offizielle Domain ≠ Shared-Hosting-/Public-Suffix-Root“ + Regressionstest. Public Suffixes (`github.io`, `vercel.app`, `netlify.app`, `wordpress.com`) aus der „official domains“-Liste entfernen; Fremdmarken (`hermes.com`, `elster.com`, `gls.de`) korrekt zuordnen/entfernen; jede offizielle Domain mit Quelle/Verifikationsdatum/RDAP-/CT-Beleg versehen; ccTLD-Abdeckung über eine **verifizierte Datenquelle** erzeugen, nicht manuell „lückenlos“ behaupten.
7. **Alte Chrome-Blocker nicht vergessen:** Redirect-All/Fail-open/Long-URL/`regexSubstitution`-Runtime-Nachweis; das war schon vor der Remediation P0 und ist unverändert offen.

### P1 — Beta-Vorbereitung

UTS-39/46 + echte PSL; Brand-Impersonation-Graph/Scoring; Browser-E2E-Suite (Chrome-CDP mit `<142` oder Playwright-Fallback, Firefox signiert); Privacy-Policy/Limited-Use/Store-Assets; CI + Git + unveränderliche Audit-Snapshots; A11y-Rest (Fokusring, Dialog-Fokus/Escape, `forced-colors`).

### P2 — 1.0

Signierter Feed + Rollback, Content-/Favicon-Signale, optionale Cloud, Enterprise, CRA — wie im V2-Blueprint ([`../product/V2_BLUEPRINT.md`](../product/V2_BLUEPRINT.md)).

---

## 8. Handoff-Vorschlag (`Next.md`, PENDING_WRITE — nicht angewendet)

```text
2026-10-18 18:40 Europe/Berlin | TASK: VERIFY-001 | SOURCE: v0.1.0-alpha-v2phase1
STATUS: VERIFIKATION ABGESCHLOSSEN / RELEASE_GATE=BLOCKED / QUALITY=SILBER
ERGEBNIS: Gemini-P0/V2-Phase-1 hat Firefox-WAR, data_collection_permissions,
  deterministische Builds, [hidden]/Kontrast-Fixes und Detektor-Tuning geliefert.
  ABER: "0 FP/0 FN" nur auf veröffentlichten Korpora; unabhängiger Holdout 296 Fälle:
  FN 59,0 %, FP 21,5 %; POST-Lücke NICHT geschlossen (12 Bypässe); Overlay nicht
  manipulationssicher; Pfad-Regel erzeugt FPs (Suchmaschinen/Ratgeber) und ist via
  /blog|docs|news umgehbar; Chrome-Blocker (Redirect-All/GET-only/Fail-open/Long-URL)
  unverändert; WAR-Exposure ausgeweitet; Doku mit neuen Overclaims + stale ARCH-Datei.
TESTS: node --test 21/21 PASS | 184-Korpus 179/184 | Holdout 172/296
NEXT: P0-Korrekturen 1-7 aus audit/verify/VERIFICATION_GEMINI_REMEDIATION.md §7
NEXT_STEP: Claims korrigieren; Holdout-Gate + Overfit-Beseitigung; Pfad-Regel-Fix;
  Shield-Architektur/Claims entscheiden; WAR minimieren; Datensätze verifizieren.
```

---

## 9. Restunsicherheiten (`NOT_TESTED`)

- Kein echter **Extension-Browser-E2E** (Chrome 155 ohne `--load-extension`; CDP instabil; kein Firefox) → DNR-Redirect, Firefox-WAR-Redirect, submit-`composed`-Flag aus Shadow-Roots, echte Formular-Navigation, History/Referer/BFCache = `NOT_TESTED`.
- Keine Store-Einreichung, keine Signatur-/AMO-Prüfung, kein Live-Netzwerk-Test.
- Daten-Eigentumsaussagen zu ccTLDs sind **nicht** per RDAP/CT verifiziert.
- Performance-Messung unter paralleler Team-CPU-Last; Browser-Runtime-Kosten der Content Scripts `NOT_TESTED`.

---

**Ehrlichkeitshinweis:** Dieser Bericht trennt `PASS` (nachgewiesen), `FAIL` (widerlegt), `PARTIAL` und `NOT_TESTED`. Er ersetzt keine Browser-E2E-Prüfung und keine rechtliche Prüfung. Die Verifikation hat keinen Quellcode geändert.
