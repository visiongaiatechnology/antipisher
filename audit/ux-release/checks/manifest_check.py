#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) â€” Release-Gate-Check Chrome MV3 / Firefox MV3 + Store-Readiness.

AUDIT-ONLY. Prueft die Manifeste, die Build-Artefakte (nur lesend) und die
Release-Assets gegen offizielle Doku (Quellen als URL im Ergebnis hinterlegt).

Wichtig: Es findet KEIN echter Browser-E2E-Test statt. Runtime-Verhalten wird
nur gegen dokumentierte API-Erwartungen geprueft (NOT_TESTED, wo nicht beweisbar).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
LOGDIR = OUT / "logs"
LOGDIR.mkdir(parents=True, exist_ok=True)

CHROME = json.loads((ROOT / "chrome/manifest.json").read_text(encoding="utf-8"))
FIREFOX = json.loads((ROOT / "firefox/manifest.json").read_text(encoding="utf-8"))
README = (ROOT / "README.md").read_text(encoding="utf-8")
NEXT = (ROOT / "Next.md").read_text(encoding="utf-8")
SECURITY = (ROOT / "SECURITY.md").read_text(encoding="utf-8")
chrome_bg = (ROOT / "chrome/background.js").read_text(encoding="utf-8")
ff_bg = (ROOT / "firefox/background.js").read_text(encoding="utf-8")

SRC = {
    "chrome_mv3_dnr": "https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest",
    "chrome_war": "https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources",
    "cws_policies": "https://developer.chrome.com/docs/webstore/program-policies/policies",
    "cws_listing": "https://developer.chrome.com/docs/webstore/program-policies/policies#listing-requirements",
    "cws_mv3": "https://developer.chrome.com/docs/webstore/program-policies/policies#additional-requirements-for-manifest-v3",
    "mdn_onbeforerequest": "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest",
    "mdn_bss": "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings",
    "mdn_background": "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background",
    "mdn_permissions": "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions",
    "amo_policies": "https://extensionworkshop.com/documentation/publish/add-on-policies/",
    "amo_signing": "https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/",
}

findings: list[dict] = []


def add(gate: str, item: str, status: str, evidence: str, severity: str = "P1",
        source: str = "", detail: str = "") -> None:
    findings.append(dict(gate=gate, item=item, status=status, severity=severity,
                         evidence=evidence, source=source, detail=detail))


def file_sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16] if p.exists() else "MISSING"


# ---------------------------------------------------------------- Chrome MV3
add("Chrome-MV3", "manifest_version == 3", "PASS" if CHROME.get("manifest_version") == 3 else "FAIL",
    "chrome/manifest.json:2", source=SRC["cws_mv3"])
add("Chrome-MV3", "version-Format (1-4 Punkt-Zahlen, CWS-konform)",
    "PASS" if re.fullmatch(r"\d+(\.\d+){0,3}", str(CHROME.get("version"))) else "FAIL",
    f"chrome/manifest.json version={CHROME.get('version')!r}; version_name={CHROME.get('version_name')!r}")
add("Chrome-MV3", "background.service_worker vorhanden",
    "PASS" if "service_worker" in CHROME.get("background", {}) else "FAIL",
    f"chrome/manifest.json:19-21 -> {CHROME.get('background')}")
add("Chrome-MV3", "WAR fuer DNR-Redirect-Ziel guard.html deklariert",
    "PASS" if any("guard.html" in r.get("resources", []) for r in CHROME.get("web_accessible_resources", []))
    else "FAIL", "chrome/manifest.json:31-41", source=SRC["chrome_mv3_dnr"],
    detail="DNR: 'A declarativeNetRequest rule cannot redirect from a public resource request to a "
           "resource that is not web accessible.' -> WAR ist technisch erforderlich.")
add("Chrome-MV3", "WAR-Fingerprinting-Restrisiko (alle http/https-Origins)",
    "FAIL", f"chrome/manifest.json:36-39 matches=['http://*/*','https://*/*'] fuer guard.html; "
            f"Datei-Hash {file_sha(ROOT / 'chrome/guard.html')}", severity="P2", source=SRC["chrome_war"],
    detail="Chrome-Doku: 'By default no resources are web accessible, as this allows a malicious website "
           "to fingerprint extensions that a user has installed'. Da der DNR-Redirect WAR verlangt, ist "
           "das Vektor-Restrisiko nicht 'geschlossen' (Widerspruch zu README:15 / Next.md:28). "
           "Minderung: `use_dynamic_url` pruefen (mit DNR-Redirect vereinbar?), generische guard-Seite ohne "
           "produktspezifische Strings, oder dokumentiertes Restrisiko.")
add("Chrome-MV3", "DNR-Preflight: GET-only, main_frame (POST-Schutz)",
    "PASS" if "requestMethods: ['get']" in chrome_bg and "resourceTypes: ['main_frame']" in chrome_bg else "FAIL",
    "chrome/background.js:27-39", source=SRC["chrome_mv3_dnr"],
    detail="Redirect wirkt auf alle Top-Level-GETs; POST bleibt unberuehrt (README:13 / Next.md:27 bestaetigt).")
add("Chrome-MV3", "DNR-Redirect per regexSubstitution auf chrome-extension-URL in offizieller Doku belegt",
    "NOT_TESTED", "chrome/background.js:30-38 nutzt regexSubstitution = runtime.getURL('guard.html') + '#\\1'",
    severity="P0_RUNTIME", source=SRC["chrome_mv3_dnr"],
    detail="Offizielle Chrome-Doku zeigt fuer Extension-Ziele ausschliesslich das Muster "
           "redirect.extensionPath ('/a.jpg' -> chrome-extension://ID/a.jpg); regexSubstitution wird nur "
           "mit http(s)-Ziel gezeigt. Ob Scheme-Wechsel + Fragmentuebergabe an eine WAR-Seite in Chrome "
           "tatsaechlich funktioniert, ist ohne Browser-E2E nicht belegt => vor Store-Submission in realem "
           "Chrome verifizieren (Test: DNR-Redirect -> guard.html#<url>).")
add("Chrome-MV3", "Host-Permissions nur so weit noetig",
    "REVIEW", "chrome/manifest.json:15-18 host_permissions=['http://*/*','https://*/*']",
    severity="P1", source=SRC["cws_policies"],
    detail="CWS 'Use of Permissions': narrowest necessary. Redirect-Action braucht Host-Permissions "
           "(declarativeNetRequest gibt implizit nur allow/allowAllRequests/block), daher funktional "
           "begruendbar - aber Begruendung im Developer Dashboard + Privacy-Policy sind Pflicht.")
add("Chrome-MV3", "'tabs'-Permission begruendbar minimiert",
    "REVIEW", "chrome/manifest.json:9-14 permissions=[storage,tabs,webNavigation,declarativeNetRequest]",
    severity="P2", source=SRC["mdn_permissions"],
    detail="Chrome zeigt fuer 'tabs' den Warnhinweis 'Read your browsing history'. tabs.getCurrent braucht "
           "die Permission nicht; fuer tab.url der eigenen guard-Seite koennte sender.tab ausreichen. "
           "Pruefen und ggf. entfernen, um Install-Warnungen und Review-Risiko zu reduzieren.")
add("Chrome-MV3", "Kein Remote-Code / kein eval",
    "PASS" if not re.search(r"\beval\s*\(|new Function|import\(\s*['\"]https?:", chrome_bg + (ROOT / "shared/detector.js").read_text(encoding="utf-8"))
    else "FAIL", "importScripts nur lokal (chrome/background.js:5); kein eval/Function/Remote-Import",
    source=SRC["cws_mv3"])
add("Chrome-MV3", "Inhaltliche Single-Purpose-Pruefung moeglich",
    "PASS", "Ein Zweck: lokale Phishing-/Homograph-/Typosquat-Erkennung + Warnseite",
    source=SRC["cws_policies"])
add("Chrome-MV3", "CWS-Policy 'Misleading or Unexpected Behavior' (Redirect aller GET-Navigationen)",
    "REVIEW", "chrome/background.js:24-40: jede Top-Level-GET-Navigation wird auf die Erweiterungsseite "
              "umgeleitet (auch unverdaechtige Seiten), bevor sie ihr Ziel erreicht.",
    severity="P1", source=SRC["cws_policies"],
    detail="CWS Quality Guidelines: 'Extensions ... should actively enhance the user's current task while "
           "causing minimal distractions.' Das Vorab-Interstitial fuer JEDE Seite ist das groesste "
           "Store-Review-Risiko; README:45 nennt es selbst 'Technik-Prototyp'. Fuer eine Einreichung "
           "empfohlen: Default = nur bei Block warnen (webNavigation + DNR-block), optionaler "
           "'Strenger Modus' mit explizitem Consent + Onboarding.")
add("Chrome-MV3", "Privacy-Policy vorhanden (CWS-Pflicht bei User-Data)",
    "FAIL", "Kein PRIVACY.md/keine URL, keine homepage_url im Manifest, kein Developer-Dashboard-Feld; "
            "README:47-53 ersetzt keine gehostete Policy.", severity="P0_Store",
    source=SRC["cws_policies"],
    detail="CWS: 'If your Product handles any user data, then you must post an accurate and up to date "
           "privacy policy ... accessible by providing a link in the designated Chrome Web Store Developer "
           "Dashboard field.' Die Extension liest jede Navigations-URL -> Browsing-Aktivitaet.")
add("Chrome-MV3", "Limited-Use-Disclosure von Browsing-Aktivitaet in UI/Listing",
    "FAIL", "Weder Popup noch Guard-Seite beschreiben, dass jede Navigation lokal bewertet wird; keine "
            "Affirmative-Limited-Use-Aussage/Website.", severity="P0_Store", source=SRC["cws_policies"],
    detail="CWS Limited Use: 'Collection and use of web browsing activity is prohibited, except to the "
           "extent required for a user-facing feature described prominently in the Product's Chrome Web "
           "Store page and in the Product's user interface.'")
add("Chrome-MV3", "Store-Listing-Assets (Screenshots 1280x800, Icons 128, Promo 440x280, Kategorie, "
                  "Support-Kontakt, Beschreibung)",
    "FAIL", "Keine screenshots/, keine promo/, keine store-listing.md, kein Support-Kontakt in README/SECURITY; "
            "manifest.json enthaelt keine homepage_url/author.", severity="P0_Store",
    source=SRC["cws_listing"],
    detail="CWS: 'If your product has a blank description field or is missing an icon or screenshots, it "
           "will be rejected.' Screenshots sind im Repo komplett absent.")
add("Chrome-MV3", "Manifest-Metadaten fuer Listing (homepage_url/author/support)",
    "FAIL" if "homepage_url" not in CHROME else "PASS", "chrome/manifest.json: keine homepage_url/author",
    severity="P2", source=SRC["cws_policies"])

# ---------------------------------------------------------------- Firefox MV3
add("Firefox-MV3", "manifest_version == 3", "PASS" if FIREFOX.get("manifest_version") == 3 else "FAIL",
    "firefox/manifest.json:2")
add("Firefox-MV3", "background.scripts (Firefox unterstuetzt kein service_worker)",
    "PASS" if "scripts" in FIREFOX.get("background", {}) and "service_worker" not in FIREFOX.get("background", {})
    else "FAIL", f"firefox/manifest.json:18-23 -> {FIREFOX.get('background')}", source=SRC["mdn_background"],
    detail="MDN: Firefox unterstuetzt background.service_worker nicht, aber background.scripts.")
add("Firefox-MV3", "gecko.id vorhanden (Pflicht fuer MV3-Signierung)",
    "PASS" if "id" in FIREFOX.get("browser_specific_settings", {}).get("gecko", {}) else "FAIL",
    f"firefox/manifest.json:35 -> {FIREFOX.get('browser_specific_settings', {}).get('gecko', {}).get('id')!r}",
    source=SRC["mdn_bss"])
add("Firefox-MV3", "gecko.id Format + Domain-Eignung",
    "REVIEW", "id='antipisher@visiongaia.example' matcht das erlaubte E-Mail-Format, nutzt aber die "
              "reservierte TLD .example (RFC 2606) - keine erreichbare Domain, keine Kontrolle ueber die "
              "Identitaet; AMO prueft nur Eindeutigkeit.", severity="P2", source=SRC["mdn_bss"],
    detail="AMO-IDs sind dauerhaft. Empfehlung: echte, kontrollierte Domain (z.B. "
           "antipisher@visiongaiatechnology.<tld>) vor der ersten Einreichung festlegen.")
add("Firefox-MV3", "browser_specific_settings.gecko.data_collection_permissions deklariert",
    "FAIL" if "data_collection_permissions" not in FIREFOX.get("browser_specific_settings", {}).get("gecko", {})
    else "PASS", "firefox/manifest.json:33-38: Schluessel fehlt", severity="P0_Store", source=SRC["mdn_bss"],
    detail="MDN: 'Must be provided ... for new extension submitted to addons.mozilla.org from November 3, "
           "2025.' Fuer dieses Add-on ist `required: ['none']` korrekt (keine Uebertragung/Speicherung "
           "ausserhalb der Extension), da alle Verarbeitung lokal bleibt.")
add("Firefox-MV3", "web_accessible_resources fuer Redirect auf Erweiterungsseite",
    "FAIL" if "web_accessible_resources" not in FIREFOX else "PASS",
    "firefox/manifest.json: keine web_accessible_resources; firefox/background.js:14-15 leitet "
    "main_frame-Requests auf moz-extension://.../guard.html um", severity="P0_Block", source=SRC["mdn_onbeforerequest"],
    detail="MDN onBeforeRequest: 'If an extension wants to redirect a public (e.g., HTTPS) URL to an "
           "extension page, the extension's manifest.json file must contain a web_accessible_resources "
           "key that lists the URL for the extension page.' Ohne WAR ist die Firefox-Warnseite "
           "voraussichtlich nicht erreichbar (Redirect geblockt) => Firefox-Build funktional blockiert. "
           "Vor Release in realem Firefox verifizieren; Fix: WAR-Eintrag fuer guard.html (matches "
           "http/https) ergaenzen.")
add("Firefox-MV3", "webRequestBlocking in Firefox-MV3 nutzbar",
    "PASS", "permissions=['storage','tabs','webRequest','webRequestBlocking']; MDN-BCD fuehrt "
            "webRequestBlocking fuer Firefox ohne MV3-Einschraenkung (Chrome-V3-Einschraenkung gilt nur "
            "dort).", source=SRC["mdn_permissions"])
add("Firefox-MV3", "strict_min_version gultig und aktuell",
    "PASS" if float(str(FIREFOX["browser_specific_settings"]["gecko"]["strict_min_version"]).rstrip(".0") or 0) >= 128
    else "REVIEW", "firefox/manifest.json:37 strict_min_version=128.0; MDN nennt 128.0 als aktuelles "
                   "Minimum fuer signierte Updates.", source=SRC["mdn_bss"])
add("Firefox-MV3", "Firefox-Android-Freigabe",
    "REVIEW", "browser_specific_settings.gecko_android fehlt -> MDN: 'the extension is only made available "
              "on desktop Firefox'. Mobile ist damit faktisch nicht Zielplattform, wird aber nirgends "
              "dokumentiert.", severity="P3", source=SRC["mdn_bss"])
add("Firefox-MV3", "Signiertes XPI / AMO-Submission-Artefakt",
    "FAIL", "Nur unsignierte ZIPs (billd.py:20-38); kein XPI, kein web-ext-Config/-Lint-Ergebnis, keine "
            "Signatur, keine Checksummen.", severity="P0_Store", source=SRC["amo_signing"])
add("Firefox-MV3", "AMO-Listing-Assets + Support + Privacy-Policy",
    "FAIL", "Keine AMO-Beschreibung/Screenshots/Privacy-Policy-URL/Support-Kontakt im Repo; SECURITY.md:9 "
            "verweist auf 'einen privaten Kanal' ohne Kontaktangabe.", severity="P0_Store", source=SRC["amo_policies"])
add("Firefox-MV3", "AMO 'No Surprises' / Informationspflicht",
    "REVIEW", "Firefox blockt nur verdaechtige Requests (firefox/background.js:7-16) - deutlich "
              "weniger invasiv als Chrome. Aber: keine Onboarding-Erklaerung, kein In-UI-Hinweis auf "
              "URL-Verarbeitung, keine Privacy-Policy-URL.", severity="P1", source=SRC["amo_policies"])

# ---------------------------------------------------------------- Release-Engineering / Assets
ART = ROOT.parent
zips = sorted(ART.glob("*.zip"))
add("Build/Release", "Build-Artefakte vorhanden", "PASS" if zips else "FAIL",
    "; ".join(f"{z.name} ({z.stat().st_size} B, sha256={file_sha(z)})" for z in zips) or "keine")
if len(zips) >= 6:
    pairs = {"Antipisher-Chrome-v0.1.0-alpha.zip": "VGT-DomainGuard-Chrome-v0.1.0.zip",
             "Antipisher-Firefox-v0.1.0-alpha.zip": "VGT-DomainGuard-Firefox-v0.1.0.zip",
             "Antipisher-Source-v0.1.0-alpha.zip": "VGT-DomainGuard-Source-v0.1.0.zip"}
    dup = {a: file_sha(ART / a) == file_sha(ART / b) for a, b in pairs.items()}
    add("Build/Release", "Legacy-ZIP-Duplikate",
        "FAIL" if all(dup.values()) else "REVIEW",
        "build.py:26-35 erzeugt je 3 Antipisher-ZIPs zusaetzlich identische VGT-DomainGuard-Kopien: "
        + json.dumps(dup, ensure_ascii=False), severity="P2",
        detail="Doppelte, veraltete Artefaktnamen im Release-Verzeichnis erzeugen Verwechslungs- und "
               "Signierungsrisiko. Empfehlung: Legacy-Kopien entfernen, Release-Ordner versionieren.")
add("Build/Release", "Versionsquelle / Single Source of Truth",
    "FAIL", "version steht in chrome/manifest.json:6, firefox/manifest.json:6, UI (popup.html:291 "
            "'ALPHA 0.1', guard.html:89 'Alpha 0.1'), ZIP-Namen in build.py:20,30, README:86, Next.md:9. "
            "Kein package.json/version.js/build-Envs.", severity="P1",
    detail="Drift ist vorprogrammiert; nÃ¤chstes Release erzeugt inkonsistente Stores/Artefakte. "
           "Empfehlung: version.json als Quelle, Build injiziert Manifeste + UI.")
add("Build/Release", "Reproduzierbarkeit der Builds",
    "NOT_TESTED", "Siehe checks/reproducibility.png/log: build.py normalisiert ZIP-Timestamps nicht und "
                  "der Source-ZIP-Prefix haengt vom Checkout-Ordnernamen ab.", severity="P1",
    detail="Next.md:31/48 behauptet 'Reproduzierbare Build-Artefakte'. Beweis siehe "
           "checks/reproducibility_results.json (dieser Audit fuehrt den Test aus).")
add("Build/Release", "CI/Pipeline, Lint/Test-Gate, Checksummen, SBOM",
    "FAIL", "Kein .github/workflows, kein CI-Skript, keine *.sha256, kein SBOM, keine Signierung. "
            "Tests laufen nur manuell (README:67-72).", severity="P0_Store")
add("Build/Release", "Git-Repository / Source-Identity-Baseline",
    "FAIL", "Kein .git im Workspace (Test-Path .git = False), keine Commit-/Branch-Information; "
            "Next.md:11 behauptet SOURCE_IDENTITY_CONFIRMED. Keine package.json, keine .gitignore, kein "
            "CHANGELOG.", severity="P0_Doc")
add("Build/Release", "Audit-/Build-Ausschluss (versehentliche Paketierung)",
    "REVIEW", "build.py:31-34 zippt ROOT.rglob('*') ungefiltert (nur __pycache__ ausgeschlossen) -> "
              "vorhandene audit/-Ordner, Logs, temporÃ¤re Checks landen im Source-Release-ZIP.",
    severity="P1", detail="Belegt durch checks/reproducibility_results.json (audit/ erscheint im "
                          "Source-ZIP). Empfehlung: explizite Include-Liste statt rglob.")
add("Build/Release", "Store-Pakete (CRX/XPI) / Signierung",
    "FAIL", "Keine CRX/XPI/Signaturdateien; CWS signiert beim Upload (kein CRX noetig), AMO verlangt "
            "signiertes XPI bzw. web-ext sign im Release-Prozess - beides fehlt.", severity="P0_Store")
add("Build/Release", "Changelog / Release-Notes",
    "FAIL", "Kein CHANGELOG.md; Next.md-Checkpoints 002/003 sind Arbeitsnotizen, keine Release-Notes "
            "(u.a. mit teils veralteten Testzahlen 9/9 und 12/12).", severity="P2")

# ---------------------------------------------------------------- Doku-Integritaet
arch_exists = (ROOT / "ARCHITECTURE_AND_SECURITY_REVIEW.md").exists()
add("Doku", "Referenzierte Datei ARCHITECTURE_AND_SECURITY_REVIEW.md existiert",
    "PASS" if arch_exists else "FAIL",
    "Next.md:13 und Next.md:39 referenzieren sie; im Workspace nicht vorhanden (" + str(ROOT) + ")",
    severity="P1_Doc")
add("Doku", "SOURCE_IDENTITY_CONFIRMED belastbar",
    "FAIL", "Next.md:11 'SOURCE_IDENTITY_CONFIRMED' vs. kein Git-Repo, kein Commit, kein Tag, "
            "uncommitted v0.1.0 (Next.md:53 selbst: 'v0.1.0 uncommitted')", severity="P0_Doc",
    detail="VGT-Qualitaetsmodell Gate 1 verlangt Source-Identity + Git-/Dirty-Baseline. "
           "Korrekt waere SOURCE_IDENTITY: NOT_VERIFIABLE.")
add("Doku", "Qualitaetsklassifikation 'PLATIN VGT SUPREME'",
    "FAIL", "Next.md:71; 'PLATIN VGT SUPREME' ist keine definierte Klasse des VGT-Modells "
            "(SILBER/GOLD/PLATIN/DIAMANT VGT SUPREME). Kein E2E-, Performance-, Recovery- oder "
            "Zielplattform-Beweis; README:62 und SECURITY.md:3 schliessen Zertifizierung selbst aus.",
    severity="P0_Doc")
add("Doku", "13/13 PASS behauptet",
    "PASS", "Testlauf in diesem Audit: node --test tests/*.test.cjs -> 13 tests, 13 pass, 0 fail, "
            "duration 385ms (checks/logs/tests.log). Die Zahl ist korrekt; die Zeitangabe '422 ms' "
            "(Next.md:70) ist nicht reproduzierbar (durations variieren), aber unkritisch.", severity="P2")
add("Doku", "165 Marken behauptet",
    "PASS", "shared/sites.js/VGT_SITES.length = 165; sites-100.json = 165; 257 Domains; "
            "unique brands/names = 165 (checks/logs/claims.log)")
add("Doku", "Manifest-Fingerprinting 'geschlossen'",
    "FAIL", "README:15 'um Extension-Fingerprinting ... zu verhindern' und Next.md:28 '[x] "
            "Manifest-Fingerprinting-Vektoren geschlossen' vs. WAR guard.html (chrome/manifest.json:31-41).",
    severity="P1_Doc", detail="Skripte sind korrekt nicht mehr WAR, aber guard.html muss WAR bleiben "
                              "(DNR-Redirect) und ist damit ein Fingerprint-Vektor (siehe Chrome-Doku).")
add("Doku", "100% Offline / Zero-Telemetry behauptet",
    "PASS", "Keine fetch/XHR/WebSocket/sendBeacon in Runtime-Dateien (grep). build_sites.py ebenfalls "
            "ohne Netzwerk. Keine externen Assets/Fonts.", severity="P2")
add("Doku", "Lueckenloser Subdomain-Schutz behauptet",
    "FAIL", "README:10 und Next.md:23 ('Lueckenloser Subdomain-Schutz fuer alle Marken') vs. "
            "detector.js:49 genericSubdomains (office,line,medium,zoom,notion,target) => "
            "office.attacker.com/target.attacker.com/medium.attacker.com/zoom.attacker.com werden NICHT "
            "geblockt; zudem False Positive auf apple.stackexchange.com (Beleg: checks/logs/detector_probe.log).",
    severity="P1_Doc")
add("Doku", "Versionierung '0.1.0-alpha konsistent implementiert'",
    "FAIL", "Next.md:21; String '0.1.0-alpha' existiert nur in ZIP-Namen (build.py:20,30) und Next.md, "
            "nicht in den Manifesten (0.1.0) und nicht in der UI. version_name ist Chrome-only "
            "('0.1 Alpha'); Firefox-Manifest hat keinen Alpha-Marker ausser Description.", severity="P2")
add("Doku", "Marken-/Produktname konsistent 'Antipisher'",
    "REVIEW", "README:1, Manifeste, UI = Antipisher; aber detector.js:357 Alias VGT_DomainGuard, "
              "guard.css:2/build_sites.py:2 'VGT DomainGuard', parent-Ordner + Legacy-ZIPs "
              "'VGT-DomainGuard-*', Next.md:7 'vormals VGT DomainGuard'.", severity="P2")
add("Doku", "sites-100.json vs. shared/sites.js konsistent",
    "PASS" if json.loads((ROOT / "sites-100.json").read_text(encoding="utf-8"))
    == json.loads(re.sub(r"^.*?=\s*", "", (ROOT / "shared/sites.js").read_text(encoding="utf-8").strip(),
                          flags=re.S).rstrip(";\n")) else "FAIL",
    "165 Eintraege, identische Reihenfolge/Werte in beiden Dateien")
add("Doku", "build_sites.py Docstring aktuell",
    "FAIL", "build_sites.py:3 'Generates sites-100.json and shared/sites.js with 140+ ...' vs. 165 "
            "Eintraege; Dateiname sites-100.json vs. 165 Marken.", severity="P3")
add("Doku", "README-Testbefehle funktionieren",
    "PASS", "node --check chrome/background.js, node --check firefox/background.js, "
            "python build.py (nur in Kopie ausgefuehrt, siehe reproducibility)")

# ---------------------------------------------------------------- Summary
gates = {}
for f in findings:
    gates.setdefault(f["gate"], []).append(f)
summary = {g: {"FAIL": sum(1 for x in v if x["status"] == "FAIL"),
               "REVIEW": sum(1 for x in v if x["status"] == "REVIEW"),
               "NOT_TESTED": sum(1 for x in v if x["status"] == "NOT_TESTED"),
               "PASS": sum(1 for x in v if x["status"] == "PASS")} for g, v in gates.items()}

report = {
    "tool": "manifest_check.py",
    "generated": datetime.now().astimezone().isoformat(),
    "source_root": str(ROOT),
    "official_sources": SRC,
    "summary": summary,
    "findings": findings,
}
(OUT / "release_gate_results.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                                              encoding="utf-8")

lines = ["=== ANTIPISHER UX/RELEASE AUDIT â€” RELEASE-GATE-CHECK ===",
         f"Zeit: {report['generated']}", f"Quelle: {ROOT}", ""]
for gate, items in gates.items():
    lines.append(f"--- {gate} ---")
    for f in items:
        lines.append(f"[{f['status']:9}] {f['severity']:10} {f['item']}")
        lines.append(f"            Evidenz: {f['evidence']}")
        if f["source"]:
            lines.append(f"            Quelle:  {f['source']}")
        if f["detail"]:
            lines.append(f"            Hinweis: {f['detail']}")
    lines.append("")
lines.append("Summary: " + json.dumps(summary, ensure_ascii=False, indent=1))
(LOGDIR / "manifest_check.log").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
print(f"\nGeschrieben: {OUT / 'release_gate_results.json'}")


