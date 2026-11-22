# Intégration Payload CMS v3

Le bot parle au CMS via la **REST API générée automatiquement** par Payload v3. Aucun SDK n'est nécessaire.

## 1. Configuration

Dans `.env` :

```env
PAYLOAD_URL=https://votre-site.com
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

Côté CMS, exposez uniquement les données nécessaires. Exemple de route Next.js (App Router) :

```ts
// src/app/api/bot/summary/route.ts
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export async function GET() {
  const payload = await getPayload({ config: await configPromise })

  const games = await payload.find({
    collection: 'games',
    limit: 100,
    select: { title: true, slug: true, discordRoleId: true },
  })

  const news = await payload.find({
    collection: 'posts',
    limit: 5,
    sort: '-createdAt',
    where: { status: { equals: 'published' } },
  })

  return Response.json({
    games: games.docs,
    news: news.docs.map(({ title, slug, excerpt }) => ({ title, slug, excerpt })),
  })
}
```

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

## 5. Webhooks Payload → bot

### Côté CMS (hook `afterChange`)

```ts
// src/collections/Posts.ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || doc.status !== 'published') return
        await fetch(`${process.env.BOT_WEBHOOK_URL}/webhooks/payload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-payload-signature': crypto
              .createHmac('sha256', process.env.WEBHOOK_SECRET!)
              .update(JSON.stringify({ event: 'post.published', doc }))
              .digest('hex'),
          },
          body: JSON.stringify({ event: 'post.published', doc: { title: doc.title, slug: doc.slug } }),
        })
      },
    ],
  },
  fields: [{ name: 'title', type: 'text', required: true }, { name: 'slug', type: 'text' }],
}
```

### Côté bot

`POST /webhooks/payload` :

- vérifie `x-payload-signature` (ou `x-webhook-signature`) avec `WEBHOOK_SECRET` (HMAC-SHA256 en hexadécimal, comparaison `timingSafeEqual`) ;
- accepte `{ event, doc }` ou `{ collection, operation, doc }` ;
- publie un embed dans `ANNOUNCEMENT_CHANNEL_ID` (ou `LOG_CHANNEL_ID`).

Sans `WEBHOOK_SECRET`, les webhooks sont acceptés sans vérification — **à ne faire qu'en développement local**.

## 6. Sécurité

- Ne jamais coller la clé dans le chat ni dans un fichier versionné : uniquement `.env`.
- Utiliser une clé dédiée au bot, avec le moins de droits possible.
- `backup/` est lecture seule et ne doit pas être utilisé pour stocker des secrets.
