import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { carregarSessao, nativo } from './plataforma.ts';
import { prepararSons } from './sons.ts';
import './styles.css';

prepararSons();

// no app nativo a sessão fica guardada no aparelho: lê antes de desenhar
carregarSessao().finally(() => createRoot(document.getElementById('root')!).render(<App />));

// o service worker é só da versão web (PWA); no app nativo os arquivos já vêm dentro do pacote
if (!nativo && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    // versões antigas registravam o SW na raiz (/); agora o app mora em /app/ e a raiz é a landing
    for (const r of await navigator.serviceWorker.getRegistrations().catch(() => [])) {
      if (new URL(r.scope).pathname === '/') r.unregister();
    }
    navigator.serviceWorker.register('/sw.js', { scope: '/app/' }).catch(() => {});
  });
}
