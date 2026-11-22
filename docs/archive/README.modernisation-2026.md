# iamfabricegBot ÔÇö Discord

Bot Discord personnel pour [iamfabriceg.xyz](https://iamfabriceg.xyz), ├®crit en **CommonJS** avec **discord.js 14**.

> Version modernis├®e (novembre 2026) : Node 26, interactions slash, APIs externes, catalogue de 17 jeux, Payload CMS v3, Twitch EventSub, mod├®ration et monitoring.
> Voir [`PLAN.md`](./PLAN.md) pour le plan complet et [`docs/PAYLOAD.md`](./docs/PAYLOAD.md) / [`docs/TWITCH.md`](./docs/TWITCH.md) pour les int├®grations.

## ÔÜá´©Å Contraintes en vigueur

- Le dossier `backup/` est **lecture seule** : aucun fichier n'y est supprim├®, d├®plac├® ou modifi├®. Il sert uniquement de consultation.
- Le token Discord actuel est **conserv├®** (pas de rotation pour le moment). La rotation reste recommand├®e ├á plus long terme.

## Pr├®requis

- **Node.js 26 LTS** (`node:26-alpine` en Docker) ÔÇö minimum accept├® : 22.12.
- npm 10+.
- Un serveur Discord avec le bot invit├® avec les permissions minimales (voir `/permissions`).

## Installation

```bash
npm ci
cp .env.example .env   # puis renseigner DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm run deploy         # d├®ploie les commandes sur GUILD_ID (test)
npm start
```

D├®ploiement global (prod, propagation jusqu'├á 1 h) :

```bash
npm run deploy -- --global
```

## Commandes

| Commande | Description | Cl├® requise |
|---|---|---|
| `/ping` | Latence client et websocket | ÔÇö |
| `/status` | Uptime, cache, serveurs, int├®grations | ÔÇö |
| `/permissions` | Permissions et lien OAuth minimal | ÔÇö |
| `/options-info` | Renvoie la valeur saisie | ÔÇö |
| `/games list` | Catalogue des **17 jeux** | ÔÇö |
| `/games info <jeu>` | Fiche d├®taill├®e (RAWG si configur├®) | `RAWG_API_KEY` (optionnel) |
| `/games roles` | Liste des r├┤les de jeu configur├®s | ÔÇö |
| `/pokemon [nom]` | Pok├®dex dynamique (al├®atoire si omis) | ÔÇö |
| `/fortnite shop` | Boutique actuelle en fran├ºais | ÔÇö |
| `/fortnite news <mode>` | Actualit├®s BR / STW / Creative | ÔÇö |
| `/fortnite stats <joueur>` | Statistiques Battle Royale | `FORTNITE_API_KEY` |
| `/riot <invocateur> [region]` | Profil et classement LoL | `RIOT_API_KEY` |
| `/steam <identifiant>` | Profil Steam et jeux les plus jou├®s | `STEAM_API_KEY` |
| `/deals [source]` | Offres Steam, jeux gratuits, giveaways | ÔÇö |
| `/twitch <chaine>` | Statut d'une cha├«ne | `TWITCH_CLIENT_ID/SECRET` |
| `/kick`, `/prune`, `/mute`, `/unmute` | Mod├®ration (permissions Discord) | ÔÇö |
| `/profil [pseudo]` | Lie le profil Discord au CMS | `PAYLOAD_URL` |
| `/sync` | Synchronise les jeux depuis le CMS (admin) | `PAYLOAD_URL` |

Les commandes absentes de cl├® r├®pondent par un message explicite : le bot **d├®grade gracieusement** et ne plante pas.

## Catalogue de jeux

15 jeux historiques + **Aniimo** et **GOALS** ajout├®s en 2026 :

Among Us, Brawlhalla, Fall Guys, EA Sports FC (FIFA), Fortnite, Forza Horizon 4, GTA V, League of Legends, Pok├®mon, Prominence Poker, Rainbow Six Siege, Red Dead Redemption 2, Rocket League, Teamfight Tactics, Valorant, **Aniimo**, **GOALS**.

Source de v├®rit├® : [`src/config/games.js`](./src/config/games.js), ├®ventuellement enrichie par Payload via `/sync`.

### Boutons de r├┤les

```bash
npm run send:roles
```

Les boutons utilisent des `customId` de la forme `role:<roleId>` et sont g├®r├®s par `src/handlers/buttonHandler.js`.
Les IDs de r├┤les viennent de `games.js` ou de `.env` (`ROLE_ANIIMO_ID`, `ROLE_GOALS_ID`).

## APIs externes

| API | Variable `.env` | Sans cl├® |
|---|---|---|
| Pok├®API v2 | ÔÇö | Ô£à |
| fortnite-api.com (shop, news) | ÔÇö | Ô£à |
| fortnite-api.com (stats) | `FORTNITE_API_KEY` | ÔØî |
| RAWG | `RAWG_API_KEY` | ÔØî |
| Riot | `RIOT_API_KEY` | ÔØî |
| Steam | `STEAM_API_KEY` | ÔØî |
| Twitch Helix / EventSub | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | ÔØî |
| FreeToGame, GamerPower, CheapShark, Speedrun.com, Open Trivia | ÔÇö | Ô£à |

Toutes les requ├¬tes passent par `src/services/http.js` : timeout (`AbortSignal.timeout`), retry exponentiel sur 5xx/429 et cache TTL partag├® (`src/services/cache.js`).

## Payload CMS v3

Trois modes sont impl├®ment├®s :

1. **Lecture + cache** : `GET /api/<slug>?depth=1&limit=100`, headers `Authorization: <authSlug> API-Key <cl├®>`.
2. **Custom endpoint** : `client.custom("bot/...")` ÔåÆ voir [`docs/PAYLOAD.md`](./docs/PAYLOAD.md).
3. **├ëcriture + webhooks** : `create`, `update`, `remove`, `upsertDiscordProfile`, et r├®ception sign├®e sur `POST /webhooks/payload`.

Variables : `PAYLOAD_URL`, `PAYLOAD_AUTH_SLUG`, `PAYLOAD_GAMES_SLUG`, `PAYLOAD_API_KEY`, `WEBHOOK_SECRET`.

## Twitch EventSub

```bash
npm run twitch:subscribe iamfabriceg
# callback : ${PUBLIC_URL}/webhooks/twitch
```

La v├®rification du challenge, la validation HMAC et le dispatch des notifications `stream.online` / `stream.offline` sont dans `src/services/webhook-server.js` et `src/services/twitch-eventsub.js`. D├®tails : [`docs/TWITCH.md`](./docs/TWITCH.md).

## Serveur HTTP

| Route | R├┤le |
|---|---|
| `GET /healthz` | Healthcheck JSON (uptime, cache) ÔÇö utilis├® par Docker |
| `POST /webhooks/payload` | Webhooks Payload sign├®s HMAC-SHA256 |
| `POST /webhooks/twitch` | Callback EventSub (challenge + notifications) |

Port configurable via `PORT` (d├®faut `3000`).

## Docker

```bash
npm run docker:dev
docker compose -f docker-compose.prod.yml up -d --build
```

Le `Dockerfile` utilise `node:26-alpine`, l'utilisateur `node`, un healthcheck et un arr├¬t propre (`SIGTERM`).

## Scripts

```bash
npm ci            # installation reproducible
npm start         # d├®marrage du bot
npm run deploy    # commandes slash
npm run send:roles
npm run twitch:subscribe <channel>
npm run lint
npm run lint:fix
npm run format
npm test          # 20 tests node:test
npm run docker:dev
```

> Sur cet environnement Windows avec nvm4w, les scripts npm doivent ├¬tre lanc├®s avec `--script-shell=pwsh` si `cmd` ne trouve pas `node`. En CI Linux, `npm test` fonctionne normalement.

## CI

GitHub Actions (`.github/workflows/ci.yml`) : Node 26, `npm ci`, `npm run lint`, `npm test` sur les branches `master`, `build/**`, `feat/**`, `refactor/**`, `chore/**`, `security/**` et les PR.

## Architecture

```
src/
  config/       env.js (Zod), games.js (17 jeux)
  services/     logger, cache, http, errors, payload, webhook-server, twitch-eventsub
    providers/  pokeapi, fortnite, rawg, riot, steam, twitch, keyless
  handlers/     command, button, selectMenu, cooldown, error
  events/       interactions/interactionCreate, logs/ready
  commands/     info, games, moderation, cms
  tasks/        deploy-commands, send-roles, subscribe-twitch
  utils/        loaders, roleHandler
tests/          20 tests node:test
```

`backup/` est exclu du lint, du formatage et de la d├®couverte des tests.
