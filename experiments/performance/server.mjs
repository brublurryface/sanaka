import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWordPressFixture } from '../wordpress-fixture.mjs';

const root = fileURLToPath(new URL('../../dist/performance/browser', import.meta.url));
const fixture = createWordPressFixture({ largeCovers: true });
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
async function serve(req, res) {
  if (req.url.startsWith('/__audit/')) {
    req.url = req.url.slice('/__audit'.length);
    fixture.server.emit('request', req, res);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = resolve(root, `.${path}`);
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  let details = await stat(file).catch(() => null);
  if (!details?.isFile()) {
    if (extname(path)) {
      res.writeHead(404).end();
      return;
    }
    file = resolve(root, 'index.html');
    details = await stat(file);
  }
  const etag = `"${details.size}-${details.mtimeMs}"`;
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304).end();
    return;
  }
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  res.setHeader('Content-Length', details.size);
  if (req.method === 'HEAD') {
    res.writeHead(200).end();
    return;
  }
  createReadStream(file).pipe(res);
}
const portArgument = process.argv[process.argv.indexOf('--port') + 1];
const port = Number(process.env['PORT'] || (process.argv.includes('--port') ? portArgument : 5173));
createServer((req, res) => {
  serve(req, res).catch(() => res.writeHead(500).end());
}).listen(port, '0.0.0.0', () => console.log('Sanaka audit preview ready'));
