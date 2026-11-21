FROM node:26-alpine AS deps

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cms/package.json ./cms/package.json
RUN pnpm install --frozen-lockfile --filter cms...

FROM deps AS builder

COPY cms ./cms
RUN pnpm --filter cms build

FROM node:26-alpine AS runner

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/cms/node_modules ./cms/node_modules
COPY --from=builder /app/cms ./cms

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3001

RUN chown -R node:node /app
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/bot/healthz || exit 1

CMD ["pnpm", "--filter", "cms", "start"]
