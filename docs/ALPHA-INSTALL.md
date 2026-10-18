# Alpha-Installation über GitHub (ohne Store)

Antipisher 0.1.1 ist eine **Alpha**. Es gibt keine Store-Freigabe, keine Signatur durch Google/Mozilla
und keine Garantie auf vollständigen Schutz. Installation nur aus dem GitHub-Release und nur, wenn du
dem Quellcode/Projekt vertraust.

## 1. Release herunterladen & prüfen

1. GitHub → **Releases** → `v0.1.1` (Alpha) öffnen.
2. Dateien herunterladen:
   - `Antipisher-Chrome-v0.1.1-alpha.zip`
   - `Antipisher-Firefox-v0.1.1-alpha.zip`
   - `Antipisher-Source-v0.1.1-alpha.zip` (optional, für Prüfung)
   - `SHA256SUMS.txt`
3. Integrität prüfen (empfohlen):

```powershell
# Windows
Get-FileHash .\Antipisher-Chrome-v0.1.1-alpha.zip -Algorithm SHA256
Get-FileHash .\Antipisher-Firefox-v0.1.1-alpha.zip -Algorithm SHA256
# Werte mit SHA256SUMS.txt vergleichen
```

```bash
# Linux/macOS
sha256sum -c SHA256SUMS.txt
```

4. ZIPs entpacken.

## 2. Chrome / Chromium

1. `chrome://extensions/` öffnen.
2. **Entwicklermodus** oben rechts aktivieren.
3. **Entpackte Erweiterung laden** → Ordner `chrome/` aus dem entpackten ZIP wählen.
4. Extension anheften und das Popup öffnen: Status „Schutz aktiv“ muss erscheinen.
5. **Update:** neuen Release entpacken, in `chrome://extensions` auf „Neu laden“ klicken.
   Die Extension-ID bleibt bei gleichem Pfad stabil; bei neuem Pfad ändert sie sich.

> Chrome lädt entpackte Extensions ohne Signatur. Das ist für Alpha-Tests vorgesehen.
> Die DNR-Vorabprüfung greift bei GET-Navigationen; POST-Schutz ist best effort (siehe Grenzen).

## 3. Firefox

### 3a. Temporär (einfach, nicht dauerhaft)

1. `about:debugging#/runtime/this-firefox` öffnen.
2. **Temporäres Add-on laden** → `firefox/manifest.json` aus dem entpackten ZIP.
3. Nach jedem Firefox-Neustart muss das Add-on erneut geladen werden.

### 3b. Dauerhaft (nur mit Mozilla-Signatur)

Firefox lässt unsignierte Add-ons im Release-Kanal **nicht dauerhaft** installieren. Optionen:

- **AMO „unlisted“ Signierung** (kein öffentliches Store-Listing): Das XPI wird von Mozilla
  signiert und kann per „Datei → Add-on installieren“ dauerhaft installiert werden.
  Ablauf: [`docs/RELEASE-SIGNING.md`](RELEASE-SIGNING.md) §3.
- Firefox Developer Edition/Nightly mit deaktivierter Signaturpflicht
  (`xpinstall.signatures.required = false`) — nur für Entwickler, nicht für normale Nutzer.
- Firefox ESR/Release: unsigniert nur temporär über `about:debugging`.

> **Wichtig:** Eine GPG-Signatur der ZIP-Datei ersetzt **nicht** die Mozilla-Signatur des XPI.
> Das sind zwei verschiedene Dinge (Release-Integrität vs. Add-on-Installationsfreigabe).

## 4. Nach der Installation

- Testmatrix durchgehen: [`docs/TESTING-ALPHA.md`](TESTING-ALPHA.md).
- Falsch-positiv/negativ über das GitHub-Issue-Template melden (keine aktiven Phishing-Links!).
- Bekannte Grenzen lesen: [`README.md`](../README.md) → „Grenzen & bekannte Risiken“.

## 5. Deinstallation

- Chrome: `chrome://extensions` → Antipisher → Entfernen.
- Firefox: `about:addons` → Antipisher → Entfernen (temporäre Add-ons verschwinden beim Neustart).

## 6. Datenschutz

Lokal, offline, keine Telemetrie. Details: [`PRIVACY.md`](../PRIVACY.md).
