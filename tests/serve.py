#!/usr/bin/env python3
"""Test-Webserver: liefert das Projekt aus und lädt in jede HTML-Seite die Beispieldaten für Tests (tests/fixtures/demo-seed.js).
Start: python3 tests/serve.py [Port]   (Standard 8765, Projektordner = Ordner über tests/)"""
import http.server, socketserver, sys, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); os.chdir(ROOT)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
INJECT = b'<script src="/tests/fixtures/demo-seed.js"></script>'
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        path = self.translate_path(self.path.split('?')[0])
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if path.endswith('.html') and os.path.isfile(path):
            data = open(path, 'rb').read(); i = data.find(b'<script')
            data = data[:i] + INJECT + data[i:] if i >= 0 else data + INJECT
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data); return
        return super().do_GET()
socketserver.TCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer(('', PORT), H).serve_forever()
