# Alpha-Testmatrix & Feedback (Browser-E2E durch Nutzer)

Ziel: reale Browser-E2E-Erkenntnisse sammeln, ohne Store. Bitte **keine** aktiven Phishing-URLs,
Zugangsdaten, Cookies oder personenbezogenen Daten posten. Für Tests reservierte Domains
(`example.test`) oder neutralisierte Schreibweisen (`paypa1[.]example[.]test`) verwenden.

## 1. Vor dem Test

- Antipisher-Version notieren (Popup, z. B. `0.1.1`).
- Browser + Version + OS notieren.
- In Chrome: Extension über `chrome://extensions` geladen? In Firefox: über `about:debugging`?
- Konsole öffnen (F12) und auf Fehler achten; keine sensiblen Daten kopieren.

## 2. Testmatrix

| # | Szenario | Vorgehen | Erwartung |
|---|---|---|---|
| 1 | Harmlose Seite | `https://example.com` öffnen | Kein Interstitial, Seite lädt normal |
| 2 | Offizielle Marke | `https://www.paypal.com`, `https://www.sparkasse.de` | Kein Interstitial |
| 3 | Klassischer Tippfehler | `https://paypa1.com` (nur Testdomains!) | Guard-Warnseite „Möglicher Domain-Betrug abgewehrt“ |
| 4 | Homoglyph | `https://pаypal.com` (Kyrillisch) | Block-Warnseite |
| 5 | Bait-Kombination | `https://paypal-rechnung.com` | Block-Warnseite |
| 6 | Unklare ccTLD | z. B. `https://paypal.de` | **Warnstufe** „Domain nicht eindeutig verifizierbar“, Fortfahren möglich |
| 7 | Offizielle Regionaldomain | `https://www.google.co.jp` | Kein Interstitial |
| 8 | Popup-Testfeld | `paypa1.com` eintippen → Prüfen | Verdächtig-Hinweis im Popup |
| 9 | Guard-Aktionen | Offizielle Seite öffnen / Zurück / „Trotzdem fortfahren“ | Keine Sackgasse; „Zurück“ führt zurück |
| 10 | Fragment-URL | `https://example.com/#/route` (sofern Testseite) | Seite lädt; Fragmentverlust notieren (bekannte Grenze) |
| 11 | Lange URL | Test-URL > 1.900 Zeichen | Kein „Adresse zu lang“-Fehler mehr (Fix 0.1.1) |
| 12 | POST/Formular (optional) | Formular auf einer **eigenen** Testseite | Shield-Warnung; `form.submit()`-Bypass ist bekannte Grenze |
| 13 | Neustart | Browser neu starten (Firefox: temporäres Add-on neu laden) | Status/Popup korrekt, keine Dauerfreigaben |
| 14 | Offline | Netzwerk trennen, lokale Testseite öffnen | Keine Netzwerkfehler, lokale Prüfung funktioniert |

## 3. Falsch-positiv / Falsch-negativ melden

Nutze das GitHub-Issue-Template **„Falsch-positiv / Falsch-negativ“**. Pflichtangaben:

- Art (FP/FN/Warnstufe falsch), Domain neutralisiert, erwartetes + tatsächliches Ergebnis,
- Antipisher-Version, Browser/OS, ggf. angezeigter Grund/Badge,
- Screenshot (ohne sensible Daten).

Keine echten Zugangsdaten, keine aktiven Phishing-Seiten, keine fremden personenbezogenen Daten.

## 4. Bekannte Grenzen (nicht als Bug melden, aber gern als Verbesserung)

- POST-Schutz ist best effort: `form.submit()`, iframes, `fetch`/XHR, Overlay-Manipulation.
- Chrome-Redirect-All kann OAuth-/Fragment-/History-Verhalten beeinflussen.
- Offizielle Domaindaten sind unvollständig; Rest-FPs/FNs sind dokumentiert.
- Kein Light-Theme (bewusst), keine Store-/Rechtsprüfung, keine signierten Updates.
- Performance: p95 kann > 1 ms liegen.

## 5. Was uns besonders hilft

- Reale FP/FN mit Domain, Browser, Version.
- Reproduzierbare Schritte + Screenshot.
- Angabe, ob Chrome oder Firefox, und ob `about:debugging`/unpacked.
- Vergleich: Verhalten mit/ohne Extension (nur wenn sicher).
