// Service worker do Trato: a tela abre mesmo sem internet (os dados vêm da API, que precisa de conexão).
const CACHE = 'trato-v1';
const BASE = ['/', '/manifest.webmanifest', '/icone.svg', '/icone-192.png'];

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

  // navegação: tenta a rede (versão nova), cai no cache sem internet
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put('/', r.clone())); return r; }).catch(() => caches.match('/')));
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
