# Permissions et rôles Discord

## Pourquoi les boutons de rôles ne fonctionnent pas

Le bot voit bien les rôles (hiérarchie correcte : `Bots` position 63 > `Aniimo` 36 > `GOALS` 1), mais
son rôle `Bots` n'a **pas** la permission `Gérer les rôles` (`MANAGE_ROLES=false`). Tant que cette
permission n'est pas accordée, les boutons `/games roles` et les assignations échouent silencieusement.

La page *Intégrations › iamfabriceg.xyz* ne permet pas de modifier les permissions OAuth2 d'un bot déjà
installé. Il faut soit modifier les permissions du rôle `Bots`, soit ré-autoriser l'application via
l'URL OAuth2.

## Méthode 1 — modifier le rôle (la plus rapide)

1. Discord → *Paramètres du serveur* → **Rôles** → **Bots**.
2. Onglet **Permissions** → activer **Gérer les rôles** (*Manage Roles*).
3. Vérifier que **Bots** est au-dessus de `Aniimo` et `GOALS` (glisser-déposer si besoin).
4. Enregistrer, puis taper `/permissions` : la ligne `ManageRoles` doit passer en ✅.

## Méthode 2 — ré-autoriser l'application (lien prêt à l'emploi)

Ouvre l'un de ces liens (ils sont aussi dans `.env` et dans la réponse de `/permissions`) :

- Tous les serveurs :
  `https://discord.com/oauth2/authorize?client_id=580073418968530973&permissions=1099780410374&scope=bot%20applications.commands`
- Ce serveur uniquement (`guild_id=481653519674507274`) :
  `https://discord.com/oauth2/authorize?client_id=580073418968530973&permissions=1099780410374&scope=bot%20applications.commands&guild_id=481653519674507274`

Coche **Gérer les rôles** à l'étape 2, autorise, puis vérifie avec `/permissions`.

`permissions=1099780410374` est le bitfield OAuth2 calculé depuis la liste `NEEDED` de
`src/commands/info/permissions.js` :

| Permission | Bit |
|---|---|
| ViewChannel | 1024 |
| SendMessages | 2048 |
| EmbedLinks | 16384 |
| ReadMessageHistory | 65536 |
| UseExternalEmojis | 262144 |
| ManageRoles | 268435456 |
| KickMembers | 2 |
| BanMembers | 4 |
| ModerateMembers | 1099511627776 |

## Vérification

- `/permissions` affiche ✅/❌ pour chaque permission dans le serveur courant.
- `/ping`, `/status` et `/help` fonctionnent sans permission particulière.
- `/sync`, `/kick`, `/mute`, `/unmute`, `/prune` sont déjà limités côté Discord par
  `default_member_permissions` (affiché sur le front public).
