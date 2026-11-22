# Dossier prêt pour le VPS

**Rien à modifier avant le transfert.** Le `.env` contient déjà les secrets Discord/Payload,
l’URI MongoDB **encodée** (`!` → `%21`) et `authSource=admin`. Ne pas le partager, ne pas le committer.

> ⚠️ Ne remplace pas l’hôte `51.178.39.128` par `mongodb` dans `DATABASE_URI` : le conteneur MongoDB
> n’est pas sur le réseau `nginx-proxy-manager`, ce nom ne se résout donc pas depuis le CMS.
> Le nom `mongodb` ne concerne que l’option `--network container:mongodb` de l’import.

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
| `.env` | Secrets, URI MongoDB externe encodée, domaine public — **ne pas committer** |
| `.env.example` | Modèle commenté si tu dois recréer le `.env` |

Noms de service (et alias DNS sur le réseau partagé) : `iamfabriceg-bot` et `iamfabriceg-bot-cms`.
Ports hôtes : `31000` (bot), `31001` (CMS), liés à `127.0.0.1`. Ports internes inchangés
(`3000`/`3001`) : NPM vise **`iamfabriceg-bot-cms:3001`**.

## 3. Sur le VPS

```bash
cd ~/docker/iamfabriceg-bot

# Les noms de service ont changé : supprimer les anciens conteneurs du projet
# (MongoDB externe n'est pas touchée, aucun volume n'est supprimé).
docker compose down --remove-orphans

docker login registry.fabricegeib.com
docker network ls | grep nginx-proxy-manager
# si absent : docker network create nginx-proxy-manager

# import DANS ton conteneur MongoDB existant (nommé `mongodb`) :
docker run --rm \
  --network container:mongodb \
  --env-file .env \
  -v "$PWD/iamfabriceg-bot-2026-11-22.archive.gz:/backup/archive.gz:ro" \
  mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#51.178.39.128#127.0.0.1#"); mongorestore --uri="$MONGO_URI" --archive=/backup/archive.gz --gzip --drop'

docker compose up -d
docker compose ps
```

Si la stack tournait déjà avec l’ancien fichier et que `down` échoue, ignore l’erreur et lance
directement `docker compose up -d --force-recreate`.

Vérifications :

```bash
curl -fsS http://127.0.0.1:31001/api/bot/healthz
curl -fsS http://127.0.0.1:31000/healthz
docker compose logs --no-color --tail=30 iamfabriceg-bot-cms
# - Local: http://0.0.0.0:3001
```

## 4. Nginx Proxy Manager

Proxy Host `bot.iamfabriceg.xyz` → **Forward Hostname `iamfabriceg-bot-cms`**, port `3001`
(scheme `http`, Websockets activés, SSL + Force SSL).

La procédure commentée est dans [`docs/DEPLOY-VPS.md`](../docs/DEPLOY-VPS.md).

⚠️ Ne jamais lancer le seed après l’import MongoDB : la base contient déjà `PAYLOAD_API_KEY`.
Ce Compose ne contient volontairement aucun service `iamfabriceg-bot-cms-seed` ni `iamfabriceg-bot-mongo`.
