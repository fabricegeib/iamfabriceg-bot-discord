# Dossier prêt pour le VPS

**Rien à modifier avant le transfert.** Le `.env` contient déjà les secrets Discord/Payload,
l’URI MongoDB **encodée** (`!` → `%21`), `authSource=admin` et l’hôte **`mongodb:27017`**.
Ne pas le partager, ne pas le committer.

## 1. Transfert (depuis ta machine)

```bash
ssh debian@51.178.39.128 'mkdir -p ~/docker/iamfabriceg-bot'
scp -r deploy/. debian@51.178.39.128:~/docker/iamfabriceg-bot/
scp backups/iamfabriceg-bot-2026-11-22.archive.gz debian@51.178.39.128:~/docker/iamfabriceg-bot/
```

## 2. Contenu du dossier

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Stack **bot + CMS uniquement** (aucun conteneur MongoDB), réseau NPM intégré, `HOSTNAME=0.0.0.0` |
| `.env` | Secrets, URI MongoDB `mongodb:27017` encodée, domaine public — **ne pas committer** |
| `.env.example` | Modèle commenté si tu dois recréer le `.env` |

Noms de service (et alias DNS sur le réseau partagé) : `iamfabriceg-bot` et `iamfabriceg-bot-cms`.
Ports hôtes : `31000` (bot), `31001` (CMS), liés à `127.0.0.1`. Ports internes inchangés
(`3000`/`3001`) : NPM vise **`iamfabriceg-bot-cms:3001`**.

## 3. Prérequis réseau (à vérifier une fois)

`DATABASE_URI` utilise le **nom du conteneur** `mongodb`. Pour que ce nom soit résolu depuis le bot
et le CMS, le conteneur MongoDB doit être attaché au même réseau que la stack :

```bash
cd ~/docker/iamfabriceg-bot

docker network ls | grep nginx-proxy-manager
# si absent : docker network create nginx-proxy-manager

# Attacher le conteneur MongoDB existant au réseau partagé (idempotent) :
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' mongodb \
  | grep -qx nginx-proxy-manager || docker network connect nginx-proxy-manager mongodb

# Vérifier la résolution depuis le réseau :
docker run --rm --network nginx-proxy-manager mongo:8.2.4 sh -c 'getent hosts mongodb'
```

Si ton conteneur MongoDB porte un autre nom, remplace `mongodb` partout (dans `.env` et dans les
commandes ci-dessous), ou attache-lui un alias :
`docker network connect --alias mongodb nginx-proxy-manager <nom_du_conteneur>`.

## 4. Lancer la stack

```bash
docker login registry.fabricegeib.com

# Les noms de service ont changé : supprimer les anciens conteneurs du projet
# (MongoDB existante non touchée, aucun volume supprimé).
docker compose down --remove-orphans
docker compose up -d
docker compose ps
```

Si `down` échoue, ignore l’erreur et lance directement `docker compose up -d --force-recreate`.
Aucun build n’est nécessaire : le Compose n’a pas de section `build:`.

## 5. Importer la base MongoDB

L’archive doit être restaurée **dans ton conteneur `mongodb` existant**, pas dans un nouveau.
Le conteneur jetable partage son namespace réseau (`--network container:mongodb`) : on remplace
donc l’hôte `mongodb` par `127.0.0.1` **uniquement pour cette commande**.

```bash
# Empreinte attendue de l'archive
sha256sum iamfabriceg-bot-2026-11-22.archive.gz
# 390180301D0CFE0027009CFF388D2DA57B18160F5B60D1F24E4466A49F7EFA1F

# Restauration (--drop ne touche que la base iamfabriceg_bot) :
docker run --rm \
  --network container:mongodb \
  --env-file .env \
  -v "$PWD/iamfabriceg-bot-2026-11-22.archive.gz:/backup/archive.gz:ro" \
  mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#@mongodb:27017#@127.0.0.1:27017#"); mongorestore --uri="$MONGO_URI" --archive=/backup/archive.gz --gzip --drop'

# Contrôle :
docker run --rm --network container:mongodb --env-file .env mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#@mongodb:27017#@127.0.0.1:27017#"); mongosh "$MONGO_URI" --quiet --eval "printjson({collections:db.getCollectionNames().length, users:db.users.countDocuments({}), games:db.games.countDocuments({})})"'

# Recharger les caches du bot et du CMS après l'import :
docker compose restart iamfabriceg-bot iamfabriceg-bot-cms
```

⚠️ **Ne jamais lancer le seed après l’import** : la base contient déjà `PAYLOAD_API_KEY`.
Ce Compose ne contient volontairement aucun service `iamfabriceg-bot-cms-seed` ni `iamfabriceg-bot-mongo`.

## 6. Vérifications

```bash
curl -fsS http://127.0.0.1:31001/api/bot/healthz
curl -fsS http://127.0.0.1:31000/healthz
docker compose logs --no-color --tail=30 iamfabriceg-bot-cms
# - Local: http://0.0.0.0:3001
```

## 7. Nginx Proxy Manager

Proxy Host `bot.iamfabriceg.xyz` → **Forward Hostname `iamfabriceg-bot-cms`**, port `3001`
(scheme `http`, Websockets activés, SSL + Force SSL).

La procédure commentée est dans [`docs/DEPLOY-VPS.md`](../docs/DEPLOY-VPS.md).
