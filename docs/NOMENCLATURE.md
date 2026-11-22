# Nomenclature officielle — iamfabriceg Bot

> Validée le 23/11/2026. Toute nouvelle commande, URL, collection ou variable doit suivre ce document.

## 1. Deux identités distinctes

| Identité | Valeur | Usage |
|---|---|---|
| **Pseudo / marque personnelle** | `iamfabriceg` | Site `iamfabriceg.xyz`, Twitch `twitch.tv/iamfabriceg`, lien GitHub, activité Discord « Watching iamfabriceg.xyz » |
| **Nom du projet** | `iamfabriceg Bot` | Nom affiché dans Discord, admin Payload, front public, embeds, documentation, titre des PR |
| **Préfixe technique** | `iamfabriceg-bot-` | Conteneurs, volumes, projets Compose, base MongoDB, noms de service |

Règle : `iamfabriceg` **seul** désigne la personne / la marque. Dès qu'il s'agit du bot, on utilise
soit `iamfabriceg Bot` (affichage), soit `iamfabriceg-bot-` (technique).

## 2. Tableau par cas

| Cas | Valeur retenue | Remarque |
|---|---|---|
| Nom public | `iamfabriceg Bot` | « Discord » reste dans la description, pas dans le nom court |
| Nom du dépôt GitHub | `iamfabriceg-bot-discord` | **Conservé** — décision à revoir après les PR |
| Package npm racine | `iamfabriceg-bot-discord` | Doit rester identique au dépôt pour `pnpm --filter` |
| Package npm CMS | `cms` | Nom de workspace interne, inchangé |
| Projet Docker Compose | `iamfabriceg-bot` | `name:` dans les deux compose files |
| Service Compose / bot | `bot` | Nom de service court, utilisé par `BOT_WEBHOOK_URL=http://bot:3000` |
| Service Compose / CMS | `cms` | Nom de service court, utilisé par `PAYLOAD_URL=http://cms:3001` |
| Service Compose / base | `mongo` | Nom de service court, utilisé par `DATABASE_URI=mongodb://mongo:27017/…` |
| Conteneur bot | `iamfabriceg-bot-discord` | `container_name` |
| Conteneur CMS | `iamfabriceg-bot-cms` | `container_name` |
| Conteneur MongoDB | `iamfabriceg-bot-mongo` | `container_name` |
| Image bot | `iamfabriceg/bot-discord:latest` | Namespace Docker = pseudo |
| Image CMS | `iamfabriceg/bot-cms:latest` | Namespace Docker = pseudo |
| Volumes Docker | `iamfabriceg-bot-mongo-data`, `iamfabriceg-bot-node-modules`, `iamfabriceg-bot-cms-store`, `iamfabriceg-bot-cms-node-modules`, `iamfabriceg-bot-cms-next` | Préfixe systématique |
| Base MongoDB | `iamfabriceg_bot` | Snake case (convention MongoDB) |
| Utilisateur admin CMS | `bot@iamfabriceg.local` | Créé par `pnpm cms:seed` ou `docker compose ... run --rm cms-seed` |
| `botSettings.botName` | `iamfabriceg Bot` | Valeur par défaut du global Payload |
| `service` du `/healthz` bot | `iamfabriceg-bot` | Identifiant machine lisible |
| Titre du front public | `iamfabriceg Bot` | Metadata Next.js |
| URL locale bot | `http://127.0.0.1:3012` | — |
| URL locale CMS | `http://127.0.0.1:3001` | Admin `/admin`, front `/` |
| URL Docker bot | `http://bot:3000` | Depuis le réseau Compose |
| URL Docker CMS | `http://cms:3001` | Depuis le réseau Compose |

## 3. Ce qui ne doit PAS être renommé

- Les liens vers `https://iamfabriceg.xyz`, `https://twitch.tv/iamfabriceg` et `https://fabricegeib.com`.
- Le pseudo par défaut de la commande `twitch:subscribe iamfabriceg`.
- Le nom du dépôt GitHub (pour l'instant, voir §5).
- Le contenu de `docs/archive/` : copies exactes des anciens README, conservées telles quelles.
- Le dossier `backup/` : lecture seule, aucun fichier n'y est modifié.

## 4. Anciens README conservés

| Fichier | Origine |
|---|---|
| [`docs/archive/README.original.md`](./archive/README.original.md) | Version d'origine sur `master` (`4a685c2`) |
| [`docs/archive/README.modernisation-2026.md`](./archive/README.modernisation-2026.md) | Version de la PR #24 (`8162b2c`) |

Ces fichiers sont des copies intégrales, non modifiées. Le `README.md` à la racine est la version courante.

## 5. Décision en attente

L'utilisateur a demandé de revenir sur le **renommage du dépôt GitHub**
(`iamfabriceg-bot-discord` → `iamfabriceg-bot`) une fois les pull requests terminées.
Tant que la décision n'est pas prise, le nom actuel est conservé et référencé dans les PR.
