const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DOCS = __dirname;
const PROJECT = path.resolve(DOCS, '..');
const NOJS_BUILD = path.resolve(PROJECT, '..', 'NoJS', 'dist', 'iife', 'no.js');

const CDN_PATTERN = /https:\/\/cdn\.no-js\.dev\//g;
const LOCAL_SCRIPT = '/__local__/no.js';

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.map':  'application/json',
  '.md':   'text/markdown',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // ── Serve local NoJS build at /__local__/no.js ──
  if (url === LOCAL_SCRIPT) {
    if (!fs.existsSync(NOJS_BUILD)) {
      console.log(`  ✗ NoJS build not found → run "node build.js" in the NoJS project`);
      res.writeHead(404);
      res.end('NoJS build not found. Run "node build.js" in the NoJS project first.');
      return;
    }
    console.log(`  ⚡ serving local build → ${path.relative(PROJECT, NOJS_BUILD)}`);
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(NOJS_BUILD).pipe(res);
    return;
  }

  // ── SPA fallback: any extensionless path → index.html ──
  let filePath = path.join(DOCS, url === '/' ? 'index.html' : url);
  if (!path.extname(url)) filePath = path.join(DOCS, 'index.html');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);

    // ── For HTML files: rewrite CDN URL → local path on-the-fly ──
    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) { res.writeHead(500); res.end('Error'); return; }
        const rewritten = html.replace(CDN_PATTERN, LOCAL_SCRIPT);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rewritten);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🚀 No.JS LSP Docs — http://localhost:${PORT}`);
  console.log(`  ⚡ cdn.no-js.dev → local build (on-the-fly rewrite)`);
  console.log(`  📁 ${NOJS_BUILD}\n`);
});
