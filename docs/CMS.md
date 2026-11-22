# Administration Payload — admin et front public

Le CMS est un projet autonome dans [`cms/`](../cms), mais il fait partie du même workspace pnpm.
Il utilise **Payload 3.94.1**, **Next.js 16.4.6**, **React 19.3.1**, **TypeScript** et **MongoDB 8**.

## 1. Admin CMS

### Démarrage

Avec Docker (recommandé) :

```bash
corepack pnpm docker:dev
```

| Service | URL |
|---|---|
| Admin Payload | http://localhost:3001/admin |
| Front public | http://localhost:3001/ |
| Endpoint santé CMS | http://localhost:3001/api/bot/healthz |
| Endpoint résumé bot | http://localhost:3001/api/bot/summary |
| MongoDB | mongodb://localhost:27020/iamfabriceg_bot |

Premier lancement (seed via Docker, sans pnpm local) :

```bash
docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed
# copier PAYLOAD_API_KEY=... dans .env
docker compose -f docker-compose.dev.yml up -d --force-recreate bot
```

Le service `cms-seed` est dans le profil `tools` : il ne démarre jamais avec `up -d`, uniquement avec
`run --rm`. En production : `docker compose -f docker-compose.prod.yml build cms` puis la même commande
avec `-f docker-compose.prod.yml`.

Sans Docker :

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm cms:seed      # crée l'admin, la clé API bot et des données de base
corepack pnpm cms:dev       # http://localhost:3001 (Webpack)
```

MongoDB doit tourner localement (par exemple via `docker compose -f docker-compose.dev.yml up -d mongo`).
Le script `dev` force Webpack (`next dev --webpack`) : avec Turbopack, Payload 3 + Next 16 échoue sur
`resolve-url-loader` / `loader-runner`. Le build production (`pnpm --filter cms build`) utilise Turbopack
et fonctionne.

### Premier accès

`pnpm cms:seed` — ou `docker compose -f docker-compose.dev.yml --profile tools run --rm cms-seed` — crée :

- un utilisateur `bot@iamfabriceg.local` avec le mot de passe `SEED_ADMIN_PASSWORD` (`Admin1234!` par défaut) ;
- une **clé API** affichée en console sous la forme `PAYLOAD_API_KEY=...` à copier dans `.env` ;
- 5 jeux (Fortnite, GTA V, Rocket League, Aniimo, GOALS), 5 commandes de démonstration et le global `botSettings`.

Le seed est idempotent pour les documents : il met à jour l'existant au lieu de le dupliquer. En revanche,
**chaque exécution génère une nouvelle clé API** et l'affiche : recopiez toujours la dernière valeur dans
`.env`, puis recréez le bot (`docker compose -f docker-compose.dev.yml up -d --force-recreate bot`).
Changez le mot de passe admin après le premier login.

Rôles : `admin` (tout), `editor` (contenus et globals), `bot` (clé API pour les endpoints). Le bouton
« Add Social Link » nécessite un rôle `admin`/`editor` et une session valide, donc une origine autorisée
(voir [Dépannage](#6-dépannage)).

### URLs et origines

`serverURL` est l'URL **interne** service-à-service : `http://cms:3001` dans Docker. Le navigateur utilise
`PAYLOAD_PUBLIC_URL` (`http://localhost:3001` en local, domaine public en prod). Payload ajoute
automatiquement `serverURL` à `csrf`, mais **ignore le cookie** si l'origine `Origin:` de la requête n'y
figure pas : tous les POST de l'admin tombent alors en 401/403. La configuration ajoute donc explicitement
`csrf: [publicURL, http://localhost:3001, http://127.0.0.1:3001]` et `cors: [publicURL]`.

### Endpoints exposés au bot

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

```bash
curl -s http://localhost:3001/api/bot/summary | jq .
```

### Sécurité

- `PAYLOAD_SECRET` : secret de session/chiffrement, à générer avec `openssl rand -hex 32`. Le changer
  invalide toutes les sessions actives : se reconnecter à `/admin`.
- `WEBHOOK_SECRET` : doit être **identique** dans `.env` du bot et du CMS (même fichier en local/Docker).
- Ne jamais exposer l'admin sur Internet sans HTTPS et sans protection complémentaire (reverse proxy, IP autorisée).
- `backup/` ne doit jamais être utilisé pour stocker ces secrets.

### Variables d'environnement

Voir [`.env.example`](../.env.example). Les plus importantes pour le CMS :

```env
DATABASE_URI=mongodb://127.0.0.1:27020/iamfabriceg_bot
PAYLOAD_SECRET=
# Interne : bot -> CMS
PAYLOAD_URL=http://127.0.0.1:3001
# Navigateur : origine autorisée dans csrf/cors
PAYLOAD_PUBLIC_URL=http://localhost:3001
CMS_PORT=3001
BOT_WEBHOOK_URL=http://127.0.0.1:3012
WEBHOOK_SECRET=
SEED_ADMIN_PASSWORD=Admin1234!
```

En Docker, les compose files surchargent automatiquement :

- `DATABASE_URI=mongodb://mongo:27017/iamfabriceg_bot`
- `PAYLOAD_URL=http://cms:3001`
- `BOT_WEBHOOK_URL=http://bot:3000`
- `PAYLOAD_PUBLIC_URL=http://localhost:3001` (dev) / `${PAYLOAD_PUBLIC_URL}` (prod)

## 2. Front public

La page `/` est rendue côté serveur (`export const dynamic = 'force-dynamic'`) via la **Local API** de
Payload (`getPayload({ config })` dans `cms/src/app/(frontend)/page.tsx`). Aucun `fetch`, `useEffect` ni
appel à `PAYLOAD_URL` : il n'y a donc ni boucle HTTP ni dépendance au réseau interne pour l'affichage.

Données lues : `games` publiés, `commands` actives, `news` publiées et le global `botSettings`.
Aucun formulaire d'écriture n'est exposé. `socialLinks` est éditable dans l'admin mais n'est pas encore
rendu sur la page publique : prévu dans `PLAN.md` (`CMS-FEAT-1`).

## 3. Globals `botSettings`

Slug : `botSettings` — accessible à la lecture publique, en écriture aux rôles `admin`/`editor`.

| Champ | Type | Rôle |
|---|---|---|
| `botName`, `description`, `version`, `publicUrl` | text/textarea | Identité affichée par le bot et le front |
| `discordInvite`, `twitchChannel`, `announcementChannelId` | text | Liens et salon d'annonce |
| `maintenanceMode` | checkbox | Active le mode maintenance |
| `features` | group | `games`, `pokemon`, `fortnite`, `riot`, `steam`, `twitch`, `cms` |
| `socialLinks` | array | `label` + `url` ; tableau vide par défaut (`defaultValue: []`) |

Le bouton « Add Social Link » ajoute une ligne `{ label, url }` au tableau. La sauvegarde doit répondre
`200` et persister la valeur ; le script [`scripts/cms-smoke.sh`](../scripts/cms-smoke.sh) automatise
login + écriture + restauration de `socialLinks: []`.

## 4. Collections

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

Points de schéma vérifiés (aucun ne provoque de spinner) : `aliases`/`permissions` en `text hasMany`,
`examples` en array, `options` en `json`, `source`/`status` en `select` avec `options` valides, `richText`
Lexical, relations uniquement vers `games`/`users`, `guilds` et `socialLinks` avec `defaultValue: []`.

## 5. Webhooks

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

Si `WEBHOOK_SECRET` est vide, le hook n'envoie **pas** de signature : renseigner la variable dans les deux
services. Le bot vérifie avec `timingSafeEqual` et journalise l'événement. Si le bot est arrêté, le hook
échoue silencieusement (`console.warn`) et ne bloque pas l'écriture dans le CMS.

## 6. Dépannage

### Spinner infini sur « Add Social Link » / POST 401-403

Cause : l'origine du navigateur n'est pas dans la liste CSRF de Payload. `serverURL=http://cms:3001`
alors que le navigateur envoie `Origin: http://localhost:3001` : le cookie de session est ignoré, tous
les POST admin échouent. Correctif : `PAYLOAD_PUBLIC_URL` + `csrf`/`cors` dans `payload.config.ts`, puis
recréer le CMS. Vérification :

```bash
bash scripts/cms-smoke.sh
docker compose -f docker-compose.dev.yml logs cms | grep -E 'form state| 401 | 403 '
```

Une écriture `200` et l'absence de `Unauthorized` / `There was an error building form state` confirment
la correction. Si le bouton charge encore : vider le cache du navigateur et se reconnecter à `/admin`
(le secret de session a pu changer).

### Erreurs 500 au démarrage du CMS

`Could not find the Next.js package`, `loader-runner`, `resolve-url-loader` ou
`Build directory is not writeable` indiquent un `.next` mélangé (dev/Turbopack/production) ou créé par
root. En dev, le script `dev` force Webpack. Pour repartir propre :

```bash
docker compose -f docker-compose.dev.yml stop cms
sudo rm -rf cms/.next
mkdir -p cms/.next
docker compose -f docker-compose.dev.yml up -d cms
```

En local, `pnpm --filter cms build` doit être lancé par l'utilisateur propriétaire du dépôt (pas `root`).

### Session admin perdue

`PAYLOAD_SECRET` change invalide les cookies : se reconnecter avec `bot@iamfabriceg.local` et
`SEED_ADMIN_PASSWORD`. Après un `cms-seed`, recopier la nouvelle `PAYLOAD_API_KEY` dans `.env` et
recréer le conteneur `bot`.
