# Dossier prêt pour le VPS

Copier **ce dossier entier** sur le VPS :

```bash
ssh USER@IP 'mkdir -p ~/iamfabriceg-bot'
scp -r deploy/. USER@IP:~/iamfabriceg-bot/
```

Il contient :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | La stack complète (mongo + bot + CMS), réseau NPM intégré |
| `.env` | Tous les secrets et le domaine — **ne pas committer, ne pas partager** |
| `.env.example` | Modèle commenté si tu dois recréer le `.env` |

Sur le VPS, la procédure complète est dans [`docs/DEPLOY-VPS.md`](../docs/DEPLOY-VPS.md).
En résumé :

```bash
cd ~/iamfabriceg-bot
docker compose up -d
# importer l'archive MongoDB (voir le guide)
docker compose restart bot cms
# créer le Proxy Host dans Nginx Proxy Manager : cms:3001
```

⚠️ Ne jamais lancer le seed après l’import MongoDB (ce Compose ne contient volontairement
aucun service `cms-seed`).
