# Dossier prêt pour le VPS

**Avant de copier** : vérifie la ligne `DATABASE_URI` de `.env`. Les identifiants doivent être
**encodés** dans l’URL (`!` → `%21`, `@` → `%40`, `#` → `%23`) et conserver `?authSource=admin`.
Le mot de passe est déjà encodé dans le fichier fourni.

Copier les fichiers **et l’archive** sur le VPS :

```bash
ssh debian@51.178.39.128 'mkdir -p ~/docker/iamfabriceg-bot'
scp -r deploy/. debian@51.178.39.128:~/docker/iamfabriceg-bot/
scp backups/iamfabriceg-bot-2026-11-22.archive.gz debian@51.178.39.128:~/docker/iamfabriceg-bot/
```

Il contient :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | La stack **bot + CMS uniquement** (aucun conteneur MongoDB), réseau NPM intégré |
| `.env` | Tous les secrets, l’URI MongoDB externe encodée et le domaine — **ne pas committer, ne pas partager** |
| `.env.example` | Modèle commenté si tu dois recréer le `.env` |

Ports hôtes du projet : `31000` (bot), `31001` (CMS), liés à `127.0.0.1`. Ports internes des
conteneurs inchangés (`3000`/`3001`) : NPM vise toujours `cms:3001`.

Sur le VPS, la procédure complète est dans [`docs/DEPLOY-VPS.md`](../docs/DEPLOY-VPS.md).
En résumé :

```bash
cd ~/docker/iamfabriceg-bot
docker login registry.fabricegeib.com
docker compose up -d

# Importer dans TON conteneur MongoDB existant (nommé `mongodb`) :
docker run --rm \
  --network container:mongodb \
  --env-file .env \
  -v "$PWD/iamfabriceg-bot-2026-11-22.archive.gz:/backup/archive.gz:ro" \
  mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#51.178.39.128#127.0.0.1#"); mongorestore --uri="$MONGO_URI" --archive=/backup/archive.gz --gzip --drop'

docker compose restart bot cms
# créer le Proxy Host dans Nginx Proxy Manager : cms:3001
```

⚠️ Ne jamais lancer le seed après l’import MongoDB : la base contient déjà `PAYLOAD_API_KEY`.
Ce Compose ne contient volontairement aucun service `cms-seed` ni `mongo`.
