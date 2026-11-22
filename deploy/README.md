# Dossier prêt pour le VPS

**Avant de copier** : dans `.env`, remplacer `MONGO_USER` et `MONGO_PASSWORD` dans la ligne
`DATABASE_URI` par les identifiants de ta MongoDB existante. Le reste est déjà prêt.

Copier **ce dossier entier** sur le VPS :

```bash
ssh debian@51.178.39.128 'mkdir -p ~/docker/iamfabriceg-bot'
scp -r deploy/. debian@51.178.39.128:~/docker/iamfabriceg-bot/
```

Il contient :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | La stack **bot + CMS uniquement** (aucun conteneur MongoDB), réseau NPM intégré |
| `.env` | Tous les secrets, l’URI MongoDB externe et le domaine — **ne pas committer, ne pas partager** |
| `.env.example` | Modèle commenté si tu dois recréer le `.env` |

Sur le VPS, la procédure complète est dans [`docs/DEPLOY-VPS.md`](../docs/DEPLOY-VPS.md).
En résumé :

```bash
cd ~/docker/iamfabriceg-bot
docker compose up -d
# importer l'archive dans la MongoDB existante (voir le guide)
docker compose restart bot cms
# créer le Proxy Host dans Nginx Proxy Manager : cms:3001
```

⚠️ Ne jamais lancer le seed après l’import MongoDB : la base contient déjà `PAYLOAD_API_KEY`.
Ce Compose ne contient volontairement aucun service `cms-seed` ni `mongo`.
