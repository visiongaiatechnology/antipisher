# Unabhängige Holdout-Verifikation: Detektor-Generaliserung & Overfitting

**Shared Task:** `task-5` · **Rolle:** unabhängiger Verifikations-Auditor (`holdout-verifier`) · **Modus:** VERIFY_ONLY (kein Quellcode geändert)
**Datum:** 2026-10-18 (Europe/Berlin) · **Workspace:** `vgt-domainguard-src` (Chrome/Firefox MV3, Node v24.13.0, Python 3.14.2, kein Git, kein Browser-E2E verfügbar)
**Geprüfter Stand:** `shared/detector.js` SHA-256 `9ce177f1…fb07` (mtime 18:07:12), `shared/sites.js` SHA-256 `9fcfac57…47db` (mtime 18:10:21)
**Artefakte:** `audit/verify/holdout/{HOLDOUT.md, corpus.json, run_holdout.cjs, results.json, perf.txt}`

---

## 0. Ergebnis in einem Absatz

Die Behauptung **„0/26 FP, 0/40 FN, 100 % Trefferquote“** (Next.md:29,37,38,82,108; README.md:67,76) ist auf dem **selbst veröffentlichten Lead-Probe-Korpus exakt reproduzierbar** (`0/26 FP`, `0/40 FN`), generalisiert aber **nicht**: Auf einem neuen, unabhängigen Holdout-Korpus (296 Fälle, 38 Kategorien) erreicht dieselbe Engine **TPR 40,96 %** und **TNR 78,51 %** – d. h. **98/166 erwartete Blockaden werden nicht erkannt (59,0 % FN)** und **26/121 erwartete Safe-Fälle werden blockiert (21,5 % FP)**. Auf dem veröffentlichten 184-URL-Audit-Korpus bleiben **5 FN** (microsoft365-login, amazonprime-login, appleid-login, ubr.com, office.attacker.com). Die Tuning-Muster sind **nachweislich korpus-spezifisch**: 9/9 Minimalpaare diskriminieren, 24/27 alte Audit-FPs wurden durch exakt die Listing-Domains aus dem Audit-Korpus „gefixt“, 28/33 alte Audit-FNs durch exakte Tokens/Marken, und die 4 neu aufgenommenen Marken sind **exakt** die im Audit als fehlend benannten Gmail/Azure/Disney+/Alipay. Perf: auf dem 184-URL-Korpus robust **0,087 ms Median / 0,870 ms p95** (unter Audit-Baseline 0,506/2,58), auf dem adversarialen Holdout-Mix **0,660 ms / 2,009 ms** – der Claim „< 1 ms“ gilt nur als Median, nicht als p95. **Release-Gate für „Generaliserung/Overfit-Behauptung“: FAIL.**

---

## 1. Methodik und Unabhängigkeit

### 1.1 Holdout-Konstruktion

- **296 Fälle / 38 Kategorien** (166 × erwartet `block`, 121 × erwartet `safe`, 9 × erwartet `skip`), `corpus.json` v1.3.0.
- Erwartungen wurden **fachlich/security-first aus der Kategorie-Semantik** abgeleitet, **nicht** aus Detektor-Ausgaben. Jeder Fall hat `expect`, `cat`, `conf` (hoch/mittel) und ggf. `note`.
- **Keine URL aus den veröffentlichten Korpora übernommen:** exakte URL-Schnittmenge mit `audit/code/corpus.json` (184 URLs) + `audit/lead/lead_probe.cjs` (66 URLs + Sanity-Listen) = **0/296** (nach Bereinigung von 10 kanonischen Kontroll-/Skip-URLs in v1.3.0). Es verbleiben 14 Host-Überschneidungen, ausschließlich Kontroll-/Beispiel-Hosts (`example.com`, `github.com`, `stackoverflow.com`, `www.bbc.co.uk`, `evil.test`, offizielle Domains) – **keine** Überschneidung bei Phishing-/Bait-/Typosquat-URLs.
- Abdeckung: **neue Marken** (DE/EU-Behörden, Banken/Versicherer, Paketdienste: AOK, TK, Arbeitsagentur, DRV, Zoll, BZSt, BAWAG, Erste Bank, Raiffeisen, Post AT, ÖBB, SBB, Swisscom, Sparda, PSD, Hanseatic, Check24, Immoscout, eBay Kleinanzeigen, HUK, Allianz, ERGO, AXA, Signal Iduna …); **neue Baitwörter** (rechnung, mahnung, kontoauszug, überweisung, tan, pin, passwort, anmelden, bestätigen, gesperrt, verifizieren, rückerstattung, refund, invoice, delivery, parcel, kundenservice, kundennummer, vertrag, kündigung, zollgebühr); **Varianten jenseits der Tuning-Muster** (IDN-Diakritika ä/ö/ü/ë, mixed script, 2-Edit, Kurzmarken, TLD-Swap, Bitsquatting, Combosquat ohne Baitwort, Subdomain-Ketten, Multi-Tenant, userinfo, RTL/IDN, offizielle Regionaldomains außerhalb `sites.js`, legitime Drittseiten mit Marke+login im Pfad, Doku-/Blog-URLs, IP/Port/trailing dot).
- **Mapping:** Erwartung `block` gilt als erfüllt, wenn `status === 'block'` (auch `action: 'warn'`); `safe`/`skip` analog. `FN` = erwartet block, erhalten safe/skip. `FP` = erwartet safe, erhalten block.
- Veröffentlichte Korpora wurden **read-only in-memory nachgefahren** (`run_holdout.cjs` parst `lead_probe.cjs`/`corpus.json`), nicht über `node audit/code/run_corpus.cjs` bzw. `node audit/lead/lead_probe.cjs` ausgeführt – diese Skripte würden ihre Ergebnisdateien überschreiben (VERIFY_ONLY).

### 1.2 Grenzen

- **Kein echter Browser-E2E** verfügbar; DNR/Redirect/Content-Shield-Verhalten ist hier **NOT_TESTED** (separater Teammate). Geprüft ist ausschließlich die Detektor-Engine `classify()`.
- **Keine Netzwerk-/DNS-Verifikation** der Domain-Eigentümerschaft; Datenintegritäts-Bewertung stützt sich auf In-Repo-Auditbelege (Audit-Baseline) + Fachwissen (gekennzeichnet).
- Constructed URLs, keine Live-Phishing-Domains (kein DNS/TLS aufgerufen); Erwartungen sind fachliche Ground Truth, keine Zertifizierungsdaten.
- 8 Benchmarks laufen unter paralleler Last anderer Team-Agenten; Perf-Kennwerte daher als robuste Median-Kennwerte + Range ausgewiesen (kein Cherry-Picking).

---

## 2. Holdout-Ergebnisse

### 2.1 Gesamt

| Kennzahl | Wert |
|---|---|
| Fälle / Kategorien | **296 / 38** |
| Erwartet block / safe / skip | 166 / 121 / 9 |
| Pass | **172/296 = 58,11 %** |
| False Negatives | **98/166 = 59,04 %** |
| False Positives | **26/121 = 21,49 %** |
| TPR (Block-Erkennung) | **40,96 %** |
| TNR (Safe-Durchlass) | **78,51 %** |
| Sonstige Abweichungen (skip etc.) | 0 |
| Erkannte Blöcke | 68 (davon 63 `action: block`, 5 nur `action: warn` = Pfad-Ebene) |

**Sicherheitsgrad der Erwartung (Strata):**

| Stratum | Fälle | Block / Safe | FN | FN-Rate | FP | FP-Rate |
|---|---|---|---|---|---|---|
| `conf: hoch` | 195 | 96 / 99 | 39 | **40,63 %** | 10 | **10,10 %** |
| `conf: mittel` (Grauzonen) | 92 | 70 / 22 | 59 | 84,29 % | 16 | 72,73 % |

→ Auch auf den **fachlich eindeutigen** Fällen bleibt die FN-Rate **40,6 %**; die FP-Rate liegt dort bei 10,1 %.

**Erkannte Reason-Codes (68 Detektionen):** `foreign-domain` 21, `unicode` 13, `typosquat` 7, `brand-variant` 7, `userinfo` 6, `bitsquat` 5, `path-impersonation` 5 (davon alle `warn`), `credential-bait` 4.

### 2.2 Kategorie-Ergebnisse (Auszug; vollständig in `results.json → holdout.evaluation.by_category`)

**Block-Kategorien (Treffer / FN):**

| Kategorie | n | pass | FN | FN-Rate | Beispiele für FN |
|---|---|---|---|---|---|
| bait_new_de | 20 | 0 | 20 | 100 % | sparkasse-rechnung.de, paypal-rueckerstattung.de, hermes-rechnung.de, n26-verifizieren.de |
| db_coverage_gap | 13 | 0 | 13 | 100 % | targobank-login.de, aok-rueckerstattung.de, sbb-konto.ch, finanzamt-bescheid.de |
| bait_concat_new | 12 | 0 | 12 | 100 % | sparkasserechnung.de, netflixinvoice.com, amazonrefund.com, dhlzollgebuehr.de |
| combosquat_nobait | 8 | 0 | 8 | 100 % | paypal-bonus.com, sparkasse-beratung.de, ing-kundencenter.de |
| idn_diacritic_new | 8 | 0 | 8 | 100 % | spärkasse.de, göogle.de, visä.com, revolüt.com, commerzbänk.de |
| short_brand | 8 | 0 | 8 | 100 % | lng.de, dbk.de, m26.com, gls-paket.de, ups-lieferung.de |
| concat_brandcom | 6 | 0 | 6 | 100 % | paypalcom.net, sparkassede.de, netflixcom.de |
| two_edit | 4 | 0 | 4 | 100 % | peypel.com, geegle.com, sparkazze.com, paypaai.com |
| path_blog_evasion | 3 | 0 | 3 | 100 % | evil.example/blog/sparkasse/login, .../news/paypal/verify |
| whitelist_risk | 3 | 0 | 3 | 100 % | evil.force.com/paypal/login, evil.my.salesforce.com/paypal/login |
| subdomain_typosquat | 6 | 3 | 3 | 50 % | rnicrosoft.evil.test, appleid.evil.test, microsoft365.evil.test |
| path_phish | 9 | 5 | 4 | 44 % | /ing/banking, /n26/password, /targobank/login, /dhl/konto |
| multi_tenant_phish | 7 | 5 | 2 | 29 % | dhl-paket.vercel.app, targobank.vercel.app |
| de_eu_typo | 8 | 6 | 2 | 25 % | klarmo.de, wisee.com |
| ligature | 6 | 5 | 1 | 17 % | arnazon-login.de (Ligatur greift nur im Baselabel ohne Trenner) |
| punycode_phish | 4 | 3 | 1 | 25 % | xn--sprkasse-1za.de |
| übrige 19 Block-Kategorien (homoglyph_cyr_gr, mixed_script, bitsquat, tld_swap, foreign_in_host, userinfo_phish, subdomain_chain …) | 55 | 55 | 0 | 0 % | – |

**Safe-Kategorien (FP):**

| Kategorie | n | pass | FP | FP-Rate | Beispiele für FP |
|---|---|---|---|---|---|
| official_regional_missing | 10 | 0 | 10 | 100 % | google.com.tw, google.com.hk, google.co.th, amazon.com.be, ing.it/es/pl/com.au, telekom.at, vodafone.pt |
| legit_thirdparty_path | 7 | 1 | 6 | 86 % | heise.de/ratgeber/paypal-login-…, verbraucherzentrale.de/…paypal-login…, focus.de/…, chip.de/…, ionos.de/hilfe/paypal-login, support.mozilla.org/de/kb/apple-login (alle `warn`/path-impersonation) |
| bidi_rtl_legit | 6 | 2 | 4 | 67 % | aljazeera.net mit RLM, bbc.co.uk/arabic mit RLM, ynet.co.il mit RLM, tagesschau.de mit RLM in Query (alle harter `block`) |
| userinfo_legit | 5 | 2 | 3 | 60 % | user:paypal@example.com, apple:pass@example.com, paypal.de:token@paypal.de |
| brand_as_subdomain_legit | 5 | 2 | 3 | 60 % | signal.example.org, box.example.org, chase.example.org |
| übrige 13 Safe-Kategorien (official_controls 34/34, official_subdomain_bait 11/11, legit_idn, multi_tenant_legit, edge_cases, skip_cases …) | 88 | 88 | 0 | 0 % | – |

**Bemerkenswert:** Alle 34 neuen offiziellen DE/EU-Kontrollen (AOK, TK, Arbeitsagentur, DRV, Zoll, BZSt, BAWAG, Erste Bank, Raiffeisen, Post AT, ÖBB, SBB, Swisscom, Sparda, PSD, Hanseatic, Check24, Immoscout, eBay Kleinanzeigen, HUK, Allianz, ERGO, AXA, Signal Iduna …) sowie alle 11 offiziellen Subdomain-/Login-Pfad-Kontrollen und die gelisteten Drittseiten (Wikipedia, Reddit, StackOverflow, GitHub, Medium) bleiben korrekt `safe`. Die Grundregel „offizielle Domain/subdomain → safe“ funktioniert.

---

## 3. Top-5-Problemklassen

1. **Bait-Lexikon statt Bait-Semantik (46 FN).** `bait_new_de` 20, `bait_concat_new` 12, `combosquat_nobait` 8, `concat_brandcom` 6. Treffer hängen am exakten Token im `words`-Set (`detector.js:73-84`). Neue deutsche/englische Begriffe (rechnung, mahnung, kontoauszug, überweisung, verifizieren, rückerstattung, invoice, refund, delivery, parcel …) sind unsichtbar; selbst `dhl-paket.de`, `paypalrechnung.de`, `paypalcom.net` bleiben `safe`. Minimalpaare: `paypal-logln.com` → block, `paypal-logni.com` → safe.
2. **Marken-DB-Abdeckung & Kurzmarken (ca. 27 FN).** `db_coverage_gap` 13/13 (Targobank, Hanseatic, Sparda, AOK, TK, Arbeitsagentur, BAWAG, Raiffeisen, SBB, Swisscom, Check24, Immoscout, Finanzamt), `short_brand` 8/8 (ing/dkb/n26/gls/dpd/ups/dhl/hp), dazu `targobank.vercel.app` und 2-Edit-Fälle. Typosquat/Bitsquat greifen erst ab `brand.length >= 5`; 4-Buchstaben-Sonderregel nur für l↔i. 169 Marken sind für reale Phishing-Kampagnen weiterhin eine sehr kleine Grundmenge.
3. **IDN-Diakritika/Punycode außerhalb der Tabelle (9 FN).** Die neue Homoglyph-Tabelle enthält exakt `á é í ó ú ý / à è ì ò ù / â ê î ô û` (`detector.js:42-44`), aber **kein** `ä ö ü ë ñ å/ç/š`. Folge: `spärkasse.de`, `göogle.de`, `visä.com`, `revolüt.com`, `ëbay.de`, `klarnä.com`, `zalandö.de`, `commerzbänk.de` sowie `xn--sprkasse-1za.de` sind **safe**. Die Tabelle deckt genau die alten Audit-FN-Buchstaben ab (páypal, paypál, góogle, ámazon, micrósoft, appl é) – nicht die Klasse „Diakritika allgemein“.
4. **Neue FP-Klassen der Pfad-/Bidi-/userinfo-Regeln (16 FP + 10 Regional-FP).** Die Layer-3-Regel (`detector.js:632-670`) blockiert legitime Nachrichten-/Hilfeseiten mit Marke+login im Pfad (heise, verbraucherzentrale, focus, chip, ionos, mozilla) als `warn`; der Bidi-Check (`detector.js:441-453`) blockiert legitime RTL-URLs mit RLM/LRM hart (aljazeera, bbc arabic, ynet, tagesschau-Query) – ein systematischer FP für arabische/hebräische Nutzer, weil offizielle Markendomain-Hosts vorher `safe` zurückkehren und der Check nur „fremde“ RTL-Seiten trifft. Die userinfo-Regel (`detector.js:372-401`) läuft **vor** dem Offizial-Domain-Freigabepfad und blockiert `paypal.de:token@paypal.de` und `apple:pass@example.com`. Zusätzlich: `signal/box/chase.example.org` als generische Subdomains hart geblockt, während `line/target/medium/zoom/notion/office` über die 6-Wörter-Ausnahme (`detector.js:70`) durchgelassen werden – willkürliche Ausnahmeliste.
5. **Offizielle Regionaldomains + Whitelist-Fail-open + Ausnahme-Evasion.** Alle 10 offiziellen Regionaldomains außerhalb `sites.js` (google.com.tw/hk/co.th, amazon.com.be, ing.it/es/pl/com.au, telekom.at, vodafone.pt) werden als `foreign-domain` **hart blockiert** – die „ccTLD-Sanierung“ ist Whack-a-Mole. Umgekehrt sind **user-kontrollierbare Tenants** auf gelisteten Plattform-Domains `safe`: `evil.force.com/paypal/login`, `evil.my.salesforce.com/paypal/login`, `tenant.anything.force.com/login` (3/3 FN, `sites.js` listet `force.com`/`salesforce.com` als Salesforce-offiziell). Und die `/blog|news|article|doc|docs|api|developer|guide|tutorial/`-Ausnahme (`detector.js:635`) lässt `evil.example/blog/sparkasse/login` durch (3/3 FN), während sie legitime News-Artikel schützt – dieselbe Ausnahme ist Evasion-Kanal und FP-Vermeidung.

---

## 4. Overfitting-/Gaming-Belege

### 4.1 Baseline-Identität (belegt, dass verglichen wird)

| Artefakt | Audit-Baseline | Aktuell |
|---|---|---|
| `shared/detector.js` | SHA-256 `41bf6098…baf9` (128 Zeilen? nein: Audit-Stand) | SHA-256 `9ce177f1…fb07` (696 Zeilen) |
| `shared/sites.js` | SHA-256 `c814babb…9451d`, **165 Marken / 257 Domains** | SHA-256 `9fcfac57…47db`, **169 Marken / 339 Domains** |
| `tests/detector.test.cjs` | SHA-256 `58d6feff…beed3` (static_scan.json) | **identisch** – unverändert |

Quellen: `audit/code/results.json` (Snapshot des Baseline-Stands), `audit/security/probes/results/static_scan.json`, `audit/00_GESAMTAUDIT_ANTIPISHER_V2_FAHRPLAN.md:5,212`, `audit/code/CODE_REVIEW.md:10`. Der Detektor wurde nach dem Audit vollständig ersetzt (+~430 Zeilen), die Marken-DB um 4 Marken/82 Domains erweitert.

### 4.2 Korpus-spezifische Tokens im Baitwort-Set (`detector.js:73-84`)

| Token | Zeile | Korpus-Herkunft |
|---|---|---|
| `logln` | 82 | `audit/lead/lead_probe.cjs`: `paypal-logln.com` |
| `l0gin` | 82 | `lead_probe.cjs`: `paypal-l0gin.com` |
| `airdrop` | 81 | `audit/code/corpus.json`: `metamask-airdrop.com` (alter FN) |
| `deutschland` | 81 | `corpus.json`: `amazon-deutschland.com` (Combosquat-FN) |
| `prime` | 81 | `corpus.json`: `amazonprime-login.com` (alter FN) |
| `inc` | 82 | `lead_probe.cjs`: `paypal-inc.com` |
| `plus` | 82 | `lead_probe.cjs`: `paypal-plus.com` |
| `express` | 82 | `lead_probe.cjs`: `paypal-express.com` |
| `customerservice` | 83 | `lead_probe.cjs`: `paypalcustomerservice.com` |
| `appleid` | 82 | `corpus.json`: `appleid-login.com` (alter FN) |
| `konto`, `sicherheit` | 81 | `corpus.json`: `paypal-konto.de`, `sparkasse-sicherheit.de` (alte FN) |
| `zoll` | 81 | `corpus.json`: `dhl-zoll.com` (alter FN) |

`logln`/`l0gin` sind reine Fuzz-Varianten einzelner Korpus-URLs – sie erkennen **nur** diese Strings (Minimalpaar 4.4).

### 4.3 Code-Muster mit exakter Korpus-Zielrichtung

| Code-Stelle | Zeile | Ziel im veröffentlichten Korpus |
|---|---|---|
| `startsWith(brand + 'com')` / `+ 'de'` | 530 | `lead_probe.cjs`: `paypalcom-login.com`, `paypalcom-verify.com` |
| Ligatur `replace(/rn/g,'m').replace(/vv/g,'w').replace(/cl/g,'d')` | 517 | `lead_probe.cjs`: `arnazon.com`, `rnicrosoft.com` |
| 4-Buchstaben-l↔i-Regel `sk.replace(/l/g,'i')` | 591 | `corpus.json`-FN: `vlsa.com`, `v1sa.com`, `wlse.com` (ubr.com bleibt offen) |
| Diakritika-Tabelle `'á':'a','é':'e','í':'i','ó':'o','ú':'u','ý':'y'` | 42-44 | `corpus.json`-FN: páypal, paypál, góogle, ámazon, micrósoft, appl é |
| `genericSubdomains` (office, line, medium, zoom, notion, target) | 70 | FP-Vermeidung; verhindert weiterhin `office.attacker.com` (alter FN bleibt offen) |
| `multiTenantSuffixes` | 87 | FP-Fix github.io/vercel.app/netlify.app + Blogspot/WordPress u. a. |
| `isDocOrBlog`-Ausnahme | 635 | Doku-/Blog-FP-Vermeidung, gleichzeitig Evasion (3/3 FN) |
| `sensitiveActions`-Pfad-/Query-Regel | 638 | neue Layer-3-Erkennung, erzeugt 6 legitime FP |

### 4.4 Minimalpaare: Erkennung hängt am exakten Token, nicht an der Klasse

| Paar | „getunt“ | Status | „nicht getunt“ | Status | Signal |
|---|---|---|---|---|---|
| baitword_typo | paypal-logln.com | block (credential-bait) | paypal-logni.com | **safe** | ja |
| baitword_leet | paypal-l0gin.com | block | paypal-l0qin.com | **safe** | ja |
| baitword_inc | paypal-inc.com | block | paypal-gmbh.com | **safe** | ja |
| baitword_express | paypal-express.com | block | paypal-bonus.com | **safe** | ja |
| baitword_deutschland | amazon-deutschland.com | block | amazon-oesterreich.com | **safe** | ja |
| brand_com_prefix | paypalcom-verify.com | block | paypalcom-rechnung.com | **safe** | ja |
| ligature_rn | arnazon.com | block (brand-variant) | arnazon-login.com | **safe** | ja |
| l_i_4letters | vlsa.com | block (brand-variant) | lng.de | **safe** | ja |
| concat_customerservice | paypalcustomerservice.com | block | paypalkundenservice.com | **safe** | ja |

→ **9/9 Paare** zeigen: Die Erkennung ist an die im Korpus enthaltene konkrete Mutation gebunden, nicht an die dahinterliegende Phishing-Klasse.

### 4.5 Fix-by-Listing: Korrekturen als Lookup-Einträge

- **Alt-FPs:** 27 FPs im Audit-Baseline → **24/27 werden durch exakt die Domains gefixt, die jetzt in `sites.js` stehen** (`google.co.jp`, `microsoft.co.jp`, `ing.nl`, `coinbase.de`, `visa.fr`, `sparkasse.at`, `google.com.mx/.ar`, `amazon.se`, `walmart.ca`, `bestbuy.ca`, `vodafone.it`, `dhl.co.uk`, `chase.co.uk`, `github.blog`, `pinterest.co.uk`, `microsoft.de`, `wikipedia.de`, `hermes.com`, `elster.com`, `github.io`, `vercel.app`, `netlify.app`). Die übrigen 3 (userinfo-substring-FPs `max.com@example.com` etc.) wurden durch eine allgemeine Boundary-Regel gefixt (positiv).
- **Alt-FNs:** **28/33** sind jetzt blockiert; die 5 offenen (`microsoft365-login.com`, `amazonprime-login.com`, `appleid-login.com`, `ubr.com`, `office.attacker.com`) zeigen, dass die Fixes einzelfallgetrieben sind und die Klasse nicht geschlossen wurde (3 davon sind Mehrfach-Token-Konkatenationen, 1 Kurzmarke, 1 generische Subdomain).
- **Marken-Delta 165 → 169:** Die 4 neuen Marken sind **genau** die vom Audit als fehlend dokumentierten `Gmail`, `Azure`, `Disney+`, `Alipay` (`CODE_REVIEW.md:162,243,584`; `FAHRPLAN:130,216`). Domains 257 → 339 (+82) korrespondieren mit den 24 FP-Fix-Domains plus 19 „official-brand-unlisted“-FPs plus Regionalabdeckung.
- **Datenintegrität als Kollateral:** `hermes.com` und `elster.com` wurden als „offizielle Domains“ der Marken Hermes/Elster eingetragen, obwohl das Audit sie als **Fremdmarken-Kollisionen** dokumentiert (`FAHRPLAN:130`: hermes.com = Luxusmarke, elster.com = Honeywell). Statt die Marke zu entfernen, wurde der FP durch Whitelisting der fremden Marke „gefixt“ – sicherheitsseitig unschädlich (beide sind legitime Firmen), aber semantisch falsch und ein reines Korpus-Patch-Muster.

### 4.6 Tests & Artefakte: wurden Korpora/Tests nachträglich verändert?

| Artefakt | Befund | Beleg |
|---|---|---|
| `tests/detector.test.cjs` | **NEIN, unverändert** (10 Tests) | SHA-256 `58d6feff…` identisch zum Audit-Zeitpunkt (`static_scan.json`); mtime 17:08:09 < Remediation 18:07:12 |
| `audit/lead/lead_probe.cjs` | **NEIN, unverändert** | mtime 17:20:07 < detector.js 18:07:12; SHA-256 `2e59f255…`; nur `lead_probe_results.json` wurde 18:11:54 neu erzeugt |
| `audit/code/corpus.json` | **NEIN, unverändert** | SHA-256 `4dc03978…` = Baseline-Hash aus altem results.json; mtime 17:30:56 |
| `tests/v2-scoring.test.cjs` | **NEU, 5 s nach `detector.js` erzeugt** | mtime 18:07:17; testet exakt Bitsquat/Layer-3/Bidi/Verdict der neuen Implementierung |
| `tests/shield-content.test.cjs` | **NEU, 11 s nach `shield-content.js`** | mtime 18:08:00; mtime-Fenster zeigt Implementierung→Test (Fixture-Fitting, kein test-first) |
| Testsuite | **21/21 PASS** (5 Dateien einzeln) | Baseline 13/13 + 8 neue Feature-Tests = 21/21; `node --test tests/` scheitert weiterhin unter PowerShell (Glob) – bereits Baseline-Befund |
| Build-Kopien | `shared` = `chrome/shared` = `firefox/shared` (detector, sites, shield-content identisch) | SHA-256-Vergleich |

**Fazit Tests:** Die 21/21 sind **echt** und der alte Testbestand wurde nicht manipuliert – aber die 8 neuen Tests sind nach der Implementierung geschriebene Feature-Tests der neuen Mechanismen. Sie belegen die implementierten Regeln, nicht Generalisierung (kein unabhängiger Holdout, keine Negativ-/FP-Regression gegen neue Korpora).

### 4.7 Prozess-Integrität: Baseline-Artefakt während der Verifikation überschrieben

`audit/code/results.json` wurde **während dieser Verifikation** um 18:15:35 von einem anderen Agenten mit dem neuen Detektor neu erzeugt: Hash-Wechsel `BA8CF8C2…` (118.733 B, alter Baseline: 124/184, 33 FN/27 FP) → `1DE39BDB…` (100.143 B, neuer Lauf: 179/184, 5 FN/0 FP). Der alte Stand wurde vorher als Snapshot gesichert und ist in `results.json` dokumentiert. **Cross-Check:** Mein in-memory-Rerun des 184-URL-Korpus liefert exakt dieselben Werte wie der Fremd-Rerun (179/184, 5 FN, 0 FP) → Messung reproduzierbar; aber ohne Git/Schreibschutz ist Audit-Evidenz **nicht manipulationssicher**.

### 4.8 Bewertung Overfitting

**Overfitting/Verkörperung von Korpus-Einträgen: BESTÄTIGT.** Die Remediation folgt erkennbar den Audit-Empfehlungen, implementiert sie aber überwiegend als **exakte Lookup-Einträge** (Baitwörter, Domains, Marken, Diakritika, 4-Buchstaben-Sonderfall) statt als generalisierende Policen (Bait-Semantik, vollständige Unicode/UTS-39-Abdeckung, echte PSL/ccTLD-Daten, Marken-Claim-Prozess). Auf unabhängigen Mutationen derselben Klassen fällt die Erkennung auf TPR 41 %.

---

## 5. Datenintegrität `shared/sites.js` (169 Marken / 339 Domains)

**Automatisiert geprüft:** 169 Marken, 339 Domains, **339 unique, 0 Duplikate**, 0 Marken ohne Domains; `sites-100.json` === Runtime-`VGT_SITES` (konsistent). Build-Drift besteht weiter: `build_sites.py`-Docstring sagt „140+“, Dateiname `sites-100.json`, tatsächlich 169 Marken; `assert >= 120` prüft keine Eigentümerschaft/ccTLD-Abdeckung.

**Risikoklassen in der DB (Stichprobe, vollständige Liste in `results.json → data_integrity`):**

| Domain | Marke | Bewertung | Risiko |
|---|---|---|---|
| `force.com` | Salesforce | Multi-Tenant-PaaS (Salesforce Sites/Communities): Tenants kundenseitig befüllbar, per `withinDomain` als **safe** freigegeben | **fail-open, user-kontrolliert** |
| `salesforce.com` | Salesforce | Jede `*.my.salesforce.com` = kundenkontrollierte Org; Whitelist deckt alle Subdomains ab | **fail-open, user-kontrolliert** |
| `google.github.io`, `microsoft.github.io`, `facebook.github.io` | Google/Microsoft/Facebook | GitHub-Pages-Inhalte unter Drittplattform-Konto als „offizielle Markendomain“ gelistet; Konto-/Repo-Kompromittierung würde Domain vertrauen | third-party-content |
| `github.io`, `vercel.app`, `netlify.app`, `wordpress.com` | GitHub/Vercel/Netlify/WordPress | Plattform-Roots als offizielle Domains; Tenants über `multiTenantSuffixes` ausgenommen → Risiko begrenzt | niedrig |
| `hermes.com` | Hermes | Hermès (Luxusmode), nicht Hermes Paketdienst (myhermes.de/hermesworld.com) | falsche Markenzuordnung |
| `elster.com` | Elster | Elster Group (Messtechnik), nicht deutsches Steuerportal (elster.de) | falsche Markenzuordnung |
| `gls.de` | GLS | Kollision GLS Bank vs. GLS Paketdienst (Audit-Baseline dokumentiert) | mehrdeutiger Inhaber |
| `t-online.de` | Telekom | Portal heute Ströer/Telekom; Brand-Zuordnung veraltet, Domain nicht user-kontrollierbar | niedrig |
| `bund.de`, `gov.uk` | BundID / Gov.uk | gesamte Regierungsroots als safe (breit, aber staatlich kontrolliert) | breit, vertrauenswürdig |
| `db.com`, `vr.de`, `live.com`, `googleapis.com`, `myhermes.de`, `icloud.com`, `block.xyz` | Deutsche Bank/Volksbank/Microsoft/Google/Hermes/Apple/Block | plausibel markeneigen bzw. nicht frei registrierbar | ok |

**Live-Beleg für Fail-open:** Die drei Holdout-Fälle `evil.force.com/paypal/login`, `evil.my.salesforce.com/paypal/login`, `tenant.anything.force.com/login` werden von der Engine **safe** freigegeben (3/3 FN) – ein Angreifer mit Salesforce-Tenant kann Login-Formulare unter einer als Marken-Domain gelisteten Domain hosten. Zusätzlich: 24 Alias-Domains, deren Baselabel nicht den Markennamen enthält (fb.com, x.com, t.me, youtu.be, redd.it, icloud.com, live.com, force.com, vr.de, db.com …) – überwiegend legitime Marken-Aliase, aber ohne Claim-/Review-Prozess nicht dauerhaft verifizierbar.

---

## 6. Performance (10.000 classify-Aufrufe, Node v24.13.0, AMD Ryzen 5 4600H)

**Methodik:** `process.hrtime.bigint` pro Einzelaufruf, 500 Warmup, 10.000 Aufrufe je Wiederholung, Round-Robin über die URLs; keine Netz-/FS-Zugriffe im Messpfad. Unter **paralleler Last anderer Team-Agenten** (12 logische Kerne geteilt) → robuste Kennwerte = Median der Wiederholungsläufe + Range (alle Rohwerte in `perf.txt`/`results.json`).

| Messreihe | Reps × 10k | robuster Median | robuster p95 | Range Median | Range p95 |
|---|---|---|---|---|---|
| Holdout-Mix (adversarial) | 7 × 10k | **0,660 ms** | **2,009 ms** | 0,576–1,287 ms | 1,024–3,561 ms |
| 184-URL-Audit-Korpus (Baseline-Korpus) | 7 × 10k | **0,087 ms** | **0,870 ms** | 0,085–0,091 ms | 0,848–1,000 ms |
| nur erwartete safe-URLs | 3 × 10k | 0,576 ms | 1,063 ms | – | – |
| nur erwartete block-URLs | 3 × 10k | 0,612 ms | 1,040 ms | – | – |
| Kaltstart (erster Aufruf) | – | 0,590 ms (Streuung 0,57–1,32 ms über Läufe) | – | – | – |

**Vergleich Audit-Baseline 0,506 ms Median / 2,58 ms p95** (`FAHRPLAN:344`, ebenfalls unter Audit-Last erhoben):

- **184-URL-Korpus:** robuster Median 0,087 ms und p95 0,870 ms → **beide unter Baseline**; der Detektor ist auf dem Baseline-Korpus deutlich schneller (auch die alte `results.json` nannte 0,2525/0,6297 ms).
- **Holdout-Mix:** Median 0,660 ms → **+0,154 ms über Baseline**, p95 2,009 ms → **unter Baseline**, aber **über 1 ms**. Der Claim „< 1 ms“ ist damit nur als **Median** und nur auf benchmark-ähnlichem Mix reproduzierbar, **nicht als p95** und nicht auf adversarialem Mix. „Kein Netzwerk im Messpfad“ ist korrekt.
- Frühere Volläufe dieses Runners zeigten unter Team-Last Holdout-Median 0,61–0,85 ms / p95 1,12–4,28 ms → die Range ist lastgetrieben; die robusten Kennwerte sind die belastbare Aussage.

---

## 7. Bewertung der Behauptungen / Release-Gate

| Behauptung (Quelle) | Status | Evidenz |
|---|---|---|
| „0/26 FP, 0/40 FN, 100 % Trefferquote“ (Next.md:29,37,38,82,108; README.md:67,76) | **REPRODUZIERT nur auf lead_probe; als Generalisierungsclaim FAIL** | eigener Rerun: 0/26 FP, 0/40 FN; aber Audit-Korpus 5/98 FN und Holdout 98/166 FN (59 %), 26/121 FP (21,5 %) |
| „21/21 Unit-Tests“ (Next.md:108) | **CONFIRMED** | 21/21 einzeln ausgeführt; 8 neue Tests sind Feature-Tests der neuen Mechanismen, `node --test tests/` scheitert (Glob) wie in Baseline |
| „169 Marken / 339 Domains“ (Next.md TASK-03) | **CONFIRMED (Daten), aber Abdeckungslücke** | 169/339, unique, keine Dups; jedoch +4 Marken = exakt Audit-Fehlliste; 13/13 coverage-gap-FNs im Holdout |
| „< 1 ms Erkennungszeit“ (Next.md, Performancebudget) | **TEILWEISE** | 184-URL-Korpus ja (Median 0,087/p95 0,870); Holdout-Mix Median 0,660 ja, p95 2,009 **nein** |
| „lückenloser Subdomain-/Schutz“ / „Zero-FN“ (implizit) | **FAIL** | `office.attacker.com`, `rnicrosoft.evil.test`, `appleid.evil.test`, Multi-Tenant-/Pfad-FNs; Whitelist-Fail-open via force.com/salesforce.com |
| Keine Quellcode-/Testmanipulation | **BESTÄTIGT für Tests/Probe-Korpora; Baseline-Artefakt wurde von anderem Agenten überschrieben** | Hashes/mtimes Abschnitt 4.6/4.7 |
| Generalisierung/kein Overfitting | **FAIL (Overfitting bestätigt)** | 9/9 Minimalpaare, Fix-by-Listing 24/27 FP / 28/33 FN, +4 Marken = Audit-Fehlliste |
| Browser-E2E-Wirksamkeit (DNR/Redirect/Shield) | **NOT_TESTED** | kein Browser verfügbar; separater Teammate |

**Release-Gate „Detektor-Generaliserung & Overfit“: FAIL.** Freigabe nur mit: (a) Korrektur der 100 %-Claims, (b) Generalisierung statt Token-Listen (Bait-Semantik/mehrsprachige Lexika, vollständige UTS-39/46-Diakritika, echte PSL + ccTLD-Registry, Marken-Claim-Prozess), (c) unabhängige, versionierte Holdout-/FP-Korpora in CI mit TPR/FPR-Gates, (d) Schreibschutz/Versionierung der Audit-Baseline-Artefakte, (e) Fail-secure statt Whitelist für Multi-Tenant-Plattformen (force.com, my.salesforce.com, *.github.io).

---

## 8. Reproduktion

```powershell
# Holdout + veröffentlichte Korpora (read-only replay) + Overfit-/Integritätsbelege + Perf:
node audit/verify/holdout/run_holdout.cjs
# -> schreibt audit/verify/holdout/results.json und perf.txt (Quellcode bleibt unverändert)

# Tests einzeln (Verzeichnis-Glob schlägt unter PowerShell fehl):
node --test tests/detector.test.cjs
node --test tests/chrome-worker.test.cjs
node --test tests/firefox-worker.test.cjs
node --test tests/shield-content.test.cjs
node --test tests/v2-scoring.test.cjs
```

**Dateien/Belege:** `corpus.json` (SHA-256 `721400EC…ABA8`), `results.json` (SHA-256 `6512B0E7…D2FE`), `perf.txt` (SHA-256 `DC641CFA…7F1D`), `run_holdout.cjs` (SHA-256 `6EB39C2C…E634`).
`results.json` enthält maschinenlesbar: Gesamt-/Kategorie-/Strata-Metriken, alle FN/FP-Rohfälle, Published-Claim-Check (Audit-Korpus 184, Lead-Probe 66), Old-vs-New-Fix-Matrix, Overfit-Minimalpaare, Artefakt-Hashes/mtimes/Timeline, Datenintegritäts-Stichprobe, Perf-Rohdaten.

## 9. Nicht getestet / Restunsicherheiten

- **NOT_TESTED:** echte Browser-Ausführung (Chrome/Firefox-Navigation, DNR-Redirects, Content-Shield-Interstitial, Service-Worker-Races), Netz-/DNS-Verhalten, Update-/Feed-Mechanik, Store-/Rechtsfragen.
- **NOT_TESTED:** systematische Live-Verifikation der 339 Domain-Eigentümerschaften (kein Netzwerk/DNS); Datenintegrität stützt sich auf In-Repo-Auditbelege + Fachwissen, Einzelbewertungen mit `confidence` markiert.
- Grauzonen-Erwartungen (`conf: mittel`, z. B. Combosquat ohne Bait, Bitsquat-Sonderfälle) sind separat ausgewiesen; die Kernaussage bleibt auch bei ausschließlicher Betrachtung der `conf: hoch`-Fälle bestehen (FN 40,6 %, FP 10,1 %).
- Die 5 Audit-Korpus-FNs bzw. 3 offenen Sonderfälle sind **nicht** durch Messfehler erklärbar – sie sind im Code begründbar (Mehrfach-Token-Konkatenation, 3-Buchstaben-Marke, generische Subdomain-Ausnahme).
