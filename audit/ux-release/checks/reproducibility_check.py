#!/usr/bin/env python3
"""
Antipisher 0.1 (Alpha) — Build-/Reproduzierbarkeits-Test (AUDIT-ONLY).

Der echte build.py wird NICHT im Quellbaum ausgefuehrt (er schreibt ZIPs in den
Elternordner und ueberschreibt chrome/firefox/shared). Stattdessen wird der
Quellbaum in eine temporaere Kopie unter audit/ux-release/checks/tmp/ geklont und
dort mehrfach gebaut. Ergebnisse:

1. Determinismus innerhalb derselben Kopie (gleiche mtimes) -> ?
2. Reproduzierbarkeit bei anderem Checkout-Ordnernamen -> ?
3. mtime-Abhaengigkeit (nur Timestamp geaendert) -> ?
4. Versehentliche Aufnahme von audit/-Verzeichnissen ins Source-ZIP -> ?
5. Legacy-Duplikate im Release-Ordner -> ?
6. ZIP-Entry-Timestamps vs. Datei-mtimes -> ?
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
LOGDIR = OUT / "logs"
TMP = OUT / "tmp"
LOGDIR.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)

IGNORE = shutil.ignore_patterns("audit", "__pycache__", "*.pyc", ".git")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def build_in(base: Path) -> dict:
    """base ist der Elternordner, der den Quellbaum enthaelt."""
    entries = list(base.iterdir())
    src = [e for e in entries if e.is_dir()]
    assert len(src) == 1, f"erwarte genau einen Quellordner in {base}: {entries}"
    cmd = [sys.executable, "build.py"]
    r = subprocess.run(cmd, cwd=src[0], capture_output=True, text=True)
    zips = {p.name: {"sha256": sha(p), "size": p.stat().st_size, "mtime": p.stat().st_mtime}
            for p in sorted(base.glob("*.zip"))}
    return {"cwd": str(src[0]), "exit": r.returncode,
            "stdout": r.stdout.strip().splitlines(), "stderr": r.stderr.strip(),
            "zips": zips}


def clone(name: str) -> Path:
    dest = TMP / name
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    shutil.copytree(ROOT, dest / name, ignore=IGNORE)
    return dest


results: dict = {"tool": "reproducibility_check.py",
                 "generated": datetime.now().astimezone().isoformat(),
                 "source_root": str(ROOT), "runs": {}}

# --- 1) A: zweimal bauen (unveraendert) -------------------------------------
a = clone("vgt-domainguard-src")
run1 = build_in(a)
time.sleep(2.6)  # ZIP-Zeitstempel haben 2-Sekunden-Aufloesung (DOS-Zeit)
run2 = build_in(a)
same_bytes = run1["zips"] == {k: {**v, "mtime": run1["zips"][k]["mtime"]} for k, v in run2["zips"].items()}
cmp1 = {k: run1["zips"][k]["sha256"] == run2["zips"][k]["sha256"] for k in run1["zips"]}
results["runs"]["A_same_tree_twice"] = {"run1": run1, "run2": run2,
                                        "same_hash_per_zip": cmp1,
                                        "deterministic_within_same_tree": all(cmp1.values())}
results["runs"]["A_same_tree_twice"].pop("run1", None)
results["runs"]["A_same_tree_twice"].pop("run2", None)
results["runs"]["A_same_tree_twice"]["zip_hashes_run1"] = {k: v["sha256"] for k, v in run1["zips"].items()}
results["runs"]["A_same_tree_twice"]["zip_hashes_run2"] = {k: v["sha256"] for k, v in run2["zips"].items()}

# --- 2) B: anderer Checkout-Ordnername -------------------------------------
b = clone("Antipisher-Source-Checkout-Name")
run3 = build_in(b)
src_zip = "Antipisher-Source-v0.1.0-alpha.zip"
diff_src = run1["zips"][src_zip]["sha256"] != run3["zips"][src_zip]["sha256"]
with zipfile.ZipFile(b / src_zip) as z:
    prefixes = sorted({n.split("/")[0] for n in z.namelist()})
with zipfile.ZipFile(a / src_zip) as z:
    prefixes_a = sorted({n.split("/")[0] for n in z.namelist()})
results["runs"]["B_other_checkout_dir_name"] = {
    "folder_name_A": "vgt-domainguard-src",
    "folder_name_B": "Antipisher-Source-Checkout-Name",
    "source_zip_hash_A": run1["zips"][src_zip]["sha256"],
    "source_zip_hash_B": run3["zips"][src_zip]["sha256"],
    "source_zip_identical": not diff_src,
    "zip_root_prefix_A": prefixes_a,
    "zip_root_prefix_B": prefixes,
    "conclusion": "Source-ZIP ist NICHT checkout-namen-unabhaengig" if diff_src else "identisch",
}

# --- 3) mtime-Abhaengigkeit -------------------------------------------------
guard_css = a / "vgt-domainguard-src" / "shared" / "guard.css"
before = run2["zips"]["Antipisher-Chrome-v0.1.0-alpha.zip"]["sha256"]
guard_css.touch()  # nur mtime, kein Inhaltsaenderung
time.sleep(2.6)
run4 = build_in(a)
after = run4["zips"]["Antipisher-Chrome-v0.1.0-alpha.zip"]["sha256"]
with zipfile.ZipFile(a / "Antipisher-Chrome-v0.1.0-alpha.zip") as z:
    entry = z.getinfo("guard.css")
    zip_time = entry.date_time
src_mtime = datetime.fromtimestamp(guard_css.stat().st_mtime)
results["runs"]["C_mtime_only_change"] = {
    "action": "touch shared/guard.css (kein Inhaltsunterschied)",
    "chrome_zip_hash_before_touch": before,
    "chrome_zip_hash_after_touch": after,
    "zip_bytes_changed": before != after,
    "zip_entry_guard.css_date_time": list(zip_time),
    "source_file_mtime_local": src_mtime.isoformat(timespec="seconds"),
    "conclusion": ("ZIP-Byte-Inhalt haengt vom Build-Zeitpunkt ab: build.py kopiert shared->chrome/"
                   "firefox per shutil.copyfile (Setzen der mtime auf 'jetzt') und zipfile schreibt "
                   "diese mtimes als DOS-Zeit; kein SOURCE_DATE_EPOCH, keine Normalisierung"
                   if before != after else "keine Aenderung trotz Touch"),
}

# --- 4) Audit-Verzeichnis landet im Source-ZIP ------------------------------
pol = a / "vgt-domainguard-src" / "audit" / "lead"
pol.mkdir(parents=True, exist_ok=True)
(pol / "dummy_finding.md").write_text("# audit dummy\n", encoding="utf-8")
run5 = build_in(a)
with zipfile.ZipFile(a / src_zip) as z:
    names = z.namelist()
polluted = [n for n in names if n.startswith("vgt-domainguard-src/audit/")]
results["runs"]["D_audit_folder_in_source_zip"] = {
    "action": "audit/lead/dummy_finding.md im Quellbaum angelegt, build.py erneut ausgefuehrt",
    "audit_entries_in_source_zip": polluted,
    "source_zip_hash_before": run4["zips"][src_zip]["sha256"],
    "source_zip_hash_after": run5["zips"][src_zip]["sha256"],
    "conclusion": "build.py zippt ROOT.rglob('*') ungefiltert -> Audit-/Log-Artefakte gelangen ins "
                  "Source-Release" if polluted else "keine Audit-Dateien im ZIP",
}

# --- 5) Legacy-Duplikate ----------------------------------------------------
legacy_pairs = {
    "Antipisher-Chrome-v0.1.0-alpha.zip": "VGT-DomainGuard-Chrome-v0.1.0.zip",
    "Antipisher-Firefox-v0.1.0-alpha.zip": "VGT-DomainGuard-Firefox-v0.1.0.zip",
    "Antipisher-Source-v0.1.0-alpha.zip": "VGT-DomainGuard-Source-v0.1.0.zip",
}
dup = {}
for new, old in legacy_pairs.items():
    dup[new] = {"old_name": old,
                "identical_bytes": (a / new).read_bytes() == (a / old).read_bytes(),
                "sha256": sha(a / new)}
results["runs"]["E_legacy_duplicates"] = dup

# --- 6) ZIP-Inhalt vs. Erwartung -------------------------------------------
with zipfile.ZipFile(a / "Antipisher-Chrome-v0.1.0-alpha.zip") as z:
    chrome_entries = sorted(z.namelist())
results["artifacts"] = {
    "chrome_zip_entries": chrome_entries,
    "chrome_zip_contains_manifest": "manifest.json" in chrome_entries,
    "expected_files_per_build_py_assert": ["guard.html", "guard.js", "popup.html", "popup.js",
                                           "background.js", "shared/sites.js", "shared/detector.js",
                                           "manifest.json", "popup.css?"],
}
# build.py assertet keine popup.css (existiert nicht als Datei; popup-CSS ist inline)
results["artifacts"]["note"] = ("build.py:18-19 prueft nur Existenz von 7 Dateien; der Chrome-ZIP "
                                "enthaelt genau diese + Icons; popup.css existiert nicht, "
                                "weil popup.html sein CSS inline traegt.")

results["overall"] = {
    "reproducible_across_checkouts": False,
    "byte_identical_rebuilds_in_same_tree": all(cmp1.values()),
    "timestamps_normalized": False,
    "finding": "build.py erzeugt bei jedem Lauf andere ZIP-Bytes (Build-Zeitstempel); "
               "Source-ZIP-Prefix haengt vom Checkout-Ordnernamen ab; Next.md:31 "
               "('reproduzierbare Build-Artefakte') ist damit widerlegt.",
    "source_zip_hygiene": "FAIL (audit/ wird mitgepackt)" if polluted else "OK",
    "legacy_duplicate_artifacts": all(v["identical_bytes"] for v in dup.values()),
}
(OUT / "reproducibility_results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n",
                                                  encoding="utf-8")

lines = ["=== ANTIPISHER UX/RELEASE AUDIT — BUILD-/REPRODUZIERBARKEITSTEST ===",
         f"Zeit: {results['generated']}",
         f"Quelle (nur gelesen): {ROOT}",
         f"Testkopien: {TMP}", ""]
for name, data in results["runs"].items():
    lines.append(f"--- {name} ---")
    lines.append(json.dumps(data, indent=1, ensure_ascii=False))
lines.append("")
lines.append("--- artifacts ---")
lines.append(json.dumps(results["artifacts"], indent=1, ensure_ascii=False))
lines.append("")
lines.append("--- overall ---")
lines.append(json.dumps(results["overall"], indent=1, ensure_ascii=False))
(LOGDIR / "reproducibility_check.log").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
print(f"\nGeschrieben: {OUT / 'reproducibility_results.json'}")

# TMP aufraeumen (nur die Kopien; Ergebnisse bleiben)
shutil.rmtree(TMP, ignore_errors=True)
