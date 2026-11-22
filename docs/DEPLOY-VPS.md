# Mise en production VPS — guide complet

Guide opérationnel unique pour passer **iamfabriceg Bot** (bot Discord + CMS/admin + front public)
du poste de développement au VPS, via **SSH**, **Docker Compose** et **Nginx Proxy Manager**.

> Dernière vérification complète : **2026-11-22** — version **1.1.0**, branche
> `build/docker-pnpm-payload-admin`, commit `3f4a61b`.

---

## 0. Ordre des étapes (résumé)

| # | Où | Action |
|---|---|---|
| 1 | Local | Vérifier tests / lint / TypeScript / santé des conteneurs (§2) |
| 2 | Local | Compléter les clés API souhaitées dans `.env` (§3) |
| 3 | Local | Construire et pousser les deux images (§4) — **déjà fait pour 1.1.0** |
| 4 | Local | Exporter MongoDB (§5) — **archive déjà produite** |
| 5 | VPS | Se connecter en SSH, copier Compose + `.env` + archive (§6) |
| 6 | VPS | Restaurer MongoDB (§7) |
| 7 | VPS | Démarrer la stack Docker Compose (§8) |
| 8 | NPM | Créer le Proxy Host HTTPS (§9) |
| 9 | VPS + Discord + iPhone | Vérifications finales (§10) |
| 10 | VPS | Mises à jour / retour arrière (§11) |

---

## 1. Architecture et choix retenus

| Élément | Valeur |
|---|---|
| Registre Docker | `registry.fabricegeib.com` |
| Image bot | `registry.fabricegeib.com/iamfabriceg-bot:1.1.0` |
| Image CMS / front / admin | `registry.fabricegeib.com/iamfabriceg-bot-cms:1.1.0` |
| URL publique | `https://bot.iamfabriceg.xyz` |
| Variable de domaine | `DEPLOY_URL` (dans le Compose prod, valeur par défaut ci-dessus) |
| Reverse proxy | Nginx Proxy Manager, réseau Docker externe `nginx-proxy-manager` |
| Base | MongoDB 8 dans la stack, volume `iamfabriceg-bot-mongo-data` |
| Médias | Aucun fichier local à migrer (stockés dans MongoDB) |
| Ports hôte | `127.0.0.1:3001` (CMS) et `127.0.0.1:3012` (bot) — NPM only |

**Alternatives de domaine** : `discord.iamfabriceg.xyz`, `iamfabriceg-bot.xyz`,
`admin.iamfabriceg.xyz`. Le changement se fait avec `DEPLOY_URL` dans le Compose et le Proxy Host
de NPM — **aucune reconstruction d’image n’est nécessaire**.

> ⚠️ Ne pas utiliser `PAYLOAD_PUBLIC_URL` ni `PUBLIC_URL` du `.env` local pour définir le domaine
> de production : ces variables valent `http://localhost:3001` et `https://bot.exemple.com` en
> local. Le Compose prod les **remplace** par `DEPLOY_URL`, ce qui évite toute fuite de la config
> locale vers le conteneur.

---

## 2. État vérifié du projet (audit 2026-11-22)

### 2.1 Qualité et tests

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests bot | `docker compose -f docker-compose.dev.yml exec -T bot pnpm test` | **37 pass / 0 fail** |
| Lint bot | `… exec -T bot pnpm lint` | 0 erreur |
| Lint CMS | `… exec -T cms pnpm --filter cms lint` | 0 erreur, 13 warnings `any` préexistants |
| TypeScript CMS | `… exec -T cms pnpm --filter cms exec tsc --noEmit` | OK |
| Build Next.js | `docker build -f cms/Dockerfile …` | Compilation + TS + routes OK |
| Compose prod | `docker compose -f docker-compose.prod.yml config --quiet` | OK |
| Compose VPS | `… -f docker-compose.prod.yml -f docker-compose.vps.yml config --quiet` | OK |
| Git | `git status -sb` | Branche synchronisée avec `origin` |

Les 37 tests couvrent entre autres : usage MongoDB, cache, garde-fous de réponse Discord,
318 héros STW (filtrage accent-insensible), catalogue 17 jeux, **résolution des rôles depuis
l’environnement**, signature HMAC, client Payload et chargement des 18 commandes.

### 2.2 Conteneurs et endpoints locaux

| Conteneur | État | Endpoint |
|---|---|---|
| `iamfabriceg-bot-mongo` | healthy | `mongodb://127.0.0.1:27017/iamfabriceg_bot` (interne) |
| `iamfabriceg-bot-cms` | healthy | `http://localhost:3001/api/bot/healthz` → `{"ok":true,"database":"ok"}` |
| `iamfabriceg-bot-discord` | healthy | `http://localhost:3012/healthz` → `{"ok":true,...}` |

Base locale : **18 commandes**, **5 jeux**, **5 usages**, **1 global**, **16 collections**
(dont `discordroles`, vide — les rôles sont résolus depuis le `.env`, voir §2.4).

```bash
docker exec iamfabriceg-bot-mongo mongosh --quiet --eval '
  const db = db.getSiblingDB("iamfabriceg_bot");
  printjson({ collections: db.getCollectionNames().length,
              commands: db.commands.countDocuments({}),
              games: db.games.countDocuments({}) })'
```

### 2.3 Audit du `.env` (valeurs masquées)

| Variable | État | Remarque |
|---|---|---|
| `DISCORD_TOKEN` | ✅ renseigné | Conservé, pas de rotation |
| `CLIENT_ID` / `GUILD_ID` | ✅ | `580073418968530973` / `481653519674507274` |
| `ROLES_CHANNEL_ID` | ✅ | `652684137957818378` (#bot-test, confirmé) |
| `LOG_CHANNEL_ID` / `ANNOUNCEMENT_CHANNEL_ID` | ✅ | Renseignés |
| `ROLE_ANIIMO_ID` | ✅ | `1559377573799264326` |
| `ROLE_GOALS_ID` | ✅ | `1573849346045378600` |
| `WEBHOOK_SECRET`, `PAYLOAD_SECRET`, `PAYLOAD_API_KEY` | ✅ | Secrets générés, à copier tels quels sur le VPS |
| `FORTNITE_API_KEY` | ✅ | Stats Battle Royale actives |
| `RAWG_API_KEY`, `RIOT_API_KEY`, `STEAM_API_KEY` | ⚪ vides | **Optionnelles** (§3) |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | ⚪ vides | **Optionnelles** (§3.4) |
| `PUBLIC_URL` | ⚠️ `https://bot.exemple.com` | Valeur modèle ; neutralisée en prod par `DEPLOY_URL` |
| `PAYLOAD_PUBLIC_URL` | ⚠️ `http://localhost:3001` | Idem — ne pas la modifier, le Compose prod l’ignore |

### 2.4 Rôles Discord

Les boutons de rôle fonctionnent (ajout/retrait validés). Les IDs sont lus depuis le `.env`
grâce à `roleEnv` dans `src/config/games.js` (`ROLE_ANIIMO_ID`, `ROLE_GOALS_ID`) ; la collection
MongoDB `discordroles` peut donc rester vide. Si tu veux migrer ces rôles dans le CMS plus tard,
crée deux documents dans **Discord Roles** avec ces mêmes IDs — le code privilégie alors la valeur
MongoDB (`roleId`) sur la variable d’environnement.

### 2.5 Palette de recherche (iPhone)

Dernier correctif (`7f135f6`) validé en navigateur : portail sur `document.body`, `z-index: 1000`,
focus automatique, 8 résultats, `role="dialog"` + `combobox`, fermeture `Escape`, aucune erreur
console. En viewport 390 px, le champ occupe **358 px** (16 px de marge de chaque côté).

### 2.6 Images et archive

Voir §4 et §5 : deux images publiées avec digests, archive MongoDB validée par `mongorestore --dryRun`.

---

## 3. Clés API et secrets — comment les obtenir

### 3.1 Règle générale

- Les clés externes sont **toutes optionnelles**. Une commande dont la clé manque répond avec un
  message explicite du type : `⚙️ RAWG est désactivé : la variable RAWG_API_KEY n'est pas configurée.`
- La commande `/status` affiche l’état de chaque intégration (`enabled` / `disabled`).
- Aucune de ces clés ne bloque le démarrage du bot, du CMS ou du reverse proxy.
- Après ajout d’une clé : modifier `.env`, puis
  `docker compose -f docker-compose.dev.yml up -d --force-recreate bot cms` en local ; sur le VPS,
  recopier le `.env` puis `docker compose -f … up -d --force-recreate bot cms`.

### 3.2 Tableau des clés externes

| Variable | Obtention | Utilité | Statut actuel |
|---|---|---|---|
| `FORTNITE_API_KEY` | <https://dash.fortnite-api.com> → compte → **API key** | `/fortnite stats` (Battle Royale) | ✅ déjà renseignée |
| `RAWG_API_KEY` | <https://rawg.io/apidocs> → sign up → **API key** (20 000 req/mois) | Fiches détaillées `/games info` | ⚪ à créer si souhaité |
| `RIOT_API_KEY` | <https://developer.riotgames.com> → **dev key** (24 h, local uniquement) ou **production key** (sur demande, §3.5) | `/riot` | ⚪ laisser vide en prod tant que la clé prod n’est pas approuvée |
| `STEAM_API_KEY` | <https://steamcommunity.com/dev/apikey> → domaine `localhost` puis ton domaine de prod | `/steam` | ⚪ à créer si souhaité |
| `TWITCH_CLIENT_ID`<br>`TWITCH_CLIENT_SECRET` | <https://dev.twitch.tv/console> → **Register Your Application** → OAuth Redirect `http://localhost` → copier Client ID + **New Secret** | `/twitch` et EventSub | ⚪ à créer si souhaité (§3.4) |

Aucune clé n’est nécessaire pour : PokéAPI, shop/news Fortnite, Save the World (318 héros via
`iamfabriceg.xyz`), FreeToGame, GamerPower, CheapShark, Speedrun.com et Open Trivia.

### 3.3 Secrets internes (déjà présents)

| Secret | Origine | Attention |
|---|---|---|
| `WEBHOOK_SECRET` | `openssl rand -hex 32` | Signe les webhooks Payload/Twitch et les actions du dashboard |
| `PAYLOAD_SECRET` | `openssl rand -hex 32` | Chiffrement des sessions/clés : **doit rester identique** après migration |
| `PAYLOAD_API_KEY` | Affichée en console par `pnpm cms:seed` | **Ne pas relancer le seed en production** |
| `SEED_ADMIN_PASSWORD` | Choisi au seed | À changer dès la première connexion à `/admin` |

Si l’un de ces secrets manquait, le régénérer **localement**, le mettre dans `.env`, puis
refaire le seed uniquement en local et retransférer l’archive. Sur une base déjà importée,
ne jamais changer `PAYLOAD_SECRET` ni `PAYLOAD_API_KEY` sans recopier la nouvelle clé partout.

### 3.4 Cas particulier Twitch — redirect URL ≠ callback EventSub

Ce sont **deux URLs différentes**, à ne pas confondre :

| Champ | Valeur | Rôle |
|---|---|---|
| **OAuth Redirect URL** (console Twitch) | `http://localhost` — ou `http://localhost:3000` (exemple officiel) | Uniquement si tu implémentes un flux OAuth *utilisateur*. Le bot n’en a pas besoin. |
| **EventSub callback** (`DEPLOY_URL` / `PUBLIC_URL`) | `https://bot.iamfabriceg.xyz/webhooks/twitch` | URL HTTPS publique vers le serveur HTTP du bot, pour les alertes. |

Le bot utilise exclusivement le flux **`client_credentials`** (`src/services/providers/twitch.js`) :
il ne demande jamais de token utilisateur. La redirect URL de la console sert donc seulement à
créer l’application ; `http://localhost` suffit, **avec ou sans port** (Twitch accepte les ports
statiques, par exemple `http://localhost:3000`). Inutile d’y mettre l’URL de production. Tu peux
ajouter `https://bot.iamfabriceg.xyz` comme seconde URL plus tard si tu ajoutes un OAuth utilisateur.

Procédure :

1. Créer l’application sur <https://dev.twitch.tv/console/apps> avec OAuth Redirect `http://localhost`
   (ou `http://localhost:3000`), catégorie au choix.
2. Copier **Client ID** et générer un **New Secret** dans `.env`.
3. Laisser `DEPLOY_URL=https://bot.iamfabriceg.xyz` (valeur par défaut du Compose prod). En local,
   le callback EventSub ne peut pas fonctionner : Twitch exige un HTTPS public. La commande
   `/twitch`, elle, fonctionne déjà en local avec le seul app token.
4. Exposer le callback en prod : soit un **second Proxy Host** `bot-api.iamfabriceg.xyz` →
   `iamfabriceg-bot-discord:3000`, soit une règle **Advanced** dans NPM qui envoie
   `/webhooks/twitch` vers le bot.
5. Souscrire aux événements : `node src/tasks/subscribe-twitch.js` (script `pnpm twitch:subscribe`).

### 3.5 Cas particulier Riot — dev key interdite en public

Le message affiché par Riot est normal : la **Development API Key** est réservée au développement,
expire après **24 h**, est fortement limitée en débit et **ne doit jamais être utilisée par un
produit public**. Un bot Discord déployé sur VPS est un produit public.

Deux options :

1. **Recommandé maintenant** : laisser `RIOT_API_KEY=` vide en production. La commande `/riot`
   répond `⚙️ Riot est désactivé : la variable RIOT_API_KEY n'est pas configurée.` ; les 17 autres
   intégrations et toutes les commandes du bot fonctionnent normalement.
2. **Demander une Production API Key** dans le Developer Portal Riot : créer une application,
   décrire le cas d’usage (par exemple « affichage des statistiques du joueur »), fournir un lien
   vers un site/prototype fonctionnel (ici `https://bot.iamfabriceg.xyz/` et sa documentation),
   puis attendre l’approbation. Les clés de production sont limitées à un seul produit et exigent
   l’HTTPS — c’est le cas ici, le bot appelle l’API côté serveur. Une fois la clé obtenue, la
   copier dans le `.env` du VPS puis `--force-recreate bot`.

N’utilise jamais la clé de dev sur le VPS, même temporairement : elle expirerait au bout de 24 h
et pourrait entraîner la révocation de l’accès API.

Les webhooks Payload et les actions du dashboard utilisent `http://bot:3000` **à l’intérieur**
du réseau Docker : aucune exposition publique supplémentaire n’est requise pour eux.

---

## 4. Local — construire et pousser les images (déjà effectué)

```powershell
$REG = "registry.fabricegeib.com"
$TAG = "1.1.0"

docker build -f Dockerfile     -t "$REG/iamfabriceg-bot:$TAG"     -t "$REG/iamfabriceg-bot:latest" .
docker build -f cms/Dockerfile -t "$REG/iamfabriceg-bot-cms:$TAG" -t "$REG/iamfabriceg-bot-cms:latest" .

docker push "$REG/iamfabriceg-bot:$TAG"
docker push "$REG/iamfabriceg-bot:latest"
docker push "$REG/iamfabriceg-bot-cms:$TAG"
docker push "$REG/iamfabriceg-bot-cms:latest"
docker inspect --format '{{index .RepoDigests 0}}' "$REG/iamfabriceg-bot:$TAG"
docker inspect --format '{{index .RepoDigests 0}}' "$REG/iamfabriceg-bot-cms:$TAG"
```

**Publication du 2026-11-22 terminée** (`1.1.0` et `latest` pointent sur les mêmes digests) :

| Image | Digest |
|---|---|
| `registry.fabricegeib.com/iamfabriceg-bot` | `sha256:7cb5bb8bcd47559f653b5c938b9abe80e49f29e55af38701cd2248a0d6a489f4` |
| `registry.fabricegeib.com/iamfabriceg-bot-cms` | `sha256:b181c774b5e77b4cdd452109aa52b04dcf53d54a94e5530d78dc94aedc08e135` |

---

## 5. Local — exporter MongoDB (déjà effectué)

```powershell
$stamp = Get-Date -Format 'yyyy-MM-dd'
$archive = "backups/iamfabriceg-bot-$stamp.archive.gz"
New-Item -ItemType Directory -Force backups | Out-Null

docker exec iamfabriceg-bot-mongo mongodump `
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot" `
  --archive=/tmp/iamfabriceg-bot.archive.gz --gzip
docker cp iamfabriceg-bot-mongo:/tmp/iamfabriceg-bot.archive.gz $archive
Get-FileHash $archive -Algorithm SHA256

docker exec iamfabriceg-bot-mongo mongorestore `
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot_check" `
  --archive=/tmp/iamfabriceg-bot.archive.gz --gzip --dryRun
```

**Archive produite** : `backups/iamfabriceg-bot-2026-11-22.archive.gz` — 10 147 octets,
SHA-256 `390180301D0CFE0027009CFF388D2DA57B18160F5B60D1F24E4466A49F7EFA1F`.
`mongorestore --dryRun` : `dry run completed`, 0 document en échec. Le dossier `backups/`
est ignoré par Git : **ne jamais committer l’archive**.

---

## 6. VPS — connexion SSH et préparation des fichiers

```powershell
# Depuis Windows / WSL
ssh debian@IP_DU_VPS
```

Sur le VPS :

```bash
sudo mkdir -p /opt/iamfabriceg-bot/backups
sudo chown -R debian:debian /opt/iamfabriceg-bot
cd /opt/iamfabriceg-bot

# Vérifier Docker et le réseau de Nginx Proxy Manager
docker version --format '{{.Server.Version}}'
docker compose version
docker network ls | grep -i proxy        # le nom exact peut varier
docker network inspect nginx-proxy-manager >/dev/null && echo 'réseau OK'
```

Si le réseau s’appelle autrement (ex. `npm_default`), modifier `docker-compose.vps.yml` en
conséquence : c’est le seul endroit à ajuster.

Retour sur la machine locale pour les transferts (`scp`) :

```powershell
scp docker-compose.prod.yml docker-compose.vps.yml debian@IP_DU_VPS:/opt/iamfabriceg-bot/
scp .env debian@IP_DU_VPS:/opt/iamfabriceg-bot/.env
scp backups/iamfabriceg-bot-2026-11-22.archive.gz debian@IP_DU_VPS:/opt/iamfabriceg-bot/backups/
```

De retour sur le VPS :

```bash
cd /opt/iamfabriceg-bot
chmod 600 .env

# Contrôle des secrets attendus (affiche les valeurs : à faire sur un terminal de confiance)
grep -E '^(DISCORD_TOKEN|CLIENT_ID|GUILD_ID|PAYLOAD_SECRET|PAYLOAD_API_KEY|WEBHOOK_SECRET)=' .env

# Domaine public : une seule variable, utilisée par le Compose prod
grep -q '^DEPLOY_URL=' .env || echo 'DEPLOY_URL=https://bot.iamfabriceg.xyz' >>.env

# Validation de la configuration avant tout démarrage
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml config --quiet

# Connexion au registre privé puis téléchargement des images
echo "$REGISTRY_PASSWORD" | docker login registry.fabricegeib.com \
  --username "$REGISTRY_USERNAME" --password-stdin
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml pull
```

> `PAYLOAD_PUBLIC_URL` et `PUBLIC_URL` du `.env` restent à leurs valeurs locales : le Compose prod
> les remplace par `DEPLOY_URL`. Inutile de les éditer (et dangereux de mettre `localhost`).

---

## 7. VPS — importer la base MongoDB

```bash
cd /opt/iamfabriceg-bot
COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml"

$COMPOSE up -d mongo
$COMPOSE ps mongo

docker cp backups/iamfabriceg-bot-2026-11-22.archive.gz \
  iamfabriceg-bot-mongo:/tmp/restore.archive.gz

docker exec iamfabriceg-bot-mongo mongorestore \
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot" \
  --archive=/tmp/restore.archive.gz --gzip --drop

docker exec iamfabriceg-bot-mongo mongosh --quiet \
  --eval 'const d=db.getSiblingDB("iamfabriceg_bot"); printjson({collections:d.getCollectionNames().length, commands:d.commands.countDocuments({}), games:d.games.countDocuments({})})'
```

Résultat attendu : **16 collections**, **18 commandes**, **5 jeux**.

> `--drop` écrase les collections existantes : à n’utiliser que sur une base neuve ou après
> sauvegarde. **Ne pas lancer `cms-seed` après l’import** — le seed régénérerait `PAYLOAD_API_KEY`.

---

## 8. VPS — démarrer la stack

```bash
cd /opt/iamfabriceg-bot
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml ps
```

Contrôles locaux avant d’exposer le domaine :

```bash
curl -fsS http://127.0.0.1:3001/api/bot/healthz
curl -fsS http://127.0.0.1:3012/healthz
curl -fsS http://127.0.0.1:3001/api/bot/summary | head -c 200
```

En cas de problème :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml logs -f bot cms
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml restart cms bot
```

---

## 9. Nginx Proxy Manager — reverse proxy HTTPS

Créer un **Proxy Host** :

| Champ | Valeur |
|---|---|
| Domain Names | `bot.iamfabriceg.xyz` |
| Scheme | `http` |
| Forward Hostname / IP | `iamfabriceg-bot-cms` (ou `cms`) |
| Forward Port | `3001` |
| Websockets Support | **On** (admin Payload / live preview) |
| Block Common Exploits | On |
| SSL | Request a new Let’s Encrypt certificate, Force SSL, HTTP/2 |

Pré-requis DNS : enregistrement `A` `bot.iamfabriceg.xyz` → IP publique du VPS. Vérifier :
`dig +short bot.iamfabriceg.xyz` ou `nslookup bot.iamfabriceg.xyz`.

Le front public est sur `/`, l’admin sur `/admin`, les endpoints sur `/api/...`.
Si NPM répond 502, vérifier que le conteneur NPM et `iamfabriceg-bot-cms` partagent bien le
réseau externe déclaré dans `docker-compose.vps.yml`.

---

## 10. Vérifications finales

```bash
curl -fsS https://bot.iamfabriceg.xyz/api/bot/summary | head -c 400
curl -fsS https://bot.iamfabriceg.xyz/ | grep -o 'iamfabriceg Bot' | head -1
```

- **Admin** : ouvrir `https://bot.iamfabriceg.xyz/admin`, se connecter avec le compte du seed,
  changer `SEED_ADMIN_PASSWORD` immédiatement. Dashboard : statistiques MongoDB visibles.
- **Catalogue** : « Synchroniser le catalogue » doit répondre `18 mise(s) à jour sur 18`.
- **Discord** : `/ping`, `/status` (intégrations), `/help`, `/fortnite save-the-world heroes`,
  `/roles` — ajout et retrait d’un rôle, notamment Aniimo et GOALS.
- **Mobile** : ouvrir la palette (`Ctrl/⌘+K`, `/`, ou le bouton « Rechercher ») sur iPhone :
  elle doit s’ouvrir au premier tap, être focalisée, et le champ occuper toute la largeur.
- **API** : `GET /api/bot/stats?period=day` et `POST /api/bot/usage` répondent 200.

---

## 11. Mises à jour et retour arrière

```bash
# Nouvelle version
IMAGE_TAG=1.1.1 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml pull
IMAGE_TAG=1.1.1 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d

# Retour arrière
IMAGE_TAG=1.1.0 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
```

Pour un déploiement par digest (recommandé) :

```bash
docker pull registry.fabricegeib.com/iamfabriceg-bot@sha256:7cb5bb8bcd47559f653b5c938b9abe80e49f29e55af38701cd2248a0d6a489f4
docker pull registry.fabricegeib.com/iamfabriceg-bot-cms@sha256:b181c774b5e77b4cdd452109aa52b04dcf53d54a94e5530d78dc94aedc08e135
```

---

## 12. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `unauthorized: authentication required` au `pull` | VPS non connecté au registre | Refaire `docker login registry.fabricegeib.com` |
| Le VPS reconstruit au lieu de tirer l’image | `pull_policy` absent | Conserver `pull_policy: if_not_present` (déjà présent) |
| Admin : spinner infini sur les POST | Origine navigateur ≠ `DEPLOY_URL` | Vérifier `DEPLOY_URL`, puis `up -d --force-recreate cms` |
| `https://bot.exemple.com` souscrit dans Twitch ancien callback | `.env` local copié tel quel | Le Compose prod utilise `DEPLOY_URL` ; re-souscrire avec `node src/tasks/subscribe-twitch.js` |
| 502 sur le domaine | NPM ne trouve pas `cms`, ou mauvais réseau | `docker network ls`, corriger `docker-compose.vps.yml` |
| Bot muet sur Discord | Token/ID absents du `.env` VPS | Comparer les clés présentes (sans afficher les valeurs) |
| Stats vides | Import MongoDB manquant ou mauvaise DB | Rejouer §7 et vérifier `getCollectionNames()` |
| Search 401/403 | `PAYLOAD_API_KEY` changé | Recopier la clé locale, `up -d --force-recreate bot cms` |
| Commande externe « désactivé : variable … non configurée » | Clé API absente | Voir §3, puis recréer le conteneur `bot` |
| Palette ne s’ouvre qu’au 2ᵉ tap sur iPhone | Ancienne version de l’image | Vérifier le digest `b181c774…` de l’image CMS |
| Cercles rouges / safe areas | iOS met les méta en cache | Retirer puis rajouter la web app de l’écran d’accueil |

---

## 13. Contenu de l’archive MongoDB

- ✅ Collections : users, games, commands, command-usages, discordroles, events, news,
  stream-alerts, webhook-events, profiles, media, globals `botSettings`, plus les collections
  internes Payload (`payload-preferences`, `payload-migrations`, …).
- ❌ Fichiers `.env` (à copier séparément, §6).
- ❌ Fichiers médias locaux (aucun actuellement : `cms/public/media` n’existe pas).
- ❌ Images Docker (à pousser séparément, §4).
