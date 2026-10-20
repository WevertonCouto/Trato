// Service worker do app web do Trato (escopo /app/): a tela abre mesmo sem internet (os dados vêm da API).
// A landing (/) e as páginas legais ficam fora do escopo e sempre vêm da rede.
const CACHE = 'trato-v2';
const BASE = ['/app/', '/manifest.webmanifest', '/icone.svg', '/icone-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // navegação do app: tenta a rede (versão nova), cai no cache sem internet
  if (req.mode === 'navigate') {
    if (!url.pathname.startsWith('/app')) return;
    e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('/app/', copia)); return r; }).catch(() => caches.match('/app/')));
    return;
  }
  // arquivos (js, css, fontes, ícones): cache primeiro, atualiza por trás
  if (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const salvo = await c.match(req);
      const rede = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => salvo);
      return salvo || rede;
    }));
  }
});
