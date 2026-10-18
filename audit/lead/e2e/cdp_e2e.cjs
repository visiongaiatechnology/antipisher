/* Chrome-E2E-Audit fuer Antipisher 0.1 ohne --load-extension:
 * startet Chrome 155 headless mit Remote-Debugging und laedt die Extension
 * per CDP Extensions.loadUnpacked. Nichtdestruktiv, nur lokale Ziele (127.0.0.1 / paypa1.test MAP).
 * Ergebnis: audit/lead/e2e/e2e_results.json + Screenshots.
 */
'use strict';
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXT = path.resolve(__dirname, '..', '..', '..', 'chrome');
const OUT = path.resolve(__dirname, '..', 'screenshots');
const DEBUG_PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { started: new Date().toISOString(), steps: [], screenshots: [] };

const SAFE = `<!doctype html><html><body style="background:#0b3d33;color:#fff;font:28px system-ui;padding:40px">
<h1>SAFE PAGE</h1><p id="u"></p><script>document.getElementById('u').textContent='URL='+location.href;</script></body></html>`;
const DELAY = `<!doctype html><html><body style="background:#123;color:#fff;font:26px system-ui;padding:40px">
<h1>DELAY WRAPPER</h1><script>const to=new URLSearchParams(location.search).get('to')||'/';setTimeout(()=>{location.href=to},1200);</script></body></html>`;
const POSTPAGE = `<!doctype html><html><body style="background:#123;color:#fff;font:26px system-ui;padding:40px">
<h1>POST TEST PAGE</h1><form id="f" method="POST" action="http://paypa1.test:8765/ziel"><input name="x" value="1"></form>
<script>setTimeout(()=>document.getElementById('f').submit(),500);</script></body></html>`;
const LANDED = `<!doctype html><html><body style="background:#7a0011;color:#fff;font:34px system-ui;padding:40px">
<h1>POST LANDED - KEINE WARNSEITE</h1></body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method === 'POST') { req.resume(); res.end(LANDED); return; }
  if (req.url.startsWith('/post.html')) { res.end(POSTPAGE); return; }
  if (req.url.startsWith('/delay.html')) { res.end(DELAY); return; }
  res.end(SAFE);
});
server.listen(8765, '127.0.0.1');

async function main() {
  const profile = path.join(require('node:os').tmpdir(), 'vgt-cdp-' + Date.now());
  fs.mkdirSync(profile, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--remote-debugging-port=' + DEBUG_PORT, '--remote-allow-origins=*',
    '--host-resolver-rules=MAP paypa1.test 127.0.0.1', '--window-size=1000,1200',
    '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); }
    catch { await sleep(250); }
  }
  if (!version) throw new Error('CDP nicht erreichbar');
  results.browser = version.Browser;

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, m => m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result));
    ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  let extensionLoaded = false;
  try {
    const r = await send('Extensions.loadUnpacked', { path: EXT });
    results.extensionLoad = { method: 'Extensions.loadUnpacked', result: r, ok: true };
    extensionLoaded = true;
  } catch (e) {
    results.extensionLoad = { method: 'Extensions.loadUnpacked', error: String(e.message), ok: false };
  }
  await sleep(2000);

  async function visit(url, waitMs = 4000) {
    const { targetId } = await send('Target.createTarget', { url });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await sleep(waitMs);
    let info = null;
    try {
      const r = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({href:location.href,title:document.title,text:(document.body&&document.body.innerText)?document.body.innerText.slice(0,400):""})',
        returnByValue: true
      }, sessionId);
      info = JSON.parse(r.result.value);
    } catch (e) { info = { error: String(e.message) }; }
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const name = 'cdp-' + results.screenshots.length + '-' + url.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) + '.png';
      fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
      results.screenshots.push(name);
      info.screenshot = name;
    } catch (e) { info.screenshotError = String(e.message); }
    await send('Target.closeTarget', { targetId }).catch(() => {});
    results.steps.push({ url, info });
    return info;
  }

  if (extensionLoaded) {
    await visit('http://paypa1.test/');
    await visit('http://127.0.0.1:8765/#frag42');
    await visit('http://127.0.0.1:8765/delay.html?to=' + encodeURIComponent('http://127.0.0.1:8765/post.html'), 7000);
  } else {
    await visit('http://paypa1.test/', 2500);
  }

  results.ok = extensionLoaded;
  fs.writeFileSync(path.join(__dirname, 'e2e_results.json'), JSON.stringify(results, null, 2));
  try { ws.close(); } catch {}
  chrome.kill();
  server.close();
  console.log(JSON.stringify({ extensionLoad: results.extensionLoad, ok: results.ok, steps: results.steps.map(s => ({ url: s.url, href: s.info.href, title: s.info.title, text: (s.info.text || '').slice(0, 160), screenshot: s.info.screenshot })) }, null, 2));
}

main().catch(e => { console.error('E2E FEHLER:', e && e.stack || e); try { server.close(); } catch {} process.exitCode = 1; });
