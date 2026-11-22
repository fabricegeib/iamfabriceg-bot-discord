# Du dev local au VPS (production)

Guide opérationnel pour publier **iamfabriceg Bot** (bot Discord + CMS/admin + front public)
sur le VPS, avec migration de la base MongoDB locale.

## 0. Choix retenus

| Élément | Valeur |
|---|---|
| Registre Docker | `registry.fabricegeib.com` |
| Image bot | `registry.fabricegeib.com/iamfabriceg-bot:1.1.0` |
| Image CMS / front / admin | `registry.fabricegeib.com/iamfabriceg-bot-cms:1.1.0` |
| URL publique | `https://bot.iamfabriceg.xyz` |
| Reverse proxy | Nginx Proxy Manager, réseau Docker externe `nginx-proxy-manager` |
| Base | MongoDB 8 dans la stack, volume `iamfabriceg-bot-mongo-data` |
| Médias | Aucun fichier local à migrer (les médias sont stockés dans MongoDB) |

**Alternatives de domaine** si `bot.iamfabriceg.xyz` ne te convient pas :
`discord.iamfabriceg.xyz` (plus explicite « bot Discord »), `iamfabriceg-bot.xyz`
(marque complète), ou `admin.iamfabriceg.xyz` si tu veux séparer l’admin du front.
Le changement se fait uniquement via `PAYLOAD_PUBLIC_URL` / `PUBLIC_URL` et le proxy
(aucune reconstruction d’image nécessaire).

---

## 1. Pré-requis

**Local (Windows / WSL)**
- Docker Desktop avec compose v2, `pnpm 10.15.0`
- Session ouverte sur le registre : `docker login registry.fabricegeib.com`
  (vérifiable avec `docker info` → entrée `registry.fabricegeib.com`)

**VPS (Linux)**
- Docker + compose v2, architecture `amd64`
- Utilisateur avec accès au Docker (ici `debian`, à adapter)
- Nginx Proxy Manager installé et raccordé au réseau `nginx-proxy-manager`
-DNS : enregistrement `A` `bot.iamfabriceg.xyz` → IP publique du VPS
- Accès SSH + `scp`

> Le registre est privé : le VPS doit aussi se connecter avant le premier `pull`.

---

## 2. Local — figer et valider la version

```powershell
cd \\wsl.localhost\Debian\home\fabricegeib\docker\iamfabricegbot-discord

pnpm test
pnpm lint
docker compose -f docker-compose.dev.yml exec -T cms pnpm --filter cms lint
docker compose -f docker-compose.dev.yml exec -T cms pnpm --filter cms exec tsc --noEmit

git status -sb
git tag -a v1.1.0 -m "iamfabriceg Bot 1.1.0"
git push origin v1.1.0
```

La version est déjà à `1.1.0` dans `package.json` et `cms/package.json`.

---

## 3. Local — construire et pousser les images

Depuis la racine du dépôt :

```powershell
$REG = "registry.fabricegeib.com"
$TAG = "1.1.0"

docker build -f Dockerfile -t "$REG/iamfabriceg-bot:$TAG" -t "$REG/iamfabriceg-bot:latest" .
docker build -f cms/Dockerfile -t "$REG/iamfabriceg-bot-cms:$TAG" -t "$REG/iamfabriceg-bot-cms:latest" .

docker push "$REG/iamfabriceg-bot:$TAG"
docker push "$REG/iamfabriceg-bot:latest"
docker push "$REG/iamfabriceg-bot-cms:$TAG"
docker push "$REG/iamfabriceg-bot-cms:latest"
```

Note les digests affichés par `docker push` (permettent un déploiement reproductible) :

```powershell
docker inspect --format '{{index .RepoDigests 0}}' "$REG/iamfabriceg-bot:$TAG"
docker inspect --format '{{index .RepoDigests 0}}' "$REG/iamfabriceg-bot-cms:$TAG"
```

---

## 4. Local — exporter MongoDB

La base locale est `iamfabriceg_bot`, dans le conteneur `iamfabriceg-bot-mongo`.

```powershell
$stamp = Get-Date -Format 'yyyy-MM-dd'
$archive = "backups/iamfabriceg-bot-$stamp.archive.gz"
New-Item -ItemType Directory -Force backups | Out-Null

docker exec iamfabriceg-bot-mongo mongodump `
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot" `
  --archive=/tmp/iamfabriceg-bot.archive.gz --gzip

docker cp iamfabriceg-bot-mongo:/tmp/iamfabriceg-bot.archive.gz $archive
Get-FileHash $archive -Algorithm SHA256
```

Validation avant transfert :

```powershell
docker exec iamfabriceg-bot-mongo mongorestore `
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot_check" `
  --archive=/tmp/iamfabriceg-bot.archive.gz --gzip --dryRun
```

**Archive produite le 2026-11-22** : `backups/iamfabriceg-bot-2026-11-22.archive.gz`
(10 147 octets, SHA-256 `390180301D0CFE0027009CFF388D2DA57B18160F5B60D1F24E4466A49F7EFA1F`).
`mongorestore --dryRun` validé : `dry run completed`, 0 document en échec.

> **Secrets à conserver identiques sur le VPS** : `PAYLOAD_SECRET`, `PAYLOAD_API_KEY`,
> `WEBHOOK_SECRET`, `DISCORD_TOKEN`. La base importée contient les clés API chiffrées :
> changer `PAYLOAD_SECRET` rendrait les sessions et clés invalides.
> Le fichier d’archive reste dans `backups/` (non versionné) — ne le commite pas.

---

## 5. VPS — préparer les fichiers

```bash
sudo mkdir -p /opt/iamfabriceg-bot/backups
sudo chown -R debian:debian /opt/iamfabriceg-bot
cd /opt/iamfabriceg-bot
```

Copier les trois fichiers de configuration et le `.env` :

```powershell
scp docker-compose.prod.yml docker-compose.vps.yml debian@IP_DU_VPS:/opt/iamfabriceg-bot/
scp .env debian@IP_DU_VPS:/opt/iamfabriceg-bot/.env
scp backups/iamfabriceg-bot-YYYY-MM-DD.archive.gz debian@IP_DU_VPS:/opt/iamfabriceg-bot/backups/
```

Sur le VPS, vérifier le `.env` (ne jamais le versionner) :

```bash
cd /opt/iamfabriceg-bot
chmod 600 .env

# Valeurs attendues pour la prod
grep -E '^(DISCORD_TOKEN|CLIENT_ID|GUILD_ID|PAYLOAD_SECRET|PAYLOAD_API_KEY|WEBHOOK_SECRET)=' .env
grep -q '^PAYLOAD_PUBLIC_URL=' .env || echo 'PAYLOAD_PUBLIC_URL=https://bot.iamfabriceg.xyz' >>.env
grep -q '^PUBLIC_URL=' .env || echo 'PUBLIC_URL=https://bot.iamfabriceg.xyz' >>.env
```

Connexion au registre sur le VPS :

```bash
echo "$REGISTRY_PASSWORD" | docker login registry.fabricegeib.com \
  --username "$REGISTRY_USERNAME" --password-stdin
docker pull registry.fabricegeib.com/iamfabriceg-bot-cms:1.1.0
docker pull registry.fabricegeib.com/iamfabriceg-bot:1.1.0
```

`docker-compose.prod.yml` référence les images du registre (ses sections `build` ne servent
qu’au `docker:prod` local avec `--build`) ; `docker-compose.vps.yml` ajoute le réseau
`nginx-proxy-manager`. Les ports hôte sont liés à `127.0.0.1` : seuls NPM et les healthchecks
locaux y accèdent.

---

## 6. VPS — importer la base

Démarrer uniquement MongoDB, puis restaurer l’archive :

```bash
cd /opt/iamfabriceg-bot
COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml"

$COMPOSE up -d mongo
$COMPOSE ps mongo

docker cp backups/iamfabriceg-bot-YYYY-MM-DD.archive.gz \
  iamfabriceg-bot-mongo:/tmp/restore.archive.gz

docker exec iamfabriceg-bot-mongo mongorestore \
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot" \
  --archive=/tmp/restore.archive.gz --gzip --drop

docker exec iamfabriceg-bot-mongo mongosh --quiet \
  --eval 'db.getSiblingDB("iamfabriceg_bot").getCollectionNames()'
```

> `--drop` écrase les collections existantes de la base cible. À n’utiliser que sur
> une base neuve ou après sauvegarde. **Ne pas lancer `cms-seed` après l’import** :
> le seed régénère `PAYLOAD_API_KEY` et il faudrait la recopier dans `.env`.

---

## 7. VPS — démarrer la stack

```bash
cd /opt/iamfabriceg-bot
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml ps
```

Contrôles locaux :

```bash
curl -fsS http://127.0.0.1:3001/api/bot/healthz
curl -fsS http://127.0.0.1:3012/healthz
```

Si le bot ne démarre pas, vérifier les logs :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml logs -f bot cms
```

---

## 8. Nginx Proxy Manager — reverse proxy

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

Le front public est sur `/`, l’admin sur `/admin`, les endpoints sur `/api/...`.

**Webhooks Twitch (optionnel)** : ils nécessitent `TWITCH_CLIENT_ID` et
`TWITCH_CLIENT_SECRET`. Le callback est `${PUBLIC_URL}/webhooks/twitch`, donc il faut
soit un second Proxy Host `bot-api.iamfabriceg.xyz` → `iamfabriceg-bot-discord:3000`,
soit une règle `Advanced` qui envoie `/webhooks/twitch` vers le bot. Les webhooks
Payload et les actions du dashboard passent, eux, par `http://bot:3000` à l’intérieur
de la stack : aucune exposition publique nécessaire.

---

## 9. Vérifications finales

```bash
curl -fsS https://bot.iamfabriceg.xyz/api/bot/summary | head -c 400
curl -fsS https://bot.iamfabriceg.xyz/ | grep -o 'iamfabriceg Bot' | head -1
```

- Ouvrir `https://bot.iamfabriceg.xyz/admin` et se connecter avec le compte du seed
  (mot de passe `SEED_ADMIN_PASSWORD`, à changer immédiatement).
- Dashboard : vérifier que les statistiques MongoDB s’affichent.
- Discord : `/ping`, `/help`, `/fortnite save-the-world heroes`, puis tester un bouton
  de rôle et la palette de recherche sur iPhone.
- Vérifier que la synthèse du catalogue et le bouton « Synchroniser le catalogue »
  répondent (18/18 commandes).

---

## 10. Mises à jour et retour arrière

Nouvelle version (ex. `1.1.1`) : reproduire l’étape 3 avec le nouveau tag, puis :

```bash
cd /opt/iamfabriceg-bot
IMAGE_TAG=1.1.1 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml pull
IMAGE_TAG=1.1.1 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
```

Retour arrière immédiat :

```bash
IMAGE_TAG=1.1.0 docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d
```

Pour un déploiement par digest (recommandé) :

```bash
IMAGE=registry.fabricegeib.com/iamfabriceg-bot@sha256:<digest>
docker pull "$IMAGE"
```

---

## 11. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `unauthorized: authentication required` au `pull` | VPS non connecté au registre | Refaire `docker login registry.fabricegeib.com` |
| Admin : spinner infini sur les POST | `PAYLOAD_PUBLIC_URL` ≠ origine du navigateur | Mettre `https://bot.iamfabriceg.xyz`, recréer le conteneur `cms` |
| 502 sur le domaine | NPM ne trouve pas `cms` | Vérifier le réseau `nginx-proxy-manager` et le nom `iamfabriceg-bot-cms` |
| Bot muet sur Discord | Token/ID absents du `.env` VPS | Comparer avec le `.env` local (sans l’afficher) |
| Stats vides | Import MongoDB manquant ou mauvaise DB | `--eval 'db.getSiblingDB("iamfabriceg_bot").getCollectionNames()'` |
| Search 401/403 | `PAYLOAD_API_KEY` changé | Recopier la clé locale dans le `.env` VPS, `up -d --force-recreate bot cms` |
| Cercles rouges / safe areas | iOS met les méta en cache | Retirer puis rajouter la web app de l’écran d’accueil |

---

## 12. Ce que contient (et ne contient pas) l’archive

- ✅ Collections MongoDB : users, games, commands, command-usages, roles, events,
  news, stream-alerts, webhook-events, profiles, media, globaux `botSettings`
- ❌ Fichiers `.env` (à copier séparément)
- ❌ Fichiers médias locaux (aucun actuellement : `cms/public/media` n’existe pas)
- ❌ Images Docker (à pousser séparément, étape 3)
