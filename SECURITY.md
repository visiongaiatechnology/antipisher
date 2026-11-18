# Sicherheitshinweise & Incident-Runbook — Antipisher 0.2.3 (Platin Security Hardened)

Antipisher ist eine 100 % lokale, datensparsame Browser-Schutzerweiterung (Chrome MV3 & Firefox MV3) unter der GNU Affero General Public License v3.0 (AGPLv3). Dieses Dokument definiert die unterstützten Versionen, den verantwortungsvollen Meldeweg, die verifizierten Sicherheitsgrenzen (VGT-100) sowie das Incident-Response- und Recovery-Runbook.

---

## 1. Unterstützte Versionen

| Version | Qualitätsstufe | Status |
|---|---|---|
| **`0.2.3`** | **`PLATIN`** (`VGT-100: 48/52 PASS, 0 FAIL`) | **Aktuell unterstützt** |
| `0.2.0` – `0.2.2` | `GOLD` / `SILBER` | Veraltet — Upgrade auf `0.2.3` empfohlen |
| `0.1.x` und älter | `ALPHA` | Nicht mehr unterstützt |

---

## 2. Sicherheitslücken melden (Coordinated Vulnerability Disclosure)

Bitte **keine** ungepatchten Sicherheitslücken in öffentlichen GitHub-Issues posten.

1. **Primärer Meldekanal:**
   **GitHub → Security → Advisories → „Report a vulnerability“** (private Security Advisory des Repositories).
2. **Inhalt der Meldung:**
   - Betroffene Version (`0.2.3`) und Komponente (`shared/detector.js`, `chrome/background.js`, `firefox/background.js`, `shared/shield-content.js`, `shared/aegis-engine.js`, `build.py`).
   - Minimale Reproduktionsschritte (PoC) sowie erwartetes vs. tatsächliches Verhalten.
   - **Wichtig:** Keine echten Zugangsdaten, keine fremden personenbezogenen Daten (PII) und keine scharfen Credential-Harvesting-Infrastrukturen übermitteln.
3. **Safe Harbor:**
   Sicherheitsforschung nach Treu und Glauben (*Good-Faith Security Research*) an einer eigenen lokalen Installation ist ausdrücklich willkommen, sofern keine Drittsysteme beeinträchtigt oder Nutzerdaten gefährdet werden.

---

## 3. Verifizierte Sicherheitsarchitektur & Vertrauensgrenzen (VGT-100)

- **100 % Offline & Zero Telemetry (`VGT-027`, `VGT-044`, `VGT-068`):**
  Keinerlei ausgehende Netzwerk-Requests, keine Cloud-Abfragen, keine Übertragung besuchter URLs oderDomains.
- **RFC-1035 Ressourcen- & DoS-Budgets (`VGT-020`, `VGT-064`):**
  `shared/detector.js` begrenzt Eingabelängen strikt (`MAX_URL_INPUT_LEN = 262144`, `MAX_HOST_LEN = 253`, `MAX_LABEL_LEN = 63`, `MAX_LABELS = 32`, `MAX_PATH_SCAN_LEN = 2048`) und berechnet Label-Normalisierungen einmalig vorab (`p50 = 0,023 ms`, `p95 = 0,39 ms`; `100k`-Hostlabel in `0,26 ms`).
- **Doppelt gebundene Einmal-Freigabe mit 30-Sekunden-TTL (`VGT-001`..`VGT-006`, `VGT-037`, `VGT-069`):**
  `allow-once` akzeptiert Nachrichten ausschließlich von `guard.html` für einen Tab, der aktuell auf `guard.html` steht, und nur für `http:`/`https:`-Ziele. Ausnahmen verfallen automatisch nach `ALLOW_TTL_MS = 30000` (30 Sekunden), beim ersten Navigations-Commit, beim Schließen des Tabs oder bei einer abweichenden Navigation.
- **Fail-Closed Engine Guard & Queue-serialisierte Konfiguration (`VGT-002`, `VGT-061`..`VGT-063`, `VGT-066`):**
  Parallele `configure()`-Läufe werden über einen Queue-Mutex serialisiert; verwaiste Session-Regeln werden beim Start vorab bereinigt; fehlt die Detektor-Engine oder wirft `classify()`, leiten Chrome und Firefox Navigationen fail-closed auf `guard.html` um und setzen `protectionDegraded = true`.
- **In-Page Content-Shield & GeDefense Light (`VGT-013`, `VGT-014`, `VGT-050`):**
  - `shared/shield-content.js` fängt Formular-Submits (`POST`/`GET`) in der Capture-Phase vor dem Absenden ab und schützt im geschlossenen Shadow-DOM ohne `innerHTML`-Sinks.
  - `shared/aegis-engine.js` blockiert dynamische Cross-Origin-`<script>`/`<iframe>`-Injektionen von Supply-Chain-Angreifern (`1688360.cc`, `webshell.lol`, `.icu`-Exploit-Kits), verhindert Magecart-Exfiltration (`sendBeacon`/`fetch`) und schützt die Zwischenablage vor Crypto-Clippern.
- **Datensparsamer Security-Event-Ringpuffer (`VGT-071`, `VGT-072`):**
  `storage.local.securityEvents` speichert maximal 50 strukturierte Status-/Schutz-Events (`{ ts, type, detail }`) für lokale Diagnose — **niemals** URLs, Hostnamen, Pfade oder PII.
- **Deterministische Build-Allowlist & CycloneDX SBOM (`VGT-051`, `VGT-055`, `VGT-059`):**
  `build.py` prüft vor dem Packen eine strikte Positivliste (`ALLOWED_PACKAGE_FILES`, 22 Dateien) und erzeugt bit-identische ZIP-Archive, `SHA256SUMS.txt` sowie eine maschinenlesbare Zero-Dependency-SBOM (`sbom.json`, CycloneDX 1.5).

### Dokumentierte Plattform-Grenzen
1. **Top-Level-POST außerhalb des Dokumentkontexts:** Während Formular-Submits im Dokument durch `shield-content.js` abgefangen werden, prüft Chrome DNR auf Netzwerkebene nur `GET`-Hauptnavigationen (damit `POST`-Bodies nicht durch Redirects verloren gehen).
2. **Externe Store-Signierung (`VGT-056`):** Lokale Release-ZIPs sind über `SHA256SUMS.txt` und `sbom.json` kryptografisch prüfbar; die Browser-Store-Signatur erfolgt erst durch Google Web Store bzw. Mozilla AMO.

---

## 4. Incident-Response- & Recovery-Runbook (`VGT-079`)

### A. Vorgehen bei vermuteter Fehlkonfiguration oder Degraded-Status (`EINGESCHRÄNKT`)
1. Öffne das Antipisher-Popup → Zahnrad-Symbol (**Einstellungen** / `options.html`) → Tab **System & Daten**.
2. Prüfe den Status-Indikator und führe bei Bedarf **„Auf Werkseinstellungen zurücksetzen“** aus (löscht fehlerhafte lokale Whitelist-Einträge, setzt `protectionDegraded` zurück und initialisiert die DNR-/Observer-Regeln neu).
3. Alternativ unter `chrome://extensions` bzw. `about:addons` die Erweiterung einmal aus- und wieder einschalten (löst den Fail-Closed Startup-Purge aller Session-Regeln `id >= 10001` aus).

### B. Vorgehen bei neuen Supply-Chain- / Phishing-Kampagnen (IOC-Notfall-Update)
1. **Netzwerk-IOCs sperren:** Neue C2-/Skimmer-Domains in `rulesets/trackers.json` sowie in `TRACKER_DOMAINS` (`chrome/background.js`, `firefox/background.js`) und `SUPPLY_CHAIN_IOC_DOMAINS` (`shared/aegis-engine.js`) eintragen.
2. **Marken-/Domain-Schutz erweitern:** Neue Zielmarke in `build_sites.py` ergänzen (wird automatisch gegen `BRAND_RE`, `HOSTNAME_RE` und `SHARED_HOST_ROOTS` validiert).
3. **Verifikation & Reproducible Build ausführen:**
   ```powershell
   python build.py
   powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
   powershell -ExecutionPolicy Bypass -File audit/security/probes/run_all.ps1
   ```
   Alle 13 Testdateien (`91/91 PASS`), alle 9 Security-Probes und `validate_audit.py` müssen mit `Exit 0` abschließen.
