# iamfabricegBot — Discord

Bot Discord personnel pour [iamfabriceg.xyz](https://iamfabriceg.xyz), écrit en **CommonJS** avec **discord.js 14**.

> Version modernisée (novembre 2026) : Node 26, interactions slash, APIs externes, catalogue de 17 jeux, Payload CMS v3, Twitch EventSub, modération et monitoring.
> Voir [`PLAN.md`](./PLAN.md) pour le plan complet et [`docs/PAYLOAD.md`](./docs/PAYLOAD.md) / [`docs/TWITCH.md`](./docs/TWITCH.md) pour les intégrations.

## ⚠️ Contraintes en vigueur

- Le dossier `backup/` est **lecture seule** : aucun fichier n'y est supprimé, déplacé ou modifié. Il sert uniquement de consultation.
- Le token Discord actuel est **conservé** (pas de rotation pour le moment). La rotation reste recommandée à plus long terme.

## Prérequis

- **Node.js 26 LTS** (`node:26-alpine` en Docker) — minimum accepté : 22.12.
- npm 10+.
- Un serveur Discord avec le bot invité avec les permissions minimales (voir `/permissions`).

## Installation

```bash
npm ci
cp .env.example .env   # puis renseigner DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm run deploy         # déploie les commandes sur GUILD_ID (test)
npm start
```

Déploiement global (prod, propagation jusqu'à 1 h) :

```bash
npm run deploy -- --global
```

## Commandes

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

Les commandes absentes de clé répondent par un message explicite : le bot **dégrade gracieusement** et ne plante pas.

## Catalogue de jeux

15 jeux historiques + **Aniimo** et **GOALS** ajoutés en 2026 :

Among Us, Brawlhalla, Fall Guys, EA Sports FC (FIFA), Fortnite, Forza Horizon 4, GTA V, League of Legends, Pokémon, Prominence Poker, Rainbow Six Siege, Red Dead Redemption 2, Rocket League, Teamfight Tactics, Valorant, **Aniimo**, **GOALS**.

Source de vérité : [`src/config/games.js`](./src/config/games.js), éventuellement enrichie par Payload via `/sync`.

### Boutons de rôles

```bash
npm run send:roles
```

Les boutons utilisent des `customId` de la forme `role:<roleId>` et sont gérés par `src/handlers/buttonHandler.js`.
Les IDs de rôles viennent de `games.js` ou de `.env` (`ROLE_ANIIMO_ID`, `ROLE_GOALS_ID`).

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

Toutes les requêtes passent par `src/services/http.js` : timeout (`AbortSignal.timeout`), retry exponentiel sur 5xx/429 et cache TTL partagé (`src/services/cache.js`).

## Payload CMS v3

Trois modes sont implémentés :

1. **Lecture + cache** : `GET /api/<slug>?depth=1&limit=100`, headers `Authorization: <authSlug> API-Key <clé>`.
2. **Custom endpoint** : `client.custom("bot/...")` → voir [`docs/PAYLOAD.md`](./docs/PAYLOAD.md).
3. **Écriture + webhooks** : `create`, `update`, `remove`, `upsertDiscordProfile`, et réception signée sur `POST /webhooks/payload`.

Variables : `PAYLOAD_URL`, `PAYLOAD_AUTH_SLUG`, `PAYLOAD_GAMES_SLUG`, `PAYLOAD_API_KEY`, `WEBHOOK_SECRET`.

## Twitch EventSub

```bash
npm run twitch:subscribe iamfabriceg
# callback : ${PUBLIC_URL}/webhooks/twitch
```

La vérification du challenge, la validation HMAC et le dispatch des notifications `stream.online` / `stream.offline` sont dans `src/services/webhook-server.js` et `src/services/twitch-eventsub.js`. Détails : [`docs/TWITCH.md`](./docs/TWITCH.md).

## Serveur HTTP

| Route | Rôle |
|---|---|
| `GET /healthz` | Healthcheck JSON (uptime, cache) — utilisé par Docker |
| `POST /webhooks/payload` | Webhooks Payload signés HMAC-SHA256 |
| `POST /webhooks/twitch` | Callback EventSub (challenge + notifications) |

Port configurable via `PORT` (défaut `3000`).

## Docker

```bash
npm run docker:dev
docker compose -f docker-compose.prod.yml up -d --build
```

Le `Dockerfile` utilise `node:26-alpine`, l'utilisateur `node`, un healthcheck et un arrêt propre (`SIGTERM`).

## Scripts

```bash
npm ci            # installation reproducible
npm start         # démarrage du bot
npm run deploy    # commandes slash
npm run send:roles
npm run twitch:subscribe <channel>
npm run lint
npm run lint:fix
npm run format
npm test          # 20 tests node:test
npm run docker:dev
```

> Sur cet environnement Windows avec nvm4w, les scripts npm doivent être lancés avec `--script-shell=pwsh` si `cmd` ne trouve pas `node`. En CI Linux, `npm test` fonctionne normalement.

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

`backup/` est exclu du lint, du formatage et de la découverte des tests.
