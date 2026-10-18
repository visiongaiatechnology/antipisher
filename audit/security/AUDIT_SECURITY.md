# VGT SECURITY MASTER — Security-Audit „Antipisher 0.1 (Alpha)“

## Lauf-Metadaten

- **Audit-ID:** `VGT-AUDIT-20261018-0001`
- **Zielprodukt:** Antipisher 0.1 Alpha (ehemals VGT DomainGuard) — Browser-Extension für Google Chrome (MV3) und Mozilla Firefox (MV3), Version `0.1.0`, `version_name: 0.1 Alpha`
- **Profil / Mode:** `PROFILE=GENERIC` · `MODE=AUDIT_ONLY` (keine Quellcode-Änderungen, keine Patches)
- **Scope & Ausschlüsse:** Vollständiger Quellcode-Snapshot `vgt-domainguard-src` (44 Dateien): `chrome/`, `firefox/`, `shared/` (Detektor, Brand-DB, Guard-/Popup-Seiten), `sites-100.json`, `build.py`, `build_sites.py`, `tests/`, Doku/Lizenz. **Ausgeschlossen:** echter Browser-E2E-Lauf (kein Browser im Audit-Container), Netzwerk-/Store-Aktionen (nicht erlaubt), Signatur-/Store-Verifikation, Browser-Plattform-CVEs (Chrome/Firefox selbst), außerhalb des Repos liegende ZIP-Artefakte im Elternverzeichnis.
- **Repo-Commit / Dirty State:** Kein Git-Repository vorhanden (`.git` fehlt); Snapshot-/Arbeitskopie `v0.1.0`, Dirty State nicht ermittelbar. Quelle: statischer Scan (TR-11).
- **OS / Toolchain / Testumgebung:** Windows-Audit-Host; Node.js **v24.13.0**; Python **3.14.2**; PowerShell 5.1. Kein Browser (Chrome/Firefox) verfügbar → Browser-Laufzeitwirkung ist, wo nicht statisch/mockbar, `NOT_TESTED`.
- **Aktive Standards / Quellenstand:** OWASP Top 10 **2025**, OWASP ASVS **5.0.0** (nur Referenz, kein Level behauptet), MITRE CWE Top 25 **2025**, NIST SP 800-218 SSDF **v1.1**, SLSA **v1.2** (Konzept), CISA KEV; interne **VGT-100**-Taxonomie. Quellenstand der Skill-Referenzen: 16.10.2026. **Online-Advisory-Check nicht durchgeführt** (Testlimit: keine Netzwerkaktionen) → Advisory-/CVE-Freshness als **unbekannt** markiert.
- **Erlaubte Testarten & Limits:** Nur lesende statische Analyse, lokale nichtdestruktive Node-/Python-Probes und Ausführung der Extension-Logik in VM-Sandboxen mit gemockten Browser-APIs. Keine Netzwerk-, Store-, Produktiv- oder destruktiven Tests. Schreibrechte ausschließlich unter `audit/security/` (eingehalten, siehe „Audit-Entscheidung“).

## Executive Outcome

`RELEASE_GATE: BLOCKED`

| Kategorie | Anzahl | Beleg/Anmerkung |
|---|---:|---|
| Critical / High / Medium / Low / Info | 0 / 0 / 7 / 7 / 2 | 11 Einzelbefunde + 5 Ketten; Details unten |
| Ketten (`CHAIN-###`) | 5 | davon 4 offene Risikopfade, 1 durch Kontrolle abgewehrt (CHAIN-005) |
| VGT-100 PASS / FAIL / NOT_TESTED / BLOCKED / NOT_APPLICABLE | 29 / 14 / 3 / 2 / 52 | Summe exakt 100 (validatorbestätigt) |
| Anwendbar | 48 | 100 minus 52 N/A |
| Ungeprüft oder blockiert | 5 | 3 × NOT_TESTED + 2 × BLOCKED (VGT-056, VGT-097) |
| Verifizierte Abdeckung | 43/48 (89,6 %) | (PASS+FAIL)/anwendbar |

**Kurzfazit:** Der lokale Detektor-Kern ist handwerklich solide: **keine** XSS-Sinks, **keine** Netzwerk-/Telemetrie-Pfade, **keine** Secrets, starke Unicode-/Punycode-Normalisierung (165/165 Confusable-Fälle, 480/480 Decoder-Parität) und eine sauber gebundene Allow-once-Messaging-Authentisierung. **Release-blockierend** sind jedoch: (1) Chrome prüft nur **GET**-Hauptnavigationen — POST/Nicht-GET umgehen den Preflight vollständig, obwohl Doku/UI POST als „geschützt“ bezeichnen; (2) Konfigurations-/Init-Fehler führen zu **stillem Fail-open** ohne Nutzeranzeige; (3) messbare **Erkennungslücken** (6/43 Angriffe unerkannt) bei gleichzeitig 18/553 Falschpositiven; (4) Allow-once-Lebenszyklus/Races ohne TTL/Serialisierung; (5) **kein** Browser-E2E-Nachweis für das Kernschutzverfahren auf beiden Plattformen; (6) **keine** verifizierbare Build-/Signatur-Provenance und kein CI-Regressionsgate.

## System- und Trust Boundary Map

| Boundary-ID | Datenfluss | Identität | Trustwechsel | Auth-/Entscheidung | Sink | Fehlermodus | Evidenz |
|---|---|---|---|---|---|---|---|
| TB-01 | Web-Origin/URL → Guard-Page | Untrusted Web-Navigation | untrusted → Extension-Kontext | DNR-Redirect `^(https?://.+)$` bzw. webRequest-Blocking; danach `classify()` | Anzeige/Weiterleitung | erkannt: fail-closed (Interstitial); unerkannt (FN): Auto-Navigation | `chrome/background.js:27-40,79-87`; `firefox/background.js:7-21` |
| TB-02 | Guard-Page → Background (`allow-once`) | Extension-Page (guard.html) | Extension-Page → privilegierter SW/Event-Page | `sender.url`-Präfix **UND** `tabs.get(tabId).url`-Präfix; Protokoll-Allowlist | Session-Allow-Regel / Bypass-Map | reject mit Fehlermeldung (fail-closed) | `chrome/background.js:88-102`; `firefox/background.js:23-35` |
| TB-03 | Background → DNR/WebRequest | Extension | Extension → Browser-Netzwerkentscheidung | exakte URL + `tabIds`; `priority 10` (Allow) > `priority 1` (Redirect) | tatsächliche Navigation | Allow-Regel wird nach Commit/Tab-Ende/Startup entfernt | `chrome/background.js:44-65`; `firefox/background.js:9-15` |
| TB-04 | Popup → Detektor/Storage | Lokale Extension-UI | UI → lokaler Zustand | keine privilegierte Aktion; nur Anzeige/Testfeld | Counter/Settings | keine Sicherheitsentscheidung | `chrome/popup.js:1-54`; `shared/popup.js` |
| TB-05 | Gebündelte Brand-DB → Detektor | Extension-Paket (statisch) | Paketintegrität → Erkennung | keine Laufzeitprüfung (vertraut dem Paket) | Klassifikationsergebnis | manipulierte DB = geschwächte Erkennung → CHAIN-004 | `shared/sites.js:1-1250`; `shared/detector.js:10` |
| TB-06 | Detektor → Guard-UI | Extension | Daten → DOM | ausschließlich `textContent`, Default-CSP | sichtbare Warnung | keine HTML-Interpretation (XSS-sicher) | `shared/guard.js:21-24,44-45,60-62` |
| TB-07 | Quellcode → Build → ZIP/Store → Nutzer | Maintainer/Build-Umgebung | Repo → ausgeführtes Artefakt | keine verifizierbare Signatur/Checksum/Allowlist im Repo | ausgelieferter Extension-Code | Supply-Chain-Risiko → CHAIN-004; VGT-056 BLOCKED | `build.py:1-37`; `build_sites.py:1-199` |
| TB-08 | Extension → Browser-Navigation | Extension-Berechtigungen | Browser-Privileg (host_permissions/tabs) | Manifest-Permissions; `tabs.update`/`redirectUrl`/`location.replace` | Netzwerkanfrage der Zielseite | Navigation ohne Prüfung bei POST/FN | `chrome/manifest.json:9-18`; `chrome/guard.js:37` |

## VGT-100-Abdeckungsmatrix (100 Zeilen)

| ID | Status | Asset/Trust Boundary | Reale Evidenz (Datei:Zeile/Befehl) | Test/Exitcode | Begründung/Grenze |
|---|---|---|---|---|---|
| VGT-001 | PASS | chrome/manifest.json | chrome/manifest.json:9-41<br>chrome/background.js:88-102<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Vertrauensgrenzen und Assets wurden inventarisiert (Web-Origin -> Guard-Page -> Service Worker/Event-Page -> DNR/WebRequest-Enforcement -> Browser-Navigation; Popup -> Detektor; gebündelte Brand-DB).… |
| VGT-002 | FAIL | chrome/background.js | chrome/background.js:91-97<br>chrome/background.js:19-26,104<br>audit/security/probes/results/chrome_background_mock.json | mock_execution | Deny-by-default für sensible Operationen: Die privilegierte allow-once-Operation ist zwar explizit deny-by-default geschützt (Sender-/Tab-/Schema-Prüfungen, Mock bestätigt), aber ein defekter/fehlend… |
| VGT-003 | PASS | chrome/background.js | chrome/background.js:55-57<br>chrome/background.js:93-95<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Objektbezogene Zugriffskontrolle: Die Einmal-Freigabe ist ein Tab-Objekt (tabIds-Bedingung der DNR-Session-Regel) und wird nur für den Tab erzeugt, dessen tab.url auf der Schutzseite liegt; fremde Ta… |
| VGT-004 | PASS | chrome/background.js | chrome/background.js:88-96<br>chrome/manifest.json:1-47<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Funktionsbezogene Berechtigungen: Die privilegierte Funktion allow-once ist ausschließlich von der Schutzseite (guard.html) und nur für einen Tab auf der Schutzseite aufrufbar; Web-Origins können die… |
| VGT-005 | PASS | chrome/background.js | chrome/background.js:93-98<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Feldebene/Mass Assignment: Die allow-once-Nachricht trägt nur url, tabId, recordBlock. url wird per URL-Parser auf http/https beschränkt, tabId über tabs.get validiert, recordBlock beeinflusst aussch… |
| VGT-006 | FAIL | chrome/background.js | chrome/background.js:44-65<br>chrome/background.js:16-20<br>audit/security/probes/results/chrome_background_mock.json<br>audit/security/probes/results/firefox_background_mock.json | mock_execution | Sitzungs-/Tokenlebenszyklus: Die temporäre Freigabe wird als Session-Regel mit exakter URL + Tab erzeugt, bei Commit/Tab-Schließen/nächster Freigabe entfernt und beim Service-Worker-Start bereinigt (… |
| VGT-007 | NOT_APPLICABLE | — | — | — | Keine Konten, MFA-, Recovery- oder Step-up-Workflows im Produkt vorhanden: lokale Browser-Extension ohne Auth-Backend, keine Login-/Reset-Pfade im Code. Die Grenze existiert im Scope nicht. |
| VGT-008 | NOT_APPLICABLE | — | — | — | Nur eine Edition (Alpha 0.1), keine Mandanten, keine Premium-/Feature-Flag- oder Open-Core-Importpfade: keine Editionslogik in Manifesten oder Code vorhanden. |
| VGT-009 | NOT_APPLICABLE | — | — | — | Keine Dienstkonten, mTLS- oder Service-zu-Service-Kommunikation: Die Extension spricht ausschließlich mit Browser-APIs, es gibt kein Backend und keine Maschinenidentitäten. |
| VGT-010 | PASS | chrome/background.js | chrome/background.js:91-95<br>chrome/manifest.json:1-47<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Confused-Deputy/Privilegienerhöhung: Web-Origins können die privilegierte Extension-Funktion nicht instrumentalisieren; selbst eine per WAR eingebettete Guard-Page scheitert an der Tab-Bindungsprüfun… |
| VGT-011 | NOT_APPLICABLE | — | — | — | Keine Datenbank-, ORM- oder Query-Pfade im Produktcode: Persistenz erfolgt ausschließlich über chrome.storage.local mit flachen Schlüsseln (blocked als Zahl, strictMode als Boolean), kein SQL/NoSQL. |
| VGT-012 | NOT_APPLICABLE | — | — | — | Keine exec/spawn/system/subprocess-Aufrufe im Produktcode; Shell-/Prozess-Sinks existieren nur in Build-Skripten (Python) ohne Untrusted-Input. |
| VGT-013 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>chrome/manifest.json:1-47<br>chrome/guard.html:98-100 | TR-11 (Exit 0) | Code-/Template-Injection: Kein eval, new Function, dynamischer Import oder dynamisch geladener Code im Produkt. Alle Skripte sind statische lokale Bundle-Dateien; MV3-Default-CSP (script-src self; ob… |
| VGT-014 | PASS | shared/guard.js | shared/guard.js:21-24,44-45,60-62<br>audit/security/probes/results/static_scan.json<br>audit/security/probes/results/guard_render_mock.json | TR-11 (Exit 0) | XSS/DOM-Sinks: Alle untrusted Werte (Host, Begründung, offizielle Domain, Fehlermeldung) werden ausschließlich per textContent gesetzt; kein innerHTML/outerHTML/insertAdjacentHTML/document.write im g… |
| VGT-015 | NOT_APPLICABLE | — | — | — | Kein Laufzeit-Dateisystemzugriff: Die Extension verarbeitet keine Pfade; Pfadmanipulation betrifft nur Build-Skripte mit festen, repo-internen Zielpfaden ohne Untrusted-Input. |
| VGT-016 | NOT_APPLICABLE | — | — | — | Keine Datei-Operationen mit Untrusted-Input oder TOCTOU-Risiko zur Laufzeit; build.py nutzt feste Kopierlisten ohne Symlink-Auflösung/Check-then-Open. |
| VGT-017 | NOT_APPLICABLE | — | — | — | Keine Deserialisierung fremder Daten: Gespeicherte Werte (Zahl/Boolean) werden ausschließlich von der Extension selbst geschrieben; Bundles sind statisch; es existieren keine Schema-Parser für Untrus… |
| VGT-018 | NOT_APPLICABLE | — | — | — | Keine Archivextraktion zur Laufzeit: build.py erzeugt ZIPs, entpackt aber keine fremden Archive; keine Zip-Slip-/Bomben-Pfade im Produktcode. |
| VGT-019 | NOT_APPLICABLE | — | — | — | Kein Datei-Upload-/Download-/Content-Sniffing-Pfad: Die Extension verarbeitet nur Navigations-URLs und lokale Bundle-Ressourcen. |
| VGT-020 | FAIL | shared/detector.js | shared/detector.js:201-345<br>audit/security/probes/results/fuzz_perf.json<br>shared/guard.js:15-19 | measurement | Ressourcenlimits: classify() hat kein Eingabe-/Längen-/Zeitbudget und skaliert mit Host-Länge × Markenanzahl; ein 100.000-Zeichen-Host-Label kostete ~1,1 s CPU (probe07). Reguläre URLs liegen p95 bei… |
| VGT-021 | NOT_APPLICABLE | — | — | — | Keine Kryptografie im Produktcode (keine Verschlüsselung, Hashing, Signaturen, Random-Nonces); Crypto-APIs kommen im statischen Scan nicht vor. |
| VGT-022 | NOT_APPLICABLE | — | — | — | Keine Schlüsselverwaltung/KMS/HSM/Rotation: Es existieren keine kryptografischen Schlüssel oder Secrets im Repo (Secret-Muster-Scan 0 Treffer). |
| VGT-023 | NOT_APPLICABLE | — | — | — | Keine Passwort-/Credential-Ablage und keine Secrets: Der Secret-Muster-Scan (AWS/GitHub/Slack/Google/OpenAI/Private-Key/JWT) lieferte 0 Treffer; es gibt keine authentifizierten Nutzerkonten. |
| VGT-024 | NOT_APPLICABLE | — | — | — | Keine Netzwerkkommunikation und damit keine TLS-/Zertifikatsprüfung im Produktcode: Der Scan zeigt keine Fetch-/TLS-APIs; die Extension führt keine Remote-Requests aus. |
| VGT-025 | NOT_APPLICABLE | — | — | — | Keine Signaturen, Feeds oder Anti-Rollback-Logik im Repo: Die Softwaredistribution/-signierung liegt beim Browser-Store und ist außerhalb des Scopes; Verifikationsgrenze siehe VGT-056 (BLOCKED). |
| VGT-026 | NOT_APPLICABLE | — | — | — | Keine kryptografischen Zufallswerte, Nonces oder Sicherheits-Tokens: DNR-Regel-IDs sind rein interne, fortlaufende Zähler ohne Sicherheitswirkung. |
| VGT-027 | PASS | chrome/background.js | chrome/background.js:15,66-68<br>audit/security/probes/results/static_scan.json<br>README.md:47-53 | TR-11 (Exit 0) | Datenminimierung: Persistiert werden ausschließlich der Blockzähler (number) und die Chrome-Einstellung strictMode (boolean); besuchte URLs/Domains werden nicht gespeichert oder übertragen. Der stati… |
| VGT-028 | NOT_APPLICABLE | — | — | — | Keine sensitiven Daten at rest: storage.local enthält nur einen Zähler und einen Boolean (keine PII, Secrets oder URLs); damit existiert keine Schutzpflicht für ruhende Daten im Scope. |
| VGT-029 | NOT_APPLICABLE | — | — | — | Keine personenbezogenen Daten und keine Retention-Pflichten im Produkt: Nur nicht-sensitive Zähler; Löschung erfolgt durch Browser-Deinstallation/Storage-Clear, kein serverseitiger Löschpfad vorhande… |
| VGT-030 | PASS | shared/guard.js | shared/guard.js:21-24,39<br>audit/security/probes/results/guard_render_mock.json<br>audit/security/probes/results/static_scan.json | TR-08 (Exit 0) | Sensitive Error-/Log-Leakage: Die Schutzseite gibt nur generische Fehlertexte aus (keine Ziel-URL, keine internen Pfade); Hintergrundfehler gehen ausschließlich an die lokale DevTools-Konsole. Keine… |
| VGT-031 | PASS | chrome/background.js | chrome/background.js:88-96<br>audit/security/probes/results/chrome_background_mock.json<br>chrome/manifest.json:1-47 | TR-06 (Exit 0) | CSRF/Request-Origin: Es existieren keine Cookies/Sessions/HTTP-Endpunkte. Die einzige zustandsändernde Operation (allow-once) ist per sender.url- und tab.url-Prüfung origin-/kontextgebunden; Web-Orig… |
| VGT-032 | PASS | chrome/manifest.json | chrome/manifest.json:1-47; firefox/manifest.json:1-44<br>audit/security/probes/results/manifest_integrity.json<br>audit/security/probes/results/guard_render_mock.json | static_analysis | Browser-Isolation/Sicherheitsheader: Extension-Seiten werden nicht über HTTP ausgeliefert (kein CORS/CDN/Header-Angriff); MV3-Default-CSP ist aktiv, da kein content_security_policy-Override existiert… |
| VGT-033 | PASS | chrome/background.js | chrome/background.js:31-40,44-57<br>audit/security/probes/results/chrome_background_mock.json<br>audit/security/probes/results/static_scan.json | TR-06 (Exit 0) | SSRF/Redirect-Ketten: Die Extension führt keine ausgehenden Fetches aus (SSRF nicht anwendbar). HTTP-Redirect-Ketten werden dadurch fail-closed behandelt, dass jede neue main_frame-Anfrage erneut die… |
| VGT-034 | PASS | chrome/background.js | chrome/background.js:44-49<br>firefox/background.js:30-33<br>audit/security/probes/results/chrome_background_mock.json<br>audit/security/probes/results/guard_render_mock.json | TR-06 (Exit 0) | Open Redirect/URL-Schemata: Beide Hintergründe validieren die Ziel-URL per URL-Parser und lassen ausschließlich http/https zu (javascript:, file:, data:, chrome: werden abgewiesen). Die Guard-Seite n… |
| VGT-035 | PASS | chrome/background.js | chrome/background.js:88-102; firefox/background.js:23-35<br>chrome/guard.js:30-35<br>audit/security/probes/results/static_scan.json | TR-11 (Exit 0) | API-Inventar/Schattenendpunkte: Die einzige definierte Nachrichten-API ist runtime.onMessage mit type=allow-once; es existieren keine HTTP-/GraphQL-/WebSocket-Endpunkte, keine Debug-/Legacy-Routen un… |
| VGT-036 | NOT_APPLICABLE | — | — | — | Keine GraphQL-, gRPC- oder WebSocket-Schnittstellen: Kommunikation ausschließlich über interne runtime-Messages innerhalb des Browser-Extension-Kontexts. |
| VGT-037 | PASS | chrome/background.js | chrome/background.js:44-65<br>audit/security/probes/results/chrome_background_mock.json<br>audit/security/probes/results/firefox_background_mock.json | TR-06 (Exit 0) | Business-Flow-Missbrauch/Replay: Die Einmal-Freigabe ist per exakter URL + Tab gebunden; eine zweite Freigabe ersetzt die erste; Commit/Tab-Schließen räumen auf. Parallele/doppelte Freigaben erzeugen… |
| VGT-038 | NOT_APPLICABLE | — | — | — | Kein Rate-Limit-/Quota-Backend und keine entfernten APIs im Produkt: Es existieren keine User-/IP-/Token-Limits. Lokale Ressourcenerschöpfung wird unter VGT-020/VGT-064 bewertet; die Grenze "Rate Lim… |
| VGT-039 | NOT_APPLICABLE | — | — | — | Keine HTTP-Caches/CDNs/Service-Worker-Caches mit Authentifizierungsdaten: Die Extension lädt ausschließlich lokale Bundle-Ressourcen; keine gecachten API-Antworten oder Nutzerdaten. |
| VGT-040 | NOT_APPLICABLE | — | — | — | Keine Webhooks oder externen Integrationen: Keine Signaturen, Zeitfenster, Event-Replays oder Drittanbieterantworten vorhanden. |
| VGT-041 | NOT_APPLICABLE | — | — | — | Keine OS-Privilegien, Serviceaccounts, setuid oder Capabilities: Die Extension läuft im Browser-Sandbox-Modell; ihre Privilegien sind ausschließlich Manifest-Permissions (bewertet in VGT-010/027/032). |
| VGT-042 | PASS | chrome/manifest.json | chrome/manifest.json:19-21; firefox/manifest.json:17-23<br>audit/security/probes/results/static_scan.json<br>chrome/guard.html:98-100 | TR-11 (Exit 0) | Sandbox-/Prozessisolierung: Die Extension basiert auf dem Chrome/Firefox-MV3-Sandboxmodell, enthält keinen nativen Code, kein WASM, keine Plugins und keine eval-Pfade; alle Seiten laufen unter der De… |
| VGT-043 | PASS | chrome/background.js | chrome/background.js:88-102<br>chrome/manifest.json:1-47<br>audit/security/probes/results/chrome_background_mock.json | TR-07 (Exit 0) | IPC-Authentisierung: Die interne runtime-Messaging-Schnittstelle prüft Sender-URL und Ziel-Tab; einen externen IPC-/Localhost-Endpunkt gibt es nicht. Fremdkontexte (Web-Origins, falsche Tabs) werden… |
| VGT-044 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>shared/detector.js:1-6<br>README.md:49-53 | TR-11 (Exit 0) | Netzwerkausgang/Egress: Es existiert keine ausgehende Netzwerkkommunikation. Der statische Scan über alle 44 Dateien findet 0 Fetch-/XHR-/WebSocket-/Beacon-/EventSource-Sinks; alle externen URL-Vorko… |
| VGT-045 | NOT_APPLICABLE | — | — | — | Keine Server-Bindings, Ports, Debugserver oder lokalen Dienste im Produktcode; die Extension bietet keine Netzwerkexposition. |
| VGT-046 | NOT_APPLICABLE | — | — | — | Keine Container-/Build-Isolation im Repo (kein Dockerfile, keine CI-Images); reine Browser-Extension, Container-Betrieb nicht vorgesehen. |
| VGT-047 | NOT_APPLICABLE | — | — | — | Keine Cloud-IAM-, Metadata-Endpunkt- oder Storage-Bucket-Nutzung: Es existiert kein Cloud-Backend im Scope. |
| VGT-048 | NOT_APPLICABLE | — | — | — | Kein Reverse-Proxy/DNS-/TLS-Terminierungs-Code und keine Forwarded-Header-Verarbeitung; die Extension läuft ausschließlich clientseitig. |
| VGT-049 | NOT_APPLICABLE | — | — | — | Keine Laufzeit-Tempfiles, Logs, PID-/Lockfiles oder Shared Directories; Build-Skripte erzeugen nur statische ZIPs/Verzeichnisse. |
| VGT-050 | FAIL | firefox/manifest.json | firefox/manifest.json:1-44 vs. chrome/manifest.json:31-41<br>audit/security/probes/results/firefox_background_mock.json<br>README.md:62 | static_analysis | OS-/Plattform-Portabilität: Es gibt keinen plattformspezifischen Code, aber die tatsächlichen Sicherheitsregeln unterscheiden sich zwischen Chrome (DNR-GET-Redirect) und Firefox (webRequest-Blocking)… |
| VGT-051 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>build.py:1-37 | TR-11 (Exit 0) | Dependency-Inventar/SBOM: Das Produkt hat keine Third-Party-Dependencies (kein package.json/Lockfile, keine npm-Installation); require/import-Aufrufe existieren ausschließlich in Tests und nur für No… |
| VGT-052 | NOT_APPLICABLE | — | — | — | Keine Third-Party-Dependencies (direkt/transitiv), daher keine CVE-/KEV-/Advisory-Triage im Repo-Scope. Browser-Plattform-CVEs (Chrome/Firefox) liegen außerhalb des auditierbaren Artefakts. |
| VGT-053 | NOT_APPLICABLE | — | — | — | Keine Package-Manager-Installationen, Registry-Auflösung oder Installhooks: Dependency-Confusion-/Typosquatting-Risiko besteht im Build nicht (keine Dependencies). |
| VGT-054 | NOT_APPLICABLE | — | — | — | Keine CI/CD-Konfiguration im Repo (kein .github/workflows, .gitlab-ci.yml o. ä.); es existieren keine Workflow-Secrets, PR-Trust- oder Cache-Pfade zu prüfen. |
| VGT-055 | FAIL | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>build.py:20-35 | static_analysis | Build-Provenance/Reproduzierbarkeit: Kein VCS/Commit, keine CI, keine Checksums/Signatur, kein reproduzierbarer Build-Nachweis; build.py schreibt ZIPs ohne Hash-Metadaten und ohne Datei-Allowlist. Ei… |
| VGT-056 | BLOCKED | — | — | — | Code-Signing/Release-Artefakte sind ohne Store-/Netzwerkzugriff nicht verifizierbar. |
| VGT-057 | NOT_APPLICABLE | — | — | — | Kein Auto-Updater/Update-Manifest im Produktcode: Updates laufen ausschließlich über die Browser-Store-Mechanismen (außerhalb des Repo-Scopes). |
| VGT-058 | NOT_APPLICABLE | — | — | — | Keine Threat-Feeds oder signierten Policy-Updates: Die Brand-Liste ist statisch gebündelt; damit existiert keine Feed-Signatur-/TTL-/Rollback-Grenze. Datenintegrität wird unter VGT-051/VGT-055 bewert… |
| VGT-059 | FAIL | build.py | build.py:20-24<br>audit/security/probes/results/manifest_integrity.json | static_analysis | Release-Kanal-/Artefakt-Isolation: Nur ein Alpha-Kanal, keine Premium-/Debug-Code-Trennung; es fehlt eine buildzeitliche Artefakt-Prüfung/Datei-Allowlist — build.py verpackt alles, was im Zielordner… |
| VGT-060 | NOT_APPLICABLE | — | — | — | Keine eigenen Schlüssel, Registry- oder Builder-Infrastruktur im Scope; damit ist kein Key-Rotations-/Supply-Chain-Incident-Prozess implementiert. |
| VGT-061 | FAIL | chrome/background.js | chrome/background.js:15-41,79-87,104<br>audit/security/probes/results/chrome_background_mock.json<br>audit/security/probes/results/firefox_background_mock.json | mock_execution | Fail-Secure State Machine: Unklarer/fehlerhafter Sicherheitszustand führt in mehreren Pfaden zur stillen Nicht-Prüfung: configure()-Fehler lassen keine DNR-Regel und keinen Observer-Fallback zurück (… |
| VGT-062 | FAIL | chrome/background.js | chrome/background.js:10,16-20,44-65,66-68<br>audit/security/probes/results/chrome_background_mock.json | mock_execution | Transaktions-/Datenintegrität: Der Freigabezustand ist auf zwei nicht-atomare Speicher verteilt (In-Memory pending-Map + persistente Session-Regel) und wird nur beim Service-Worker-Start reconciliier… |
| VGT-063 | FAIL | chrome/background.js | chrome/background.js:14-41,44-65,69-74<br>audit/security/probes/results/chrome_background_mock.json | mock_execution | Race Conditions: configure() wird von Install/Startup/storage.onChanged ohne Serialisierung aufgerufen; ein überlappendes remove kann eine gerade hinzugefügte DNR-Regel löschen (synthetisch reproduzi… |
| VGT-064 | PASS | audit/security/probes/results/fuzz_perf.json | audit/security/probes/results/fuzz_perf.json<br>chrome/background.js:14-41 | TR-09 (Exit 0) | Denial-of-Service/Backpressure: Es gibt keine Queues/Thread-Pools/Netzwerkabhängigkeiten; die Verarbeitung ist lokal und kurz (p95 0,60–1,81 ms über Läufe, 5.000 Klassifikationen). Die redirect-all-R… |
| VGT-065 | NOT_APPLICABLE | — | — | — | Keine Retry-Policies, Netzwerkabhängigkeiten oder Control-Plane: Es existieren keine Retry-/Backoff-/Circuit-Breaker-Pfade, die geprüft werden müssten. |
| VGT-066 | FAIL | chrome/background.js | chrome/background.js:15<br>chrome/background.js:19-26,104<br>audit/security/probes/results/chrome_background_mock.json | mock_execution | Konfigurationsintegrität/sichere Defaults: Defaults sind sicher (strictMode default true, Abwesenheit = Schutz an). Aber ein Fehler beim Laden/Anwenden der Konfiguration resultiert nicht in einem sic… |
| VGT-067 | NOT_APPLICABLE | — | — | — | Kein Rollback-/Snapshot-/Migrationssystem: Der Produktzustand besteht aus zwei lokalen Setting-Werten; ein Restore unsicherer Policy ist nicht implementiert. |
| VGT-068 | PASS | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>shared/detector.js:1-6<br>README.md:8,47-53 | TR-11 (Exit 0) | Offline-/Airgap-Verhalten: Die Kernfunktion arbeitet vollständig offline (interner Detektor + gebündelte Brand-DB); es gibt keine Telemetrie-, Lizenz- oder Remote-Abhängigkeit, die beim Netzausfall d… |
| VGT-069 | PASS | chrome/background.js | chrome/background.js:44-65<br>audit/security/probes/results/chrome_background_mock.json | TR-06 (Exit 0) | Zeit/Ablauf/Replay: Es gibt keine sicherheitsrelevanten Zeit-/Fristentscheidungen (kein Token, keine Zertifikate, kein TTL-Feature); Replay-Schutz der allow-once-Nachricht ist an exakte URL + Tab + S… |
| VGT-070 | PASS | chrome/background.js | chrome/background.js:66-68<br>chrome/background.js:44-57<br>audit/security/probes/results/chrome_background_mock.json | static_analysis | Ressourcenerschöpfung durch Sekundärsysteme: Es gibt kein Logging/Quarantäne/Backup/Metrics-Subsystem; der einzige Speicher-Schreibvorgang (Zähler) ist mit catch gekapselt und kann den Schutzpfad nic… |
| VGT-071 | FAIL | chrome/background.js | chrome/background.js:66-68; firefox/background.js:13<br>audit/security/probes/results/static_scan.json | static_analysis | Security-Event-Vollständigkeit: Nur ein globaler Blockzähler wird persistiert; Block-/Allow-Entscheidungen, Einmal-Freigaben, Konfigurationsfehler, Moduswechsel und Update-/Statusänderungen erzeugen… |
| VGT-072 | NOT_APPLICABLE | — | — | — | Kein Auditlog/Log-Sink vorhanden, dessen Integrität/Vertraulichkeit zu schützen wäre; die fehlende Event-Erfassung wird unter VGT-071/FIND-006 bewertet. |
| VGT-073 | NOT_APPLICABLE | — | — | — | Kein Alert-Pipeline-/Threshold-/Dedup-System: Der einzige Alarm ist die lokale Interstitial-Seite (Erzeugung in VGT-074/075-Kontext, UI in VGT-090); es gibt keine Severity-/Acknowledge-/Escalation-Lo… |
| VGT-074 | PASS | audit/security/probes/results/punycode_parity.json | audit/security/probes/results/punycode_parity.json<br>shared/detector.js:201-247<br>tests/detector.test.cjs:96-117 | TR-05 (Exit 0) | Detection-Normalisierung: Unicode-/Punycode-Äquivalente werden konsistent bewertet — 165/165 Confusable-Substitutionen (Kyrillisch/Griechisch) wurden sowohl als UTF-8-URL als auch als IDNA-Punycode-U… |
| VGT-075 | NOT_APPLICABLE | — | — | — | Keine persistente Quarantäne-/Autopunisher-Architektur: Die Blockade ist ein einmaliges Navigations-Interstitial ohne dauerhaftes Blocklisting; TTL/Allowlist/Appeals-Logik existiert nicht. Umkehrbark… |
| VGT-076 | NOT_APPLICABLE | — | — | — | Kein Threat-Feed/keine Feed-Freshness-Mechanik: Die Brand-Liste ist statisch gebündelt (keine Version/TTL/Quelle im Datensatz); Feed-Signatur-/Rollback-Grenze existiert nicht. Datenintegrität und Pro… |
| VGT-077 | NOT_APPLICABLE | — | — | — | Keine Control Plane, kein Agent-Enrollment, kein Heartbeat und keine Mutual-TLS-Kanäle: Es existiert kein Server-Gegenüber im Scope. |
| VGT-078 | PASS | chrome/popup.js | chrome/popup.js:6-13<br>audit/security/probes/results/static_scan.json<br>chrome/popup.html:295-319 | static_analysis | Admin-Dashboard/Telemetrie: Es gibt kein Remote-Dashboard und keine Telemetrie; das Popup zeigt ausschließlich lokale Werte (Markenanzahl, Blockzähler, Modus) per textContent. Keine rollen-/stream-ba… |
| VGT-079 | NOT_TESTED | — | — | — | Incident-Response-Readiness ist nicht nachweisbar: Es existiert kein IR-Runbook, kein Notfallprozess und keine forensische Belegsicherung im Repo (SECURITY.md nennt nur Meldeweg); ein Tabletop/Test w… |
| VGT-080 | FAIL | audit/security/probes/results/detector_corpus.json | audit/security/probes/results/detector_corpus.json<br>shared/detector.js:286-329<br>README.md:57-60 | measurement | False-Positive/False-Negative-Bilanz: Die Erkennung ist messbar unausgewogen — im synthetischen Angriffskorpus wurden 37/43 (86,1%) geblockt, u. a. verdünnte Homograph-/Bait-Kombinationen und Brand-o… |
| VGT-081 | NOT_APPLICABLE | — | — | — | Kein WordPress-Kontext: keine PHP-Hooks, REST-Routen, admin-ajax, Nonces oder current_user_can-Pfade im Repo. |
| VGT-082 | NOT_APPLICABLE | — | — | — | Keine WordPress-Persistenz: keine wpdb-/Options-/Transient-/Cron-Operationen im Code. |
| VGT-083 | NOT_APPLICABLE | — | — | — | Keine Desktop-App/Electron/Tauri/WebView-Integration: reine Browser-Extension ohne Node-Integration, Context-Isolation oder native IPC. |
| VGT-084 | NOT_APPLICABLE | — | — | — | Keine lokale Dokument-/Office-/PDF-Verarbeitung: Die Extension verarbeitet ausschließlich Navigations-URLs und lokale Bundle-Assets. |
| VGT-085 | NOT_APPLICABLE | — | — | — | Keine Mobile-App/App-Store-Berechtigungen: kein Android/iOS-Code, keine Keystore-/Deep-Link-/Intent-Pfade. |
| VGT-086 | NOT_APPLICABLE | — | — | — | Kein Plugin-/Erweiterungssystem innerhalb des Produkts: keine Plugin-API, keine Plugin-Signaturen oder Updatekanäle zu bewerten. |
| VGT-087 | NOT_APPLICABLE | — | — | — | Keine KI/LLM/Agent-Komponente im Produktcode: keine Prompts, RAG-Pfade, Tool-Dispatcher oder Agent-Workflows, daher keine Prompt-Injection-Grenze im Scope. |
| VGT-088 | NOT_APPLICABLE | — | — | — | Keine LLM-Ausgaben, Modell-Sinks oder KI-Konfiguration/Secrets im Produkt. |
| VGT-089 | NOT_APPLICABLE | — | — | — | Keine Modelle, Datasets, Embeddings, Vektorspeicher oder KI-Connectoren im Produkt. |
| VGT-090 | NOT_TESTED | — | — | — | A11y-/UX-Sicherheitsbypass ist ohne Browser nicht abschließend prüfbar: Statisch vorhanden sind ARIA-Attribute, aria-live, Fokus-Styles, Tastatur-Buttons und ein zweistufiger Bestätigungsdialog; die… |
| VGT-091 | PASS | audit/security/AUDIT_SECURITY.md | audit/security/AUDIT_SECURITY.md<br>audit/security/AUDIT_MATRIX.json:chains<br>chrome/background.js:14-102; shared/guard.js:15-79 | static_analysis | Cross-Component-Attack-Path-Graph: Die Vertrauensgrenzen wurden zu gerichteten Ketten verbunden (DNR-Redirect -> Guard -> Detektor -> allow-once -> Navigation; Build -> Store -> Nutzer). Es wurden fü… |
| VGT-092 | PASS | audit/security/AUDIT_MATRIX.json | audit/security/AUDIT_MATRIX.json:chains<br>audit/security/AUDIT_SECURITY.md | static_analysis | Combination Bugs/Preconditions: Findings wurden paar-/tripelweise auf kumulative Wirkung geprüft; jede Kette referenziert Parent-Findings, validiert Ausführbarkeit/Timing (z. B. POST-Methodenlücke nu… |
| VGT-093 | NOT_TESTED | — | — | — | Privilege/Integrity Pivot ist nicht abschließend testbar: Der einzig relevante Aufwertungspfad führt über Build/Store (Quellcode -> Artefakt -> Nutzer). Signatur-/Provenance-Nachweise fehlen im Repo,… |
| VGT-094 | PASS | audit/security/probes/results/punycode_parity.json | audit/security/probes/results/punycode_parity.json<br>audit/security/probes/results/guard_render_mock.json<br>chrome/background.js:44-49 | TR-05 (Exit 0) | Cross-Layer Input Transformation: URL -> URL-Parser -> Detektor -> Guard -> allow-once -> DNR-Navigation wurde auf Transformationslücken geprüft. Unicode/Punycode/IDN werden konsistent normalisiert (… |
| VGT-095 | NOT_APPLICABLE | — | — | — | MODE=AUDIT_ONLY: Es wurde kein Patch erstellt und es durften keine Quellcode-Änderungen vorgenommen werden; Patch-Vollständigkeit/Root-Cause-Beseitigung ist damit im Rahmen dieses Audits nicht bewert… |
| VGT-096 | FAIL | tests/chrome-worker.test.cjs; tests/firefox-worker.test.cjs | tests/chrome-worker.test.cjs; tests/firefox-worker.test.cjs<br>audit/security/probes/probe04_chrome_background_mock.cjs<br>audit/security/probes/results/chrome_background_mock.json; firefox_background_mock.json | static_analysis | Negative Testing/Property-Tests: Die Repo-Tests (13/13) decken Happy Paths und einzelne Negativfälle ab, aber nicht die sicherheitskritischen Verweigerungsfälle: fremde Sender-Origins, Tab-Mismatch,… |
| VGT-097 | BLOCKED | — | — | — | SAST/DAST/SCA-Fundabgleich nicht durchführbar: Kein Scanner-Tooling im Offline-Scope verfügbar/installierbar. |
| VGT-098 | NOT_APPLICABLE | — | — | — | MODE=AUDIT_ONLY: Es wurde kein Sicherheitsfix angewendet, daher ist eine Performance-/Availability-Regression nach Patch nicht bewertbar. Die Baseline-Latenz wurde stattdessen gemessen (VGT-064, prob… |
| VGT-099 | PASS | audit/security/AUDIT_SECURITY.md | audit/security/AUDIT_SECURITY.md<br>audit/security/AUDIT_MATRIX.json<br>audit/security/probes/logs/validate_audit.log | TR-12 (Exit 0) | Release-Blocker/Risk Acceptance/Audit-Trace: Der Bericht dokumentiert Gate-Urteil, harte Blocker, Restlücken und offene Findings mit Evidenz; es wird keine Freigabe behauptet. Die Matrix ist maschine… |
| VGT-100 | FAIL | audit/security/probes/results/static_scan.json | audit/security/probes/results/static_scan.json<br>tests/*.cjs<br>Next.md:47-48 | static_analysis | Langfristige Security-Regressionsbasis: Es gibt keine CI und kein dauerhaftes Regression-Gate; die im Audit gefundenen Klassen (Messaging-Auth-Negativfälle, Fail-open, Races, FN/FP-Korpus, Übersize-I… |
## Einzelbefunde

### FIND-001 — Chrome-Fail-open-Pfade: Nur GET-Navigationen werden geprüft; Reduced Mode und Safe-Auto-Navigation ohne Bestätigung
- **Severity / Confidence:** MEDIUM / HIGH (Code + Mock-Ausführung, TR-06)
- **Root Cause und Preconditions:** DNR-Regel ist auf `resourceTypes:["main_frame"]` + `requestMethods:["get"]` beschränkt (`chrome/background.js:34-38`); POST-/Nicht-GET-Hauptnavigationen werden nie klassifiziert. `strictMode=false` entfernt die präventive Regel vollständig (`chrome/background.js:23,79-87`). Bei `status:"safe"` navigiert die Guard-Page ohne Nutzerbestätigung automatisch (`chrome/guard.js:50-54`). Preconditions: Chrome, Schutz aktiv; POST-getriggerte Navigation oder heuristisch fehlklassifizierte Ziel-URL.
- **Betroffene Pfade/Scope:** `chrome/background.js`, `chrome/guard.js`, `chrome/popup.js`, `README.md`, `Next.md`.
- **Kontrollverletzung / CWE / OWASP:** Protection-Mechanism-Failure; CWE-693; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe04 (TR-06, Exit 0) bestätigt `install:requestMethods-only-get`; Reduced Mode entfernt DNR-Regel und navigiert best-effort; probe06 (TR-08) bestätigt automatische Freigabe+Navigation für „safe“ ohne Interaktion.
- **Wirkung/Gegenkontrollen:** Ungeprüfte bzw. unbemerkte Zustellung von Phishing-Zielen; einzige Gegenkontrolle ist die (umgehbare) Heuristik. Doku-/UI-Claims suggerieren POST-Schutz (siehe FIND-011).
- **Chains:** CHAIN-001, CHAIN-003.
- **Fix/Regression/Restrisiko:** Schutz auf alle Hauptnavigationen ausweiten oder POST explicitch als Restrisiko behandeln; Reduced Mode als sichtbare Schutz-Degradierung kennzeichnen; Negativtest „POST auf Test-Phishing-Domain ⇒ Interstitial“. Restrisiko: DNR-Plattformgrenzen, Browser-E2E fehlt.

### FIND-002 — Initialisierungs-/Konfigurationsfehler führen zu stillem Fail-open der Primärschutzschicht
- **Severity / Confidence:** MEDIUM / HIGH (Mock-/Fehlerinjektion, TR-06/TR-07)
- **Root Cause und Preconditions:** `configure()` wird nur mit `.catch(console.error)` betrieben (`chrome/background.js:69-73,104`). Bei Fehler (Storage/DNR/Regex) bleibt `strict===true`, sodass der Observer-Fallback nicht greift und keine DNR-Regel existiert: Navigationen laufen ungeprüft, ohne Nutzeranzeige. Firefox greift ungeprüft auf `engine.classify` zu (`firefox/background.js:10-11`).
- **Betroffene Pfade/Scope:** `chrome/background.js`, `firefox/background.js`, `chrome/popup.js`.
- **Kontrollverletzung / CWE / OWASP:** Not Failing Securely; CWE-636; OWASP A10:2025.
- **Tatsächlicher Test/Ergebnis:** probe04 OBS `failopen:config-error-no-rule` (Storage.get-Fehler ⇒ keine Regel, kein Nutzerhinweis, Observer inaktiv); probe05 OBS `engine:missing-engine-throws` (Throw im blocking-Listener; Browser-Reaktion NOT_TESTED).
- **Wirkung/Gegenkontrollen:** Stiller Totalverlust der präventiven Prüfung (Blindspot). Gegenkontrolle nur konsoleninternes Logging.
- **Chains:** CHAIN-002.
- **Fix/Regression/Restrisiko:** Expliziten Schutzstatus OK/DEGRADED/FAILED + UI-Anzeige, Fail-closed-Fallback, Fehlerinjektionstests. Restrisiko: reales API-Fehlerauftreten nicht beobachtet.

### FIND-003 — Allow-once-Lebenszyklus und Zustand: kein TTL, volatile Ausnahmen, fehlende Reconciliation, nicht serialisierte configure()-Läufe
- **Severity / Confidence:** LOW / MEDIUM (Mock + Simulation, reales Browserverhalten NOT_TESTED)
- **Root Cause und Preconditions:** In-Memory-`pending`-Map und persistente Session-Regel können desynchronisieren; Kommentar verspricht Timeout, im Code existiert keiner (`chrome/background.js:42-65`). Firefox-`bypass`-Map nur im Event-Page-Speicher ohne TTL (`firefox/background.js:6-9,29-34`). `configure()` nicht serialisiert (`chrome/background.js:14-41,71-73`); Blockzähler Read-Modify-Write. Preconditions: SW-/Event-Page-Suspend, überlappende configure()-Läufe, abgebrochene Navigation.
- **Betroffene Pfade/Scope:** `chrome/background.js`, `firefox/background.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-362, CWE-664; OWASP A10:2025.
- **Tatsächlicher Test/Ergebnis:** probe04 OBS `allow:no-timeout-implementation`; OBS `race:configure-interleaving` — synthetisches Interleaving (80 ms verzögerter Remove) entfernt die gerade hinzugefügte DNR-Regel ⇒ **Regel vorhanden=false bei strictMode=true** (Scheduling simuliert, reales Auftreten NOT_TESTED). probe05 OBS `once:no-ttl-stale-bypass`.
- **Wirkung/Gegenkontrollen:** Über die beabsichtigte Einmal-Freigabe hinaus scharfe Freigaben; Race-Fenster ohne präventive Regel; Zählerverlust (Integrität). Richtung überwiegend fail-closed für Blockaden.
- **Chains:** keine (kein kombinierter End-to-End-Pfad belegt).
- **Fix/Regression/Restrisiko:** TTL/Alarm, Reconciliation, Serialisierung der configure()-Läufe, atomarer Zähler; Mocks für Suspend/Parallelität. Restrisiko: reale SW-Suspends ohne Browser-E2E nicht reproduzierbar.

### FIND-004 — Chrome-/Firefox-Paritätslücken und fehlender Browser-E2E-Nachweis für das Kernschutzverfahren
- **Severity / Confidence:** LOW / MEDIUM
- **Root Cause und Preconditions:** Firefox-Manifest deklariert **kein** `web_accessible_resources` für `guard.html`, obwohl dieses das Redirect-Ziel des webRequest-Blockers ist (`firefox/manifest.json`); Chrome deklariert es (`chrome/manifest.json:31-41`). Firefox MV3 `background.scripts` ist ohne `persistent:true` eine Event-Page (volatile bypass-Map); `strictMode` wird ignoriert; README räumt fehlenden Browser-E2E-Lauf ein (`README.md:62`); Repo-Tests sind reine Mocks.
- **Betroffene Pfade/Scope:** `firefox/manifest.json`, `chrome/manifest.json`, `firefox/background.js`, `README.md`.
- **Kontrollverletzung / CWE / OWASP:** CWE-1059; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe01 (TR-03) OBS `firefox:WAR-guard.html-missing`, `manifest:background-models`; probe05 (TR-07) OBS `state:volatile-event-page`, `strict:ignored-in-firefox`.
- **Wirkung/Gegenkontrollen:** Unbekannt, ob das Interstitial in realem Firefox zuverlässig lädt bzw. die Freigabe funktioniert (mögliche Redirect-Fehler/Nichtschutz); keine Plattform-E2E-Absicherung.
- **Chains:** keine.
- **Fix/Regression/Restrisiko:** Firefox-WAR ergänzen/begründen, Event-Page-Verhalten testen, Browser-E2E-Suite (Playwright/Selenium mit unpacked extension) für beide Plattformen ins Release-Gate. Restrisiko: ohne Browser NOT_TESTED.

### FIND-005 — Build-/Release-/Test-Gate-Hygiene: keine Provenance, keine verifizierbaren Artefakte, keine CI-Regressionsbasis, keine ZIP-Inhaltsallowlist
- **Severity / Confidence:** LOW / HIGH (Abwesenheit statisch bewiesen, TR-11)
- **Root Cause und Preconditions:** Kein VCS/Commit, keine CI, keine Checksums/Signaturen, kein SBOM/Lockfile; `build.py` packt den gesamten Zielordner per `rglob` ohne Allowlist (`build.py:20-24`); Brand-DB-Generator validiert keine Hostnamen (`build_sites.py:179-199`); Repo-Tests decken keine Messaging-/Fail-open-/Race-Negativfälle ab.
- **Betroffene Pfade/Scope:** `build.py`, `build_sites.py`, `tests/*.cjs`, `sites-100.json`, `shared/sites.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-345, CWE-1059; OWASP A03:2025 (Supply Chain Failures).
- **Tatsächlicher Test/Ergebnis:** probe09 (TR-11) `supply_chain: {vcs_present:false, release_config:[], ci_dirs_present:[], lockfiles:[], sbom_present:false}`; `Next.md:13` verweist auf nicht existierende `ARCHITECTURE_AND_SECURITY_REVIEW.md`.
- **Wirkung/Gegenkontrollen:** Release-Artefakt nicht zu überprüfbarer Quelle/Signatur zuordenbar; unbemerkte Zusatzdateien möglich; keine dauerhafte Sicherheitsregression. Gegenkontrolle: Browser-Store-Signatur (außerhalb Scope, VGT-056 BLOCKED).
- **Chains:** CHAIN-004.
- **Fix/Regression/Restrisiko:** VCS + reproduzierbarer Build + SHA-256-Manifest + Store-Signaturprozess; explizite Datei-Allowlist; CI inkl. Negativtests; SBOM (auch leer); Domänenvalidierung im DB-Build. Restrisiko: Store-Kanal nicht verifizierbar.

### FIND-006 — Keine Audit-/Security-Events: Blockaden, Freigaben und Konfigurationsfehler werden nicht nachvollziehbar protokolliert
- **Severity / Confidence:** LOW / HIGH
- **Root Cause und Preconditions:** Einziger persistierter Zustand ist der Blockzähler (`chrome/background.js:66-68`; `firefox/background.js:13`) und `strictMode`; keine strukturierten Events mit Zeitstempel/Kontext/correlation-ID.
- **Betroffene Pfade/Scope:** `chrome/background.js`, `firefox/background.js`, `chrome/popup.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-778; OWASP A09:2025.
- **Tatsächlicher Test/Ergebnis:** probe09 (TR-11) `storage_access` ausschließlich `blocked`/`strictMode`; probe04/05 bestätigen reinen Zähler.
- **Wirkung/Gegenkontrollen:** Fehlalarme/Umgehungen/stille Ausfälle lokal nicht rekonstruierbar. Bewusste Privacy-Entscheidung (keine URL-Speicherung) ohne kompensierende Status-Events.
- **Chains:** CHAIN-002.
- **Fix/Regression/Restrisiko:** Datensparsame strukturierte Events (Domain-Hash statt URL, Ereignistyp, Modus, Fehlerstatus) + Statusanzeige; Test auf definiertes Schema. Restrisiko: Privacy begrenzt Forensik dauerhaft.

### FIND-007 — Erkennungslücken (False Negatives): verdünnte Marken-/Bait-Kombinationen, Brand-only-Userinfo, Marke nur in Pfad/Query
- **Severity / Confidence:** MEDIUM / HIGH (gemessen, TR-04)
- **Root Cause und Preconditions:** Prüfung nur auf Host-Labels; Bait-Wort-Erkennung verlangt exaktes Brand-Segment (`shared/detector.js:302-320`); Typosquatting nur auf Basislabel und Brand-Länge ≥ 5 (`shared/detector.js:322-329`); Userinfo-Deception nur bei vollständiger offizieller Domain (`shared/detector.js:207-223`); Pfad/Query ungeprüft.
- **Betroffene Pfade/Scope:** `shared/detector.js`, `shared/sites.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-184; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe02 (TR-04, Exit 0): **37/43 (86,1 %)** Angriffs-URLs geblockt; unerkannt u. a. `paypa1-login.com`, `paypal-me.com`, `g00gle-login.com`, `https://paypal@evil.test/`, Marke nur in Pfad/Query.
- **Wirkung/Gegenkontrollen:** Phishing-Klasse wird nicht erkannt; in Chrome zusätzlich stille Auto-Navigation (CHAIN-001) bzw. per POST gar keine Prüfung (CHAIN-003). Gegenkontrolle: exakte URL-Freigabe verhindert Ketten-Mitfreigabe.
- **Chains:** CHAIN-001, CHAIN-003.
- **Fix/Regression/Restrisiko:** Segmentweise Skeleton-/Typosquat-Analyse über alle Labels, Userinfo-Brand-Erkennung, optionale Pfad-/Query-Bait-Heuristik, FN-Korpus als Regressionstest. Restrisiko: Heuristik bleibt grundsätzlich unvollständig (bewusst offline).

### FIND-008 — False Positives: kurze/generische Markennamen als Subdomain-Label und Wort-Domains nahe Marken werden blockiert
- **Severity / Confidence:** LOW / HIGH (gemessen, TR-04)
- **Root Cause und Preconditions:** Exakte Brand-Labels werden als Subdomain beliebiger Fremddomains blockiert, sofern nicht in der kleinen `genericSubdomains`-Ausnahmeliste (`shared/detector.js:49,286-300`); Damerau-Distanz-1-Typosquatting erzeugt Treffer für gewöhnliche Wörter (`shared/detector.js:322-329`).
- **Betroffene Pfade/Scope:** `shared/detector.js`, `shared/sites.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-1023; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe02 (TR-04): **18/553 (3,3 %) Benign-URLs fälschlich blockiert** — 16 kurze Marken-Subdomains (box/hp/visa/ing/ups/amd/sap/ibm/dhl/dpd/gls/wise/temu/cursor/gemini/signal) sowie `apply.com`/`applet.com` (Apple-Typosquat).
- **Wirkung/Gegenkontrollen:** Legitime Seiten werden umgeleitet; wiederholte Fehlalarme trainieren Wegklicken und schwächen die Warnwirkung.
- **Chains:** keine.
- **Fix/Regression/Restrisiko:** Generische Wörter aus der Subdomain-Regel nehmen bzw. kontextabhängig behandeln; FP-Korpus als Regressionstest; Allowlist. Restrisiko: FP/FN-Trade-off prinzipiell unvermeidbar.

### FIND-009 — Kein Eingabe-/Längenbudget im Detektor: sehr lange Host-Labels erzeugen hohe CPU-Last
- **Severity / Confidence:** LOW / MEDIUM (Messung; Browser-Erreichbarkeit NOT_TESTED)
- **Root Cause und Preconditions:** `classify()` führt NFKD/Skeleton-Transformationen pro Marke (165×) über die Host-Labels aus; keine Längen-/Zeitbudgetprüfung (`shared/detector.js:201-345`). Guard-Page übernimmt Ziel aus URL-Hash/Query (`shared/guard.js:15-17`), Popup aus freiem Eingabefeld (`shared/popup.js:28-34`).
- **Betroffene Pfade/Scope:** `shared/detector.js`, `shared/guard.js`, `shared/popup.js`.
- **Kontrollverletzung / CWE / OWASP:** CWE-770; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe07 (TR-09): Host-Label mit 100.000 Zeichen ⇒ **ca. 1,1 s CPU**; reguläre Latenz p95 0,60–1,81 ms (lastabhängig); 20.000 Fuzz-Inputs ohne Throw.
- **Wirkung/Gegenkontrollen:** Lokale CPU-/UI-Blockade durch präparierte Links; keine Datenwirkung. Reale Erreichbarkeit hängt vom Browser-Host-Längenlimit ab (NOT_TESTED).
- **Chains:** keine.
- **Fix/Regression/Restrisiko:** Harte Budgets (Host > 253 ⇒ skip/Warnung, Label > 63 begrenzen), Early-Exit, Popup-Limit; Fuzz-/Latenztest. Restrisiko: Browser-Limits unverifiziert.

### FIND-010 — Least Privilege/Exposure: breite `host_permissions`+`tabs`, `guard.html` web-accessible, Fingerprinting-Claim nur teilweise zutreffend
- **Severity / Confidence:** INFO / HIGH
- **Root Cause und Preconditions:** `host_permissions` `http://*/*` + `https://*/*` und `tabs` sind funktional begründet, erlauben aber Zugriff auf alle Tab-URLs; `guard.html` ist für alle http(s)-Origins web-accessible (`chrome/manifest.json:31-41`). README behauptet, Fingerprinting-Vektoren seien geschlossen (`README.md:15`), obwohl `guard.html` exponiert bleibt.
- **Betroffene Pfade/Scope:** `chrome/manifest.json`, `firefox/manifest.json`, `README.md`.
- **Kontrollverletzung / CWE / OWASP:** CWE-250; OWASP A01:2025 (Exposure).
- **Tatsächlicher Test/Ergebnis:** probe01 OBS `chrome:WAR-exposes-guard.html-to-all-http(s)`, `permissions:inventory`; probe06 OBS `clickjacking:tab-binding` — Einbettung denkbar, aber Allow-once an `sender.url`+`tab.url` gebunden, kein Bypass nachgewiesen.
- **Wirkung/Gegenkontrollen:** Extension-Fingerprinting und UI-Redressing-Oberfläche; breite Berechtigungen erhöhen den Vertrauensradius bei Kompromittierung (kein bestätigter Bypass). Gegenkontrolle: Tab-Bindung (CHAIN-005).
- **Chains:** CHAIN-005.
- **Fix/Regression/Restrisiko:** WAR-/frame-ancestors-Härtung prüfen, `tabs` minimieren, README-Claim korrigieren. Restrisiko: Interstitial als Top-Level-Navigation kann WAR erfordern — Trade-off dokumentieren.

### FIND-011 — Dokumentationsintegrität: irreführende POST-/Fingerprint-Claims und Referenz auf nicht existierende Architekturdatei
- **Severity / Confidence:** INFO / HIGH
- **Root Cause und Preconditions:** README/Next.md bezeichnen POST-Navigationen als „geschützt“/„abgesichert“ bzw. „bleiben erhalten“ (`README.md:13,42`; `Next.md:27-28`), obwohl keine POST-Prüfung existiert; `Next.md:13` verweist auf eine nicht existierende `ARCHITECTURE_AND_SECURITY_REVIEW.md`; der Testzahlen-Claim 13/13 ist korrekt (TR-01).
- **Betroffene Pfade/Scope:** `README.md`, `Next.md`, `SECURITY.md`.
- **Kontrollverletzung / CWE / OWASP:** CWE-1059; OWASP A06:2025.
- **Tatsächlicher Test/Ergebnis:** probe09 (TR-11) Inventar 44 Dateien ohne die referenzierte Datei; Baseline-Tests (TR-01) 13/13 PASS. Zusätzlich: der < 1 ms-Performance-Claim (Next.md:33) ist nicht durchgängig reproduzierbar (gemessene p95 0,60–1,81 ms unter Audit-Container-Last).
- **Wirkung/Gegenkontrollen:** Falsches Sicherheitsvertrauen bei Nutzern/Reviewern; verringert die Chance, Schutzlücken vor Release zu bemerken.
- **Chains:** keine.
- **Fix/Regression/Restrisiko:** Doku präzisieren und Claims mit Testbelegen verlinken; Referenzdatei ergänzen/entfernen. Restrisiko: reine Dokumentationslücke.

## CHAIN FUSION

### CHAIN-001 — Heuristik-FN + Safe-Auto-Navigation ⇒ stiller Phishing-Besuch ohne Interstitial
- **Parent-Findings:** FIND-007
- **Preconditions/erreichbarer Angreiferpfad:** Chrome mit aktivem strict-Modus; Phishing-URL, die von der Heuristik als „safe“ klassifiziert wird (verdünnte Marken-/Bait-Kombination, FIND-007).
- **Trustwechsel/Kanten:** Untrusted-URL → DNR-Redirect (`chrome/background.js:31-38`) → Guard klassifiziert „safe“ → `go(target,false)` (`chrome/guard.js:50-54`) → allow-once → Navigation. Kanten: `TRUSTS` (Heuristik), `BYPASSES` (Interstitial), `ENABLES` (stille Zustellung).
- **Belegt vs. hypothetisch:** Belegt: redirect-all-Regel, Auto-Navigation, FN-Korpus (86,1 % Erkennung). Nicht beobachtet: konkreter Browser-E2E-Lauf.
- **Wirkung/Risikopriorität:** Das einzige präventive Warninterstitial wird ohne Nutzersignal umgangen; MEDIUM.
- **Breakpoints/Wurzelursache:** (1) Detektor-FN schließen (FIND-007), (2) „safe“ nicht ohne sichtbaren Status auto-navigieren (FIND-001).
- **Sichere Negativtests/Re-Test:** Offen (AUDIT_ONLY). Empfohlene Regression: FN-Korpus erwartet block; E2E-Test kehrt ohne Interstitial nicht still zur Zielseite zurück.

### CHAIN-002 — Init-/Konfig-Fehler + fehlende Events/Statusanzeige ⇒ stiller Schutzausfall (Blindspot)
- **Parent-Findings:** FIND-002, FIND-006
- **Preconditions:** Fehler in `configure()`/Engine-Initialisierung oder suspendierte Hintergrundseite; Nutzer erhält keinen Hinweis.
- **Trustwechsel/Kanten:** Extension-Start → `configure()` rejected (`chrome/background.js:69-73,104`) → keine DNR-Regel/Observer inaktiv → ungeprüfte Navigation → kein Event (`FIND-006`). Kanten: `BREAKS_ON_FAILURE`, `TRUSTS` (fehlende Statusanzeige).
- **Belegt vs. hypothetisch:** Fehlerpfad im Mock reproduziert (`failopen:config-error-no-rule`), Firefox-Throw beobachtet. Reales Fehlerauftreten nicht beobachtet.
- **Wirkung:** Vollständiger Verlust der Primärschutzschicht ohne Wahrnehmung; MEDIUM.
- **Breakpoints:** Definierter Schutzstatus + sichtbare Degradierung + Fail-closed-Fallback (FIND-002) sowie strukturierte Events (FIND-006).
- **Sichere Negativtests:** Fehlerinjektionstest (Storage/DNR/Engine) ⇒ UI-Status FAILED/DEGRADED, kein ungeprüfter Fluss ohne Kennzeichnung. Offen.

### CHAIN-003 — POST-Navigationslücke + Heuristik-FN ⇒ preflight-freie Zustellung einer Phishing-Seite
- **Parent-Findings:** FIND-001, FIND-007
- **Preconditions:** Chrome; Angreifer kontrolliert/kompromittiert eine Seite mit Auto-Submit-POST; Ziel ist heuristisch unerkannt.
- **Trustwechsel/Kanten:** Angreiferseite → Auto-Submit-POST → DNR filtert nur `requestMethods:["get"]` → keine Klassifikation/kein Interstitial → direkte Zustellung. Kanten: `BYPASSES` (Preflight), `ENABLES`.
- **Belegt vs. hypothetisch:** Methodenlücke belegt (`install:requestMethods-only-get`); kompletter Browserablauf (Auto-Submit-POST) nicht E2E getestet (NOT_TESTED); Firefox blockiert alle main_frame-Methoden.
- **Wirkung:** Kompletter Preflight-Bypass unabhängig von der Detektorqualität; MEDIUM.
- **Breakpoints:** Schutz auf Nicht-GET-Hauptnavigationen erweitern (FIND-001) + Detektor-FN schließen (FIND-007).
- **Sichere Negativtests:** E2E-Test: POST auf Test-Phishing-Domain muss Interstitial erzeugen. Offen.

### CHAIN-004 — Build-/Provenance-Lücke + generierte Brand-DB + fehlender Signatur-Nachweis ⇒ manipulierbares Schutz-Update
- **Parent-Findings:** FIND-005
- **Preconditions:** Zugriff auf Build-/Release-Kette (kompromittierter Maintainer/Build-Umgebung/Store-Kanal); keine verifizierbaren Checksums/Signaturen/CI im Repo.
- **Trustwechsel/Kanten:** Manipulation an `shared/detector.js`/`sites.js`/`build_sites.py` → `build.py` verpackt ohne Allowlist/Hash (`build.py:20-28`) → Distribution → Nutzer. Kanten: `ENABLES`, `TRUSTS` (fehlende Provenance), `BREAKS_ON_FAILURE`.
- **Belegt vs. hypothetisch:** Kontrollabwesenheit belegt (VGT-055/056/059); **keine Evidenz für tatsächliche Kompromittierung** — Confidence LOW.
- **Wirkung:** Theoretisch vollständige Subversion des Schutzprodukts ohne Verifikationsmöglichkeit; MEDIUM.
- **Breakpoints:** Store-Signatur + reproduzierbarer Build + SHA-256-Manifest + Datei-Allowlist + CI (nicht nachweisbar, VGT-056 BLOCKED).
- **Sichere Negativtests:** Build zweier Läufe byte-identisch + Hash-Manifest + Signaturprüfung; unerwartete Datei ⇒ Build-Fehler. Offen.

### CHAIN-005 — WAR-Exposure `guard.html` + Clickjacking-Versuch auf Allow-once ⇒ durch Tab-Bindung abgewehrt
- **Parent-Findings:** FIND-010
- **Preconditions:** Chrome; beliebige Webseite bettet `guard.html` ein und versucht die Freigabe auszulösen.
- **Trustwechsel/Kanten:** Web-Origin → iframe/Navigation auf `chrome-extension://…/guard.html#<ziel>` → Klick → allow-once → Background prüft `sender.url` **und** `tabs.get(tabId).url` → tab.url ist Web-Origin-Seite ⇒ Ablehnung. Kanten: `TRANSFORMS`, `BYPASSES` (Versuch), durch `CONTROL` unterbrochen.
- **Belegt vs. hypothetisch:** Mock-verifiziert: `msg:web-origin-rejected`, `msg:tab-not-on-guard-rejected` (TR-06, 46/46); kein Browser-E2E für reale Frame-/Tab-Semantik.
- **Wirkung:** Kein Bypass nachgewiesen; Restrisiko UI-Redressing/Fingerprinting ohne Rechtewirkung. LOW.
- **Breakpoints:** Implementierte Doppelbindung (Submitter-Origin + Ziel-Tab) und fehlendes `externally_connectable`; zusätzlich WAR-/frame-ancestors-Härtung empfohlen.
- **Sichere Negativtests:** E2E: Einbettung von `guard.html` in Web-Origin-iframe darf keine Freigabe bewirken. Teilweise mock-verifiziert, E2E offen.

## Patch-Ledger

| Patch-ID | Finding/Chain | File(s) | Änderungsart | Positiv-/Negativ-Test | Residualrisiko |
|---|---|---|---|---|---|
| — | — | — | **Keine Patches** (MODE=AUDIT_ONLY; Quellcode nicht verändert) | — | — |

Es wurden ausschließlich Audit-Artefakte unter `audit/security/` erzeugt (Matrix, Bericht, Probes, Logs, Ergebnisse). Keine produktiven Dateien wurden verändert.

## Test-Ledger

| Befehl/Test-ID | Plattform | Tatsächlich ausgeführt? | Exit | Pass | Fail | Skip | Dauer | Relevante Grenzen |
|---|---|---|---:|---:|---:|---|---|---|
| TR-01 Produkt-Baseline `node --test tests/detector.test.cjs tests/chrome-worker.test.cjs tests/firefox-worker.test.cjs` | Windows / Node v24.13.0 | ja | 0 | 13 | 0 | 0 | 501 ms | Detektor + gemockte Chrome-/Firefox-Logik; keine Browser-E2E |
| TR-02 `node --check` (6 produktive JS-Dateien) | Windows / Node v24.13.0 | ja | 0 | 6 | 0 | 0 | — | nur Syntax |
| TR-03 `probe01_manifest_integrity.cjs` | Windows / Node v24.13.0 | ja | 0 | 25 | 0 | 0 | — | Manifeste, Dateien, WAR, Build-Drift, Permissions |
| TR-04 `probe02_detector_corpus.cjs` (Messlauf) | Windows / Node v24.13.0 | ja | 0 | — | — | — | — | 43 Angriffs-URLs, 553 Benign-URLs; synthetischer Korpus |
| TR-05 `probe03_punycode_parity.cjs` (Messlauf) | Windows / Node v24.13.0 | ja | 0 | — | — | — | — | 165 Confusable-Substitutionen, 480 IDN-Decoder-Fälle |
| TR-06 `probe04_chrome_background_mock.cjs` | Windows / Node v24.13.0 (vm + chrome-API-Mock) | ja | 0 | 46 | 0 | 0 | — | DNR-Regelaufbau, Messaging-Auth, Allow-once-Lifecycle, Reduced Mode, Startup-Purge |
| TR-07 `probe05_firefox_background_mock.cjs` | Windows / Node v24.13.0 (vm + browser-API-Mock) | ja | 0 | 14 | 0 | 0 | — | webRequest-Blocking, Messaging-Auth, Einmal-Bypass, Tab-Lebensdauer |
| TR-08 `probe06_guard_render_mock.cjs` | Windows / Node v24.13.0 (vm + DOM-Stub) | ja | 0 | 38 | 0 | 0 | — | Query/Hash, XSS-Sinks, Auto-Navigation, Fehlerpfade/Fail-closed |
| TR-09 `probe07_fuzz_perf.cjs` | Windows / Node v24.13.0 | ja | 0 | 10 | 0 | 0 | — | 20.000 Fuzz-Inputs, Extremlängen, Determinismus, Latenz p95 0,60–1,81 ms über Läufe (Budget <5 ms) |
| TR-10 `probe08_data_integrity.cjs` | Windows / Node v24.13.0 | ja | 0 | 8 | 0 | 0 | — | 165 Marken/257 Domains, `sites.js`==`sites-100.json`, offizielle Hosts safe |
| TR-11 `probe09_static_scan.py` (Messlauf) | Windows / Python 3.14.2 | ja | 0 | — | — | — | — | 44 Dateien: Netzwerk-Sinks, eval/HTML-Sinks, Secrets, Supply-Chain, HTML-Parität |
| TR-12 `python …/validate_audit.py audit/security/AUDIT_MATRIX.json` | Windows / Python 3.14.2 | ja | 0 | — | — | — | — | Struktur-/Evidenzvalidierung; „VALID STRUCTURE“ (kein Sicherheitsbeweis) |
| (verworfen) `node --test tests/` | Windows / Node v24.13.0 | ja | 1 | 0 | 1 | 0 | 64 ms | Fehlaufruf: Node 24 interpretiert `tests/` als Modul statt Glob (`MODULE_NOT_FOUND`); ersetzt durch TR-01 mit expliziten Dateien — dokumentiert, nicht als Test-Grün gewertet |

**Messwerte aus den Probes:** Detektor-Korpus 37/43 Angriffe erkannt (86,1 %), 18/553 Benign fälschlich blockiert (3,3 %); Confusable 165/165 (Unicode und Punycode), IDN-Decoder 480/480 konsistent; Klassifikationslatenz p50 0,49–0,71 ms / p95 0,60–1,81 ms / p99 1,16–4,31 ms (lastabhängig; mehrere Läufe); Extremhost 100k → ca. 1,1 s CPU; Fuzz 20.000 Iterationen, 0 Throws.

## Audit-Entscheidung

### Harte Blocker und Gründe

1. **Kein Browser-E2E-Nachweis** für das Kernschutzverfahren (Chrome DNR-Redirect + Firefox webRequest-Blocking) auf beiden Zielplattformen → Laufzeitwirkung des beworbenen Schutzes nicht belegt (VGT-050, VGT-079, VGT-090, VGT-093; FIND-004). Ein Security-Produkt darf ohne diesen Nachweis nicht als „geprüft“ freigegeben werden.
2. **Fail-open-Kernpfade:** POST-/Nicht-GET-Navigationen werden in Chrome nicht geprüft (FIND-001/CHAIN-003); Konfigurations-/Init-Fehler führen zu stiller Untätigkeit (FIND-002/CHAIN-002). Beides untergräbt die zentrale Schutzaussage.
3. **Messbare Erkennungs-/FP-Schwäche** ohne kalibriertes Regression-Dataset (FIND-007/FIND-008; VGT-080) — bei einem Anti-Phishing-Produkt release-relevant.
4. **Allow-once-Lebenszyklus/Races** ohne TTL/Serialisierung (FIND-003; VGT-006/062/063).
5. **Keine verifizierbare Release-Provenance/Signatur** und **kein CI-Regressionsgate** (FIND-005; VGT-055/056/059/100; CHAIN-004). Signatur/Store-Kanal ohne Store-Zugriff **BLOCKED**.

### Befristete Risk Acceptances

Keine dokumentiert. Der Alpha-/Prototyp-Status (`README.md:45`: „Chrome ist damit vorerst ein Technik-Prototyp und nicht bedenkenlos für den Alltag geeignet“) ist eine **Produktaussage, keine formale Risikoübernahme** durch einen benannten Entscheider mit Ablaufdatum.

### Nicht prüfbare / außerhalb Scope liegende Grenzen

- **Echter Browser-Lauf** (Chrome/Firefox, History/Referer/POST/Fragment/IDN): kein Browser im Container → `NOT_TESTED`.
- **Store-Signatur, Notarisierung, Update-Kanal**: keine Netzwerk-/Store-Aktionen erlaubt → VGT-056 `BLOCKED`.
- **SAST/DAST/SCA-Toolabgleich**: kein Tooling im Offline-Scope → VGT-097 `BLOCKED`; ersetzt durch manuelle Analyse + eigene Node-/Python-Probes (Triangulation).
- **Browser-/OS-Plattform-CVEs, CISA-KEV-Abgleich**: ohne Netzwerkzugriff und außerhalb des Artefakts nicht bewertet (Advisory-Freshness unbekannt).
- **macOS/Linux-Verhalten**: Audit-Host Windows; keine OS-spezifischen Codepfade gefunden, Laufzeitverhalten auf anderen OS nicht getestet.

### Priorisierte nächste Schritte (höchster Sicherheitswirkungsgrad zuerst)

1. **Chrome-POST-/Nicht-GET-Lücke schließen** oder POST-Navigationen als explizites, dokumentiertes Restrisiko behandeln; Doku-/UI-Claims sofort korrigieren (FIND-001, FIND-011).
2. **Fail-closed-Statusmodell** für Init/Konfiguration + sichtbare Schutzanzeige (OK/DEGRADED/FAILED) und Fehlerinjektionstests (FIND-002, FIND-006).
3. **Detektor-Regression** mit FN-/FP-Korpus (probe02) als Produkt-Tests; Segment-/Userinfo-/Bait-Logik härten (FIND-007, FIND-008).
4. **Browser-E2E-Suite** (Playwright/Selenium, unpacked Extension) für Chrome + Firefox inkl. POST-, Redirect-, History-, Fragment-, IDN- und Clickjacking-Fällen (FIND-004, CHAIN-005).
5. **Allow-once-Härtung:** TTL, Reconciliation, configure()-Serialisierung, atomarer Zähler (FIND-003).
6. **Release-Integrität:** VCS, reproduzierbarer Build, SHA-256-Manifest, Datei-Allowlist, Store-Signaturprozess, CI (FIND-005; VGT-056).
7. **Eingabe-Budgets** und Popup-/Guard-Längenlimits (FIND-009); Least-Privilege-/WAR-Review (FIND-010).

---

**Nachweis der Schreibgrenzen:** Erzeugt wurden ausschließlich `audit/security/AUDIT_MATRIX.json`, `audit/security/AUDIT_SECURITY.md` sowie `audit/security/probes/**` (9 Probe-Skripte, Runner, `build_matrix.cjs`, Logs, Ergebnis-JSONs). Produktcode, Tests, Manifeste und sonstige Dateien wurden **nicht** verändert. Keine Netzwerkaktionen durchgeführt. Kein echter Browser-E2E verfügbar → als `NOT_TESTED`/`BLOCKED` ausgewiesen, nicht als PASS erfunden.
