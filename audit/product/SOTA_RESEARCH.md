# SOTA_RESEARCH — State of the Art domainbasierter Phishing- und Marken-Impersonations-Erkennung

**Projekt:** Antipisher (vormals VGT DomainGuard), Version 0.1.0 Alpha
**Dokumenttyp:** Technologie-/Marktrecherche für den V2-Blueprint (AUDIT-/RESEARCH-Modus, keine Quellcodeänderung)
**Stand:** 18.10.2026
**Verfasser:** Produkt-/Technologie-Strategie (Teammitglied `product-strategist`)
**Abgrenzung:** Dieses Dokument beschreibt den externen Stand der Technik und leitet daraus Anforderungen ab. Die konkrete Architektur, Roadmap und Priorisierung stehen in [`V2_BLUEPRINT.md`](./V2_BLUEPRINT.md).

---

## 0. Methode, Bewertungsschema und Ehrlichkeitsregeln

### 0.1 Vorgehen

1. Analyse des Ist-Zustands von Antipisher (Quellcode, Datenmodell, Build) — siehe Abschnitt 1 und Blueprint.
2. Web-Recherche zu Standards, Feeds/APIs, Browser-Vendor-Mechanismen, kommerziellen Produkten, akademischen Systemen und Rechtsrahmen (Oktober 2026). Jede Kernaussage ist mit einer überprüfbaren Quelle verlinkt; Quellen ohne erfolgreichen Abruf sind ausdrücklich als „nicht verifiziert“ markiert.
3. Bewertung jeder Datenquelle und jedes Produkts nach fünf Kriterien.
4. Übertrag auf Antipisher: was übernehmbar, was nicht, was wäre neu.

### 0.2 Bewertungsschema

| Kriterium | Skala | Bedeutung |
|---|---|---|
| Erkennungsnutzen | 1–5 | 1 = marginal, 5 = hoher, breiter Beitrag zur Marken-/Domain-Phishing-Erkennung |
| Latenz/Update | A–D | A = vollständig lokal bzw. < 100 ms; B = Sekunden, lokal cachebar; C = Netzwerk pro Aufruf/Stunden-Verzögerung; D = Minuten/Tage, Batch |
| Privacy/DSGVO | 🟢/🟡/🔴 | 🟢 keine Nutzerdaten an Dritte; 🟡 Metadaten/URLs an Dritte, Zweckbindung klärbar; 🔴 personenbeziehbare URL-/Verlaufsdaten an Dritte ohne klare Rechtsgrundlage |
| ToS/Kosten | Text | Lizenz-/ToS-Restriktionen, Preis Modell |
| Integrationsaufwand | S/M/L | S ≈ 1–3 Personentage; M ≈ 1–3 Personenwochen; L ≈ > 3 Personenwochen inkl. Datenpflege/Betrieb |

### 0.3 Kennzeichnung im Text

- **FAKT** = durch Quelle belegt (Link vorhanden).
- **HERSTELLERANGABE** = Aussage eines Anbieters über das eigene Produkt; nicht unabhängig geprüft.
- **EMPFEHLUNG** = meine Bewertung/Ableitung für Antipisher.
- **ANNAHME/UNSICHER** = plausible, aber im Rahmen dieser Recherche nicht belegte Aussage.
- **NOT_TESTED** = bewusst nicht geprüft (kein Zugriff, kein Tool, kein Auftrag).

### 0.4 Grenzen dieser Recherche (ehrlich)

- Einzelne Anbieterseiten blockierten automatisierte Abrufe (z. B. Malwarebytes Browser Guard: HTTP 403). Solche Produkte werden als **NOT_TESTED** geführt statt mit erfundenen Eigenschaften.
- Für Safari (Apple) wurde keine belastbare Primärquelle erfolgreich abgerufen; Safari wird deshalb nicht bewertet.
- Preislisten (z. B. Google Web Risk) wurden geprüft, soweit erreichbar (siehe §5.2); Anbieterpreise von Bitdefender/SafeToOpen werden nur als Herstellerangaben/Marktkontext wiedergegeben, nicht als verifizierte Kostenmodelle.
- CertStream: Die Projektseite lieferte keinen maschinenlesbaren Inhalt; der Betriebsstatus ist unklar (siehe Abschnitt 5.8). Es wird deshalb nicht als Produktionsabhängigkeit empfohlen.
- Diese Recherche ist keine Rechtsberatung. DSGVO-/ePrivacy-/CRA-Aussagen sind technische Einordnungen und müssen anwaltlich geprüft werden.

---

## 1. Ist-Zustand von Antipisher in einem Absatz (Bezugspunkt der Recherche)

**FAKT (Codebelege):** Antipisher 0.1 ist eine Chrome-/Firefox-MV3-Extension mit 165 manuell kuratierten Marken (`shared/sites.js`, Datenmodell `{name, brand, domains[]}`), einem lokalen deterministischen Klassifikator (`shared/detector.js`: Punycode-Dekodierung, NFKD-/Homoglyph-Skelett, Damerau-Levenshtein-Distanz ≤ 1, heuristische Public-Suffix-Erkennung mit 13 Multi-Tenant-Suffixen, Credential-Bait-Wortliste, Unsichtbarzeichen-Regex) und zwei sehr unterschiedlichen Browser-Integrationspfaden: Chrome leitet **alle** HTTP(S)-GET-Hauptdokumente per DNR-Regel auf eine lokale Guard-Seite um (`chrome/background.js`, Zeilen 14–41) und lässt nach Klassifikation per Session-Allow-Regel weiterleiten; Firefox blockiert Hauptdokumente präventiv per `webRequest.onBeforeRequest` (`firefox/background.js`). Es gibt keinen Update-Kanal für Marken-/Bedrohungsdaten, keine Signaturprüfung, keine Content-/Formular-/Logo-Signale, keine Redirect-Ketten-Analyse und kein Feed-Backend. Die lokal gemessene Erkennung ist für einfache Fälle gut und für mehrere realistische Angriffs- und FP-Klassen blind (Belege in Abschnitt 4 des Blueprints; hier nur als Kontext).

**Wichtig für die Recherche:** Jede SOTA-Empfehlung muss an dieser Realität gemessen werden: 100 % offline, keine Server-Infrastruktur, AGPLv3, 165 Marken, zwei Browser, ein Entwicklerteam.

---

## 2. Bedrohungsbild und Marktrelevanz (FAKTEN mit Quellen)

| Befund | Zahl | Quelle |
|---|---|---|
| Gemeldete Phishing-Angriffe im Q4 2024 (APWG) | **989.123** (Okt–Dez 2024; Q3 2024: 932.923) | [APWG 4Q2024](https://docs.apwg.org/reports/apwg_trends_report_q4_2024.pdf), [APWG-Index](https://apwg.org/trendsreports/) |
| Monatlich neu angegriffene Marken (APWG) | **315 / 333 / 309** (Okt/Nov/Dez 2024) | [APWG 4Q2024](https://docs.apwg.org/reports/apwg_trends_report_q4_2024.pdf) |
| Meistangegriffene Sektoren Q4 2024 | SaaS/Webmail 23,3 %, Social Media 22,5 %, Finanz 11,9 %, E-Commerce 10,9 %, Payment 7,0 % | [APWG 4Q2024](https://docs.apwg.org/reports/apwg_trends_report_q4_2024.pdf) |
| EU-weit analysierte Incidents (ENISA Threat Landscape 2025) | **4.875** Incidents (1.7.2024–30.6.2025) | [ENISA TL 2025](https://www.enisa.europa.eu/publications/enisa-threat-landscape-2025) |
| 24-h-Phishing-Aktivität, meistattackierte Marken (OpenPhish) | Meta 55,2 %, Roblox 9,3 %, Crypto/Wallet 8,7 %, Amazon 1,8 %, … | [OpenPhish](https://openphish.com/) |
| Angriffe über neu registrierte/schlecht reputierte TLDs (Beispiel) | Smishing-Kampagnen über `.top`/`.cyou`/`.xin`; ICANN-Breach-Letter gegen .TOP | [APWG 4Q2024](https://docs.apwg.org/reports/apwg_trends_report_q4_2024.pdf) |

**EMPFEHLUNG:** Die Markenliste von Antipisher (165) deckt zufällig viele der global meistattackierten Marken ab, aber nicht systematisch die deutschsprachigen Ziele (Sparkassen, Volksbanken, Versicherer, Behörden, Energieversorger, Paketdienste). Für den EU/DE-Fokus ist eine **deutsche Marken-Top-100/200-Liste** auf Basis von APWG-/OpenPhish-/BSI-/Verbraucherzentralen-Meldungen und Banken-/Behörden-Zielen nötig. APWG-Zahlen sind **gemeldete** Fälle, keine Grundgesamtheit.

**ANNAHME/UNSICHER:** Ein belastbarer Zahlenvergleich „Antipisher erkennt X % der Phishing-Domains“ ist mit den vorliegenden öffentlichen Daten ohne eigenen, lizenzierten Korpus nicht möglich (siehe Benchmark-Methodik im Blueprint).

---

## 3. Technische Grundlagen: IDN, Unicode-Sicherheit und Domain-Parsing

### 3.1 IDNA, Punycode, UTS #46

**FAKT:** Internationalisierte Domainnamen werden über IDNA/Punycode (`xn--…`) in ASCII übertragen. UTS #46 definiert die browserseitige Kompatibilitätsverarbeitung (Mapping, Validierung, ToASCII/ToUnicode) und beschreibt vier **Deviation-Zeichen** (ß U+00DF, ς U+03C2, ZWJ U+200D, ZWNJ U+200C), bei denen IDNA2003 und IDNA2008 zu **unterschiedlichen Zielen** auflösen können — inklusive eines in der Spezifikation explizit durchgespielten Phishing-Szenarios mit einer deutschen Sparkassen-Domain. ([UTS #46](https://www.unicode.org/reports/tr46/))
**FAKT:** Die Transition ist abgeschlossen; UTS #46 wird in der aktuellen Version 18.0.0 (2026) als nicht-transitionale Verarbeitung beschrieben. ([UTS #46](https://www.unicode.org/reports/tr46/))
**EMPFEHLUNG:** Antipisher darf Domainvergleiche **nicht** auf Basis eines selbstgebauten Punycode-Decoders allein durchführen. Der Decoder sollte 1:1 durch eine UTS #46-konforme `ToUnicode`-Implementierung ersetzt bzw. dagegen abgesichert werden (Testvektoren: `IdnaTestV2.txt` aus UTS #46). Die im Ist-Zustand vorhandene Decoder-Logik (`shared/detector.js`, Zeilen 69–121) ist ein sinnvoller Anfang, aber kein Konformitätsnachweis.

### 3.2 UTS #39: Mixed-Script, Confusables, Restriction Levels

**FAKT:** UTS #39 definiert u. a. `skeleton()`, Mixed-Script-Detection (auf Basis von Script-Extensions und aufgelösten Script-Sets), Mixed-Number-Detection, Whole-Script-Confusables sowie Restriction Levels 1–6. Für Domainnamen ist insbesondere das Zusammenspiel „Latin + Cyrillic/Greek“ kritisch; in-script-Confusables (z. B. Ziffern/Buchstaben) sind ebenfalls abgedeckt. ([UTS #39](https://www.unicode.org/reports/tr39/))
**FAKT:** Confusables sind prinzipbedingt **graduell** (Fonts, Kontext, Schriftsysteme); UTS #39 selbst warnt, dass Whole-Script-Confusables viele legitime Latin-/Cyrillic-Strings markieren würden und dass eine Browser-Warnung die TLD-Semantik berücksichtigen sollte (z. B. kyrillisch unter `.рф` legitim). ([UTS #39](https://www.unicode.org/reports/tr39/), Abschnitt 4.1/6)
**EMPFEHLUNG:** Antipisher 0.1 nutzt eine **handkuratierte Teilmenge** von Homoglyphen (rund 150 Zeichenzuordnungen, `shared/detector.js` Zeilen 13–43). V2 muss die **vollständige`confusables.txt`/`confusablesSummary.txt`-Datenbasis aus UTS #39 einbetten**, Mixed-Script- und Whole-Script-Confusable-Erkennung implementieren und das TLD-/Sprachkontext-Regelwerk übernehmen. Ein reiner Zeichen-Map-Vergleich erzeugt sonst systematische False Negatives (z. B. kyrillisches „раураl“ gegen „paypal“ in anderer Schreibweise) und False Positives.

### 3.3 Chrome-IDN-Anzeigepolitik und Lookalike-Warnung (Wettbewerb durch den Browser selbst!)

**FAKT:** Chrome entscheidet **pro Label**, ob Unicode oder Punycode angezeigt wird. Die Prüfkette umfasst u. a.: Fehler bei `ToUnicode` → Punycode; Zeichen außerhalb UTS-39-`Identifier_Status=Allowed` → Punycode; Mixed-Script-Prüfung nach „Highly Restrictive“ (Latin/Cyrillic/Greek nicht mischbar, Latin nur mit Han/Bopomofo/Japanisch/Koreanisch); Mixed-Number-Check; Mixed-Script-/Wide-Script-Confusables; und „Skeleton identisch zu Top-Domain“ → Punycode. Chrome wendet das mit eigenen Ausnahmen/TLD-Listen an. ([Chrome IDN-Doku](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md))
**FAKT:** Zusätzlich implementiert Chrome eine **Lookalike-Interstitial-Warnung**, die Hauptdokument-Navigationen blockiert, wenn der Hostname denselben Skeleton wie eine „recently engaged site“ oder eine Top-500-Domain hat. Ausnahmen: hoher Site-Engagement-Score, Domain in `domains.list`, vorheriges „Ignore“ pro Tab. **Alle Prüfungen laufen lokal.** ([Chrome IDN-Doku](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md))
**FAKT:** Firefox verwendet laut Mozilla-Privacy-Notice ebenfalls **Googles Safe-Browsing-Dienst** für Phishing-/Malware-Schutz; Mozilla betreibt daneben eine eigene IDN-Display-Algorithmik (in der Chrome-Doku als ähnlich beschrieben). ([Firefox Privacy Notice](https://www.mozilla.org/en-US/privacy/firefox/), [Chrome IDN-Doku](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md))

**EMPFEHLUNG (zentrale strategische Erkenntnis):**
1. Der Browser schützt bereits gegen **Homograph-/Lookalike-Angriffe auf Top-500-Domains und vom Nutzer häufig besuchte Seiten**. Ein Produkt, das nur „Punycode/Homoglyph gegen Markenliste“ kann, ist damit **teilweise redundant** — Differenzierung entsteht erst durch (a) **deutsche/EU-Marken außerhalb Top-500**, (b) **erklärbare Marken-Zuordnung** („Sie sind auf paypa1.com, gemeint ist PayPal (paypal.com)“), (c) **bessere Aktualität** für neue Kampagnen, (d) **Kombination mit Markenkontext** statt reiner Zeichenprüfung.
2. Es ist ein kommerziell relevantes Risiko, wenn Antipisher dasselbe tut wie Chrome, aber langsamer/fehleranfälliger (globaler DNR-Redirect). V2 muss die Browser-Primitive **ergänzen**, nicht duplizieren.

### 3.4 Public Suffix List (PSL)

**FAKT:** Die PSL ist eine von Mozilla gepflegte Community-Liste aller bekannten Public Suffixes (`com`, `co.uk`, `pvt.k12.ma.us`, …), die u. a. für korrekte Domain-/Cookie-/History-Grenzen genutzt wird. ([Public Suffix List](https://publicsuffix.org/))
**FAKT:** Die PSL ist maschinell abrufbar und wird täglich aktualisiert; sie hat für Dienste wie URLhaus eine operative Rolle: URLhaus schließt bei seiner RPZ-/Hosts-Datei Hostnames aus, deren Domain in den **Tranco Top 1M** steht, um False Positives zu reduzieren. ([Public Suffix List](https://publicsuffix.org/), [URLhaus API](https://urlhaus.abuse.ch/api/))
**EMPFEHLUNG:** Die im Ist-Zustand selbstgebaute „PSL-Heuristik“ (`shared/detector.js`, Zeilen 175–189: nur `co/com/org/net/ac/edu/gov/gv/priv` + zweibuchstabige TLD) ist keine PSL. Sie verursacht nachweislich Fehlklassifikationen bei `paypal.co.uk`, `visa.fr`, `paypal.co.jp` usw. (siehe lokale Messung im Blueprint). V2 muss die **echte, gebündelte PSL** (mit ICANN-/Private-Sektion) verwenden und signiert aktualisieren.

---

## 4. Typosquatting- und Impersonations-Familien

**FAKT (Stand der Forschung):** „Combosquatting“ — Marke + Phrase (z. B. `betterfacebook.com`, `youtube-live.com`) — wurde in einer groß angelegten Studie über **468 Mrd. DNS-Records** und fast **6 Jahre** analysiert. Fast **60 %** der missbräuchlichen Combosquatting-Domains lebten **länger als 1.000 Tage**; Combosquatting wird u. a. für Phishing, Social Engineering, Affiliate- und Markenmissbrauch genutzt. ([Kintis et al., CCS 2017 / arXiv:1708.08519](https://arxiv.org/abs/1708.08519))
**FAKT (Forschung):** Die Arbeit vergleicht typische Squatting-Familien (Tippfehler/Edit-Distanz, Combosquatting, Bitsquatting u. a.) und zeigt, dass einfache Edit-Distanz-Modelle einen großen Teil der realen Domains **nicht** erfassen. ([Kintis et al.](https://arxiv.org/abs/1708.08519))

| Familie | Prinzip | Beispiel | Erkennung (lokal möglich?) | Abdeckung Antipisher 0.1 (EMPFEHLUNG: messen, nicht behaupten) |
|---|---|---|---|---|
| Deletion | Zeichen fehlt | `paypa1`→`paypal`, `goole.com` | ja: Edit-Distanz | ja, DL ≤ 1 (nur Basis-Label, Markenlänge ≥ 5) |
| Insertion | Zeichen eingefügt | `paypall.com`, `gooogle.com` | ja: Edit-Distanz | ja (DL ≤ 1) |
| Substitution | Zeichen ersetzt | `paypa1.com`, `rnicrosoft.com` (rn↔m = 2 Zeichen!) | ja, aber DL ≤ 1 reicht nicht | nur teilweise; `rnicrosoft.com` wird **nicht** erkannt (lokale Messung) |
| Transposition | Buchstabendreher | `amzaon.com`, `goolge.com` | ja: Damerau-Levenshtein | ja (Damerau-Distanz 1) |
| Leetspeak/Ziffern | 0↔o, 1↔l/i, 3↔e … | `amaz0n.com`, `g00gle.com` | ja: Mapping | ja (Mapping in Homoglyphtabelle) |
| Bitsquatting | Bit-Flip in DNS-Paket → Ein-Zeichen-Distanz | `micr0soft.com`, `amlzon.com` | ja, aber Datenmenge | teilweise (DL ≤ 1), aber kein dediziertes Bit-Modell |
| Combosquatting | Marke + Phrase | `paypal-security.com`, `amazon-live.com` | ja: Token-/Wortlisten | teilweise (nur feste 58-Wort-Liste, Zeilen 52–60) |
| Keyword-/Bait-Kombination | Phrase + Marke | `secure-paypal.com`, `login-paypal.com` | ja | teilweise |
| TLD-Swap | Marke mit fremder TLD | `paypal.de`, `visa.net` | ja | **problematisch**: blockt auch legitime offizielle Ländereien (FP) |
| ccTLD-/Regionalvarianten | offizielle lokale Domain | `amazon.co.jp`, `sparkasse.de` | nur mit Datenpflege | teils ja (Datenliste), teils nein (siehe FP) |
| Homophone / Soundsquatting | lautlich ähnlich | `paypall`, „kraken“-Varianten | teilweise (Phonetik) | **nicht** implementiert (ANNAHME: keine Belege im Code) |
| IDN-Homograph | andere Schrift, gleiches Aussehen | kyrillisches `аpple.com` | ja, mit UTS-39-Daten | teilweise (Teiltabelle) |
| Subdomain-Impersonation | Marke als Subdomain eines Fremdhosts | `apple.attacker.com` | ja, mit PSL | ja, aber FP bei generischen Wörtern (`box.example.com`, `signal.example.com`) |
| Foreign-Domain-Embedding | offizielle Domain als Subdomain-Teil | `paypal.com.attacker.com`, `paypal.github.io` | ja, aber Datenpflege | ja/teilweise; `sso-paypal.com.evil.tld` **nicht** erkannt |
| Path-/Query-Phishing | Marke nur im Pfad/Query | `evil.com/paypal/login` | nur mit URL-Pfad-Analyse | **nein** (Host-only) |
| Redirect/Shortener | Kurz-URL → Phishing-Ziel | `bit.ly/…` | nur mit Redirect-Analyse | **nein** |
| Userinfo-Trick | `https://paypal.com@evil.com` | s. o. | ja | ja |
| Invisible/Bidi-Control | ZWSP, Soft-Hyphen, RLO | `pay\u200Bpal.com` | ja, Zeichenklassen | nur Teilmenge (Regex Zeile 46 ohne Bidi-Steuerzeichen) |

**EMPFEHLUNG:** V2 sollte die Familien **gewichtet** und **kombiniert** bewerten (Scoring statt binärer Block), statt die Erkennung nur über `damerauDistanceOne` zu lösen. Die Combosquatting-Studie liefert die Begründung: Langlebige, token-kombinierte Domains sind ein eigener, großer Angriffsvektor, den reine Edit-Distanz systematisch verfehlt.

---

## 5. Datenquellen, APIs und Feeds (mit Bewertung)

### 5.1 Google Safe Browsing (Update API v4) — lokal cachebarer Hash-Prefix-Ansatz

**FAKT:** Die Safe-Browsing-Update-API lädt **Hash-Präfixe** (typisch 4 Byte SHA-256) von Threat-Listen, speichert sie lokal und prüft URLs offline; nur bei einem Präfix-Treffer wird der Präfix an Google gesendet, um vollständige Hashes zu erhalten. („In den meisten Fällen 4-Byte-Präfixe“.) ([Safe Browsing v4 Update API](https://developers.google.com/safe-browsing/v4/update-api))
**FAKT:** Client-seitig muss eine lokale Datenbank gepflegt und mit `minimumWaitDuration`/`negativeCacheDuration` gedrosselt werden; Zustands- und Checksummen-Validierung ist vorgesehen. ([Safe Browsing v4 Update API](https://developers.google.com/safe-browsing/v4/update-api))
**FAKT (kritisch für ein Produkt):** Die Safe-Browsing-API-ToS erlaubt die Nutzung **ohne separate Vereinbarung mit Google nicht für kommerzielle Zwecke**; zudem sind Attributions-/Warnhinweise vorgeschrieben, Google-Attribution darf nicht auf eigene Warnungen für Nicht-Google-Einträge gesetzt werden, und ein URL-Eintrag darf nur als unsicher behandelt werden, wenn die Information **innerhalb der letzten 30 Minuten** aktualisiert wurde. ([Safe Browsing API ToS](https://developers.google.com/safe-browsing/v4/terms))
**FAKT:** Chrome Standard-Schutz sendet standardmäßig eine **verschleierte URL-Teilmenge über Privacy-Server**, Enhanced Protection sendet URL + Seiteninhalt-Stichprobe + Systeminformationen; Standard sendet vollständige URLs/Inhalte „nur bei verdächtigem Verhalten“. ([Chrome Safe-Browsing-Hilfe](https://support.google.com/chrome/answer/9890866))

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 5 (sehr hohe Trefferquote, weltweite Datenbasis) | B (lokal nach Sync; Sync selbst Netz) | 🟡 (Hash-Präfixe/URLs an Google; Standard-Modus nutzt Obfuskation, Enhanced sendet mehr) | **kommerziell ohne separate Vereinbarung unzulässig**; Attribution & 30-min-Frische | M–L | Für Open-Source-/non-commercial Antipisher möglich; für eine **kommerzielle** Edition nur mit Google-Vertrag oder über Web Risk |

**EMPFEHLUNG:** Nicht als „100 % offline“-Feature vermarkten. Als **opt-in**, signierten/gecachten Zusatzkanal in Betracht ziehen — aber nur, wenn das Geschäftsmodell die ToS-Frage klärt. Alternative: eigener Feed (siehe 5.6) + Web-Risk-Vertrag für Enterprise (Preise **nicht verifiziert**, siehe 5.2).

### 5.2 Google Web Risk API

**FAKT:** Web Risk ist das kommerzielle Google-Cloud-Produkt auf Basis derselben Datenbasis wie Safe Browsing; es bietet eine **Lookup API** (URL-Abfrage), eine **Update API** (Download gehashter Listen für eine lokale Datenbank; laut Anbieter „privacy preserving“) und eine **Submission API**. ([Web Risk Produktseite](https://cloud.google.com/security/products/web-risk))
**FAKT (Pricing, Stand der abgerufenen Seite):** `uris.search` (Lookup) ist bis **100.000 Calls/Monat kostenlos**, danach **0,50 USD pro 1.000 Calls**; `hashes.search` (Lookup-/Update-Konfirmation) kostet **50 USD pro 1.000 Calls**; `threatLists.computeDiff` (Update der lokalen Datenbank) ist **kostenlos**; die Submission API ist auf Anfrage. ([Web Risk Produktseite](https://cloud.google.com/security/products/web-risk))
**HERSTELLERANGABE:** Web Risk scannt „über 10 Mrd. URLs und Dateien täglich“ und schützt „über 5 Mrd. Geräte“; diese Reichweitenzahlen sind nicht unabhängig geprüft.

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 5 | B/C (Update-API-Downloads lokal cachebar) | 🟡/🔴 je Modell (Lookup = URL an Google; Update = Hash-Präfixe) | kommerziell, Pay-as-you-go; Update-Diff kostenlos, Hashes 50 USD/1k Calls | M | Für eine kommerzielle Consumers-Edition zu teuer pro Nutzer-Navigation; realistisch für **Enterprise/Lookup-Backend** oder wenn eine lokale Update-DB wirtschaftlich betrieben wird |

### 5.3 PhishTank (Cisco Talos)

**FAKT:** PhishTank bietet eine einfache Check-URL-API (`checkurl.phishtank.com/checkurl/`, JSON/XML/PHP), Rate-Limits mit `X-Request-Limit*`-Headern, optionalen API-Key (höhere Limits) und empfiehlt bei hoher Last ausdrücklich den **Download der Datenbank für lokale Lookups**. Betreiber: Cisco Talos; Nutzung unter CISCO-EULA (ToS-Link der API-Seite). ([PhishTank API](https://phishtank.org/api_info.php))
**FAKT:** PhishTank ist eine Community-Datenbank mit Verifikationsprozess (verified/valid-Felder). ([PhishTank API](https://phishtank.org/api_info.php))

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 3–4 (breite Abdeckung, aber gemeldete URLs, oft kurze Lebensdauer) | C/D (API bzw. Batch-Download) | 🟡 (API-Check überträgt konkrete URL an Dritte) | kostenlos, EULA/Attribution; Rate-Limits | S/M | Gut als **Batch-Feed für Offline-Datenbank**; nicht als Echtzeit-Lookup im Browser |

### 5.4 OpenPhish

**FAKT:** OpenPhish veröffentlicht 24-h-Statistiken zu meistattackierten Marken/Sektoren/ASNs; die frei zugängliche Website zeigt aggregierte Daten. ([OpenPhish](https://openphish.com/))
**ANNAHME/UNSICHER:** Die genauen Lizenz-/ToS-Bedingungen des frei vs. kommerziell nutzbaren Feeds konnten in dieser Recherche nicht verifiziert werden (Terms-Seite war nicht abrufbar). Vor Integration **schriftlich klären**.

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 4 (aktuell, markenbezogen) | C/D | 🟡 (Feed enthält URLs/Domains) | unklar, vermutlich kommerzielle Lizenz nötig | M | Als positiver Benchmark-/Feed-Kandidat nur mit geklärter Lizenz |

### 5.5 URLhaus (abuse.ch)

**FAKT:** URLhaus erfordert einen **Auth-Key** (kostenlos über abuse.ch); Dumps werden alle 5 Minuten erzeugt (Bitte nicht häufiger abrufen); RPZ-/Hosts-Datensätze schließen Hostnames aus, deren Domain in **Tranco Top 1M** steht, um False Positives zu senken; URL-Kurzverkürzer/Redirect-only-URLs sind ausdrücklich **kein** zulässiger Inhalt. ([URLhaus API](https://urlhaus.abuse.ch/api/))
**FAKT (wichtig):** URLhaus sammelt **Malware-URLs, nicht Phishing**. „Phishing is not Malware“; Phishing-Seiten sollen an APWG/PhishTank/Netcraft gemeldet werden. ([URLhaus API](https://urlhaus.abuse.ch/api/))

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 2 für Phishing (eigentlich Malware-Distribution) | B/C | 🟢/🟡 (Feed-Download) | kostenlos mit Auth-Key; Nutzungsbedingungen beachten | S/M | Für Antipisher **nicht** als Phishing-Feed geeignet; höchstens als Malware-Zusatzsignal (Out of Scope für V2) |

### 5.6 Phishing Army (Community-Blocklist)

**FAKT:** Phishing Army normalisiert und dedupliziert Berichte unabhängiger Quellen zu einer **Domain-Blocklist** in mehreren Formaten (Unbound, RPZ, DNSMasq, hosts, …) und betont **Multi-Tenant-Schutz**: `phishing.no-ip.com` kann blockiert werden, ohne `no-ip.com` zu blockieren. ([Phishing Army](https://phishing.army/))
**ANNAHME/UNSICHER:** Lizenz (vermutlich offen/community-basiert), genaue Quellen und Update-Kadenz wurden auf der Startseite nicht im Detail belegt.

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 3–4 (breite, günstige Domain-Liste) | B/C | 🟢 (nur Download) | frei/Community (Lizenz prüfen) | S | Guter Kandidat für **offline gebündelte Positivliste** in Beta; nicht als alleinige Quelle |

### 5.7 Tranco (Negativ-/FP-Korpus)

**FAKT:** Tranco ist eine manipulations-gehärtete Top-Websites-Liste (1 Mio. Domains, Durchschnitt über vier Rankings/30 Tage, permanente IDs, tägliche Aktualisierung, API). Sie filtert u. a. bekannte Safe-Browsing-Badware heraus. Sie ist explizit **forschungsorientiert**. ([Tranco](https://tranco-list.eu/))
**FAKT:** Tranco nutzt u. a. Cloudflare-Radar-Daten (CC BY-NC 4.0) und CrUX (CC BY-SA 4.0); die Listen sind entsprechend attributionspflichtig. ([Tranco](https://tranco-list.eu/))

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 5 **als FP-Korpus** (nicht als Threat-Feed) | D (Batch) | 🟢 | frei, Attribution/CC beachten | S | **Pflichtbestandteil** der V2-Benchmark-Methodik (Tranco-FP-Korpus) |

### 5.8 Certificate Transparency / CertStream

**FAKT:** Phishpedia nutzte CertStream als Kanal, um **neue** Phishing-Domains zu entdecken (1.704 neue Phishing-Websites in 30 Tagen; 1.113 davon in VirusTotal ungemeldet). ([Phishpedia, USENIX Security 2021](https://www.usenix.org/conference/usenixsecurity21/presentation/lin))
**FAKT:** Die CertStream-Projektseite lieferte bei Abruf keinen maschinenlesbaren Inhalt; der Betriebsstatus/ToS ist unklar. **NOT_TESTED/UNSICHER.** ([CertStream](https://certstream.calidog.io/))
**EMPFEHLUNG:** Nicht als Produktionsabhängigkeit einplanen. Wenn CT-Daten genutzt werden, dann über einen selbst betriebenen/vertraglich abgesicherten CT-Log-Ingest, nicht über einen ungeklärten Community-Dienst. CT ist zudem ein **Backend-/Batch**-Signal, nicht lokal im Browser nutzbar.

### 5.9 RDAP / WHOIS / Domain-Age

**FAKT:** RDAP ist der standardisierte Nachfolger von WHOIS; alle gTLD-Registries/-Registrare müssen RDAP bereitstellen, WHOIS ist seit **28. Januar 2025** nicht mehr verpflichtend (außer .com/.name/.post); es gibt > 10 Mrd. RDAP-Queries/Monat. ([ICANN RDAP](https://www.icann.org/rdap))
**ANNAHME/UNSICHER:** „Domain-Alter“ und „Neue Registrierung“ sind etablierte Industriesignale (u. a. bei URLhaus/Phishing-Feeds durch Tranco-Filterung indirekt sichtbar), aber der konkrete prädiktive Wert ist stark kontextabhängig; eine belastbare aktuelle Studie wurde in dieser Recherche nicht verifiziert. Zudem sind RDAP-Abfragen pro URL **nicht** offline und datenschutzrechtlich sensibel (Abfrage einer besuchten Domain durch Dritte).

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 2–3 (Signal für junge Domains, nicht für alle) | C/D | 🟡/🔴 (Domain-Abfrage an Registry/Proxy) | unklar/rate-limitiert | M/L | **Nicht** im Standardpfad; optional im Feed-Backend (Batch), nie pro Nutzer-Navigation |

### 5.10 Cloudflare Radar / Ranking-Daten

**FAKT:** Cloudflare veröffentlicht im „Radar Year in Review 2025“ DNS-basierte Ranglisten von Internetdiensten (Top-10-Kategorien, Länderansichten). ([Cloudflare Radar 2025](https://blog.cloudflare.com/radar-2025-year-in-review-internet-services/))
**FAKT:** Diese Daten sind über Tranco als Ranking-Bestandteil referenziert (CC BY-NC 4.0). ([Tranco](https://tranco-list.eu/))

| Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | Bewertung |
|---|---|---|---|---|---|
| 2–3 (Popularität, keine Maliciousness) | D | 🟢 | CC BY-NC (Attribution, keine kommerzielle Nutzung ohne Klärung) | S | Nur für Benchmark/Research, nicht für Produktionsblocking |

### 5.11 Weitere Quellen (geprüft und bewertet)

| Quelle | Rolle | Bewertung |
|---|---|---|
| APWG Trends Reports | Lagebild, Benchmark-Kontext | Nutzen 4, aber **gemeldete** Fälle; Reports frei verfügbar ([APWG](https://apwg.org/trendsreports/)) |
| ENISA Threat Landscape | EU-Lagebild, Politik-/Compliance-Kontext | Nutzen 3 für Produkt, 5 für Positionierung; frei ([ENISA](https://www.enisa.europa.eu/publications/enisa-threat-landscape-2025)) |
| BSI-Verbraucherinformationen | DE-Vertrauensanker, Awareness | **NOT_TESTED** (Abruf-URLs 404; BSI-Website-Restrukturierung). Nicht als Quelle verwendet. |
| Regional-/Behördenfeeds (Verbraucherzentrale-Phishing-Radar, CERT-Meldungen) | DE-spezifische Aktualität | **NICHT GEPRÜFT** (nicht beauftragt); für V2-Beta als kuratierte Partnerquelle prüfen |

---

## 6. Browser-Vendor-Mechanismen und technische Grenzen von Extensions

### 6.1 Chrome (Manifest V3 / Declarative Net Request)

**FAKT — DNR-Limits (Chrome-Doku, Stand 2026):**
- Bis zu **100 statische Rulesets** deklarierbar, **50 gleichzeitig aktiv**; garantiert mindestens **30.000 statische Regeln** pro Extension (darüber globaler Browser-Limit).
- **5.000 Session-Regeln**; **5.000 „unsafe“ dynamische Regeln**; seit **Chrome 121** zusätzlich **30.000 „safe“ dynamische Regeln**.
- **Max. 1.000 Regex-Regeln** pro Typ; jede Regel muss **< 2 KB kompiliert** sein.
- `regexFilter` ist **ASCII-only** und wird gegen die **Punycode-/URL-encodierte** URL gematcht.
- Ein DNR-Redirect auf eine Extension-Seite erfordert, dass das Ziel in `web_accessible_resources` steht.
- DNR wirkt nicht auf Service-Worker-generierte Antworten/CacheStorage; `responseHeaders`-Block/Redirect kommt **nach** dem tatsächlichen Request (Datenschutz-Implikationen). ([Chrome DNR-Referenz](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest))

**FAKT — kein blockierendes `webRequest` in Chrome-MV3:** `webRequestBlocking` ist in MV3 nur noch für **policy-installierte** Extensions verfügbar; für Store-Extensions ist der Ersatz DNR. ([Chrome Migrationsdoku](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests))
**FAKT — Remote-Code-Regel:** CWS verlangt, dass die volle Funktionalität aus dem eingereichten Code erkennbar ist; externe Ressourcen dürfen **Daten, aber keine Logik** enthalten; `eval`/Interpreter für Remote-Daten sind unzulässig; Ausnahmen nur Debugger-/User-Scripts-API. ([CWS Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies))

**EMPFEHLUNG:** Die im Ist-Zustand verwendete globale DNR-Regel „redirect alle GET main_frame auf guard.html“ ist **kein zukunftsfähiges Design**: Sie ist technisch erlaubt, aber (a) erzeugt für jede Navigation einen zweiten Request auf eine Extension-Seite, (b) verändert History/Referer/Timing, (c) kann POST/Redirect-/OAuth-Flows beeinträchtigen (im Repo selbst als Risiko dokumentiert), (d) skaliert nicht mit differenzierten Entscheidungen, weil DNR keine JS-Heuristik pro Request ausführen kann. V2: **DNR nur für hochsichere, vorberechnete Regeln** (exakte Known-Bad-Domains, signierte Feed-Einträge, ggf. vorab berechnete Punycode-/Mixed-Script-Muster), Rest über Content-Script-Banner und/oder Interstitial (siehe Blueprint).

### 6.2 Firefox

**FAKT:** Firefox unterstützt `webRequest` inkl. **`blocking`** (Voraussetzung: `webRequest`/`webRequestBlocking`-Permission + Host-Permission); der Listener ist synchron und kann Requests abbrechen/umleiten. ([MDN webRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest))
**FAKT:** Firefox nutzt Google Safe Browsing für Phishing-/Malware-Schutz. ([Firefox Privacy Notice](https://www.mozilla.org/en-US/privacy/firefox/))
**FAKT:** AMO-Policies adressieren u. a. „No Surprises“, „Development Practices“, **„Data Collection and Transmission Disclosure and Control“** und „Security, Compliance and Blocking“; Firefox hat ein eigenes Consent-System für Datenerhebung/-übertragung. ([AMO-Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/), [Firefox Consent-Doku](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/))
**EMPFEHLUNG:** Firefox bleibt der **technisch überlegene** Pfad für präventive Domain-Blockade (synchrones `webRequest` vor dem Request). V2 sollte Firefox als „vollwertige“ Plattform behandeln und Chrome/Edge als „Hybrid“ (DNR + Banner/Interstitial) — nicht umgekehrt.

### 6.3 Microsoft Edge

**FAKT:** Edge nutzt Microsoft Defender SmartScreen (reputationsbasierte URL-/Dateiprüfung, Warn-/Blockseite, Nutzer-Feedback „als sicher/unsicher melden“, Daten an Microsoft-Service, lokal gespeicherte Ergebnisse, TLS). ([Edge SmartScreen](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-security-smartscreen))
**EMPFEHLUNG:** Edge ist Chromium-basiert; eine Edge-Variante ist mit dem Chrome-Build möglich, aber Store-/Signaturprozesse und SmartScreen-Interaktion sind separat zu testen.

### 6.4 Safari

**NOT_TESTED.** Keine belastbare Primärquelle in dieser Recherche erfolgreich abgerufen. Aussagen zu Safari wären spekulativ. Für V2 zunächst **out of scope** (Blueprint).

---

## 7. Kommerzielle Produkte im Vergleich (Fakten vs. Herstellerangaben)

### 7.1 Netcraft

**FAKT:** Netcraft positioniert sich 2026 als B2B-Plattform für **Brand Protection/Detection & Takedown**; die klassische Browser-Extension-Seite existiert in der geprüften Form nicht mehr (Weiterleitung auf Enterprise-Marketingseite). Herstellerangabe: „Did you know we take down more than 33 % of phishing websites?“ ([Netcraft](https://www.netcraft.com/apps/extension))
**HERSTELLERANGABE:** Die genannte Takedown-Quote ist eine Eigenaussage, nicht unabhängig geprüft.

**Bewertung:** Netcraft ist der **Enterprise-/Brand-Protection-Benchmark** (Takedown, Threat Feeds, Phishing-Kit-Analyse), kein Consumer-Extension-Wettbewerber mehr. Für Antipisher relevant als möglicher **B2B-Partner/Feed-Lieferant** und als Beweis, dass „Markenschutz + Takedown“ ein zahlungsfähiges Segment ist.

### 7.2 Bitdefender Web Sage (früher TrafficLight)

**FAKT:** TrafficLight wurde zu **Bitdefender Web Sage** umbenannt; Free-Standard (Account nötig) und Premium (AI Security Advisor, In-Browser-Web-Scam-Protection, Search Advisor, Safe Shopping, Ad Fraud Shield, Financial Fraud Protection); Analytics/Bewertung über Bitdefender Threat Intelligence; Präsenz in Chrome/Edge. ([Bitdefender Web Sage](https://www.bitdefender.com/solutions/trafficlight.html))
**HERSTELLERANGABE:** KI-gestützte Analyse und „erklärt, warum eine Seite gefährlich ist“; keine unabhängige Verifikation der Trefferquoten in dieser Recherche.

**Bewertung:** Zeigt die Marktrichtung: **Cloud-/KI-gestützte Erklärung** + Freemium + Account-Bindung. Antipisher kann sich durch **lokale Verarbeitung ohne Account** und **EU-Datenhaltung** differenzieren, muss aber erklären, warum es ohne Cloud ähnlich gut sein will (Antwort: engerer Marken-/EU-Fokus + Feed).

### 7.3 SafeToOpen

**FAKT (Herstellerangaben, nicht unabhängig geprüft):** Browser-Extension für Chrome/Edge/Safari/Firefox/iOS; „VisionAI“-Engine zur visuellen Seitenanalyse; erkennt Marken-Impersonation und „zero-day“-Seiten; Free-Plan + Paid Plus/Executive; wirbt mit 40.000+ „defended brands“, 0,3 s „average time to block“, 4,9★ im Chrome Web Store, „GDPR-ready“ und ISO/IEC 27001:2022; eigener Abschnitt zeigt Beispielwarnungen mit Domain-Alter, Popularität, Formular-auf-Fremdhost-Erkennung. ([SafeToOpen](https://safetoopen.com/))

**Bewertung:** Das ist der **direkteste funktionale Vergleich** zu dem, was Antipisher V2 anstrebt (Marken-Impersonation + Seitensignale + Erklärung). Wichtige Unterschiede, die Antipisher prüfen muss: Wo läuft die Analyse (lokal vs. Cloud)? Welche Daten werden übertragen (die Website behauptet „no browsing data collected“)? Lizenz/Open Source? Für Antipisher ist **Open Source + volle lokale Nachvollziehbarkeit + EU-Hosting + Deutsche Markenabdeckung** die plausible Nische.

### 7.4 Malwarebytes Browser Guard

**NOT_TESTED:** Abruf blockiert (HTTP 403 durch Bot-Schutz). Es werden **keine** Eigenschaften behauptet. Vor Wettbewerbsvergleich manuell prüfen.

### 7.5 Avast / Norton / weitere Security-Suiten

**NOT_TESTED:** Beide Anbieter sind als Wettbewerber etabliert, aber in dieser Recherche **nicht mit belastbaren Primärquellen belegt**:
- **Avast Online Security & Privacy** (Browser-Extension, in der Avast-Navigation als Produkt geführt): Die geprüfte Produkt-URL `https://www.avast.com/online-security` lieferte eine 404-Seite; die korrekte Produktseite (`https://www.avast.com/avast-online-security`) wurde nicht separat verifiziert. ([Avast-Website](https://www.avast.com/))
- **Norton Safe Web**: Der Abruf der Produktseite lieferte keinen verwertbaren Inhalt (Tracking-Pixel/Cache-Snapshot). ([Norton](https://us.norton.com/))
Es werden **keine** Eigenschaften, Preise oder Datenflüsse dieser Produkte behauptet. Vor Wettbewerbsvergleich: Featurelisten, Datenflüsse, Preise und Store-Bewertungen selbst prüfen.

### 7.6 Browser-eigene Schutzmechanismen als „Wettbewerb“

**FAKT:** Chrome Standard (Default) warnt vor bekannten Gefahren und nutzt Privacy-Server/Obfuskation; Enhanced Protection warnt zusätzlich vor unbekannten Gefahren und sendet URLs/Content-Stichproben an Google. ([Chrome Safe-Browsing-Hilfe](https://support.google.com/chrome/answer/9890866))
**FAKT:** Chrome blockiert Lookalike-Navigationen lokal gegen Top-500/Engagement-Domains. ([Chrome IDN-Doku](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md))
**FAKT:** Edge/SmartScreen nutzt dynamische Reputationslisten + Nutzerfeedback. ([Edge SmartScreen](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-security-smartscreen))
**FAKT:** Firefox nutzt Google Safe Browsing. ([Firefox Privacy Notice](https://www.mozilla.org/en-US/privacy/firefox/))

**EMPFEHLUNG:** Positionierung **„Ergänzung, nicht Ersatz“** ist nicht nur juristisch/ethisch richtig, sondern faktisch: Die Browser-Basisschicht ist stark und kostenlos. Die Lücke, die Antipisher füllen kann, ist **erklärbarer Markenschutz für den deutschsprachigen Raum + konservative, lokale Entscheidungen + vertrauenswürdige, signierte Updates**. Das ist auch die einzige Positionierung, die gegen „Chrome macht das schon“ verteidigbar ist.

---

## 8. Akademische Systeme: Was ist übertragbar, was nicht?

### 8.1 Phishpedia (USENIX Security 2021)

**FAKT:** Phishpedia erkennt Phishing-Seiten über **Logo-Erkennung/Screenshot-Vergleich** gegen Referenz-Websites (ohne Training auf Phishing-Samples), liefert erklärbare Marken-Zuordnung und übertraf EMD, PhishZoo, LogoSENSE; im Feldeinsatz mit CertStream wurden **1.704 neue Phishing-Websites in 30 Tagen** gefunden, davon **1.113 nicht in VirusTotal gemeldet**. ([Phishpedia](https://www.usenix.org/conference/usenixsecurity21/presentation/lin))

**Übertragbarkeit für Antipisher:** Hochwertig, aber **nicht 1:1 lokal im Browser** umsetzbar: Screenshot-/Logo-Matching ist rechen- und datenintensiv, erfordert Referenz-Screenshots/Logos vieler Marken und ist auf Seiten ohne sichtbares Logo blind. **Pragmatischer V2-Kern:** Favicon-/Logo-Perceptual-Hash-Vergleich (lokal, nur bei URL-Verdacht/On-Demand) statt vollständiger Vision-Pipeline; Referenz-Favicon-Hashes aus dem Marken-Datenmodell. Das ist eine **EMPFEHLUNG**, die noch validiert werden muss (Performance, FP bei CDN-Favicons, rechtliche Fragen bei Markenlogos).

### 8.2 PhishIntention (USENIX Security 2022)

**FAKT:** PhishIntention extrahiert „brand intention“ und „credential-taking intention“ visuell, interagiert mit der Seite und erreichte auf einem 50K-Dataset bei ähnlicher Recall **deutlich höhere Precision** als vier Referenz-Ansätze: **86,5 % weniger False Alerts** (139 vs. 1.033) im Feldeinsatz; im 2-Monats-Feldtest 1.942 neue Phishing-Seiten (1.368 nicht in VirusTotal). ([PhishIntention](https://www.usenix.org/conference/usenixsecurity22/presentation/liu-ruofan))

**Übertragbarkeit:** Das Konzept „**Markenintention + Zugangsdaten-Eingabe**“ ist die richtige Richtung, um False Positives zu reduzieren. Lokal im Browser ist eine vereinfachte, deterministische Form möglich (z. B. Passwortfeld + fremde Marke im DOM/Titel + Formular-Ziel cross-origin). Ein volles Vision-Modell ist für eine MV3-Extension mit Offline-Anspruch und ohne ML-Infrastruktur **nicht realistisch** (Modellgröße, Latenz, Store-Review, Update-Kanal). **EMPFEHLUNG:** Stufenmodell — URL-/Marken-Signal zuerst, Formular-/Favicon-Signal nur bei erhöhtem Score und mit klarer Erklärung.

### 8.3 Combosquatting-Studie (CCS 2017)

**FAKT:** Siehe Abschnitt 4; zentrale Lehre: **Token-Kombinationen sind langfristig, weit verbreitet und nicht durch Edit-Distanz erfassbar.** ([arXiv:1708.08519](https://arxiv.org/abs/1708.08519))
**Übertragbarkeit:** Direkt umsetzbar als **Token-Graph** (Marke + Bait-Wort + TLD-Endung + Hosting-Muster), gewichtet und lokal. Benötigt gepflegte Wortlisten (Deutsch + Englisch) und Marken-Aliase.

### 8.4 Weitere Forschung (nicht vertieft)

**NOT_TESTED:** Credential-Phishing-/„Transparent Phish“-Arbeiten, visuelle Klassifikation jenseits von Phishpedia/PhishIntention, Logo-/Favicon-Studien außerhalb der beiden USENIX-Papers wurden in dieser Recherche nicht separat verifiziert. Aussagen dazu werden nicht getroffen.

---

## 9. Rechtliche und Compliance-Rahmenbedingungen (technische Einordnung, keine Rechtsberatung)

### 9.1 DSGVO

**FAKT:** Die DSGVO regelt die Verarbeitung personenbezogener Daten (Art. 1, 4, 5, 6, 13, 25, 32, 33/34 u. a.) und gilt für Verantwortliche/Verarbeiter in der EU bzw. bei Angeboten an EU-Bürger. ([DSGVO, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj))
**Einordnung für Antipisher:**
- **Rein lokale Verarbeitung** (Domainklassifikation im Browser, keine Übertragung) ist datenschutzfreundlich; die besuchten Domains können dennoch personenbezogene Daten sein (IP-/Verhaltensbezug), solange sie das Gerät nicht verlassen.
- **Jeder Feed-/Report-Kanal** macht Antipisher zum Verantwortlichen für die dort verarbeiteten Daten (mind. Domain/URL, ggf. Nutzerkennung). Pflichten: Rechtsgrundlage (Art. 6), Transparenz (Art. 13/14), Datenminimierung (Art. 5), Löschkonzept, TOMs (Art. 32), ggf. DSFA (Art. 35), AVV mit Hostern/Subunternehmern (Art. 28), Drittlandtransfer-Governance (Art. 44 ff.).
- **User-Feedback-/Meldeflüsse** sollten standardmäßig **lokal** vorbereitet und nur mit expliziter Einwilligung (Art. 6 Abs. 1 lit. a) übertragen werden; Widerspruch/Export/Löschung implementieren.

### 9.2 ePrivacy / Endgeräte-Speicherung

**FAKT:** Art. 5 Abs. 3 der ePrivacy-Richtlinie 2002/58/EG verlangt für das Speichern von Informationen/Zugriff auf Informationen im Endgerät grundsätzlich klare und umfassende Information und ein Widerspruchsrecht, außer bei technischer Speicherung für die Übertragung oder wenn strikt erforderlich für einen ausdrücklich angeforderten Dienst. ([ePrivacy-Richtlinie](https://eur-lex.europa.eu/eli/dir/2002/58/oj))
**Einordnung:** Die Speicherung von Einstellungen/Zählern/letzten Entscheidungen in `storage.local` ist **möglicherweise** als „unbedingt erforderlich“ für den angeforderten Schutz-Dienst einzuordnen — das ist aber **nicht gesichert** und muss anwaltlich geprüft werden. In Deutschland gilt die nationale Umsetzung (TDDDG, früher TTDSG § 25); die Fundstelle konnte in dieser Recherche nicht verifiziert werden (gesetze-im-internet.de lieferte 404). **UNSICHER — vor Store-Veröffentlichung klären.**
**EMPFEHLUNG:** Consent-Architektur von Anfang an mitdenken: Nur technisch notwendige Speicherung ohne Consent, alles andere (Feed-Opt-in, Reports, Diagnose) als explizite, widerrufbare Einwilligung mit Datenschutzerklärung im Store und in der Extension.

### 9.3 Cyber Resilience Act (CRA)

**FAKT:** Die Verordnung (EU) 2024/2847 („Cyber Resilience Act“, 23.10.2024) verpflichtet Hersteller „Produkte mit digitalen Elementen“ u. a. zu sicheren Defaults, Sicherheitsupdates **kostenlos**, Vulnerability-Handling, SBOM und – für die meisten Produkte – einer **Support-Periode von mindestens 5 Jahren**; die Verordnung enthält Sonderregeln für Open-Source-Software (nicht-monetisiertes FOSS ist grundsätzlich ausgenommen; „open-source stewards“ haben leichtere Pflichten). ([CRA, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/2847/oj))
**Einordnung:** Eine browserbasierte Sicherheits-Extension ist ein naheliegendes „Produkt mit digitalen Elementen“. Das AGPLv3-Modell ist mit dem CRA vereinbar, **solange** keine Monetarisierung/Distribution im kommerziellen Sinne erfolgt; sobald eine bezahlte Edition/Enterprise-Variante entsteht, greifen CRA-Pflichten (u. a. 5-Jahres-Support, Update-Prozess, SBOM). Das ist ein starkes Argument für **reproduzierbare Builds, SBOM und einen dokumentierten Update-/Rollback-Prozess ab Tag 1**.

### 9.4 Store-Compliance: Chrome Web Store (CWS)

**FAKT (Auszüge der Program Policies, Version 22.05.2025):**
- **Privacy Policy** ist Pflicht, wenn Nutzerdaten verarbeitet werden; sie muss Erhebung/Nutzung/Weitergabe und alle Empfänger offenlegen.
- **Limited Use:** Daten nur für den offengelegten Single Purpose; Erhebung von **Browsing-Aktivität** ist untersagt, außer soweit für ein prominent beschriebenes nutzerseitiges Feature erforderlich.
- **Use of Permissions:** engste Berechtigungen; keine „Future-Proofing“-Berechtigungen.
- **Disclosure/Consent:** vor Installation offenlegen und informierte Zustimmung; Änderungen der Datenpraktiken erneut offenlegen.
- **Misleading/Unexpected Behavior:** Sicherheits-Extensions ohne erkennbare Überwachung/Schutz sind unzulässig; keine irreführenden Funktionen.
- **Single Purpose / Quality:** ein enges, verständliches Ziel; keine Bündelung unzusammenhängender Funktionen.
- **Remote Code:** volle Funktionalität muss aus dem Code erkennbar sein; externe Ressourcen dürfen **keine Logik** enthalten; `eval`/Interpreter für Remote-Daten verboten (Ausnahmen: Debugger-/User-Scripts-API). Daten-Feeds (JSON, Filter, Regeln) sind zulässig, solange sie reine Daten bleiben.
- **2FA** für Developer-Accounts erforderlich. ([CWS Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies))

**Einordnung/Critical für Antipisher:** Der globale DNR-Redirect ist ein **erklärungsbedürftiges, potenziell „unerwartetes“ Verhalten** (jede Seite wird über eine Extension-Seite umgeleitet) und kann im Review als Risiko oder als Verstoß gegen „Misleading/Unexpected Behavior“ bewertet werden. Die V2-Hybrid-Architektur (DNR nur High-Confidence + Content-Script-Banner) ist **store-freundlicher**.

### 9.5 Store-Compliance: Mozilla AMO

**FAKT:** Die AMO-Policies verlangen u. a. „No Surprises“, sichere Entwicklungs-/Update-Praktiken, Offenlegung und Kontrolle von Datenerhebung/-übertragung sowie Security-/Compliance-Regeln; Firefox verfügt über ein **eingebautes Consent-System für Datenerhebung/-übertragung** (Firefox-Doku „Firefox built-in consent for data collection and transmission“). ([AMO-Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/), [Firefox Consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/))
**Einordnung:** Für Antipisher V2 bedeutet das: **Default ohne Datenerhebung** ist die einfachste AMO-konforme Variante; jede Feed-/Report-Funktion braucht ein explizites Consent-UI und korrekte Manifest-Deklaration (Feldname/Version vor Implementierung prüfen — **UNSICHER**).

### 9.6 ToS-Fallen bei Datenquellen

**FAKT:** Safe Browsing API: keine kommerzielle Nutzung ohne separate Vereinbarung; Attribution und 30-Minuten-Frische sind Pflicht. ([Safe Browsing ToS](https://developers.google.com/safe-browsing/v4/terms))
**FAKT:** URLhaus: Auth-Key, 5-Minuten-Update-Kadenz, „Phishing ist nicht Malware“ (falsche Zweckbindung wäre ein Policy-Verstoß). ([URLhaus](https://urlhaus.abuse.ch/api/))
**FAKT:** PhishTank: Rate-Limits, User-Agent-Pflicht, EULA. ([PhishTank](https://phishtank.org/api_info.php))
**FAKT:** Tranco/Cloudflare-Daten: Attribution, teils CC BY-NC (keine kommerzielle Nutzung ohne Klärung). ([Tranco](https://tranco-list.eu/))
**EMPFEHLUNG:** Für jede Datenquelle vor Beta eine **Lizenz-/ToS-Matrix** anlegen und juristisch freigeben; komplette Datenquellen-Abhängigkeiten im Produkt transparent dokumentieren (Open-Source-Transparenz + CRA-SBOM).

---

## 10. Synthese: Was funktioniert, was nicht, was ist für Antipisher realistisch?

### 10.1 Bewertungsübersicht (alle Quellen)

| Quelle/Ansatz | Nutzen | Latenz | Privacy | ToS/Kosten | Aufwand | V2-Rolle |
|---|---|---|---|---|---|---|
| UTS #39/UTS #46 + vollständige Confusables | 5 | A (lokal) | 🟢 | frei (Unicode-Lizenz) | M | **Kern (L0)** |
| Public Suffix List (gebündelt) | 5 | A | 🟢 | frei (MPL) | S | **Kern (L0)** |
| Eigener Marken-Impersonation-Graph (kuratiert) | 5 | A | 🟢 | Eigenaufwand | L | **Kern (L1)** |
| Eigene Typosquat-/Combosquatting-Modelle | 5 | A | 🟢 | Eigenaufwand | M–L | **Kern (L2)** |
| Google Safe Browsing Update API | 5 | B | 🟡 | **kommerziell unzulässig ohne Vertrag** | M | Option (nur non-commercial) |
| Google Web Risk | 5 | B/C | 🟡/🔴 | kommerziell (Free-Tier 100k Lookup/Monat; Update-Diff frei; Hashes 50 USD/1k Calls) | M | Enterprise-Option |
| PhishTank | 3–4 | C/D | 🟡 | frei (EULA) | S/M | Batch-Feed (Beta) |
| OpenPhish | 4 | C/D | 🟡 | unklar (Lizenz prüfen) | M | Batch-Feed (Beta) |
| URLhaus | 2 (für Phishing) | B/C | 🟢/🟡 | frei (Auth-Key) | S/M | **nicht** für Phishing |
| Phishing Army | 3–4 | B/C | 🟢 | frei (Lizenz prüfen) | S | Batch-Feed (Beta) |
| Tranco | 5 (FP-Korpus) | D | 🟢 | frei, Attribution | S | **Test-Korpus** |
| RDAP/Domain-Age | 2–3 | C/D | 🟡/🔴 | unklar/limitiert | M/L | Backend optional (P2) |
| Cloudflare Radar | 2–3 | D | 🟢 | CC BY-NC | S | Research |
| CT-Logs/CertStream | 3–4 (Backend) | C/D | 🟡 | unklar | L | Backend/Future (P2) |
| Phishpedia/PhishIntention (visuell) | 4–5 | C/D (Cloud) | 🔴 wenn Cloud | Forschungscode, Lizenz prüfen | L | Inspiration; lokal nur Teilsignale (P2) |
| Chrome/Edge/Firefox built-in | 5 | A/B | 🟡 | kostenlos | – | **Ergänzen, nicht ersetzen** |
| Netcraft (B2B) | 4 (Enterprise) | C | 🟡 | kommerziell | L | Partner/Feed-Option |
| Bitdefender Web Sage | 4 | C | 🟡 | Freemium/Account | L | Wettbewerbs-Referenz |
| SafeToOpen | 4–5 (Herstellerangaben) | C (Cloud) | 🟡 (Hersteller: „no browsing data“) | Freemium | L | Direkter Funktions-Referenzpunkt |
| Malwarebytes/Avast/Norton | NOT_TESTED | – | – | – | – | Später prüfen |

### 10.2 Zentrale Erkenntnisse

1. **Der Browser-Basisschutz ist stark** (Safe Browsing, SmartScreen, Chrome-Lookalike-Interstitial). Ein neues Produkt muss eine **spezifische Lücke** adressieren: deutschsprachige Marken außerhalb der Top-500, erklärbare Marken-Zuordnung, konservative FP-Politik, Unabhängigkeit von US-Cloud-Diensten.
2. **Lokal-deterministische Verfahren sind für Antipisher der richtige Kern**: PSL, UTS-39/46, Brand-Graph, Token-Modelle, Redirect-Ketten — alles offline möglich, alles erklärbar, alles DSGVO-freundlich.
3. **Cloud-/KI-/Feed-Ebenen sind optional und nur mit geklärter Rechts-/ToS-Basis** (Safe Browsing commercial restriction!). Sie dürfen **nie** Voraussetzung für Grundschutz sein (sonst bricht das „100 % offline“-Versprechen und die Store-Compliance).
4. **Signed Updates sind Pflicht**, sobald Daten aus externen Quellen kommen: Ed25519-Signatur, Version/Rollback-Schutz, Transparenz-Log, reine Daten (kein Remote-Code) — sonst sind CWS/AMO-Regeln und CRA-Anforderungen nicht erfüllbar.
5. **Benchmark-Methodik ist ein Produktbestandteil, nicht ein Nice-to-have**: Ohne TPR@FPR auf Tranco-Negativen + realen Phishing-Positiven (lizenzgeklärt) bleibt jede Wirksamkeitsaussage Marketing.
6. **Die größte nicht-technische Lücke ist Markenpflege**: 165 Marken sind zu wenig; 1.000+ Marken mit ccTLD-/Subdomain-/Tenant-Daten und 2-Augen-Review brauchen einen Prozess, sonst entstehen False Positives (nachgewiesen: `box.example.com`, `signal.example.com`, `www.bundid.de`).

---

## 11. Quellenverzeichnis (überprüfte Quellen, abgerufen 18.10.2026)

> Alle Links wurden im Rahmen dieser Recherche aufgerufen; Inhalte können sich ändern. Nicht abrufbare Quellen sind im Text als NOT_TESTED/UNSICHER markiert.

1. [UTS #39: Unicode Security Mechanisms, Version 18.0.0 (2026-08-27)](https://www.unicode.org/reports/tr39/)
2. [UTS #46: Unicode IDNA Compatibility Processing, Version 18.0.0 (2026-08-31)](https://www.unicode.org/reports/tr46/)
3. [Chrome for Developers: Internationalized Domain Names (IDN) in Google Chrome (Chromium-Quelle)](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md)
4. [Public Suffix List (Mozilla/Community)](https://publicsuffix.org/)
5. [Chrome for Developers: browser.declarativeNetRequest (Regel-Limits, Redirect/WAR, Regex)](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
6. [Chrome for Developers: Replace blocking web request listeners (MV3)](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests)
7. [Chrome Web Store: Program Policies (Stand 22.05.2025)](https://developer.chrome.com/docs/webstore/program-policies/policies)
8. [Firefox Extension Workshop: Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
9. [Firefox Extension Workshop: Firefox built-in consent for data collection and transmission](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
10. [MDN: webRequest API (blocking in Firefox)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest)
11. [Google Chrome Help: Choose your Safe Browsing protection level](https://support.google.com/chrome/answer/9890866)
12. [Google for Developers: Safe Browsing APIs (v4) – Update API](https://developers.google.com/safe-browsing/v4/update-api)
13. [Google for Developers: Safe Browsing API Terms of Service](https://developers.google.com/safe-browsing/v4/terms)
14. [USENIX Security 2021: Phishpedia](https://www.usenix.org/conference/usenixsecurity21/presentation/lin)
15. [USENIX Security 2022: PhishIntention](https://www.usenix.org/conference/usenixsecurity22/presentation/liu-ruofan)
16. [Kintis et al., Hiding in Plain Sight: A Longitudinal Study of Combosquatting Abuse (CCS 2017), arXiv:1708.08519](https://arxiv.org/abs/1708.08519)
17. [APWG: Phishing Activity Trends Report 4Q 2024 (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2024.pdf) / [APWG Reports-Index](https://apwg.org/trendsreports/)
18. [PhishTank: API Information (Cisco Talos)](https://phishtank.org/api_info.php)
19. [OpenPhish: Phishing Intelligence (24-h-Statistiken)](https://openphish.com/)
20. [URLhaus (abuse.ch): Community API](https://urlhaus.abuse.ch/api/)
21. [Phishing Army: Free Phishing Domain Blocklist](https://phishing.army/)
22. [Tranco: Research-Oriented Top Sites Ranking](https://tranco-list.eu/)
23. [Cloudflare Blog: Radar 2025 Year in Review – Top Internet Services](https://blog.cloudflare.com/radar-2025-year-in-review-internet-services/)
24. [ICANN: Registration Data Access Protocol (RDAP)](https://www.icann.org/rdap)
25. [Microsoft Learn: Microsoft Edge support for Microsoft Defender SmartScreen](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-security-smartscreen)
26. [Mozilla: Firefox Privacy Notice (u. a. Google Safe Browsing)](https://www.mozilla.org/en-US/privacy/firefox/)
27. [ENISA: Threat Landscape 2025](https://www.enisa.europa.eu/publications/enisa-threat-landscape-2025)
28. [DSGVO – Regulation (EU) 2016/679 (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
29. [ePrivacy-Richtlinie 2002/58/EG (EUR-Lex)](https://eur-lex.europa.eu/eli/dir/2002/58/oj)
30. [Cyber Resilience Act – Regulation (EU) 2024/2847 (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2024/2847/oj)
31. [Bitdefender Web Sage (früher TrafficLight)](https://www.bitdefender.com/solutions/trafficlight.html)
32. [SafeToOpen (Herstellerangaben)](https://safetoopen.com/)
33. [Netcraft: Brand Protection / Takedown](https://www.netcraft.com/apps/extension)
34. [CertStream-Projektseite (Status unklar – NOT_TESTED)](https://certstream.calidog.io/)
35. [Google Cloud: Web Risk (Produkt, API-Modelle und Preise)](https://cloud.google.com/security/products/web-risk)
36. [Avast-Website (Produktseite Online Security nicht verifiziert – NOT_TESTED)](https://www.avast.com/)
37. [Norton-Website (Produktseite nicht verwertbar abrufbar – NOT_TESTED)](https://us.norton.com/)

**Nicht abrufbar / nicht verwendbar (Transparenz):** Malwarebytes Browser Guard (HTTP 403), Safari-Supportdokumente (falsche Artikel-ID), gesetze-im-internet.de TDDDG-Fundstelle (404), BSI-Phishing-Seite (404 nach Website-Umbau), Firefox-Support „Phishing and Malware Protection“ (Bot-Schutz), Avast/Norton-Produktdetailseiten (404 bzw. Tracking-Pixel – NOT_TESTED).

---

## 12. Offene Unsicherheiten (explizit)

1. **Rechtslage Endgeräte-Speicherung** (ePrivacy/TDDDG § 25): nicht abschließend geklärt; anwaltliche Prüfung erforderlich.
2. **OpenPhish-/Phishing-Army-Lizenzen**: nicht verifiziert; vor Nutzung klären.
3. **Web-Risk-Preise/Modelle**: Preisliste von der Produktseite übernommen; Preise/Gratis-Kontingente können sich ändern (Stand 18.10.2026).
4. **Safari-Verhalten**: nicht untersucht; keine Aussagen.
5. **Malwarebytes/Avast/Norton**: nicht geprüft; keine Aussagen.
6. **CertStream-Betriebsstatus**: unklar; nicht als Abhängigkeit planen.
7. **Wirkung von Domain-Age/Neue-Registrierung**: plausibel, aber nicht mit einer verifizierten aktuellen Studie belegt.
8. **Chrome-Lookalike-Warnung**: Details der Top-500-/Engagement-Heuristik können sich mit Chrome-Versionen ändern (Doku ist Chromium-Quelle, kein stabiler Vertrag).

---

**Fazit in einem Satz:** Der State of the Art stützt eine **lokale, deterministische, erklärbare Marken-Impersonations-Engine mit signierten, optionalen Datenfeeds** — nicht ein cloud- und KI-abhängiges Produkt und keine Kopie der Browser-Basisschicht. Die konkrete Umsetzung, Bewertung des Ist-Zustands und priorisierte Roadmap stehen in [`V2_BLUEPRINT.md`](./V2_BLUEPRINT.md).
