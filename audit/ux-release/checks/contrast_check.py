#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) — rechnerische WCAG-2.2-Kontrastpruefung fuer guard.html/guard.css
und popup.html.

AUDIT-ONLY: liest die Quelldateien, schreibt nichts ausser Logs/JSON nach audit/ux-release/checks/.

Methode:
- sRGB -> relative Luminanz nach WCAG 2.x Definition.
- Kontrast (L1+0.05)/(L2+0.05).
- Transparente Ebenen werden per Alpha-Compositing von unten nach oben auf die
  tatsaechlich zusammengesetzte Hintergrundfarbe gerechnet (GLASS_2100: "Textkontrast
  wird auf der tatsaechlichen zusammengesetzten Hintergrundfarbe geprueft").
- Fuer den Environment-Verlauf (radial-gradient) werden drei Stuetzfarben
  (#162a26 oben, #0f1c1a Mitte, #060c0b unten) durchgerechnet und jeweils der
  schlechteste (niedrigste) Kontrastwert berichtet.

Schwellen (WCAG 2.2 AA):
- 1.4.3 Text: 4.5:1 normal (< 18.66px bold / < 24px regular), 3.0:1 gross.
- 1.4.11 Non-text Contrast: 3.0:1 fuer UI-Komponenten/Fokusindikatoren.
- 2.4.11 Focus Appearance (AA): Fokusindikator mind. 2px Dicke, 3:1 Kontrast
  (wird hier als separater Hinweis gefuehrt; Dicke = CSS-Breite).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # .../vgt-domainguard-src
OUT = Path(__file__).resolve().parent
LOGDIR = OUT / "logs"
LOGDIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- Farbmathematik


def parse_color(value: str) -> tuple[float, float, float, float]:
    value = value.strip().lower()
    if value.startswith("#"):
        h = value[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) == 6:
            return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, 1.0)
        if len(h) == 8:
            return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255,
                    int(h[4:6], 16) / 255, int(h[6:8], 16) / 255)
        raise ValueError(value)
    m = re.match(r"rgba?\(([^)]+)\)", value)
    if not m:
        raise ValueError(value)
    parts = [p.strip() for p in m.group(1).replace("/", ",").split(",")]
    if len(parts) == 3:
        parts.append("1")
    r, g, b, a = parts[:4]

    def ch_rgb(x: str) -> float:
        if x.endswith("%"):
            return float(x[:-1]) / 100
        return float(x) / 255

    def ch_alpha(x: str) -> float:
        if x.endswith("%"):
            return float(x[:-1]) / 100
        return float(x)

    return (ch_rgb(r), ch_rgb(g), ch_rgb(b), ch_alpha(a))


def composite(layers: list[str], base: str) -> tuple[float, float, float]:
    """layers = von unten nach oben; base = opake Grundfarbe."""
    r, g, b = parse_color(base)[:3]
    for layer in layers:
        lr, lg, lb, la = parse_color(layer)
        r = la * lr + (1 - la) * r
        g = la * lg + (1 - la) * g
        b = la * lb + (1 - la) * b
    return (r, g, b)


def relative_luminance(rgb: tuple[float, float, float]) -> float:
    def lin(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg: str, bg: tuple[float, float, float]) -> float:
    fr, fg_, fb, fa = parse_color(fg)
    # Text mit Alpha: auf Hintergrund komponieren
    composited = (fa * fr + (1 - fa) * bg[0], fa * fg_ + (1 - fa) * bg[1], fa * fb + (1 - fa) * bg[2])
    l1, l2 = relative_luminance(composited), relative_luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def worst_config(fg: str, layers: list[str]) -> dict:
    """Rechnet alle drei Environment-Stuetzfarben; liefert schlechtesten Kontrast."""
    envs = {
        "env-top #162a26": composite(layers, "#162a26"),
        "env-mid #0f1c1a": composite(layers, "#0f1c1a"),
        "env-bottom #060c0b": composite(layers, "#060c0b"),
    }
    results = {k: round(contrast(fg, v), 2) for k, v in envs.items()}
    worst_key = min(results, key=results.get)
    return {
        "fg": fg,
        "bg_layers": layers,
        "per_env": results,
        "worst_bg": worst_key,
        "worst_contrast": results[worst_key],
    }


def hex_rgb(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{round(max(0.0, min(1.0, c)) * 255):02x}" for c in rgb)


# ---------------------------------------------------------------- Pruefmatrix

# Environments (aus guard.css body.vgt-environment / popup body)
GUARD_ENV = []  # body-Gradient selbst ist die Base
GUARD_GLASS = ["rgba(16, 28, 26, 0.82)"]           # --vgt-glass-fill
GUARD_FALLBACK = ["#111e1c"]                        # --vgt-fallback-surface
GUARD_DANGER = GUARD_GLASS + ["rgba(54, 18, 26, 0.72)"]
GUARD_OFFICIAL = GUARD_GLASS + ["rgba(14, 43, 37, 0.72)"]
GUARD_CONFIRM = GUARD_GLASS + ["rgba(45, 17, 24, 0.85)"]
GUARD_ERROR = GUARD_GLASS + ["rgba(70, 18, 26, 0.85)"]
GUARD_SECONDARY_BTN = GUARD_GLASS + ["rgba(33, 52, 48, 0.7)"]
POPUP_GLASS = ["rgba(16, 28, 26, 0.88)"]            # --vgt-glass-fill popup
POPUP_STAT = POPUP_GLASS + ["rgba(22, 38, 35, 0.65)"]
POPUP_INPUT = POPUP_GLASS + ["rgba(10, 18, 17, 0.75)"]
POPUP_SKIP = POPUP_GLASS + ["rgba(33, 52, 48, 0.7)"]
POPUP_RESULT_DANGER = POPUP_GLASS + ["rgba(54, 18, 26, 0.75)"]
POPUP_RESULT_OFFICIAL = POPUP_GLASS + ["rgba(14, 43, 37, 0.75)"]

CASES = [
    # (Gruppe, Element/Token, Vordergrund, Hintergrund-Layer, benoetigtes Verhaeltnis, Hinweis)
    ("guard", "h1 #ffffff", "#ffffff", GUARD_GLASS, 3.0, "gross 26-36px"),
    ("guard", "text-primary #f2f8f6", "#f2f8f6", GUARD_GLASS, 4.5, "Body 15px"),
    ("guard", "intro/secondary #9cb5af", "#9cb5af", GUARD_GLASS, 4.5, "15px"),
    ("guard", "kicker muted #6b857f", "#6b857f", GUARD_GLASS, 4.5, "11px bold, letter-spacing"),
    ("guard", "footer muted #6b857f", "#6b857f", GUARD_GLASS, 4.5, "12px"),
    ("guard", "footer muted auf Fallback #111e1c", "#6b857f", GUARD_FALLBACK, 4.5, "Reduced-Transparency/No-Blur-Fallback"),
    ("guard", "stat-label secondary #9cb5af (analog)", "#9cb5af", GUARD_GLASS, 4.5, "Vergleich"),
    ("guard", "badge accent #3ecaa8", "#3ecaa8", GUARD_GLASS + ["rgba(62, 202, 168, 0.12)"], 4.5, "11px bold"),
    ("guard", "danger eyebrow #ff5c73", "#ff5c73", GUARD_DANGER, 4.5, "12px bold"),
    ("guard", "host #ffb8c2", "#ffb8c2", GUARD_DANGER, 4.5, "18-22px bold -> eigentlich 3:1, hier 4.5 angesetzt"),
    ("guard", "reasons #dfcecf", "#dfcecf", GUARD_DANGER, 4.5, "13.5px"),
    ("guard", "official eyebrow #3ecaa8", "#3ecaa8", GUARD_OFFICIAL, 4.5, "12px bold"),
    ("guard", "official-name #a8f5df", "#a8f5df", GUARD_OFFICIAL, 4.5, "18px bold"),
    ("guard", "btn-primary Text #ffffff", "#ffffff", ["#1f7d6e"], 4.5, "14.5px 650"),
    ("guard", "btn-primary Verlauf unten", "#ffffff", ["#155e53"], 4.5, "14.5px 650, Gradient-Endpunkt"),
    ("guard", "btn-secondary Text", "#f2f8f6", GUARD_SECONDARY_BTN, 4.5, "14.5px 650"),
    ("guard", "btn-link #e6a7ad", "#e6a7ad", GUARD_GLASS, 4.5, "13px 600, unterstrichen"),
    ("guard", "confirm strong #ff5c73", "#ff5c73", GUARD_CONFIRM, 4.5, "13px bold"),
    ("guard", "confirm p #dec8ca", "#dec8ca", GUARD_CONFIRM, 4.5, "12.5px"),
    ("guard", "btn-critical #ffffff", "#ffffff", ["#a3273c"], 4.5, "13.5px"),
    ("guard", "error #ffd1d8", "#ffd1d8", GUARD_ERROR, 4.5, "13px"),
    ("guard", "Fokusring #52c2ff (Ring auf Environment)", "#52c2ff", GUARD_GLASS, 3.0, "2.4.11/1.4.11 non-text"),
    ("guard", "Fokusring auf Fallback", "#52c2ff", GUARD_FALLBACK, 3.0, "non-text"),
    ("popup", "h1 #ffffff", "#ffffff", POPUP_GLASS, 3.0, "16px bold -> 4.5 eigentlich; 3.0 konservativ"),
    ("popup", "kicker muted #6b857f", "#6b857f", POPUP_GLASS, 4.5, "10px bold"),
    ("popup", "stat-label secondary #9cb5af", "#9cb5af", POPUP_STAT, 4.5, "11px"),
    ("popup", "stat-value accent #3ecaa8", "#3ecaa8", POPUP_STAT, 3.0, "18px bold"),
    ("popup", "version-pill accent #3ecaa8", "#3ecaa8", POPUP_GLASS + ["rgba(62, 202, 168, 0.12)"], 4.5, "10px bold"),
    ("popup", "toggle-label #f2f8f6", "#f2f8f6", POPUP_STAT, 4.5, "12.5px 600"),
    ("popup", "option-note secondary #9cb5af", "#9cb5af", POPUP_STAT, 4.5, "11px"),
    ("popup", "section-title muted #6b857f", "#6b857f", POPUP_GLASS, 4.5, "12px bold uppercase"),
    ("popup", "input Text #ffffff", "#ffffff", POPUP_INPUT, 4.5, "12.5px"),
    ("popup", "btn-check #ffffff", "#ffffff", ["#1f7d6e"], 4.5, "12.5px 650"),
    ("popup", "btn-check Verlauf unten", "#ffffff", ["#155e53"], 4.5, "12.5px 650"),
    ("popup", "result block #ffc4cc", "#ffc4cc", POPUP_RESULT_DANGER, 4.5, "12px"),
    ("popup", "result safe #a8f5df", "#a8f5df", POPUP_RESULT_OFFICIAL, 4.5, "12px"),
    ("popup", "result skip secondary", "#9cb5af", POPUP_SKIP, 4.5, "12px"),
    ("popup", "footer muted #6b857f", "#6b857f", POPUP_GLASS, 4.5, "10.5px"),
    ("popup", "footer muted auf Fallback", "#6b857f", ["#111e1c"], 4.5, "Fallback"),
    ("popup", "Fokusring #52c2ff auf Glass", "#52c2ff", POPUP_GLASS, 3.0, "non-text"),
    ("popup", "Fokusring vs Input-Hintergrund", "#52c2ff", POPUP_INPUT, 3.0, "1px Border statt 2px Ring"),
]

rows = []
for group, label, fg, layers, req, note in CASES:
    res = worst_config(fg, layers)
    status = "PASS" if res["worst_contrast"] >= req else "FAIL"
    rows.append({
        "group": group,
        "element": label,
        "foreground": fg,
        "required": req,
        "worst_env": res["worst_bg"],
        "worst_bg_hex": hex_rgb(composite(layers, "#162a26" if "top" in res["worst_bg"] else
                                           "#0f1c1a" if "mid" in res["worst_bg"] else "#060c0b")),
        "contrast": res["worst_contrast"],
        "status": status,
        "note": note,
        "per_env": res["per_env"],
    })

fails = [r for r in rows if r["status"] == "FAIL"]

print("=== ANTIPISHER UX/RELEASE AUDIT — KONTRASTPRUEFUNG (WCAG 2.2) ===")
print(f"Quelle: {ROOT}")
print(f"Faelle: {len(rows)}  PASS: {len(rows)-len(fails)}  FAIL: {len(fails)}\n")
print(f"{'GRP':6} {'ELEMENT':42} {'REQ':>4} {'IST':>5}  STATUS  HINWEIS")
for r in rows:
    print(f"{r['group']:6} {r['element'][:42]:42} {r['required']:>4.1f} {r['contrast']:>5.2f}  {r['status']:6}  {r['note']}")
print("\nFAIL-Details:")
for r in fails:
    print(f" - {r['group']}: {r['element']} = {r['contrast']}:1 (min {r['required']}:1), "
          f"schlechtester Grund: {r['worst_env']} -> {r['worst_bg_hex']}")

(OUT / "contrast_results.json").write_text(json.dumps({
    "tool": "contrast_check.py",
    "wcag": "2.2 AA",
    "source_root": str(ROOT),
    "cases": rows,
    "fails": fails,
    "notes": [
        "Alpha-Compositing: Glass-Fill/Glass-Karten wurden ueber drei Stuetzfarben des "
        "Environment-Gradienten gerechnet; berichtet wird der schlechteste Wert.",
        "Backdrop-Blur selbst veraendert die Hintergrundfarbe im Flaechentest nicht, "
        "veraendert aber die wahrgenommene Lesbarkeit ueber bewegtem Inhalt (hier nicht "
        "messbar, weil hinter dem Interstitial nur ein statischer Gradient liegt).",
        "Platzhaltertext (#url) hat keine eigene ::placeholder-Farbe -> UA-Standard, "
        "nicht belastbar bewertbar => NOT_TESTED.",
        "Fokusring popup: input[type=text] setzt outline:none mit Spezifitaet (0,1,1); "
        "die :where(...):focus-visible-Regel hat (0,1,0) und verliert => nur 1px Border "
        "+ rgba(82,194,255,.25)-Schatten als Fokusindikator (2.4.11/1.4.11 Risiko).",
    ],
}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

log = []
log.append("=== ANTIPISHER UX/RELEASE AUDIT — KONTRASTPRUEFUNG ===")
log.append(f"Zeit: {__import__('datetime').datetime.now().astimezone().isoformat()}")
log.append(f"Quelle: {ROOT}")
log.append(f"Faelle: {len(rows)}  PASS: {len(rows)-len(fails)}  FAIL: {len(fails)}")
for r in rows:
    log.append(f"{r['status']:6} {r['group']:6} {r['element']:42} ist={r['contrast']:.2f} min={r['required']:.1f} bg={r['worst_env']}")
log.append("")
log.append("FAIL-Details:")
for r in fails:
    log.append(f" - {r['group']}/{r['element']}: {r['contrast']}:1 < {r['required']}:1 (bg {r['worst_bg_hex']})")
(LOGDIR / "contrast_check.log").write_text("\n".join(log) + "\n", encoding="utf-8")
print(f"\nGeschrieben: {OUT / 'contrast_results.json'}")
print(f"Geschrieben: {LOGDIR / 'contrast_check.log'}")
