#!/usr/bin/env python3
"""Audit probe 09 — unabhängiger statischer Scan (Python, offline, nichtdestruktiv).

Zweite, von Node unabhängige Implementierung für Sink-/Netzwerk-/Secret-/Release-
Inventar. Ergänzt die Node-/Mock-Probes (Triangulation, VGT-097 teilweise).
Exit 0 = Scan vollständig ausgeführt.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "results" / "static_scan.json"

TEXT_EXT = {".js", ".cjs", ".html", ".css", ".json", ".py", ".md", ".txt"}
SKIP_DIRS = {"audit", "__pycache__", ".git", "node_modules"}

PATTERNS = {
    "network_fetch": r"\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|WebTransport)\s*\(",
    "eval_like": r"\b(eval|Function)\s*\(|new\s+Function\b",
    "html_sinks": r"\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|document\.writeln)\b",
    "dom_url_sinks": r"(location\.(href|replace|assign)|window\.(open|location)|redirectUrl|regexSubstitution|tabs\.(update|create)|openOrFocus)",
    "code_imports": r"\b(require|import)\s*\(\s*['\"]([^'\"]+)['\"]",
    "storage_access": r"(?:chrome|browser|api)\.storage\.local\.(get|set|remove|clear)\s*\(",
    "runtime_message": r"runtime\.(onMessage|sendMessage)",
    "webrequest": r"webRequest\.(onBeforeRequest|onBeforeSendHeaders|onHeadersReceived)",
    "dnr": r"declarativeNetRequest\.[A-Za-z]+",
    "tab_access": r"tabs\.(get|getCurrent|update|query|create)",
    "dangerous_shell": r"\b(child_process|execSync|spawnSync|execFile|os\.system|subprocess)\b",
    "file_io": r"\b(fs\.(read|write|unlink|rename|copy)|shutil\.|open\()",
}
SECRET_PATTERNS = {
    "aws_access_key": r"AKIA[0-9A-Z]{16}",
    "github_token": r"gh[pousr]_[A-Za-z0-9]{20,}",
    "slack_token": r"xox[baprs]-[A-Za-z0-9-]{10,}",
    "google_api_key": r"AIza[0-9A-Za-z_-]{30,}",
    "openai_key": r"sk-[A-Za-z0-9]{20,}",
    "private_key_block": r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "jwt": r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
}
RELEASE_CONFIG_NAMES = [
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    ".gitlab-ci.yml", "Jenkinsfile", "Dockerfile", "Makefile",
    ".pre-commit-config.yaml", "requirements.txt", "pyproject.toml",
]
CI_DIRS = [".github/workflows", ".gitlab", ".circleci"]


def iter_files(root: Path):
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.relative_to(root).parts):
            continue
        yield p


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def main() -> int:
    inventory = []
    hits: dict[str, list[dict]] = {k: [] for k in PATTERNS}
    secrets: list[dict] = []
    external_urls: list[dict] = []
    todos: list[dict] = []
    for p in iter_files(ROOT):
        rel = p.relative_to(ROOT).as_posix()
        data = p.read_bytes()
        inventory.append({"path": rel, "size": p.stat().st_size, "sha256": sha256(p)})
        if p.suffix.lower() not in TEXT_EXT:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for name, pat in PATTERNS.items():
                if re.search(pat, line):
                    hits[name].append({"file": rel, "line": i, "code": line.strip()[:220]})
            for name, pat in SECRET_PATTERNS.items():
                if re.search(pat, line):
                    secrets.append({"file": rel, "line": i, "pattern": name})
            for m in re.finditer(r"https?://[^\s'\"<>)]+", line):
                external_urls.append({"file": rel, "line": i, "url": m.group(0)[:200]})
            for m in re.finditer(r"\b(TODO|FIXME|XXX|HACK|SECURITY-NOTE)\b", line):
                todos.append({"file": rel, "line": i, "marker": m.group(1), "code": line.strip()[:200]})

    # Manifest-Inventar
    manifests = {}
    for browser in ("chrome", "firefox"):
        mp = ROOT / browser / "manifest.json"
        manifests[browser] = json.loads(mp.read_text(encoding="utf-8")) if mp.exists() else None

    def manifest_summary(m):
        if not m:
            return None
        return {
            "manifest_version": m.get("manifest_version"),
            "version": m.get("version"),
            "permissions": sorted(m.get("permissions", [])),
            "host_permissions": sorted(m.get("host_permissions", [])),
            "web_accessible_resources": m.get("web_accessible_resources", []),
            "externally_connectable": m.get("externally_connectable"),
            "content_security_policy": m.get("content_security_policy"),
            "background": m.get("background"),
            "minimum_chrome_version": m.get("minimum_chrome_version"),
            "gecko": ((m.get("browser_specific_settings") or {}).get("gecko") or None),
        }

    # Inline-Skripte / Handler / Remote-Refs in HTML
    html_report = []
    for p in iter_files(ROOT):
        if p.suffix.lower() != ".html":
            continue
        rel = p.relative_to(ROOT).as_posix()
        text = p.read_text(encoding="utf-8", errors="replace")
        inline_scripts = len(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?</script>", text, re.I))
        inline_handlers = re.findall(r"\son(?:error|load|click|submit|mouseover)\s*=", text, re.I)
        remote = re.findall(r"(?:src|href)\s*=\s*['\"](https?://[^'\"]+)['\"]", text, re.I)
        html_report.append({"file": rel, "inline_scripts": inline_scripts, "inline_handlers": len(inline_handlers), "remote_refs": remote})

    # Release-/Supply-Chain-Inventar
    present_release_files = [n for n in RELEASE_CONFIG_NAMES if (ROOT / n).exists()]
    present_ci_dirs = [d for d in CI_DIRS if (ROOT / d).exists()]
    vcs_present = (ROOT / ".git").exists()
    lockfiles = [p.relative_to(ROOT).as_posix() for p in iter_files(ROOT) if p.name in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "requirements.txt"}]

    # Version-Konsistenz
    def find_version(path: str) -> str | None:
        f = ROOT / path
        if not f.exists():
            return None
        m = re.search(r"0\.1\.0", f.read_text(encoding="utf-8", errors="replace"))
        return m.group(0) if m else None

    version_claims = {p: find_version(p) for p in ["README.md", "Next.md", "chrome/manifest.json", "firefox/manifest.json", "SECURITY.md"]}

    result = {
        "probe": "probe09_static_scan",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version.split()[0],
        "root": str(ROOT),
        "file_count": len(inventory),
        "inventory": inventory,
        "sink_hits": hits,
        "secret_pattern_hits": secrets,
        "external_url_occurrences": external_urls,
        "todo_markers": todos,
        "html_report": html_report,
        "manifests": {b: manifest_summary(m) for b, m in manifests.items()},
        "supply_chain": {
            "vcs_present": vcs_present,
            "release_config_present": present_release_files,
            "ci_dirs_present": present_ci_dirs,
            "lockfiles": lockfiles,
            "sbom_present": any((ROOT / n).exists() for n in ["sbom.json", "bom.json", "SBOM.md"]),
        },
        "version_claims": version_claims,
        "license_present": (ROOT / "LICENSE").exists(),
        "license_size": (ROOT / "LICENSE").stat().st_size if (ROOT / "LICENSE").exists() else 0,
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[probe09] Dateien={len(inventory)} secrets={len(secrets)} external_urls={len(external_urls)} todos={len(todos)}")
    for k, v in hits.items():
        print(f"  hit[{k}]={len(v)}")
    print(f"[probe09] supply_chain={json.dumps(result['supply_chain'])}")
    print(f"[probe09] report: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
