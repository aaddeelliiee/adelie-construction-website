import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT || 4174);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.pdf':'application/pdf' };

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  // Exercise the generated production redirect destinations in local previews too.
  const redirectFile = path.join(root, '_redirects');
  const redirects = new Map(fs.readFileSync(redirectFile, 'utf8').split(/\r?\n/)
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => { const [from, to] = line.trim().split(/\s+/); return [from.replace(/\/+$/, ''), to]; }));
  const redirect = redirects.get(pathname.replace(/\/+$/, ''));
  if (redirect) {
    response.writeHead(301, { Location: redirect });
    response.end();
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404, { 'Content-Type':'text/html; charset=utf-8' });
    response.end(fs.readFileSync(path.join(root, '404.html')));
    return;
  }
  response.writeHead(200, { 'Content-Type':types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/`));
