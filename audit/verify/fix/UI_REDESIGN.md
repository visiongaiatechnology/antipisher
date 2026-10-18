# UI-Redesign 0.1.1 — GLASS 2100 (VisionGaiaTechnology)

> **Modus:** `REDESIGN` · Skill `vgt-intelligence-master` + `vgt-ui-ux-supreme` + `GLASS_2100_DESIGN.md`  
> **Ziel:** Kein „AI-Slop“; eine einheitliche Produktmaterialität, Branding oben, ruhige Security-Console-Ästhetik.  
> **Status:** umgesetzt, visuell geprüft (Chromium 155 headless) · echter Browser-E2E `NOT_TESTED`

## 1. Design-DNA (abgeleitet aus Produktkontext)

| Dimension | Entscheidung |
|---|---|
| Produktart | Sicherheits-Interstitial + kleines Browser-Popup |
| Hauptaufgabe | In < 5 s verstehen: *Was ist passiert? Was ist sicher?* |
| Vertrauensniveau | maximal; keine Werbung, keine Deko, keine Dark Patterns |
| Emotion | ruhig, präzise, souverän — kein Alarmismus, kein Cyberpunk |
| Material | **Graphit-Glas** (dunkle Mineralfarbe, eine kontrollierte Lichtzone) |
| Farbe | **ein Primärakzent**: Emerald `#6fe3bd`; Statusfarben nur funktional (Rose/Amber) |
| Typografie | System-UI, editoriale Hierarchie, Mono nur für Domains |
| Dichte | niedrig; großzügiger Weißraum, keine Kartenwand |
| Motion | minimal (Hover/Fokus), Reduced-Motion respektiert |
| 3D | keine; Tiefe ausschließlich über Material/Glass |

**Ein-Satz-Designziel:** *Es fühlt sich an wie ein Präzisionsinstrument aus einem Schweizer Sicherheitslabor: stilles Graphitglas, ein Emerald-Signal, perfekt gesetzte Typografie.*

## 2. Verbindliche Design-Tokens (`shared/design-tokens.css`)

- **Environment:** `#070c0b → #0a1210 → #070b0a`, zwei weiche Lichtfelder (Emerald kühl, Graphit) — **keine Grids, Punkte oder Muster**.
- **Text:** `#f2f7f5` / `#bfcec8` / `#93a7a1` (Kontrast ≥ 4,5:1 auf den Glasflächen).
- **Akzent:** `#6fe3bd` (+ soft/line) — einziger Markenakzent; **kein** Blau-Violett-Neon.
- **Status:** `#ef8f9d` (Gefahr), `#e4b06d` (Warnung) — ausschließlich semantisch.
- **Glas:** `linear-gradient(rgba(23,36,32,.80), rgba(12,20,18,.74))`, `backdrop-filter: blur(22px) saturate(1.08)`, 1-px-Hairline, eine obere Lichtkante, weicher Schatten.
- **Radien:** 26 / 16 / 11 / 8 px; **Fokusring:** `#9cc9ff` (2 px, Offset 3).
- **Fallbacks:** Reduced Transparency → opak; Reduced Motion → keine Transition; Forced Colors → Canvas/CanvasText.
- Alle UI-Flächen (Guard, Popup, Shield) nutzen dieselben Werte — das Shield spiegelt sie inline (Shadow DOM, keine externen Assets).

## 3. Komposition & Branding

**Branding oben (Guard + Popup):**
- Markenzeichen: Schild mit „V“-Signatur (inline SVG, keine externen Assets)
- `VISIONGAIATECHNOLOGY` (10 px, 0,22 em, uppercase) + **Antipisher** (15 px) + Tag `DOMAIN TRUST`
- Status-Chip rechts, zustandsabhängig (rot/amber/grün/neutral)

**Guard:** schmale Brandbar über einer einzelnen Glasfläche. Keine verschachtelten Karten. Zustand über Eyebrow + Dot + H1; Daten als Hairline-Zeilen (Zieladresse, Befund, offizielle Domain); eine Primäraktion („Offizielle Seite öffnen“), Ghost („Zurück“), Disclosure („Risiko verstehen …“). Die Warnstufe nutzt dieselbe Struktur mit Amber-Signal statt Rot.

**Popup:** Brandbar oben, darunter eine Glasfläche mit Statuszeile (Dot, Titel, AN/AUS), zwei ruhigen Kennzahlen, Vorabprüfungs-Switch, URL-Testfeld, Inline-Ergebnis, Micro-Footer. Keine KPI-Kachelwand, keine Emojis.

**Shield-Modal:** gleiche Brandbar + Status „ANGEHALTEN“, `FORMULARÜBERTRAGUNG GESTOPPT`, Titel, Erklärung, Ziel/Marke/offizielle Domain als Hairline-Fakten, **Abbrechen als Primäraktion** (Daten bleiben erhalten), „Trotzdem senden“ als kritische Sekundäraktion. Escape + Fokus auf Abbrechen.

## 4. Umsetzung

| Datei | Änderung |
|---|---|
| `shared/design-tokens.css` | **neu**: Tokens, Environment, Glas, Brandbar, Buttons, Eyebrow/Label/Mono, Fokus, Reduced-Motion/-Transparency, Forced-Colors |
| `shared/guard.html` | neu strukturiert: Brandbar oben, eine Glasfläche, Datenzeilen statt Karten, Disclosure |
| `shared/guard.css` | Layout/States; Ambient-Lichtzone; responsive Spalten; keine Kartenwand |
| `shared/guard.js` | Zustandsmaschine `data-state` (block/warn/invalid/safe), neue Labels, Fokus/Escape |
| `shared/popup.html` | Brandbar, Statuszeile, Metriken, Switch, Testfeld, Footer; Inline-CSS entfernt |
| `shared/popup.css` | **neu**: Popup-Layout + Switch + Result-States |
| `shared/popup.js` | Status „aktiv/eingeschränkt/best-effort“, Warn-Action-Text, keine Emojis |
| `shared/shield-content.js` | Modal/Banner im gleichen Material + Branding, Escaping, Fokus/Escape, keine Emojis |
| `build.py` | `design-tokens.css` + `popup.css` im Build/Sync/Source-ZIP |

## 5. Visual QA (Chromium 155 headless, echte Renders)

| Ansicht | Datei | Ergebnis |
|---|---|---|
| Guard · Block (Desktop 1180 × 940) | [`screenshots/v2-guard-block.png`](screenshots/v2-guard-block.png) | Branding oben, eine Glasfläche, Emerald/Rose-Signal, Hairline-Datenzeilen |
| Guard · Warnung (Desktop) | [`screenshots/v2-guard-warn.png`](screenshots/v2-guard-warn.png) | gleiche Struktur, Amber-Signal, „Trotzdem fortfahren (unverifiziert)“ |
| Guard · Invalid | [`screenshots/v2-guard-invalid.png`](screenshots/v2-guard-invalid.png) | kein leerer Warnbereich mehr; neutraler Systemhinweis |
| Guard · kompakt (500 px) | [`screenshots/v2-guard-compact.png`](screenshots/v2-guard-compact.png) | einspaltig, volle Buttons, kein Overlap |
| Popup (380 px) | [`screenshots/v2-popup.png`](screenshots/v2-popup.png) | Brandbar, Status, Switch AN, 187 Marken, Testfeld |
| Shield-Modal (Harness) | [`screenshots/v2-shield-modal.png`](screenshots/v2-shield-modal.png) | gleiche Materialität/Branding, Ziel + offizielle Domain, Abbrechen primär |

**Einschränkung:** Chrome-Headless unter Windows hat eine Mindest-Layoutbreite (≈500 px); ein echter 360-/390-px-Viewport und echte Browser-Extension-Runtime sind **NOT_TESTED**. Kein Light-Theme (bewusste Entscheidung für Security-Interstitial; dokumentiert) und kein Screenshot des Firefox-Popups.

## 6. A11y-/Material-Checks

- Kontrast: Tokens auf Glas ≥ 4,5:1 (Text-3 `#93a7a1` ≈ 5,3:1 auf `#0f1917`); berechnet und im Screenshot geprüft.
- Fokus: sichtbarer 2-px-Ring nur an interaktiven Elementen; H1-Programmfokus ohne Ring.
- Tastatur: Escape schließt Confirm/Modal, Fokus auf Abbrechen; Disclosure setzt Fokus auf Proceed.
- Reduced Motion/Transparency und Forced Colors respektiert; keine dekorativen Raster.
- Ohne Blur/Gradient bleibt die Struktur (Brandbar → Eyebrow → H1 → Datenzeilen → Aktionen) lesbar.

## 7. Bewertung & Restpunkte

**Qualität:** deutlich über dem vorherigen „Glas + Gradient + Karten“-Stand; eigenständige Materialsprache, Branding prominent, ein Akzent, echte Hierarchie. **Keine** Behauptung „Diamant“ — es fehlen echte Browser-/Geräte-QA (Firefox, 360 px, Touch, Light) und ein zweiter Design-Review mit Nutzern.

**Offen (P1):** echtes 360-/390-px-Rendering (CDP-Emulation), Firefox-Popup, Light-/System-Theme-Entscheidung, Motion-Feinschliff, Icon-Set für Store/README.
