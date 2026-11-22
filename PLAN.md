# PLAN DE MODERNISATION — iamfabriceg Bot (Discord)

> Date : 2026-11-21  
> État : **plan validé, prêt à exécuter**  
> Base : `master` synchronisée avec `origin/master` (`4a685c2`), arbre de travail propre.  
> Stack conservée : **CommonJS + discord.js 14** (pas de migration TypeScript/ESM).
>
> ⚠️ **Contraintes utilisateur (2026-11-21)** : le dossier `backup/` est **lecture seule** (consultation uniquement, rien n'y est supprimé ni modifié) et le token Discord actuel est **conservé** (pas de rotation pour le moment). Les tâches `SEC-1` correspondantes sont donc neutralisées ; le reste du plan est exécuté.

---

## 1. Décisions prises

| Sujet | Décision |
|---|---|
| Base de départ | Travailler sur le local, créer une branche par lot, ouvrir des tickets et des pull requests |
| Périmètre | **Tout** : sécurité, outillage, interactions, APIs externes, jeux, Payload CMS, Twitch, modération, monitoring |
| APIs à activer | PokéAPI + Fortnite + RAWG, Riot + Steam, Twitch EventSub, services sans clé (FreeToGame, GamerPower, CheapShark, Speedrun.com, Open Trivia) |
| Payload CMS v3 | **Les 3 modes** : lecture avec cache, custom endpoint dédié, écriture + webhooks |
| Jeux | 15 jeux existants + **Aniimo** et **GOALS** = 17 jeux dans un catalogue unique |
| Stack | CommonJS, discord.js `14.28.1`, Node `26.x` LTS |

---

## 2. Rappel de l'audit (constats à traiter)

### Bloquants

- **Token Discord en clair** dans `backup/config.json` (fichier ignoré par Git mais présent sur le disque) → rotation obligatoire, suppression du fichier, `.env` seul.
- **Aucun handler d'interaction actif** : `eventHandler.js` commenté dans `src/index.js`, pas d'event `interactionCreate` → les slash commands sont déployées mais muettes.
- **Boutons de rôles orphelins** : `send-roles.js` envoie les boutons, `roleHandler.js` existe, mais aucun handler `isButton()`.
- **Déploiement incomplet** : `deploy-commands.js` local n'est pas récursif → `/fortnite` et `/pokemon` ne sont pas enregistrés.
- **Permissions OAuth excessives** : lien d'invitation en `permissions=8` (Administrator).

### Dette technique

- `node:18-alpine` (Docker) EOL ; dépendances mortes : `fs`, `mongoose@5`, `comfy.js`, `junk`, `ms`, `@discordjs/voice` inutilisés ; `dotenv@8`, `eslint@8` + `.eslintrc.json` déprécié.
- Loaders récursifs qui `require()` plusieurs fois le même module.
- `deploy-commands.js` ouvre une session Gateway juste pour un appel REST.
- Gestion d'erreur fragile (`reply()` après `deferReply()`).
- Aucun test, script `lint`, CI, logger, cache, timeout ou retry.
- Données de jeu codées en dur et périmées (`Chapter 4 Season 2`, 3 starters Pokémon).
- `README.md` obsolète, dossier `backup/` encombré.

### Versions cibles (novembre 2026)

| Composant | Actuel | Cible |
|---|---|---|
| Node.js | 18 (Docker) | **26.13.1 LTS** — `node:26-alpine` |
| discord.js | 14.15.3 | **14.28.1** |
| @discordjs/voice | 0.13.0 | supprimé si inutilisé |
| dotenv | 8.6.0 | **18.0.10** |
| ESLint | 8.28.0 | **10.15.0** + `eslint.config.js` |
| mongoose | 5.x | supprimé (aucune DB locale) |
| Payload CMS | v3 | **3.94.1** |

---

## 3. Jeux identifiés

**Existants (14 + Pokémon)** : Among Us, Brawlhalla, Fall Guys, FIFA / EA FC, Fortnite, Forza Horizon 4, Grand Theft Auto V, League of Legends, Pokémon, Prominence Poker, Rainbow Six Siege, Red Dead Redemption 2, Rocket League, Teamfight Tactics, Valorant.

**Ajouts** :

- **Aniimo** — ARPG open-world F2P (Pawprint Studio), capture/fusion de créatures, sortie mondiale septembre 2026.
- **GOALS** — football F2P (Goals AB), sortie juin 2026, crossplay, modes 1v1 / 5v5.

Ces 17 jeux alimenteront une **source de vérité unique** (`src/config/games.js` puis collection Payload) utilisée par `/games`, les rôles Discord et les commandes API.

---

## 4. APIs externes prévues

| API | Clé | Limite | Usage |
|---|---|---|---|
| PokéAPI v2 | non | fair use + cache | `/pokemon` dynamique |
| fortnite-api.com | non / clé gratuite | ouvert | cosmetics, shop, news |
| api-fortnite.com | gratuite | ~10 000 req/j | stats joueurs, tournois, événements |
| RAWG | gratuite | 20 000 req/mois, attribution | catalogue des 17 jeux |
| Riot API | dev key 24 h / prod à valider | 20 req/s, 100 / 2 min | LoL, Valorant, TFT |
| Steam Web API | gratuite | ~100 000 appels/j | profil, temps de jeu, achievements |
| Twitch Helix + EventSub | gratuite | — | statut live, alertes, clips |
| FreeToGame / GamerPower / CheapShark / Speedrun.com / Open Trivia | non | selon service | découverte, giveaways, records, quiz |

Règles transverses : un seul client HTTP (`fetch` natif Node 26), `AbortSignal.timeout`, retry exponentiel, cache mémoire TTL, dégradation gracieuse si une clé est absente, feature flags dans `.env`.

---

## 5. Intégration Payload CMS v3

- Lecture : `GET https://<cms>/api/<slug>?depth=1&limit=...&select=...&where[...]=...&sort=...&locale=fr`
- Auth : `Authorization: <slug> API-Key <CLE>` (clé API dédiée, moindres privilèges)
- Custom endpoint : `/api/bot/...` côté CMS pour exposer uniquement le nécessaire au bot
- Écriture : création/mise à jour de documents via le bot
- Webhooks : Payload → endpoint HTTP léger côté bot, avec vérification de signature
- Secrets : uniquement dans `.env`, jamais dans le dépôt ni dans les logs

Données à fournir lors de l'étape 6 (à placer dans `.env`) : URL du CMS, slug de la collection d'auth, slug de la collection `games`, clé API.

---

## 6. Découpage en branches / PR / tickets

| # | Branche | PR | Tickets | Contenu |
|---|---|---|---|---|
| 1 | `security/token-and-permissions` | PR #1 | `SEC-1` | ~~Rotation token~~ / ~~suppression `backup/config.json`~~ / ~~archivage `backup/`~~ (contrainte utilisateur) ; `.env.example`, validation Zod, retrait des intents, OAuth minimal |
| 2 | `chore/modernize-tooling` | PR #2 | `CHORE-2` | Node 26, dépendances, ESLint 10, Prettier, scripts, CI, README |
| 3 | `refactor/interactions-and-loaders` | PR #3 | `BUG-3`, `BUG-4` | Loaders, handlers, erreurs, cooldowns, boutons de rôles, déploiement REST, shutdown, logger |
| 4 | `feat/api-layer` | PR #4 | `FEAT-5` | Client HTTP + providers + feature flags |
| 5 | `feat/games-catalog` | PR #5 | `FEAT-6` | `/games`, `/pokemon`, `/fortnite`, rôles, Aniimo + GOALS |
| 6 | `feat/payload-integration` | PR #6 | `FEAT-7` | REST + cache, custom endpoint, écriture, webhooks |
| 7 | `feat/twitch-eventsub` | PR #7 | `FEAT-8` | Alertes live/clips via callback HTTPS Payload |
| 8 | `feat/moderation-monitoring` | PR #8 | `FEAT-9` | Modération, `/permissions`, `/status`, healthcheck, logs |

Ordre prévu : 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Chaque PR est autonome et testable.

> **État réel (22/11/2026)** : les 8 phases ont été implémentées ensemble sur la branche unique `build/modernisation-2026` (le découpage initial en 8 branches/PR n'a pas été conservé pour éviter des empilements de PR intermédiaires). Les tickets restent les mêmes ; la PR unique couvre `SEC-1` (partiel), `CHORE-2`, `BUG-3`, `BUG-4`, `FEAT-5` à `FEAT-9`.

---

## 7. Check-list par phase

### Phase 1 — Sécurité (`SEC-1`)

- [x] ~~Rotation du token Discord~~ — **conservé sur instruction utilisateur**
- [x] ~~Mise à jour de `.env`~~ — fichier laissé intact
- [x] ~~Suppression de `backup/config.json`~~ — **`backup/` est lecture seule**
- [x] `.env.example` complet, sans valeurs réelles
- [x] Validation des variables d'environnement au démarrage (Zod, `src/config/env.js`)
- [x] Retrait de `GuildMembers` / `MessageContent` des intents
- [x] Nouveau lien OAuth avec permissions minimales + `applications.commands` (`/permissions`)
- [x] ~~Archivage de `backup/`~~ — **interdit : dossier de consultation**

### Phase 2 — Outillage (`CHORE-2`)

- [x] Dependencies modernisées, paquets morts supprimés, `npm audit` = 0 vulnérabilité
- [x] `node:26-alpine`, healthcheck, `Dockerfile` et `docker-compose.prod.yml`
- [x] `eslint.config.js` (flat config) + Prettier + scripts `lint`, `format`, `test`
- [x] CI GitHub Actions : `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`
- [x] README réécrit + `docs/PAYLOAD.md` + `docs/TWITCH.md`

### Phase 3 — Interactions (`BUG-3`, `BUG-4`)

- [x] Un seul loader récursif pour commandes et events (`src/utils/loaders.js`)
- [x] `interactionCreate` : chatInput, button, stringSelect, autocomplete
- [x] Gestion d'erreur centralisée (`replied || deferred` → `followUp`)
- [x] Cooldowns par utilisateur/commande
- [x] Boutons de rôles `role:<id>` + vérification hiérarchie des rôles
- [x] `deploy-commands.js` REST uniquement (option `--global`)
- [x] Arrêt propre `SIGINT` / `SIGTERM`, logger structuré

### Phase 4 — APIs (`FEAT-5`)

- [x] Client HTTP commun : timeout, retry, cache TTL
- [x] Provider PokéAPI
- [x] Provider Fortnite (shop, news, stats avec clé)
- [x] Provider RAWG (attribution dans les embeds)
- [x] Providers Riot + Steam (dégradation si clé absente)
- [x] Providers sans clé (FreeToGame, GamerPower, CheapShark, Speedrun, Open Trivia)
- [x] Provider Twitch Helix (app token en cache)

### Phase 5 — Jeux (`FEAT-6`)

- [x] `src/config/games.js` avec les 17 jeux (dont Aniimo et GOALS)
- [x] `/games` (liste, fiche avec autocomplétion, rôles)
- [x] `/pokemon [nom]` dynamique via PokéAPI
- [x] `/fortnite shop|news|stats` dynamique
- [x] Rôles Aniimo / GOALS configurables via `.env` + synchronisation
- [x] Embeds avec attribution RAWG

### Phase 6 — Payload (`FEAT-7`)

- [x] Client REST avec clé API et cache
- [x] Synchronisation de la liste des jeux via `/sync`
- [x] Custom endpoint `/api/bot/...` documenté dans `docs/PAYLOAD.md`
- [x] Écriture + `/profil` (profil `discordId`)
- [x] Serveur HTTP léger + vérification HMAC des webhooks
- [x] Tests unitaires du client Payload et des signatures

### Phase 7 — Twitch (`FEAT-8`)

- [x] Abonnements EventSub `stream.online` / `stream.offline` (`pnpm twitch:subscribe`)
- [x] Callback HTTPS `PUBLIC_URL/webhooks/twitch` + challenge + HMAC
- [x] Embeds d'alertes live / offline
- [x] Commande `/twitch <channel>`

### Phase 8 — Modération & monitoring (`FEAT-9`)

- [x] `/kick`, `/prune`, `/mute`, `/unmute` avec permissions Discord
- [x] `/permissions`, `/status`
- [x] Healthcheck Docker, logs structurés, `/healthz`

---

## Résultat des vérifications (22/11/2026)

- `pnpm lint` : **0 erreur, 0 warning**
- `pnpm test` : **20 tests réussis**
- Audit npm (avant migration) : **0 vulnérabilité**
- Commandes chargées : **17** (toutes avec `data` + `execute`, JSON valide)
- `--dry` local : serveur `/healthz` répond `200 {"ok":true,...}`

---

## 8. Prérequis et risques

| Élément | Action requise |
|---|---|
| Token Discord | **Conservé tel quel sur instruction utilisateur** ;rotation différée |
| `backup/` | **Lecture seule** : aucun fichier supprimé, déplacé ou modifié |
| Riot | Clé dev 24 h, clé prod à faire approuver → bot tolérant sans clé |
| RAWG | Attribution visible dans les embeds |
| Twitch EventSub | Callback HTTPS public (custom endpoint Payload ou tunnel) |
| Payload | URL, slugs et clé API à placer dans `.env` (ne pas coller dans le chat) |
| Rôles Aniimo / GOALS | À créer sur le serveur Discord, IDs dans la config |

---

## 9. Définition de terminé

- `pnpm install --frozen-lockfile && pnpm lint && pnpm test` passe sur chaque branche.
- Le bot démarre avec Node 26 et uniquement les variables `.env` documentées.
- Toutes les commandes déployées répondent, y compris les boutons de rôles.
- Aucune clé ni token dans le dépôt.
- Chaque PR est reviewée et mergée dans `master` avant de démarrer la suivante.

---

## 10. Commandes utiles (à exécuter lors de l'implémentation)

```bash
git checkout -b security/token-and-permissions
# ... modifications ...
git add -A && git commit -m "🔒 Secure token and permissions"
git push -u origin security/token-and-permissions
gh pr create --title "🔒 Sécurité : token, permissions et .env" --body "Voir PLAN.md — Phase 1"
```

Répéter avec les autres branches du tableau.

---

## 11. Extension Docker / pnpm / Payload CMS (23/11/2026)

Branche : `build/docker-pnpm-payload-admin`, empilée sur `build/modernisation-2026` (PR #24).
Nouvelle PR prévue avec `build/modernisation-2026` comme base afin de préserver la PR #24.

### Décisions complémentaires

| Sujet | Décision |
|---|---|
| Gestionnaire de paquets | **pnpm 10.15.0** via Corepack (workspace root + `cms/`) ; `package-lock.json` supprimé |
| Docker | **dev et prod** : `bot`, `cms`, `mongo` ; code monté en dev, images construites en prod |
| CMS | **Payload v3.94.1 + MongoDB 8**, admin complet et front public en lecture seule |
| Admin CMS | Collections : users, games, commands, commandUsages, discordRoles, events, news, streamAlerts, webhookEvents, profiles, media + global `botSettings` |
| Sécurité | Secrets uniquement dans `.env` ; webhooks signés HMAC ; clé API bot générée par seed |
| Compatibilité | Bot reste CommonJS + discord.js 14 ; CMS est ESM/TypeScript (Next 16) |

### État d'avancement

- [x] `packageManager`, `pnpm-workspace.yaml`, scripts `cms:*` et `docker:*`
- [x] `.env.example` complet (Discord, APIs, CMS, Docker, rôles Aniimo/GOALS)
- [x] CI pnpm (`pnpm/action-setup`, `--frozen-lockfile`, build CMS)
- [x] `Dockerfile` bot pnpm + `docker-compose.dev.yml` / `docker-compose.prod.yml` (bot + cms + mongo)
- [x] `README.md` pnpm / Docker / CMS ; `docs/CMS.md`
- [x] Webhook bot : accepte `x-payload-signature` (HMAC) **et** `x-webhook-secret`
- [x] Scaffold CMS Payload : 11 collections, global `botSettings`, endpoints `/bot/*`, hooks signés, seed, admin et front public en lecture seule
- [x] `corepack pnpm install` → `pnpm-lock.yaml` (workspace root + `cms`), `package-lock.json` supprimé
- [x] `cms/Dockerfile` multi-stage et lint CMS natif (Next 16 flat config)
- [x] Validations : `pnpm lint`, `pnpm test` (20/20), `pnpm --filter cms lint`, `pnpm --filter cms build`, `docker compose config` (dev + prod)
- [x] Smoke tests HTTP : `/api/bot/healthz`, `/`, `/admin`, `/api/bot/summary`, `/api/games` (clé API), `/api/bot/profile` (401 sans clé)
- [x] Test bout en bout du webhook : PATCH Payload → HMAC `x-payload-signature` → bot accepte (200) et rejette une signature invalide (401)
- [x] Service `cms-seed` (profil `tools`) : seed 100 % Docker, sans pnpm local
- [x] Correction Docker : Corepack absent de Node 26 → pnpm installé via npm dans les images et le compose dev
- [x] `/profil` sans `PAYLOAD_API_KEY` : message explicite au lieu d'un 401 opaque
- [ ] Commit, push et création de la nouvelle PR

### Résultat des validations (23/11/2026)

- `pnpm lint` : 0 erreur
- `pnpm test` : 20/20
- `pnpm --filter cms lint` : 0 erreur, 8 avertissements `no-explicit-any` (types Payload dynamiques)
- `pnpm --filter cms build` : succès (routes `/`, `/admin/[[...segments]]`, `/api/[...slug]`)
- `docker compose -f docker-compose.dev.yml config` et `...prod.yml config` : valides
- Seed Payload : admin `bot@iamfabriceg.local`, clé API générée, 5 jeux et 5 commandes
- Webhook : signature HMAC vérifiée côté bot, mauvaise signature rejetée en 401
- Seed via Docker (MongoDB isolé sur le port 37017) : exit 0, clé API 64 hex générée
- `docker compose config` (dev + prod) revalidé après ajout de `cms-seed`

### Commandes de validation

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm test
corepack pnpm --filter cms build
docker compose -f docker-compose.dev.yml config
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed
```

### Actions attendues de l'utilisateur

1. Renseigner `.env` (ne pas coller les valeurs dans le chat).
2. Créer les rôles Discord Aniimo et GOALS puis renseigner `ROLE_ANIIMO_ID` / `ROLE_GOALS_ID`.
3. Confirmer l'ID du salon `#bot-test` (`652684137957818378` par défaut).
4. Après validation : `pnpm deploy` et `pnpm send:roles` dans `#bot-test`.
