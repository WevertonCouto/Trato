# Trato: API (Hono + SQLite) que também serve a landing, as páginas legais e o app web.
# Banco e fotos ficam em /data: monte um volume nesse caminho (senão somem a cada deploy).

# ferramentas para compilar módulos nativos (better-sqlite3 nem sempre tem binário pronto para o Node da imagem)
FROM node:22-bookworm-slim AS ferramentas
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./

# só as dependências de produção (vão para a imagem final)
FROM ferramentas AS deps
RUN npm ci --omit=dev --no-audit --no-fund

# build da tela (landing + app web) com todas as dependências
FROM ferramentas AS build
RUN npm ci --no-audit --no-fund
COPY . .
# o Vite embute estas variáveis na landing (Open Graph, sitemap e botão da loja)
ARG VITE_SITE_URL
ARG VITE_LINK_LOJA
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production API_PORT=4410 DATA_DIR=/data TZ=America/Sao_Paulo
COPY package.json package-lock.json tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY --from=build /app/web/dist ./web/dist
VOLUME /data
EXPOSE 4410
CMD ["npm", "start"]
