# SHIELD_REVIEW — Content-Shield-/Browser-Integration Security-Verifikation

**Produkt:** Antipisher 0.1 (Alpha) · Chrome MV3 / Firefox MV3 · Workspace `vgt-domainguard-src`
**Prüfobjekt:** Gemini-Remediation „V2 Phase 1 — In-Page Content Shield (POST-Schutz)“ (`shared/shield-content.js`, Manifeste, WAR, Tests, Claims)
**Modus:** `VERIFY_ONLY` / `AUDIT_ONLY` — **kein Quellcode geändert**; alle Schreibvorgänge ausschließlich unter `audit/verify/shield/`
**Profil:** GENERIC (Browser-Extension) · **Datum:** 2026-10-18 · **Auditor:** shield-verifier (unabhängiger Teammate)
**Toolchain:** Node v24.13.0, Python 3.14.2, Headless Chrome 155.0.8059.85 (nur DOM/CSS-Semantik)
**Grenzen:** Kein echter Browser-E2E mit geladener Extension (Chrome 155 hat `--load-extension` entfernt; CDP-Ansatz instabil). Headless Chrome liefert reale CSS/DOM-Semantik, aber keine Extension-Injektion. Alle Aussagen sind als `STATIC`, `HASH`, `MOCK`, `BROWSER`, `DOC` oder `NOT_TESTED` markiert. **Nichts behauptet ohne Beleg.**

**Artefakte (alle unter `audit/verify/shield/`):**

| Datei | Inhalt |
|---|---|
| `SHIELD_REVIEW.md` | dieser Bericht |
| `probe_harness.cjs` | unabhängiger Node-vm-DOM-Harness (Interzeption, Bypässe, FPs, Manifeste, Hash-Nachweise, Performance) |
| `results.json` | maschinenlesbare Rohresultate (≈77 KB, alle Fälle mit Evidenzklasse/Status) |
| `probe_ledger.txt` | Konsolenledger des Harness-Laufs (Exit 0) |
| `browser_probe_css.html` + `chrome_css_dump.html` | Headless-Chrome-155-Probe für Overlay-CSS/Host-Manipulierbarkeit |
| `browser_probe.html` / `browser_probe_submit.html` | vorbereitete, in dieser Umgebung **nicht lauffähige** Submit-Event-Proben (Hang) — Beweis für `NOT_TESTED` |

---

## 1. Executive Result

**Der ursprüngliche Audit-Befund „POST-Navigation umgeht den Chrome-DNR-Preflight“ ist NICHT geschlossen.** Das Content Shield ist eine **UX-Barriere im bereits geladenen Dokument**, keine Sicherheitsgrenze gegen POST-Navigationen. Es läuft erst auf der Zielseite, nachdem die POST-Navigation stattgefunden hat, und lässt sich von einer bösartigen Seite trivial umgehen.

| Kennzahl | Ergebnis |
|---|---|
| Baseline-Interzeption (synthetisches submit-Event, realer Detector) | **7/7 PASS** (das Shield blockt, was es sieht) |
| POST-/Bypass-Fälle mit Sicherheitsverletzung | **6** (BYP-01, -02, -06, -07, -08, -09) |
| Fail-open-Fälle | **2/2** (Engine-Fehler/fehlende Engine → Submit wird durchgelassen) |
| False Positives (Seiten, auf denen das Shield legitime Formulare blockiert) | **10 / 24** geprüfte Fälle (Path-/Query-Regel auf nicht-kuratierten Drittseiten) |
| False Negatives (realistische Phishing-Domains ohne jede Shield-Wirkung) | **7 / 12** (nur 5/12 werden geblockt) |
| Tests | `node --test tests/*.test.cjs` → **21/21 PASS, Exit 0** (reproduziert) — aber reine Fixture-Tests, kein Wirksamkeitsnachweis |
| Hash-Nachweis | `chrome/background.js` und `firefox/background.js` **byte-identisch zum Pre-Remediation-Security-Scan** (15:35 UTC) → alte Blocker unverändert offen |
| Release-Gate | **BLOCKED** |

**Wichtigste neue Befunde:**
1. `form.submit()` / `HTMLFormElement.prototype.submit` umgeht die Capture-Interzeption vollständig (kein `submit`-Event; MDN-dokumentiert + MOCK). Jedes Phishing-Kit kann das.
2. Formulare in Subframes sind ungeschützt (`content_scripts.all_frames: false`).
3. Das Overlay ist **nicht manipulationssicher**: Seiten-JS kann den Host entfernen; Seiten-CSS `#antipisher-shield-root{display:none}` blendet ihn **real in Chrome 155** aus (kein inline `display`, kein `!important`, kein `MutationObserver`/Re-Append).
4. Der Submit-Button kann per `formaction` ein anderes (bösartiges) Ziel setzen — klassifiziert wird nur `form.getAttribute('action')`.
5. Die V2-Pfad-/Query-Regel erzeugt neue FPs (Suchmaschinen/Ratgeber/Foren) und lässt sich über `/docs/`, `/news/`, `/blog/` als FN-Evasion austricksen; kuratierte Marken-Domains (GitHub, Reddit, StackOverflow, Wikipedia, Banken, Shops) sind dagegen durch den Official-Domain-Precheck geschützt.
6. Die WAR-Exposition wurde **ausgeweitet** (interne Skripte wieder web-accessible), obwohl laut MDN Content Scripts kein WAR benötigen — Widerspruch zur behaupteten Manifest-Härtung.
7. `explanation_de` wird **unescaped** in `shadow.innerHTML` interpoliert (latenter DOM-XSS-Sink; derzeit durch URL-Host-Grammatik entschärft).
8. 21/21 Tests prüfen nur ein Fake-Formular mit synthetischem Event — sie können die Bypässe prinzipiell nicht erkennen.

---

## 2. Evidenzklassen & Vorgehen

- `STATIC` — Zeilengenaue Quelltext-/Manifest-/Doku-Analyse (`probe_harness.cjs` → `static_review`, `manifests`, `old_blockers`).
- `HASH` — SHA-256-Vergleich der Produktdateien gegen die **eingefrorenen Pre-Remediation-Snapshots** `audit/security/probes/results/static_scan.json` (15:35:38 UTC) und `manifest_integrity.json` (15:35:29 UTC). Wichtig: `audit/code/results.json` wurde um **18:15:35 von einem Parallel-Agenten neu erzeugt** und enthält inzwischen den Post-Remediation-Zustand — als „Vorher“-Beleg unbrauchbar; der Harness verwendet deshalb ausschließlich die Security-Probe-Snapshots.
- `MOCK` — eigener Node-`vm`-DOM-Stub (eigener Harness, **nicht** die Fixtures der Produkttests): window-Capture-Submit, `form.submit()` ohne Event (Browser-Semantik), `requestSubmit()`, `formaction`, Shadow-DOM/HTML-Parsing, DOMContentLoaded.
- `BROWSER` — Headless Chrome 155 für reale CSS/DOM-Semantik (Overlay-Ausblendbarkeit, Host-Removal); **kein** Extension-E2E.
- `DOC` — externe Hersteller-/Standard-Doku (URLs im Abschnitt 11).
- `NOT_TESTED` — in dieser Session nicht belastbar ausführbar (u. a. echtes Extension-E2E, Firefox-Runtime).

---

## 3. POST-Lücke — Urteil mit Begründung

**Original-Befund:** Audit-B3/CHAIN-002: Chrome-DNR-Regel matcht nur `requestMethods: ['get']` → POST-Hauptnavigationen erreichen die Phishing-Seite ohne Guard. Die Remediation behauptet, das Content Shield schließe diese Lücke (README/Next.md).

**Urteil: `NICHT_GESCHLOSSEN` — nur teilweise UI-Mitigation nach dem Laden der Zielseite.**

| Aspekt | Chrome | Firefox |
|---|---|---|
| Preflight vor POST-Navigation | **Nein** — DNR-Regel `chrome/background.js:27-40` weiterhin `requestMethods: ['get']` (Zeile 37); Datei-Hash **unverändert** | **Ja** — `webRequest.onBeforeRequest` ohne Methodenfilter (`firefox/background.js:17-21`, unverändert) |
| Wirkung des Shields | läuft erst im Ziel-Dokument; kann die stattgefundene Navigation nicht verhindern | dito (Content Script zusätzlich zum Blocking-Listener) |
| Restlücke | POST-Navigation + Detector-FN ⇒ Phishing-Seite lädt ohne Interstitial; Shield warnt frühestens nach DOMContentLoaded (nur Banner) bzw. beim Form-Submit | POST wird prä-request abgefangen, aber beim Fortfahren wird die Ziel-URL per `location.replace()` als **GET** geladen → POST-Body/Formulardaten gehen verloren (`firefox/background.js:14-16`, `shared/guard.js:37`); Runtime/WAR = `NOT_TESTED` |

**Beweisführung:**
- Hash: `chrome/background.js` SHA-256 `c3523551…2e9653` = Pre-Remediation-Wert (`results.hash_evidence`) → **keine Änderung an der DNR-Regel**.
- Der Shield besitzt **keinen Navigations-Hook** (kein `webNavigation`, kein `beforeunload`, kein DNR-Zugriff) — er kann eine bereits gestartete POST-Navigation prinzipiell nicht stoppen.
- Bypass-Matrix Abschnitt 4: selbst der Formularpfad ist per `form.submit()` (kein Event), iframe, `formaction` und Ziel-Änderung umgehbar.

---

## 4. Bypass-Tabelle (POST-/Formularpfad)

| ID | Bypass | Mechanismus | Harness-Ergebnis | Evidenz | Schwere |
|---|---|---|---|---|---|
| BYP-01 | **`form.submit()`** | Browser-nativer Submit feuert **kein** `submit`-Event → `window`-Capture sieht nichts | `ALLOWED` (Submit an `paypa1.com` ohne Prevent/Overlay) | MOCK + DOC (MDN: „the event is not sent to the form when a script calls the form.submit() method directly“) | **HIGH** |
| BYP-02 | `HTMLFormElement.prototype.submit.call(form)` | gleicher Pfad, typisch für Fremd-/Profilcode | `ALLOWED` | MOCK (`results.post_bypass_cases`) | HIGH (gleiche Root Cause wie BYP-01) |
| BYP-06 | Formular im **iframe/Subframe** | `content_scripts.all_frames: false` (`chrome/manifest.json:43`, `firefox/manifest.json:45`) → Shield wird im Subframe nicht injiziert | `ALLOWED` | MOCK (Subframe ohne Shield simuliert) + STATIC | **HIGH** |
| BYP-07 | **`formaction` des Submit-Buttons** | Klassifiziert wird nur `form.getAttribute('action')` (`shield-content.js:34-42`); `event.submitter.formAction` wird ignoriert | `ALLOWED`; tatsächliches Navigationsziel `https://paypa1.com/login`, klassifiziert wurde `/search` | MOCK (Submitter mit `formaction`), STATIC | **MEDIUM-HIGH** |
| BYP-08 | Ziel-Änderung nach Modal + „Trotzdem senden“ | `allowedForms` (WeakSet) wird **vor** der Klassifikation geprüft (`shield-content.js:240`) und bei Fortfahren persistent gesetzt (`:271`); keine Reklassifikation des Ziels | `ALLOWED`; nach Action-Wechsel auf `attacker-collector.example` kein erneutes Overlay | MOCK + STATIC | MEDIUM |
| BYP-09 | **Chrome-DNR-POST-Navigation** | DNR-Regel GET-only, unverändert; Shield läuft erst nach der Navigation | `ALLOWED` (Preflight fehlt) | STATIC + HASH | **HIGH (Produktversprechen KRITISCH)** |
| BYP-03/04/05 | `fetch`/XHR-POST/`sendBeacon` | Shield hat **keinen** Netzwerk-Sink/Hook (statisch: 0 Vorkommen) | Exfiltration nicht verhinderbar | STATIC+MOCK | HIGH für Claim, außerhalb einer reinen DOM-Schutzgrenze |
| BYP-10/11/12 | `window.open`/`location.href`/`meta refresh`, same-origin-fetch-Kits, generell bösartiges Seiten-JS | keine Navigations-/Netzwerkkontrolle; Schutzmodell setzt vertrauenswürdige Seite voraus | `ALLOWED` | STATIC+MOCK | Bedrohungsmodell-Grenze (dokumentieren, nicht als neuer Defekt zählen) |

> **Fazit:** Die einzige Kontrolle ist ein `window`-Capture-Listener auf `submit`. Das ist gegen einen **bösartigen Seiten-JS-Angreifer** keine Sicherheitsgrenze. Für naive, statische Phishing-Formulare (ohne JS) bietet es einen gewissen UX-Schutz — mehr nicht. Die Aussage „POST-Lücke geschlossen“ ist **falsch**.

---

## 5. False-Positive-Praxis (Seiten-URL-Klassifikation bei jedem Submit)

Das Shield klassifiziert bei **jedem** `submit` die **Seiten-URL** (`window.location.href`, `shield-content.js:26-32`) und das **Action-Attribut** (`:34-42`). Die neue V2-Pfad-/Query-Regel (`shared/detector.js:632-670`) liefert `status:'block'` mit `action:'warn'` und Gewicht 88. **Das Shield prüft nur `status === 'block'` und ignoriert `action`** (`shield-content.js:245`) → **Warn-Fälle blockieren Formulare hart**.

### 5.1 Kuratierte Marken-Domains = SAFE (Entwarnung, Korrektur der Auftrags-Hypothese)

Der Official-Domain-Precheck (`detector.js:408-411`) greift vor der Pfadregel. Die im Auftrag vermuteten FPs auf `github.com/paypal/.../login` bzw. `reddit.com/r/paypal/.../login` treten **NICHT** auf. Zusätzlich: Sweep über **273 URLs** (alle 169 Marken × bis zu 4 offizielle Domains, jeweils Pfad `/login`) → **0 Shield-Blockaden** (`results.fp.official_domain_sweep`).

| Geprüfte legitime Seite (Formularseite) | Detector | Shield | Bewertung |
|---|---|---|---|
| `github.com/login`, `github.com/paypal/paypal-js/issues/123` | safe | ALLOWED | PASS |
| `reddit.com/login/`, `reddit.com/r/paypal/comments/…/login_problem/` | safe | ALLOWED | PASS |
| `stackoverflow.com/users/login`, `…/questions/47507937/paypal-login-api` | safe | ALLOWED | PASS |
| `en.wikipedia.org/w/index.php?search=paypal.com+login` | safe | ALLOWED | PASS |
| `chase.com/paypal/login`, `sparkasse.de/redirect?url=https://paypal.com/login`, `amazon.de/s?k=paypal.com+login`, `zalando.de/login/` | safe | ALLOWED | PASS |

### 5.2 Echte FPs auf nicht-kuratierten Drittseiten (Shield blockiert legitime Formulare)

| Seite | Detector | Shield | Kategorie |
|---|---|---|---|
| `duckduckgo.com/?q=paypal.com+login` | `block/warn` path-impersonation | **BLOCKED** | Suchmaschine |
| `lite.duckduckgo.com/lite/?q=paypal.com+login` | `block/warn` | **BLOCKED** | Suchmaschine |
| `search.brave.com/search?q=paypal.com+login` | `block/warn` | **BLOCKED** | Suchmaschine |
| `ecosia.org/search?q=paypal.com+login` | `block/warn` | **BLOCKED** | Suchmaschine |
| `startpage.com/sp/search?query=paypal.com+login` | `block/warn` | **BLOCKED** | Suchmaschine |
| `heise.de/ratgeber/PayPal-Login-…` | `block/warn` | **BLOCKED** | Ratgeber/News |
| `chip.de/ratgeber/paypal-login-…` | `block/warn` | **BLOCKED** | Ratgeber |
| `forum.beispiel.de/threads/paypal-login-…` | `block/warn` | **BLOCKED** | Forum |
| `verbraucherzentrale.de/wissen/paypal-login-…` | `block/warn` | **BLOCKED** | Verbraucherportal |
| `mediamarkt.de/checkout` mit Formular-Action `…/checkout/login?returnUrl=https%3A%2F%2Fpaypal.com%2Fcheckout` | Ziel `block/warn` | **BLOCKED** | Shop-Checkout/OAuth-Muster |

**Wirkung:** Auf solchen Seiten werden **alle** Formulare (Suche, Kommentar, Antwort, Newsletter, Login) blockiert, sobald ihr Submit-Event beobachtet wird. Da der Chrome-Guard dieselbe Klassifikation nutzt (`shared/guard.js:19,59`), erscheint zusätzlich bei jedem GET-Aufruf solcher URLs das Warn-Interstitial (Redirect-all) — kombiniertes FP-Risiko. Ursache ist die Pfadregel: `officialDomainInPath` prüft `pathname + search` (`detector.js:653`), `hasAction` ebenfalls `pathAndQuery` (`:634,643`) → Query-Strings mit `paypal.com` + Wort `login` genügen.

### 5.3 FN-Evasion der Pfadregel (Shield hilft nicht)

`detector.js:635` nimmt Pfade mit `/blog/`, `/news/`, `/article(s)/`, `/docs/`, `/api/`, `/developer/`, `/guide(s)/`, `/tutorials/` von der Pfadregel aus. Ein Angreifer versteckt Marken-Login-Pfade einfach dort:

| Angriffs-URL | Detector | Shield |
|---|---|---|
| `https://evil-phish.example/docs/paypal/login` | **safe** (Ausnahme) | kein Overlay/Banner/Block |
| `https://evil-phish.example/news/paypal/signin` | **safe** | kein Schutz |
| `https://evil-phish.example/blog/chase/verify` | **safe** | kein Schutz |

### 5.4 Wirksamkeitsgrenze: Shield greift nur bei Detector-`block`

`results.efficacy`: Von 12 realistischen Phishing-/Bait-Domains werden **nur 5 geblockt** (`paypa1.com`, `paypalsupport.com`, `g00gle-login.com`, `appleid-apple.com`, `sparkasse-sicherheit.de`). **Nicht** erkannt und damit **ohne jede Shield-Wirkung**: `paypal-rechnung.com`, `paypal-rueckerstattung.com`, `dhl-sendung.de`, `amazon-paket.de`, `netflix-abo.com`, `microsoft-refund.com`, `binance-verifizierung.com`. Die POST-Mitigation hängt vollständig an der im Lead-Audit bereits als lückenhaft belegten Erkennung.

---

## 6. Overlay-Manipulierbarkeit („manipulationssicher / vollständig immun“?)

Behauptung: `Next.md:99` — das Closed-Mode-Shadow-DOM-Interstitial sei „gegen Seiten-CSS und Script-Zugriffe vollständig immun“. **Falsch.** Closed Shadow DOM schützt nur den Inhalt des Shadow-Roots; das **Host-Element** liegt im normalen Seiten-DOM und ist für die Seite vollständig manipulierbar.

| ID | Beobachtung | Evidenz |
|---|---|---|
| OVL-01 | Host `#antipisher-shield-root` ist im Seiten-DOM, an `document.documentElement` angehängt; Shadow-Mode `closed` bestätigt; Inline-Styles nur `position,zIndex,top,left,width,height,pointerEvents` | MOCK (`shield-content.js:46-59,224`) |
| OVL-02 | **Seiten-JS kann den Host jederzeit entfernen** (`document.getElementById(...).remove()`); das Shield hat **keinen** `MutationObserver` und keine Re-Append-Logik | MOCK + STATIC |
| OVL-03 | **Seiten-CSS blendet das Overlay aus**: `#antipisher-shield-root{display:none}` → im **echten Chrome 155** `getComputedStyle(...).display === "none"`, weil das Shield inline **kein** `display` und **kein** `!important` setzt | BROWSER (`chrome_css_dump.html`, Fall `page_css_display_none_wins_without_inline_display`) |
| OVL-04 | Gegenprobe/Fix-Option: `style.setProperty('display','block','important')` gewinnt in Chrome 155 auch gegen Seiten-`!important` (display = `block`) — ein Fix ist möglich, zusätzlich Re-Append nötig | BROWSER (`browser_probe_css.html`) |
| OVL-05 | `z-index: 2147483647` ist kein Schutz: später eingefügte/positionierte Seiten-Overlays zeichnen darüber; `transform/filter` auf `html`/`body` verschiebt den fixed-Containing-Block | STATIC (`shield-content.js:52`) |
| OVL-06 | **Spoofing**: IDs/Styles/Design sind öffentlich (AGPL-Quelle + WAR-exponiert); nach Entfernen des echten Overlays kann die Seite ein täuschend ähnliches „Antipisher“-Overlay anzeigen (Marken-Spoofing gegen das Schutzprodukt) | STATIC |

**Kombinierte Wirkung (siehe CHAIN-103):** Ein Phishing-Kit hängt einen `MutationObserver` an `documentElement`, entfernt/hidet `#antipisher-shield-root` sofort per CSS und ruft `form.submit()` auf — der Nutzer sieht **weder** Warnung **noch** Blockade.

---

## 7. Sichere Darstellung untrusted Daten / DOM-Sinks

| ID | Befund | Evidenz | Bewertung |
|---|---|---|---|
| INJ-01 | `targetUrl` (Formular-Action) wird vor der Interpolation escaped (``${escapeHtml(targetUrl)}``, `shield-content.js:194`); Payload `"><img …>&y=1` erscheint escaped, kein `<img>` im Shadow-HTML | MOCK PASS | positiv |
| INJ-02 | **`explanation_de` wird UNESCAPED in `shadow.innerHTML` interpoliert** (`shield-content.js:190`, Template-Zeile 66): mit dynamischen Verdict-Strings ist DOM-Injection im Shadow-Root möglich (MOCK: `<img src=x onerror=…>` erscheint raw) | MOCK + STATIC | **latenter CWE-79-Sink (LOW-MEDIUM)**; derzeit nicht ausnutzbar, weil der gebündelte Detector statische Texte bzw. `host` einsetzt und der Browser-URL-Parser HTML-Zeichen im Hostname ablehnt (INJ-03: 5 Angriffs-URLs → kein Markup in `explanation_de`) |
| INJ-03 | `site`/`official` sind escaped; `escapeHtml` deckt `& < > " '` ab (`:227-234`) | MOCK | positiv |

**Fix:** unabhängig von der aktuellen Erreichbarkeit **alle** Verdict-Felder escaped rendern (oder `textContent`/DOM-Knoten statt `innerHTML` verwenden). `innerHTML` ist zudem ein CSP/Trusted-Types-Risiko (siehe F-13).

---

## 8. Manifest-/Browser-Review

### 8.1 `content_scripts`

| Prüfpunkt | Chrome | Firefox | Bewertung |
|---|---|---|---|
| `matches` = `http://*/*`, `https://*/*` | `manifest.json:33-36` | `:35-43` | funktional korrekt (alle Web-Seiten); kein `file://`, kein `chrome://` — gewollt |
| `run_at` = `document_start` | `:42` | `:44` | korrekt: Listener vor Seiten-Skripten registriert |
| `all_frames` = `false` | `:43` | `:45` | **bewusste Designentscheidung, aber Sicherheitslücke**: Subframe-Formulare (BYP-06) ungeschützt |
| Ladereihenfolge `sites.js` → `detector.js` → `shield-content.js` | `:37-41` | `:39-47` | korrekt; `globalThis.Antipisher` steht vor Shield zur Verfügung |
| Engine-Handoff im Isolated World | — | — | korrekt (Seiten-JS kann Prototypen im Isolated World nicht patchen); fehlt die Engine, ist der Shield **still inaktiv** (Fail-open, F-11) |
| Doppel-Injektion | — | — | per `globalThis.__ANTIPISHER_SHIELD_ACTIVE__` (`shield-content.js:15-16`) abgewehrt (MOCK: 1 Listener auch nach zweitem Laden) |
| Injektion in Extension-eigenen Seiten (`guard.html`) | — | — | `matches` deckt nur http/https; Guard-Seite (`chrome-extension://`/`moz-extension://`) bleibt unberührt — korrekt |

### 8.2 `web_accessible_resources` — Exposition vs. Notwendigkeit

| Datei | WAR nötig? | Begründung (DOC) |
|---|---|---|
| `guard.html` | **JA** | Chrome-DNR-Redirect auf Extension-Ressource verlangt WAR; Firefox-`webRequest`-Redirect auf Extension-Seite verlangt WAR (MDN, beide Zitate in `results.external_docs`) |
| `guard.js`, `guard.css` | **NEIN** | werden von `guard.html` als Extension-eigene Subressourcen geladen (gleiche Origin), nicht von Web-Seiten |
| `shared/sites.js`, `shared/detector.js`, `shared/shield-content.js` | **NEIN** | Content Scripts benötigen laut MDN **kein** WAR („content scripts don't need to be listed as web accessible resources“) |

**Befund F-09 (MEDIUM): WAR-Exposition wurde gegenüber der Pre-Remediation-Baseline ausgeweitet.**
Vorher (`manifest_integrity.json`, 15:35 UTC): Chrome WAR = `["guard.html"]`, Firefox WAR = `[]`. Jetzt listen **beide** Manifeste zusätzlich `guard.js`, `guard.css` und alle `shared/*.js` (`chrome/manifest.json:46-61`, `firefox/manifest.json:48-63`).

- **Chrome:** Extension-ID ist fest → jede Web-Seite kann `chrome-extension://<id>/shared/detector.js` (bzw. `sites.js`, `shield-content.js`, `guard.js`) per `fetch`/`<script>` laden → **Extension-Fingerprinting**, Offenlegung der Erkennungsregeln/Markenliste, zusätzliche Angriffsfläche (WAR-Ressourcen sind laut MDN **nicht** durch CORS/CSP der Seite blockiert). `use_dynamic_url` wird nicht genutzt.
- **Firefox:** `moz-extension://<random-UUID>` pro Browser-Instanz (MDN) reduziert Fingerprinting, die Dateien bleiben aber prinzipiell web-accessible.
- Widerspruch zur behaupteten „Manifest-Härtung“ und zum früheren Audit-Lob („interne Skripte aus WAR entfernt“); die eigene (veraltete) `ARCHITECTURE_AND_SECURITY_REVIEW.md:113-116` empfahl genau das Gegenteil.
- **Fix:** WAR auf `guard.html` reduzieren (Chrome optional `use_dynamic_url`), Content Scripts ohne WAR betreiben.

### 8.3 Firefox: `data_collection_permissions`, gecko-ID, `strict_min_version`

| Prüfpunkt | Befund | Status |
|---|---|---|
| Schema `browser_specific_settings.gecko.data_collection_permissions` | `{"required":["none"]}` — formal korrekt (MDN: Pflicht für **neue** AMO-Einreichungen ab 03.11.2025) | **STATIC PASS** |
| Zeitliche Verfügbarkeit | Wird erst ab **Firefox 140 Desktop / 142 Android** ausgewertet; `strict_min_version: "128.0"` → auf 128–139 ignoriert. Mozilla verlangt bei Unterstützung älterer Versionen eine eigene Kontrollmöglichkeit; deklariert „none“, kein Netzwerk-Sink nachgewiesen → plausibel, aber **AMO-Review = NOT_TESTED** | STATIC / NOT_TESTED |
| gecko-ID `antipisher@visiongaia.org` | Format gültig; ID-Format ist laut MDN **frei wählbar** („any correctly formatted string can be used“) — **die ID belegt keine Domain-Inhaberschaft**. Vorher war `antipisher@visiongaia.example` (reservierte TLD). Ob `visiongaia.org` tatsächlich dem Team gehört, ist aus dem Repo nicht belegbar und wurde nicht geprüft | **NOT_TESTED / Anspruch unbelegt** |
| `strict_min_version` 128 | Laut MDN für Update-Fähigkeit sinnvoll (115 ESR/128 nach Zertifikatsablauf) | STATIC PASS |

### 8.4 Alte Blocker — Status nach Remediation (Hash-bewiesen)

`chrome/background.js` (SHA-256 `c3523551…`) und `firefox/background.js` (SHA-256 `487efa13…`) sind **byte-identisch** zu den Pre-Remediation-Snapshots (`results.hash_evidence.comparisons`).

| Blocker | Status | Beleg |
|---|---|---|
| **B1** Firefox-Redirect ohne WAR | **statisch behoben** (WAR enthält `guard.html`); Firefox-Runtime-Redirect **NOT_TESTED** | `firefox/manifest.json:48-63`; MDN-Zitat |
| **B2** AMO/`data_collection_permissions` + gecko-ID | Schema statisch behoben; ID-Domain-Inhaberschaft unbelegt; AMO-Einreichung nicht verifiziert | `firefox/manifest.json:64-72`; MDN/Mozilla-Blog |
| **B3** Chrome POST-Lücke | **OFFEN** — DNR GET-only unverändert | `chrome/background.js:37`; Hash |
| **B4** Chrome `regexSubstitution` + `chrome-extension://…#url` | **OFFEN/NOT_TESTED** — von Chrome-Doku nicht als Muster belegt, Browser-E2E fehlt | `chrome/background.js:27-40`; DOC |
| **B5** Erkennungs-FP/FN | **verschoben, nicht behoben** — 169 Marken + Official-Precheck verbessern kuratierte Domains, neue Pfadregel erzeugt FPs (10/24) und FNs (7/12 Bait-Domains + `/docs|/news|/blog`-Evasion) | `shared/detector.js:632-670`; `results.fp`, `results.efficacy` |
| **B6** stilles Fail-open Chrome-`configure()` | **OFFEN** — nur `console.error`, kein Status/UI-Contract | `chrome/background.js:69,70,72,104` |
| **B7** Long-URL-Blocker (>1900 Zeichen) | **OFFEN** — unverändert | `chrome/background.js:49` |
| **B8** Store-/Privacy-Pflichten | **OFFEN/NOT_TESTED** — keine Privacy-Policy-Datei im Repo, keine Store-Einreichung | siehe Abschnitt 9 |
| **Firefox POST-Abfang → GET-Umschreibung** | **OFFEN** — blockiert alle Methoden, wandelt beim Fortfahren in GET, Formulardatenverlust | `firefox/background.js:14-16`; `shared/guard.js:37` |
| **Firefox Bypass-Lifecycle** | **OFFEN** — nur Cleanup bei Tab-Close (`firefox/background.js:22`), kein `webNavigation`-Cleanup | STATIC |
| **Firefox `strictMode` ignoriert** | **OFFEN** — Toggle wirkt auf Firefox nicht (kein `strictMode` im Code) | STATIC |
| Guard-Seite klassifiziert `action:'warn'` wie Block | **OFFEN** — `guard.js:19,59` prüft `status !== 'safe'`, ignoriert `action` → Warn-Fälle erzeugen volles Interstitial | STATIC |

---

## 9. Datenschutz / Store / Betrieb

| Aspekt | Befund | Status |
|---|---|---|
| Content Script auf allen http(s)-Seiten | 3 Skripte, **59.487 Bytes raw / 15.460 Bytes gzip** pro Seitenaufruf (`results.performance`); Node-Parse/Execute-Median ≈ 1,13 ms (kein Browser-E2E) | STATIC/MOCK |
| DOM-Zugriff | `window.location.href` bei jedem Submit; `document.querySelector('input[type="password"]')` **nur** auf `block`-Seiten; **Passwortwert wird nie gelesen** (Mock: 0 value-Reads) | MOCK PASS |
| Netzwerk/Telemetrie | **0** Netzwerk-Sinks in `shared/shield-content.js` (fetch/XHR/beacon/WebSocket/runtime-sendMessage/postMessage/localStorage = 0); Detector/Sites ebenfalls offline | STATIC PASS |
| Persistenz | keine URL-Speicherung im Shield | STATIC PASS |
| Disclosure-Pflichten | Content-Script + Host-Permissions + Browsing-Activity/Website-Content ⇒ CWS-Limited-Use/Privacy-Policy und AMO-`data_collection_permissions` müssen außerhalb des Codes erfüllt werden. Im Repo **keine** `PRIVACY.md`/`privacy.html`; README-Abschnitt „Datenschutz“ (Zeile 49 ff.) ersetzt keine Store-Disclosure. | **NOT_TESTED/offen** |
| Passwort-Manager-Konflikt | Overlay mit `z-index: 2147483647` und DOM-Mutationen kann Autofill-Dropdowns/PW-Manager-UI überdecken; kein Test mit realen Passwort-Managern möglich | **NOT_TESTED** |
| Firefox Daten-Deklaration | `required:["none"]` ist plausibel, da keine Transmission stattfindet; Review durch AMO bleibt offen | STATIC / NOT_TESTED |

---

## 10. Test-Qualität: Prüfen die „21/21 Tests“ echte Sicherheit?

- `node --test tests/*.test.cjs` → **21 tests, pass 21, fail 0, Exit 0** (Node v24.13.0) — reproduziert am 2026-10-18.
- Die **Shield-Tests** (`tests/shield-content.test.cjs`) bestehen aus **3** Tests mit einem `createDOMSandbox`-Fake (Formular-Klasse, synthetischer Event, `triggerSubmit` ruft registrierte Listener direkt auf).
- **Abgedeckt:** genau der Pfad „synthetisches submit-Event auf Fake-Formular → preventDefault/stopImmediatePropagation + Root eingehängt“.
- **Nicht abgedeckt (probes_missing):** `form.submit()`/native Submit, `requestSubmit`-Semantik, `submitter`/`formaction`, iframes/`all_frames`, fetch/XHR/beacon, Overlay-Entfernung/CSS, Fail-open, XSS/Escaping, FP-Korpus, Passwort-Banner-Edge-Cases, Doppel-Injektion, `composed`-Shadow-DOM-Grenze.
- Die Tests laden `shared/*` direkt (gut, keine Build-Kopie), laufen aber **nie in einem Browser** und können die im Audit dokumentierten Bypässe **prinzipiell nicht** erkennen.

**Urteil:** `21/21 PASS` ist **formal korrekt, aber als Sicherheitsnachweis für „POST-Lücke geschlossen“ untauglich** (Fixture-Tests, Test-Theater für den POST-Claim).

---

## 11. Performance / Payload

| Messung | Wert | Evidenz |
|---|---|---|
| Content-Scripts pro Seitenaufruf | 21.547 B (`sites.js`) + 26.949 B (`detector.js`) + 10.991 B (`shield-content.js`) = **59.487 B raw**, 15.460 B gzip | STATIC |
| Parse/Execute in Node-vm (Median von 5) | 1,13 ms | MOCK |
| `classify()` (3000 Samples, 4 typische URLs) | Median 0,0149 ms; p95 1,56 ms; p99 2,10 ms; max 3,97 ms | MOCK |
| `classify`-Aufrufe pro Submit | 2 (Seiten-URL + Action) + 1 bei DOMContentLoaded (Banner) | MOCK |
| Shadow-DOM-Aufbau | nur im Warnfall; kein Observer, kein Timer, keine Intervallkosten | STATIC |
| Speicher | 50 frische Kontexte: ΔHeap ≈ siehe `results.performance.memory_delta_heap_bytes_50_contexts` (grobe Approximation, kein Browser) | MOCK |
| Bewertung | Overhead pro Seite ist real (Content Script überall), pro Submit gering; große FP-Rate verursacht jedoch **Nutzungs-/Vertrauenskosten**, keine reinen Perf-Kosten | — |

---

## 12. Relevante VGT-100-Teilmatrix (Sub-Audit; die vollständige 100er-Matrix führt der Lead)

| VGT-ID | Status | Begründung/Beleg |
|---|---|---|
| VGT-014 XSS/DOM-Sinks | **FAIL** | `explanation_de` unescaped in `shadow.innerHTML` (F-10); übrige Felder escaped; aktuell nicht ausnutzbar → Confidence medium |
| VGT-027 Datenminimierung | **PASS (Code)** | keine Netzwerk-/Persistenz-Sinks im Shield/Detector; nur URL-Klassifikation + Passwortfeld-Existenz; Store-Disclosure separat offen |
| VGT-032 CORS/Browser-Isolation/CSP | **NOT_TESTED** | Styling-Injektion in Shadow-DOM unter strikter Seiten-CSP/Trusted Types nicht im echten Extension-Kontext getestet |
| VGT-034 Open Redirect/URL-Schemata | **FAIL** | DNR-Redirect-all + GET-only unverändert; `regexSubstitution`-Muster browser-nicht-verifiziert; Long-URL-Blocker |
| VGT-061 Fail-Secure State Machine | **FAIL** | Shield fällt bei Engine-Fehler/fehlender Engine still auf „allow“ zurück (FO-01/02); Chrome `configure()` fail-open |
| VGT-063 Race Conditions/TOCTOU | **FAIL** | `allowedForms` + Zielwechsel nach Modal (BYP-08); keine Reklassifikation beim Fortfahren |
| VGT-074 Detection Evasion/Normalization Gaps | **FAIL** | `/docs|/news|/blog`-Ausnahme der Pfadregel; 7/12 Bait-Domains unerkannt |
| VGT-080 FP/FN-Bilanz | **FAIL** | 10 FPs auf legitimen Drittseiten, 3 FN-Evasions, 7/12 realistische Phishing-Domains ungeschützt |
| VGT-086 Plugin-/Erweiterungsarchitektur | **FAIL** | WAR-Exposition ausgeweitet; Broad-Host-Content-Script; Claims vs. Ist |
| VGT-090 A11y-/UX-Sicherheits-Bypass | **FAIL** | Overlay per Seiten-CSS/-JS ausblendbar (BROWSER-belegt); Banner ohne Interaktion; kein Recovery/Schutzstatus |
| VGT-091 Cross-Component Attack-Path-Graph | **PASS (Analyse)** | Ketten CHAIN-101…105 unten dokumentiert |
| VGT-092 Combination Bugs | **PASS (Analyse)** | Kombinationen Overlay-Hide + `form.submit()`, FN + POST-Navigation, WAR + feste ID |
| VGT-095 Patch-Vollständigkeit | **FAIL** | POST-Claim nicht behoben; neue WAR-Regression; alte Blocker unverändert |
| VGT-096 Negative Testing | **FAIL** | Keine Negativ-/Browser-Tests für Bypässe, FP, Fail-open, Overlay-Manipulation |
| VGT-099 Release-Blocker | **FAIL** | Blocker offen; Claims falsch → Release-Gate BLOCKED |

---

## 13. Chain Fusion

| Chain | Knoten | Preconditions | Endwirkung | Breakpoint (Fix) |
|---|---|---|---|---|
| **CHAIN-101** | „POST-Navigation ohne Preflight“ (BYP-09) → „Detector-FN“ (5.3/5.4) → Shield ohne Wirkung | Chrome; Angreifer nutzt POST-Navigation auf nicht erkannte Phishing-Domain | Phishing-Seite lädt ohne Interstitial, keine Warnung/Badge | DNR-Blockregeln für Known-Bad-Domains **aller Methoden**; Detector-FN reduzieren |
| **CHAIN-102** | WAR-Exposition (F-09) + feste Chrome-ID + öffentliche AGPL-Quelle | Angreifer kennt Extension | Fingerprinting + gezieltes Umgehen der Regeln | WAR auf `guard.html` reduzieren, `use_dynamic_url` |
| **CHAIN-103** | „Overlay ausblendbar“ (OVL-02/03) + „`form.submit()`“ (BYP-01) | bösartige Seite | Nutzer sieht weder Warnung noch Block; Credentials gehen per POST raus | Inline-`!important` + Re-Append + **kein** Formular-Submit als einzige Kontrolle (DNR/Navigation) |
| **CHAIN-104** | „Zielwechsel nach Modal“ (BYP-08) + `allowedForms`-Persistenz | Nutzer klickt einmal „Trotzdem senden“ auf einer Seite | spätere Submits an anderes Ziel ohne Reklassifikation | Ziel/Methode beim Fortfahren neu klassifizieren; WeakSet nur einmalig |
| **CHAIN-105** | Engine-Fehler/Fail-open (FO-01/02) + Popup-Claim „aktiv“ | Ladereihenfolge/Fehler | stiller Ausfall des Schutzes | Fail-closed + Statusanzeige/Degraded-Mode |

---

## 14. Findings (priorisiert)

**F-01 (HIGH / KRITISCH für Produktversprechen) — POST-Navigationslücke bleibt offen; Claims falsch.**
`chrome/background.js:27-40` (GET-only, Zeile 37, Hash unverändert) + Shield läuft erst nach Navigation (`shared/shield-content.js:324-325`). `README.md:40-47`, `Next.md:95` behaupten „POST-Schutz/geschlossen“. **Fix:** Claims sofort korrigieren; DNR-Known-Bad-Blockregeln für alle Methoden; Content-Script als Defense-in-Depth deklarieren.

**F-02 (HIGH) — `form.submit()`/Prototype-Submit umgeht die einzige Kontrolle.**
`shared/shield-content.js:237-279` (nur `submit`-Event); Beweis BYP-01/02 + MDN-Zitat. **Fix:** nicht lösbar auf Content-Script-Ebene → Navigation/Preflight (DNR/Firefox-webRequest) + klare Threat-Model-Doku; optionales Erkennen von `form.submit` ist kein Sicherheitsfix.

**F-03 (HIGH) — iframe-Formulare ungeschützt.**
`chrome/manifest.json:43`, `firefox/manifest.json:45` (`all_frames:false`), BYP-06. **Fix:** falls Schutz gewünscht: `all_frames:true` + Top-Frame-Kontext/URL separat klassifizieren (Vorsicht FP), oder explizit als Restrisiko dokumentieren.

**F-04 (MEDIUM, Claims: HIGH) — Overlay nicht manipulationssicher.**
`shield-content.js:46-59,224`; OVL-01…06; BROWSER-Beleg `display:none`. **Fix:** Host-Styles mit `setProperty(...,'important')` inkl. `display:block`, `pointer-events:auto`, `position:fixed`; `MutationObserver` + Re-Append; ID randomisieren; Claims korrigieren.

**F-05 (MEDIUM-HIGH) — `formaction` des Submit-Buttons wird nicht klassifiziert.**
`shield-content.js:34-42` vs. `event.submitter.formAction`; BYP-07. **Fix:** effektives Ziel (Submitter-Override, `formmethod`) klassifizieren und im Modal anzeigen.

**F-06 (MEDIUM) — TOCTOU/`allowedForms`-Persistenz.**
`:24,240,269-277`; BYP-08. **Fix:** Ziel unmittelbar vor dem tatsächlichen Submit neu klassifizieren; Allow nur einmalig konsumieren.

**F-07 (MEDIUM) — FPs durch Pfad-/Query-Regel + Ignorieren von `action:'warn'`.**
`detector.js:632-670`; `shield-content.js:245`; `guard.js:19,59`; 10/24 FP-Fälle. **Fix:** Shield/Guard dürfen nur bei `action==='block'` hart blocken; Pfadregel restriktiver (nur pathname, nur Marke als Pfadsegment, Query ausschließen), FP-Korpus in CI.

**F-08 (MEDIUM) — FN-Evasion und geringe Wirksamkeit.**
`detector.js:635` (Doc-/Blog-Ausnahme), 7/12 realistische Bait-Domains unblockiert. **Fix:** Ausnahme nur bei echter Dokumentations-Domain-Reputation; Bait-Wortliste erweitern; Evasions-Suite.

**F-09 (MEDIUM) — WAR-Exposition ausgeweitet.**
`chrome/manifest.json:46-61`, `firefox/manifest.json:48-63`; nur `guard.html` nötig (DOC). **Fix:** zurückbauen.

**F-10 (LOW-MEDIUM) — Unescaped `explanation_de` im `innerHTML`-Sink.**
`shield-content.js:190`. **Fix:** escapen/`textContent`.

**F-11 (LOW) — Fail-open im Shield und in Chrome-`configure()`.**
`shield-content.js:18-21,26-32,34-42`; `chrome/background.js:69,70,72,104`. **Fix:** fail-closed + sichtbarer Degraded-Status.

**F-12 (LOW) — Passwort-Banner nur bei DOMContentLoaded, nicht klickbar, kein SPA-Support.**
`shield-content.js:281-331`. **Fix:** Observer/Interaktion/Statuskonzept.

**F-13 (LOW/NOT_TESTED) — Styling-Injektion unter Seiten-CSP/Trusted Types.**
Zwei `innerHTML`-Sinks (`:66`, `:296`); in strikten CSP-Seiten kann `<style>` blockiert werden oder TT werfen → Overlay ohne Styles; `preventDefault` ist zu diesem Zeitpunkt bereits erfolgt (stiller Formular-Block). Kein Browser-E2E → **NOT_TESTED**.

**F-14 (INFO) — Doku-/Claim-Integrität.**
`results.docs_claims`: 5 CONFLICT (README POST 2×, Next POST-Lücke, manipulationssicher, vollständig immun), 2 CONFIRMED_WITH_CAVEAT (21/21). Empfehlung: Claims auf „Defense-in-Depth/UX“ zurückstufen.

**F-15 (INFO) — Tests sind Fixtures.**
`tests/shield-content.test.cjs:1-144`; Test-Qualität Abschnitt 10. Empfehlung: Browser-E2E (Playwright/`web-ext`) + Negativtests als Release-Gate.

---

## 15. Test-Ledger (tatsächlich ausgeführt)

| # | Befehl | Umgebung | Ergebnis |
|---|---|---|---|
| 1 | `node --test tests/*.test.cjs` | Node v24.13.0, Repo-Root | **Exit 0**, 21 tests / 21 pass / 0 fail (316 ms) |
| 2 | `node audit/verify/shield/probe_harness.cjs` | Node v24.13.0 | **Exit 0**; generiert `results.json` + `probe_ledger.txt`; 7 Baseline-PASS, 6 Bypass-Violations, 2 Fail-open, 10 FPs, 3 FN-Evasions |
| 3 | `node --check audit/verify/shield/probe_harness.cjs` | Node v24.13.0 | **Exit 0** |
| 4 | Headless-Chrome-CSS/DOM-Probe (`browser_probe_css.html` via `--headless=new --dump-dom`) | HeadlessChrome/155.0.0.0, Windows | **Exit 0**; 5/5 Fälle erhoben (`chrome_css_dump.html`) |
| 5 | Headless-Chrome-Submit-/`composed`-Probe (`browser_probe_submit.html`) | HeadlessChrome 155 | **NOT_TESTED** — Prozess beendet sich nach Formular-Submit in dieser Umgebung nicht (Hang, manuell beendet); keine belastbare Aussage zum `composed`-Flag |
| 6 | Extension-Browser-E2E (Chrome/Firefox) | — | **NOT_TESTED** (kein `--load-extension` in Chrome 155; CDP instabil; kein Firefox auf dem Host) |
| 7 | Firefox-Runtime-Redirect/WAR-Verhalten | — | **NOT_TESTED** |

**Produkt-Hash-Nachweise (`results.hash_evidence`):** `chrome/background.js` = `c3523551…` (unverändert), `firefox/background.js` = `487efa13…` (unverändert), Manifeste/Detector/Sites geändert (erwartet). Build-Kopien `chrome/shared/*` = `firefox/shared/*` = `shared/*` (sync bestätigt; `build.py:31,37,47`).

---

## 16. Restlücken / NOT_TESTED (ehrlich)

1. **Kein Extension-E2E**: reales Chrome-/Firefox-Verhalten (Injektion, Event-Reihenfolge, WAR-Redirect, CSP/Trusted Types) in dieser Session nicht ausführbar.
2. **`submit`-Event `composed`-Flag aus Shadow-Roots** (potenzieller weiterer Bypass, wenn Seiten ihre Formulare in Shadow-Roots kapseln): Browser-Probe hing → nicht verifiziert.
3. **Firefox-Runtime**: WAR-Fix, Redirect-Verhalten, POST→GET-Datenverlust nur statisch belegt.
4. **AMO-/CWS-Review** und Domain-Inhaberschaft `visiongaia.org` nicht prüfbar.
5. **Passwort-Manager-/Autofill-Konflikte** nicht getestet.
6. **Reale Seiten-FP-Quote** außerhalb des 24er-Korpus nicht gemessen (kein Tranco-/Lead-Korpus in diesem Sub-Audit; Lead-Audit liefert Detector-Basisraten).
7. `audit/code/results.json` wurde während der Session von einem Parallel-Agenten neu erzeugt (18:15:35) → als Vorher-Snapshot unbrauchbar; dieser Bericht nutzt ausschließlich die eingefrorenen Security-Probe-Snapshots von 15:35 UTC.

---

## 17. Priorisierte Empfehlungen

1. **Claims korrigieren (sofort):** README/Next.md — POST-Lücke ist **nicht** geschlossen; Shield ist **Defense-in-Depth/UX**, kein Preflight; Overlay **nicht** „vollständig immun“; 21/21-Tests nicht als Wirksamkeitsnachweis.
2. **Preflight für Known-Bad-Domains** via DNR-`block`-Regeln für **alle Methoden** (statisch/dynamisch, 30k-Budget) — das ist der einzige Weg, POST-Navigationen vor dem Laden zu verhindern; Content-Script bleibt ergänzend.
3. **Firefox:** Blocking-Listener behalten, aber POST-Semantik ehrlich lösen (cancel + Erklärung statt POST→GET-Datenverlust); Bypass-TTL/Cleanup schließen; `strictMode` respektieren oder entfernen.
4. **Shield härten (soweit sinnvoll):** `formaction`/`formmethod` klassifizieren; `allowedForms` nur einmalig; Ziel unmittelbar vor Submit neu prüfen; Fail-closed + Status; `explanation_de` escapen; Overlay robust (inline `!important` + MutationObserver/Re-Append); Host-ID randomisieren.
5. **WAR auf `guard.html` reduzieren**; `use_dynamic_url` für Chrome prüfen.
6. **FP/FN:** Shield/Guard nur bei `action==='block'` hart blocken; Pfadregel restriktiver; Bait-Wortliste/Evasion-Suite; FP-Korpus + Browser-E2E in CI.
7. **Store/Privacy:** Privacy-Policy/Limited-Use-Disclosure, AMO-Review, Domain-Inhaberschaft der gecko-ID belegen.
8. **Release-Gate BLOCKED** beibehalten, bis Browser-E2E (POST, WAR, Overlay, FP) nachgeholt und die Blocker-Tabelle abgearbeitet ist.

---

## 18. Quellen (extern, DOC)

- Chrome for Developers — `declarativeNetRequest`: Redirect auf nicht web-accessible Ressource verboten; WAR erforderlich ([Link](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)).
- MDN — `web_accessible_resources`: Content Scripts benötigen kein WAR; WAR-Ressourcen umgehen CORS/CSP und sind ein Risiko ([Link](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)).
- MDN — `webRequest.onBeforeRequest`: Redirect auf Extension-Seite erfordert WAR ([Link](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)).
- MDN — `HTMLFormElement: submit event`: `form.submit()` löst kein `submit`-Event aus ([Link](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event)).
- MDN — `browser_specific_settings`: `data_collection_permissions`-Pflicht ab 03.11.2025; ID-Format frei wählbar ([Link](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)).
- Mozilla Add-ons Blog (2025-10-23): `data_collection_permissions` ab Firefox 140 Desktop/142 Android ([Link](https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/)).

---

**Endurteil:** Die Gemini-Remediation liefert ein funktionierendes **UX-Warn-Overlay für naive Formular-Submits** und behebt statisch die Firefox-WAR-Lücke — sie **schließt die POST-Navigationslücke nicht**, ist gegen bösartiges Seiten-JS trivial umgehbar, erzeugt neue FPs/FNs und erweitert die WAR-Exposition. **Release-Gate: BLOCKED.**
