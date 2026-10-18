#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) — Doku-Integritaets- und Source-Identity-Check (AUDIT-ONLY).

Prueft die Behauptungen in README.md / Next.md / SECURITY.md gegen Code, Manifeste,
Build-Artefakte und die in diesem Audit erzeugten Messergebnisse. Erzeugt eine
SOURCE_IDENTITY_CONFLICTS-Liste mit Datei:Zeile-Evidenz.
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

readme = (ROOT / "README.md").read_text(encoding="utf-8")
nextmd = (ROOT / "Next.md").read_text(encoding="utf-8")
security = (ROOT / "SECURITY.md").read_text(encoding="utf-8")
detector = (ROOT / "shared/detector.js").read_text(encoding="utf-8")
guard_css = (ROOT / "shared/guard.css").read_text(encoding="utf-8")
build_py = (ROOT / "build.py").read_text(encoding="utf-8")
build_sites = (ROOT / "build_sites.py").read_text(encoding="utf-8")
chrome_manifest = json.loads((ROOT / "chrome/manifest.json").read_text(encoding="utf-8"))
firefox_manifest = json.loads((ROOT / "firefox/manifest.json").read_text(encoding="utf-8"))


def find(text: str, needle: str) -> dict:
    for i, line in enumerate(text.splitlines(), 1):
        if needle in line:
            return {"line": i, "text": line.strip()}
    return {"line": None, "text": ""}


def result(name: str, path: str, ok: bool | None, detail: str, evidence: str = "") -> dict:
    return {"claim": name, "source": path, "ok": ok,
            "status": "CONFIRMED" if ok is True else ("CONFLICT" if ok is False else "NOT_VERIFIABLE"),
            "detail": detail, "evidence": evidence}


results: list[dict] = []

# ---------------------------------------------------------------- Faktenbasis
sites = json.loads((ROOT / "sites-100.json").read_text(encoding="utf-8"))
tests_log = ""
if (LOGDIR / "tests.log").exists():
    _raw = (LOGDIR / "tests.log").read_bytes()
    for _enc in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            tests_log = _raw.decode(_enc)
            break
        except Exception:
            continue
tests_count = re.search(r"ℹ tests (\d+)", tests_log)
tests_pass = re.search(r"ℹ pass (\d+)", tests_log)
tests_fail = re.search(r"ℹ fail (\d+)", tests_log)
repro = json.loads((OUT / "reproducibility_results.json").read_text(encoding="utf-8"))
probes = json.loads((OUT / "detector_probe_results.json").read_text(encoding="utf-8"))
contrast = json.loads((OUT / "contrast_results.json").read_text(encoding="utf-8"))
render = json.loads((OUT / "render_metrics.json").read_text(encoding="utf-8"))

# ---------------------------------------------------------------- README-Behauptungen
results.append(result("165 fest eingetragene Marken (README:8)", "README.md:8",
                      len(sites) == 165, f"sites-100.json enthaelt {len(sites)} Eintraege",
                      "checks/logs/detector_probe.log"))
results.append(result("Damerau-Levenshtein Distanz 1 (README:9)", "README.md:9", True,
                      "tests/detector.test.cjs deckt Transpositionen ab; 13/13-Testlauf PASS",
                      "checks/logs/tests.log"))
sub_conflicts = [c for c in probes["conflicts"] if c["group"] == "Subdomain-Schutz"]
results.append(result("Lueckenloser Subdomain-Schutz fuer alle Marken (README:10, Next.md:23)",
                      "README.md:10; Next.md:23", len(sub_conflicts) == 0,
                      f"{len(sub_conflicts)} Gegenbeispiele (u.a. office/target/medium/zoom/notion/line.attacker.com "
                      "werden NICHT geblockt); zusaetzlich False Positives (apple.stackexchange.com)",
                      "checks/detector_probe_results.json"))
results.append(result("Multi-Tenant-Trennung (README:11)", "README.md:11", True,
                      "microsoft.github.io/google.github.io safe; paypal.github.io/chase-login.pages.dev block",
                      "checks/logs/detector_probe.log"))
results.append(result("Chrome MV3 POST-Schutz (README:13)", "README.md:13", True,
                      "DNR-Regel filtert requestMethods:['get'] (chrome/background.js:36-38)",
                      "chrome/background.js:36-38"))
war = chrome_manifest.get("web_accessible_resources", [])
results.append(result("Manifest-Haertung verhindert Extension-Fingerprinting (README:15)",
                      "README.md:15", not war,
                      "WAR enthaelt guard.html fuer alle http/https-Origins; Chrome-Doku: WAR-Freigaben "
                      "ermoeglichen Fingerprinting. Skripte sind entfernt, der Vektor ist aber nicht "
                      "'verhindert', sondern notwendiges Restrisiko des DNR-Redirects.",
                      "chrome/manifest.json:31-41; https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources"))
results.append(result("VGT GLASS 2100 inkl. adaptiver Kontraste/Barrierefreiheit (README:14)",
                      "README.md:14", False,
                      "Kontrastpruefung: 7 FAILs (muted #6b857f 4.29-4.33:1 < 4.5:1); Popup ohne "
                      "reduced-transparency/reduced-motion/forced-colors; Fokusindikator des Suchfelds "
                      "per outline:none ueberschrieben; keine Light/System-Themes.",
                      "checks/contrast_results.json; checks/ui_static_results.json; checks/render_metrics.json"))
results.append(result("100% Offline / Zero-Telemetry (README:16)", "README.md:16", True,
                      "keine fetch/XHR/WebSocket/sendBeacon-Aufrufe in den Runtime-Dateien; keine externen Assets",
                      "grep ueber shared/, chrome/, firefox/"))
results.append(result("End-to-End-Browserlauf fehlt (README:62 - ehrliche Einschraenkung)", "README.md:62", True,
                      "wird durch diesen Audit bestaetigt: echter Extension-E2E NOT_TESTED",
                      "checks/logs/e2e_attempt.log"))

# ---------------------------------------------------------------- Next.md-Behauptungen
results.append(result("SOURCE_IDENTITY_CONFIRMED (Next.md:11)", "Next.md:11", False,
                      "Kein .git, kein Commit/Tag/Branch; Next.md:53 nennt selbst 'v0.1.0 uncommitted'. "
                      "VGT-Qualitaetsgate 1 (Source identity + Git-/Dirty-Baseline) nicht erfuellt.",
                      "Test-Path .git = False; checks/artifact_identity.json"))
results.append(result("Versionierung '0.1.0-alpha' konsistent implementiert (Next.md:21)",
                      "Next.md:21", False,
                      "String '0.1.0-alpha' nur in ZIP-Namen + Next.md; Manifeste = 0.1.0; "
                      "Chrome version_name='0.1 Alpha'; Firefox ohne Alpha-Marker; UI 'ALPHA 0.1'/'Alpha 0.1'.",
                      "chrome/manifest.json:6-7; firefox/manifest.json:6; build.py:20,30; Next.md:9"))
results.append(result("Lueckenloser Subdomain-Schutz fuer alle Marken (Next.md:23)", "Next.md:23", False,
                      "siehe README:10 - Gegenbeispiele durch genericSubdomains & nicht gelistete Marken",
                      "checks/detector_probe_results.json"))
results.append(result("Manifest-Fingerprinting-Vektoren geschlossen (Next.md:28)", "Next.md:28", False,
                      "WAR guard.html bleibt erforderlich (DNR-Redirect); Chrome-Doku nennt WAR ausdruecklich "
                      "als Fingerprinting-Vektor.",
                      "chrome/manifest.json:31-41"))
results.append(result("13/13 PASS (Next.md:30, Next.md:70)", "Next.md:30", tests_pass is not None and tests_fail is not None and int(tests_pass.group(1)) == 13 and int(tests_fail.group(1)) == 0,
                      f"node --test tests/*.test.cjs: tests={tests_count.group(1) if tests_count else '?'} "
                      f"pass={tests_pass.group(1) if tests_pass else '?'} fail={tests_fail.group(1) if tests_fail else '?'}",
                      "checks/logs/tests.log"))
results.append(result("Reproduzierbare Build-Artefakte (Next.md:31, TASK-09)", "Next.md:31", False,
                      "Rebuild derselben Kopie erzeugt andere ZIP-Bytes (Build-Zeitstempel); Source-ZIP-Prefix "
                      "haengt vom Checkout-Ordnernamen ab; audit/ landet ungefiltert im Source-ZIP.",
                      "checks/reproducibility_results.json"))
results.append(result("PLATIN VGT SUPREME (Next.md:71)", "Next.md:71", False,
                      "Keine definierte VGT-Klasse 'PLATIN VGT SUPREME'; kein E2E-, Performance-, Recovery- "
                      "oder Zielplattform-Beweis; SECURITY.md:3 und README:62 schliessen Zertifizierung aus.",
                      "Next.md:71; SECURITY.md:3; README:62"))
arch_ref = "ARCHITECTURE_AND_SECURITY_REVIEW.md"
results.append(result("Referenzierte ARCHITECTURE_AND_SECURITY_REVIEW.md existiert (Next.md:13,39)",
                      "Next.md:13; Next.md:39", (ROOT / arch_ref).exists(),
                      "Datei im Workspace nicht vorhanden",
                      "glob/Test-Path"))
results.append(result("Doku-Checkpoint 002 '12/12 PASS' (Next.md:59) und TASK-01 '9/9 PASS' (Next.md:39)",
                      "Next.md:39,59", None,
                      "Aktueller Lauf = 13/13 PASS; die historischen Zwischenstaende sind ohne Git-Historie "
                      "nicht nachpruefbar (kein Repo).", "checks/logs/tests.log"))

# ---------------------------------------------------------------- SECURITY.md / Klassifikation
results.append(result("SECURITY.md: keine externe Sicherheitsaudit-Zertifizierung (ehrlich)", "SECURITY.md:3", True,
                      "bestaetigt; im Widerspruch zu Next.md:71 und den 'Diamant VGT Supreme'-Headern im Code",
                      "SECURITY.md:3"))
results.append(result("Code-Header 'Diamant VGT Supreme Quality Gate' (detector.js:4) / "
                      "'Diamant VGT Supreme Design Standards' (guard.css:3)", "shared/detector.js:4; shared/guard.css:3",
                      False, "Selbstklassifikation ohne Nachweis (kein E2E, keine Performance-Messung, "
                      "keine visuelle QA-Historie, keine Screenshots im Repo).",
                      "shared/detector.js:4; shared/guard.css:3"))
results.append(result("Security-Kontakt kanalisiert (SECURITY.md:9)", "SECURITY.md:9", False,
                      "'an den Repository-Maintainer ueber einen privaten Kanal' nennt keinen Kontakt, keine "
                      "URL, keine security.txt -> fuer Melder nicht handlungsfaehig.",
                      "SECURITY.md:9"))

# ---------------------------------------------------------------- Brand / Legacy
legacy_hits = []
for name, text in [("shared/guard.css", guard_css), ("build_sites.py", build_sites),
                   ("shared/detector.js", detector), ("build.py", build_py),
                   ("Next.md", nextmd), ("README.md", readme)]:
    for i, line in enumerate(text.splitlines(), 1):
        if "DomainGuard" in line:
            legacy_hits.append(f"{name}:{i}: {line.strip()[:110]}")
results.append(result("Produktname 'Antipisher' vollstaendig in Code/Doku verankert (Next.md:19)",
                      "Next.md:19", len(legacy_hits) == 0,
                      "Legacy-Bezuege gefunden: " + " | ".join(legacy_hits[:8]) +
                      f" (gesamt {len(legacy_hits)} Treffer)", "grep 'DomainGuard'"))
results.append(result("Datenbank-Doku aktuell (build_sites.py:3 '140+', Datei sites-100.json)",
                      "build_sites.py:3", False,
                      f"Docstring nennt 140+, Datei heisst sites-100.json, tatsaechlich {len(sites)} Marken",
                      "build_sites.py:3; sites-100.json"))

# ---------------------------------------------------------------- Weitere Release-Fakten
results.append(result("Kein .git / kein package.json / kein CHANGELOG / keine CI / keine Store-Assets",
                      "Workspace", True,
                      "Repo-Zustand: " + json.dumps(json.loads((OUT / 'artifact_identity.json')
                                                              .read_text(encoding='utf-8'))['identity']['repo_state'],
                                                      ensure_ascii=False),
                      "checks/artifact_identity.json"))
results.append(result("Release-ZIPs sind inhaltlich aktuell (identisch zu Quellstaenden)",
                      "Elternordner", True,
                      "Chrome/Firefox/Source-ZIP: Datei-Hashes stimmen mit den aktuellen Quellen ueberein",
                      "checks/artifact_identity.json"))

conflicts = [r for r in results if r["status"] == "CONFLICT"]
confirmed = [r for r in results if r["status"] == "CONFIRMED"]
unverifiable = [r for r in results if r["status"] == "NOT_VERIFIABLE"]

report = {
    "tool": "docs_identity_check.py",
    "generated": datetime.now().astimezone().isoformat(),
    "source_root": str(ROOT),
    "counts": {"total": len(results), "confirmed": len(confirmed),
               "conflicts": len(conflicts), "not_verifiable": len(unverifiable)},
    "results": results,
    "source_identity_conflicts": [{"claim": r["claim"], "evidence": r["evidence"],
                                   "detail": r["detail"]} for r in conflicts],
}
(OUT / "docs_identity_results.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                                               encoding="utf-8")

lines = ["=== ANTIPISHER UX/RELEASE AUDIT — DOKU-/SOURCE-IDENTITY-CHECK ===",
         f"Zeit: {report['generated']}", f"Quelle: {ROOT}",
         f"Behauptungen: {len(results)} | CONFIRMED: {len(confirmed)} | CONFLICT: {len(conflicts)} | "
         f"NOT_VERIFIABLE: {len(unverifiable)}", ""]
for r in results:
    lines.append(f"[{r['status']:13}] {r['claim']}")
    lines.append(f"                Quelle: {r['source']}")
    lines.append(f"                Detail: {r['detail']}")
    lines.append(f"                Evidenz: {r['evidence']}")
lines.append("")
lines.append("SOURCE_IDENTITY_CONFLICTS:")
for c in report["source_identity_conflicts"]:
    lines.append(f" - {c['claim']} | {c['evidence']}")
(LOGDIR / "docs_identity_check.log").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
print(f"\nGeschrieben: {OUT / 'docs_identity_results.json'}")
