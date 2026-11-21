FROM node:26-alpine

WORKDIR /app

# pnpm via Corepack (fourni avec Node 26)
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copier les manifests du workspace pour tirer parti du cache Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cms/package.json ./cms/package.json
RUN pnpm install --frozen-lockfile --prod --filter iamfabriceg-bot-discord...

COPY --chown=node:node src ./src

USER node

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "src/index.js"]
