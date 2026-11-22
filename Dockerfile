FROM node:26-alpine AS deps

WORKDIR /app

# pnpm n'est nécessaire qu'au build (Corepack n'est plus fourni avec Node 26).
RUN npm install -g pnpm@10.15.0

# Copier les manifests du workspace pour tirer parti du cache Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cms/package.json ./cms/package.json
RUN pnpm install --frozen-lockfile --prod --filter iamfabriceg-bot-discord...

FROM node:26-alpine AS runner

WORKDIR /app

# Le bot démarre avec `node`, aucun binaire pnpm n'est nécessaire à l'exécution.
COPY --from=deps --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node src ./src

USER node

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "src/index.js"]
