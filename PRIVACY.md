# Datenschutz — Antipisher 0.1.1 (Alpha)

Antipisher ist **lokal-first** und **offline**. Es gibt keine Telemetrie, keine Cloud-Abfragen,
keine Werbe- oder Analyse-SDKs und keine externen Laufzeit-Assets.

## Welche Daten werden verarbeitet?

- **URL/Hostname** der aufgerufenen Seite: ausschließlich lokal im Browser klassifiziert.
- **Formular-Ziel** bei einem Submit (inkl. `formaction`): lokal klassifiziert; keine Übertragung.
- **Existenz eines Passwortfelds**: nur `input[type="password"]`-Präsenz, **kein** Wert, kein Feldinhalt.
- **Blockzähler, Einstellungen** (`strictMode`, Schutzstatus): lokal über `chrome.storage.local` /
  `browser.storage.local` gespeichert. Keine besuchten URLs, keine Verlaufsdaten.

## Was wird nicht erhoben?

- Keine Telemetrie, keine Analytics, keine Crash-Reports, keine Remote-Logs.
- Keine Übertragung von URLs, Domains, Formulardaten, Passwörtern oder Cookies an Dritte.
- Keine Verkaufs- oder Werbenutzung von Daten.
- Keine dauerhafte Speicherung besuchter Seiten.

## Berechtigungen

- `host_permissions` für HTTP(S): erforderlich, um Navigationen/Formularziele lokal zu prüfen.
- `storage`: lokale Einstellungen/Zähler.
- `tabs`/`webNavigation` (Chrome) bzw. `webRequest`/`webRequestBlocking` (Firefox): erforderlich
  für Schutzseite, einmalige Freigaben und Navigationsevents.
- `declarativeNetRequest` (Chrome): GET-Preflight.

## GitHub-Issues

Wenn du ein Issue eröffnest, gelten die GitHub-Datenschutzbestimmungen. Bitte keine echten
Zugangsdaten, keine aktiven Phishing-URLs, keine personenbezogenen Daten posten. Nutze
reservierte Domains wie `example.test` oder neutralisierte Schreibweisen (`paypa1[.]example`).

## Kontakt

Datenschutz-/Security-Anfragen: GitHub Security Advisories des Repositories (siehe [`SECURITY.md`](SECURITY.md)).
Es gibt keinen separaten Telemetrie-Endpunkt und keine Datenverarbeitung außerhalb deines Browsers.
