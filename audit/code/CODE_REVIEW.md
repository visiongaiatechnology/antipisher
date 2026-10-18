# CODE- UND ERKENNUNGS-AUDIT — ANTIPISHER 0.1 (ALPHA)

**Audit-ID:** VGT-AUDIT-CODE-001  
**Modus:** `AUDIT_ONLY` (gemäß VGT Intelligence Master / VGT Security Master; keine Quellcode-Änderung)  
**Datum:** 2026-10-18 (Europe/Berlin)  
**Auditor:** `code-auditor` (Teammitglied unter Lead)  
**Workspace:** `C:\Users\Masterboard\Downloads\VGT-DomainGuard-Source-v0.1.0\vgt-domainguard-src`  
**Zielplattformen:** Google Chrome (MV3), Mozilla Firefox (MV3)  
**Engine:** `shared/detector.js` (362 Zeilen), SHA256 `41bf609836bb480af772413f3f775fe1c44b68a6a07670e3ee91b78ba597baf9`  
**Markendaten:** `shared/sites.js` = `sites-100.json`, 165 Marken / 257 Domains, SHA256 `c814babb5279…`  
**Korpus:** `audit/code/corpus.json` v1.0.1, 184 URLs, SHA256 siehe `audit/code/results.json`

**Zitierte Referenzen dieses Audits**

- `C:\Users\Masterboard\.dsh\skills\vgt-intelligence-master\references\QUALITY_AND_RELEASE.md` (vollständig gelesen)
- `C:\Users\Masterboard\.dsh\skills\vgt-security-master\references\VGT-100.md` (vollständig gelesen)
- MDN `webRequest.onBeforeRequest`: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest>
- MDN `manifest.json/background`: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background>
- MDN `manifest.json/permissions`: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions>
- RFC 3986 §3.5 (Fragment ist nicht Teil des Request-Targets): <https://www.rfc-editor.org/rfc/rfc3986#section-3.5>

**Erzeugte Audit-Artefakte (ausschließlich unter `audit/code/`)**

| Datei | Inhalt |
|---|---|
| `audit/code/corpus.json` | 184 adversarialer URLs mit Erwartungswert, Kategorie, Sicherheitsgrad |
| `audit/code/run_corpus.cjs` | Ausführbarer Korpusläufer + Datenqualitäts-/Manifest-/Performance-Auswertung |
| `audit/code/results.json` | Vollständiges Maschinenergebnis (alle Einträge, FN/FP, Kategorien, Quellidentität, Performance) |
| `audit/code/perf_results.txt` | Performance-Messprotokoll (10.000+-Aufrufe, Median/p95/p99, Behauptungsprüfung) |
| `audit/code/probe_runtime.cjs` | Simulierte Chrome-/Firefox-Runtime-Probes (Mocks, kein echter Browser) |
| `audit/code/runtime_probes.txt` | Probe-Protokoll (16 PASS, 5 WARN, 5 FAIL) |
| `audit/code/build_repro_results.txt` | Experiment zur ZIP-Reproduzierbarkeit der `build.py`-Mechanik |

---

## 0. Source Identity und Bewertungsgrundlage

| Quelle | Befund | Status |
|---|---|---|
| Dateibestand | 44 Dateien (ohne `audit/`), kein `.git`, kein `package.json` | `SOURCE_IDENTITY_CONFIRMED` (quellenmäßig), Provenienz fehlt |
| Version | Chrome/Firefox-Manifest `0.1.0` / `version_name: "0.1 Alpha"`; ZIP-Namen `v0.1.0-alpha`; `Next.md` behauptet `0.1.0-alpha`; README „0.1.0 (Alpha 0.1)“ | `SOURCE_IDENTITY_CONFLICT` (Versionierungsbezeichnung uneinheitlich) |
| Lizenz | `LICENSE` ist tatsächlich **GNU AFFERO GENERAL PUBLIC LICENSE v3** (16 „Affero“-Treffer, Header verifiziert) | PASS |
| In Next.md referenzierte Evidenz | `ARCHITECTURE_AND_SECURITY_REVIEW.md` wird in `Next.md:13` und `Next.md:39` als verifiziertes Artefakt geführt, **existiert im Repo und im Source-ZIP nicht** | **FAIL (Dokumentations-/Evidenzlüge)** |
| Build-Kopien | `shared/*` = `chrome/*` = `firefox/*` (alle 7 Paare SHA256-identisch, siehe `results.json` → `source_identity.build_copies_in_sync`) | PASS (Momentaufnahme; keine automatische Divergenzprüfung) |
| Test-Suite | `node --test tests/*.test.cjs` → 13 pass, 0 fail (Dauer 1068 ms) | PASS (aber nicht ausreichend, siehe §8) |

Bewertungsmaßstab: QUALITY_AND_RELEASE (Proof-before-status, Gate-Reihenfolge, keine erfundenen Ergebnisse) und VGT-100 (jede Grenze mit Status/Evidenz, FN/FP-Bilanz VGT-080, Detection Evasion VGT-074, Release-Blocker VGT-099). Im Rahmen **dieses Code-Audits** wurde kein echter Browser-End-to-End-Lauf durchgeführt (ein separater Team-/Lead-E2E-Lauf ist nicht Teil dieses Artefakts); derartige Punkte sind ausdrücklich als `NOT_TESTED` markiert.

**Keine Quellcode-Änderung:** alle Schreibvorgänge liegen unter `audit/code/`; `shared/`, `chrome/`, `firefox/`, `tests/`, Root-Dateien sind unverändert (Engine-Hash vor/nach identisch).

---

## 1. Executive Summary

Der Erkennungskern ist **funktional vorhanden und technisch sauber implementiert** (Damerau-Levenshtein, Punycode-Decoder, `withinDomain`, Fuzzing ohne Exceptions), aber die **Produktbehauptungen sind durch die Evidenz nicht gedeckt**. Das zeigen die erstmals ausführbaren adversarialen Prüfungen:

- **Korpus:** 184 URLs → **124 pass (67,4 %)**, **60 fail**.
  - **False Negatives:** **33 von 98 erwarteten Blockaden = 33,7 %** (davon 30 mit hoher, 3 mit mittlerer Erwartungssicherheit). Betroffen sind u. a. diakritische IDN-Homographen (`páypal.com`), Marke+Bait-Konkatenationen (`paypalsupport.com`, `secure-paypa1.com`, `paypa1-login.com`), Gmail/Azure/Disney+/Alipay (nicht kuratiert), Kurzmarken-Typos (`vlsa.com`), Zwei-Edit-Tricks (`arnazon.com`), brand-only-userinfo (`paypal@evil.tld`).
  - **False Positives:** **27 von 82 erwarteten Safe-Fällen = 32,9 %** (19 hoch, 8 mittel). Betroffen sind **offizielle Markendomains**, z. B. `google.co.jp`, `microsoft.co.jp`, `ing.nl`, `coinbase.de`, `visa.fr`, `sparkasse.at`, `walmart.ca`, `chase.co.uk`, `github.blog` — sowie `hermes.com` (Hermès) und `elster.com` (Honeywell Elster).
  - Offizielle Selbstregression (alle 257 Domains aus `sites.js` + `www.`/`accounts.`-Varianten): **771 Checks, 0 Fehler** → das Kernproblem ist die **unvollständige Datengrundlage**, nicht die offizielle Whitelist-Logik.
- **Firefox ist funktional gebrochen:** `firefox/manifest.json` enthält **kein `web_accessible_resources`**, obwohl `firefox/background.js:14` per `webRequest` auf `guard.html` umleitet. Laut MDN ist genau das für einen Redirect auf eine Extension-Seite zwingend erforderlich (Beleg in §6). Die Warnseite kann damit im ausgelieferten Firefox-Build nicht als Redirect-Ziel dienen.
- **Chrome ist ein Prototyp mit harten Grenzen:** DNR-Regel deckt nur `GET`-Hauptnavigationen ab (`chrome/background.js:36-37`) → **POST-Navigationen sind ungeschützt** (Gegenteil der README-/Next.md-Behauptung). URLs über 1900 Zeichen können **gar nicht** freigegeben werden (`chrome/background.js:48-49`) → Availability-Blocker. Bei einem Fehler in `configure()` bleibt die Erweiterung **fail-open** ohne DNR-Regel, während die UI „Vorabprüfung aktiv“ anzeigt (`chrome/background.js:26,104`).
- **Performance:** Median der `classify()`-Zeit 0,38–0,53 ms (Behauptung „< 1 ms“ für den Median haltbar), aber **p95 in allen Messreihen ≥ 1 ms** (1,21–3,26 ms), p99 bis 8,15 ms, Kaltstart ≈ 0,93–1,00 ms, langer Host Median 2,75 ms. Die Budgetaussage „< 1 ms Erkennungszeit pro URL“ (`Next.md:33`) ist damit **nicht belastbar**, sondern nur als Median-Aussage.
- **Build nicht reproduzierbar:** Nachbau der `build.py`-Mechanik erzeugt bei zwei Läufen **unterschiedliche ZIP-Hashes** (`shutil.copyfile` überträgt keine mtime, `zipfile.write` übernimmt die neuen Kopier-Zeitstempel). `build.py:27-28/35` erzeugt zusätzlich byteidentische Legacy-ZIPs; es gibt keine Prüfsummen/Signaturen.
- **Dokumentation überzeichnet:** „PLATIN VGT SUPREME“ (`Next.md:71`), „lückenloser Subdomain-Schutz“ (`Next.md:23`), „Chrome DNR POST-Schutz“ (`Next.md:27`), „Manifest-Fingerprinting geschlossen“ (`Next.md:28`), „reproduzierbare Builds“ (`Next.md:31`) sind durch die Befunde **widerlegt bzw. nicht belegt**.

**Qualitätsklassifikation: `SILBER`** (Grundfunktion/Happy Path vorhanden, wesentliche Lücken → **nicht releasefähig**; Details §13).

### 1.1 Top-10-Findings

| # | Severity | Finding | Anker |
|---|---|---|---|
| F-01 | **KRITISCH** | Firefox-WAR-Lücke: Redirect auf `guard.html` ohne `web_accessible_resources` → Schutzseite im Firefox-Build nicht nutzbar | `firefox/manifest.json:1-44`, `firefox/background.js:14` |
| F-02 | **KRITISCH** | Chrome-DNR prüft nur GET → POST-/Formular-Phishing ungeschützt; Doku behauptet das Gegenteil | `chrome/background.js:34-38`, `Next.md:27`, `README.md:13` |
| F-03 | **KRITISCH** | 27 FPs auf legitimen/offiziellen Domains (ccTLDs, `github.blog`, Hermès, Elster) → Nutzer werden von echten Zielen abgehalten | `shared/sites.js:4-21,130-138,940-945`; `shared/detector.js:286-299` |
| F-04 | **KRITISCH** | 33 FNs (33,7 %) in Kern-Phishingklassen: Diakritika, Bait-Konkatenation, Gmail/Azure/Disney+/Alipay, Kurzmarken, 2-Edit, userinfo | §4.6 |
| F-05 | **KRITISCH** | Chrome: URLs > 1900 Zeichen können nie freigegeben werden → jede lange harmlose URL bleibt auf der Schutzseite hängen | `chrome/background.js:48-49`, `shared/guard.js:26-41` |
| F-06 | **HOCH** | Chrome fail-open: Fehler in `configure()` (z. B. `isRegexSupported` negativ) → keine DNR-Regel, nur `console.error`; UI zeigt weiter „aktiv“ | `chrome/background.js:24-26,69-73,104` |
| F-07 | **HOCH** | Diakritische IDN-Homographen (`páypal.com`) werden nicht erkannt: Check 1 verlangt ein Zeichen als Schlüssel der Homoglyph-Tabelle; ASCII-Buchstaben/Diakritika erfüllen das nicht | `shared/detector.js:279` |
| F-08 | **HOCH** | Bait-Erkennung nur bei Bindestrich-Segmenten bzw. benachbarten DNS-Labels; `paypalsupport.com`, `secure-paypa1.com`, `paypa1-login.com` und deutsche/krypto Bait-Wörter (`konto`, `sicherheit`, `zoll`, `airdrop`, `tracking`) fehlen | `shared/detector.js:52-60,302-320` |
| F-09 | **HOCH** | Firefox fängt POST-Hauptnavigationen ab und wandelt sie in GET um → Formulardatenverlust; README behauptet „vollständig nativ unberührt“ | `firefox/background.js:17-21`, `README.md:42` |
| F-10 | **HOCH** | Next.md/README-Overclaims + fehlendes Evidenzartefakt `ARCHITECTURE_AND_SECURITY_REVIEW.md`; 13/13-Tests sind Scheinargument für PLATIN | `Next.md:13,23,27,28,31,39,71`; `README.md:10,13,15` |

---

## 2. Methodik, Reproduktion und Test-Ledger

### 2.1 Ausgeführte Befehle (real, mit Exitcode)

| Befehl | cwd | Exit | Ergebnis |
|---|---|---|---|
| `node --test tests/*.test.cjs` | Repo-Root | 0 | 13 pass / 0 fail / 0 skip, Dauer 1068 ms |
| `node --check shared/detector.js` (analog guard.js, popup.js, chrome/background.js, firefox/background.js) | Repo-Root | je 0 | Syntax OK |
| `node -e "JSON.parse(...)"` für `chrome/manifest.json`, `firefox/manifest.json`, `sites-100.json` | Repo-Root | 0 | alle parsebar |
| `node audit/code/run_corpus.cjs` | Repo-Root | 0 | Korpus 124/184, FN/FP dokumentiert, `results.json` + `perf_results.txt` geschrieben |
| `node audit/code/probe_runtime.cjs` | Repo-Root | 0 | 16 PASS / 5 WARN / 5 FAIL (Mock-basiert) |
| Build-Reproduzierbarkeits-Experiment (Python-Nachbau `build.py:5-24`, `audit/code/build_repro_results.txt`) | Repo-Root | 0 | zwei ZIP-Läufe unterschiedliche SHA256 |

**Umgebungsdaten:** Node v24.13.0, Python 3.14.2, Windows 11 (`win32 10.0.26100`), AMD Ryzen 5 4600H (12 logische Kerne). Während der Performance-Messung liefen parallel weitere Team-Agenten (CPU-Last ~54 %) → p95/p99 streuen; der Median ist die robusteste Kennzahl (siehe §9).

### 2.2 Grenzen dieses Audits (ehrlich markiert)

- **Kein echter Browser-End-to-End-Lauf in diesem Audit** (nicht Teil des Code-Audit-Scopes; ein separater Team-E2E-Lauf existiert zum Auditzeitpunkt nicht als Ergebnisartefakt). Runtime-Aussagen beruhen auf: (a) Codeanalyse, (b) Mock-Simulationen in `probe_runtime.cjs`, (c) offizieller API-Dokumentation. Was nur im echten Browser bewiesen werden kann (Redirect-Ketten, History/Referer, SW-Restart-Races, tatsächliches Firefox-Redirect-Verhalten), ist als `NOT_TESTED` gekennzeichnet.
- Keine externen Scans, keine Netzwerkverbindungen zu Zielen, keine Reputations-/WHOIS-Abfragen. Domain-Eigentumsaussagen (z. B. `google.co.jp` ist offiziell) sind Fachwissen und im Korpus mit Sicherheitsgrad `hoch`/`mittel` versehen.
- Keine Quellcode-Änderung; keine Dateien außerhalb `audit/code/` geschrieben.

### 2.3 Reproduktionsbefehle für alle Kernbefunde

```bash
# 1) Adversarialer Korpus + FN/FP + Performance
python --version && node --version
node audit/code/run_corpus.cjs          # schreibt audit/code/results.json, audit/code/perf_results.txt

# 2) Runtime-/Chrome-/Firefox-Probes
node audit/code/probe_runtime.cjs       # schreibt audit/code/runtime_probes.txt

# 3) Build-Reproduzierbarkeit
#    (Python-Skript aus dem Audit; Ergebnis in audit/code/build_repro_results.txt)

# 4) Bestehende Repo-Tests
node --test tests/*.test.cjs

# 5) Einzelfall-Nachweis (Beispiele)
node -e "require('./shared/sites.js');const d=require('./shared/detector.js');console.log(d.classify('https://google.co.jp/'))"
node -e "require('./shared/sites.js');const d=require('./shared/detector.js');console.log(d.classify('https://paypalsupport.com/'))"
```

---

## 3. Findings im Detail

Schweregrade: **KRITISCH** (Release-Blocker, Schutz/Nutzbarkeit bricht) · **HOCH** (wesentliche Schutzlücke oder Evidenz-/Dokumentationsverstoß) · **MITTEL** (deutliche Einschränkung, Umgehung/Fehlerpfad) · **NIEDRIG** (begrenzte Wirkung) · **INFO**.

### A. KRITISCH

#### F-01 · Firefox: Redirect auf `guard.html` ohne `web_accessible_resources` — Schutzseite nicht nutzbar
- **Datei:Zeile:** `firefox/manifest.json:1-44` (kein `web_accessible_resources`), `firefox/background.js:14` (`api.runtime.getURL('guard.html')` als `redirectUrl`).
- **Befund:** Der Firefox-Listener liefert für blockierte Hauptnavigationen `{redirectUrl: moz-extension://…/guard.html?url=…}`. MDN schreibt für den Redirect einer öffentlichen URL auf eine Extension-Seite zwingend vor: *„the extension's manifest.json file must contain a `web_accessible_resources` key that lists the URL for the extension page.“* Genau dieser Schlüssel fehlt im Firefox-Manifest (Chrome hat ihn korrekt).
- **Evidenz:** `audit/code/probe_runtime.cjs` → `[FAIL] Firefox-Manifest: guard.html ist NICHT in web_accessible_resources …`; `results.json` → `manifest_audit.firefox.web_accessible_resources = null`, `firefox_war_gap = true`.
- **Auswirkung:** Die zentrale Schutz-UI (Warnseite, „Offizielle Seite öffnen“, Allow-once) ist im ausgelieferten Firefox-Build nicht als Redirect-Ziel verfügbar. Statt einer Warnung erhält der Nutzer eine Browser-Fehlerseite oder es greift gar keine Schutzreaktion — die Firefox-Version erfüllt ihre Kernfunktion nicht. **CHAIN-001.**
- **Fix:** `web_accessible_resources` mit `guard.html` (und ggf. den von ihr geladenen Assets) in `firefox/manifest.json` ergänzen, Add-on-ID signieren, dann echten Firefox-E2E-Test (Temporary Add-on) durchführen. Da `guard.html` selbst `guard.css`, `shared/sites.js`, `shared/detector.js` lädt, ist zusätzlich zu prüfen, ob Firefox diese Subressourcen einer Extension-Seite zulässt (Extension-Origin → in der Regel ja; im E2E belegen).

#### F-02 · Chrome: POST-Navigationen umgehen die Vorabprüfung vollständig — Behauptung „POST-Schutz“ ist falsch
- **Datei:Zeile:** `chrome/background.js:34-38` (`condition.requestMethods: ['get']`), `chrome/background.js:30-39` (einzige DNR-Regel); `Next.md:27` („Chrome DNR: Absicherung von HTTP POST“), `Next.md:44` („TASK-06 … DONE_VERIFIED“), `README.md:13` („Chrome MV3 POST-Schutz“), `README.md:42` („Geschützt: POST-Navigationen umgehen den DNR-Redirect“).
- **Befund:** Die DNR-Regel wird ausdrücklich auf GET beschränkt. Jede per Formular/JS ausgelöste **POST-Hauptnavigation** zu einer Phishing-Domain passiert den Browser ungeprüft. Das ist eine bewusste Designentscheidung (POST nicht brechen), wird aber als „POST-Schutz“ verkauft. Tatsächlich ist es eine **Schutzlücke**.
- **Evidenz:** Probe → `[FAIL] Chrome: DNR-Regel deckt nur GET ab … condition.requestMethods = ["get"]`; `results.json` → `static_analysis.chrome_dnr_request_methods_line = "get"`; `chrome-worker.test.cjs:51` prüft deterministisch `['get']`.
- **Auswirkung:** Phishing über auto-submittierte Login-Formulare (POST) wird nicht abgefangen; das ist ein realistischer Angriffsweg (Angreiferseite mit `<form action="https://paypa1.com" method="POST">`). Zusätzlich: die Aussage „Formular-Submissions werden nicht mehr durch die Vorabprüfung beeinträchtigt“ (`README.md:13`) beschreibt einen Bypass als Feature.
- **Fix:** (a) Doku korrigieren: „POST bewusst ungeschützt“; (b) mittelfristig Schutzmechanismus ohne DNR-GET-Zwang (nativer Proxy/DNS-Filter oder Browser-API mit synchroner JS-Prüfung); (c) kurzfristig mindestens Warnung auf `webNavigation`-Ebene nach POST-Commit (best-effort, nachladend), z. B. sofortiges Re-Rendering der Warnseite beim Commit auf blockierte Ziele, auch wenn der Request schon lief.

#### F-03 · 27 False Positives auf legitimen/offiziellen Domains (Akzeptanz-Blocker)
- **Datei:Zeile:** Ursache kombiniert: `shared/detector.js:249-300` (jede nicht gewhitelistete Domain mit Marken-Baselabel wird als `foreign-domain` geblockt), `shared/detector.js:286-299`, sowie unvollständige Domainlisten in `shared/sites.js` (Google `sites.js:4-21` ohne `google.co.jp`, Microsoft `sites.js:130-138` ohne `microsoft.co.jp`, ING `sites.js:940-945` nur `.de/.com`, Coinbase `sites.js:1043-1048`, Visa `sites.js:1189-1194`, Sparkasse `sites.js:919-924`).
- **Befund:** Sobald das Baselabel exakt der Marke entspricht und die Domain nicht in der Whitelist steht, wird hart blockiert. Offizielle ccTLDs/Properties, die in der Liste fehlen, sind damit **Falschpositive auf echten Markenwebsites**. Beispiele aus dem Korpus: `google.co.jp`, `microsoft.co.jp`, `ing.nl`, `coinbase.de`, `visa.fr`, `sparkasse.at`, `google.com.mx`, `google.com.ar`, `amazon.se`, `walmart.ca`, `walmart.com.mx`, `bestbuy.ca`, `vodafone.it`, `dhl.co.uk`, `chase.co.uk`, `github.blog`, `pinterest.co.uk`, `microsoft.de`, `wikipedia.de`; zusätzlich Markenkollisionen `hermes.com` (Hermès) und `elster.com` (Honeywell Elster).
- **Evidenz:** `audit/code/results.json` → `false_positives` (27 Einträge, 19 hoch/8 mittel); Probe: `d.classify('https://google.co.jp/') → {status:'block', reason:'foreign-domain', site:'Google'}`.
- **Auswirkung:** Nutzer werden von echten Google-/Microsoft-/ING-/Walmart-/DHL-Seiten abgehalten; das untergräbt Vertrauen in den Schutz und erzeugt Supportfälle. Für ein Sicherheitsprodukt ist die Blockade offizieller Markenziele ein Release-Blocker (VGT-080, VGT-099).
- **Fix:** (a) Domain-Listen um offizielle ccTLDs/Properties erweitern (Google, Microsoft, Amazon, Walmart, Vodafone, DHL, Chase, GitHub …); (b) Whitelist-Prüfung nicht nur gegen exakte Domain, sondern gegen **eTLD+1 der Marke** und offizielle Subdomains; (c) optional `officialDomains`-Feld mit eTLD+1 und Dokumentation; (d) FP-Melde-/Recovery-Pfad („Diese Seite ist offiziell“ mit Ausnahme, siehe VGT-075).

#### F-04 · 33 False Negatives (33,7 %) in Kern-Phishingklassen
- **Datei:Zeile:** siehe Einzelbefunde F-07/F-08/F-12/F-13/F-14; Sammelnachweis `audit/code/results.json` → `false_negatives`.
- **Befund (Auszug, alle mit Korpus-URL belegt):**
  - Diakritische Homographen: `páypal.com`, `paypál.com`, `góogle.com`, `ámazon.com`, `micrósoft.com`, `applé.com` → `safe`.
  - Bait-Konkatenation/ohne Trennzeichen: `paypalsupport.com`, `secure-paypa1.com`, `paypa1-login.com`, `paypalverify.com`, `netflixbilling.com`, `dhl-tracking.com`, `sparkasse-sicherheit.de`, `paypal-konto.de`, `metamask-airdrop.com`, `dhl-zoll.com`, `microsoft365-login.com`, `amazonprime-login.com`, `appleid-login.com` → `safe`.
  - Nicht kuratierte Marken: `gmial.com`, `gmai.com`, `gmail-login.com`, `azure-login.com`, `disneyplus-login.com`, `alipay-login.com` → `safe`.
  - Kurzmarken-Typos (Gate `brand.length >= 5`): `vlsa.com`, `v1sa.com`, `wlse.com`, `ubr.com` → `safe`.
  - Zwei-Edit-Tricks: `arnazon.com`, `rnicrosoft.com` → `safe`.
  - userinfo-Täuschung: `paypal@evil.tld` → `safe`.
  - Generische Subdomain-Ausnahme: `office.attacker.com` → `safe`.
- **Evidenz:** `results.json`; die im Auftrag explizit genannten Beispiele `paypa1-login.com`, `secure-paypa1.com`, `paypalsupport.com` sind **nachweislich unerkannt**.
- **Auswirkung:** Das Produkt schützt nicht gegen mehrere der häufigsten Phishing-Muster; „lückenlos“ (`Next.md:23`) ist widerlegt.
- **Fix:** siehe F-07/F-08/F-12/F-13/F-14 sowie Upgrade-Pfad §13.

#### F-05 · Chrome: URLs > 1900 Zeichen sind dauerhaft nicht freigebbar (Availability-Blocker)
- **Datei:Zeile:** `chrome/background.js:48-49` (`if(regexp.length>1900) throw Error('Adresse zu lang für eine einmalige Freigabe')`); Fehlerpfad `shared/guard.js:26-41`.
- **Befund:** Für jede Navigation erzeugt der Guard eine Session-Allow-Regel mit `regexFilter = '^' + escaped(URL) + '$'`. Überschreitet der Regex 1900 Zeichen, wird ein Fehler geworfen. Im strikten Modus wird **jede** Hauptnavigation zunächst auf `guard.html` umgeleitet; bei als „safe“ klassifizierten langen URLs ruft `guard.js` automatisch `go(target,false)` auf, erhält `{ok:false, error:'Adresse zu lang…'}` und zeigt einen Fehlerbanner — die Zielseite wird nie geladen. Bei blockierten Zielen ist der „dennoch fortfahren“-Pfad ebenfalls tot.
- **Evidenz:** Probe → `[FAIL] Chrome: URL laenger als 1900 Zeichen kann nicht freigegeben werden … {"ok":false,"error":"Adresse zu lang für eine einmalige Freigabe"}`; zusätzlich `results.json` → `static_analysis.chrome_allow_regex_length_limit = "1900"`.
- **Auswirkung:** Viele reale URLs (OAuth-Redirects, Analytics-Kampagnen, Such-/Tracking-URLs, signierte CDN-URLs) überschreiten 1900 Zeichen. Betroffene Nutzer können diese Seiten im strikten Modus nicht öffnen; wiederholte Reloads erzeugen denselben Fehler (Self-DoS, **CHAIN-004**).
- **Fix:** Anderen Allow-Mechanismus wählen (z. B. `urlFilter`/exakte URL, `allowAllRequests` tab-gebunden für genau eine Navigation, Random-Token im Guard-State mit Session-Rule ohne URL-Bedingung und Sofort-Löschung beim Commit; Rest-Risiko im Fix dokumentieren und testen). Zusätzlich Chrome-Grenzen (2-KB-`regexFilter`) in der Doku nennen.

### B. HOCH

#### F-06 · Chrome fail-open bei `configure()`-Fehler
- **Datei:Zeile:** `chrome/background.js:24-26` (`isRegexSupported` → `throw`), `:40` (`updateDynamicRules`), `:69-73`/`:104` (`configure().catch(console.error)`).
- **Befund:** Schlägt `configure()` fehl (z. B. `isRegexSupported` negativ, API-Fehler, unerwartete Exception), wird der Fehler nur geloggt. Es existiert dann **keine DNR-Regel** → sämtliche Navigationen laufen ungeprüft; `strict` bleibt `true`, das Popup zeigt die Vorabprüfung als aktiv. Das ist ein Fail-open entgegen dem Dateikommentar „fail-closed preflight gate“ (`chrome/background.js:1`).
- **Evidenz:** Probe → `[FAIL] … dynamicRules=0, console.errors=["Error: DNR regex unsupported: test-regex-unsupported"]`.
- **Fix:** Bei Konfigurationsfehler Schutzstatus persistieren (`storage.local.set({protectionHealthy:false})`), UI deutlich warnen, Retry mit Backoff, ggf. reduzierte statische Blockliste als Fallback; Startreihenfolge so, dass ein fehlendes Regel-Set als sichtbarer Fehlerzustand gilt (VGT-061).

#### F-07 · Diakritische IDN-Homographen werden nicht erkannt
- **Datei:Zeile:** `shared/detector.js:278-283`, insbesondere `:279` (`sk === brandSkeleton && [...original].some(ch => hasOwnProperty(homoglyphs, ch))`), `shared/detector.js:123-130` (`skeleton` entfernt `\p{M}`).
- **Befund:** Für `páypal.com` ist `skeleton('páypal') = 'paypal' = skeleton('paypal')`, aber der Zusatztest verlangt, dass mindestens **ein Zeichen des Labels als Schlüssel in der Homoglyph-Tabelle** existiert. Nach NFKD ist `á` in `a` + U+0301 zerlegt; U+0301 (\p{M}) wird entfernt, `a` ist ASCII und **kein Tabellenschlüssel** → Check schlägt fehl → `safe`. Gleiches Muster für `paypál`, `góogle`, `ámazon`, `micrósoft`, `applé`. Der Code prüft implizit nur Tabellen-Homoglyphen, nicht „Skeleton-Gleichheit ohne Tabelleneintrag“.
- **Evidenz:** Korpus-Kategorie `homoglyph-diacritic` → 6/6 FN; Probe `d.classify('https://paypál.com/') → safe`.
- **Auswirkung:** IDN-Homograph mit Akzent ist ein klassischer, registrierbarer Angriff (`xn--paypl-0qa.com` etc.), der optisch kaum unterscheidbar ist; die Erweiterung schützt nicht.
- **Fix:** Regel ergänzen: Wenn das dekodierte Label **nicht-ASCII** ist UND `skeleton(original) === brandSkeleton` → `unicode` blockieren (unabhängig von Tabellenzugehörigkeit). Zusätzlich Mixed-Script-Erkennung (Script-Sets) und UTS-39-Confusables als Datenquelle (nicht handgepflegte Tabelle). FPs gegen legitime Marken mit Akzent (z. B. `café.com` bei Marke `cafe`) prüfen.

#### F-08 · Bait-Erkennung: Konkatenation und nicht-englische/deutsche Bait-Wörter fehlen
- **Datei:Zeile:** `shared/detector.js:52-60` (Wortliste), `:302-308` (nur `original.split('-')`-Segmente), `:310-320` (nur benachbarte DNS-Labels).
- **Befund:** `credential-bait` wird nur erkannt, wenn die Marke ein **eigenes Bindestrich-Segment** ist und ein Bait-Wort ebenfalls ein Segment/Label. `paypalsupport.com` (Marke+Bait im selben Label), `secure-paypa1.com` (Leet-Marke als Segment), `paypa1-login.com` (Leet-Marke + Bait) sind unerkannt; ebenso fehlen in der Wortliste deutsche Begriffe (`konto`, `sicherheit`, `zoll`, `paket`, `sendung`, `kundenservice`, `zahlung`, `rechnung`, `passwort`, `anmelden`) und Krypto-Begriffe (`airdrop`, `seed`, `phrase`, `bonus`, `prize`, `withdrawal`). Der Typosquat-Check läuft zudem nur auf dem Baselabel (`:323`), nicht auf Subdomain-Labels.
- **Evidenz:** Korpus `bait-combination`: 13/22 FN, darunter die drei im Auftrag genannten URLs; `dhl-tracking.com`, `sparkasse-sicherheit.de` u. a.
- **Fix:** (a) Wortliste mehrsprachig erweitern und als Datenfile pflegen; (b) Matching auf **allen** Labels: Marke als Substring-Präfix/Suffix + Bait-Wort im selben Label (z. B. `paypal(support|verify|secure|login…)`); (c) Leet-/Homoglyph-Normalisierung auch auf Segmente anwenden; (d) Subdomain-Labels in den Typosquat-Check einbeziehen.

#### F-09 · Firefox fängt POST-Hauptnavigationen ab und verändert Semantik/Formulardaten
- **Datei:Zeile:** `firefox/background.js:17-21` (`types:['main_frame']`, kein Methodenfilter), `:8-16`.
- **Befund:** Der `webRequestBlocking`-Filter unterscheidet keine HTTP-Methoden. Eine POST-Hauptnavigation auf eine als verdächtig klassifizierte Domain wird abgebrochen und auf die Warnseite umgeleitet; beim „Proceed“ navigiert `guard.js` per `location.replace` (GET) → **Formulardaten gehen verloren**. `README.md:42` behauptet dagegen „Vollständig nativ unberührt“.
- **Evidenz:** Probe → `[FAIL] Firefox: Listener filtert NICHT nach HTTP-Methode …`; Mock: POST-Navigation liefert `redirectUrl`.
- **Fix:** Entweder POST-Navigationen bewusst durchlassen (wie Chrome) und Doku korrigieren, oder POST korrekt behandeln (Original-Request nach Freigabe mit `requestBody` rekonstruieren ist mit WebExtensions nicht möglich → Warnung nach Commit). Mindestens: ehrliche Dokumentation + Test.

#### F-10 · Dokumentation/Evidenz überzeichnet; fehlendes Artefakt
- **Datei:Zeile:** `Next.md:13` + `:39` (nicht existierendes `ARCHITECTURE_AND_SECURITY_REVIEW.md`), `Next.md:23` („Lückenloser Subdomain-Schutz“), `:27` (POST-Schutz), `:28` (Fingerprinting geschlossen), `:31` (reproduzierbare Builds), `:33` (<1 ms), `:71` („PLATIN VGT SUPREME“); `README.md:10` („lückenlos … zuverlässig“), `:13`, `:15`; `Next.md:70` („13/13 PASS (422 ms)“ — aktuelle Laufzeit 1068 ms, Aussage nur zum Zeitpunkt).
- **Befund:** Die genannten Gates sind durch dieses Audit widerlegt bzw. nicht belegt; ein als verifiziert geführtes Dokument fehlt komplett. QUALITY_AND_RELEASE „proof-before-status“ ist damit verletzt.
- **Fix:** `Next.md` auf tatsächlichen Stand zurücksetzen (Status SILBER, offene Blocker), Overclaims entfernen, `ARCHITECTURE_AND_SECURITY_REVIEW.md` entweder anlegen oder Referenzen streichen; Claims nur mit reproduzierbarem Befehl + Ergebnis führen.

### C. MITTEL

#### F-11 · Chrome: Redirect-Ketten und Gate-Schleifen (Fragment-/History-/Referer-Risiko)
- **Datei:Zeile:** `chrome/background.js:14-41` (DNR-Redirect aller GET-Hauptnavigationen), `:44-65` (Allow-once nur exakte URL), `:75-78` (Commit löscht Allow); `shared/guard.js:26-41,50-54` (Auto-Weiterleitung bei `safe`); Kommentar `chrome/background.js:47` („DNR compares network URLs without fragments“).
- **Befund:** Nach einer Allow-once-Freigabe matcht die Regel **nur exakt die ursprüngliche URL** in genau diesem Tab. Jede Server-Weiterleitung (`http→https`, `example.com→www.example.com`, 301/302) erzeugt eine **neue** Hauptnavigation, die wieder von der DNR-Regel abgefangen wird → erneuter Guard-Zwischenschritt mit Auto-Freigabe (bei Safe) bzw. ggf. erneuter Warnung (bei Block). Mehrfach-Redirects erzeugen entsprechend viele Interstitials; bei abweichender URL-Normalisierung ist ein Livellock-Szenario denkbar. Zusätzlich: Fragmente sind nicht Teil des Netzwerk-Requests (RFC 3986 §3.5); der Code kommentiert selbst, dass DNR ohne Fragmente vergleicht → Deep-Links/Fragment-State können verloren gehen. History-Einträge, Referer-Header und Login-Flows sind betroffen (README:61 räumt das teilweise ein).
- **Evidenz:** Code + Mock (Allow-Regex enthält kein Fragment); **echter Browser: `NOT_TESTED`**.
- **Fix:** E2E-Tests mit Redirect-Ketten (http→https, www, Login-Flows) in Chrome; Guard-Interstitial für bereits als safe klassifizierte Navigationsketten vermeiden (z. B. Domain-Token statt Exact-URL, kurze TTL, Kettenbewusstsein), Fragment-Erhalt explizit testen und dokumentieren. Die Architektur „JavaScript-Klassifikation hinter DNR-Redirect“ bleibt grundsätzlich ein Prototyp (README:45 sagt das selbst).

#### F-12 · Kurzmarken und Brand-/Domain-Mismatches unterlaufen den Typosquat-Check
- **Datei:Zeile:** `shared/detector.js:323` (`brand.length >= 5`), `:322-329`; `shared/sites.js` Marken mit <5 Zeichen; Brand/Label-Mismatches: Mail.ru `sites.js:656-661` (brand `mailru`, Domain `mail.ru`), Crypto.com `:1085-1090` (`cryptocom`/`crypto.com`), BondID `:1236-1242` (`bundid`/`id.bund.de`), Gov.uk `:1244-1249` (`govuk`/`gov.uk`), Bluesky `:78-84` (`bluesky`/`bsky.app`).
- **Befund:** 34 der 165 Marken sind kürzer als 5 Zeichen → DL-1-Typosquat wird komplett übersprungen (u. a. Visa, DHL, UPS, eBay, Uber, Lyft, Wise, ING, N26, Citibank, HSBC, Box, Zoom, Otto, Temu, VK, npm, PyPI). Bei den 5 Mismatches vergleicht der Typosquat-Check die Marke (`mailru`) mit dem Baselabel (`mail`), was strukturell nie matchen kann. `vlsa.com`, `v1sa.com`, `wlse.com`, `ubr.com` sind die belegten Fälle.
- **Evidenz:** `results.json` → `data_quality.short_brands_typosquat_excluded` (34), `brand_label_mismatches` (5); Korpus `short-brand-typosquat` 4/4 FN.
- **Fix:** Typosquat für Marken ab 3–4 Zeichen mit strengeren Regeln erlauben (nur Substitution/Transposition, keine Deletion/Insertion, plus Reputations-/Sichtbarkeitskontext); Typosquat-Vergleich gegen **alle registrierbaren Labels der offiziellen Domains** führen (nicht gegen `brand`); Mismatches korrigieren (z. B. `brand: "mailru"` → zusätzliche Alias-Liste).

#### F-13 · Zwei-Edit-Typos und userinfo-brand-only unerkannt
- **Datei:Zeile:** `shared/detector.js:132-169` (DL nur Distanz 1), `:207-223` (userinfo verlangt vollständige Domain oder `brand + '%2e'`).
- **Befund:** `arnazon.com`/`rnicrosoft.com` („rn“ statt „m“, 2 Edits) sind unerkannt. `paypal@evil.tld` (Marke nur im Benutzernamen, ohne Domain) wird nicht geblockt; gleichzeitig erzeugt die Substring-Prüfung FPs (F-16).
- **Evidenz:** Korpus `two-edit-typosquat` 2/2 FN, `userinfo-deception` 1/5 FN.
- **Fix:** Gezielte Heuristiken: `rn→m`, `vv→w`, `cl→d`, `ii→u` etc. als Skeleton-Normalisierungen; userinfo-Token-Check: Marke als eigenständiges Token im Benutzernamen (z. B. `^brand([^a-z]|$)` bzw. Endung) blockieren.

#### F-14 · Subdomain-Typos, generische Subdomains und Multi-Tenant-Listen lückenhaft
- **Datei:Zeile:** `shared/detector.js:271-330` (Typosquat nur `isBase`), `:322-329`, generische Ausnahme `:49,294`, Multi-Tenant-Liste `:63-67`, `:246-248`.
- **Befund:** `paypa1-login.evil.test`, `appleid.evil.test`, `microsoft365.evil.test`, `gmail.evil.test` sind unerkannt, weil der Typosquat-Check nur das Baselabel prüft und `credential-bait` eine exakte Marken-Segmentübereinstimmung verlangt. Die bewusste Ausnahme `genericSubdomains` (office, line, medium, zoom, notion, target) verhindert zudem `office.attacker.com` (Microsoft 365) — Widerspruch zum „lückenlosen Subdomain-Schutz“. Die Multi-Tenant-Liste ist unvollständig (z. B. `web.app`, `glitch.me`, `repl.co`, `wixsite.com`, `weebly.com`, `herokuapp.com`) und der 3-Label-Eintrag `s3.amazonaws.com` kann in `domainBaseIndex()` nie greifen, weil dort nur die letzten zwei Labels verglichen werden (`:176-179`).
- **Evidenz:** Korpus `generic-subdomain-policy` (office.attacker.com FN), Probe-/Codeanalyse; `results.json`.
- **Fix:** Subdomain-Labels in alle Checks einbeziehen (nicht nur `isBase`); generische Ausnahme nur im Zusammenhang mit echten offiziellen Domains und mit Bait-/Typosquat-Prüfung kombinieren; Multi-Tenant-Daten aus Public-Suffix-Liste (PSL) beziehen; 3-Label-Suffixe korrekt behandeln.

#### F-15 · Chrome-Radar: Service-Worker-Restart, Races, Zählerlogik
- **Datei:Zeile:** `chrome/background.js:8-11` (In-Memory `pending`/`observerBypass`), `:16-20` (Start räumt Session-Regeln), `:50-59` (zweite Allow-Regel ersetzt erste), `:61-65`, `:74-78`, `:88-102`; `:104` (`configure()` bei jedem SW-Start).
- **Befund:** `pending`-Map und `counter` leben nur im Service Worker. Startet der SW zwischen `allow-once` und Commit neu, entfernt `configure()` alle Session-Regeln ≥ 10001 → die Freigabe ist weg; die Navigation wird erneut gegatet (mögliche Schleife, wenn der Nutzer erneut freigibt). Zwei parallele Freigaben im selben Tab überschreiben sich (`old`-Entfernung). `onCommitted` löscht `pending` bei **jedem** Commit im Tab, nicht nur beim Ziel-Commit. Der Zähler `blocked` wird im strikten Modus nur bei „Proceed“ inkrementiert (`recordBlock`), im Reduced Mode dagegen bei jeder Umleitung — Metrik ist inkonsistent (`:84-86`, `:96-99`). Der Race ist in Mocks nicht abgedeckt und im echten Browser `NOT_TESTED`.
- **Fix:** Zustand persistieren (z. B. `chrome.storage.session`) oder Allow-Regel mit kurzer TTL + Cleanup-Alarm; Commit-Nachricht mit Request-URL abgleichen; Zähler-Semantik definieren und dokumentieren.

#### F-16 · `sites.js`-Datenqualität: generische Wörter erzeugen FP-Risiko, Abdeckung dünn
- **Datei:Zeile:** `shared/sites.js` gesamt; `genericSubdomains` nur `shared/detector.js:49`; 165 Marken/257 Domains; 109 Marken mit genau einer Domain; 34 Kurzmarken; 5 Brand/Label-Mismatches; 66 Domains mit ccTLD-Endung.
- **Befund:** Generische Wortmarken (`box`, `signal`, `wise`, `booking`, `chase`, `apple`, `visa`, `steam`, `hermes`, `elster`, `otto`, `asana`, `stripe`, `line`, `target` …) werden als Subdomain-Label hart geblockt; nur 6 Wörter stehen in `genericSubdomains`. Das erzeugt FPs auf legitimen Drittseiten (`box.mycompany.com`, `hermes.com`, …) bzw. erzwingt willkürliche Ausnahmen. Die Domainabdeckung pro Marke ist gering (Ø 1,56 Domains) — offizielle ccTLDs/Properties fehlen systematisch (siehe F-03). Fehlende Top-Marken (Gmail, Azure, Disney+, Alipay, Venmo, Cash App, Zelle, Proton, GMX, web.de, Deutsche Bahn, Lufthansa, DM/REWE/Aldi …) sind nicht abgedeckt.
- **Evidenz:** `results.json` → `data_quality`; Korpus `brand-coverage-gap` 6/6 FN; FP-Liste.
- **Fix:** Marken-Daten als kuratiertes, versioniertes Datenfile mit Quellenangabe; pro Marke offizielle eTLD+1-Liste inkl. ccTLDs; generische Wörter separat behandeln (nur in Kombination mit Bait/Subdomain-Whitelist); Update-/Signaturprozess (VGT-058/076); Redaktionstests (Duplikate, Eigentum, ccTLD-Abdeckung).

#### F-17 · Performance-Budget-Aussage nicht belastbar; Hot Path ohne Caching
- **Datei:Zeile:** `shared/detector.js:249-256` (`skeleton(brand)` wird **pro classify und pro Site** neu berechnet), `:271-329` (Label-Schleife je Site), `:184` (`new Set([...])`-Allokation pro `domainBaseIndex`-Aufruf), `Next.md:33`.
- **Befund:** Median 0,38–0,53 ms, **p95 1,21–2,84 ms**, p99 bis 8,15 ms, Kaltstart 0,93–1,00 ms, langer Host Median 2,75 ms. Die Aussage „< 1 ms Erkennungszeit pro URL“ gilt nur für den Median, nicht für Tail-Latenz/Kaltstart. Ursache: 165-fache Skeleton-Berechnung der Marke pro Aufruf und mehrfaches Skeleton je Label/Site.
- **Fix:** `brandSkeleton` einmalig beim Modul-Laden vorberechnen; `decoded`-Skelette pro Label cachen; Vorindex nach erstem Zeichen/Länge der Marken; frühzeitiger Ausstieg für offensichtlich unähnliche Labels; Performance-CI mit Median/p95-Threshold.

#### F-18 · Build: nicht reproduzierbar, Legacy-Duplikate, keine Integrität
- **Datei:Zeile:** `build.py:5-24` (`shutil.copyfile` + `zipfile.write`), `:27-28` (Legacy-Kopie), `:30-35` (Source-ZIP aus komplettem Root inkl. potenzieller Audit-/Temp-Dateien), `:16-19` (nur Existenz-Asserts), `:20`/`:30` (Versionsstrings hartkodiert); `Next.md:31`.
- **Befund:** Experiment: zwei Builds derselben Quellen erzeugen unterschiedliche ZIP-SHA256 (Beleg `build_repro_results.txt`); Ursache sind die per `copyfile` aktualisierten mtimes der Build-Kopien, die in die ZIP-Einträge übernommen werden. Legacy-ZIPs sind byteidentisch mit den neuen (unnötige Doppelartefakte). Es gibt keine Prüfsummen/Signaturen/Provenance. Das Source-ZIP würde nach einem Build auch `audit/code/*` enthalten (kein Exclude). Versionen: Manifest `0.1.0` vs. ZIP `v0.1.0-alpha` vs. Next.md `0.1.0-alpha` — keine Single Source of Truth.
- **Fix:** Deterministische Zips (feste Timestamps/`SOURCE_DATE_EPOCH`-äquivalent, `copyfile`-mtime-Problematik vermeiden z. B. `copy2` + feste Zeitstempel), SHA256SUMS + signierte Releases, Version zentral (z. B. `version.json`) und Build-Assert, Legacy-ZIPs entfernen, Source-ZIP mit klarer Include-Liste.

#### F-19 · Tests: 13/13 PASS, aber keine Negativ-, FP-, Performance- oder Manifest-Tests; Kopien-Kopplung
- **Datei:Zeile:** `tests/detector.test.cjs:8-17` (`>= 100 Marken` statt 165), `:96-117` (kuratierte Benign-Liste, aber keine systematischen FPs), `tests/chrome-worker.test.cjs:46-74` (Mock, keine Lang-URL/Fail-open/Sender-Negativtests), `tests/firefox-worker.test.cjs:22-36` (kein WAR-Test — hätte F-01 gefangen), allgemein fehlen: Diakritika, Bait-Konkatenation, Kurzmarken, Zwei-Edit, userinfo-Substring-FP, Redirect-Ketten, SW-Restart, POST-Verhalten, Performance.
- **Befund:** Die Tests laufen teils gegen `../shared`, teils gegen die **Build-Kopien** `../chrome`/`../firefox` (Worker-Tests). Ändert sich `shared/`, ohne dass `build.py` läuft, können Tests auf veralteten Kopien grün bleiben (Schein-Pass-Risiko). Es gibt keine Assertion, dass Kopien byteidentisch sind; kein CI, kein Linter, keine SAST/SCA.
- **Fix:** Tests einheitlich gegen `shared/` laden (Worker-Sandbox aus `shared/` importieren) **oder** Sync-Assertion vor Tests; Korpus als `tests/`-Regression integrieren (FN/FP-Schwellen), Manifest-WAR-Assertion, Browser-E2E (Playwright) für Chrome/Firefox, CI-Workflow mit Lint/Test/Build-Reproduzierbarkeit.

### D. NIEDRIG / INFO

- **F-20 · Invisible-Char-Guard ist über Navigation nicht erreichbar:** `shared/detector.js:46,232-244` prüft auf unsichtbare Zeichen, aber WHATWG-URL-Parsing entfernt U+200B/U+00AD/U+2060/U+FEFF aus Hostnamen (Probe: `new URL('https://paypal\u200b.com').hostname === 'paypal.com'`), und IDNA-invalide `xn--`-Labels werden vom URL-Parser abgelehnt. Der Guard ist damit für reale Navigationen toter Code; die Next.md-Behauptung „Invisible-Char-Guard“ (`Next.md:25`) ist überzeichnet. Kein Sicherheitsverlust (Browser normalisieren korrekt), aber falsche Evidenz.
- **F-21 · Tote Gewichtungen:** `weight` (92–130) wird an allen Block-Returns gesetzt (`shared/detector.js:220,266,338`), aber von `guard.js`/`popup.js` nie konsumiert → Severity-/Telemetriedesign unvollständig.
- **F-22 · PSL nur Heuristik:** `domainBaseIndex` (`shared/detector.js:175-189`) verwendet kein Public-Suffix-List-Dataset, sondern eine 8-Einträge-Heuristik (`co/com/org/net/ac/edu/gov/gv/priv`). Für exotische Second-Level-Suffixe (z. B. `go.jp`, `gob.mx`, `gouv.fr`) kann der Base-Index falsch sein. Wenig Impact, solange die Subdomain-Regeln greifen; für Typosquat-Präzision aber relevant.
- **F-23 · „Offizielle Seite öffnen“ nutzt `official = site.domains[0]`:** `shared/guard.js:72` navigiert zu `https://` + erstem Domain-Eintrag. Das ist statisch (kein Netzwerk), aber semantisch fragil: `domains[0]` ist nicht immer das beste Ziel (z. B. Brand mit Subdomain-Eintrag), und die Liste ist für FPs verantwortlich (F-03).
- **F-24 · Zähler-/Anzeige-Semantik:** Chrome zählt Blockaden nur bei „Proceed“ (`recordBlock`), Firefox bei jedem Block (`firefox/background.js:13`); das Popup-Label „Abgewehrt“ ist nicht definiert. Doku/Telemetrie angleichen.
- **F-25 · Popup/Firefox:** Der Toggle „Vorabprüfung (Chrome)“ wird in Firefox ausgeblendet (`shared/popup.js:15-18`), `strictMode` hat in Firefox keine Funktion; der Hinweistext im Popup ist Chrome-spezifisch. Kein Sicherheitsproblem.
- **F-26 · Reduced Mode ist ausdrücklich best-effort:** `webNavigation.onBeforeNavigate` (`chrome/background.js:79-87`) greift nach Beginn der Anfrage; `observerBypass` erlaubt genau eine URL. Die Doku (`README.md:43`) sagt das korrekt; die UI-Formulierung „Nur best-effort“ ist ehrlich — aber der Sicherheitsgewinn ist nahe null und suggeriert dennoch Schutz.
- **F-27 · WAR-Fingerprinting:** `guard.html` ist web-accessible (`chrome/manifest.json:31-41`); Websites können die Extension über die statische Extension-URL erkennen (Extension-ID nötig). Die Behauptung „Manifest-Fingerprinting-Vektoren geschlossen“ (`Next.md:28`) ist nicht belegt; `use_dynamic_url` ist nicht gesetzt.
- **F-28 · Keine Update-/Feed-Mechanik:** Markendaten sind statisch im Paket; neue Phishing-Marken erfordern ein Store-Update. Für ein Anti-Phishing-Produkt ist das ein struktureller Frische-Nachteil (VGT-058/076), auch wenn „100 % offline“ korrekt ist.
- **F-29 · Fehlertexte/Diagnostik:** `console.error` im Background ist für Nutzer unsichtbar (F-06); es gibt kein strukturiertes Security-Event/Log (VGT-071).

---

## 4. Erkennungslogik — Analyse Zeile für Zeile

### 4.1 Ablauf `classify()` (shared/detector.js:201-345)

| Schritt | Zeilen | Funktion | Bewertung |
|---|---|---|---|
| 1 | 202-205 | URL-Parsing (`http(s)`, hostname, trailing dot entfernt) | korrekt; invalid → `skip` |
| 2 | 207-223 | userinfo-Täuschung (`brand.com@evil.tld`) | erkennt vollständige Domain im userinfo; **FN** bei brand-only, **FP** bei Substring-Kollisionen (F-13/F-16) |
| 3 | 225-228 | IP/IPv6/`:` → `safe` | korrekt (inkl. normalisierter Formen 2130706433, 0x7f.1) |
| 4 | 230 | Punycode-Dekodierung aller Labels | Implementierung korrekt (Property-Tests §4.2) |
| 5 | 232-244 | unsichtbare Zeichen → `block` | über Navigation praktisch unerreichbar (F-20) |
| 6 | 246-248 | `baseIndex`/`isMultiTenant` | PSL-Heuristik, lückenhaft (F-14/F-22) |
| 7 | 249-253 | offizielle Domain (inkl. Subdomains) → `continue` | korrekt, aber Datenliste unvollständig → FPs (F-03) |
| 8 | 259-269 | offizielle Domain als Substring im Host → `foreign-domain` | korrekt für `paypal.com.evil.tld` |
| 9 | 271-330 | Label-Schleife `j=0..baseIndex` je Marke | Kernlogik; mehrere Lücken (F-07/F-08/F-12/F-14) |
| 9a | 274-276 | Skeleton + Normalisierung + `isExactBrand` | gut; `replace(/-/g,'')` fängt `pay-pal` |
| 9b | 278-283 | Homoglyph + `brand-variant` | Lücke bei Diakritika (F-07) |
| 9c | 285-300 | exakte Marke auf fremdem Host/Subdomain | Haupt-FP-Ursache (F-03) |
| 9d | 302-320 | Bait-Wörter | Lücken (F-08) |
| 9e | 322-329 | Damerau-Levenshtein ≤ 1 nur `isBase` + `brand.length>=5` | Lücken (F-12/F-13/F-14) |
| 10 | 332-341 | Block-Return mit `reason`/`weight` | `weight` ungenutzt (F-21) |
| 11 | 344 | sonst `safe` | — |

Reihenfolge-Bewertung: Die frühe Whitelist-Prüfung ist richtig (offizielle Domains dürfen nie durch spätere Regeln fallen). Die userinfo-Prüfung vor der Whitelist kann offizielle URLs mit userinfo blocken (z. B. `https://x.com@paypal.com` → Host offiziell, aber userinfo enthält `x.com` → Block durch X-Site) — Randfall, aber inkonsistent. `foreign-domain` vor der Label-Schleife ist sinnvoll.

### 4.2 Implementierungs-Korrektheit (Property-/Fuzz-Tests, `runtime_probes.txt`)

| Prüfung | Ergebnis |
|---|---|
| `damerauDistanceOne` vs. Referenz-OSA==1, Alphabet `{a,b}`, Länge 0–5: 3.969 Paare | **PASS**, 0 Abweichungen |
| `punycodeDecode` (10 Vektoren inkl. Kyrillisch/Griechisch/Diakritika/IDN) | **PASS**, 0 Fehler |
| `withinDomain`-Labelgrenzen (`evilgoogle.com` ≠ `google.com`) | **PASS** |
| `classify()`-Fuzz: 1.500 Zufallsstrings | **PASS**, 0 Exceptions, immer gültiger Status |

**Schlussfolgerung:** Die Primitiven sind nicht defekt; die 33 FN/27 FP resultieren aus **Politik-, Heuristik- und Datenlücken**. Das ist für die Fix-Empfehlungen wichtig: keine „Reparatur“ der Distanzfunktion nötig.

### 4.3 Homoglyph-Tabelle und `skeleton()`

- Tabelle `shared/detector.js:13-43`: kyrillische/griechische/lateinische Lookalikes + circled alphanumerics + Leetspeak (`0→o,1→l,3→e,4→a,5→s,7→t,8→b`). Positiv: deckt die im Test genutzten Fälle (`pаypal`, `аpple`, `gοοgle`, punycode) und Latin-Varianten (`ɑ`, `ɡ`, `ı`, `ł`, `ν`) ab.
- Schwächen: keine UTS-39-Datenbasis; einzelne Zwei-Codepoint-Schlüssel (`'а́'`, `shared/detector.js:15`) sind durch die Codepoint-Iteration in `skeleton()` (`:125`) und die `\p{M}`-Entfernung (`:126`) **nie erreichbar** (toter Eintrag); fehlende Homoglyphen für `f`, `z`, `u/ʋ`; diakritische Formen werden nur über `skeleton`-Gleichheit erkannt, aber Check 1 verlangt Tabellenschlüssel (F-07); `skeleton` entfernt kombinationszeichen, sodass z. B. `paypál` == `paypal` — die Absicht ist richtig, der Zusatztest falsch.
- Leetspeak: `1→l` (nicht `i`) ist eine bewusste, aber ambivalente Wahl (`paypa1`→`paypal` = gewünscht; `v1sa`→`vlsa` = verfehlt). Ziffern-Mapping wird nur in `skeleton`, nicht in `withinDomain`/Exaktvergleich verwendet.

### 4.4 `domainBaseIndex`/PSL und Multi-Tenant

- Heuristik (`:175-189`): bei ≥3 Labels wird `co/com/org/net/ac/edu/gov/gv/priv` + 2-Buchstaben-TLD als Second-Level-Suffix behandelt. Das erklärt, warum `google.co.jp` den Base-Index 0 erhält → `google` wird als Baselabel geprüft → **FP** (F-03).
- `multiTenantSuffixes` (`:63-67`): 14 Hoster; `domainBaseIndex` vergleicht nur die **letzten zwei** Labels, daher kann der 3-Label-Eintrag `s3.amazonaws.com` dort nie matchen; `isMultiTenant` (`:247`) nutzt dagegen `withinDomain` und funktioniert. Unlisted Hoster (siehe F-14) führen zu Lücken.
- Positive Seite: `withinDomain` (`:171-173`) verhindert Suffix-Fehltreffer (Property-Test PASS); offizielle Subdomains (`accounts.google.com`) bleiben safe (Globale Selbstregression 771/771).

### 4.5 userinfo-Logik

`userinfo = (username + ':' + password).toLowerCase()` (`:209`) und `site.domains.some(d => userinfo.includes(d))` (`:210-212`) — die Substring-Suche produziert:
- FN: `paypal@evil.tld` (keine vollständige Domain im userinfo) → `safe`.
- FP: `testing.developer@example.com` (enthält `ing.de` → ING), `max.com@example.com` (enthält `x.com` → X/Twitter), `mixing.delivery@example.com` (→ ING). Belegt im Korpus.
- Fix: Token-/Label-basierte Prüfung (`userinfo.split(/[.:@]/)` gegen Marken-Domains/Brand-Tokens), plus Domain-Ende-Match statt beliebigem Substring.

### 4.6 FN-/FP-Tabellen (vollständig, aus `results.json`)

#### False Negatives (33) — erwartet `block`, tatsächlich nicht blockiert

| # | URL | Kategorie | Sicherheit | Ursache |
|---|---|---|---|---|
| 1-6 | `páypal.com`, `paypál.com`, `góogle.com`, `ámazon.com`, `micrósoft.com`, `applé.com` | homoglyph-diacritic | hoch | F-07 |
| 7 | `paypalsupport.com` | bait | hoch | F-08 |
| 8 | `secure-paypa1.com` | bait | hoch | F-08 |
| 9 | `paypa1-login.com` | bait | hoch | F-08 |
| 10 | `paypalverify.com` | bait | hoch | F-08 |
| 11 | `netflixbilling.com` | bait | hoch | F-08 |
| 12 | `dhl-tracking.com` | bait | hoch | F-08 |
| 13 | `sparkasse-sicherheit.de` | bait | hoch | F-08 |
| 14 | `paypal-konto.de` | bait | hoch | F-08 |
| 15 | `metamask-airdrop.com` | bait | hoch | F-08 |
| 16 | `dhl-zoll.com` | bait | hoch | F-08 |
| 17 | `microsoft365-login.com` | bait | hoch | F-08 |
| 18 | `amazonprime-login.com` | bait | hoch | F-08 |
| 19 | `appleid-login.com` | bait | hoch | F-08 |
| 20 | `paypal@evil.tld` | userinfo | hoch | F-13 |
| 21 | `gmial.com` | coverage | hoch | F-16 |
| 22 | `gmai.com` | coverage | hoch | F-16 |
| 23 | `gmail-login.com` | coverage | hoch | F-16 |
| 24 | `azure-login.com` | coverage | hoch | F-16 |
| 25 | `disneyplus-login.com` | coverage | hoch | F-16 |
| 26 | `alipay-login.com` | coverage | hoch | F-16 |
| 27 | `vlsa.com` | short-brand | hoch | F-12 |
| 28 | `v1sa.com` | short-brand | hoch | F-12 |
| 29 | `wlse.com` | short-brand | mittel | F-12 |
| 30 | `ubr.com` | short-brand | mittel | F-12 |
| 31 | `arnazon.com` | two-edit | hoch | F-13 |
| 32 | `rnicrosoft.com` | two-edit | hoch | F-13 |
| 33 | `office.attacker.com` | generic-subdomain | mittel | F-14 |

#### False Positives (27) — erwartet `safe`, tatsächlich blockiert

| # | URL | Kategorie | Sicherheit | Ursache |
|---|---|---|---|---|
| 1-6 | `google.co.jp`, `microsoft.co.jp`, `ing.nl`, `coinbase.de`, `visa.fr`, `sparkasse.at` | official-brand-unlisted | hoch (Auftrag nennt sie explizit) | F-03 |
| 7-16 | `google.com.mx`, `google.com.ar`, `amazon.se`, `walmart.ca`, `walmart.com.mx`, `bestbuy.ca`, `vodafone.it`, `dhl.co.uk`, `chase.co.uk`, `github.blog` | official-brand-unlisted | hoch | F-03 |
| 17-19 | `pinterest.co.uk`, `microsoft.de`, `wikipedia.de` | official-brand-unlisted | mittel | F-03 |
| 20 | `hermes.com` (Hermès) | brand-collision | mittel | F-16 |
| 21 | `elster.com` (Honeywell Elster) | brand-collision | mittel | F-16 |
| 22-24 | `github.io`, `vercel.app`, `netlify.app` | multi-tenant-root | mittel | F-14 |
| 25 | `max.com@example.com` | userinfo-substring | hoch | §4.5 |
| 26 | `testing.developer@example.com` | userinfo-substring | hoch | §4.5 |
| 27 | `mixing.delivery@example.com` | userinfo-substring | hoch | §4.5 |

#### Kategorienbilanz

| Kategorie | total | pass | FN | FP |
|---|---|---|---|---|
| official-reference-safe | 30 | 30 | 0 | 0 |
| legit-third-party-safe | 8 | 8 | 0 | 0 |
| official-brand-unlisted | 19 | 0 | 0 | 19 |
| brand-collision-safe | 2 | 0 | 0 | 2 |
| multi-tenant-root-safe | 3 | 0 | 0 | 3 |
| typosquat-substitution | 8 | 8 | 0 | 0 |
| typosquat-transposition | 6 | 6 | 0 | 0 |
| typosquat-deletion-insertion | 5 | 5 | 0 | 0 |
| homoglyph-cyrillic | 6 | 6 | 0 | 0 |
| homoglyph-greek-latin | 5 | 5 | 0 | 0 |
| homoglyph-diacritic | 6 | 0 | 6 | 0 |
| punycode-homograph | 6 | 6 | 0 | 0 |
| punycode-legit-idn | 3 | 3 | 0 | 0 |
| leetspeak | 6 | 6 | 0 | 0 |
| bait-combination | 22 | 9 | 13 | 0 |
| foreign-domain-in-host | 5 | 5 | 0 | 0 |
| userinfo-deception | 5 | 4 | 1 | 0 |
| userinfo-substring-fp | 3 | 0 | 0 | 3 |
| free-hoster-tenant | 5 | 5 | 0 | 0 |
| edge-case | 11 | 11 | 0 | 0 |
| idn-legit | 4 | 4 | 0 | 0 |
| long-url | 2 | 2 | 0 | 0 |
| brand-coverage-gap | 6 | 0 | 6 | 0 |
| short-brand-typosquat | 4 | 0 | 4 | 0 |
| two-edit-typosquat | 2 | 0 | 2 | 0 |
| generic-subdomain-policy | 2 | 1 | 1 | 0 |

**Bewertung:** Die Engine arbeitet im „Happy Path“ gut (offizielle Domains, 1-Edit-Typos, klassische Homoglyphen, Punycode, Bait mit Bindestrich, Fremddomain im Host, freie Hoster). Genau die im Auftrag genannten Angriffsklassen der zweiten Generation (Konkatenation, Diakritika, Subdomain-Typos, Kurzmarken, nicht kuratierte Marken, offizielle ccTLDs) brechen das Modell.

---

## 5. Chrome-Architektur (MV3/DNR)

### 5.1 Aufbau

1. **Preflight-Redirect:** Dynamische DNR-Regel `id=1000`, Priorität 1, `action.type=redirect`, `redirect.regexSubstitution = chrome-extension://<id>/guard.html#\1`, `condition.regexFilter='^(https?://.+)$'`, `resourceTypes:['main_frame']`, `requestMethods:['get']` (`chrome/background.js:24-40`). Jede GET-Hauptnavigation wird auf die lokale Schutzseite umgeleitet; die Original-URL steht im Fragment.
2. **Klassifikation:** `guard.js` liest `location.hash`/`?url=`, ruft `classify()` lokal auf (`shared/guard.js:15-19`).
3. **Safe:** automatische Weiterleitung über `allow-once` + `location.replace` (`shared/guard.js:50-54`).
4. **Block:** Warn-UI mit „Offizielle Seite öffnen“, „Zurück“, „dennoch fortfahren“ (`shared/guard.js:57-79`); Letzteres sendet `allow-once` mit `recordBlock: true`.
5. **Allow-once:** Session-Regel `id>=10001`, Priorität 10, tab-gebunden, exakt escaped URL ohne Fragment (`chrome/background.js:44-60`); Löschung bei Commit/Tab-Close/Neustart (`:61-65,74-78`).
6. **Reduced Mode:** DNR-Regel entfernt; `webNavigation.onBeforeNavigate` leitet best-effort per `tabs.update` um (`:79-87`); `observerBypass` erlaubt genau eine URL.
7. **Zustand:** `strict`, `pending`, `observerBypass` in Memory; `blocked`-Zähler in `storage.local`.

### 5.2 Architektur-Bewertung

| Thema | Befund | Evidenz | Grad |
|---|---|---|---|
| GET-Preflight | funktioniert konzeptionell für GET-Hauptnavigationen | Code + Mock | PASS (Konzept) |
| POST | **nicht geprüft** | F-02 | **FAIL** |
| Fragmente | DNR matcht Netzwerk-URL ohne Fragment; Fragment-Verlust plausibel | `background.js:47`, RFC 3986 §3.5, Mock | WARN/NOT_TESTED |
| Redirect-Ketten | Allow nur exakte URL → zusätzliche Gates/Schleifen möglich | F-11 | WARN/NOT_TESTED |
| History/Referer | Guard-Interstitial + `location.replace` kann History/Referer beeinflussen | README:61, Code | NOT_TESTED |
| Lange URLs | >1900 Zeichen nicht freigebbar | F-05 (Mock FAIL) | **FAIL** |
| Fail-open | `configure()`-Fehler → keine Regel | F-06 (Mock FAIL) | **FAIL** |
| Service-Worker-Restart | Session-Regeln werden aufgeräumt; In-Memory-`pending` weg → Race | F-15 | WARN/NOT_TESTED |
| Tab-Close/Races | Tabs werden aufgeräumt; Mehrfach-Freigaben überschreiben sich | F-15 | WARN/NOT_TESTED |
| Manifest/WAR | Chrome-WAR korrekt; `guard.html` fingerprintbar | `manifest.json:31-41`; F-27 | PASS/WARN |
| Permissions | `storage`, `tabs`, `webNavigation`, `declarativeNetRequest`, `host_permissions http(s)` | `manifest.json:9-18` | PASS (breit, aber funktionsnötig) |
| Minimum-Version | `"minimum_chrome_version": "121"` | `manifest.json:8` | INFO (kein E2E) |
| Reduced Mode | best-effort nach Request-Start; Schutz nahe null | `background.js:79-87`; README:43 | WARN |
| Zähler | inkonsistent (nur Proceed in strict) | F-24 | INFO |

### 5.3 Ketten

- **CHAIN-002 (POST-Bypass):** Angreiferseite `evil.tld` → `<form method="POST" action="https://paypa1.com/login">` → Browser navigiert POST → DNR-Regel (GET-only) greift nicht → Phishing-Seite lädt ohne Warnung. **Endwirkung:** Umgehung des gesamten Chrome-Schutzes für POST-basierte Credential-Eingabe. **Gegenkontrolle:** keine im Produkt; Fix siehe F-02.
- **CHAIN-003 (FP + Guard-Zwang):** Nutzer ruft `https://google.co.jp/` auf → DNR-Redirect → Guard `block` (F-03) → Nutzer klickt „Offizielle Seite öffnen“ → `https://google.com/` (via allow-once) → ggf. Redirect-Kette erneut gegatet (F-11) → mehrere Zwischenschritte. **Endwirkung:** Fehlalarm auf legitimem Ziel, Vertrauensverlust, Umgehungsgewohnheit („immer proceed“). **Gegenkontrolle:** nur manuelles Proceed.
- **CHAIN-004 (Long-URL-Selbstblockade):** Beliebige lange URL → DNR-Redirect → Guard `safe` → `go()` → `allowOne` wirft „Adresse zu lang“ → Fehlerbanner → Reload → gleiche Kette. **Endwirkung:** dauerhafte Unerreichbarkeit der Seite. **Gegenkontrolle:** keine.
- **CHAIN-006 (SW-Restart-Race):** Nutzer klickt „fortfahren“ → `allowOne` setzt Session-Regel → Service Worker wird beendet/neu gestartet, bevor die Navigation committet → `configure()` entfernt Session-Regel → Navigation wird erneut gegatet → Nutzer klickt erneut (oder Endlosschleife je nach Timing). **Grad:** NOT_TESTED, plausibel aus Code.

---

## 6. Firefox-Architektur (MV3/webRequestBlocking)

### 6.1 Aufbau und Befunde

- **Blocking-Listener:** `webRequest.onBeforeRequest` mit `types:['main_frame']`, `['blocking']`, Filter `http(s)://*/*` (`firefox/background.js:17-21`). Klassifikation synchron; bei `block` → `{redirectUrl: guard.html?url=…}`; sonst `{}`.
- **Allow-once:** `bypass`-Map `tabId → exakt eine URL` (`:6,8-9,32`); Verbrauch beim exakten URL-Treffer; Cleanup bei `tabs.onRemoved` (`:22`).
- **Zähler:** `storage.local.blocked` wird bei jedem Block inkrementiert (`:13`).
- **Manifest:** MV3, `background.scripts` (Firefox-zulässig, MDN), Permissions `storage`, `tabs`, `webRequest`, `webRequestBlocking`, `browser_specific_settings.gecko.id`, `strict_min_version 128.0`.
- **Kritisch:** `web_accessible_resources` fehlt (F-01). MDN: *„If an extension wants to redirect a public (e.g., HTTPS) URL to an extension page, the manifest.json file must contain a web_accessible_resources key that lists the URL for the extension page.“* Ohne diesen Schlüssel ist das Redirect-Ziel nicht zulässig → Schutz-UI/Allow-once funktional nicht verfügbar.
- **POST:** Kein Methodenfilter → POST-Hauptnavigationen werden abgefangen und beim Proceed zu GET (`:8-16,17-21`); Formulardaten gehen verloren; README-Behauptung „vollständig nativ unberührt“ (`README.md:42`) ist falsch (F-09).
- **Allow-once-Persistenz:** Kein `webNavigation`-Cleanup; ein Eintrag bleibt bis exakter URL-Nutzung oder Tab-Close. Chrome löscht beim ersten Commit (`chrome/background.js:75-78`) → Paritäts-/Sicherheitsunterschied: in Firefox kann eine später im selben Tab aufgerufene exakt gleiche blockierte URL ohne Warnung durchgelassen werden („Allow-once“ ohne Zeitfenster). **WARN.**
- **strictMode:** In Firefox wirkungslos (Popup-Toggle ausgeblendet; `background.js` liest `strictMode` nie). **INFO.**
- **Redirect-Ketten:** gleiche Problematik wie Chrome (Allow exakt URL, zweite Navigation wird erneut geblockt → wiederholte Warnungen). **NOT_TESTED.**

### 6.2 Chrome/Firefox-Parität

| Aspekt | Chrome MV3 | Firefox MV3 | Bewertung |
|---|---|---|---|
| Präventive Blockade | DNR-Redirect (GET) | webRequestBlocking (alle Methoden) | unterschiedlich, beide lückenhaft |
| POST | ungeschützt | abgefangen, aber GET-Umschreibung/Datenverlust | Doku falsch in beide Richtungen |
| Guard-UI | funktioniert (WAR vorhanden) | **defekt (WAR fehlt)** | **kritische Paritätslücke** |
| Allow-once-Lebensdauer | bis Commit/Tab-Close/SW-Restart | bis exakte URL/Tab-Close (kein Commit-Cleanup) | unterschiedlich, FF großzügiger |
| Reduced/Best-effort-Modus | vorhanden | nicht vorhanden (immer blockierend) | unterschiedlich |
| Zähler | nur bei Proceed (strict) | bei jedem Block | inkonsistent |
| Manifest-MV3-Konformität | PASS (Chrome-typisch) | PASS (background.scripts/gecko) | PASS |
| E2E-Browserlauf | NOT_TESTED | NOT_TESTED | NOT_TESTED |

**Belege zur API-Konformität:** MDN `background` dokumentiert `background.scripts` für Firefox MV3 (Chrome ignoriert `scripts` ab 121, hier separat `service_worker`); MDN `permissions` listet `webRequestBlocking` als API-Permission auch für MV3 (Firefox). Die Manifeste sind damit formal plausibel — der Defekt liegt in der fehlenden WAR-Deklaration.

---

## 7. Guard.js / Popup.js — Logik, Injection, Fehlerpfade

### 7.1 Sicherheitsbewertung (PASS)

- **Keine HTML-Sinks/XSS:** `shared/guard.js` und `shared/popup.js` nutzen ausschließlich `textContent`; `shared/guard.html`/`shared/popup.html` enthalten keine Inline-Skripte; Probe findet keine `innerHTML/outerHTML/insertAdjacentHTML/document.write/eval/new Function`-Treffer. **PASS** (VGT-014).
- **Offline:** Detector/Guard/Popup enthalten keine `fetch`/`XHR`/`WebSocket`/`sendBeacon`-Aufrufe. **PASS**.
- **Message-Autorisierung:** `runtime.onMessage` prüft `sender.url` gegen die Guard-URL **und** `tabs.get(tabId).url` gegen die Guard-Seite (`chrome/background.js:88-102`; Firefox analog `:23-35`). Externe Webseiten können keine `runtime.onMessage`-Nachricht senden (nur `onMessageExternal`, nicht registriert). **PASS** (mit Restrisiko: Prefix-Check `startsWith`; innerhalb derselben Extension unkritisch).
- **Guard-Fehlerpfade:** Ungültige/fehlende Ziel-URL → „Ungültige Webadresse“, kein automatisches Weiterleiten (`guard.js:43-48`); `go()`-Fehler → Error-Banner (`:38-40`). **PASS** (aber F-05 Availability).

### 7.2 UX-/Logik-Befunde

1. **Auto-Weiterleitung jeder Safe-Navigation** (`guard.js:50-54`): Jede Navigation zeigt kurz die Extension-Seite; das erzeugt einen sichtbaren „Flash“, zusätzliche Latenz und potenzielle History-/Referer-Effekte. Für Nutzer ist nicht erkennbar, dass dies ein Schutz-Gate ist. **MITTEL.**
2. **Nur Host-Anzeige bei Block** (`guard.js:60`): Der Pfad/Query der verdächtigen URL wird nicht angezeigt — Nutzer können die Täuschung (z. B. `paypal.com.evil.tld/login`) nicht vollständig nachvollziehen. **MITTEL.**
3. **„Offizielle Seite öffnen“** navigiert blind zu `https://` + `site.domains[0]` (`guard.js:72`), ohne Prüfung, ob diese Domain selbst gerade erreichbar/richtig ist; bei Datenfehlern (F-03) zeigt der Button ggf. auf ein anderes Ziel als erwartet. **NIEDRIG.**
4. **Lange-URL-Fehler** (F-05) endet in einem Banner; kein Ausweg außer Browser-Back; Guard-Seite hat in diesem Zustand keine Buttons (Danger-Panel nicht sichtbar). **HOCH für Availability.**
5. **Popup-Testfeld:** `evaluate()` ergänzt fehlendes Schema (`popup.js:34`), klassifiziert nur lokal, keine Injektion. Nützlich, aber es suggeriert eine Sicherheitsaussage („Kein Treffer … nicht automatisch vertrauenswürdig“ ist immerhin korrekt formuliert). **PASS.**
6. **Popup-Zähler/Toggle:** `strict`-Text beschreibt Chrome-Verhalten; in Firefox wirkungslos (F-25). Der Zähler ist nicht als „nur Proceed“ definiert (F-24).
7. **Barrierefreiheit:** Fokus-Indikatoren (`guard.css:329-332`, `popup.html:274-277`), `aria-live` am Danger-Panel, `aria-expanded` für Reveal, `prefers-reduced-transparency/motion`, `forced-colors` — überdurchschnittlich für Alpha. Schwäche: nach dem Redirect wird kein Fokus auf die Warnung gesetzt; der automatische Safe-Redirect kann Screenreader-Ansagen „verschlucken“. **NIEDRIG.**
8. **CSP:** MV3-Default (`script-src 'self'`) wird nicht überschrieben; keine Inline-Skripte. **PASS.**

---

## 8. Tests, Build und Dokumentation

### 8.1 Test-Bewertung

| Kritikpunkt | Beleg | Bewertung |
|---|---|---|
| Nur 13 Tests, keine negativen FN/FP-Tests | `tests/*.test.cjs` | 13/13 PASS ist wahr, aber als Release-Evidenz unzureichend |
| Worker-Tests laufen gegen Build-Kopien statt `shared/` | `tests/chrome-worker.test.cjs:6` (`root=…/chrome`), `tests/firefox-worker.test.cjs:5` | Schein-Pass-Risiko bei divergierenden Kopien; aktuell identisch |
| Marken-Schwelle zu schwach | `detector.test.cjs:9` (`>= 100`) | würde auch 100 statt 165 akzeptieren |
| Kein Manifest-/WAR-Test | `firefox-worker.test.cjs` | **hätte F-01 gefangen** |
| Keine Diakritika-/Bait-Konkatenations-/Kurzmarken-/Zwei-Edit-Tests | Testdateien | F-04 nicht erfasst |
| Keine userinfo-FP-Negativtests | nur `paypal.com@evil.test` als Positivfall | F-16 nicht erfasst |
| Kein Performance-/Lang-URL-/SW-Restart-Test | — | F-05/F-15 nicht erfasst |
| Kein Browser-E2E | `README.md:62` räumt es ein | kritische Architekturpfade ungetestet |
| Kein CI/Lint/SAST/SCA | Repo enthält keine CI-Konfiguration | VGT-097 nicht erfüllt |

### 8.2 Build (`build.py`, `build_sites.py`)

- **Nicht reproduzierbar:** Nachbau der Mechanik → zwei Läufe, unterschiedliche ZIP-SHA256 (`build_repro_results.txt`). Ursache: `shutil.copyfile` (`build.py:11,15`) aktualisiert mtimes; `zipfile.write` (`:24,34`) übernimmt sie.
- **Legacy-Duplikate:** `build.py:27-28,35` erzeugt `VGT-DomainGuard-*.zip` als byteidentische Kopie der Antipisher-ZIPs; beide im Elternordner vorhanden (Hashes verifiziert gleich).
- **Source-ZIP:** `build.py:30-35` packt **alle** Dateien unter `ROOT` (nur `__pycache__` ausgenommen) — künftig würden `audit/`-Artefakte, Temp-Verzeichnisse etc. mit ausgeliefert.
- **Versionierung:** ZIP-Name hartkodiert `v0.1.0-alpha` (`:20,30`), Manifest `0.1.0`; kein zentraler Versionscheck.
- **Build-Sites:** `build_sites.py` erzeugt `shared/sites.js` und `sites-100.json` aus `raw`; aktuell **konsistent** (Audit-Prüfung `build_sites_py_matches_sites_100_json = true`), aber `build.py` ruft `build_sites.py` nicht auf → Daten-Drift möglich. Docstring sagt „140+“ (`build_sites.py:3`), tatsächlich 165; Dateiname `sites-100.json` bei 165 Marken ist irreführend. Validierung prüft nur Duplikate der Marken (`:189-190`) und `>= 120` (`:188`), keine Domain-Eigentümerschaft/ccTLD-Abdeckung.

### 8.3 Dokumentation vs. Realität

| Behauptung | Quelle | Befund | Urteil |
|---|---|---|---|
| 165 Marken | `README.md:8`, `Next.md:26` | 165 (verifiziert) | **wahr** |
| „lückenloser Subdomain-Schutz“ | `Next.md:23`, `README.md:10` | F-04/F-14: Subdomain-Typos, generische Ausnahmen, Kurzmarken | **falsch** |
| Multi-Tenant-Schutz „verhindert unberechtigte …“ | `README.md:11` | Liste unvollständig, Root-FPs, 3-Label-Bug | **teilweise** |
| Unicode-Confusable + Invisible-Guard | `README.md:12`, `Next.md:25` | Invisible praktisch unreachable; Diakritika-Lücke | **überzeichnet** |
| Chrome POST-Schutz | `README.md:13`, `Next.md:27` | F-02: exakt das Gegenteil | **falsch** |
| Manifest-Fingerprinting geschlossen | `README.md:15`, `Next.md:28` | WAR-URL statisch; `use_dynamic_url` fehlt | **nicht belegt** |
| 13/13 PASS | `Next.md:30,70`, `Next.md:48` | Tests laufen 13/13, aber nicht ausreichend | **wahr, aber irrelevant als PLATIN-Beleg** |
| Reproduzierbare Build-Artefakte | `Next.md:31` | F-18: nicht reproduzierbar | **falsch** |
| Performance < 1 ms | `Next.md:33` | F-17: Median ja, p95 nein | **teilweise/falsch als Budget** |
| „PLATIN VGT SUPREME“ | `Next.md:71` | §13 | **unbegründet** |
| „100 % offline“ | `README.md:16` | keine Netzwerk-APIs (verifiziert) | **wahr** |
| `ARCHITECTURE_AND_SECURITY_REVIEW.md` als Evidenz | `Next.md:13,39` | Datei fehlt | **falsch** |

---

## 9. Performance

Protokoll: `audit/code/perf_results.txt` (5×10.000-Proben-Mix, 3×10.000 je Spezialfall, Warmup 500). Umgebung: Ryzen 5 4600H, Node 24.13.0, Windows 11, **parallele Team-Last (CPU ~54 %)** — Absolutwerte streuen; Median stabil, p95/p99 lastabhängig.

| Messung | Median | p95 | p99 | Max |
|---|---|---|---|---|
| Korpus-Mix (50.000 Proben, 5 Läufe) | **0,506 ms** (Läufe: 0,535/0,499/0,513/0,495/0,494) | **2,580 ms** (Läufe: 2,283–2,835) | 6,024 ms | 51,80 ms |
| Safe 2-Label (worst case, voller 165-Sites-Scan) | 1,512 ms | 4,606 ms | 9,379 ms | 55,56 ms |
| Safe 3-Label | 0,599 ms | 1,739 ms | 3,999 ms | 27,09 ms |
| Blockiert (`paypa1.com`, früher Treffer) | 0,065 ms | 0,125 ms | 0,273 ms | 5,68 ms |
| Langer Host (3×60 Zeichen) | 2,747 ms | 4,442 ms | — | 10,34 ms |
| Kaltstart (1. Aufruf) | 0,995 ms | — | — | — |

Frühere, weniger belastete Messreihe (1×10.000): Median 0,376 ms, p95 1,537 ms, p99 3,464 ms, Kaltstart 0,927 ms — bestätigt: **Median unter 1 ms, p95 über 1 ms**. Speicher: RSS +20,6 MiB über alle Messreihen (JIT/GC; kein Cache, daher kein Leak-Befund, aber auch kein Speicherbudget).

**Behauptung „< 1 ms pro URL“ (`Next.md:33`):** nur als Median-Aussage haltbar; als p95-/Budget-Aussage **nicht bestätigt** (`claim_check.verdict = TEILWEISE`). Empfehlungen: Vorindex (`brandSkeleton` einmalig), Label-Skelett-Cache, Early-Out, Performance-CI mit Median/p95-Schwelle auf definierter Referenzhardware.

---

## 10. Datenqualität der Markendatenbank

| Kennzahl | Wert | Bewertung |
|---|---|---|
| Marken | 165 | wie behauptet |
| Offizielle Domains | 257 | Ø 1,56/Marke, für Phishing-Abdeckung dünn |
| Marken mit genau 1 Domain | 109 | ccTLD-/Property-Lücken |
| ccTLD-Domains | 66 | nur teilweise abgedeckt (viele Marken nur `.com`) |
| Domains mit >2 Label (offizielle Subdomains) | `aws.amazon.com`, `outlook.live.com`, `gemini.google.com`, `id.bund.de`, `microsoft.github.io`, `google.github.io`, `facebook.github.io` | korrekt als offiziell geführt |
| Duplikate über Marken | 0 | PASS |
| Kurzmarken (<5 Zeichen, Typosquat ausgeschlossen) | 34 | u. a. Visa, DHL, UPS, eBay, Uber, Wise, ING, N26, HSBC, Citi, Box, Zoom, Otto, Temu, VK, npm, PyPI |
| Brand/Label-Mismatches | 5: Mail.ru, Crypto.com, BundID, Gov.uk, Bluesky | Typosquat strukturell unwirksam |
| Generische Wortmarken ohne `genericSubdomains`-Schutz | box, signal, wise, booking, chase, apple, visa, steam, hermes, elster, otto, asana, stripe … | FP-Quelle |
| Fehlende Top-Marken (Auszug) | Gmail, Azure, Disney+, Alipay, Venmo, Cash App, Zelle, Proton, GMX, web.de, Deutsche Bahn, Lufthansa, REWE/Aldi/DM | Coverage-Lücke |
| Semantische Sonderfälle | AliExpress führt `alibaba.com`; Microsoft-365-Marke heißt `office`; X/Twitter-Marke `twitter` (Domain `x.com`); Hermes = Logistik vs. Hermès; Elster = Steuerportal vs. Honeywell Elster | Zuordnungs-/Kollisionsrisiken |

**Kernaussage:** Die Datenbank ist eine solide Alpha-Basis für „Top-100-Dienste“, aber **nicht** die laut Doku „manuell kuratierte 165-Marken-Verteidigung“ gegen reale Phishing-Kampagnen. Gerade die häufigsten Kampagnenziele Gmail/Outlook(✓)/DHL(✓)/Paketdienste(teils) und Streaming/Microsoft-Submarken sind lückenhaft.

---

## 11. VGT-100-Matrix (100 Prüfgrenzen, Status mit Evidenz)

`PASS` = nachgewiesen · `FAIL` = Verletzung belegt · `N/A` = begründet nicht anwendbar · `NOT_TESTED` = nicht ausreichend geprüft. Kein N/A wird als PASS gezählt.

### Block 01 — Identität, Autorisierung & Vertrauensgrenzen
| ID | Status | Begründung |
|---|---|---|
| VGT-001 | FAIL | Kein dokumentiertes Trust-Boundary-/Asset-Inventar im Produkt (SECURITY.md 9 Zeilen); Audit liefert Ersatz, Produkt nicht |
| VGT-002 | FAIL | Fail-open bei `configure()`-Fehler (F-06) |
| VGT-003 | N/A | Keine objektbezogenen IDs/Mandanten |
| VGT-004 | N/A | Keine Rollen/Admin-Funktionen |
| VGT-005 | N/A | Keine DTOs/Mass Assignment |
| VGT-006 | N/A | Keine Sessions/Tokens im klassischen Sinn |
| VGT-007 | N/A | Kein MFA/Recovery |
| VGT-008 | N/A | Keine Mandanten/Editionen/Feature-Flags |
| VGT-009 | N/A | Keine Service-Identitäten |
| VGT-010 | NOT_TESTED | Allow-once-Privilegienpfad: Sender-/Tab-Prüfung vorhanden, echter Browser-Caller nicht getestet |

### Block 02 — Eingaben, Parser & Dateisystem
| ID | Status | Begründung |
|---|---|---|
| VGT-011 | N/A | Keine SQL/NoSQL |
| VGT-012 | N/A | Keine Shell/Subprozesse im Produkt |
| VGT-013 | PASS | Kein `eval`, kein dynamischer Import, kein Interpreter |
| VGT-014 | PASS | Keine HTML-Sinks, nur `textContent`; kein Inline-Skript; MV3-CSP default (Probe: 0 Treffer) |
| VGT-015 | N/A | Keine Dateipfade aus Eingaben |
| VGT-016 | N/A | Keine Dateisystem-Operationen zur Laufzeit |
| VGT-017 | N/A | Keine untrusted Deserialisierung (sites.js statisch) |
| VGT-018 | N/A | Keine Archivextraktion zur Laufzeit (Build-ZIPs → VGT-055) |
| VGT-019 | N/A | Keine Uploads |
| VGT-020 | FAIL | Keine Längen-/Ressourcenbudgets; 1900-Zeichen-Grenze blockiert Nutzer; langer Host 2,75 ms ohne Limit |

### Block 03 — Kryptografie, Schlüssel & Datenschutz
| ID | Status | Begründung |
|---|---|---|
| VGT-021–VGT-026 | N/A | Keine Kryptografie im Produkt |
| VGT-027 | PASS | Datenminimierung: nur `blocked`-Zähler + `strictMode` |
| VGT-028 | PASS | Keine besuchten URLs persistiert |
| VGT-029 | N/A | Keine Lösch-/Retention-Pflicht |
| VGT-030 | PASS | Fehlermeldungen enthalten keine Secrets (nur eigene Texte) |

### Block 04 — Web-, API- & Business-Logik
| ID | Status | Begründung |
|---|---|---|
| VGT-031 | N/A | Keine Cookies/CSRF-Pfade |
| VGT-032 | PASS | MV3-Default-CSP, keine Remote-Inhalte, WAR auf `guard.html` begrenzt |
| VGT-033 | N/A | Keine Server-Fetches/SSRF-Fläche |
| VGT-034 | PASS | Guard navigiert nur zu klassifizierten http(s)-Zielen; Allow-once validiert Protokoll |
| VGT-035–VGT-040 | N/A | Keine APIs/Webhooks/Queues/Rate-Limits |

### Block 05 — Host, Container, Netzwerk & Cloud
| ID | Status | Begründung |
|---|---|---|
| VGT-041 | N/A | Keine OS-Rechte (Browser-Extension) |
| VGT-042 | PASS | Browser-Extension-Sandbox; keine Content-Scripts, kein Host-Zugriff |
| VGT-043 | PASS | `runtime.onMessage` nur eigene Extension; Sender- + Tab-Prüfung; keine `onMessageExternal` |
| VGT-044 | PASS | Keine Netzwerk-Egress-Pfade im Produkt (Probe) |
| VGT-045–VGT-049 | N/A | Keine Bindings/Tempfiles/Container |
| VGT-050 | NOT_TESTED | Nur Windows-Audit; Chrome 121+/Firefox 128 nicht auf Zielplattformen real getestet |

### Block 06 — Build, Lieferkette & Update-Vertrauen
| ID | Status | Begründung |
|---|---|---|
| VGT-051 | PASS | Keine externen Dependencies (SBOM = leer) |
| VGT-052 | N/A | Keine Abhängigkeiten/Versionen |
| VGT-053 | N/A | Kein Package-Manager |
| VGT-054 | N/A | Keine CI-Secrets |
| VGT-055 | FAIL | Builds nicht reproduzierbar, keine Provenance (F-18) |
| VGT-056 | FAIL | Keine Prüfsummen/Signaturen der Release-ZIPs |
| VGT-057 | N/A | Kein Updater (manuelle Installation) |
| VGT-058 | FAIL | Kein signierter/aktualisierbarer Markendaten-Feed (statische Liste, VGT-076) |
| VGT-059 | N/A | Keine Editions/Kanäle |
| VGT-060 | N/A | Kein Supply-Chain-Prozess vorhanden |

### Block 07 — Verfügbarkeit, Fehlermodi & Systemzustand
| ID | Status | Begründung |
|---|---|---|
| VGT-061 | FAIL | Fail-open bei Konfigurationsfehler, Guard-Fehlerpfade (F-06) |
| VGT-062 | N/A | Keine Transaktionen/Persistenz |
| VGT-063 | NOT_TESTED | Allow-once/SW-/Pending-Races nicht real getestet (F-15) |
| VGT-064 | FAIL | Long-URL-Availability-Blocker; kein Ressourcenbudget (F-05) |
| VGT-065 | FAIL | Redirect-Ketten/Gate-Schleifen ohne Backoff (F-11) |
| VGT-066 | PASS | Default `strict=true` fail-closed; `strictMode`-Storage-Wert untypisiert (minimal) |
| VGT-067 | N/A | Kein Rollback/Migration |
| VGT-068 | PASS | 100 % offline funktionsfähig |
| VGT-069 | N/A | Keine Zeit-/Replay-Logik |
| VGT-070 | N/A | Keine Sekundärsysteme |

### Block 08 — Erkennung, Logging & Security-Product-Behavior
| ID | Status | Begründung |
|---|---|---|
| VGT-071 | FAIL | Kein Security-Event/Audit; Zähler inkonsistent (F-24) |
| VGT-072 | N/A | Keine Logs |
| VGT-073 | NOT_TESTED | Keine Dedup-/Alert-Lifecycle-Logik; Gate-Ketten möglich |
| VGT-074 | FAIL | Evasion-Lücken: Diakritika, Bait-Konkat, 2-Edit, Subdomain-Typos, userinfo (F-04) |
| VGT-075 | FAIL | Allow-once ohne TTL in Firefox; kein FP-Reporting/Rücknahme (F-14/F-15) |
| VGT-076 | FAIL | Keine Feed-Freshness/Update-Mechanik (F-28) |
| VGT-077 | N/A | Keine Control-Plane/Agenten |
| VGT-078 | N/A | Kein Admin-Dashboard |
| VGT-079 | NOT_TESTED | Keine Incident-Response-Readiness dokumentiert |
| VGT-080 | FAIL | Keine FN/FP-Metriken/Regression im Repo; dieses Audit liefert erstmals Basis |

### Block 09 — Plattformen, Plugins, KI & Benutzerumgebung
| ID | Status | Begründung |
|---|---|---|
| VGT-081–VGT-085 | N/A | Kein WordPress/Mobile/Desktop |
| VGT-086 | FAIL | Erweiterungsarchitektur: Firefox-WAR gebrochen, Chrome-Prototyp, breite Host-Permissions (F-01/F-02) |
| VGT-087–VGT-089 | N/A | Keine KI-Komponenten im Produkt |
| VGT-090 | PASS | Fokus-Indikatoren, ARIA, reduced-transparency/motion, forced-colors; Fokusmanagement verbesserbar |

### Block 10 — Kettenrisiken, Regression & Freigabe
| ID | Status | Begründung |
|---|---|---|
| VGT-091 | PASS | Attack-Path-Graph/Chains in diesem Audit (CHAIN-001…006) |
| VGT-092 | PASS | Kombinationsbefunde als Ketten dokumentiert |
| VGT-093 | NOT_TESTED | Privilege-/Integrity-Pivot über WAR/Guard nicht real geprüft |
| VGT-094 | FAIL | Unicode-/Normalisierungsdiskrepanzen (Diakritika, IDN, userinfo) |
| VGT-095 | FAIL | Kein erzwungener Kopien-Sync/Tests gegen `shared` (F-19) |
| VGT-096 | FAIL | Repo enthält keine Negative-/Property-/Fuzz-Tests; Audit-Probes kompensieren nur teilweise |
| VGT-097 | FAIL | Keine SAST/SCA/Lint/CI im Repo; nur manueller Review |
| VGT-098 | PASS | Performance gemessen (F-17); Budget verfehlt → dokumentiert |
| VGT-099 | FAIL | Release-Gate blockiert (F-01/F-02/F-03/F-05) |
| VGT-100 | FAIL | Keine dauerhafte Regressionsbasis im Repo (Korpus liegt im Audit) |

**Coverage:** 100/100 IDs klassifiziert (kein N/A als PASS). Bewertung: **17 PASS, 21 FAIL, 6 NOT_TESTED, 56 N/A**.

---

## 12. Qualitätsklassifikation nach VGT-Coder-Maßstab

### 12.1 Ergebnis: **SILBER**

| Stufe | Definition (QUALITY_AND_RELEASE) | Erfüllung |
|---|---|---|
| **SILBER** | Grundfunktion/Happy Path, wesentliche Lücken → nicht releasefähig | **erfüllt**: Detektor-Primitiven korrekt, 124/184 Korpuspass, 771/771 offizielle Checks, 13/13 Tests, offline; aber 33,7 % FN, 32,9 % FP, Firefox-Defekt, Chrome-Prototyp |
| GOLD | produktionsfähige Basis mit dokumentierten Restschwächen | **nicht erfüllt**: Firefox-Kernfunktion defekt; offizielle Markendomains werden geblockt; Doku widerspricht Evidenz |
| PLATIN | Defense-in-Depth, Grenzen-/Negativtests, Stabilität/Belege | **nicht erfüllt**: keine Negativ-/FP-/Perf-/E2E-Belege; `Next.md:71` behauptet es ohne Deckung |
| DIAMANT | stärkste defensible Lösung mit Artefakt-, E2E-, Performance-, Recovery- und Zielplattformbeweisen | **nicht erreichbar** (kein E2E, kein Recovery, keine Provenance) |

### 12.2 Begründung im Einzelnen (Gate-Reihenfolge)

1. **Source Identity:** quellenmäßig bestätigt, Versionsbezeichnung widersprüchlich, kein Git/Provenance.
2. **Architecture path:** Chrome-/Firefox-Pfade vollständig nachgezeichnet; Firefox-Pfad bricht am Manifest.
3. **Syntaktische Qualität:** alle Dateien syntax-/JSON-valide; keine Linter/Typen vorhanden.
4. **Semantik/Edgecases:** Kerntests grün, aber 60/184 Korpusfehler; Primitiven nachweislich korrekt (Property-Tests) → Defizit liegt in Heuristik/Daten.
5. **Security:** XSS/Offline/Message-Auth positiv; fail-open, POST-Lücke, WAR-Defekt, FP/FN dominieren.
6. **Persistenz/Recovery:** nur Zähler; Allow-once-Zustand flüchtig/inkonsistent; keine Recovery.
7. **Performance:** gemessen; Median-Budget erfüllt, p95-Budget nicht; keine Optimierungen.
8. **UX:** durchdachtes Glass-Design, gute A11y-Ansätze; aber Guard-Flash, FP-Erlebnis, Long-URL-Deadlock.
9. **Build/Release:** nicht reproduzierbar, Legacy-Duplikate, keine Signaturen; Release-Gate **BLOCKED**.
10. **Next.md:** überzeichnet, Evidenzartefakt fehlt; Neuschreiben erforderlich.

### 12.3 Upgrade-Pfad (priorisiert)

**Akut (Blocker → GOLD):**
1. Firefox-WAR ergänzen + echter Firefox-E2E-Test (F-01).
2. Chrome: Long-URL-Mechanismus ersetzen, Fail-open beseitigen (F-05/F-06).
3. Offizielle Markendomains in `sites.js` ergänzen (mind. Google/Microsoft/Amazon/Walmart/Vodafone/DHL/Chase/GitHub; alle genannten FPs) + `officialDomains`-eTLD+1-Prüfung (F-03).
4. Diakritika-Regel, Bait-Konkatenation, Kurzmarken, 2-Edit, userinfo-Token (F-07/F-08/F-12/F-13).
5. Doku/Next.md ehrlich zurücksetzen, Overclaims entfernen, fehlendes Architekturartefakt anlegen oder Referenzen streichen (F-10).

**Kurzfristig (PLATIN-Pfad):**
6. PSL/UTS-39-Datensätze statt Heuristiken; Datenpflege-/Update-Prozess.
7. Korpus als `tests/`-Regression mit FN/FP-Schwellen, Manifest-WAR-Test, Lang-URL-/Fail-open-/SW-Restart-Tests, Browser-E2E (Playwright) in CI.
8. Reproduzierbare, signierte Builds + SHA256SUMS, Version-Single-Source, Legacy-ZIPs entfernen (F-18).
9. Performance-Optimierung + CI-Budget (Median & p95) (F-17).
10. Firefox-POST-Semantik und Allow-once-Lebensdauer klären/vereinheitlichen (F-09/F-15).

**Erst danach:** PLATIN-Review; DIAMANT setzt E2E-, Performance-, Recovery- und Zielplattformbeweise voraus (aktuell nicht vorhanden).

---

## 13. Anhang

### A. Korpuszusammensetzung (184 URLs)

| Kategorie | Anzahl |
|---|---|
| official-reference-safe | 30 |
| legit-third-party-safe | 8 |
| official-brand-unlisted | 19 |
| brand-collision-safe | 2 |
| multi-tenant-root-safe | 3 |
| typosquat-substitution / -transposition / -deletion-insertion | 8 / 6 / 5 |
| homoglyph-cyrillic / -greek-latin / -diacritic | 6 / 5 / 6 |
| punycode-homograph / punycode-legit-idn | 6 / 3 |
| leetspeak | 6 |
| bait-combination | 22 |
| foreign-domain-in-host | 5 |
| userinfo-deception / userinfo-substring-fp | 5 / 3 |
| free-hoster-tenant | 5 |
| edge-case | 11 |
| idn-legit | 4 |
| long-url | 2 |
| brand-coverage-gap | 6 |
| short-brand-typosquat | 4 |
| two-edit-typosquat | 2 |
| generic-subdomain-policy | 2 |

### B. Datei-Hashes der Kernartefakte

| Datei | SHA256 (gekürzt) |
|---|---|
| `shared/detector.js` | `41bf609836bb480a…` |
| `shared/sites.js` | `c814babb5279…` |
| `audit/code/corpus.json` | siehe `results.json.meta.corpus_sha256` |
| `chrome/manifest.json` / `firefox/manifest.json` | valide JSON; WAR-Differenz belegt |

### C. Ergebnisdateien

- `audit/code/results.json` — alle 184 Einträge mit `expected`/`actual`/`reason`/`site`/`certainty`, FN/FP-Listen, 26 Kategorien, offizielle Selbstregression, Datenqualität, Quellidentität, Performance
- `audit/code/perf_results.txt` — Performance-Protokoll inkl. Behauptungsprüfung
- `audit/code/runtime_probes.txt` — Mock-Runtime-Probes (16 PASS / 5 WARN / 5 FAIL) inkl. Property-/Fuzz-Tests
- `audit/code/build_repro_results.txt` — Reproduzierbarkeits-Experiment

**Endurteil:** `SILBER` — nicht releasefähig. Release-Gate: **BLOCKED** (VGT-099). Die technische Basis ist reparierbar; die Reihenfolge der Fixes ist in §12.3 definiert.
