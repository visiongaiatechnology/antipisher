# Contributing — Antipisher Alpha

Danke für dein Interesse. Dieses Projekt ist eine **Alpha 0.1.1** mit dokumentierten Grenzen
(siehe [`README.md`](README.md) und [`docs/ALPHA-INSTALL.md`](docs/ALPHA-INSTALL.md)).
Es gibt **keine Garantie** auf vollständigen Phishing-Schutz.

## Alpha testen

- Installation: [`docs/ALPHA-INSTALL.md`](docs/ALPHA-INSTALL.md)
- Testmatrix & Meldeablauf: [`docs/TESTING-ALPHA.md`](docs/TESTING-ALPHA.md)
- Falsch-positiv/negativ: Issue-Template „Falsch-positiv / Falsch-negativ“ nutzen.
- **Keine** aktiven Phishing-URLs, Zugangsdaten, Passwörter oder Cookies posten.

## Entwicklung

Voraussetzungen: Node.js ≥ 24, Python ≥ 3.12. Keine Runtime-Dependencies, kein npm-Install nötig.

```bash
node --test tests/*.test.cjs
node --check shared/detector.js
python build.py
```

- `shared/` ist die Quelle; `build.py` synchronisiert nach `chrome/` und `firefox/` und baut
  deterministische ZIPs + `SHA256SUMS.txt`.
- Änderungen an der Erkennung brauchen **Regressionstests** in `tests/` und eine ehrliche
  Aktualisierung der Messwerte in README/Next.
- Keine externen CDNs, keine Telemetrie, keine Remote-Skripte, keine Secrets im Repo.

## Pull Requests

1. Branch von `main`, kleiner fokussierter Umfang.
2. Tests und Build lokal grün; `node --test`-Ausgabe im PR erwähnen.
3. Sicherheitsrelevante Änderungen: Threat-Boundary kurz beschreiben (Eingabe → Guard → Wirkung)
   und Gegenkontrollen nennen.
4. Keine bestehenden Nutzeränderungen überschreiben; keine stillen Sicherheitslockerungen.
5. Bei UI: Screenshot vor/nach (Chromium) beilegen.

## Sicherheit

Bitte Sicherheitslücken **nicht** öffentlich melden, sondern über
GitHub Security Advisories des Repositories. Details: [`SECURITY.md`](SECURITY.md).

## Lizenz

Mit dem Beitrag stimmst du zu, dass dein Beitrag unter der **AGPLv3** lizenziert wird
(siehe [`LICENSE`](LICENSE)).
