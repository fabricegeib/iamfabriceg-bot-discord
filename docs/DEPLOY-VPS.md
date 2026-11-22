# Déploiement VPS — iamfabriceg Bot 1.1.0

> Procédure courte en 6 étapes. Dernière vérification : **2026-11-22**, commit `58a32e0`.
> Le dossier [`deploy/`](../deploy) contient les fichiers prêts à copier sur le VPS.

---

## 0. Ce qu’il te faut

- Un VPS avec Docker et le plugin Compose (`docker compose version` doit répondre).
- **Nginx Proxy Manager (NPM) déjà installé**, avec un réseau Docker nommé
  `nginx-proxy-manager` (c’est le réseau par défaut de la plupart des installs NPM).
- Le domaine `bot.iamfabriceg.xyz` avec un enregistrement **A** vers l’IP du VPS.
- Les identifiants du registre privé `registry.fabricegeib.com`.
- Le dossier `deploy/` et l’archive MongoDB `backups/iamfabriceg-bot-2026-11-22.archive.gz`.

Rien d’autre : pas de code source, pas de pnpm, pas de build sur le VPS. Les images sont
déjà publiées.

---

## 1. Copier les fichiers sur le VPS

Depuis ta machine (remplace `USER` et `IP_VPS`) :

```powershell
ssh USER@IP_VPS 'mkdir -p ~/docker/iamfabriceg-bot'
scp -r deploy/. USER@IP_VPS:~/docker/iamfabriceg-bot/
scp backups/iamfabriceg-bot-2026-11-22.archive.gz USER@IP_VPS:~/docker/iamfabriceg-bot/
```

Puis, sur le VPS :

```bash
cd ~/docker/iamfabriceg-bot
ls -la            # docker-compose.yml, .env, .env.example, README.md, archive .gz
```

Le `.env` fourni est **déjà rempli** avec les mêmes secrets que ta machine locale et les
valeurs internes au Docker (`PAYLOAD_URL=http://cms:3001`, `DATABASE_URI=mongodb://mongo:27017/…`).
Si tu changes de domaine, modifie **une seule ligne** : `DEPLOY_URL`.

---

## 2. Préparer le VPS (une seule fois)

```bash
# Le réseau doit exister : NPM le crée normalement lui-même.
docker network ls | grep nginx-proxy-manager

# S'il est absent :
docker network create nginx-proxy-manager

# Connexion au registre privé :
docker login registry.fabricegeib.com
```

> Le `docker-compose.yml` déclare `default` comme réseau **externe** nommé
> `nginx-proxy-manager`. Toute la stack (mongo, bot, CMS) rejoint donc le réseau de NPM :
> c’est ce qui permet à NPM de résoudre `cms:3001`. MongoDB n’a aucun port public.

---

## 3. Lancer la stack

```bash
docker compose up -d
docker compose ps
```

Attends que les trois conteneurs soient `healthy` (~30 s). Si une image manque, elle est
tirée automatiquement du registre (`pull_policy: if_not_present`).

À ce stade MongoDB est vide : c’est normal, c’est l’étape 4 qui le remplit.

---

## 4. Importer la base MongoDB

```bash
# Vérifier l'archive (empreinte attendue ci-dessous)
sha256sum iamfabriceg-bot-2026-11-22.archive.gz
# 390180301D0CFE0027009CFF388D2DA57B18160F5B60D1F24E4466A49F7EFA1F

# Copier l'archive dans le conteneur MongoDB, puis restaurer
docker cp iamfabriceg-bot-2026-11-22.archive.gz \
  iamfabriceg-bot-mongo:/tmp/iamfabriceg-bot.archive.gz

docker exec iamfabriceg-bot-mongo mongorestore \
  --uri="mongodb://127.0.0.1:27017/iamfabriceg_bot" \
  --archive=/tmp/iamfabriceg-bot.archive.gz \
  --gzip --drop

# Contrôle rapide
docker exec iamfabriceg-bot-mongo mongosh --quiet --eval \
  'const d=db.getSiblingDB("iamfabriceg_bot"); printjson({collections:d.getCollectionNames().length, users:d.users.countDocuments({}), games:d.games.countDocuments({})})'
```

> ⚠️ **Ne jamais lancer le seed après l’import** : il régénérerait `PAYLOAD_API_KEY` et le bot
> ne pourrait plus s’authentifier. Le Compose de `deploy/` ne contient volontairement aucun
> service `cms-seed`.

---

## 5. Redémarrer bot et CMS (purge des caches)

Ils ont démarré sur une base vide à l’étape 3 : on les redémarre après l’import pour qu’ils
rechargent les données restaurées.

```bash
docker compose restart bot cms
docker compose ps
```

---

## 6. Nginx Proxy Manager — à la main (interface web)

Ouvre l’interface de NPM → **Proxy Hosts** → **Add Proxy Host**, onglet **Details** :

| Champ | Valeur |
|---|---|
| Domain Names | `bot.iamfabriceg.xyz` |
| Scheme | `http` |
| Forward Hostname / IP | `cms` |
| Forward Port | `3001` |
| Block Common Exploits | activé (recommandé) |
| Websockets Support | activé (recommandé) |
| Access List | aucun |

Onglet **SSL** :

| Champ | Valeur |
|---|---|
| SSL Certificate | **Request a new SSL Certificate** |
| Email | ton email pour Let’s Encrypt |
| Agree to TOS | coché |
| Force SSL | activé |
| HTTP/2 | activé (optionnel) |

**Save.** Attends la délivrance du certificat (quelques secondes).

> NPM et la stack partagent le réseau `nginx-proxy-manager` : le nom `cms` est résolu par
> Docker, aucune IP n’est à renseigner.

---

## 7. Vérifications finales

Depuis le VPS :

```bash
curl -fsS http://127.0.0.1:3001/api/bot/healthz
curl -fsS http://127.0.0.1:3012/healthz
```

Depuis ton PC :

```bash
curl -fsS https://bot.iamfabriceg.xyz/api/bot/healthz
curl -fsS -o /dev/null -w 'admin HTTP %{http_code}\n' https://bot.iamfabriceg.xyz/admin
curl -fsS -o /dev/null -w 'front  HTTP %{http_code}\n' https://bot.iamfabriceg.xyz/
```

Depuis un navigateur :

- `/` : le front avec les filtres **Tout / Jeux / Commandes / Actualités / API**.
- `/admin` : connexion avec le compte du seed (`bot@iamfabriceg.local` et le mot de passe
  utilisé lors du seed local). **Change ce mot de passe immédiatement**, crée ton propre compte
  `admin` et conserve le compte `bot` qui porte la clé API (voir
  [`docs/CMS.md`](./CMS.md#compte-admin-personnel-et-liaison-discord)).
- Sur iPhone : la palette doit s’ouvrir **au premier tap** et le champ occuper toute la largeur.
  Le correctif est bien présent dans les images `1.1.0-slim` (commit `7f135f6`).
- Sur Discord : `/ping` doit répondre, et `/profil pseudo:TonPseudo` doit créer ton profil
  visible dans `/admin` → **Profiles**.

---

## 8. Mise à jour et retour arrière

Modifier le tag des deux images dans `deploy/docker-compose.yml`, puis :

```bash
docker compose pull
docker compose up -d
```

Retour arrière : remettre `1.1.0` (ancienne image non optimisée, conservée dans le registre)
à la place de `1.1.0-slim`, puis relancer les deux commandes ci-dessus.

| Image | Tag courant | Digest |
|---|---|---|
| Bot | `1.1.0-slim` (203 Mo) | `sha256:ca9e4f5dbb115808ef34ecf6bcab7e3e6ec399ffede01d867d064632dc847cd1` |
| CMS | `1.1.0-slim` (306 Mo) | `sha256:ca7c312e6cc5e3de0b1baa9391a24d92aac500c9e3857291fbce273837ad179c` |
| Bot | `1.1.0` (rollback, 235 Mo) | `sha256:7cb5bb8bcd47559f653b5c938b9abe80e49f29e55af38701cd2248a0d6a489f4` |
| CMS | `1.1.0` (rollback, 2,41 Go) | `sha256:b181c774b5e77b4cdd452109aa52b04dcf53d54a94e5530d78dc94aedc08e135` |

> Les images `1.1.0-slim` résultent de l’optimisation Next.js `standalone` : `/app` passe de
>1,3 Go à 128,6 Mo, le CMS de 2,41 Go à 306 Mo (−87 %) et le bot de 235 à 203 Mo. Aucun pnpm,
>aucune source TypeScript ni cache Next dans le runtime ; le seed y est compilé en
>`cms/seed.mjs`.

---

## 9. Dépannage express

| Symptôme | Correctif |
|---|---|
| `unauthorized: authentication required` au `pull` | `docker login registry.fabricegeib.com` |
| `network nginx-proxy-manager not found` | `docker network create nginx-proxy-manager` |
| 502 dans NPM | Vérifier `Forward Hostname = cms` et `Port = 3001`, puis reload du Proxy Host |
| Admin : spinner infini sur les POST | `DEPLOY_URL` doit être l’URL publique HTTPS ; `docker compose up -d --force-recreate cms` |
| Bot « non configuré » pour une API | Clé absente du `.env` ou conteneur non recréé ; compléter puis `up -d --force-recreate bot` |
| Stats vides | Import MongoDB manquant : rejouer l’étape 4 puis `restart bot cms` |
| Palette au 2ᵉ tap sur iPhone | Vérifier le digest CMS `ca7c312e…` (`1.1.0-slim`) |
| Cercles rouges / safe areas | Retirer puis rajouter la web app depuis l’écran d’accueil iOS |

---

## 10. Rappels importants

- Le `.env` contient les secrets : ne jamais le committer ni le coller dans un ticket.
- `RIOT_API_KEY` reste **vide** en prod tant qu’une Production API Key n’est pas approuvée
  (une clé dev expire en 24 h).
- Twitch : l’OAuth Redirect `http://localhost` suffit ; le callback EventSub public est
  `https://bot.iamfabriceg.xyz/webhooks/twitch`.
- Ne pas relancer `cms-seed` après l’import MongoDB.
- Changer le mot de passe admin au premier login.
