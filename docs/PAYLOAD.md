# Intégration Payload CMS v3

Le bot parle au CMS via la **REST API générée automatiquement** par Payload v3. Aucun SDK n'est nécessaire.

## 1. Configuration

Dans `.env` :

```env
# URL interne service-à-service (bot -> CMS)
PAYLOAD_URL=http://cms:3001
# Origine navigateur autorisée dans csrf/cors (admin Payload)
PAYLOAD_PUBLIC_URL=http://localhost:31001
PAYLOAD_AUTH_SLUG=users
PAYLOAD_GAMES_SLUG=games
PAYLOAD_API_KEY=...
WEBHOOK_SECRET=...
```

Créez un utilisateur dédié au bot dans la collection d'authentification, avec `auth.useAPIKey: true`, et des droits en lecture seule si vous n'avez pas besoin d'écriture.

Format de l'en-tête envoyé par le bot :

```http
Authorization: <PAYLOAD_AUTH_SLUG> API-Key <PAYLOAD_API_KEY>
```

## 2. Mode lecture + cache

```js
const { createPayloadClient } = require("../src/services/payload");
const client = createPayloadClient();      // null si PAYLOAD_URL absent
const games = await client.getGames();      // GET /api/games?depth=1&limit=100&sort=name
```

Réponses mises en cache 5 minutes dans `src/services/cache.js`.
La commande `/sync` fusionne les documents distants avec `src/config/games.js`.

Champs reconnus pour un document `games` :

| Champ Payload | Usage |
|---|---|
| `title` ou `name` | Nom affiché |
| `slug` ou `key` | Clé stable |
| `discordRoleId` / `roleId` | Rôle Discord |
| `category`, `emoji`, `description`, `search` | Métadonnées |

Paramètres utiles : `depth`, `limit`, `page`, `sort`, `select`, `where[status][equals]=published`, `locale`, `fallback-locale`.

## 3. Custom endpoint `/api/bot/...`

Côté CMS, exposez uniquement les données nécessaires. L'implémentation réelle est un **custom endpoint
Payload** dans `cms/src/endpoints/bot-summary.ts` (pas une route `src/app/api/...`) :

```ts
// cms/src/endpoints/bot-summary.ts (extrait)
export const botEndpoints: Endpoint[] = [
  {
    path: '/bot/summary',
    method: 'GET',
    handler: async (req) => {
      const payload = await getPayload({ config: await import('@payload-config').then((m) => m.default) })
      const games = await payload.find({ collection: 'games', limit: 100, where: { published: { equals: true } } })
      const commands = await payload.find({ collection: 'commands', limit: 100, where: { active: { equals: true } } })
      const news = await payload.find({ collection: 'news', limit: 5, sort: '-createdAt' })
      return Response.json({ games: games.docs, commands: commands.docs, news: news.docs })
    },
  },
]
```

Le front public (`cms/src/app/(frontend)/page.tsx`) utilise la Local API et lit les mêmes collections.

Appel depuis le bot :

```js
const summary = await client.custom("bot/summary"); // GET /api/bot/summary
```

Le bot envoie automatiquement l'en-tête `API-Key` et met la réponse en cache.

## 4. Mode écriture

```js
await client.create("games", { title: "Nouveau jeu", slug: "nouveau-jeu" });
await client.update("games", id, { discordRoleId: "123456789" });
await client.remove("games", id);
await client.upsertDiscordProfile(interaction.user.id, { username: "Fabrice" });
```

`upsertDiscordProfile` appelle `POST /api/bot/profile`. Côté CMS, vérifiez l'en-tête `API-Key` et faites un `upsert` sur le champ `discordId`.

## 5. Télémétrie et statistiques (1.1.0)

Le bot enregistre chaque interaction en **fire and forget** : `src/services/analytics.js` appelle
`payload.recordUsage()` sans bloquer la réponse Discord. `USAGE_TELEMETRY_ENABLED=false` désactive
l'enregistrement. Les documents sont répartis ainsi :

| Endpoint | Collection(s) | Données |
|---|---|---|
| `POST /api/bot/usage` | `commandUsages`, `profiles`, `commands`, `botSettings.loyalty` | une interaction : commande, utilisateur, guilde, succès/échec, durée, points |
| `GET /api/bot/stats?period=day\|week\|month\|all` | lecture des mêmes collections | totaux, succès, points, paliers, journal, classement, activité par jour |

Exemples :

```js
const { createPayloadClient } = require("./src/services/payload")
const client = createPayloadClient()

await client.recordUsage({
  commandName: "ping",
  userId: "580073418968530973",
  username: "iamfabriceg",
  outcome: "success",
  source: "chatInput",
  durationMs: 42,
})
const stats = await client.getStats({ period: "week", userId: "580073418968530973" })
```

Ces chiffres alimentent le widget du dashboard `/admin` et la vue complète `/admin/stats` (voir
[`docs/CMS.md#tableau-de-bord-et-statistiques-110`](./CMS.md#tableau-de-bord-et-statistiques-110)).
Une vérification réelle a été faite le 22/11/2026 : `POST /api/bot/usage` → 200 (`points: 2`),
`GET /api/bot/stats?period=day` → 200 (`filtered: 1`, `successes: 1`), puis la donnée de test a été
supprimée et le compteur `/ping` remis à 0.

## 6. Actions admin signées

`POST /api/bot/admin/action` est réservé à un utilisateur connecté à l'admin. Le CMS signe un corps
JSON `{ action, requestedBy }` avec `WEBHOOK_SECRET` (HMAC-SHA256, en-tête `x-webhook-signature`) et
l'envoie à `POST {BOT_WEBHOOK_URL}/admin/actions/{action}`. Le bot refuse toute signature invalide et ne
connaît que `deploy-commands` et `sync-commands`. Le secret ne transite jamais par le navigateur.

```bash
curl -s -X POST http://localhost:31001/api/bot/admin/action \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"action":"sync-commands"}'
# → { "ok": true, "action": "sync-commands", "status": 200,
#     "result": { "ok": true, "result": { "created": 0, "updated": 18, "total": 18 } } }
```

Si la sync échoue avec `403`, le conteneur `bot` utilise une ancienne `PAYLOAD_API_KEY` : le recréer
(`docker compose -f docker-compose.dev.yml up -d --force-recreate bot`). Voir le
[dépannage CMS](./CMS.md#403-you-are-not-allowed-to-perform-this-action-sur-la-sync-cms).

## 7. Webhooks Payload → bot

### Côté CMS (hook `afterChange`)

Les hooks sont centralisés dans `cms/src/hooks/notify-bot.ts` et branchés sur les collections réelles
`games`, `commands`, `news` et `events` :

```ts
// cms/src/hooks/notify-bot.ts (extrait)
const body = JSON.stringify({ event: `${collection}.${operation}`, collection, operation, id: doc.id, doc })
const headers: Record<string, string> = { 'Content-Type': 'application/json' }
if (process.env.WEBHOOK_SECRET) {
  headers['x-payload-signature'] = createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
}
await fetch(`${process.env.BOT_WEBHOOK_URL}/webhooks/payload`, { method: 'POST', headers, body })
```

Si `WEBHOOK_SECRET` est vide, aucun `x-payload-signature` n'est envoyé : renseigner la même valeur
dans le bot et le CMS (voir [`docs/CMS.md#5-webhooks`](./CMS.md#5-webhooks)).

### Côté bot

`POST /webhooks/payload` :

- vérifie `x-payload-signature` (ou `x-webhook-signature`) avec `WEBHOOK_SECRET` (HMAC-SHA256 en hexadécimal, comparaison `timingSafeEqual`) ;
- accepte `{ event, doc }` ou `{ collection, operation, doc }` ;
- publie un embed dans `ANNOUNCEMENT_CHANNEL_ID` (ou `LOG_CHANNEL_ID`).

Sans `WEBHOOK_SECRET`, les webhooks sont acceptés sans vérification — **à ne faire qu'en développement local**.

## 8. Sécurité

- Ne jamais coller la clé dans le chat ni dans un fichier versionné : uniquement `.env`.
- Utiliser une clé dédiée au bot, avec le moins de droits possible.
- `backup/` est lecture seule et ne doit pas être utilisé pour stocker des secrets.
