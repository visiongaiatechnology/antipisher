"""Lokaler, nichtdestruktiver Testserver fuer den Chrome-E2E-Audit von Antipisher 0.1.
Nur 127.0.0.1:8765, keine externen Ziele, keine Produktivdaten."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

SAFE = b"""<!doctype html><html lang="de"><body style="background:#0b3d33;color:#fff;font:28px system-ui;padding:40px">
<h1>SAFE PAGE</h1><p id="u"></p>
<script>document.getElementById('u').textContent='URL='+location.href;</script>
</body></html>"""

DELAY = b"""<!doctype html><html lang="de"><body style="background:#123;color:#fff;font:26px system-ui;padding:40px">
<h1>DELAY WRAPPER</h1><p id="s"></p>
<script>
const to = new URLSearchParams(location.search).get('to') || '/';
document.getElementById('s').textContent='NAVIGIERE ZU: '+to;
setTimeout(function(){ location.href = to; }, 1200);
</script>
</body></html>"""

POSTPAGE = b"""<!doctype html><html lang="de"><body style="background:#123;color:#fff;font:26px system-ui;padding:40px">
<h1>POST TEST PAGE</h1>
<form id="f" method="POST" action="http://paypa1.test:8765/ziel"><input name="x" value="1"></form>
<script>setTimeout(function(){ document.getElementById('f').submit(); }, 400);</script>
</body></html>"""

LANDED = b"""<!doctype html><html lang="de"><body style="background:#7a0011;color:#fff;font:34px system-ui;padding:40px">
<h1>POST LANDED - KEINE WARNSEITE</h1>
<p>Die als Phishing klassifizierte Hauptdokument-Navigation per POST wurde ohne Guard ausgeliefert.</p>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, body):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/delay.html":
            self._send(DELAY)
        elif path == "/post.html":
            self._send(POSTPAGE)
        else:
            self._send(SAFE)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length:
            self.rfile.read(length)
        self._send(LANDED)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
