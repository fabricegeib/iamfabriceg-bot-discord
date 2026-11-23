# Déploiement VPS — iamfabriceg Bot 1.1.0

> Procédure courte en 6 étapes. **Aucun conteneur MongoDB n’est lancé** : la stack utilise la
> MongoDB déjà présente sur le VPS. Le dossier [`deploy/`](../deploy) contient les fichiers
> prêts à copier.

---

## 0. Ce qu’il te faut

- Un VPS avec Docker et le plugin Compose (`docker compose version` doit répondre).
- **Nginx Proxy Manager (NPM) déjà installé**, avec un réseau Docker nommé
  `nginx-proxy-manager` (c’est le réseau par défaut de la plupart des installs NPM).
- Le domaine `bot.iamfabriceg.xyz` avec un enregistrement **A** vers l’IP du VPS.
- Les identifiants du registre privé `registry.fabricegeib.com`.
- Ta **MongoDB existante** : conteneur nommé `mongodb`, image `mongo:8.2.4`, URI
  `mongodb://xxx:xxx@mongodb:27017/?authSource=admin` (identifiants encodés dans `deploy/.env`).
  Ce conteneur doit être attaché au réseau `nginx-proxy-manager` (voir étape 3).
- L’archive MongoDB `backups/iamfabriceg-bot-2026-11-22.archive.gz`.

Rien d’autre : pas de code source, pas de pnpm, pas de build sur le VPS, pas de nouveau MongoDB.

---

## 1. Remplir les identifiants MongoDB (sur ta machine)

Ouvre `deploy/.env` et remplace **uniquement** les deux placeholders de la ligne `DATABASE_URI` :

```dotenv
DATABASE_URI=mongodb://MONGO_USER:MONGO_PASSWORD@mongodb:27017/iamfabriceg_bot?authSource=admin
```

> ⚠️ **Garde l’hôte `mongodb` dans `DATABASE_URI`** (et non l’IP publique du VPS). C’est le nom du
> conteneur MongoDB existant, résolu par le DNS Docker à condition qu’il soit attaché au réseau
> `nginx-proxy-manager` — c’est l’objet de l’étape 3. Le `127.0.0.1` n’est utilisé que dans les
> commandes d’import/test, où le conteneur jetable partage le namespace réseau de `mongodb`.

- Garde `?authSource=admin` : c’est la base d’authentification de ton instance.
- Garde `/iamfabriceg_bot` : c’est la base dédiée au bot (les autres bases du VPS ne sont pas touchées).
- **Encode les caractères spéciaux** du mot de passe dans une URL : `@` → `%40`, `#` → `%23`,
  `/` → `%2F`, `:` → `%3A`, `%` → `%25`.
- Le fichier `.env` est ignoré par Git : ne le commite pas, ne le colle pas dans un ticket.

---

## 2. Copier les fichiers sur le VPS

Depuis ta machine :

```powershell
ssh debian@51.178.39.128 'mkdir -p ~/docker/iamfabriceg-bot'
scp -r deploy/. debian@51.178.39.128:~/docker/iamfabriceg-bot/
scp backups/iamfabriceg-bot-2026-11-22.archive.gz debian@51.178.39.128:~/docker/iamfabriceg-bot/
```

Puis, sur le VPS :

```bash
cd ~/docker/iamfabriceg-bot
ls -la     # docker-compose.yml, .env, .env.example, README.md, archive .gz
```

Le `.env` fourni contient déjà tes secrets Discord/Payload et `DEPLOY_URL=https://bot.iamfabriceg.xyz`.
Si tu changes de domaine, modifie `DEPLOY_URL` (une ligne).

---

## 3. Préparer le VPS (une seule fois)

```bash
# Le réseau doit exister : NPM le crée normalement lui-même.
docker network ls | grep nginx-proxy-manager

# S'il est absent :
docker network create nginx-proxy-manager

# Le conteneur MongoDB doit etre sur le meme réseau que la stack pour que
# `mongodb:27017` soit résolu (commande idempotente) :
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' mongodb \
  | grep -qx nginx-proxy-manager || docker network connect nginx-proxy-manager mongodb

# Vérification DNS depuis le réseau partagé :
docker run --rm --network nginx-proxy-manager mongo:8.2.4 sh -c 'getent hosts mongodb'

# Connexion au registre privé :
docker login registry.fabricegeib.com

# Tester l'accès à la MongoDB existante avant de lancer la stack.
# Le conteneur jetable partage le réseau de ton conteneur `mongodb` :
# 127.0.0.1:27017 y désigne directement ta MongoDB, sans port public.
docker run --rm --network container:mongodb --env-file .env mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#@mongodb:27017#@127.0.0.1:27017#"); mongosh "$MONGO_URI" --quiet --eval "printjson(db.adminCommand({ping:1}))"'
```

> Si ton conteneur MongoDB porte un autre nom, remplace `mongodb` après `container:` dans toutes
> les commandes de ce guide.

> Si ce test échoue avec `Authentication failed` : vérifie l’encodage du mot de passe dans
> `DATABASE_URI` (`!` → `%21`, `@` → `%40`, `#` → `%23`) et `authSource=admin`.
> Si le conteneur `mongodb` n’existe pas sous ce nom, liste-les avec `docker ps --format '{{.Names}}'`
> et corrige le `--network container:...`.

---

## 4. Lancer la stack

```bash
docker compose up -d
docker compose ps
```

**Deux conteneurs seulement** : `iamfabriceg-bot-discord` et `iamfabriceg-bot-cms`, tous deux
`healthy` en ~30 s. Il n’y a volontairement **aucun** `iamfabriceg-bot-mongo`, aucun volume
MongoDB et aucun service `iamfabriceg-bot-cms-seed`. Les images sont tirées du registre si besoin
(`pull_policy: if_not_present`).

Ports hôtes du projet (identiques en local et en prod) : `31000` pour le bot, `31001` pour le
CMS, tous deux liés à `127.0.0.1`. Les ports internes des conteneurs restent `3000`/`3001`, donc
NPM vise **`iamfabriceg-bot-cms:3001`** (alias DNS unique sur le réseau partagé).

> Si tu remplaces un ancien déploiement, lance `docker compose down --remove-orphans` avant
> `up -d` : les clés de service sont passées de `bot`/`cms` à `iamfabriceg-bot`/
> `iamfabriceg-bot-cms`, et le nom `iamfabriceg-bot-cms` existait déjà comme `container_name`.

À ce stade la base importée n’est pas encore restaurée : c’est l’étape 5.

---

## 5. Importer la base MongoDB

```bash
# Vérifier l'archive (empreinte attendue)
sha256sum iamfabriceg-bot-2026-11-22.archive.gz
# 390180301D0CFE0027009CFF388D2DA57B18160F5B60D1F24E4466A49F7EFA1F

# Restaurer DANS ton conteneur MongoDB existant (nommé `mongodb`) :
# le conteneur jetable partage son réseau, donc 127.0.0.1:27017 = ta MongoDB.
docker run --rm \
  --network container:mongodb \
  --env-file .env \
  -v "$PWD/iamfabriceg-bot-2026-11-22.archive.gz:/backup/archive.gz:ro" \
  mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#@mongodb:27017#@127.0.0.1:27017#"); mongorestore --uri="$MONGO_URI" --archive=/backup/archive.gz --gzip --drop'

# Contrôle rapide, toujours dans ton conteneur MongoDB :
docker run --rm --network container:mongodb --env-file .env mongo:8.2.4 sh -c \
  'MONGO_URI=$(printf "%s" "$DATABASE_URI" | sed "s#@mongodb:27017#@127.0.0.1:27017#"); mongosh "$MONGO_URI" --quiet --eval "printjson({collections:db.getCollectionNames().length, users:db.users.countDocuments({}), games:db.games.countDocuments({})})"'
```

> ⚠️ `--drop` **remplace les collections de la base `iamfabriceg_bot` uniquement**. Vérifie que
> c’est bien une base dédiée. Les autres bases de ta MongoDB ne sont pas modifiées.
>
> ⚠️ **Ne jamais lancer le seed après l’import** : il régénérerait `PAYLOAD_API_KEY` et le bot ne
> pourrait plus s’authentifier. Le Compose de `deploy/` ne contient aucun service
> `iamfabriceg-bot-cms-seed`.

---

## 6. Purger les caches du bot et du CMS

Ils ont démarré avant la restauration : on les redémarre pour qu’ils rechargent les données.

```bash
docker compose restart iamfabriceg-bot iamfabriceg-bot-cms
docker compose ps
```

> Toute modification de `.env` (MongoDB, domaine, clé API, secrets) impose :
> `docker compose up -d --force-recreate iamfabriceg-bot iamfabriceg-bot-cms`.

---

## 7. Nginx Proxy Manager — à la main (interface web)

Ouvre NPM → **Proxy Hosts** → **Add Proxy Host**, onglet **Details** :

| Champ | Valeur |
|---|---|
| Domain Names | `bot.iamfabriceg.xyz` |
| Scheme | `http` |
| Forward Hostname / IP | `iamfabriceg-bot-cms` |
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

> NPM et la stack partagent le réseau `nginx-proxy-manager` : le nom `iamfabriceg-bot-cms` est résolu
> par Docker, aucune IP n’est à renseigner.

---

## 8. Vérifications finales

Depuis le VPS :

```bash
docker compose ps
curl -fsS http://127.0.0.1:31001/api/bot/healthz
curl -fsS http://127.0.0.1:31000/healthz
```

Depuis ton PC :

```bash
curl -fsS https://bot.iamfabriceg.xyz/api/bot/healthz
curl -fsS -o /dev/null -w 'admin HTTP %{http_code}\n' https://bot.iamfabriceg.xyz/admin
curl -fsS -o /dev/null -w 'front  HTTP %{http_code}\n' https://bot.iamfabriceg.xyz/
```

Depuis un navigateur :

- `/` : le front avec les filtres **Tout / Jeux / Commandes / Actualités / API**.
- `/admin` : connexion avec `bot@iamfabriceg.local`, puis change le mot de passe, crée ton propre
  compte `admin` et **garde le compte `bot`** (il porte `PAYLOAD_API_KEY`). Voir
  [`docs/CMS.md`](./CMS.md#compte-admin-personnel-et-liaison-discord).
- Sur iPhone : la palette s’ouvre **au premier tap**, est focalisée, occupe toute la largeur et
  affiche 8 résultats. Le correctif est dans les images `1.1.0-slim` (commit `7f135f6`).
- Sur Discord : `/ping` répond et `/profil pseudo:TonPseudo` crée un profil visible dans
  `/admin` → **Profiles**.

---

## 9. Mise à jour et retour arrière

Modifier le tag des deux images dans `deploy/docker-compose.yml`, puis :

```bash
docker compose pull
docker compose up -d
```

Retour arrière : remettre `1.1.0` à la place de `1.1.0-slim`, puis relancer les deux commandes.

| Image | Tag courant | Digest |
|---|---|---|
| Bot | `1.1.0-slim` (203 Mo) | `sha256:ca9e4f5dbb115808ef34ecf6bcab7e3e6ec399ffede01d867d064632dc847cd1` |
| CMS | `1.1.0-slim` (306 Mo) | `sha256:ca7c312e6cc5e3de0b1baa9391a24d92aac500c9e3857291fbce273837ad179c` |
| Bot | `1.1.0` (rollback, 235 Mo) | `sha256:7cb5bb8bcd47559f653b5c938b9abe80e49f29e55af38701cd2248a0d6a489f4` |
| CMS | `1.1.0` (rollback, 2,41 Go) | `sha256:b181c774b5e77b4cdd452109aa52b04dcf53d54a94e5530d78dc94aedc08e135` |

---

## 10. Dépannage express

| Symptôme | Correctif |
|---|---|
| `Authentication failed` sur MongoDB | Vérifier identifiants, `authSource=admin` et encodage des caractères spéciaux, puis `up -d --force-recreate iamfabriceg-bot iamfabriceg-bot-cms` |
| `No such container: mongodb` | `docker ps --format '{{.Names}}'` puis corriger le `--network container:...` (étapes 3 et 5) |
| `ECONNREFUSED` sur l’import | Le conteneur ciblé n’écoute pas sur `27017` ; vérifier son nom et son port avec `docker ps` |
| `unauthorized: authentication required` au `pull` | `docker login registry.fabricegeib.com` |
| `network nginx-proxy-manager not found` | `docker network create nginx-proxy-manager` |
| 502 dans NPM | Vérifier `Forward Hostname = iamfabriceg-bot-cms` et `Port = 3001`, puis reload du Proxy Host |
| Admin : spinner infini sur les POST | `DEPLOY_URL` doit être l’URL publique HTTPS ; `docker compose up -d --force-recreate iamfabriceg-bot-cms` |
| Bot « non configuré » pour une API | Clé absente du `.env` ; compléter puis `up -d --force-recreate iamfabriceg-bot` |
| Stats vides | Import MongoDB manquant : rejouer l’étape 5 puis `restart iamfabriceg-bot iamfabriceg-bot-cms` |
| Palette au 2ᵉ tap sur iPhone | Vérifier le digest CMS `ca7c312e…` (`1.1.0-slim`) |
| Cercles rouges / safe areas | Retirer puis rajouter la web app depuis l’écran d’accueil iOS |

---

## 11. Rappels importants

- Le `.env` contient les secrets : ne jamais le committer ni le coller dans un ticket.
- `RIOT_API_KEY` reste **vide** en prod tant qu’une Production API Key n’est pas approuvée.
- Twitch : OAuth Redirect `http://localhost` suffit ; callback EventSub public :
  `https://bot.iamfabriceg.xyz/webhooks/twitch`.
- Ne pas relancer `iamfabriceg-bot-cms-seed` après l’import MongoDB.
- Changer le mot de passe admin au premier login et conserver le compte `bot`.
