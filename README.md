# Trato

Rotina das crianças com missões, moedinhas e um pet que cresce junto. É um app web instalável (PWA).

- **Responsável:** tem conta com e-mail e senha, e uma área protegida por PIN no aparelho. Lá ele cria as missões, as recompensas e os perfis, e aprova as fotos e os pedidos.
- **Criança:** entra tocando no próprio perfil, que pode ter PIN. Ela faz as missões do dia, ganha pontos e moedinhas, cuida do pet e pede prêmios.

## Rodar

```bash
npm install
cp .env.example .env
npm run dev        # API em :4410 e tela (Vite) em :5180
```

Para produção, `npm run build` e depois `npm start`. A própria API serve a tela que fica em `web/dist`.

Se mudar `web/public/icone.svg`, gere de novo os PNGs do PWA com `npm run icones`.

## Estrutura

- `src/server`: API em Hono e SQLite (better-sqlite3).
  - `auth.ts`: cookies de conta, adulto e perfil.
  - `crianca.ts`: rotas `/api/eu/*`.
  - `responsavel.ts`: rotas `/api/adulto/*`.
  - `rotina.ts`: situação das tarefas, pontos, sequência de dias e conquistas.
- `src/shared/regras.ts`: níveis do pet, espécies, conquistas e recorrência. Servidor e tela usam o mesmo arquivo.
- `web/src`: React.
  - `views/`: telas.
  - `pet.tsx`: mascotes em SVG.
  - `ui.tsx`: ícones e componentes.
- `web/public`: manifest, service worker e ícones.

## Conta de teste (só no dev local)

- E-mail: `teste@trato.test`
- Senha: `trato12345`
- PIN do responsável: `1234`
