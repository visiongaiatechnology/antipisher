#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) — ECHTER Chromium-RENDER (headless) der UI-Zustaende.

WICHTIG: STATISCHES RENDER-HARNESS, kein Extension-E2E-Test.
- Kopien von shared/guard.html und shared/popup.html; Zustaende werden per
  Inline-Script gesetzt statt durch die Extension-Runtime.
- Jede Seite laeuft in einem iframe mit exakt definierter Viewport-Breite
  (Chrome-headless erzwingt sonst eine Mindestfensterbreite ~500px).
- Metriken werden aus dem iframe in die Wrapper-Seite kopiert und via --dump-dom
  ausgelesen.

Erzeugt: screenshots/*.png, checks/render_metrics.json, checks/logs/render_harness.log
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SHOTS = ROOT / "audit/ux-release/screenshots"
HARNESS = OUT / "render"
LOGDIR = OUT / "logs"
for d in (SHOTS, HARNESS, LOGDIR):
    d.mkdir(parents=True, exist_ok=True)

CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
assert CHROME.exists(), "Chrome nicht gefunden"

guard_html = (ROOT / "shared/guard.html").read_text(encoding="utf-8")
popup_html = (ROOT / "shared/popup.html").read_text(encoding="utf-8")
shutil.copyfile(ROOT / "shared/guard.css", HARNESS / "guard.css")

METRICS_JS = r"""
(function () {
  function rect(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)};
  }
  var metrics = {
    page: location.pathname.split('/').pop(),
    viewport: {w: window.innerWidth, h: window.innerHeight},
    hasFocus: document.hasFocus(),
    activeElement: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    },
    headings: Array.prototype.map.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6'),
      function (h) { return h.tagName + ':' + (h.textContent || '').trim().slice(0, 80); }),
    focusables: Array.prototype.map.call(
      document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) {
        var r = el.getBoundingClientRect();
        return {tag: el.tagName, id: el.id || '', text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 50),
                visible: !!(r.width && r.height), tabIndex: el.tabIndex};
      }),
    rects: {
      wrap: rect('.wrap'), danger: rect('#danger'), actions: rect('.actions'),
      safeBtn: rect('#safe'), backBtn: rect('#back'), reveal: rect('#reveal'),
      confirm: rect('#confirm'), proceed: rect('#proceed'),
      popupBody: rect('body'), glassCard: rect('.glass-card'), urlInput: rect('#url'),
      checkBtn: rect('#check'), toggleRow: rect('.toggle-row'), checkbox: rect('#strict'),
      result: rect('#result'), footer: rect('.footer'), h1: rect('h1')
    },
    computed: {},
    focusTest: null
  };
  ['#title', '#description', '#host', '#official', '#reason', '#error',
   '#url', '#check', '#strict', '#notice', '#sitecount', '#blocked',
   '#result', '.kicker', '.footer', 'h1', '.wrap', '.glass-card'].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    var cs = getComputedStyle(el);
    metrics.computed[sel] = {
      color: cs.color, background: cs.backgroundColor, fontSize: cs.fontSize,
      fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
      outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth,
      borderColor: cs.borderColor, boxShadow: cs.boxShadow,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter
    };
  });
  var urlInput = document.querySelector('#url');
  if (urlInput) {
    urlInput.focus();
    var cs2 = getComputedStyle(urlInput);
    metrics.focusTest = {
      activeIsInput: document.activeElement === urlInput,
      matchesFocusVisible: urlInput.matches(':focus-visible'),
      matchesFocus: urlInput.matches(':focus'),
      outlineStyle: cs2.outlineStyle, outlineWidth: cs2.outlineWidth,
      outlineColor: cs2.outlineColor, outlineOffset: cs2.outlineOffset,
      borderColor: cs2.borderColor, boxShadow: cs2.boxShadow,
      hasVisibleOutline: cs2.outlineStyle !== 'none' && parseFloat(cs2.outlineWidth) >= 2
    };
  }
  var pre = document.createElement('pre');
  pre.id = 'audit-metrics';
  pre.style.display = 'none';
  pre.textContent = 'AUDIT_METRICS_JSON:' + JSON.stringify(metrics);
  document.body.appendChild(pre);
})();
"""


def state_script(kind: str, state: str) -> str:
    js = {
        ("guard", "danger"): """
document.getElementById('title').textContent = 'Möglicher Domain-Betrug abgewehrt';
document.getElementById('description').textContent = 'Diese Webadresse weist verdächtige Ähnlichkeiten mit einer geschützten Marke auf.';
document.getElementById('host').textContent = 'xn--pypal-4ve.com';
document.getElementById('official').textContent = 'PayPal (paypal.com)';
document.getElementById('reason').textContent = 'Die Webadresse verwendet Zeichen aus fremden Alphabeten (IDN-Homographen), die einer bekannten Domain täuschend ähneln.';
var b = document.getElementById('badge');
b.textContent = 'ABWEHR AKTIV'; b.style.color = 'var(--vgt-danger)';
b.style.borderColor = 'var(--vgt-danger-stroke)'; b.style.background = 'rgba(255, 92, 115, 0.15)';
document.getElementById('danger').hidden = false;
""",
        ("guard", "confirm"): """
document.getElementById('title').textContent = 'Möglicher Domain-Betrug abgewehrt';
document.getElementById('description').textContent = 'Diese Webadresse weist verdächtige Ähnlichkeiten mit einer geschützten Marke auf.';
document.getElementById('host').textContent = 'xn--pypal-4ve.com';
document.getElementById('official').textContent = 'PayPal (paypal.com)';
document.getElementById('reason').textContent = 'Die Webadresse enthält unsichtbare oder nicht druckbare Unicode-Steuerzeichen zur Verschleierung.';
var b = document.getElementById('badge');
b.textContent = 'ABWEHR AKTIV'; b.style.color = 'var(--vgt-danger)';
b.style.borderColor = 'var(--vgt-danger-stroke)'; b.style.background = 'rgba(255, 92, 115, 0.15)';
document.getElementById('danger').hidden = false;
document.getElementById('confirm').hidden = false;
document.getElementById('reveal').setAttribute('aria-expanded', 'true');
""",
        ("guard", "invalid"): """
document.getElementById('title').textContent = 'Ungültige Webadresse';
document.getElementById('description').textContent = 'Antipisher prüft ausschließlich standardisierte HTTP- und HTTPS-Webadressen.';
document.getElementById('badge').textContent = 'SYSTEMHINWEIS';
""",
        ("popup", "danger"): """
document.getElementById('sitecount').textContent = '165';
document.getElementById('blocked').textContent = '3';
document.getElementById('strict').checked = true;
var r = document.getElementById('result');
r.className = 'result-box block';
r.textContent = '⚠ Verdächtig: Ähnlich zu PayPal (paypal.com)';
""",
        ("popup", "safe"): """
document.getElementById('sitecount').textContent = '165';
document.getElementById('blocked').textContent = '3';
document.getElementById('strict').checked = true;
var r = document.getElementById('result');
r.className = 'result-box safe';
r.textContent = '✓ Kein Treffer in dieser Schutzliste. (Nicht automatisch vertrauenswürdig)';
""",
    }[(kind, state)]
    return '<script>' + js + '</script>\n<script>' + METRICS_JS + '</script>'


def make_page(kind: str) -> str:
    src = guard_html if kind == "guard" else popup_html
    for stray in ('<script src="shared/sites.js"></script>',
                  '<script src="shared/detector.js"></script>',
                  '<script src="guard.js"></script>', '<script src="popup.js"></script>'):
        src = src.replace(stray, '')
    return src


def build(kind: str, state: str) -> Path:
    html = make_page(kind)
    if kind == "guard":
        # guard.html liegt im selben Ordner wie guard.css im Harness
        html = html.replace('<link rel="stylesheet" href="guard.css">', '<link rel="stylesheet" href="guard.css">')
    html = html.replace("</body>", state_script(kind, state) + "\n</body>")
    p = HARNESS / f"{kind}-{state}.html"
    p.write_text(html, encoding="utf-8")
    return p


def wrapper(page: Path, w: int, h: int) -> Path:
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>wrap</title></head>
<body style="margin:0;background:#050807;display:flex;justify-content:center;padding-top:8px">
<iframe id="frame" src="{page.name}" style="width:{w}px;height:{h}px;border:0;box-shadow:0 0 0 1px #222" referrerpolicy="no-referrer"></iframe>
<script>
function relay() {{
  try {{
    var f = document.getElementById('frame');
    var d = f.contentDocument;
    var inner = d.getElementById('audit-metrics');
    var pre = document.createElement('pre');
    pre.id = 'audit-metrics'; pre.style.display = 'none';
    pre.textContent = (inner ? inner.textContent : 'AUDIT_METRICS_JSON:MISSING')
      + '|FRAME:' + JSON.stringify({{w: f.clientWidth, h: f.clientHeight}});
    document.body.appendChild(pre);
  }} catch (e) {{
    var pre2 = document.createElement('pre');
    pre2.id = 'audit-metrics'; pre2.style.display = 'none';
    pre2.textContent = 'AUDIT_METRICS_JSON:MISSING_CROSS_ORIGIN:' + e;
    document.body.appendChild(pre2);
  }}
}}
window.addEventListener('load', function () {{ setTimeout(relay, 50); }});
</script></body></html>"""
    p = HARNESS / f"wrap-{page.stem}-{w}x{h}.html"
    p.write_text(html, encoding="utf-8")
    return p


def chrome(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([str(CHROME)] + args, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=120)


def run_dom(wrap: Path, profile: Path, win_w: int = 1300, win_h: int = 1160) -> dict:
    r = chrome(["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                "--allow-file-access-from-files", f"--user-data-dir={profile}",
                f"--window-size={win_w},{win_h}",
                "--virtual-time-budget=1500", "--dump-dom", wrap.as_uri()])
    m = re.search(r"AUDIT_METRICS_JSON:(\{.*?\})(?=\|FRAME:|</pre>)", r.stdout, re.S)
    fr = re.search(r"\|FRAME:(\{.*?\})</pre>", r.stdout, re.S)
    metrics = json.loads(m.group(1)) if m else None
    frame = json.loads(fr.group(1)) if fr else None
    return {"exit": r.returncode, "metrics": metrics, "frame": frame,
            "stderr_tail": (r.stderr or "").strip()[-400:]}


def shot(wrap: Path, w: int, h: int, file: str, profile: Path) -> dict:
    r = chrome(["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                "--no-default-browser-check", "--allow-file-access-from-files",
                f"--user-data-dir={profile}", f"--window-size={w},{h}",
                "--virtual-time-budget=1500", "--force-device-scale-factor=1",
                f"--screenshot={SHOTS / file}", wrap.as_uri()])
    return {"exit": r.returncode, "file": file,
            "exists": (SHOTS / file).exists(),
            "bytes": (SHOTS / file).stat().st_size if (SHOTS / file).exists() else 0}


results = {"tool": "render_harness.py",
           "generated": datetime.now().astimezone().isoformat(),
           "type": "STATIC_RENDER_HARNESS (kein Extension-E2E)",
           "chrome": str(CHROME), "pages": [], "screenshots": []}
profile_base = OUT / "tmp-profile"
shutil.rmtree(profile_base, ignore_errors=True)
profile_base.mkdir(parents=True, exist_ok=True)

scenarios = [
    ("guard-danger", "guard", "danger", 1280, 900, "guard-danger-1280x900.png", 1300, 940),
    ("guard-danger-mobile", "guard", "danger", 390, 844, "guard-danger-390x844.png", 440, 880),
    ("guard-confirm", "guard", "confirm", 1280, 1120, "guard-confirm-1280x1120.png", 1300, 1160),
    ("guard-invalid", "guard", "invalid", 1280, 900, "guard-invalid-1280x900.png", 1300, 940),
    ("popup-danger", "popup", "danger", 350, 620, "popup-danger-350x620.png", 420, 680),
    ("popup-safe", "popup", "safe", 350, 620, "popup-safe-350x620.png", 420, 680),
    ("popup-zoom175", "popup", "danger", 175, 620, "popup-zoom-sim-200pct-175x620.png", 240, 680),
]

for i, (name, kind, state, w, h, file, win_w, win_h) in enumerate(scenarios):
    page = build(kind, state)
    wrap = wrapper(page, w, h)
    prof = profile_base / f"p{i}"
    m = run_dom(wrap, prof, win_w, win_h)
    s = shot(wrap, win_w, win_h, file, profile_base / f"s{i}")
    entry = {"scenario": name, "kind": kind, "state": state,
             "viewport": f"{w}x{h}", "screenshot": file,
             "frame": m["frame"], "metrics": m["metrics"],
             "dump_exit": m["exit"], "shot": s}
    results["pages"].append(entry)
    if s["exists"]:
        results["screenshots"].append({"file": file, "bytes": s["bytes"]})
    print(f"[{name}] iframe {w}x{h} -> {file} | metrics={'OK' if m['metrics'] else 'FEHLT'} "
          f"| frame={m['frame']} | shot={'OK' if s['exists'] else 'FEHLT'}")

summary = {}
for p in results["pages"]:
    met = p["metrics"] or {}
    summary[p["scenario"]] = {
        "iframeViewport": p["frame"],
        "innerViewport": met.get("viewport"),
        "horizontalOverflow": met.get("document", {}).get("horizontalOverflow"),
        "scrollWidth": met.get("document", {}).get("scrollWidth"),
        "scrollHeight": met.get("document", {}).get("scrollHeight"),
        "activeElement": met.get("activeElement"),
        "hasFocus": met.get("hasFocus"),
        "focusTest": met.get("focusTest"),
        "focusables": met.get("focusables"),
        "headings": met.get("headings"),
        "rects": met.get("rects"),
    }
results["summary"] = summary
(OUT / "render_metrics.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n",
                                        encoding="utf-8")

log = ["=== ANTIPISHER UX/RELEASE AUDIT — STATIC RENDER HARNESS (headless Chromium) ===",
       f"Zeit: {results['generated']}", f"Chrome: {CHROME}",
       "Typ: STATIC_RENDER_HARNESS - Zustände per Inline-Script simuliert, KEIN Extension-E2E.", ""]
for p in results["pages"]:
    log.append(f"[{p['scenario']}] iframe={p['viewport']} screenshot={p['screenshot']} "
               f"dump_exit={p['dump_exit']}")
    met = p["metrics"] or {}
    log.append("  " + json.dumps({
        "innerViewport": (met.get("viewport")),
        "horizontalOverflow": met.get("document", {}).get("horizontalOverflow"),
        "scrollWidth": met.get("document", {}).get("scrollWidth"),
        "scrollHeight": met.get("document", {}).get("scrollHeight"),
        "hasFocus": met.get("hasFocus"),
        "focusTest": met.get("focusTest"),
        "focusables": [f["id"] or f["tag"] for f in (met.get("focusables") or [])],
    }, ensure_ascii=False))
log.append("")
log.append("Hinweis: Screenshots = reale Chromium-Renders der CSS/HTML-Struktur mit simulierten "
           "Zuständen. Ein echter Extension-Lauf (DNR-Redirect/Popup im Browser) ist NICHT getestet.")
(LOGDIR / "render_harness.log").write_text("\n".join(log) + "\n", encoding="utf-8")
print("\n".join(log))
shutil.rmtree(profile_base, ignore_errors=True)
print(f"\nGeschrieben: {OUT / 'render_metrics.json'} und {SHOTS}")
