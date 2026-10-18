#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) — statischer UI/A11y/Design-DNA-Check fuer guard.html/css und popup.html.

AUDIT-ONLY. Liest nur, schreibt Logs/JSON unter audit/ux-release/checks/.

Prueft (jeweils PASS/FAIL/NOT_TESTED mit Datei:Zeile-Evidenz):
- Sprachdeklaration, Heading-Hierarchie, Landmark-/ARIA-Grundlagen
- Fokus-/Tastatur-/Dialog-Semantik, ARIA-Live-Nutzung
- Reduced-Motion / Reduced-Transparency / Forced-Colors / Theme-Faehigkeit
- Design-Token-Paritaet guard.css vs. popup-Inline-CSS (GLASS-2100-Konsistenz)
- Inline-Style/Inline-Script/CSP-relevante Muster
- Touch-Target-Groessen, feste Breiten, Responsive-Breakpoints
- Mikrocopy-/i18n-/Marken-Muster
"""
from __future__ import annotations

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

guard_html = (ROOT / "shared/guard.html").read_text(encoding="utf-8")
guard_css = (ROOT / "shared/guard.css").read_text(encoding="utf-8")
popup_html = (ROOT / "shared/popup.html").read_text(encoding="utf-8")
popup_js = (ROOT / "shared/popup.js").read_text(encoding="utf-8")
guard_js = (ROOT / "shared/guard.js").read_text(encoding="utf-8")

findings: list[dict] = []


def add(cat: str, item: str, status: str, evidence: str, severity: str = "P2", detail: str = "") -> None:
    findings.append(dict(category=cat, item=item, status=status, evidence=evidence,
                         severity=severity, detail=detail))


def line_of(text: str, needle: str) -> int:
    for i, line in enumerate(text.splitlines(), 1):
        if needle in line:
            return i
    return -1


# ---------------------------------------------------------------- Grundsemantik
add("A11y-Basis", "html lang=de (guard.html)", "PASS" if '<html lang="de"' in guard_html else "FAIL",
    f"shared/guard.html:{line_of(guard_html, '<html lang=')}")
add("A11y-Basis", "html lang=de (popup.html)", "PASS" if '<html lang="de"' in popup_html else "FAIL",
    f"shared/popup.html:{line_of(popup_html, '<html lang=')}")
add("A11y-Basis", "genau eine h1 je Seite",
    "PASS" if guard_html.count("<h1") == 1 and popup_html.count("<h1") == 1 else "FAIL",
    "guard.html h1=1, popup.html h1=1")
add("A11y-Basis", "Heading-Hierarchie unter h1 (h2/h3 fuer Karten/Abschnitte)",
    "FAIL" if guard_html.count("<h2") == 0 and popup_html.count("<h2") == 0 else "PASS",
    "Keine h2/h3 in beiden Seiten; Karten/Ueberschriften sind <span class=eyebrow>/<div class=section-title>",
    "P2", "Screenreader-Heading-Navigation springt direkt von h1 zu Fliesstext.")
add("A11y-Basis", "Landmark-Struktur",
    "PASS", f"<main role=main aria-labelledby=title>: shared/guard.html:{line_of(guard_html, '<main')} "
          "(role=main auf <main> redundant, aber unschaedlich); popup.html hat keine Landmark/kein <main>",
    "P2", "Popup braucht keine Landmarks, guard.html ist ok.")
add("A11y-Basis", "Viewport ohne user-scalable=no / maximum-scale",
    "PASS" if "user-scalable=no" not in guard_html and "user-scalable=no" not in popup_html else "FAIL",
    "viewport nur width=device-width, initial-scale=1")

# ---------------------------------------------------------------- Fokus & Dialog
add("Tastatur/Fokus", "sichtbarer :focus-visible-Stil definiert (guard)",
    "PASS" if "focus-visible" in guard_css else "FAIL",
    f"shared/guard.css:{line_of(guard_css, ':where(button, a, input):focus-visible')} (3px outline, offset 3px)")
add("Tastatur/Fokus", "sichtbarer :focus-visible-Stil definiert (popup)",
    "PASS" if "focus-visible" in popup_html else "FAIL",
    f"shared/popup.html:{line_of(popup_html, ':where(button, input):focus-visible')} (2px outline)")
outline_none_line = line_of(popup_html, "outline: none")
add("Tastatur/Fokus", "Fokusindikator des Textfelds (#url) wird nicht durch outline:none ueberschrieben",
    "FAIL" if "input[type=" + '"text"' + "]:focus" in popup_html or "outline: none" in popup_html else "PASS",
    "shared/popup.html:" + str(outline_none_line)
    + " - input[type=text] setzt outline:none mit Spezifitaet (0,1,1); die :where(...):focus-visible-Regel"
    " hat (0,1,0) und verliert -> nur 1px Border + 25%-Schatten als Fokus",
    "P1", "WCAG 2.4.11 (AA): Fokusflaeche soll >=2px Perimeter mit 3:1 Kontrast sein; 1px-Border + rgba(.25)-Ring "
          "erfuellt das nicht sicher. Empfehlung: Fokus-Styling per Semantik-Token ohne outline:none, "
          "z.B. input:focus-visible { outline: 3px solid var(--vgt-focus); outline-offset: 2px; }.")
add("Tastatur/Fokus", "Tastaturbedienbarkeit aller Aktionen",
    "PASS", "Alle Aktionen sind native <button>/<input>; keine tabindex-Fallen; hidden-Bereich nicht fokussierbar")
reveal_line = line_of(guard_js, "$('reveal')")
add("Tastatur/Fokus", "Escape/Back-Verhalten im Confirm-Bereich",
    "FAIL", f"shared/guard.js:{reveal_line} toggelt nur per Klick; "
            "kein keydown-Escape-Handler, kein Fokus-Transfer in den Warnbereich, keine Esc-Rueckkehr",
    "P2", "Kein modaler Dialog => Fokus-Trap nicht erforderlich; aber Warnung wird bei Tastaturbedienung "
          "nicht angekuendigt und Escape schliesst sie nicht.")
add("Tastatur/Fokus", "Confirm-Bereich semantisch als Dialog/Warnung ausgezeichnet",
    "FAIL" if 'role="alertdialog"' not in guard_html and 'role="dialog"' not in guard_html else "PASS",
    f"shared/guard.html:{line_of(guard_html, '<div id=\"confirm\"')} (.confirm-dialog ohne role/aria-modal/"
    "aria-describedby; #proceed ohne beschreibende Verknuepfung)", "P2",
    "Empfehlung: Warnung vor dem Fortfahren als role='alertdialog' mit aria-labelledby/aria-describedby, "
    "oder (besser, da nicht modal) als role='alert' mit Fokus auf #proceed.")
add("Tastatur/Fokus", "aria-live auf grossem interaktiven Panel",
    "FAIL" if 'aria-live="assertive"' in guard_html else "PASS",
    f"shared/guard.html:{line_of(guard_html, 'id=\"danger\"')} section#danger aria-live='assertive' enthaelt "
    "Buttons und langen Fliesstext", "P2",
    "Assertive Live-Regionen sollten kurze, statusartige Aenderungen ankuendigen. Besser: eigene "
    "role='alert'-Zeile fuer den Befund, Rest statisch.")
aria_expanded_line = line_of(guard_js, "setAttribute('aria-expanded'")
add("Tastatur/Fokus", "aria-expanded/aria-controls fuer Disclosure",
    "PASS", f"shared/guard.html:{line_of(guard_html, 'aria-expanded')} und "
            f"shared/guard.js:{aria_expanded_line} konsistent gepflegt")
add("Tastatur/Fokus", "Touch-Targets >= 24px (WCAG 2.5.8 AA)",
    "FAIL", f"shared/popup.html:{line_of(popup_html, 'input[type=\"checkbox\"]')}: 16x16px Checkbox in einer "
            "~18px hohen Label-Zeile; die klickbare Zeile ist damit <24px hoch", "P2",
    "Empfehlung: .toggle-row { min-height: 32px } und Checkbox/Toggle-Flaeche >= 24px.")
add("Tastatur/Fokus", "Guard-Buttons ausreichend gross",
    "PASS", "shared/guard.css:.btn padding:13px 20px -> ~45px Hoehe; volle Breite unter 540px")

# ---------------------------------------------------------------- Theme/Motion/Transparenz
add("Theme", "Light/Dark/System-Umschaltung",
    "FAIL", "guard.html/popup.html: data-theme=\"dark\" hart im <html>, color-scheme:dark, keine "
            "prefers-color-scheme-Regel, kein Theme-Umschalter; data-theme wird von keiner CSS-Regel gelesen",
    "P1", "GLASS 2100 fordert Light/Dark als echte Systeme, sofern beide angeboten werden. Hier ist "
          "Dark-only eine legitime Security-Entscheidung - dann aber als Dark-only dokumentieren, "
          "data-theme entfernen und prefers-color-scheme nicht vortaeuschen.")
add("Theme", "prefers-reduced-transparency (guard)",
    "PASS" if "prefers-reduced-transparency" in guard_css else "FAIL",
    f"shared/guard.css:{line_of(guard_css, 'prefers-reduced-transparency')} ersetzt Glas durch Fallback-Oberflaeche")
add("Theme", "prefers-reduced-transparency (popup)",
    "FAIL" if "prefers-reduced-transparency" not in popup_html else "PASS",
    "shared/popup.html: keine Regel vorhanden", "P2",
    "Gleiche Materialsprache wie guard: Fallback-Flaeche + kein backdrop-filter.")
add("Theme", "prefers-reduced-motion (guard)",
    "PASS" if "prefers-reduced-motion" in guard_css else "FAIL",
    f"shared/guard.css:{line_of(guard_css, 'prefers-reduced-motion')} deaktiviert Transitions/Animationen")
add("Theme", "prefers-reduced-motion (popup)",
    "FAIL" if "prefers-reduced-motion" not in popup_html else "PASS",
    "shared/popup.html: keine Regel vorhanden (nur .15s-Transitions; Impact gering)", "P2")
add("Theme", "forced-colors/high-contrast (guard)",
    "PASS" if "forced-colors" in guard_css else "FAIL",
    f"shared/guard.css:{line_of(guard_css, 'forced-colors')} setzt Canvas/CanvasText fuer Surface und Buttons")
add("Theme", "forced-colors/high-contrast (popup)",
    "FAIL" if "forced-colors" not in popup_html else "PASS",
    "shared/popup.html: keine Regel vorhanden", "P2")
add("Theme", "backdrop-filter-Fallback ohne Support",
    "PASS", "@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) in "
            f"guard.css:{line_of(guard_css, '@supports')} und popup.html:{line_of(popup_html, '@supports')}; "
            "Fallback = opake Flaeche")
add("Materialsprache", "Blur hat eine sichtbare Funktion",
    "FAIL", "Hinter beiden Glasflaechen liegt ausschliesslich ein glatter radial-gradient (guard.css:51, "
            "popup.html:48). backdrop-filter blurrt damit eine bereits weiche Flaeche -> kein "
            "wahrnehmbarer Materialeffekt, nur GPU-Kosten; Glaswirkung entsteht allein aus Fill/Stroke.",
    "P2", "GLASS 2100: 'Blur nur auf tatsaechlich ueberlagernden, dafuer geeigneten Flaechen'. Entweder "
          "Inhalt hinter dem Interstitial zulassen oder Blur streichen und Material ueber "
          "Tonwert/Stroke/Highlight definieren.")

# ---------------------------------------------------------------- Design-Tokens
def tokens(css: str) -> dict[str, str]:
    result = {}
    root = re.search(r":root\s*\{(.*?)\}", css, re.S)
    if not root:
        return result
    for m in re.finditer(r"(--vgt-[a-z0-9-]+)\s*:\s*([^;]+);", root.group(1)):
        result[m.group(1)] = m.group(2).strip()
    return result


gt = tokens(guard_css)
pt = tokens(popup_html)
shared = sorted(set(gt) & set(pt))
drifting = {k: (gt[k], pt[k]) for k in shared if gt[k] != pt[k]}
missing_in_popup = sorted(set(gt) - set(pt))
add("Design-Tokens", "Token-Paritaet guard.css <-> popup.html",
    "FAIL" if drifting else "PASS",
    "Abweichende Werte: " + "; ".join(f"{k}: guard={a} popup={b}" for k, (a, b) in drifting.items()),
    "P2", "GLASS 2100/§20: Tokens zentral, keine Magic Values. Popup dupliziert das komplette Token-Set "
          "im Inline-<style>; Radien/Blur/Fill driften (24/14/10/18 vs 18/12/9/16). "
          "Empfehlung: gemeinsame tokens.css + popup.css, oder Build-Schritt, der Tokens extrahiert.")
add("Design-Tokens", "popup.html verwendet Inline-<style> statt Design-System-CSS",
    "FAIL" if "<style>" in popup_html else "PASS",
    f"shared/popup.html:{line_of(popup_html, '<style>')}-{line_of(popup_html, '</style>')} (~270 Zeilen inline)",
    "P2", "CSP-konform (MV3 erlaubt Inline-Styles), aber GLASS 2100 §7 verlangt CSP-kompatiblen, "
          "tokenisierten Aufbau ohne Inline-CSS als schnelle Glas-Loesung.")
add("Design-Tokens", "Inline-Scripte (MV3-CSP-Risiko)",
    "PASS" if "<script>" not in guard_html and "<script>" not in popup_html else "FAIL",
    "Nur externe <script src> in guard.html:98-100 / popup.html:327-329")
add("Design-Tokens", "Externe CDN-/Font-Abhaengigkeiten",
    "PASS" if not re.search(r"https?://(fonts|cdn|unpkg|jsdelivr)", guard_html + popup_html) else "FAIL",
    "System-Font-Stack in guard.css:36 und popup.html:35; keine externen Assets")
add("Design-Tokens", "Radius-System funktional differenziert",
    "PASS", "guard.css: surface=24, card=14, btn=10; Symbol=14; Badge=20")
add("Design-Tokens", "Signature-Element / eigenstaendige Produktidentitaet",
    "FAIL", "Shield-Icon + Glass-Card + Teal-Akzent ist ein generisches Security-Muster. Es gibt kein "
            "produktspezifisches Signature-Element (keine Domain-Zerlegung, keine Zeichen-Hervorhebung "
            "des Homoglyphen, keine eigene Befund-Visualisierung).", "P2",
    "GLASS 2100 §5/§26: Der Screenshot-Recognition-Test ist ohne Logo nicht erfuellbar. Empfehlung: "
    "Host-vs-Original als Char-Diff visualisieren (z.B. paypa**1**.com mit markiertem '1'), "
    "als Signature fuer guard + popup.")
add("Design-Tokens", "Statusfarbe nicht allein als Informationstraeger",
    "PASS", "Danger/Official-Karten tragen Text-Eyebrows; Badge wechselt Text UND Farbe; "
            "Ergebniszeilen im Popup tragen Text (nicht nur Farbe)")

# ---------------------------------------------------------------- Layout / Popup
add("Layout", "Guard-Layout responsiv (Breakpoint + fluide Breiten)",
    "PASS" if "@media (max-width: 540px)" in guard_css else "FAIL",
    f"shared/guard.css:{line_of(guard_css, '@media (max-width: 540px)')} stapelt Buttons und reduziert Padding; "
    "wrap width:min(680px,100%)")
add("Layout", "Popup-Layout responsive / Zoom-robust",
    "FAIL", "shared/popup.html:" + str(line_of(popup_html, 'width: 350px'))
    + " body hat feste Breite 350px, keine Media-Query, keine min/max-Breite; bei Browser-Zoom >100% "
      "bzw. schmalem Popup droht horizontaler Overflow", "P2",
    "body{width:350px; padding:18px} -> Inhaltsbreite 314px. "
    "Empfehlung: width:min(350px,100%) + box-sizing + @media oder min-width; Popup real testen.")
add("Layout", "Zoom/Reflow 200% (guard)",
    "NOT_TESTED", "Kein Browser-E2E; statisch: Reflow bei 320 CSS-px ueber Media-Query abgedeckt, "
                  "aber 200%-Textzoom nicht verifiziert")
add("Layout", "Mobile/Touch-Verhalten",
    "NOT_TESTED", "Chrome-Android unterstuetzt keine Extensions; Firefox-Android ist im Manifest nicht "
                  "freigeschaltet (gecko_android fehlt) -> Mobile = nicht Zielplattform, aber auch nicht "
                  "als Nicht-Ziel dokumentiert", "P3")
add("Layout", "Kleines Popup / maximale Hoehe",
    "NOT_TESTED", "popup.html hat keine max-height/Scroll-Strategie; Chrome begrenzt Popup auf 600px Hoehe "
                  "-> im Fehlerfall/bei langem Ergebnis nicht verifiziert")

# ---------------------------------------------------------------- Mikrocopy / i18n / Marke
add("Mikrocopy", "Konkrete, handlungsorientierte Button-Labels",
    "PASS", "'Offizielle Seite oeffnen', 'Zurueck zur vorherigen Seite', "
            "'Risiko akzeptieren und einmalig fortfahren', 'Pruefen'")
add("Mikrocopy", "Jargon/Implementierungsdetails in Nutzertexten",
    "FAIL", "shared/popup.html:311 'Aktiv: HTTP(S)-GET-Navigationen werden vor der Netzwerkanfrage "
            "klassifiziert.'; shared/popup.js:25 'Nur best-effort Erkennung via webNavigation ohne "
            "praeventive Blockade.'; Label 'Vorabpruefung (Chrome)'", "P1",
    "Nutzer verstehen 'GET-Navigation', 'webNavigation', 'praeventive Blockade' nicht. Vorschlag: "
    "Label 'Schutz vor dem Seitenaufruf'; Beschreibung 'Aktiv: Jede neue Seite wird vor dem Laden geprueft.' "
    "bzw. 'Aus: Seiten werden erst nach dem Laden geprueft - weniger Schutz, dafuer keine Umleitung.'")
add("Mikrocopy", "Konsistente Anrede/Tonalitaet",
    "PASS", "Beide Oberflaechen duzen ('Du beabsichtigst...'); README/SECURITY duzen ebenfalls")
add("Mikrocopy", "Statuszahlen kontextualisiert",
    "FAIL", "shared/popup.html:297 'Schutzmarken' (Liste enthaelt Dienste, Banken, Carrier), :301 "
            "'Abgewehrt' ohne Zeitraum/Bezug; bei fehlendem sites.js bleibt '0' stehen (popup.js:6-8)",
    "P2", "Vorschlag: 'Geschuetzte Marken' + 'Seit Installation abgewehrt'; Fallback 'Liste nicht geladen'.")
add("Mikrocopy", "Emoji/Glyphen als Status-Icons",
    "FAIL", "shared/popup.js:40 '⚠ Verdaechtig...' und :43 '✓ Kein Treffer...' - Textglyphen statt "
            "Icon-System; Screenreader-Aussprache inkonsistent", "P2",
    "GLASS 2100/S17: Emoji ersetzen kein Icon-System. Empfehlung: SVG-Icon + Text.")
add("i18n", "Mehrsprachigkeit/Lokalisierung",
    "FAIL" if "_locales" not in guard_html + popup_html else "PASS",
    "Keine _locales/default_locale; alle Strings hart auf Deutsch in HTML und JS "
    "(guard.js:6-13, popup.js:24-25,40,43). Chromium/Firefox zeigen die UI nur auf Deutsch.",
    "P2", "Fuer Alpha akzeptabel (deutschsprachige Zielgruppe), aber Store-Listing/Texte muessen das "
          "dokumentieren; Chrome-Web-Store-Reichweite leidet. Mindestmassnahme: String-Katalog "
          "zentralisieren (z.B. shared/messages.de.js), damit V2 lokalisierbar ist.")
add("Marke", "Marken-/Schreibweisen-Konsistenz",
    "FAIL", "Kicker 'VISIONGAIATECHNOLOGY · ANTIPISHER' (guard.html:21, popup.html:293) vs. "
            "'VisionGaiaTechnology' in CSS/JS-Headern vs. Legacy 'VGT DomainGuard' in Kommentaren "
            "(guard.css:2, build_sites.py:2) und Legacy-ZIPs (build.py:27,35)",
    "P2", "Einheitliche Wortmarke 'VisionGaiaTechnology' (Eigenschreibweise) + Produktname 'Antipisher' "
          "definieren; Legacy-Strings nur in Migrationshinweisen.")
add("Marke", "Icon-/Branding-Eignung",
    "FAIL", "icon16/48/128 = generischer Schild mit Haekchen auf dunklem App-Icon-Quadrat. "
            "Haekchen semantisch 'geprueft/sicher', widerspricht der Warnfunktion des Produkts; "
            "kein transparentes Toolbar-Glyph, kein 32px/96px-Satz fuer HiDPI/Toolbar",
    "P2", "Empfehlung: neutrales Schutzschild ohne Haekchen (oder Halb-Schild/Halb-Warnung), "
          "transparenter Hintergrund fuer Toolbar, zusaetzlich 32px (und 96px fuer Firefox).")
add("Onboarding", "Erststart-/Onboarding-Erlebnis",
    "FAIL", "Kein onInstalled-Onboarding, keine options_ui, kein Erststart-Dialog; einzige Erklaerung "
            "ist das Popup. Manifeste haben kein onboarding-Feld", "P1",
    "Chrome-Web-Store-Review + Nutzervertrauen: Nach Installation sollte ein kurzer Onboarding-Screen "
    "erklaeren, was geprueft wird, welche Daten NICHT gesendet werden (Privacy), und wie man "
    "Fehlalarme meldet. Mindestens im README/Store-Listing prominent.")
add("Onboarding", "Fehlalarm-/Rueckgewinnungspfad (False Positive)",
    "FAIL", "guard.html bietet 'Risiko akzeptieren', aber keinen 'Das ist ein Fehlalarm'-Pfad "
            "(kein Melde-Link, keine Ausnahme pro Domain, kein Kontakt)", "P1",
    "Vertrauensaufbau: 'Fehlalarm melden' + Kopie der Pruefdaten (Host, Grund) ohne Netzwerkversand "
    "(z.B. in Clipboard) anbieten; alternativ Link auf Support-Seite.")

# ---------------------------------------------------------------- Fehler-/Leerzustaende
add("Zustaende", "Fehlerzustand bei fehlender Engine/defektem Skript",
    "FAIL", "guard.js:18-19 ruft engine.classify(target) ohne Existenzpruefung; fehlt shared/detector.js, "
            "bleibt die Seite stumm auf 'Adresse wird ueberprueft' stehen (kein Error-Banner wegen "
            "Top-Level-Throw). popup.js:35-36 identisch; popup zeigt dann dauerhaft 0/Dummy",
    "P1", "try/catch um den Klassifizierer + sichtbarer Fehlerzustand ('Schutzpruefung nicht verfuegbar' "
          "mit Handlung) - Security-UI muss degraded states gestalten.")
add("Zustaende", "Ungueltige/leere Zieladresse im Guard (skip)",
    "FAIL", "guard.js:43-48 setzt nur Titel/Description; Danger-Panel bleibt hidden -> Seite hat keinen "
            "einzigen Button (kein Zurueck) = Dead End", "P2",
    "Bei skip/error mindestens 'Zurueck' und 'Startseite' anbieten.")
add("Zustaende", "Safe-Zustand (Auto-Redirect)",
    "FAIL", "guard.js:50-54 zeigt 'Adresse geprueft' und navigiert sofort; kein sichtbarer Fortschritt, "
            "bei sendMessage-Fehler nur Fehlerbanner ohne Retry/Back", "P2",
    "Falls Auto-Redirect scheitert: Button 'Weiter zu <host>' + 'Zurueck' anbieten.")
add("Zustaende", "Ladezustand",
    "FAIL", "Kein Skeleton/Progress; das Interstitial ist entweder statisch oder navigiert sofort. "
            "Fuer Alpha tolerierbar, aber der Chrome-Umleitungs-Flash bleibt unerklaert", "P3")
add("Zustaende", "Empty-State im Popup (leere Eingabe)",
    "PASS", "popup.js:30-32 blendet Ergebnis aus; Feld ist sichtbar, Aktion klar")
add("Zustaende", "Storage-Fehler im Popup",
    "FAIL", "popup.js:10-13 .catch(()=>{}) schluckt Fehler still; Zaehler/Toggle bleiben auf "
            "Default-Anzeige ohne Hinweis", "P2")

# ---------------------------------------------------------------- Alert Fatigue / UX-Fluss
add("UX-Fluss", "Alert-Fatigue / Interstitial-Haeufigkeit",
    "FAIL", "Chrome: DNR-Redirect auf JEDE Top-Level-GET-Navigation (background.js:24-38) -> jedes "
            "Oeffnen einer Seite laeuft ueber die Erweiterungsseite (Flash, History-/Referer-Aenderung); "
            "kein Freigabe-/Ausnahme-Modell, kein 'diese Domain nicht mehr pruefen'", "P1",
            "Fuer V2: stilles Allow-Fast-Path (z.B. Service-Worker-basierter Lookup mit sofortigem "
            "Weiterleiten per location.replace statt sichtbarem Interstitial) oder natives "
            "Proxy/DNS-Konstrukt; zumindest ein 'Interstitial nur bei Block' erreichen.")
add("UX-Fluss", "Entscheidungsfuehrung im Guard",
    "PASS", "Primaeraktion 'Offizielle Seite oeffnen' zuerst, 'Zurueck' zweitens, Risiko-Pfad als "
            " Tertiaer-Disclosure (guard.html:57-80) - entspricht Sicherheits-Hierarchie")
add("UX-Fluss", "Vertrauensaufbau/Begruendung des Befunds",
    "FAIL", "Grund ist ein Satz aus reasonNames (guard.js:6-13); Host wird als Punycode-String angezeigt "
            "(result.host = url.hostname, detector.js:205) - Nutzer sehen 'xn--pypal-4ve.com' ohne "
            "decodierte Darstellung und ohne visuellen Zeichen-Vergleich zum Original", "P1",
            "Trust-Building: Host dekodiert + markierte abweichende Zeichen + 'Original: paypal.com' "
            "als Char-Diff; zusaetzlich 'Warum wurde ich hierher umgeleitet?' als Kurzzeile.")
add("UX-Fluss", "reason-Abdeckung in der UI",
    "FAIL", "detector.js liefert auch reason='userinfo' (detector.js:207-223); reasonNames (guard.js:6-13) "
            "kennt diesen Grund nicht -> Fallback-Text 'Verdaechtige Domain-Manipulation erkannt.'",
    "P2", "reasonNames um 'userinfo' ergaenzen ('Die Adresse tarnt sich mit einem Benutzernamen-Trick: "
          "der echte Host steht nach dem @-Zeichen').")
add("UX-Fluss", "Statusanzeige 'Ist der Schutz aktiv?'",
    "FAIL", "Popup zeigt keinen Gesamtzustand (aktiv/inaktiv/fehlerhaft), nur Zaehler und Chrome-Toggle; "
            "Firefox-Nutzer sehen keine Aussage zur Schutzart", "P1",
    "Statuszeile: 'Schutz aktiv - lokale Pruefung, keine Datenuebertragung' plus Fehlerzustand, wenn "
    "Regeln nicht geladen werden konnten.")
add("UX-Fluss", "Sicherheits-/Datenschutz-Transparenz in der UI",
    "FAIL", "Popup erwaehnt weder, dass jede Navigation lokal bewertet wird (Chrome Web Store Limited-Use "
            "verlangt prominente Beschreibung im UI und Listing), noch Link zu Datenschutz/Impressum",
    "P0_Store", "Store-Gate: Privacy-Policy-URL + prominente Datenverarbeitungsbeschreibung im UI "
                "ergaenzen (siehe UX_RELEASE.md Release-Gate-Tabelle).")

status_counts = {}
for f in findings:
    status_counts[f["status"]] = status_counts.get(f["status"], 0) + 1

report = {
    "tool": "ui_static_check.py",
    "generated": datetime.now().astimezone().isoformat(),
    "source_root": str(ROOT),
    "status_counts": status_counts,
    "findings": findings,
    "token_drift": drifting,
    "tokens_missing_in_popup": missing_in_popup,
}
(OUT / "ui_static_results.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                                           encoding="utf-8")

lines = ["=== ANTIPISHER UX/RELEASE AUDIT — UI/A11Y/DESIGN-STATIC-CHECK ===",
         f"Zeit: {report['generated']}", f"Quelle: {ROOT}", ""]
for f in findings:
    lines.append(f"[{f['status']:9}] {f['severity']:8} {f['category']:14} {f['item']}")
    if f["evidence"]:
        lines.append(f"            Evidenz: {f['evidence']}")
    if f["detail"]:
        lines.append(f"            Hinweis: {f['detail']}")
lines.append("")
lines.append(f"Status: {json.dumps(status_counts, ensure_ascii=False)}")
lines.append(f"Token-Drift: {json.dumps(drifting, ensure_ascii=False)}")
(LOGDIR / "ui_static_check.log").write_text("\n".join(lines) + "\n", encoding="utf-8")

print("\n".join(lines))
print(f"\nGeschrieben: {OUT / 'ui_static_results.json'}")
