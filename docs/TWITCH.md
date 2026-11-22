# Twitch Helix & EventSub

## 1. Application Twitch

1. Créez une application sur <https://dev.twitch.tv/console/apps> avec comme **OAuth Redirect URL**
   `http://localhost` (ou `http://localhost:31000`). Le bot utilise uniquement `client_credentials` :
   cette URL de redirect n'est jamais appelée, elle sert juste à enregistrer l'application.
2. Renseignez `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` dans `.env`.
3. Définissez `PUBLIC_URL` avec l'URL publique du bot (ex. `https://bot.iamfabriceg.xyz`), car EventSub
   exige un **callback HTTPS**. En Docker, `PUBLIC_URL` est automatiquement aligné sur `DEPLOY_URL` ;
   ne mettez pas l'URL de prod dans l'OAuth Redirect URL de la console Twitch.

Le bot obtient un app token OAuth `client_credentials` et le met en cache 50 minutes.

## 2. Commande `/twitch <chaine>`

Utilise Helix (`/users` puis `/streams`) pour afficher : statut live, titre, jeu, spectateurs, vignette et avatar. Sans clés, la commande répond que Twitch est désactivé.

## 3. Alertes EventSub

```bash
corepack pnpm twitch:subscribe iamfabriceg
```

Cela crée les abonnements `stream.online` et `stream.offline` avec le callback :

```
${PUBLIC_URL}/webhooks/twitch
```

Vous pouvez aussi passer une autre chaîne en argument.

## 4. Callback `/webhooks/twitch`

Le serveur HTTP du bot (`PORT`, défaut 31000 ; port interne 3000 dans le conteneur) gère trois types de messages :

| `Twitch-Eventsub-Message-Type` | Comportement |
|---|---|
| `webhook_callback_verification` | Renvoie le `challenge` en texte brut |
| `notification` | Vérifie la signature, puis envoie un embed dans `ANNOUNCEMENT_CHANNEL_ID` (ou `LOG_CHANNEL_ID`, ou `ROLES_CHANNEL_ID`) |
| `revocation` | Log l'abonnement révoqué |

Signature attendue :

```
Twitch-Eventsub-Message-Signature: sha256=<HMAC-SHA256>
HMAC(messageId + timestamp + rawBody, TWITCH_CLIENT_SECRET)
```

La comparaison est faite avec `crypto.timingSafeEqual`. Les messages dont la signature est invalide sont rejetés avec un HTTP 401.

## 5. Reverse proxy

Exemple Nginx :

```nginx
location /webhooks/ {
    proxy_pass http://127.0.0.1:31000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Le healthcheck `GET /healthz` peut être utilisé par votre supervision ou Docker.
