import type { CollectionSlug } from 'payload'

export type CollectionAccess = 'public' | 'admin-editor' | 'admin' | 'admin-self'

export type CollectionInfo = {
  /** Rôle de la collection dans le projet. */
  role: string
  /** Accès en lecture depuis l'API REST / le front public. */
  access: CollectionAccess
  /** Description courte affichée en haut de la page. */
  summary: string
  /** Informations complémentaires affichées dans le panneau dépliable. */
  details: string[]
  /** Champs importants, avec leur rôle. */
  keyFields: Array<{ name: string; detail: string }>
  /** Liens utiles (front, API, dashboard, documentation). */
  links: Array<{ label: string; href: string; external?: boolean }>
  /** Exemple de requête REST copiable. */
  apiExample?: string
  /** La collection notifie le bot via le hook `afterChange`. */
  notifiesBot?: boolean
}

export const accessLabels: Record<CollectionAccess, { label: string; pill: 'success' | 'warning' | 'error' | 'light' }> = {
  public: { label: 'Lecture publique · front + API', pill: 'success' },
  'admin-editor': { label: 'Admin / éditeur', pill: 'warning' },
  admin: { label: 'Admin uniquement', pill: 'error' },
  'admin-self': { label: 'Admin ou soi-même', pill: 'light' },
}

const api = (slug: string, query = '?limit=10') => `/api/${slug}${query}`

const docs = (file: string) =>
  `https://github.com/fabricegeib/iamfabriceg-bot-discord/blob/build/docker-pnpm-payload-admin/docs/${file}`

export const collectionInfo: Partial<Record<CollectionSlug, CollectionInfo>> = {
  games: {
    role: 'Catalogue des jeux',
    access: 'public',
    summary:
      'Référentiel des jeux utilisés par les commandes Discord, les rôles et les filtres du site public.',
    details: [
      'La clé `key` est l’identifiant stable utilisé par le bot : ne la renommez pas sans mettre à jour les commandes.',
      '`published` contrôle l’affichage sur le site public ; `featured` met le jeu en avant dans la grille.',
      'Toute modification déclenche une notification vers le bot pour rafraîchir son cache local.',
    ],
    keyFields: [
      { name: 'key', detail: 'Identifiant technique unique (ex. `fortnite`, `league-of-legends`).' },
      { name: 'title', detail: 'Nom affiché dans Discord et sur le front.' },
      { name: 'discordRoleId', detail: 'Rôle Discord associé au jeu.' },
      { name: 'links', detail: 'Liens officiels (Fortnite, Riot, Steam, Twitch…).' },
    ],
    links: [
      { label: 'Voir sur le front', href: '/#games' },
      { label: 'Rôles Discord', href: '/admin/collections/discordRoles' },
    ],
    apiExample: api('games', '?where[published][equals]=true&limit=10'),
    notifiesBot: true,
  },
  commands: {
    role: 'Catalogue des commandes slash',
    access: 'public',
    summary:
      'Source de vérité des commandes du bot : descriptions, options, exemples, cooldowns et compteurs d’utilisation.',
    details: [
      'Le champ `name` doit rester identique au nom de la commande enregistrée sur Discord.',
      '`options` reproduit les options Discord au format JSON ; utilisez « Déployer les commandes » après une modification.',
      'Les compteurs (`usageCount`, `successCount`, `pointsAwarded`) sont alimentés par `POST /api/bot/usage`.',
      'Les descriptions FR/EN et les exemples alimentent directement la page « Commandes » du site public.',
    ],
    keyFields: [
      { name: 'name', detail: 'Nom unique de la commande slash.' },
      { name: 'options', detail: 'Options Discord sérialisées en JSON.' },
      { name: 'cooldown', detail: 'Délai minimal entre deux exécutions, en secondes.' },
      { name: 'adminOnly', detail: 'Réserve la commande aux administrateurs du bot.' },
    ],
    links: [
      { label: 'Voir sur le front', href: '/#commands' },
      { label: 'Statistiques', href: '/admin/stats' },
      { label: 'Historique brut', href: '/admin/collections/commandUsages' },
    ],
    apiExample: api('commands', '?where[enabled][equals]=true&limit=10'),
    notifiesBot: true,
  },
  news: {
    role: 'Actualités publiées',
    access: 'public',
    summary:
      'Articles du site public, rédigés en texte riche (Lexical) et diffusés au bot lorsqu’ils sont publiés.',
    details: [
      'Cochez `published` pour rendre l’article visible sur le front et dans le flux du bot.',
      '`excerpt` sert de résumé dans les cartes et les embeds Discord.',
      'Le contenu riche est édité avec l’éditeur Payload Lexical fourni par défaut.',
    ],
    keyFields: [
      { name: 'slug', detail: 'Identifiant URL unique de l’article.' },
      { name: 'content', detail: 'Contenu riche Lexical (titres, listes, liens, images…).' },
      { name: 'author', detail: 'Compte CMS à l’origine de l’article.' },
    ],
    links: [{ label: 'Voir sur le front', href: '/#news' }],
    apiExample: api('news', '?where[published][equals]=true&limit=10'),
    notifiesBot: true,
  },
  media: {
    role: 'Médiathèque',
    access: 'public',
    summary:
      'Fichiers uploadés via Payload (images, captures, logos) réutilisables dans les articles et les embeds.',
    details: [
      'Le stockage est local au conteneur CMS : aucun storage adapter externe n’est configuré.',
      'Le champ `url` est calculé par Payload et ne doit pas être modifié manuellement.',
      'Renseignez toujours `alt` pour l’accessibilité des images affichées sur le front.',
    ],
    keyFields: [
      { name: 'alt', detail: 'Texte alternatif obligatoire.' },
      { name: 'url', detail: 'URL publique générée par Payload (lecture seule).' },
      { name: 'size', detail: 'Taille du fichier en octets (lecture seule).' },
    ],
    links: [{ label: 'Ouvrir l’API', href: api('media') }],
    apiExample: api('media'),
  },
  events: {
    role: 'Agenda interne des événements',
    access: 'admin-editor',
    summary:
      'Événements planifiés ou en direct, suivis par le bot. Ils ne sont pas affichés sur le site public.',
    details: [
      'Le statut `live` est utilisé par le bot pour annoncer le début d’un événement.',
      'Un changement déclenche une notification immédiate vers le bot.',
      'Les événements peuvent être rattachés à un jeu du catalogue.',
    ],
    keyFields: [
      { name: 'startsAt', detail: 'Date de début, utilisée pour le tri et les annonces.' },
      { name: 'status', detail: 'scheduled · live · ended' },
      { name: 'game', detail: 'Jeu associé, facultatif.' },
    ],
    links: [{ label: 'Catalogue des jeux', href: '/admin/collections/games' }],
    apiExample: api('events'),
    notifiesBot: true,
  },
  streamAlerts: {
    role: 'Configuration des alertes Twitch',
    access: 'admin-editor',
    summary:
      'Comptes Twitch surveillés par le bot et salons Discord où envoyer les notifications de live.',
    details: [
      '`twitchLogin` doit correspondre au login Twitch exact, sans majuscule superflue.',
      '`lastStatus` et `lastCheckedAt` sont mis à jour par la tâche de surveillance du bot.',
      'Désactivez `enabled` pour suspendre temporairement une alerte sans supprimer l’entrée.',
    ],
    keyFields: [
      { name: 'twitchLogin', detail: 'Login Twitch suivi (unique).' },
      { name: 'discordChannelId', detail: 'Salon Discord de destination.' },
      { name: 'message', detail: 'Modèle de message envoyé lors de la mise en live.' },
    ],
    links: [{ label: 'Voir les événements', href: '/admin/collections/events' }],
    apiExample: api('streamAlerts'),
  },
  discordRoles: {
    role: 'Correspondance des rôles Discord',
    access: 'admin-editor',
    summary:
      'Mapping entre les rôles de votre serveur Discord et les jeux du catalogue, utilisé par la commande /roles.',
    details: [
      '`roleId` est l’ID Discord du rôle : il doit être unique et rester stable.',
      'Cochez `managed` uniquement si le bot est autorisé à attribuer/retirer ce rôle.',
      'Pour les rôles gérés, le rôle du bot doit posséder la permission « Gérer les rôles » et être placé au-dessus du rôle cible.',
      'Les rôles sont affichés dans la commande `/roles` et dans les embeds liés aux jeux.',
    ],
    keyFields: [
      { name: 'roleId', detail: 'ID Discord du rôle (ex. `123456789012345678`).' },
      { name: 'game', detail: 'Jeu du catalogue associé à ce rôle.' },
      { name: 'managed', detail: 'Autorise le bot à modifier ce rôle sur le serveur.' },
      { name: 'color', detail: 'Couleur hexadécimale utilisée dans les embeds.' },
    ],
    links: [
      { label: 'Catalogue des jeux', href: '/admin/collections/games' },
      { label: 'Documentation Discord', href: docs('DISCORD.md'), external: true },
    ],
    apiExample: api('discordRoles'),
  },
  profiles: {
    role: 'Profils et fidélité',
    access: 'admin',
    summary:
      'Profils Discord enrichis des points, niveaux, séries et compteurs par commande affichés dans /profil.',
    details: [
      'Les profils sont créés automatiquement lors de la première interaction enregistrée.',
      '`points`, `xp`, `level`, `streak` et `commandCounts` sont calculés par `POST /api/bot/usage`.',
      '`banned` empêche le membre d’obtenir de nouveaux points.',
      'La vue « Statistiques » agrège ces données sans modifier les profils.',
    ],
    keyFields: [
      { name: 'discordId', detail: 'ID Discord unique du membre.' },
      { name: 'points', detail: 'Points de fidélité cumulés.' },
      { name: 'level', detail: 'Niveau calculé à partir de l’XP.' },
      { name: 'commandCounts', detail: 'Objet JSON { commande: nombre d’utilisations }.' },
    ],
    links: [
      { label: 'Statistiques globales', href: '/admin/stats' },
      { label: 'Historique brut', href: '/admin/collections/commandUsages' },
    ],
    apiExample: api('profiles'),
  },
  commandUsages: {
    role: 'Journal des interactions',
    access: 'admin',
    summary:
      'Trace brute de chaque commande, bouton, menu ou autocomplete exécuté par le bot.',
    details: [
      'Chaque ligne est écrite en fire-and-forget par le bot, sans bloquer la réponse Discord.',
      '`outcome` distingue succès, erreur, cooldown et refus.',
      'Les index sur `userId`, `commandName` et `usedAt` accélèrent les agrégations de la vue Statistiques.',
      'Les anciennes données conservent le champ `success` pour compatibilité.',
    ],
    keyFields: [
      { name: 'commandName', detail: 'Nom de la commande, même si elle a été supprimée du catalogue.' },
      { name: 'userId', detail: 'Membre Discord concerné.' },
      { name: 'source', detail: 'chatInput · button · selectMenu · autocomplete' },
      { name: 'durationMs', detail: 'Temps d’exécution côté bot.' },
    ],
    links: [
      { label: 'Statistiques agrégées', href: '/admin/stats' },
      { label: 'Catalogue des commandes', href: '/admin/collections/commands' },
    ],
    apiExample: api('commandUsages', '?sort=-usedAt&limit=10'),
  },
  webhookEvents: {
    role: 'Journal des webhooks',
    access: 'admin',
    summary:
      'Audit des événements reçus du CMS Payload ou de Twitch, avec vérification de la signature HMAC.',
    details: [
      '`signatureValid` indique si l’en-tête HMAC correspond à `WEBHOOK_SECRET`.',
      '`processed` est positionné lorsque le bot a traité l’événement.',
      'Cette collection est utile pour diagnostiquer un cache de commandes qui ne se rafraîchit pas.',
      'Les webhooks du bot sont signés avec `WEBHOOK_SECRET` ; ne modifiez pas cette valeur à la légère.',
    ],
    keyFields: [
      { name: 'source', detail: 'payload ou twitch' },
      { name: 'event', detail: 'Nom de l’événement reçu (ex. `commands.afterChange`).' },
      { name: 'payload', detail: 'Corps JSON brut de la requête.' },
      { name: 'signatureValid', detail: 'Résultat de la vérification HMAC.' },
    ],
    links: [{ label: 'Documentation CMS', href: docs('CMS.md'), external: true }],
    apiExample: api('webhookEvents', '?sort=-receivedAt&limit=10'),
  },
  users: {
    role: 'Comptes d’administration',
    access: 'admin-self',
    summary:
      'Comptes d’accès à l’admin Payload et à l’API REST, y compris le compte technique utilisé par le bot.',
    details: [
      'Le rôle `admin` donne accès à toutes les collections ; `editor` exclut les données sensibles.',
      'Le rôle `bot` est réservé au compte technique et ne doit pas être attribué à une personne.',
      'L’authentification par clé API est activée (`useAPIKey`) : la clé du bot est stockée dans `PAYLOAD_API_KEY`.',
      'Un utilisateur ne peut lire son propre profil que s’il est admin ou s’il s’agit de lui-même.',
    ],
    keyFields: [
      { name: 'email', detail: 'Identifiant de connexion à l’admin.' },
      { name: 'role', detail: 'admin · editor · bot' },
      { name: 'apiKey', detail: 'Clé API générée par Payload pour le compte bot.' },
    ],
    links: [{ label: 'Documentation CMS', href: docs('CMS.md'), external: true }],
    apiExample: api('users'),
  },
}
