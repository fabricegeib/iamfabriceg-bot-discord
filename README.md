# iamfabriceg Bot

Bot Discord personnel de [iamfabriceg](https://iamfabriceg.xyz), écrit en **CommonJS** avec **discord.js 14**.

> Version modernisée (novembre 2026) : Node 26, pnpm, Docker dev/prod, interactions slash, APIs externes,
> catalogue de 17 jeux, **Payload CMS v3 + MongoDB** (admin complet + front public), Twitch EventSub,
> modération et monitoring.
>
> Voir [`docs/NOMENCLATURE.md`](./docs/NOMENCLATURE.md) pour le nommage, [`PLAN.md`](./PLAN.md) pour le plan,
> et [`docs/PAYLOAD.md`](./docs/PAYLOAD.md), [`docs/CMS.md`](./docs/CMS.md), [`docs/TWITCH.md`](./docs/TWITCH.md) pour les intégrations.
> Déploiement VPS, registre Docker et migration MongoDB : [`docs/DEPLOY-VPS.md`](./docs/DEPLOY-VPS.md).

## ⚠️ Contraintes en vigueur

- `backup/` est **lecture seule** : aucun fichier n'y est supprimé, déplacé ou modifié.
- Le token Discord actuel est **conservé** (pas de rotation pour le moment).
- Les secrets ne sont jamais versionnés : tout est dans `.env` (ignoré par Git).

## Prérequis

- **Node.js 26 LTS** (minimum 22.12) — images Docker `node:26-alpine`.
- **pnpm 10.15.0** : via Corepack si disponible (`corepack enable && corepack prepare pnpm@10.15.0 --activate`),
  sinon les images Docker l'installent automatiquement avec npm.
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

MongoDB doit être accessible sur `mongodb://127.0.0.1:27020/iamfabriceg_bot` (fourni par `pnpm docker:dev`).

### Tout faire via Docker (sans pnpm local)

```bash
# 1. Seed du CMS : crée l'admin, génère PAYLOAD_API_KEY et les données de base
docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed

# 2. Copier la ligne PAYLOAD_API_KEY=... affichée dans .env

# 3. Démarrer la stack (MongoDB est lancé automatiquement par depends_on)
docker compose -f docker-compose.dev.yml up -d
```

Le service `cms-seed` est dans le profil `tools` : il ne démarre jamais avec `up -d`, uniquement avec
`run --rm`. En production, construire d'abord l'image CMS :

```bash
docker compose -f docker-compose.prod.yml build cms
docker compose -f docker-compose.prod.yml --profile tools run --rm cms-seed
docker compose -f docker-compose.prod.yml up -d --build
```

Après avoir collé une nouvelle clé dans `.env`, recréer le bot pour qu'il la prenne en compte :

```bash
docker compose -f docker-compose.dev.yml up -d --force-recreate bot
```

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
| `bot` | http://localhost:3012/healthz | Bot Discord + webhooks |
| `cms` | http://localhost:3001/admin | Admin Payload |
| `cms` | http://localhost:3001/ | Front public (lecture seule) |
| `mongo` | localhost:27020 | Base MongoDB |

Les ports hôtes `27020` (Mongo) et `3012` (bot) sont utilisés pour éviter des conflits avec d'autres projets
déjà présents sur `27017` et `3000`. Les ports internes des conteneurs restent `27017` et `3000`, donc
`mongodb://mongo:27017/iamfabriceg_bot` et `http://bot:3000` restent inchangés.

Le code est monté depuis l'hôte : les modifications sont visibles immédiatement (hot reload pour le CMS,
redémarrage manuel du bot). Arrêt : `corepack pnpm docker:dev:down`.

## Production avec Docker

```bash
# Local : construit les images depuis les Dockerfiles
corepack pnpm docker:prod

# VPS : tire les images du registre privé et les connecte à Nginx Proxy Manager
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
```

Images publiées : `registry.fabricegeib.com/iamfabriceg-bot:1.1.0` (bot) et
`registry.fabricegeib.com/iamfabriceg-bot-cms:1.1.0` (CMS + admin + front), construites depuis
`Dockerfile` et `cms/Dockerfile`. Digests : bot `sha256:7cb5bb8b…a489f4`, CMS `sha256:b181c774…8e135`.
Le bot attend que le CMS et MongoDB soient `healthy`.
Procédure complète (audit, clés API, SSH, build/push, export MongoDB, Docker Compose,
Nginx Proxy Manager, vérifications, rollback) : [`docs/DEPLOY-VPS.md`](./docs/DEPLOY-VPS.md).
Arrêt : `corepack pnpm docker:prod:down`.

## Administration Payload

Le CMS est un projet Next.js 16 / React 19 dans [`cms/`](./cms), dans le même workspace pnpm.

| Sous-section | Contenu | Référence |
|---|---|---|
| **Admin CMS** | Connexion, rôles, URL, endpoints du bot, secrets | [`docs/CMS.md#1-admin-cms`](./docs/CMS.md#1-admin-cms) |
| **Front public** | Page `/`, Local API, données affichées, aucun appel HTTP | [`docs/CMS.md#2-front-public`](./docs/CMS.md#2-front-public) |
| **Globals `botSettings`** | `features`, maintenance, `socialLinks` | [`docs/CMS.md#3-globals-botsettings`](./docs/CMS.md#3-globals-botsettings) |
| **Collections** | Les 11 slugs et leurs champs clés | [`docs/CMS.md#4-collections`](./docs/CMS.md#4-collections) |
| **Webhooks** | `afterChange`, HMAC-SHA256, réception par le bot | [`docs/CMS.md#5-webhooks`](./docs/CMS.md#5-webhooks) |
| **Dépannage** | Spinner admin, 401/403 CSRF, secrets, Turbopack | [`docs/CMS.md#6-dépannage`](./docs/CMS.md#6-dépannage) |

Accès rapide : admin `http://localhost:3001/admin`, front `http://localhost:3001/`,
santé `GET /api/bot/healthz`, résumé `GET /api/bot/summary`. Les hooks `afterChange` publient vers
`BOT_WEBHOOK_URL/webhooks/payload` avec une signature HMAC-SHA256 (`x-payload-signature`).

Le front affiche les **18 commandes** (descriptions, paramètres, choix, exemples, cooldowns) et les
liens sociaux du global. Pour resynchroniser l'admin après modification d'une commande :

```bash
corepack pnpm cms:catalog         # régénère cms/src/data/command-catalog.json
corepack pnpm cms:sync-commands   # upsert dans /api/commands (PAYLOAD_API_KEY requis)
```

Le lien d'invitation OAuth2 (avec `ManageRoles`) est dans `.env` (`DISCORD_INVITE_URL` et
`DISCORD_INVITE_URL_GUILD`) et affiché par `/permissions`. Voir [`docs/DISCORD.md`](./docs/DISCORD.md).

Variables principales :

```env
DATABASE_URI=mongodb://127.0.0.1:27020/iamfabriceg_bot
PAYLOAD_SECRET=<openssl rand -hex 32>
# URL interne service-à-service (bot -> CMS)
PAYLOAD_URL=http://127.0.0.1:3001
# Origine navigateur, autorisée dans csrf/cors du CMS (obligatoire pour les POST admin)
PAYLOAD_PUBLIC_URL=http://localhost:3001
PAYLOAD_API_KEY=<générée par pnpm cms:seed>
BOT_WEBHOOK_URL=http://127.0.0.1:3012
WEBHOOK_SECRET=<même valeur dans le bot et le CMS>
```

En Docker, `DATABASE_URI`, `PAYLOAD_URL` et `BOT_WEBHOOK_URL` sont surchargés automatiquement par les
compose files (`mongo:27017`, `cms:3001`, `bot:3000`) ; `PAYLOAD_PUBLIC_URL` reste l'URL du navigateur
(`http://localhost:3001` en dev, domaine public en prod). `serverURL` demeure l'URL interne : c'est
`csrf`/`cors` qui autorise l'origine du navigateur.

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
| `/fortnite stats <joueur> [periode] [compte]` | Stats saison ou total (repli auto) | `FORTNITE_API_KEY` |
| `/riot <invocateur> [region]` | Profil et classement LoL | `RIOT_API_KEY` |
| `/steam <identifiant>` | Profil Steam et jeux les plus joués | `STEAM_API_KEY` |
| `/deals [source]` | Offres Steam, jeux gratuits, giveaways | — |
| `/twitch <chaine>` | Statut d'une chaîne | `TWITCH_CLIENT_ID/SECRET` |
| `/kick`, `/prune`, `/mute`, `/unmute` | Modération (permissions Discord) | — |
| `/profil [pseudo]` | Lie le profil Discord au CMS | `PAYLOAD_URL` |
| `/sync` | Synchronise les jeux depuis le CMS (admin) | `PAYLOAD_URL` |
| `/help [commande]` | Liste des commandes, options et exemples | — |

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
# équivalent Docker : docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed
corepack pnpm lint
corepack pnpm test             # 29 tests node:test
bash scripts/cms-smoke.sh      # login admin + écriture/restauration botSettings
corepack pnpm docker:dev
corepack pnpm docker:prod
```

> Sur cet environnement Windows, le binaire `pnpm` n'est pas sur le PATH : utiliser `corepack pnpm ...` quand
> Corepack est disponible (Node ≤ 24), ou les commandes `docker compose ... run --rm cms-seed` ci-dessus.
> Si les scripts échouent avec `'node' n'est pas reconnu`, ajouter `--script-shell=pwsh`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) : Node 26 + pnpm 10.15.0, `pnpm install --frozen-lockfile`,
`pnpm lint`, `pnpm test` et `pnpm --filter cms build`. **Déclenchement manuel uniquement**
(`workflow_dispatch`) : les contrôles sont joués en local via Docker (§2.1 du guide VPS), et
GitHub ne déploie rien. Aucun secret n'est stocké dans le workflow ; les tests utilisent des
valeurs factices pour les variables Discord exigées par `getEnv()`.

## Architecture

```
src/            bot CommonJS (config, services, providers, handlers, events, commands, tasks, utils)
cms/            Payload v3 / Next 16 (collections, globals, endpoints, hooks, front public)
tests/          37 tests node:test
docker-compose.dev.yml / docker-compose.prod.yml
Dockerfile / cms/Dockerfile
```

`backup/` est exclu du lint, du formatage et de la découverte des tests.
