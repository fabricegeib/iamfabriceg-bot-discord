FROM node:26-alpine AS deps

WORKDIR /app
# Corepack n'est plus fourni avec Node 26 : on installe pnpm via npm.
RUN npm install -g pnpm@10.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cms/package.json ./cms/package.json
RUN pnpm install --frozen-lockfile --filter cms...

FROM deps AS builder

COPY cms ./cms
RUN pnpm --filter cms build

# L'image runtime ne contient ni pnpm ni sources TypeScript : on compile le seed
# en un seul fichier. sharp reste externe (binaire natif déjà tracé par Next).
RUN ESBUILD=$(find /app/node_modules/.pnpm -path '*/esbuild/bin/esbuild' -type f | head -1) && \
    "$ESBUILD" /app/cms/src/seed.ts \
      --bundle --platform=node --format=esm --external:sharp \
      --banner:js='import{createRequire as __seedRequire}from "node:module";const require=__seedRequire(import.meta.url);' \
      --outfile=/app/cms/.next/standalone/cms/seed.mjs && \
    readlink /app/cms/node_modules/sharp > /app/cms/.next/standalone/cms/.sharp-link

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Sortie "standalone" de Next : serveur + seules dépendances tracées (~116 Mo)
# au lieu de 1,1 Go de node_modules complets.
COPY --from=builder --chown=node:node /app/cms/.next/standalone ./
COPY --from=builder --chown=node:node /app/cms/.next/static ./cms/.next/static
# Le seed compilé importe sharp : on recrée son lien pnpm (COPY d'un symlink
# le déréférencerait et casserait la résolution de ses dépendances natives).
RUN mkdir -p /app/cms/node_modules /app/cms/public && \
    ln -s "$(cat /app/cms/.sharp-link)" /app/cms/node_modules/sharp && \
    rm /app/cms/.sharp-link && \
    chown node:node /app/cms/node_modules /app/cms/public

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/bot/healthz || exit 1

CMD ["node", "cms/server.js"]
