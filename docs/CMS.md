# CMS Payload v3 — admin et front public

Le CMS est un projet autonome dans [`cms/`](../cms), mais il fait partie du même workspace pnpm.
Il utilise **Payload 3.94.1**, **Next.js 16.4.6**, **React 19.3.1**, **TypeScript** et **MongoDB 8**.

## 1. Démarrage

### Avec Docker (recommandé)

```bash
corepack pnpm docker:dev
```

| Service | URL |
|---|---|
| Admin Payload | http://localhost:3001/admin |
| Front public | http://localhost:3001/ |
| Endpoint santé CMS | http://localhost:3001/api/bot/healthz |
| Endpoint résumé bot | http://localhost:3001/api/bot/summary |
| MongoDB | mongodb://localhost:27017/iamfabriceg_bot |

Premier lancement (seed via Docker, sans pnpm local) :

```bash
docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed
# copier PAYLOAD_API_KEY=... dans .env
docker compose -f docker-compose.dev.yml up -d --force-recreate bot
```

Le service `cms-seed` est dans le profil `tools` : il ne démarre jamais avec `up -d`, uniquement avec
`run --rm`. En production : `docker compose -f docker-compose.prod.yml build cms` puis la même commande
avec `-f docker-compose.prod.yml`.

### Sans Docker

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm cms:seed      # crée l'admin, la clé API bot et des données de base
corepack pnpm cms:dev       # http://localhost:3001
```

MongoDB doit tourner localement (par exemple via `docker compose -f docker-compose.dev.yml up -d mongo`).

## 2. Premier accès

`pnpm cms:seed` — ou `docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed` — crée :

- un utilisateur `bot@iamfabriceg.local` avec le mot de passe `SEED_ADMIN_PASSWORD` (`Admin1234!` par défaut) ;
- une **clé API** affichée en console sous la forme `PAYLOAD_API_KEY=...` à copier dans `.env` ;
- 5 jeux (Fortnite, GTA V, Rocket League, Aniimo, GOALS), 5 commandes de démonstration et le global `botSettings`.

Le seed est idempotent pour les documents : il met à jour l'existant au lieu de le dupliquer. En revanche,
**chaque exécution génère une nouvelle clé API** et l'affiche : recopiez toujours la dernière valeur dans
`.env`, puis recréez le bot (`docker compose -f docker-compose.dev.yml up -d --force-recreate bot`).
Changez le mot de passe admin après le premier login.

## 3. Collections et global

| Slug | Contenu |
|---|---|
| `users` | Auth, rôles `admin` / `editor` / `bot`, clés API |
| `games` | 17 jeux, clé stable, rôle Discord, catégorie, emoji, liens, publication |
| `commands` | Nom, usage, exemples, alias, cooldown, permissions, jeu associé |
| `commandUsages` | Historique d'utilisation (utilisateur, guilde, succès, source) |
| `discordRoles` | Rôles Discord et leur jeu associé |
| `events` | Événements, statut `scheduled` / `live` / `ended` |
| `news` | Actualités avec contenu Lexical, auteur, tags, publication |
| `streamAlerts` | Chaînes Twitch suivies, salon de diffusion, dernier statut |
| `webhookEvents` | Journal des webhooks reçus (Payload / Twitch) et validité de signature |
| `profiles` | Profils Discord (réputation, rôles, dernière activité) |
| `media` | Fichiers uploadés |
| `botSettings` (global) | Nom du bot, description, version,_features, liens, maintenance |

Le front public lit uniquement `games`, `commands`, `news` et `botSettings`.

## 4. Endpoints exposés au bot

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/api/bot/healthz` | Healthcheck du CMS (utilisé par Docker) |
| `GET` | `/api/bot/summary` | Résumé : jeux, commandes, stats, paramètres publics |
| `POST` | `/api/bot/profile` | Upsert d'un profil Discord (clé API requise) |

Les routes REST standards (`/api/games`, `/api/commands`, …) restent accessibles avec :

```http
Authorization: users API-Key <PAYLOAD_API_KEY>
```

Le bot les consomme via `src/services/payload.js` (`getGames`, `syncGames`, `upsertDiscordProfile`, …).

Exemple :

```bash
curl -s http://localhost:3001/api/bot/summary | jq .
```

## 5. Webhooks vers le bot

Les collections `games`, `commands`, `news` et `events` ont un hook `afterChange`. À chaque création /
mise à jour, le CMS POSTe vers `${BOT_WEBHOOK_URL}/webhooks/payload` :

```json
{
  "event": "games.update",
  "collection": "games",
  "operation": "update",
  "id": "...",
  "doc": { "title": "Fortnite", "slug": "fortnite" }
}
```

En-têtes :

```http
Content-Type: application/json
x-payload-signature: <HMAC-SHA256 du corps brut avec WEBHOOK_SECRET, en hexadécimal>
x-webhook-secret: <WEBHOOK_SECRET en clair, accepté en secours>
```

Le bot vérifie la signature avec `timingSafeEqual` et journalise l'événement. Si le bot est arrêté, le hook
échoue silencieusement (`console.warn`) et ne bloque pas l'écriture dans le CMS.

## 6. Sécurité

- `PAYLOAD_SECRET` : secret de session/chiffrement, à générer avec `openssl rand -hex 32`.
- `WEBHOOK_SECRET` : doit être **identique** dans `.env` du bot et du CMS (même fichier en local/Docker).
- Ne jamais exposer l'admin sur Internet sans HTTPS et sans protection complémentaire (reverse proxy, IP autorisée).
- Le front public n'affiche que les champs explicitement sélectionnés : aucun secret, aucune clé, aucun
  document non publié.
- `backup/` ne doit jamais être utilisé pour stocker ces secrets.

## 7. Variables d'environnement

Voir [`.env.example`](../.env.example). Les plus importantes pour le CMS :

```env
DATABASE_URI=mongodb://127.0.0.1:27017/iamfabriceg_bot
PAYLOAD_SECRET=
PAYLOAD_URL=http://127.0.0.1:3001
CMS_PORT=3001
BOT_WEBHOOK_URL=http://127.0.0.1:3000
WEBHOOK_SECRET=
SEED_ADMIN_PASSWORD=Admin1234!
```

En Docker, les compose files surchargent automatiquement :

- `DATABASE_URI=mongodb://mongo:27017/iamfabriceg_bot`
- `PAYLOAD_URL=http://cms:3001`
- `BOT_WEBHOOK_URL=http://bot:3000`
