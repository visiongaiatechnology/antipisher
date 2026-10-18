# Release-Integrität & Signierung

Kurzfassung: **Für Chrome-„Load unpacked“ ist keine Signatur nötig. Für eine dauerhafte
Firefox-Installation braucht es eine Mozilla-Signatur (AMO unlisted), nicht GPG. Für
GitHub-Release-Integrität sind signierte Tags + Checksums + optional Sigstore/GPG empfehlenswert.**

## 1. Drei verschiedene Dinge

| Ebene | Was | Nötig für Alpha? |
|---|---|---|
| **Browser-Add-on-Signatur** | Chrome: keine für unpacked. Firefox: Mozilla-Signatur für dauerhafte Installation. | Chrome nein; Firefox dauerhaft ja |
| **Release-Integrität** | SHA-256-Checksums, signierte Git-Tags, GPG/Sigstore-Signaturen der ZIPs | empfohlen, nicht funktional nötig |
| **Code-Signatur** | Signierte Binaries/Zertifikate | **nicht relevant** (keine nativen Binaries, kein Remote-Code) |

## 2. Chrome

- Entpackte Extension: **keine Signatur** nötig.
- Store: nicht geplant; Store würde Google-Signatur/Review erfordern.
- Stabile Extension-ID (optional): Manifest-`key` mit öffentlichem Schlüssel hinterlegen, damit
  die ID unabhängig vom Entpackpfad stabil bleibt. Das ist **keine** Sicherheitssignatur.
- Update: neues Release entpacken und „Neu laden“; bei gleichem Pfad bleibt die ID stabil.

## 3. Firefox (dauerhafte Installation)

- `about:debugging` installiert unsignierte Add-ons nur **temporär** (bis zum Neustart).
- Dauerhaft im Release-Firefox: **Mozilla-signiertes XPI**. Das geht ohne öffentliches Store-Listing
  über **AMO „unlisted“ (self-distribution)**:
  1. AMO-Konto + API-Credentials (`web-ext sign --api-key ... --api-secret ...`).
  2. `web-ext sign --source-dir firefox --channel unlisted --api-key ... --api-secret ...`
  3. Ergebnis-XPI von Mozilla signiert; Installation per Datei/„Add-on installieren“.
  - Das ist **kein** öffentliches Store-Listing und erfordert keinen Store-Review im klassischen Sinn,
    aber eine AMO-Einreichung. Alternativ Developer Edition mit deaktivierter Signaturpflicht
    (nur Entwickler).
- `data_collection_permissions: {required:["none"]}` ist im Manifest gesetzt (AMO-Pflichtfeld).
- Eine GPG-Signatur der ZIP-Datei hilft gegen Manipulation der Download-Datei, ersetzt aber **nicht**
  die Firefox-Installationssignatur.

## 4. GitHub-Release-Integrität (empfohlen)

### 4a. Signierter Tag (GPG oder SSH)

```bash
# GPG
git tag -s v0.1.1 -m "Antipisher 0.1.1 Alpha"
git push origin v0.1.1
git tag -v v0.1.1

# alternativ SSH-Signatur
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
git tag -s v0.1.1 -m "Antipisher 0.1.1 Alpha"
```

### 4b. Checksums + Signatur der Checksums

Der Build erzeugt `SHA256SUMS.txt` (Repo + Release-Ordner). Empfohlen:

```bash
sha256sum -c SHA256SUMS.txt
gpg --detach-sign --armor SHA256SUMS.txt     # erzeugt SHA256SUMS.txt.asc
```

Release-Assets: drei ZIPs + `SHA256SUMS.txt` + `SHA256SUMS.txt.asc`. Nutzer prüfen:

```bash
gpg --verify SHA256SUMS.txt.asc SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt
```

### 4c. Sigstore / GitHub Attestations (keyless, ohne eigenen Key)

- **Sigstore cosign keyless**: `cosign sign-blob --bundle SHA256SUMS.txt.bundle SHA256SUMS.txt`
  (OIDC-basiert; CI-tauglich).
- **GitHub Artifact Attestations**: `actions/attest-build-provenance` an die Release-ZIPs binden;
  Prüfung mit `gh attestation verify <file> --repo <owner>/<repo>`.
- Vorteil: kein langfristiger privater Key im Repo; Nachteil: zusätzliche CI-Abhängigkeit.

### 4d. Reproduzierbare Builds

Der Build ist deterministisch (feste ZIP-Zeitstempel, keine Build-IDs). Unabhängige Prüfung:

```bash
python build.py
python build.py
sha256sum ../Antipisher-*.zip   # must be identical across runs
```

Wer dem Release nicht traut: Quell-ZIP entpacken, `python build.py` ausführen, Hashes mit
`SHA256SUMS.txt` vergleichen. Abweichung = nicht übernehmen.

## 5. Aktueller Stand (0.1.1)

- **Keine** GPG-/Sigstore-Signatur der Release-Artefakte vorhanden (kein Schlüssel im Repo).
- **Keine** Mozilla-Signatur der Firefox-Version vorhanden (nur temporäre Installation).
- `SHA256SUMS.txt` + deterministische Builds sind vorhanden und verifizierbar.
- Empfehlung für den ersten GitHub-Release: signierten Tag + GPG-signierte `SHA256SUMS.txt.asc`
  (eigener Key) **oder** Sigstore in CI; Firefox-XPI bei Bedarf unlisted signieren.

## 6. Key-Management-Regeln

- Privaten Signatur-Key nie ins Repo, nie in Issues, nie in CI-Logs.
- Key-Rotation dokumentieren; alte Signaturen bleiben prüfbar.
- Kein „Sicherheitsversprechen“ aus einer Signatur ableiten: Signatur = Herkunft/Integrität,
  nicht = schadcodefreie Software.
