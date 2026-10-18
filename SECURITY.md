# Sicherheitshinweise — Antipisher 0.1.1 (Alpha)

Antipisher ist eine lokale Alpha-Schutzerweiterung unter AGPLv3. Es gibt **keine externe
Sicherheitszertifizierung**, keine Store-Signatur und keine Garantie, jede Phishing-Domain zu
erkennen. Dieses Dokument beschreibt Meldeweg, Umfang und die harten Grenzen.

## Unterstützte Versionen

| Version | Status |
|---|---|
| `0.1.1` (Alpha) | unterstützt (Sicherheitsfixes nach Möglichkeit) |
| `0.1.0` und älter | nicht unterstützt |

Es gibt keinen LTS-Zweig und keine SLA.

## Schwachstellen melden

Bitte **nicht** öffentlich als Issue melden. Nutze:

**GitHub → Security → Advisories → „Report a vulnerability“**
(private Security Advisory des Repositories)

Falls das Repository noch keine Advisories aktiviert hat: Maintainer über den privaten
GitHub-Kanal kontaktieren, bis Advisories eingerichtet sind. Bitte keine Details in
öffentlichen Issues, Diskussionen oder PRs posten.

**Bitte mitschicken:** betroffene Version/Datei, Reproduktionsschritte, erwartete vs. tatsächliche
Wirkung, Browser/OS, ggf. minimaler PoC. **Keine** echten Zugangsdaten, keine aktiven
Phishing-URLs, keine fremden personenbezogenen Daten.

## Umfang

**In Scope:**

- Extension-Code (`shared/`, `chrome/`, `firefox/`), Manifeste, Build-Skripte, Detektor,
  Content Shield, Guard-/Popup-Oberflächen.
- Sicherheitsgrenzen: Extension-Kontext ↔ Web-Origin, Guard ↔ Background (Allow-once),
  Build-/Release-Integrität, Datenschutz/Offline-Zusagen.
- Umgehungen der Erkennung mit Sicherheitswirkung (Bypass der Schutzseite, Whitelist-Fail-open,
  Rechteausweitung, Datenabfluss).

**Out of Scope:**

- Schwachstellen in Chrome/Firefox selbst; Store-/AMO-Infrastruktur; fremde Websites.
- Phishing-Kampagnen, Social Engineering, reine False Positives/Negatives ohne Sicherheitsgrenze
  (dafür das FP/FN-Issue-Template).
- DoS auf dem lokalen Rechner ohne Sicherheitsgrenze; rechtliche Fragen.

## Sicherheitsmodell (harte Grenzen)

- **Lokal/offline:** keine Telemetrie, keine Cloud, keine Remote-Skripte.
- **GET-Preflight** (Chrome DNR/Firefox webRequest) — **POST ist nicht vollständig abgedeckt**;
  `form.submit()`, iframes, `fetch`/XHR und Overlay-Manipulation umgehen das Content Shield.
- Das Content Shield ist eine **UX-Barriere**, kein Sicherheitsperimeter.
- Chrome-Redirect-All kann History/Referer/OAuth/Fragment beeinflussen; DNR-`regexSubstitution`
  ist nicht browser-verifiziert.
- Offizielle Domaindaten sind unvollständig/nicht durchgängig RDAP/CT-verifiziert.
- Keine signierten Updates, kein Rollback-Schutz, keine Store-Signatur.
- Eine Domain in der Schutzliste ist **kein** Beweis für sichere Inhalte (kompromittierte
  Originalseiten, übernommene Konten, Drittanbieter-Subdomains bleiben möglich).

Details und Messwerte: [`README.md`](README.md), [`Next.md`](Next.md),
[`docs/TESTING-ALPHA.md`](docs/TESTING-ALPHA.md).

## Signierung / Release-Integrität

`SHA256SUMS.txt` + deterministische Builds sind vorhanden. Release-Artefakte sind Stand 0.1.1
**nicht** GPG-/Sigstore-signiert; Firefox ist **nicht** Mozilla-signiert (nur temporäre
Installation). Optionen und Risiken: [`docs/RELEASE-SIGNING.md`](docs/RELEASE-SIGNING.md).

## Safe Harbor

Good-faith-Forschung am eigenen lokal installierten Build ist willkommen, sofern keine
fremden Systeme angegriffen, keine Daten exfiltriert und keine aktiven Phishing-Seiten
verbreitet werden. Meldewege einhalten; keine öffentliche Offenlegung vor Abstimmung.
