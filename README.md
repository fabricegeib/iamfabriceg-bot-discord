# iamfabriceg Bot

Bot Discord personnel de [iamfabriceg](https://iamfabriceg.xyz), écrit en **CommonJS** avec **discord.js 14**.

> Version modernisée (novembre 2026) : Node 26, pnpm, Docker dev/prod, interactions slash, APIs externes,
> catalogue de 17 jeux, **Payload CMS v3 + MongoDB** (admin complet + front public), Twitch EventSub,
> modération et monitoring.
>
> Voir [`docs/NOMENCLATURE.md`](./docs/NOMENCLATURE.md) pour le nommage, [`PLAN.md`](./PLAN.md) pour le plan,
> et [`docs/PAYLOAD.md`](./docs/PAYLOAD.md), [`docs/CMS.md`](./docs/CMS.md), [`docs/TWITCH.md`](./docs/TWITCH.md) pour les intégrations.

## ⚠️ Contraintes en vigueur

- `backup/` est **lecture seule** : aucun fichier n'y est supprimé, déplacé ou modifié.
- Le token Discord actuel est **conservé** (pas de rotation pour le moment).
- Les secrets ne sont jamais versionnés : tout est dans `.env` (ignoré par Git).

## Prérequis

- **Node.js 26 LTS** (minimum 22.12) — images Docker `node:26-alpine`.
- **pnpm 10.15.0** via Corepack : `corepack enable && corepack prepare pnpm@10.15.0 --activate`.
- **Docker Engine 29+** et **Compose v5+** pour les environnements conteneurisés.
- Un serveur Discord avec le bot invité avec les permissions minimales (voir `/permissions`).

## Installation rapide (local, sans Docker)

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env          # renseigner DISCORD_TOKEN, CLIENT_ID, GUILD_ID et les secrets CMS
corepack pnpm cms:seed        # génère la clé API du bot + quelques données de base
corepack pnpm deploy          # déploie les commandes sur GUILD_ID (test)
corepack pnpm dev             # bot (port 3000)
corepack pnpm cms:dev         # CMS (port 3001) — dans un second terminal
corepack pnpm send:roles
```

MongoDB doit être accessible sur `mongodb://127.0.0.1:27017/iamfabriceg_bot` (fourni par `pnpm docker:dev`).

Déploiement global des commandes (prod, propagation jusqu'à 1 h) :

```bash
corepack pnpm deploy -- --global
```

## Développement avec Docker

```bash
corepack pnpm docker:dev
# ou : docker compose -f docker-compose.dev.yml up -d
```

| Service | URL | Rôle |
|---|---|---|
| `bot` | http://localhost:3000/healthz | Bot Discord + webhooks |
| `cms` | http://localhost:3001/admin | Admin Payload |
| `cms` | http://localhost:3001/ | Front public (lecture seule) |
| `mongo` | localhost:27017 | Base MongoDB |

Le code est monté depuis l'hôte : les modifications sont visibles immédiatement (hot reload pour le CMS,
redémarrage manuel du bot). Arrêt : `corepack pnpm docker:dev:down`.

## Production avec Docker

```bash
corepack pnpm docker:prod
# ou : docker compose -f docker-compose.prod.yml up -d --build
```

Les images `iamfabriceg/bot-discord:latest` et `iamfabriceg/bot-cms:latest` sont construites depuis `Dockerfile` et
`cms/Dockerfile`. Le bot attend que le CMS et MongoDB soient `healthy`. Arrêt : `corepack pnpm docker:prod:down`.

## CMS Payload v3

Le CMS est un projet Next.js 16 / React 19 dans [`cms/`](./cms). Il utilise le même workspace pnpm.

- **Admin** : http://localhost:3001/admin — collection `users`, rôles `admin`/`editor`/`bot`.
- **Front public** : http://localhost:3001/ — jeux publiés, commandes actives, actualités et dernier statut.
  Aucun formulaire d'écriture n'y est exposé.
- **Endpoint bot** : `GET /api/bot/summary`, `GET /api/bot/healthz`, `POST /api/bot/profile`.
- **Webhooks** : les hooks `afterChange` publient vers `BOT_WEBHOOK_URL/webhooks/payload` avec une signature
  HMAC-SHA256 (`x-payload-signature`) calculée avec `WEBHOOK_SECRET`.

Collections : `users`, `games`, `commands`, `commandUsages`, `discordRoles`, `events`, `news`,
`streamAlerts`, `webhookEvents`, `profiles`, `media` — plus le global `botSettings`.
Détails : [`docs/CMS.md`](./docs/CMS.md).

Variables principales :

```env
DATABASE_URI=mongodb://127.0.0.1:27017/iamfabriceg_bot
PAYLOAD_SECRET=<openssl rand -hex 32>
PAYLOAD_URL=http://127.0.0.1:3001
PAYLOAD_API_KEY=<générée par pnpm cms:seed>
BOT_WEBHOOK_URL=http://127.0.0.1:3000
WEBHOOK_SECRET=<même valeur dans le bot et le CMS>
```

En Docker, `DATABASE_URI`, `PAYLOAD_URL` et `BOT_WEBHOOK_URL` sont surchargés automatiquement par les
compose files (`mongo:27017`, `cms:3001`, `bot:3000`).

## Commandes du bot

| Commande | Description | Clé requise |
|---|---|---|
| `/ping` | Latence client et websocket | — |
| `/status` | Uptime, cache, serveurs, intégrations | — |
| `/permissions` | Permissions et lien OAuth minimal | — |
| `/options-info` | Renvoie la valeur saisie | — |
| `/games list` | Catalogue des **17 jeux** | — |
| `/games info <jeu>` | Fiche détaillée (RAWG si configuré) | `RAWG_API_KEY` (optionnel) |
| `/games roles` | Liste des rôles de jeu configurés | — |
| `/pokemon [nom]` | Pokédex dynamique (aléatoire si omis) | — |
| `/fortnite shop` | Boutique actuelle en français | — |
| `/fortnite news <mode>` | Actualités BR / STW / Creative | — |
| `/fortnite stats <joueur>` | Statistiques Battle Royale | `FORTNITE_API_KEY` |
| `/riot <invocateur> [region]` | Profil et classement LoL | `RIOT_API_KEY` |
| `/steam <identifiant>` | Profil Steam et jeux les plus joués | `STEAM_API_KEY` |
| `/deals [source]` | Offres Steam, jeux gratuits, giveaways | — |
| `/twitch <chaine>` | Statut d'une chaîne | `TWITCH_CLIENT_ID/SECRET` |
| `/kick`, `/prune`, `/mute`, `/unmute` | Modération (permissions Discord) | — |
| `/profil [pseudo]` | Lie le profil Discord au CMS | `PAYLOAD_URL` |
| `/sync` | Synchronise les jeux depuis le CMS (admin) | `PAYLOAD_URL` |

Les commandes sans clé répondent par un message explicite : le bot **dégrade gracieusement**.

## Catalogue de jeux

15 jeux historiques + **Aniimo** et **GOALS** : Among Us, Brawlhalla, Fall Guys, EA Sports FC, Fortnite,
Forza Horizon 4, GTA V, League of Legends, Pokémon, Prominence Poker, Rainbow Six Siege, Red Dead Redemption 2,
Rocket League, Teamfight Tactics, Valorant, **Aniimo**, **GOALS**.

Source de vérité : [`src/config/games.js`](./src/config/games.js), enrichie par Payload via `/sync`.
Les rôles Fortnite (`722561307903262831`), GTA V (`722565846383329282`) et Rocket League
(`802663319634575362`) sont déjà câblés. Aniimo et GOALS se configurent via `ROLE_ANIIMO_ID` / `ROLE_GOALS_ID`.

## APIs externes

| API | Variable `.env` | Sans clé |
|---|---|---|
| PokéAPI v2 | — | ✅ |
| fortnite-api.com (shop, news) | — | ✅ |
| fortnite-api.com (stats) | `FORTNITE_API_KEY` | ❌ |
| RAWG | `RAWG_API_KEY` | ❌ |
| Riot | `RIOT_API_KEY` | ❌ |
| Steam | `STEAM_API_KEY` | ❌ |
| Twitch Helix / EventSub | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | ❌ |
| FreeToGame, GamerPower, CheapShark, Speedrun.com, Open Trivia | — | ✅ |

Toutes les requêtes passent par `src/services/http.js` : timeout, retry exponentiel et cache TTL.

## Twitch EventSub

```bash
corepack pnpm twitch:subscribe iamfabriceg
# callback : ${PUBLIC_URL}/webhooks/twitch
```

Challenge, validation HMAC et dispatch `stream.online` / `stream.offline` : [`docs/TWITCH.md`](./docs/TWITCH.md).

## Serveur HTTP du bot

| Route | Rôle |
|---|---|
| `GET /healthz` | Healthcheck JSON (uptime, cache) — utilisé par Docker |
| `POST /webhooks/payload` | Webhooks Payload signés HMAC-SHA256 |
| `POST /webhooks/twitch` | Callback EventSub (challenge + notifications) |

## Scripts pnpm

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev              # bot en local
corepack pnpm start            # bot
corepack pnpm deploy           # commandes slash
corepack pnpm send:roles
corepack pnpm twitch:subscribe <channel>
corepack pnpm cms:dev          # CMS en local (port 3001)
corepack pnpm cms:build        # build Next.js
corepack pnpm cms:seed         # admin + clé API bot
corepack pnpm lint
corepack pnpm test             # 20 tests node:test
corepack pnpm docker:dev
corepack pnpm docker:prod
```

> Sur cet environnement Windows,Corepack fonctionne mais le binaire `pnpm` n'est pas sur le PATH : utiliser
> `corepack pnpm ...`. Si les scripts échouent avec `'node' n'est pas reconnu`, ajouter `--script-shell=pwsh`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) : Node 26 + pnpm 10.15.0, `pnpm install --frozen-lockfile`,
`pnpm lint`, `pnpm test` et `pnpm --filter cms build`.

## Architecture

```
src/            bot CommonJS (config, services, providers, handlers, events, commands, tasks, utils)
cms/            Payload v3 / Next 16 (collections, globals, endpoints, hooks, front public)
tests/          20 tests node:test
docker-compose.dev.yml / docker-compose.prod.yml
Dockerfile / cms/Dockerfile
```

`backup/` est exclu du lint, du formatage et de la découverte des tests.
