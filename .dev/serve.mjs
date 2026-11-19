// Tiny static server for the preview build (npm run serve uses `serve`; this has no dependencies).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.otf': 'font/otf', '.json': 'application/json' };
http.createServer((req, res) => {
  // dev only: lets a test page save screenshots into .dev/shots
  if (req.method === 'POST' && req.url.startsWith('/__upload')) { const n = []; req.on('data', (c) => n.push(c)); req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ url: 'http://localhost:4173/assets/jumper-hero.jpg?up=' + Buffer.concat(n).length })); }); return; }
  if (req.method === 'POST' && req.url.startsWith('/__save')) {
    const name = new URL(req.url, 'http://x').searchParams.get('name').replace(/[^\w.-]/g, '');
    const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => { fs.mkdirSync(path.resolve(dir, '../.dev/shots'), { recursive: true }); fs.writeFileSync(path.resolve(dir, '../.dev/shots', name), Buffer.from(Buffer.concat(chunks).toString().split(',')[1], 'base64')); res.end('ok'); });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // the store's own page URLs, mapped onto the preview's files
  const alias = { '/pages/about': '/about.html', '/pages/contact': '/contact.html', '/pages/privacy-policy': '/privacy.html', '/collections/all': '/collection.html', '/collections': '/collections.html', '/cart': '/cart.html', '/search': '/search.html', '/account': '/account.html', '/account/login': '/login.html', '/account/register': '/register.html' };
  if (alias[p.replace(/\/$/, '')]) p = alias[p.replace(/\/$/, '')];
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, path.normalize(p));
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(path.join(dir, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 4173);
