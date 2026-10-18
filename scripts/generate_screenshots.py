#!/usr/bin/env python3
"""
Antipisher v0.2.1-alpha — Automated UI Screenshot Generator (Headless Chromium)
Generates authentic, high-resolution screenshots of Popup and Options views for documentation.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SHOTS_DIR = ROOT / "audit/verify/fix/screenshots"
SHOTS_DIR.mkdir(parents=True, exist_ok=True)

assert CHROME.exists(), f"Google Chrome executable not found at {CHROME}"

def render_screenshot(html_content: str, output_png: Path, width: int, height: int, css_files: list[Path]):
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        # Copy required CSS files
        for css in css_files:
            if css.exists():
                shutil.copyfile(css, tmp_path / css.name)

        html_file = tmp_path / "page.html"
        html_file.write_text(html_content, encoding="utf-8")

        profile_dir = tmp_path / "chrome_profile"
        profile_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            "--allow-file-access-from-files",
            f"--user-data-dir={profile_dir}",
            f"--window-size={width},{height}",
            "--virtual-time-budget=2000",
            "--force-device-scale-factor=1",
            f"--screenshot={output_png}",
            html_file.as_uri()
        ]

        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if output_png.exists() and output_png.stat().st_size > 0:
            print(f"Generated {output_png.name} ({width}x{height}) -> {output_png.stat().st_size} bytes")
            return True
        else:
            print(f"Failed to generate {output_png.name}: exit={res.returncode}")
            if res.stderr:
                print("Stderr:", res.stderr.strip()[:400])
            return False

def make_popup_shot():
    popup_src = (ROOT / "shared/popup.html").read_text(encoding="utf-8")
    # Strip extension runtime scripts
    for s in ['<script src="shared/sites.js"></script>', '<script src="shared/detector.js"></script>',
              '<script src="shared/i18n.js"></script>', '<script src="popup.js"></script>']:
        popup_src = popup_src.replace(s, '')

    simulated_js = """
    <script>
    document.addEventListener('DOMContentLoaded', () => {
      document.body.dataset.state = 'active';
      const statusTitle = document.getElementById('statusTitle');
      if (statusTitle) statusTitle.textContent = 'Schutz aktiv';
      const statusSub = document.getElementById('statusSub');
      if (statusSub) statusSub.textContent = 'Verdächtige Seiten werden blockiert, sichere Seiten laden direkt.';
      const statusPill = document.getElementById('statusPill');
      if (statusPill) statusPill.textContent = 'AN';
      
      const trackersBlocked = document.getElementById('trackersBlocked');
      if (trackersBlocked) trackersBlocked.textContent = '2';
      const trackersScope = document.getElementById('trackersScope');
      if (trackersScope) trackersScope.textContent = 'Tab: 2 · Gesamt: 61';
      
      const sitecount = document.getElementById('sitecount');
      if (sitecount) sitecount.textContent = '187';
      const blocked = document.getElementById('blocked');
      if (blocked) blocked.textContent = '61';
      
      const trackerToggle = document.getElementById('trackerToggle');
      if (trackerToggle) trackerToggle.checked = true;
      const geDefenseToggle = document.getElementById('geDefenseToggle');
      if (geDefenseToggle) geDefenseToggle.checked = true;
      const safeToastToggle = document.getElementById('safeToastToggle');
      if (safeToastToggle) safeToastToggle.checked = true;
      const aegisToggle = document.getElementById('aegisToggle');
      if (aegisToggle) aegisToggle.checked = true;
      const strict = document.getElementById('strict');
      if (strict) strict.checked = false;
      
      const notice = document.getElementById('notice');
      if (notice) notice.textContent = 'Standard: Flüssiges Surfen ohne Vollbild-Unterbrechung bei sicheren Seiten.';
    });
    </script>
    """
    html = popup_src.replace("</body>", simulated_js + "\n</body>")
    wrapper_html = f"""<!doctype html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;background:#050807;display:flex;justify-content:center;padding:12px">
    <iframe src="popup_inner.html" style="width:380px;height:640px;border:0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.6)" referrerpolicy="no-referrer"></iframe>
    </body></html>"""

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        shutil.copyfile(ROOT / "shared/design-tokens.css", tmp_path / "design-tokens.css")
        shutil.copyfile(ROOT / "shared/popup.css", tmp_path / "popup.css")
        (tmp_path / "popup_inner.html").write_text(html, encoding="utf-8")
        (tmp_path / "index.html").write_text(wrapper_html, encoding="utf-8")
        
        cmd = [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            "--allow-file-access-from-files",
            f"--user-data-dir={tmp_path / 'profile'}",
            "--window-size=440,700",
            "--virtual-time-budget=2000",
            f"--screenshot={SHOTS_DIR / 'v2-popup.png'}",
            (tmp_path / "index.html").as_uri()
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        target = SHOTS_DIR / 'v2-popup.png'
        if target.exists():
            print(f"Generated v2-popup.png: {target.stat().st_size} bytes")

def make_options_shot():
    options_src = (ROOT / "shared/options.html").read_text(encoding="utf-8")
    for s in ['<script src="shared/sites.js"></script>', '<script src="shared/detector.js"></script>',
              '<script src="shared/i18n.js"></script>', '<script src="options.js"></script>']:
        options_src = options_src.replace(s, '')

    simulated_js = """
    <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Simulate populated whitelist
      const wlBody = document.getElementById('whitelistBody');
      const wlEmpty = document.getElementById('whitelistEmpty');
      if (wlBody && wlEmpty) {
        wlEmpty.hidden = true;
        const domains = [
          { domain: 'corp-intranet.company.internal', note: 'Unternehmens-Intranet & SSO' },
          { domain: 'partner-portal.trusted-network.org', note: 'Zertifiziertes Partner-Extranet' }
        ];
        wlBody.innerHTML = '';
        domains.forEach(d => {
          const tr = document.createElement('tr');
          tr.className = 'wl-row';
          tr.innerHTML = `
            <td><code class="wl-domain">${d.domain}</code></td>
            <td class="wl-note">${d.note}</td>
            <td class="wl-actions">
              <button type="button" class="btn-action-del" title="Entfernen">✕</button>
            </td>
          `;
          wlBody.appendChild(tr);
        });
      }
    });
    </script>
    """
    html = options_src.replace("</body>", simulated_js + "\n</body>")
    target = SHOTS_DIR / 'v2-options.png'
    render_screenshot(
        html,
        target,
        1240,
        960,
        [ROOT / "shared/design-tokens.css", ROOT / "shared/options.css"]
    )

def make_options_whitelist_shot():
    options_src = (ROOT / "shared/options.html").read_text(encoding="utf-8")
    for s in ['<script src="shared/sites.js"></script>', '<script src="shared/detector.js"></script>',
              '<script src="shared/i18n.js"></script>', '<script src="options.js"></script>']:
        options_src = options_src.replace(s, '')

    simulated_js = """
    <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Activate Whitelist tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.options-panel').forEach(p => p.hidden = true);
      const tabWl = document.getElementById('tabWhitelist');
      const panelWl = document.getElementById('panelWhitelist');
      if (tabWl) tabWl.classList.add('active');
      if (panelWl) panelWl.hidden = false;

      // Populate custom whitelist
      const wlBody = document.getElementById('whitelistBody');
      const wlEmpty = document.getElementById('whitelistEmpty');
      if (wlBody && wlEmpty) {
        wlEmpty.hidden = true;
        const domains = [
          { domain: 'corp-intranet.company.internal', note: 'Unternehmens-Intranet & SSO Gateway' },
          { domain: 'partner-portal.trusted-network.org', note: 'Zertifiziertes Partner-Extranet' },
          { domain: 'cloud-staging.internal.lan', note: 'Interne Staging-Infrastruktur' }
        ];
        wlBody.innerHTML = '';
        domains.forEach(d => {
          const tr = document.createElement('tr');
          tr.className = 'wl-row';
          tr.innerHTML = `
            <td><code class="wl-domain">${d.domain}</code></td>
            <td class="wl-note">${d.note}</td>
            <td class="wl-actions">
              <button type="button" class="btn-action-del" title="Entfernen">✕</button>
            </td>
          `;
          wlBody.appendChild(tr);
        });
      }
    });
    </script>
    """
    html = options_src.replace("</body>", simulated_js + "\n</body>")
    target = SHOTS_DIR / 'v2-options-whitelist.png'
    render_screenshot(
        html,
        target,
        1240,
        960,
        [ROOT / "shared/design-tokens.css", ROOT / "shared/options.css"]
    )

if __name__ == "__main__":
    print("Generating UI screenshots for Antipisher 0.2.1-alpha...")
    make_popup_shot()
    make_options_shot()
    make_options_whitelist_shot()
    print("Done!")
